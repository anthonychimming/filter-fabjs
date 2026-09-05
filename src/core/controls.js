/**
 * Filter FabJS
 * Licensed GPL-2.0-or-later. See LICENSE and README.md.
 */

import { clamp } from './utils.js';

export const DEFAULT_CONTROL_VALUE=128;
export const CONTROL_UI_WIDGETS=Object.freeze(['slider','number','toggle','seed']);
export const CONTROL_UI_FORMATS=Object.freeze(['number','integer']);
export const CONTROL_UNIT_MAX_LENGTH=12;
export const DEFAULT_CONTROL_UI=Object.freeze({widget:'slider',displayMin:0,displayMax:255,step:1,format:'number',unit:''});
export const CONTROL_DEFINITIONS=Object.freeze(Array.from({length:10},(_,index)=>Object.freeze({index,defaultValue:DEFAULT_CONTROL_VALUE,defaultLabel:`Control ${index+1}`})));
export const CONTROL_COUNT=CONTROL_DEFINITIONS.length;
export const CONTROL_PAIR_COUNT=Math.floor(CONTROL_COUNT/2);

export function cloneControlUI(ui=DEFAULT_CONTROL_UI){return{widget:ui.widget,displayMin:ui.displayMin,displayMax:ui.displayMax,step:ui.step,format:ui.format,unit:ui.unit}}
export function normalizeControlUI(value){
  if(!value||typeof value!=='object'||Array.isArray(value))return cloneControlUI();
  const widget=CONTROL_UI_WIDGETS.includes(value.widget)?value.widget:DEFAULT_CONTROL_UI.widget;
  const format=widget==='seed'?'integer':CONTROL_UI_FORMATS.includes(value.format)?value.format:DEFAULT_CONTROL_UI.format;
  let displayMin=Number.isFinite(value.displayMin)?value.displayMin:DEFAULT_CONTROL_UI.displayMin;
  let displayMax=Number.isFinite(value.displayMax)?value.displayMax:DEFAULT_CONTROL_UI.displayMax;
  if(displayMax<=displayMin){displayMin=DEFAULT_CONTROL_UI.displayMin;displayMax=DEFAULT_CONTROL_UI.displayMax;}
  const range=displayMax-displayMin;
  const step=Number.isFinite(value.step)&&value.step>0&&value.step<=range?value.step:Math.min(DEFAULT_CONTROL_UI.step,range);
  const unit=typeof value.unit==='string'?value.unit.slice(0,CONTROL_UNIT_MAX_LENGTH):DEFAULT_CONTROL_UI.unit;
  return{widget,displayMin,displayMax,step,format,unit};
}
export function validateControlUI(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Control presentation must be an object');
  if(!CONTROL_UI_WIDGETS.includes(value.widget))throw new Error(`Widget must be one of: ${CONTROL_UI_WIDGETS.join(', ')}`);
  if(!Number.isFinite(value.displayMin))throw new Error('Display minimum must be a finite number');
  if(!Number.isFinite(value.displayMax)||value.displayMax<=value.displayMin)throw new Error('Display maximum must be a finite number greater than the minimum');
  const range=value.displayMax-value.displayMin;
  if(!Number.isFinite(value.step)||value.step<=0||value.step>range)throw new Error('Step must be positive and no larger than the display range');
  if(!CONTROL_UI_FORMATS.includes(value.format))throw new Error(`Format must be one of: ${CONTROL_UI_FORMATS.join(', ')}`);
  if(typeof value.unit!=='string')throw new Error('Unit must be a string');
  if(value.unit.length>CONTROL_UNIT_MAX_LENGTH)throw new Error(`Unit exceeds ${CONTROL_UNIT_MAX_LENGTH} characters`);
  return{...cloneControlUI(value),format:value.widget==='seed'?'integer':value.format};
}
export function rawToDisplay(raw,ui=DEFAULT_CONTROL_UI){const normalized=normalizeControlUI(ui);return normalized.displayMin+(clamp(Number(raw)||0,0,255)/255)*(normalized.displayMax-normalized.displayMin)}
export function snapDisplay(value,ui=DEFAULT_CONTROL_UI){const normalized=normalizeControlUI(ui),numeric=Number(value);if(!Number.isFinite(numeric))return normalized.displayMin;const steps=Math.round((numeric-normalized.displayMin)/normalized.step);return clamp(normalized.displayMin+steps*normalized.step,normalized.displayMin,normalized.displayMax)}
export function displayToRaw(value,ui=DEFAULT_CONTROL_UI){const normalized=normalizeControlUI(ui),display=snapDisplay(value,normalized),t=(display-normalized.displayMin)/(normalized.displayMax-normalized.displayMin);return clamp(t*255,0,255)}
function decimalPlaces(step){
  if(!Number.isFinite(step)||step<=0)return 0;
  const text=step.toString().toLowerCase();
  if(text.includes('e-'))return Math.min(12,Number(text.split('e-')[1])||0);
  return Math.min(12,(text.split('.')[1]||'').length);
}
export function formatControlValue(value,ui=DEFAULT_CONTROL_UI){
  const normalized=normalizeControlUI(ui),numeric=Number(value);if(!Number.isFinite(numeric))return'';
  if(normalized.format==='integer')return String(Math.round(numeric));
  const precision=decimalPlaces(normalized.step),rounded=Number(numeric.toFixed(precision));return String(Object.is(rounded,-0)?0:rounded);
}
export function normalizeToggleRaw(raw){return clamp(Number(raw)||0,0,255)<127.5?0:255}
export function randomSeedDisplay(ui=DEFAULT_CONTROL_UI,random=Math.random){
  const normalized=normalizeControlUI(ui),minimum=Math.ceil(normalized.displayMin),maximum=Math.floor(normalized.displayMax);
  if(maximum<minimum)return Math.round(snapDisplay(normalized.displayMin,normalized));
  const value=minimum+Math.floor(clamp(Number(random())||0,0,0.9999999999999999)*(maximum-minimum+1));return Math.round(snapDisplay(value,normalized));
}
export const defaultControlValues=()=>CONTROL_DEFINITIONS.map(definition=>definition.defaultValue);
export const defaultControlLabels=()=>CONTROL_DEFINITIONS.map(definition=>definition.defaultLabel);
export const defaultControlUIs=()=>CONTROL_DEFINITIONS.map(()=>cloneControlUI());
