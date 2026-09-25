// Metadata validation only; transport and portable filter documents are separate boundaries.
import { normalizeTags, validatePortableId } from '../core/filter-metadata.js';

export const ONLINE_LIBRARY_MAX_ENTRIES=1000;
export const ONLINE_LIBRARY_MAX_ASSET_PATH_LENGTH=2048;
export const ONLINE_LIBRARY_MAX_TIMESTAMP_LENGTH=120;

function object(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error(`Online library ${label} must be an object`);
}
function positiveInteger(value,label){
  if(!Number.isSafeInteger(value)||value<1)throw new Error(`Online library ${label} must be a positive safe integer`);
  return value;
}
function metadataText(value,label,limit,required=false){
  if(value===undefined&&!required)return '';
  if(typeof value!=='string')throw new Error(`Online library filter ${label} must be a string`);
  const result=value.trim();
  if(result.length>limit||(required&&!result))throw new Error(`Online library filter ${label} must contain ${required?'1':'0'}–${limit} characters`);
  return result;
}
function assetPath(value,label,extension){
  const fail=()=>{throw new Error(`Online library ${label} path must be a relative ${label==='package'?'PNG':'PNG or WebP'} asset`);};
  if(typeof value!=='string'||value.length>ONLINE_LIBRARY_MAX_ASSET_PATH_LENGTH||/\p{Cc}/u.test(value))fail();
  const path=value.trim();
  // Check encoded traversal/separators too, without rewriting the supplied path.
  let decoded;try{decoded=decodeURIComponent(path);}catch{fail();}
  for(const candidate of [path,decoded]){
    if(!candidate||candidate.startsWith('/')||/[\\?#\p{Cc}]/u.test(candidate)||/^[A-Za-z][A-Za-z0-9+.-]*:/.test(candidate)||candidate.split('/').some(segment=>segment==='.'||segment==='..'))fail();
  }
  if(!extension.test(path))fail();
  return path;
}
function publicationDate(value){
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error('Online library publishedAt must be a real YYYY-MM-DD date');
  const date=new Date(`${value}T00:00:00Z`);
  if(!Number.isFinite(date.getTime())||date.toISOString().slice(0,10)!==value)throw new Error('Online library publishedAt must be a real YYYY-MM-DD date');
  return value;
}
function filterMetadata(value){
  object(value,'filter');
  if(value.id===undefined)throw new Error('Online library filter id is required');
  const id=validatePortableId(value.id),revision=positiveInteger(value.revision,'filter revision');
  if(value.documentType!=='filter')throw new Error('Unsupported online library document type');
  if(value.filterFormat!==2)throw new Error('Unsupported online library filter format');
  object(value.preview,'preview');object(value.package,'package');
  for(const dimension of ['width','height'])if(!Number.isInteger(value.preview[dimension])||value.preview[dimension]<1||value.preview[dimension]>2048)throw new Error(`Online library preview ${dimension} must be an integer from 1 to 2048`);
  return{
    id,revision,name:metadataText(value.name,'name',120,true),
    author:metadataText(value.author,'author',120),description:metadataText(value.description,'description',2000),
    tags:normalizeTags(value.tags),documentType:'filter',filterFormat:2,
    ...(value.publishedAt===undefined?{}:{publishedAt:publicationDate(value.publishedAt)}),
    preview:{url:assetPath(value.preview.url,'preview',/\.(png|webp)$/i),width:value.preview.width,height:value.preview.height},
    package:{url:assetPath(value.package.url,'package',/\.png$/i)}
  };
}

/** Validate an already-parsed manifest and return a fresh, known-fields-only projection. */
export function validateOnlineLibraryManifest(value){
  object(value,'manifest');
  if(value.schema!=='filter-fab-js/library')throw new Error('Online library schema is invalid');
  if(value.schemaVersion!==1)throw new Error('Unsupported online library schema version');
  const libraryVersion=positiveInteger(value.libraryVersion,'libraryVersion');
  if(!Array.isArray(value.filters)||value.filters.length>ONLINE_LIBRARY_MAX_ENTRIES)throw new Error(`Online library filters must be an array of at most ${ONLINE_LIBRARY_MAX_ENTRIES} entries`);
  if(value.generatedAt!==undefined&&(typeof value.generatedAt!=='string'||!value.generatedAt.trim()||value.generatedAt.length>ONLINE_LIBRARY_MAX_TIMESTAMP_LENGTH||!Number.isFinite(Date.parse(value.generatedAt))))throw new Error('Online library generatedAt must be a valid timestamp of at most 120 characters');
  const filters=[],ids=new Set();
  for(const valueFilter of value.filters){
    const filter=filterMetadata(valueFilter);
    if(ids.has(filter.id))throw new Error(`Online library contains duplicate filter ID "${filter.id}"`);
    ids.add(filter.id);filters.push(filter);
  }
  return{schema:'filter-fab-js/library',schemaVersion:1,libraryVersion,...(value.generatedAt===undefined?{}:{generatedAt:value.generatedAt}),filters};
}
