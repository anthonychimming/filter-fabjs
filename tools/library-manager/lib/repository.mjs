import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { inspectNativeSource, inspectPortablePackage, validateRegistry } from '../../online-library/publish-library.mjs';
import { FILTER_FILE_MAX_BYTES, normalizeFilterText } from '../../../src/io/filter-format.js';
import { ONLINE_LIBRARY_PACKAGE_MAX_BYTES } from '../../../src/io/filter-library-package.js';
import { validatePortableId } from '../../../src/core/filter-metadata.js';

export const REGISTRY_LIMIT=1024*1024;
export const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function problem(code,message,extra={}){return Object.assign(new Error(message),{code,...extra});}
export function requireId(id){if(typeof id!=='string'||!validatePortableId(id))throw problem('INVALID_ID','A portable filter ID is required.');return id;}
export function relativePath(file){
  if(typeof file!=='string'||!(/^(registry\.json|source\/[A-Za-z0-9_-]{1,80}\.json|filters\/[A-Za-z0-9_-]{1,80}-r[1-9][0-9]*\.png)$/.test(file)))throw problem('UNSAFE_PATH','Only canonical library files can be accessed.');
  return file;
}
export async function checkedPath(root,file,{missing=false}={}){
  relativePath(file);let current=root;
  for(const part of file.split('/')){
    const names=await fs.readdir(current);
    if(!names.includes(part)){
      if(names.some(name=>name.toLowerCase()===part.toLowerCase()))throw problem('CASE_COLLISION',`Filename case collision: ${file}`);
      if(missing&&part===file.split('/').at(-1))return path.join(current,part);
      throw problem('FILE_MISSING',`Missing library file: ${file}`,{path:file});
    }
    current=path.join(current,part);const stat=await fs.lstat(current);
    if(stat.isSymbolicLink())throw problem('UNSAFE_PATH',`Symlinks are not library inputs: ${file}`);
    if(part!==file.split('/').at(-1)&&!stat.isDirectory())throw problem('UNSAFE_PATH',`Expected a directory: ${file}`);
  }
  return current;
}
export async function readCanonical(root,file,limit){
  const target=await checkedPath(root,file),stat=await fs.lstat(target);
  if(!stat.isFile()||stat.size>limit)throw problem('FILE_TOO_LARGE',`Expected a regular file of at most ${limit} bytes: ${file}`,{path:file});
  const bytes=await fs.readFile(target);if(bytes.length>limit)throw problem('FILE_TOO_LARGE',`File grew beyond limit: ${file}`);return bytes;
}
export async function openRepository(root){
  root=await fs.realpath(path.resolve(root));
  for(const directory of ['source','filters']){const stat=await fs.lstat(path.join(root,directory));if(!stat.isDirectory()||stat.isSymbolicLink())throw problem('UNSAFE_PATH',`${directory} must be a real directory.`);}
  return root;
}
export function diagnostic(error,file){return{code:error.code||'LIBRARY_VALIDATION_FAILED',path:error.path||file||null,message:error.message};}
export async function scanRepository(root,cache=new Map()){
  const files=new Map(),sources=new Map(),packages=new Map(),errors=[];
  let registry=null;
  try{const bytes=await readCanonical(root,'registry.json',REGISTRY_LIMIT);files.set('registry.json',{hash:digest(bytes),size:bytes.length});registry=validateRegistry(JSON.parse(normalizeFilterText(new TextDecoder('utf-8',{fatal:true}).decode(bytes))));}
  catch(error){errors.push(diagnostic(error,'registry.json'));}
  for(const directory of ['source','filters']){
    const names=(await fs.readdir(path.join(root,directory))).filter(name=>name!=='.gitkeep').sort();
    if(names.length>(directory==='source'?1000:10000))throw problem('REPOSITORY_LIMIT','Manager supports at most 1,000 sources and 10,000 historical packages.');
    for(const name of names){
      const file=`${directory}/${name}`;let item={file,document:null,error:null};
      try{
        relativePath(file);const bytes=await readCanonical(root,file,directory==='source'?FILTER_FILE_MAX_BYTES:ONLINE_LIBRARY_PACKAGE_MAX_BYTES),hash=digest(bytes),stat=await fs.stat(await checkedPath(root,file));
        files.set(file,{hash,size:bytes.length});item={...item,size:bytes.length,modifiedAt:stat.mtime.toISOString()};
        if(cache.get(file)?.hash===hash)item={...item,...cache.get(file).data};
        else if(directory==='source')item.document=inspectNativeSource(bytes,file,name.slice(0,-5));
        else{const match=/^(.+)-r([1-9][0-9]*)\.png$/.exec(name);if(!Number.isSafeInteger(Number(match[2])))throw problem('INVALID_REVISION',`Invalid revision: ${file}`);const inspected=await inspectPortablePackage(bytes,file,match[1]);Object.assign(item,{id:match[1],revision:Number(match[2]),document:inspected.document,envelope:inspected.envelope});}
        cache.set(file,{hash,data:{document:item.document,id:item.id,revision:item.revision,envelope:item.envelope}});
      }catch(error){item.error=diagnostic(error,file);errors.push(item.error);}
      if(directory==='source')sources.set(name.slice(0,-5),item);
      else{const match=/^(.+)-r([1-9][0-9]*)\.png$/.exec(name);if(match){item.id??=match[1];item.revision??=Number(match[2]);packages.set(file,item);}}
    }
  }
  for(const file of cache.keys())if(!files.has(file))cache.delete(file);
  const folded=new Map();
  for(const id of new Set([...sources.keys(),...[...packages.values()].map(item=>item.id),...(registry?.filters.map(item=>item.id)||[])])){
    const other=folded.get(id.toLowerCase());if(other&&other!==id){const error={code:'CASE_COLLISION',path:null,message:`Filter IDs ${other} and ${id} collide on case-insensitive filesystems.`};errors.push(error);if(sources.has(id))sources.get(id).error=error;if(sources.has(other))sources.get(other).error=error;}else folded.set(id.toLowerCase(),id);
  }
  const fingerprint=digest(JSON.stringify([...files].sort(([a],[b])=>a.localeCompare(b))));
  return{registry,sources,packages,files,fingerprint,errors};
}
export async function copySnapshot(root,target,snapshot){
  await fs.mkdir(path.join(target,'source'),{recursive:true});await fs.mkdir(path.join(target,'filters'),{recursive:true});
  for(const [file,info] of snapshot.files){const bytes=await readCanonical(root,file,file==='registry.json'?REGISTRY_LIMIT:file.startsWith('source/')?FILTER_FILE_MAX_BYTES:ONLINE_LIBRARY_PACKAGE_MAX_BYTES);if(digest(bytes)!==info.hash)throw problem('STALE_REPOSITORY','Library changed during snapshot creation. Refresh and retry.');const mode=(await fs.lstat(await checkedPath(root,file))).mode&0o777;await fs.writeFile(path.join(target,file),bytes,{flag:'wx',mode});}
}
