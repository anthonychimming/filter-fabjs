import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { deflateSync } from 'node:zlib';
import { createServer } from 'node:http';
import { validateLibrary, buildLibrary, validateRegistry } from '../tools/online-library/publish-library.mjs';
import { createFilterFabPngEnvelope, embedFilterFabMetadata, readPngDimensions } from '../src/io/png-metadata.js';
import { validateOnlineLibraryManifest } from '../src/io/filter-library-manifest.js';
import { ONLINE_LIBRARY_PACKAGE_MAX_BYTES, fetchOnlineFilterPackage } from '../src/io/filter-library-package.js';
import { onlineCatalogEntry } from '../src/app/filter-catalog.js';
import { fetchOnlineLibraryManifest } from '../src/io/filter-library-client.js';
import { packageFixtureDocument } from './helpers/online-package-fixture.js';

// Test artwork only. Never used as a production package or approved reference image.
function chunk(type,data){const label=Buffer.from(type),out=Buffer.alloc(data.length+12);out.writeUInt32BE(data.length);label.copy(out,4);data.copy(out,8);let crc=0xffffffff;for(const byte of Buffer.concat([label,data])){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}out.writeUInt32BE((crc^0xffffffff)>>>0,out.length-4);return out;}
function image(width=512,height=512){const header=Buffer.alloc(13);header.writeUInt32BE(width);header.writeUInt32BE(height,4);header[8]=8;header[9]=6;return new Blob([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((width*4+1)*height))),chunk('IEND',Buffer.alloc(0))]);}
const doc={...packageFixtureDocument,id:'publish-test',name:'Publishing fixture'},entry={id:doc.id,revision:1,publishedAt:'2026-09-20'},registry={schema:'filter-fab-js/library-registry',schemaVersion:1,libraryVersion:1,filters:[entry]},generatedAt='2026-09-20T12:00:00Z';
const png=async(document=doc,width=512)=>Buffer.from(await(await embedFilterFabMetadata(image(width),createFilterFabPngEnvelope(document,'2.8.7'))).arrayBuffer());
const originalPng=await png(),sandbox=await fs.mkdtemp(path.join(os.tmpdir(),'filter-fab-publish-'));
const put=async(root,file,value)=>{await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),typeof value==='string'||Buffer.isBuffer(value)?value:JSON.stringify(value));};
async function fixture(name){const root=path.join(sandbox,name);await put(root,'registry.json',registry);await put(root,`source/${doc.id}.json`,doc);await put(root,`filters/${doc.id}-r1.png`,originalPng);await put(root,'site/index.html','<!doctype html><title>Test only</title>');return root;}
let checks=0;
async function rejects(label,mutate,pattern=/.+/){const root=await fixture(`bad-${checks++}`);await mutate(root);await assert.rejects(validateLibrary({libraryRoot:root}),pattern,label);}
try{
  const root=await fixture('valid'),options={libraryRoot:root,generatedAt},built=await buildLibrary(options);
  assert.deepEqual(validateOnlineLibraryManifest(JSON.parse(await fs.readFile(path.join(built.out,'catalogue.json'),'utf8'))),built.manifest);
  assert.equal(built.manifest.filters[0].name,doc.name);assert.equal(built.manifest.filters[0].preview.url,built.manifest.filters[0].package.url);
  assert.deepEqual(await fs.readFile(path.join(built.out,`filters/${doc.id}-r1.png`)),originalPng);
  assert.equal((await buildLibrary(options)).catalogue,built.catalogue,'fixed timestamp builds deterministically');
  const runtime=await fetchOnlineFilterPackage(onlineCatalogEntry(built.manifest.filters[0],{}),{manifestUrl:'https://fixture.test/catalogue.json',fetchImpl:async()=>new Response(originalPng)});assert.equal(runtime.document.id,doc.id);assert.deepEqual(Buffer.from(runtime.bytes),originalPng);
  // Exercise actual generated output through both production transport clients.
  const served=new Map([['/catalogue.json',await fs.readFile(path.join(built.out,'catalogue.json'))],[`/filters/${doc.id}-r1.png`,await fs.readFile(path.join(built.out,`filters/${doc.id}-r1.png`))]]);
  const server=createServer((request,response)=>{const body=served.get(request.url);response.writeHead(body?200:404,{'Content-Type':request.url.endsWith('.json')?'application/json':'image/png'});response.end(body||'Not found');});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{const manifestUrl=`http://127.0.0.1:${server.address().port}/catalogue.json`,loaded=await fetchOnlineLibraryManifest(manifestUrl),online=onlineCatalogEntry(loaded.manifest.filters[0],{}),resolved=await fetchOnlineFilterPackage(online,{manifestUrl});assert.deepEqual(Buffer.from(resolved.bytes),originalPng);await assert.rejects(fetchOnlineFilterPackage({...online,remote:{...online.remote,package:{url:'filters/missing-r1.png'}}},{manifestUrl}),/HTTP 404/);}finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  assert.deepEqual(await readPngDimensions(image()),{width:512,height:512});
  for(const filters of [[entry,entry],[{...entry,id:'../escape'}],[{...entry,id:'x'.repeat(81)}],[{...entry,revision:0}],[{...entry,publishedAt:'2026-02-30'}],[{...entry,name:'duplicate metadata'}]])assert.throws(()=>validateRegistry({...registry,filters}));
  assert.throws(()=>validateRegistry({...registry,libraryVersion:0}));assert.throws(()=>validateRegistry({...registry,schemaVersion:2}));
  await rejects('source ID mismatch',r=>put(r,`source/${doc.id}.json`,{...doc,id:'another'}),/native id/);
  await rejects('wrong source filename',r=>fs.rename(path.join(r,`source/${doc.id}.json`),path.join(r,'source/wrong.json')),/missing/);
  await rejects('native v1',r=>put(r,`source/${doc.id}.json`,{...doc,version:1}),/version 2/);
  await rejects('invalid source',r=>put(r,`source/${doc.id}.json`,{...doc,formulas:['bogus()','g','b','a']}),/channel/);
  await rejects('source byte bound',r=>put(r,`source/${doc.id}.json`,' '.repeat(262145)),/at most/);
  await rejects('missing package',r=>fs.unlink(path.join(r,`filters/${doc.id}-r1.png`)),/missing/);
  await rejects('wrong revision name',r=>fs.rename(path.join(r,`filters/${doc.id}-r1.png`),path.join(r,`filters/${doc.id}-r2.png`)),/missing/);
  await rejects('unrevisioned name',r=>fs.rename(path.join(r,`filters/${doc.id}-r1.png`),path.join(r,`filters/${doc.id}.png`)),/expected/);
  await rejects('wrong dimensions',async r=>put(r,`filters/${doc.id}-r1.png`,await png(doc,1)),/512×512/);
  await rejects('oversized package',r=>put(r,`filters/${doc.id}-r1.png`,Buffer.alloc(ONLINE_LIBRARY_PACKAGE_MAX_BYTES+1)),/at most/);
  await rejects('malformed PNG',r=>put(r,`filters/${doc.id}-r1.png`,'not PNG'),/signature/);
  await rejects('missing metadata',async r=>put(r,`filters/${doc.id}-r1.png`,Buffer.from(await image().arrayBuffer())),/missing FilterFabJS/);
  await rejects('invalid embedded formula',async r=>put(r,`filters/${doc.id}-r1.png`,await png({...doc,formulas:['unknown()','g','b','a']})),/channel/);
  await rejects('embedded CRC',r=>{const bytes=Buffer.from(originalPng);bytes[bytes.indexOf(Buffer.from('Controlled package'))]^=1;return put(r,`filters/${doc.id}-r1.png`,bytes);},/CRC/);
  for(const change of [{name:'Different'},{tags:['Other']},{formulas:['r','g','b','a']},{controls:[{label:'Different',value:42,ui:{widget:'slider',min:0,max:100,step:1,unit:'%'}}]}])await rejects('portable content differs',async r=>put(r,`filters/${doc.id}-r1.png`,await png({...doc,...change})),/differs/);
  const base=await fixture('base'),next=await fixture('next'),changed={...doc,description:'Second revision'};
  await put(next,`source/${doc.id}.json`,changed);await put(next,`filters/${doc.id}-r2.png`,await png(changed));await put(next,'registry.json',{...registry,libraryVersion:2,filters:[{...entry,revision:2}]});
  const nextResult=await buildLibrary({libraryRoot:next,baseRoot:base,generatedAt});assert.equal(nextResult.packages.size,2);assert.equal(nextResult.manifest.filters[0].revision,2);assert.deepEqual(await fs.readFile(path.join(nextResult.out,`filters/${doc.id}-r1.png`)),originalPng);
  await put(next,'registry.json',{...registry,filters:[{...entry,revision:2}]});await assert.rejects(validateLibrary({libraryRoot:next,baseRoot:base}),/higher libraryVersion/);
  await put(next,'registry.json',{...registry,libraryVersion:2,filters:[{...entry,revision:2}]});await assert.rejects(validateLibrary({libraryRoot:base,baseRoot:next}),/regressed/);
  const noBump=await fixture('no-bump');await put(noBump,`source/${doc.id}.json`,JSON.stringify(doc,null,2));await assert.rejects(validateLibrary({libraryRoot:noBump,baseRoot:base}),/higher revision/);
  const mutation=await fixture('mutation');await put(mutation,`source/${doc.id}.json`,changed);await put(mutation,`filters/${doc.id}-r1.png`,await png(changed));await assert.rejects(validateLibrary({libraryRoot:mutation,baseRoot:base}),/modified in place/);
  const removed=await fixture('removed');await put(removed,'registry.json',{...registry,filters:[]});await assert.rejects(validateLibrary({libraryRoot:removed,baseRoot:base}),/higher libraryVersion/);await put(removed,'registry.json',{...registry,libraryVersion:2,filters:[]});assert.equal((await buildLibrary({libraryRoot:removed,baseRoot:base,generatedAt})).packages.size,1);await fs.unlink(path.join(removed,`filters/${doc.id}-r1.png`));await assert.rejects(validateLibrary({libraryRoot:removed,baseRoot:base}),/deleted/);
  const empty=await fixture('empty');await put(empty,'registry.json',{...registry,filters:[]});await fs.unlink(path.join(empty,`filters/${doc.id}-r1.png`));await assert.rejects(validateLibrary({libraryRoot:next,baseRoot:empty}),/start at revision 1/);
  // Real Git base-ref path, without checkout/reset or executing repository code.
  const git=(...args)=>execFileSync('git',['-C',base,...args],{stdio:'pipe'});git('init','-b','main');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-m','Test baseline');
  assert.equal((await validateLibrary({libraryRoot:base,baseRef:'HEAD'})).manifest.libraryVersion,1);await put(base,`source/${doc.id}.json`,JSON.stringify(doc,null,2));await assert.rejects(validateLibrary({libraryRoot:base,baseRef:'HEAD'}),/higher revision/);await assert.rejects(validateLibrary({libraryRoot:base,baseRef:'missing-ref'}),/cannot resolve/);
  await assert.rejects(buildLibrary({...options,out:path.join(root,'source')}),/dist directory/);
  const unsafe=await fixture('unsafe-output');await put(unsafe,'dist/keep.txt','not generated');await assert.rejects(buildLibrary({libraryRoot:unsafe}),/non-generated/);assert.equal(await fs.readFile(path.join(unsafe,'dist/keep.txt'),'utf8'),'not generated');
  console.log('Publishing registry/native/PNG validation, exact-byte deterministic build, runtime compatibility, revision/version/history and Git-base checks passed.');
}finally{
  // mkdtemp supplies an absolute path inside the OS test temp directory.
  assert.equal(path.dirname(sandbox),await fs.realpath(os.tmpdir()));assert.match(path.basename(sandbox),/^filter-fab-publish-/);await fs.rm(sandbox,{recursive:true,force:true});
}
