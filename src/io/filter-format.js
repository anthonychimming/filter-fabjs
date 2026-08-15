/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { clamp } from '../core/utils.js';

export function normalizeFilterText(text){return String(text??'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')}
export function validateNativeFilter(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Native filter JSON must contain an object');
  const formulas=Array.isArray(data.formulas)?data.formulas:Array.isArray(data.f)?data.f:null;
  if(!formulas||formulas.length<4)throw new Error('Native filter JSON must contain four channel formulas');
  if(formulas.slice(0,4).some(formula=>typeof formula!=='string'||!formula.trim()))throw new Error('Native filter formulas must be non-empty strings');
  return data;
}
export function cleanAFSFormula(group){
  return group
    .replace(/\\(?:r|n)/gi,'')
    .split('\n')
    .map(line=>line.trim())
    .filter(Boolean)
    .join(' ')
    .trim();
}
export function splitAFSFormulaGroups(body){
  const separated=body.split(/\n[ \t]*\n+/).map(cleanAFSFormula).filter(Boolean);
  if(separated.length>=4)return separated.slice(0,4);
  const formulas=[];let current='',depth=0;
  for(const rawLine of body.split('\n')){
    const line=rawLine.replace(/\\(?:r|n)/gi,'').trim();
    if(!line){if(current.trim()&&depth===0){formulas.push(current.trim());current=''}continue}
    current+=(current?' ':'')+line;
    for(const ch of line){if(ch==='(')depth++;else if(ch===')')depth=Math.max(0,depth-1)}
    if(depth===0){formulas.push(current.trim());current=''}
  }
  if(current.trim())formulas.push(current.trim());
  return formulas.slice(0,4);
}
export function parseAFS(text,fileName=''){
  const normalized=normalizeFilterText(text),lines=normalized.split('\n'),header=(lines.shift()||'').trim();
  if(!/^%RGB(?:-[0-9]+(?:\.[0-9]+)*)?$/i.test(header))throw new Error('Not a supported RGB AFS file');
  if(lines.length<8)throw new Error('AFS file is missing its eight control values');
  const values=lines.splice(0,8).map((raw,index)=>{
    const value=Number.parseInt(raw.trim(),10);
    if(!Number.isFinite(value))throw new Error(`AFS control ${index+1} is not a valid integer`);
    return clamp(value,0,255);
  });
  const f=splitAFSFormulaGroups(lines.join('\n'));
  if(f.length!==4)throw new Error(`AFS file contains ${f.length} channel formula${f.length===1?'':'s'}; expected 4`);
  const base=String(fileName||'').replace(/\.[^.]+$/,'').trim();
  return{format:'filter-factory-afs',version:header.replace(/^%RGB-?/i,'')||'1.0',name:base||'Imported AFS Filter',author:'',mathMode:'legacy',values,labels:Array.from({length:8},(_,i)=>`Control ${i+1}`),f};
}
export function detectFilterFormat(text,fileName=''){
  const normalized=normalizeFilterText(text),trimmed=normalized.trimStart(),extension=(fileName.match(/\.([^.]+)$/)?.[1]||'').toLowerCase();
  if(trimmed.startsWith('{')||extension==='json')return{kind:'native',data:validateNativeFilter(JSON.parse(normalized))};
  if(/^%RGB(?:-[0-9]+(?:\.[0-9]+)*)?/i.test(trimmed)||extension==='afs')return{kind:'afs',data:parseAFS(normalized,fileName)};
  throw new Error('Unsupported filter format. Choose a Filter FabJS .json file or a historic .afs file');
}
