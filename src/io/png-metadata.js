/**
 * Filter FabJS PNG metadata carrier. This module intentionally has no DOM,
 * renderer, compiler, or application-state dependencies.
 */

export const FILTER_FAB_PNG_KEYWORD='FilterFabJS';
export const FILTER_FAB_PNG_SCHEMA='filter-fab-js/png';
export const FILTER_FAB_PNG_SCHEMA_VERSION=1;
export const FILTER_FAB_PNG_DOCUMENT_MAX_BYTES=256*1024;
export const FILTER_FAB_PNG_METADATA_MAX_BYTES=FILTER_FAB_PNG_DOCUMENT_MAX_BYTES+4096;
export const PNG_PARSE_MAX_BYTES=128*1024*1024;

const PNG_SIGNATURE=Uint8Array.of(137,80,78,71,13,10,26,10);
const textEncoder=new TextEncoder(),textDecoder=new TextDecoder('utf-8',{fatal:true});
const crcTable=(()=>{const table=new Uint32Array(256);for(let n=0;n<256;n++){let value=n;for(let bit=0;bit<8;bit++)value=(value&1)?0xedb88320^(value>>>1):value>>>1;table[n]=value>>>0;}return table;})();

export class PngMetadataError extends Error{
  constructor(message,code='invalid'){super(message);this.name='PngMetadataError';this.code=code;}
}

function fail(message,code){throw new PngMetadataError(message,code)}
function bytesEqual(bytes,offset,expected){return expected.every((value,index)=>bytes[offset+index]===value)}
function readU32(bytes,offset){return ((bytes[offset]*0x1000000)+((bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3]))>>>0}
function writeU32(bytes,offset,value){bytes[offset]=(value>>>24)&255;bytes[offset+1]=(value>>>16)&255;bytes[offset+2]=(value>>>8)&255;bytes[offset+3]=value&255;}
function concatBytes(parts){const length=parts.reduce((sum,part)=>sum+part.length,0),result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}return result;}
function crc32(parts){let crc=0xffffffff;for(const part of parts)for(const byte of part)crc=crcTable[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
function chunk(type,data){const typeBytes=textEncoder.encode(type),result=new Uint8Array(12+data.length);writeU32(result,0,data.length);result.set(typeBytes,4);result.set(data,8);writeU32(result,8+data.length,crc32([typeBytes,data]));return result;}
function jsonBytes(value,label){let json;try{json=JSON.stringify(value);}catch{fail(`${label} is not serializable`)}if(json===undefined)fail(`${label} is not serializable`);return textEncoder.encode(json);}

export function createFilterFabPngEnvelope(document,appVersion){
  if(!document||typeof document!=='object'||Array.isArray(document))fail('PNG filter document must be an object');
  if(document.format!=='filter-fab-js'||document.version!==2)fail('PNG metadata requires a native Filter FabJS version 2 document');
  if(typeof appVersion!=='string'||!appVersion.trim()||appVersion.length>40)fail('PNG generator version is invalid');
  if(jsonBytes(document,'PNG filter document').length>FILTER_FAB_PNG_DOCUMENT_MAX_BYTES)fail('Embedded filter document exceeds the 256 KiB limit','oversized');
  return{schema:FILTER_FAB_PNG_SCHEMA,schemaVersion:FILTER_FAB_PNG_SCHEMA_VERSION,generator:{name:'Filter FabJS',version:appVersion.trim()},documentType:'filter',document};
}

export function validateFilterFabPngEnvelope(value){
  if(!value||typeof value!=='object'||Array.isArray(value))fail('Filter FabJS PNG metadata must contain an object');
  if(value.schema!==FILTER_FAB_PNG_SCHEMA)fail('Filter FabJS PNG metadata schema is invalid');
  if(value.schemaVersion!==FILTER_FAB_PNG_SCHEMA_VERSION)fail('Unsupported Filter FabJS PNG metadata version','unsupported');
  if(value.documentType!=='filter')fail('Unsupported Filter FabJS PNG document type','unsupported');
  if(!value.generator||typeof value.generator!=='object'||Array.isArray(value.generator)||value.generator.name!=='Filter FabJS'||typeof value.generator.version!=='string'||!value.generator.version.trim()||value.generator.version.length>40)fail('Filter FabJS PNG generator metadata is invalid');
  if(!value.document||typeof value.document!=='object'||Array.isArray(value.document))fail('Filter FabJS PNG filter document is invalid');
  if(value.document.format!=='filter-fab-js'||value.document.version!==2)fail('PNG metadata requires a native Filter FabJS version 2 document');
  if(jsonBytes(value.document,'PNG filter document').length>FILTER_FAB_PNG_DOCUMENT_MAX_BYTES)fail('Embedded filter document exceeds the 256 KiB limit','oversized');
  return value;
}

function parseChunks(bytes){
  if(bytes.length<PNG_SIGNATURE.length||!bytesEqual(bytes,0,PNG_SIGNATURE))fail('File does not have a valid PNG signature');
  const chunks=[];let offset=PNG_SIGNATURE.length,sawIend=false;
  while(offset<bytes.length){
    if(bytes.length-offset<12)fail('PNG contains a truncated chunk');
    const length=readU32(bytes,offset),dataStart=offset+8,dataEnd=dataStart+length,chunkEnd=dataEnd+4;
    if(!Number.isSafeInteger(chunkEnd)||chunkEnd>bytes.length)fail('PNG chunk length exceeds the available data');
    const typeBytes=bytes.subarray(offset+4,offset+8);let type;try{type=textDecoder.decode(typeBytes);}catch{fail('PNG chunk type is invalid')}
    if(!/^[A-Za-z]{4}$/.test(type))fail('PNG chunk type is invalid');
    chunks.push({type,typeBytes,data:bytes.subarray(dataStart,dataEnd),crc:readU32(bytes,dataEnd),start:offset,end:chunkEnd});offset=chunkEnd;
    if(type==='IEND'){if(length!==0)fail('PNG IEND chunk is malformed');sawIend=true;break;}
  }
  if(!sawIend)fail('PNG is missing its IEND chunk');
  if(offset!==bytes.length)fail('PNG contains data after IEND');
  return chunks;
}

function metadataPayload(data){
  const keywordEnd=data.indexOf(0);if(keywordEnd<0)return null;
  let keyword;try{keyword=textDecoder.decode(data.subarray(0,keywordEnd));}catch{return null}
  if(keyword!==FILTER_FAB_PNG_KEYWORD)return null;
  let offset=keywordEnd+1;if(data.length-offset<4)fail('Filter FabJS iTXt metadata is truncated');
  const compressionFlag=data[offset++],compressionMethod=data[offset++];if(compressionFlag!==0||compressionMethod!==0)fail('Filter FabJS iTXt metadata must be uncompressed');
  const languageEnd=data.indexOf(0,offset);if(languageEnd<0)fail('Filter FabJS iTXt language field is truncated');offset=languageEnd+1;
  const translatedEnd=data.indexOf(0,offset);if(translatedEnd<0)fail('Filter FabJS iTXt translated keyword is truncated');offset=translatedEnd+1;
  return data.subarray(offset);
}

async function blobBytes(blob){
  if(!blob||typeof blob.arrayBuffer!=='function')fail('PNG metadata input must be a Blob or File');
  if(Number.isFinite(Number(blob.size))&&Number(blob.size)>PNG_PARSE_MAX_BYTES)fail('PNG exceeds the bounded metadata parsing limit','oversized');
  const bytes=new Uint8Array(await blob.arrayBuffer());if(bytes.length>PNG_PARSE_MAX_BYTES)fail('PNG exceeds the bounded metadata parsing limit','oversized');return bytes;
}

export async function embedFilterFabMetadata(pngBlob,envelope){
  const validated=validateFilterFabPngEnvelope(envelope),bytes=await blobBytes(pngBlob),chunks=parseChunks(bytes),payload=jsonBytes(validated,'Filter FabJS PNG metadata');
  if(payload.length>FILTER_FAB_PNG_METADATA_MAX_BYTES)fail('Filter FabJS PNG metadata exceeds its size limit','oversized');
  for(const item of chunks)if(item.type==='iTXt'&&metadataPayload(item.data)!==null)fail('PNG already contains Filter FabJS metadata','duplicate');
  const prefix=textEncoder.encode(`${FILTER_FAB_PNG_KEYWORD}\0`),fields=Uint8Array.of(0,0,0,0),metadataChunk=chunk('iTXt',concatBytes([prefix,fields,payload])),iend=chunks.at(-1);
  const output=concatBytes([bytes.subarray(0,iend.start),metadataChunk,bytes.subarray(iend.start)]);return new Blob([output],{type:'image/png'});
}

export async function extractFilterFabMetadata(pngBlobOrFile){
  const bytes=await blobBytes(pngBlobOrFile),chunks=parseChunks(bytes);let matched=null;
  for(const item of chunks){
    if(item.type!=='iTXt')continue;const payload=metadataPayload(item.data);if(payload===null)continue;
    if(matched)fail('PNG contains duplicate Filter FabJS metadata chunks','duplicate');matched={item,payload};
  }
  if(!matched)return null;
  if(matched.payload.length>FILTER_FAB_PNG_METADATA_MAX_BYTES)fail('Filter FabJS PNG metadata exceeds its size limit','oversized');
  if(crc32([matched.item.typeBytes,matched.item.data])!==matched.item.crc)fail('Filter FabJS PNG metadata CRC check failed','crc');
  let text;try{text=textDecoder.decode(matched.payload);}catch{fail('Filter FabJS PNG metadata is not valid UTF-8')}
  let value;try{value=JSON.parse(text);}catch{fail('Filter FabJS PNG metadata is not valid JSON')}
  return validateFilterFabPngEnvelope(value);
}
