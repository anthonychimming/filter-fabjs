import { validatePortableId } from '../core/filter-metadata.js';

export const PUBLIC_APP_URL='https://anthonychimming.github.io/filter-fabjs/';
export function serializeFilterRef(ref){
  if(!ref||!['builtin','online'].includes(ref.source)||!ref.id)throw new Error('Invalid public filter reference');
  validatePortableId(ref.id);
  return `${ref.source}.${ref.id}`;
}
export function parseFilterRoute(input){
  const params=input instanceof URL?input.searchParams:input;
  if(input instanceof URL){
    for(const part of input.search.slice(1).split('&')){
      const [key,...value]=part.split('=');
      let decodedKey;try{decodedKey=decodeURIComponent(key.replace(/\+/g,' '));}catch{continue;}
      if(decodedKey==='filter'){try{decodeURIComponent(value.join('=').replace(/\+/g,' '));}catch{throw new Error('Malformed filter route');}}
    }
  }
  const values=params.getAll('filter');
  if(!values.length)return null;
  if(values.length!==1||values[0].length>90)throw new Error('Invalid filter route');
  const match=/^(builtin|online)\.([A-Za-z0-9_-]{1,80})$/.exec(values[0]);
  if(!match)throw new Error('Invalid filter route');
  const ref={source:match[1],id:match[2]};serializeFilterRef(ref);return ref;
}
export function updateFilterUrl(input,ref){
  const url=new URL(input.href);url.searchParams.delete('filter');
  if(ref&&!(ref.source==='builtin'&&ref.id==='pass'))url.searchParams.set('filter',serializeFilterRef(ref));
  return url;
}
export function publicFilterUrl(ref){return updateFilterUrl(new URL(PUBLIC_APP_URL),ref).href;}
