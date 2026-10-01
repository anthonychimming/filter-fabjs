import assert from 'node:assert/strict';
import { createExploreSession, exploreValues, MUTATION_FACTORS, controlStatesEqual } from '../src/app/explore-state.js';
import { defaultControlValues, defaultControlUIs, rawToDisplay, displayToRaw } from '../src/core/controls.js';
import { createExploreController, exploreMenuPlacement } from '../src/ui/explore.js';
import { installBrowserDom } from './helpers/browser-dom.mjs';

const state={controls:defaultControlValues(),controlUIs:defaultControlUIs(),usedControls:Array(10).fill(true),isRendering:false};
state.explore=createExploreSession(state.controls);
state.controlUIs[1]={widget:'number',displayMin:-10,displayMax:10,step:.25,format:'number',unit:''};
state.controlUIs[2]={widget:'toggle',displayMin:0,displayMax:1,step:1,format:'integer',unit:''};state.controls[2]=0;
state.controlUIs[3]={widget:'seed',displayMin:1,displayMax:9999,step:1,format:'integer',unit:''};
state.explore.locks[0]=true;state.usedControls[9]=false;
for(const mutate of [false,true]){
  const next=exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,mutate,()=>.75);
  assert.equal(next[0],128);assert.equal(next[9],128);
  next.forEach(v=>assert.ok(v>=0&&v<=255));
  assert.equal(rawToDisplay(next[1],state.controlUIs[1])/.25,Math.round(rawToDisplay(next[1],state.controlUIs[1])/.25));
  assert.ok([0,255].includes(next[2]));assert.equal(rawToDisplay(next[3],state.controlUIs[3]),7500);
}
state.explore.locks={};state.controls[0]=100;
for(const [strength,factor] of Object.entries(MUTATION_FACTORS)){
  state.explore.strength=strength;
  const next=exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,true,()=>.75);
  assert.equal(next[0],displayToRaw(100+.5*255*factor));
  assert.equal(exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,true,()=>factor-.001)[2],255);
  assert.equal(exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,true,()=>factor)[2],0);
}
state.controls[3]=0;
assert.notEqual(exploreValues(state.controls,state.controlUIs,state.usedControls,state.explore,true,()=>0)[3],0,'seed rerolls must differ when possible');
assert.ok(controlStatesEqual([1],[1+1e-12]));assert.ok(!controlStatesEqual([1],[1.001]));

const dom=installBrowserDom();
const bounds={top:0,bottom:600,left:0,right:400};
assert.equal(exploreMenuPlacement({top:100,bottom:130},{height:150,left:10,right:180},bounds).upwards,false);
assert.equal(exploreMenuPlacement({top:500,bottom:530},{height:150,left:10,right:180},bounds).upwards,true);
assert.equal(exploreMenuPlacement({top:100,bottom:130},{height:150,left:10,right:180},{...bounds,bottom:160}).upwards,true,'scroll boundary must force upward placement');
assert.equal(exploreMenuPlacement({top:200,bottom:230},{height:500,left:300,right:470},bounds).maxHeight,370,'oversized menus use the larger available space');
assert.equal(exploreMenuPlacement({top:100,bottom:130},{height:150,left:300,right:470},bounds).shiftX,-70);
try{
  const doc=dom.document,prototype=Object.getPrototypeOf(doc.body);
  doc.defaultView={innerWidth:800,innerHeight:600,getComputedStyle:()=>({overflowX:'visible',overflowY:'visible'}),addEventListener:()=>{}};
  prototype.getBoundingClientRect=()=>({top:100,bottom:130,left:10,right:180,height:30});
  Object.defineProperty(prototype,'style',{get(){return this._style??=( {} );}});
  Object.defineProperties(prototype,{
    parentElement:{get(){return this.parentNode;}},
    previousElementSibling:{get(){const children=this.parentNode.children;return children[children.indexOf(this)-1];}},
    classList:{get(){return {toggle:(name,enabled)=>{const classes=new Set(this.className.split(' ').filter(Boolean));enabled?classes.add(name):classes.delete(name);this.className=[...classes].join(' ');}};}}
  });
  prototype.after=function(node){this.parentNode.append(node);};doc.addEventListener=()=>{};
  const section=doc.createElement('section');section.className='adjust-section';doc.body.append(section);
  const head=doc.createElement('div'),root=doc.createElement('div'),resetButton=doc.createElement('button');section.append(head,root);head.append(resetButton);
  let renders=0,syncs=0,pass=0;
  const view=createExploreController({state,root,resetButton,syncControls:()=>syncs++,scheduleRender:()=>renders++,onChange:()=>{},resetPassThrough:()=>{pass++;view.reset();},toast:()=>{}});
  const find=text=>doc.body.querySelectorAll('button').find(node=>node.textContent===text);
  const action=(text,expected=0)=>{const before=renders;const node=find(text);assert.ok(node,text);node.click();assert.equal(renders-before,expected,`${text} render count`);};
  view.reset();const defaults=[...state.controls];
  const snapshotsSection=doc.body.querySelector('.snapshots-section');
  assert.equal(snapshotsSection.querySelector('.section-head').querySelector('strong')?.textContent,'Snapshots','Snapshots must use the shared section heading typography');
  assert.equal(snapshotsSection.hidden,false,'filters with active controls show snapshots');
  const usedControls=[...state.usedControls],beforeVisibilityRenders=renders;
  state.usedControls.fill(false);view.refresh();
  assert.equal(snapshotsSection.hidden,true,'filters without active controls hide snapshots');
  state.usedControls[9]=true;view.refresh();
  assert.equal(snapshotsSection.hidden,false,'a single active control restores snapshots');
  assert.equal(renders,beforeVisibilityRenders,'snapshot visibility must not request rendering');
  state.usedControls=usedControls;
  action('Lock all');assert.ok(state.usedControls.every((used,i)=>!used||state.explore.locks[i]));
  action('Invert locks');assert.ok(Object.values(state.explore.locks).every(v=>!v));action('Unlock all');
  action('Save to A');const saved=[...state.controls];state.controls[0]++;view.manual();assert.deepEqual(state.explore.snapshots.A,saved);assert.ok(!find('Update A').hidden);
  action('A ● *',1);assert.deepEqual(state.controls,saved);state.controls[0]++;view.manual();assert.deepEqual(state.explore.snapshots.A,saved);
  action('Update A');assert.deepEqual(state.explore.snapshots.A,state.controls);assert.ok(find('Update A').hidden);
  action('Randomize',1);assert.ok(state.explore.undo);action('Undo',1);assert.equal(state.explore.undo,null);
  action('Mutate · Medium ▾');
  const strengthMenu=find('Medium').parentElement;
  assert.equal(strengthMenu.hidden,false,'the combined Mutate button opens its menu without rendering');
  assert.deepEqual(strengthMenu.children.map(node=>node.textContent),['Low','Medium','High','Chaos']);
  action('High',1);assert.equal(state.explore.strength,'High');assert.equal(strengthMenu.hidden,true);
  action('Mutate · High ▾');assert.equal(find('Mutate · High ▾').getAttribute('aria-expanded'),'true');
  action('High',1);
  const lastUndo=[...state.explore.undo];action('Undo',1);assert.deepEqual(state.controls,lastUndo);
  const beforeReset=[...state.controls];action('Lock all');action('Reset',1);assert.deepEqual(state.controls,defaults);action('Undo',1);assert.deepEqual(state.controls,beforeReset);
  action('Reset',1);view.manual();assert.equal(state.explore.undo,null);assert.ok(find('Undo').disabled);
  action('Save to B');action('Clear active snapshot');assert.equal(state.explore.snapshots.B,null);assert.ok(state.explore.snapshots.A);action('Clear all snapshots');assert.ok(Object.values(state.explore.snapshots).every(v=>v===null));
  action('Save to C');state.source={};state.workspaceMode='author';view.refresh();assert.ok(state.explore.snapshots.C);
  state.controls[0]++;view.reset({preserveDefaults:true});assert.deepEqual(state.explore.defaults,defaults,'formula changes must not drift the activation defaults');assert.equal(state.explore.snapshots.C,null);
  action('Reset to pass-through');assert.equal(pass,1);assert.equal(state.explore.active,null);assert.deepEqual(state.explore.locks,{});assert.equal(state.explore.strength,'Medium');
  assert.ok(syncs>0);
}finally{dom.restore();}
console.log('Explore state and UI action smoke tests passed.');
