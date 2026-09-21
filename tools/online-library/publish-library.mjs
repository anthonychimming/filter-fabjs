import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateNativeFilter, FILTER_FILE_MAX_BYTES, normalizeFilterText } from '../../src/io/filter-format.js';
import { portableContent } from '../../src/core/filter-metadata.js';
import { extractFilterFabMetadata, readPngDimensions } from '../../src/io/png-metadata.js';
import { validateOnlineLibraryManifest, ONLINE_LIBRARY_MAX_ENTRIES } from '../../src/io/filter-library-manifest.js';
import { ONLINE_LIBRARY_PACKAGE_MAX_BYTES } from '../../src/io/filter-library-package.js';
import { ONLINE_LIBRARY_MANIFEST_MAX_BYTES } from '../../src/io/filter-library-client.js';

const REGISTRY_LIMIT=1024*1024,PACKAGE_NAME=/^([A-Za-z0-9_-]{1,80})-r([1-9][0-9]*)\.png$/;
const compare=(a,b)=>a<b?-1:a>b?1:0;
const fail=(file,message)=>{throw new Error(`${file}: ${message}`);};
const json=(bytes,file)=>{try{return JSON.parse(normalizeFilterText(new TextDecoder('utf-8',{fatal:true}).decode(bytes)));}catch{fail(file,'expected valid UTF-8 JSON');}};
const onlyKeys=(value,keys,file)=>{if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key))||keys.some(key=>!Object.hasOwn(value,key)))fail(file,`expected only ${keys.join(', ')}`);};
const packagePath=entry=>`filters/${entry.id}-r${entry.revision}.png`;
const portableEqual=(a,b)=>a.id===b.id&&portableContent(a)===portableContent(b);
function metadata(entry,document){return{...entry,name:document.name,author:document.author,description:document.description,tags:document.tags,documentType:'filter',filterFormat:2,preview:{url:packagePath(entry),width:512,height:512},package:{url:packagePath(entry)}};}

export function validateRegistry(value){
  onlyKeys(value,['schema','schemaVersion','libraryVersion','filters'],'registry.json');
  if(value.schema!=='filter-fab-js/library-registry'||value.schemaVersion!==1)fail('registry.json','unsupported registry schema/version');
  if(!Array.isArray(value.filters)||value.filters.length>ONLINE_LIBRARY_MAX_ENTRIES)fail('registry.json',`expected at most ${ONLINE_LIBRARY_MAX_ENTRIES} entries`);
  for(const entry of value.filters)onlyKeys(entry,['id','revision','publishedAt'],'registry.json entry');
  // Reuse the exact manifest ID, revision, date, duplicate and version rules.
  const manifest=validateOnlineLibraryManifest({schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:value.libraryVersion,filters:value.filters.map(entry=>metadata(entry,{name:'Registry validation',tags:[]}))});
  const ids=new Set();for(const entry of manifest.filters){const folded=entry.id.toLowerCase();if(ids.has(folded))fail('registry.json','IDs must also be unique on case-insensitive filesystems');ids.add(folded);}
  return{schema:value.schema,schemaVersion:1,libraryVersion:value.libraryVersion,filters:manifest.filters.map(({id,revision,publishedAt})=>({id,revision,publishedAt})).sort((a,b)=>compare(a.id,b.id))};
}

async function diskReader(root){
  root=await fs.realpath(root);
  async function checked(relative){
    let current=root;
    for(const part of relative.split('/')){
      if(!part||part==='.'||part==='..'||part.includes('\\'))fail(relative,'unsafe path');
      if(!(await fs.readdir(current)).includes(part))fail(relative,'missing file or filename case mismatch');
      current=path.join(current,part);if((await fs.lstat(current)).isSymbolicLink())fail(relative,'symlinks are not publication inputs');
    }
    return current;
  }
  return{root,
    async read(relative,limit){const target=await checked(relative),stat=await fs.stat(target);if(!stat.isFile()||stat.size>limit)fail(relative,`expected a regular file of at most ${limit} bytes`);const bytes=await fs.readFile(target);if(bytes.length>limit)fail(relative,'file grew beyond byte limit');return bytes;},
    async list(directory){const target=await checked(directory);return(await fs.readdir(target)).filter(name=>name!=='.gitkeep').sort(compare);}
  };
}
function gitReader(root,ref){
  const git=args=>execFileSync('git',['-C',root,...args],{maxBuffer:ONLINE_LIBRARY_PACKAGE_MAX_BYTES+1024*1024,stdio:['ignore','pipe','pipe']});
  let commit;try{commit=git(['rev-parse','--verify','--end-of-options',`${ref}^{commit}`]).toString().trim();}catch{fail('base-ref','cannot resolve the supplied commit; fetch it first');}
  const files=new Map();for(const row of git(['ls-tree','-r','-z',commit]).toString().split('\0').filter(Boolean)){const [info,name]=row.split('\t');files.set(name,info.split(' '));}
  return{
    async list(directory){return[...files.keys()].filter(name=>name.startsWith(`${directory}/`)&&name!==`${directory}/.gitkeep`).map(name=>name.slice(directory.length+1)).sort(compare);},
    async read(relative,limit){const item=files.get(relative);if(!item||!['100644','100755'].includes(item[0])||item[1]!=='blob')fail(relative,'base file is missing or is not a regular blob');if(Number(git(['cat-file','-s',item[2]]).toString())>limit)fail(relative,'base file exceeds byte limit');return git(['cat-file','blob',item[2]]);}
  };
}

async function inspect(reader,generatedAt){
  const registry=validateRegistry(json(await reader.read('registry.json',REGISTRY_LIMIT),'registry.json')),sources=new Map(),packages=new Map();
  for(const entry of registry.filters){
    const file=`source/${entry.id}.json`,bytes=await reader.read(file,FILTER_FILE_MAX_BYTES),raw=json(bytes,file);
    if(raw?.version!==2)fail(file,'publishing requires native version 2');
    let document;try{document=validateNativeFilter(raw);}catch(error){fail(file,error.message);}
    if(document.id!==entry.id)fail(file,`native id must match registry id ${entry.id}`);
    sources.set(entry.id,{bytes,document});
  }
  // All historical artifacts are validated and deployed, including removed filters.
  for(const name of await reader.list('filters')){
    const match=PACKAGE_NAME.exec(name),file=`filters/${name}`;
    if(!match||!Number.isSafeInteger(Number(match[2])))fail(file,'expected <id>-r<positive revision>.png');
    const bytes=await reader.read(file,ONLINE_LIBRARY_PACKAGE_MAX_BYTES),blob=new Blob([bytes]);
    let document;
    try{
      const dimensions=await readPngDimensions(blob);if(dimensions.width!==512||dimensions.height!==512)throw new Error(`expected 512×512 PNG, found ${dimensions.width}×${dimensions.height}`);
      const envelope=await extractFilterFabMetadata(blob);if(!envelope)throw new Error('missing FilterFabJS metadata');document=validateNativeFilter(envelope.document);
    }catch(error){fail(file,error.message);}
    if(document.id!==match[1])fail(file,'embedded id does not match package filename');
    packages.set(file,{bytes,document,id:match[1],revision:Number(match[2])});
  }
  for(const entry of registry.filters){const file=packagePath(entry),pkg=packages.get(file);if(!pkg)fail(file,'current package is missing');if(!portableEqual(sources.get(entry.id).document,pkg.document))fail(file,`embedded portable content differs from source/${entry.id}.json`);}
  const manifest=validateOnlineLibraryManifest({schema:'filter-fab-js/library',schemaVersion:1,libraryVersion:registry.libraryVersion,...(generatedAt===undefined?{}:{generatedAt}),filters:registry.filters.map(entry=>metadata(entry,sources.get(entry.id).document))});
  const catalogue=JSON.stringify(manifest,null,2)+'\n';if(Buffer.byteLength(catalogue)>ONLINE_LIBRARY_MANIFEST_MAX_BYTES)fail('catalogue.json','generated manifest exceeds runtime byte limit');
  return{registry,sources,packages,manifest,catalogue};
}

function checkPublication(current,base){
  if(current.registry.libraryVersion<base.registry.libraryVersion)fail('registry.json','libraryVersion regressed');
  for(const [file,pkg] of base.packages){if(!current.packages.has(file))fail(file,'published historical package was deleted');if(!pkg.bytes.equals(current.packages.get(file).bytes))fail(file,'published historical package was modified in place');}
  const oldEntries=new Map(base.registry.filters.map(entry=>[entry.id,entry]));
  for(const entry of current.registry.filters){
    const old=oldEntries.get(entry.id),history=[...base.packages.values()].filter(pkg=>pkg.id===entry.id),maxRevision=Math.max(0,...history.map(pkg=>pkg.revision));
    if(!old){if(maxRevision?entry.revision<=maxRevision:entry.revision!==1)fail(entry.id,maxRevision?'returning filter requires a new revision above its published history':'new filter must start at revision 1');continue;}
    if(entry.revision<old.revision||entry.revision<maxRevision)fail(entry.id,'revision regressed');
    const changed=!current.sources.get(entry.id).bytes.equals(base.sources.get(entry.id).bytes)||!current.packages.get(packagePath(entry)).bytes.equals(base.packages.get(packagePath(old)).bytes);
    if(changed&&entry.revision<=old.revision)fail(entry.id,'source/package changed without a higher revision');
    if(!changed&&entry.revision!==old.revision)fail(entry.id,'unchanged source/package must retain its revision');
  }
  if(JSON.stringify(current.manifest.filters)!==JSON.stringify(base.manifest.filters)&&current.registry.libraryVersion<=base.registry.libraryVersion)fail('registry.json','catalogue change requires a higher libraryVersion');
}

export async function validateLibrary({libraryRoot,baseRoot,baseRef,generatedAt}={}){
  if(!libraryRoot)throw new Error('--library-root is required');if(baseRoot&&baseRef)throw new Error('Choose --base-root or --base-ref');
  const reader=await diskReader(libraryRoot),current=await inspect(reader,generatedAt);
  if(baseRoot||baseRef){const base=await inspect(baseRoot?await diskReader(baseRoot):gitReader(reader.root,baseRef));checkPublication(current,base);}
  else{
    for(const entry of current.registry.filters)if(entry.revision>1&&!current.packages.has(`filters/${entry.id}-r1.png`))fail(entry.id,'revision history must retain r1; use a base ref for full publication checks');
  }
  return{...current,root:reader.root,reader};
}

export async function buildLibrary(options){
  const result=await validateLibrary(options),out=path.resolve(options.out||path.join(result.root,'dist'));
  // Never clean an arbitrary caller path, source folder, symlink or unowned directory.
  if(out!==path.join(result.root,'dist'))throw new Error('--out must be the library repository dist directory');
  const marker='.filter-fabjs-library-output';
  try{const stat=await fs.lstat(out);if(stat.isSymbolicLink()||!stat.isDirectory())throw new Error('dist must be a real directory');const names=await fs.readdir(out);if(names.length&&!names.includes(marker))throw new Error('refusing to replace non-generated dist');}catch(error){if(error.code!=='ENOENT')throw error;}
  const landing=await result.reader.read('site/index.html',1024*1024),staging=await fs.mkdtemp(path.join(result.root,'.library-build-'));
  try{
    await fs.mkdir(path.join(staging,'filters'));await fs.writeFile(path.join(staging,marker),'Filter FabJS generated output\n');
    await fs.writeFile(path.join(staging,'index.html'),landing);await fs.writeFile(path.join(staging,'catalogue.json'),result.catalogue);
    for(const [file,pkg] of result.packages)await fs.writeFile(path.join(staging,file),pkg.bytes);
    const parsed=validateOnlineLibraryManifest(JSON.parse(await fs.readFile(path.join(staging,'catalogue.json'),'utf8')));
    for(const entry of parsed.filters)for(const asset of [entry.preview,entry.package])await fs.access(path.join(staging,asset.url));
    for(const [file,pkg] of result.packages)if(!pkg.bytes.equals(await fs.readFile(path.join(staging,file))))fail(file,'output bytes differ');
    await fs.rm(out,{recursive:true,force:true});await fs.rename(staging,out);
  }finally{await fs.rm(staging,{recursive:true,force:true});}
  return{...result,out};
}

export async function runCli(args=process.argv.slice(2)){
  const mode=args.shift();if(!['validate','build'].includes(mode))throw new Error('Expected validate or build');
  const names={'--library-root':'libraryRoot','--out':'out','--base-root':'baseRoot','--base-ref':'baseRef','--generated-at':'generatedAt'},options={};
  while(args.length){const key=args.shift();if(!names[key]||!args.length||Object.hasOwn(options,names[key]))throw new Error(`Invalid or repeated option: ${key}`);options[names[key]]=args.shift();}
  if(mode==='build'&&options.generatedAt===undefined)options.generatedAt=new Date().toISOString();
  const result=await(mode==='build'?buildLibrary(options):validateLibrary(options));
  console.log(`${mode==='build'?'Built':'Validated'} ${result.manifest.filters.length} current filters, ${result.packages.size} packages, libraryVersion ${result.manifest.libraryVersion}${result.out?` → ${result.out}`:''}.`);
  if(!options.baseRoot&&!options.baseRef)console.log('No publication base supplied: historical immutability/revision comparison was not performed.');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))runCli().catch(error=>{console.error(`ERROR ${error.message}`);process.exitCode=1;});
