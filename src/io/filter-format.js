/**
 * Filter FabJS
 * Modular source extracted from v2.0.7; modular architecture v2.1.0.
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */
import { clamp } from '../core/utils.js';
import { CONTROL_COUNT, CONTROL_DEFINITIONS, cloneControlUI, normalizeControlUI } from '../core/controls.js';
import { FORMULA_LIMITS, Parser } from '../core/formula-language.js';

export const FILTER_FILE_MAX_BYTES=256*1024;
export const FILTER_TEXT_MAX_LENGTH=256*1024;
export const FILTER_DESCRIPTION_MAX_LENGTH=2000;
const validatedFormulaAsts=new WeakMap();

export function normalizeFilterText(text){return String(text??'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n')}
function assertFilterTextSize(text){if(String(text??'').length>FILTER_TEXT_MAX_LENGTH)throw new Error(`Filter file exceeds the ${FILTER_FILE_MAX_BYTES/1024} KiB limit`)}
function boundedString(value,name,maxLength,fallback=''){
  if(value===undefined||value===null)return fallback;
  if(typeof value!=='string')throw new Error(`Native filter ${name} must be a string`);
  const result=value.trim();if(result.length>maxLength)throw new Error(`Native filter ${name} exceeds ${maxLength} characters`);return result||fallback;
}
function validatedFormulas(formulas,label='Native filter'){
  if(!Array.isArray(formulas)||formulas.length!==4)throw new Error(`${label} must contain exactly four channel formulas`);
  const asts=[];
  const normalized=formulas.map((formula,index)=>{
    if(typeof formula!=='string'||!formula.trim())throw new Error(`${label} channel ${index+1} must be a non-empty formula string`);
    const normalized=formula.trim();if(normalized.length>FORMULA_LIMITS.maxLength)throw new Error(`${label} channel ${index+1} exceeds the ${FORMULA_LIMITS.maxLength}-character formula limit`);
    try{asts.push(new Parser(normalized).parse())}catch(error){throw new Error(`${label} channel ${index+1}: ${error.message}`)}
    return normalized;
  });
  return{normalized,asts};
}
export function getValidatedFormulaAsts(filter){return validatedFormulaAsts.get(filter)||null}
function controlValue(value,index){if(typeof value!=='number'||!Number.isFinite(value))throw new Error(`Native filter control ${index+1} must be a finite number`);return clamp(value,0,255)}
function controlLabel(value,index){if(value===undefined||value===null||value==='')return`Control ${index+1}`;if(typeof value!=='string')throw new Error(`Native filter control ${index+1} label must be a string`);const label=value.trim();if(label.length>80)throw new Error(`Native filter control ${index+1} label exceeds 80 characters`);return label||`Control ${index+1}`}
function normalizeNativeControls(data){
  if(data.controls!==undefined){
    if(!Array.isArray(data.controls)||data.controls.length>CONTROL_COUNT)throw new Error(`Native filter controls must be an array of at most ${CONTROL_COUNT} entries`);
    const controls=data.controls.map((control,index)=>{
      if(typeof control==='number')return{label:`Control ${index+1}`,value:controlValue(control,index),ui:cloneControlUI()};
      if(!control||typeof control!=='object'||Array.isArray(control))throw new Error(`Native filter control ${index+1} must be a number or object`);
      const ui=normalizeControlUI(control.ui),value=ui.widget==='toggle'?(controlValue(control.value,index)<127.5?0:255):controlValue(control.value,index);
      return{label:controlLabel(control.label,index),value,ui};
    });
    while(controls.length<CONTROL_COUNT){const definition=CONTROL_DEFINITIONS[controls.length];controls.push({label:definition.defaultLabel,value:definition.defaultValue,ui:cloneControlUI()});}
    return controls;
  }
  const values=data.values===undefined?[]:data.values,labels=data.labels===undefined?[]:data.labels;
  if(!Array.isArray(values)||values.length>CONTROL_COUNT)throw new Error(`Native filter values must be an array of at most ${CONTROL_COUNT} entries`);
  if(!Array.isArray(labels)||labels.length>CONTROL_COUNT)throw new Error(`Native filter labels must be an array of at most ${CONTROL_COUNT} entries`);
  return CONTROL_DEFINITIONS.map((definition,index)=>({label:controlLabel(labels[index],index),value:index<values.length?controlValue(values[index],index):definition.defaultValue,ui:cloneControlUI()}));
}
export function validateNativeFilter(data){
  if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Native filter JSON must contain an object');
  if(data.format!=='filter-fab-js')throw new Error('Native filter format must be “filter-fab-js”');
  if(!Number.isInteger(data.version)||![1,2].includes(data.version))throw new Error('Native filter version must be 1 or 2');
  if(data.mathMode!==undefined&&!['float','legacy'].includes(data.mathMode))throw new Error('Native filter mathMode must be “float” or “legacy”');
  const formulas=validatedFormulas(Array.isArray(data.formulas)?data.formulas:data.f);
  const result={format:'filter-fab-js',version:data.version,mathMode:data.mathMode??(data.version===1?'legacy':'float'),name:boundedString(data.name,'name',120,'Untitled Filter'),description:boundedString(data.description,'description',FILTER_DESCRIPTION_MAX_LENGTH),author:boundedString(data.author,'author',120),formulas:formulas.normalized,controls:normalizeNativeControls(data)};
  validatedFormulaAsts.set(result,formulas.asts);return result;
}
export function cleanAFSFormula(group){
  let formula='',continued=false;
  for(const rawLine of group.split('\n')){
    const lineContinues=/\\(?:r|n)/i.test(rawLine),line=rawLine.replace(/\\(?:r|n)/gi,'').trim();
    if(!line)continue;
    formula+=(formula?(continued?' ':'\n'):'')+line;continued=lineContinues;
  }
  return formula.trim();
}
export function splitAFSFormulaGroups(body){
  const separated=body.split(/\n[ \t]*\n+/).map(cleanAFSFormula).filter(Boolean);
  if(separated.length>=4)return separated;
  const formulas=[];let current='',depth=0,continued=false;
  for(const rawLine of body.split('\n')){
    const lineContinues=/\\(?:r|n)/i.test(rawLine),line=rawLine.replace(/\\(?:r|n)/gi,'').trim();
    if(!line){if(current.trim()&&depth===0){formulas.push(current.trim());current='';continued=false}continue}
    current+=(current?(continued?' ':'\n'):'')+line;continued=lineContinues;
    for(const ch of line.replace(/\/\/.*$/,'')){if(ch==='(')depth++;else if(ch===')')depth=Math.max(0,depth-1)}
    if(depth===0&&!continued){formulas.push(current.trim());current=''}
  }
  if(current.trim())formulas.push(current.trim());
  return formulas;
}
export function parseAFS(text,fileName=''){
  assertFilterTextSize(text);
  const normalized=normalizeFilterText(text),lines=normalized.split('\n'),header=(lines.shift()||'').trim();
  if(!/^%RGB(?:-[0-9]+(?:\.[0-9]+)*)?$/i.test(header))throw new Error('Not a supported RGB AFS file');
  if(lines.length<8)throw new Error('AFS file is missing its eight control values');
  const values=lines.splice(0,8).map((raw,index)=>{
    const token=raw.trim();
    if(!/^[+-]?\d+$/.test(token))throw new Error(`AFS control ${index+1} is not a valid integer`);
    const value=Number(token);
    if(!Number.isSafeInteger(value))throw new Error(`AFS control ${index+1} is not a valid integer`);
    return clamp(value,0,255);
  });
  const f=splitAFSFormulaGroups(lines.join('\n'));
  if(f.length!==4)throw new Error(`AFS file contains ${f.length} channel formula${f.length===1?'':'s'}; expected 4`);
  const formulas=validatedFormulas(f,'AFS filter');
  const base=String(fileName||'').replace(/\.[^.]+$/,'').trim();
  const labels=Array.from({length:8},(_,i)=>`Control ${i+1}`),controls=CONTROL_DEFINITIONS.map((definition,index)=>({label:labels[index]??definition.defaultLabel,value:values[index]??definition.defaultValue,ui:cloneControlUI()}));
  const result={format:'filter-factory-afs',version:header.replace(/^%RGB-?/i,'')||'1.0',name:base||'Imported AFS Filter',description:'',author:'',mathMode:'legacy',values,labels,f:formulas.normalized,controls};
  validatedFormulaAsts.set(result,formulas.asts);return result;
}
export function detectFilterFormat(text,fileName=''){
  assertFilterTextSize(text);
  const normalized=normalizeFilterText(text),trimmed=normalized.trimStart(),extension=(fileName.match(/\.([^.]+)$/)?.[1]||'').toLowerCase();
  if(trimmed.startsWith('{')||extension==='json')return{kind:'native',data:validateNativeFilter(JSON.parse(normalized))};
  if(/^%RGB(?:-[0-9]+(?:\.[0-9]+)*)?/i.test(trimmed)||extension==='afs')return{kind:'afs',data:parseAFS(normalized,fileName)};
  throw new Error('Unsupported filter format. Choose a Filter FabJS .json file or a historic .afs file');
}
