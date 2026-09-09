// Portable metadata only: no compiler or renderer dependencies.
export function validatePortableId(id){
  if(id===undefined)return undefined;
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{1,80}$/.test(id))throw new Error('Native filter id must contain 1–80 letters, digits, underscores or hyphens');
  return id;
}
export function tagKey(tag){return tag.normalize('NFC').toLowerCase();}
export function normalizeTags(tags=[]){
  if(!Array.isArray(tags)||tags.length>20)throw new Error('Tags must be an array of at most 20 tags');
  const result=[],seen=new Set();
  for(const value of tags){
    if(typeof value!=='string'||/[\p{Cc}\p{Cf}]/u.test(value))throw new Error('Tags must be text without control characters');
    const label=value.normalize('NFC').trim().replace(/\s+/gu,' ');
    if(!label||[...label].length>32)throw new Error('Each tag must contain 1–32 Unicode characters');
    const key=tagKey(label);if(!seen.has(key)){seen.add(key);result.push(label);}
  }
  return result;
}
export function searchText(value){return String(value??'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/gu,' ');}
export function portableContent(filter){
  return JSON.stringify([filter.name,filter.author||'',filter.description||'',normalizeTags(filter.tags).map(tagKey).sort(),filter.mathMode,filter.formulas,filter.controls]);
}
