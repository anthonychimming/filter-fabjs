import assert from 'node:assert/strict';
import { inflateSync, deflateSync } from 'node:zlib';
import { filterRenderSignature, routeImageFileWithMetadata } from '../src/app/filter-fab-app.js';
import { validateNativeFilter } from '../src/io/filter-format.js';
import { createFilterFabPngEnvelope, embedFilterFabMetadata, extractFilterFabMetadata, FILTER_FAB_PNG_KEYWORD, FILTER_FAB_PNG_METADATA_MAX_BYTES, PngMetadataError, validateFilterFabPngEnvelope } from '../src/io/png-metadata.js';

const encoder=new TextEncoder(),decoder=new TextDecoder(),signature=Uint8Array.of(137,80,78,71,13,10,26,10);
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let value=n;for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;table[n]=value>>>0;}return table;})();
function crc32(parts){let crc=0xffffffff;for(const part of parts)for(const byte of part)crc=crcTable[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function u32(value){return Uint8Array.of((value>>>24)&255,(value>>>16)&255,(value>>>8)&255,value&255)}
function concat(...parts){const out=new Uint8Array(parts.reduce((sum,part)=>sum+part.length,0));let offset=0;for(const part of parts){out.set(part,offset);offset+=part.length;}return out;}
function makeChunk(type,data){const typeBytes=encoder.encode(type);return concat(u32(data.length),typeBytes,data,u32(crc32([typeBytes,data])));}
function chunks(bytes){const result=[];for(let offset=8;offset<bytes.length;){const length=new DataView(bytes.buffer,bytes.byteOffset+offset,4).getUint32(0),type=decoder.decode(bytes.subarray(offset+4,offset+8)),end=offset+12+length;result.push({type,data:bytes.subarray(offset+8,offset+8+length),crc:new DataView(bytes.buffer,bytes.byteOffset+offset+8+length,4).getUint32(0),start:offset,end});offset=end;}return result;}
function rgbaPng(){
  const ihdr=concat(u32(1),u32(1),Uint8Array.of(8,6,0,0,0)),scanline=Uint8Array.of(0,12,34,56,78);
  return new Blob([signature,makeChunk('IHDR',ihdr),makeChunk('IDAT',deflateSync(scanline)),makeChunk('IEND',new Uint8Array())],{type:'image/png'});
}
function palettePng(){
  const ihdr=concat(u32(1),u32(1),Uint8Array.of(8,3,0,0,0));
  return new Blob([signature,makeChunk('IHDR',ihdr),makeChunk('PLTE',Uint8Array.of(90,120,150)),makeChunk('tRNS',Uint8Array.of(77)),makeChunk('IDAT',deflateSync(Uint8Array.of(0,0))),makeChunk('IEND',new Uint8Array())],{type:'image/png'});
}
function filter(overrides={}){return{format:'filter-fab-js',version:2,id:'portable-id',name:'Éclat ✨',author:'李 小龍',description:'Crème brûlée — α',tags:['夜景','Café'],mathMode:'float',formulas:['r','g','b','a'],controls:[{label:'Mélange',value:128,ui:{widget:'slider',displayMin:0,displayMax:100,step:1,format:'number',unit:'%'}}],...overrides};}
function rawMetadataPng(payload,{keyword=FILTER_FAB_PNG_KEYWORD,count=1}={}){return rgbaPng().arrayBuffer().then(buffer=>{const bytes=new Uint8Array(buffer),iend=chunks(bytes).at(-1),data=concat(encoder.encode(keyword),Uint8Array.of(0,0,0,0,0),encoder.encode(payload)),metadata=Array.from({length:count},()=>makeChunk('iTXt',data));return new Blob([bytes.subarray(0,iend.start),...metadata,bytes.subarray(iend.start)],{type:'image/png'});});}
async function rejectsCode(promise,code){await assert.rejects(promise,error=>error instanceof PngMetadataError&&error.code===code);}

const original=rgbaPng(),validated=validateNativeFilter(filter()),envelope=createFilterFabPngEnvelope(validated,'2.8.0'),embedded=await embedFilterFabMetadata(original,envelope);
const extracted=await extractFilterFabMetadata(embedded);
assert.deepEqual(extracted,envelope,'UTF-8 envelope metadata must round trip without loss');
assert.equal(validateFilterFabPngEnvelope(extracted),extracted,'envelope validation must return the validated carrier');
assert.deepEqual(validateNativeFilter(extracted.document),validated,'embedded native-v2 data must pass through the existing validator');

const originalBytes=new Uint8Array(await original.arrayBuffer()),embeddedBytes=new Uint8Array(await embedded.arrayBuffer()),originalChunks=chunks(originalBytes),embeddedChunks=chunks(embeddedBytes),metadataChunks=embeddedChunks.filter(item=>item.type==='iTXt'&&decoder.decode(item.data.subarray(0,item.data.indexOf(0)))===FILTER_FAB_PNG_KEYWORD);
assert.equal(metadataChunks.length,1,'export must write exactly one FilterFabJS iTXt chunk');
const metadata=metadataChunks[0],keywordEnd=metadata.data.indexOf(0);
assert.equal(metadata.data[keywordEnd+1],0,'iTXt must be uncompressed');assert.equal(metadata.data[keywordEnd+2],0,'iTXt compression method must be zero');
assert.equal(metadata.crc,crc32([encoder.encode('iTXt'),metadata.data]),'metadata chunk CRC must be correct');
for(const type of ['IHDR','IDAT','IEND'])assert.deepEqual(embeddedChunks.find(item=>item.type===type).data,originalChunks.find(item=>item.type===type).data,`${type} data must remain byte-identical`);
const ihdr=embeddedChunks.find(item=>item.type==='IHDR').data,idat=embeddedChunks.filter(item=>item.type==='IDAT').map(item=>item.data),pixels=inflateSync(concat(...idat));
assert.deepEqual([...ihdr.subarray(0,8)],[0,0,0,1,0,0,0,1],'image dimensions must remain 1 × 1');assert.deepEqual([...pixels],[0,12,34,56,78],'decoded RGBA pixels and alpha must remain identical');
const palette=palettePng(),embeddedPalette=await embedFilterFabMetadata(palette,envelope),paletteBefore=chunks(new Uint8Array(await palette.arrayBuffer())),paletteAfter=chunks(new Uint8Array(await embeddedPalette.arrayBuffer()));
for(const type of ['IHDR','PLTE','tRNS','IDAT','IEND'])assert.deepEqual(paletteAfter.find(item=>item.type===type).data,paletteBefore.find(item=>item.type===type).data,`${type} palette PNG data must remain byte-identical`);

const corrupted=embeddedBytes.slice(),matched=chunks(corrupted).find(item=>item.type==='iTXt');corrupted[matched.end-1]^=1;
await rejectsCode(extractFilterFabMetadata(new Blob([corrupted])), 'crc');
const malformed=originalBytes.slice();malformed[8]=0x7f;await rejectsCode(extractFilterFabMetadata(new Blob([malformed])), 'invalid');
await rejectsCode(extractFilterFabMetadata(new Blob([originalBytes.subarray(0,originalBytes.length-3)])), 'invalid');
await rejectsCode(embedFilterFabMetadata(embedded,envelope), 'duplicate');
await rejectsCode(extractFilterFabMetadata(await rawMetadataPng(JSON.stringify(envelope),{count:2})), 'duplicate');
await rejectsCode(extractFilterFabMetadata(await rawMetadataPng('x'.repeat(FILTER_FAB_PNG_METADATA_MAX_BYTES+1))), 'oversized');
assert.equal(await extractFilterFabMetadata(await rawMetadataPng('{"ignored":true}',{keyword:'Comment'})),null,'unrelated iTXt chunks must be ignored');
await rejectsCode(extractFilterFabMetadata(await rawMetadataPng('{broken')), 'invalid');
await rejectsCode(extractFilterFabMetadata(await rawMetadataPng(JSON.stringify({...envelope,schemaVersion:2}))), 'unsupported');
await rejectsCode(extractFilterFabMetadata(await rawMetadataPng(JSON.stringify({...envelope,documentType:'graph'}))), 'unsupported');
await rejectsCode(extractFilterFabMetadata(await rawMetadataPng(JSON.stringify({...envelope,schema:'other/png'}))), 'invalid');
assert.equal(await extractFilterFabMetadata(original),null,'ordinary PNGs must report no FilterFabJS metadata');
assert.throws(()=>createFilterFabPngEnvelope({...validated,version:1},'2.8.0'),/version 2/,'the PNG carrier must not weaken its native-v2 document contract');

for(const invalid of [
  filter({formulas:['r+','g','b','a']}),
  filter({controls:[{label:'Bad',value:'128'}]}),
  filter({tags:['ok',7]}),
  filter({id:'bad id'})
])assert.throws(()=>validateNativeFilter(invalid),'embedded filters must retain native validation rules');

async function route({metadata=envelope,choice='open'}={}){const events=[],source={name:'existing-source'},state={source};const result=await routeImageFileWithMetadata({name:'export.png',type:'image/png'},{extractMetadata:async()=>metadata,validateFilter:validateNativeFilter,chooseAction:async prompt=>{events.push(`choose:${prompt.kind}`);return choice;},openImage:async()=>{events.push('open');state.source={name:'new-source'};return true;},importFilter:async value=>{events.push(`import:${value.name}`);state.filter=value;}});return{events,state,result,source};}
let workflow=await route({choice:'open'});assert.deepEqual(workflow.events,['choose:valid','open']);assert.equal(workflow.state.source.name,'new-source','Open Image must load the PNG and ignore its filter');
workflow=await route({choice:'import'});assert.deepEqual(workflow.events,['choose:valid','import:Éclat ✨']);assert.equal(workflow.state.source,workflow.source,'Import Filter must preserve the existing source image');assert.equal(workflow.result.action,'import');
workflow=await route({choice:'cancel'});assert.deepEqual(workflow.events,['choose:valid']);assert.equal(workflow.state.source,workflow.source,'Cancel must preserve image state');assert.equal(workflow.state.filter,undefined,'Cancel must preserve filter state');
workflow=await route({metadata:null});assert.deepEqual(workflow.events,['open'],'ordinary PNGs must keep the normal opening path');
const invalidEnvelope={...envelope,document:{...envelope.document,formulas:['r+','g','b','a']}};workflow=await route({metadata:invalidEnvelope,choice:'open'});assert.deepEqual(workflow.events,['choose:invalid','open'],'invalid metadata must still allow normal image opening');

const rendered=validateNativeFilter(filter()),signatureValue=filterRenderSignature(rendered);
assert.equal(filterRenderSignature({...rendered,name:'Renamed',description:'Edited',tags:['New'],controls:rendered.controls.map(control=>({...control,label:'Changed',ui:{...control.ui,unit:'px'}}))}),signatureValue,'metadata-only edits must not stale rendered output');
assert.notEqual(filterRenderSignature({...rendered,formulas:['255-r','g','b','a']}),signatureValue,'formula edits must stale rendered output');
assert.notEqual(filterRenderSignature({...rendered,controls:rendered.controls.map((control,index)=>index?control:{...control,value:129})}),signatureValue,'control-value edits must stale rendered output');

console.log('PNG metadata smoke checks passed.');
