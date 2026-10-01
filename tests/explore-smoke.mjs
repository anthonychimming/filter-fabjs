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
  if(next[1]!==state.controls[1])assert.equal(rawToDisplay(next[1],state.controlUIs[1])/.25,Math.round(rawToDisplay(next[1],state.controlUIs[1])/.25));
  assert.ok([0,255].includes(next[2]));
  if(mutate)assert.equal(next[3],state.controls[3]);
  else assert.equal(rawToDisplay(next[3],state.controlUIs[3]),7500);
}
function sequence(values){let index=0;return()=>{assert.ok(index<values.length,'unexpected random draw');return values[index++];};}
const numericUI={widget:'slider',displayMin:0,displayMax:1000,step:1,format:'number',unit:''};
function mutateValues(values,uis,strength,random,used=values.map(()=>true),locks={}){
  return exploreValues(values,uis,used,{...createExploreSession(values),strength,locks},true,random);
}
const deltas=[],breadths=[];
for(const [strength,factor] of Object.entries(MUTATION_FACTORS)){
  const raw=displayToRaw(500,numericUI);
  const next=mutateValues([raw],[numericUI],strength,sequence([0,.75]));
  assert.equal(next[0],displayToRaw(500+.5*1000*factor,numericUI));
  deltas.push(rawToDisplay(next[0],numericUI)-500);
  const controls=Array(4).fill(raw);
  const broad=mutateValues(controls,Array(4).fill(numericUI),strength,sequence([.04,.75,.12,.75,.25,.75,.5,.75]));
  breadths.push(broad.filter((value,i)=>value!==controls[i]).length);

  const toggle=state.controlUIs[2],seed=state.controlUIs[3];
  for(const rawToggle of [0,255]){
    assert.equal(mutateValues([rawToggle],[toggle],strength,sequence([factor-.001]))[0],255-rawToggle);
    assert.equal(mutateValues([rawToggle],[toggle],strength,sequence([factor]))[0],rawToggle);
  }
  const seedRaw=displayToRaw(1,seed);
  assert.equal(mutateValues([seedRaw],[seed],strength,sequence([factor]))[0],seedRaw);
  const rerolled=mutateValues([seedRaw],[seed],strength,sequence([factor-.001,0]))[0];
  assert.notEqual(rerolled,seedRaw,'selected seed must differ even when the random reroll repeats');
  assert.equal(rawToDisplay(rerolled,seed),2);
  assert.equal(rawToDisplay(mutateValues([seedRaw],[seed],strength,sequence([0,.75]))[0],seed),7500);
}
assert.ok(deltas.every((value,i)=>i===0||value>deltas[i-1]),'numeric amplitude increases at every strength');
assert.deepEqual(breadths,[1,2,3,4],'deterministic participation separates every strength');
for(const widget of ['slider','number']){
  const ui={...numericUI,widget,displayMin:-10,displayMax:10,step:.25};
  const raw=displayToRaw(0,ui);
  const next=mutateValues([raw],[ui],'Low',sequence([0,.73]))[0];
  assert.equal((rawToDisplay(next,ui)-ui.displayMin)/ui.step,Math.round((rawToDisplay(next,ui)-ui.displayMin)/ui.step));
  for(const boundary of [ui.displayMin,ui.displayMax]){
    const boundaryRaw=displayToRaw(boundary,ui),outward=boundary===ui.displayMin?0:.99;
    for(const random of [sequence([.99,0,outward]),sequence([0,outward,0,outward])]){
      const result=mutateValues([boundaryRaw],[ui],'Low',random)[0],display=rawToDisplay(result,ui);
      assert.ok(Number.isFinite(result)&&result>=0&&result<=255);
      assert.equal(display,boundary+(boundary===ui.displayMin?ui.step:-ui.step),'no-op fallback moves one snapped step inward');
    }
  }
}
const fallbackControls=[128,128,0,0,128,128];
const fallbackUIs=[numericUI,{...numericUI,widget:'number'},state.controlUIs[2],state.controlUIs[3],numericUI,numericUI];
const fallbackUsed=[true,true,true,true,true,false],fallbackLocks={4:true};
const forced=mutateValues(fallbackControls,fallbackUIs,'Low',sequence([.99,.99,.99,.99,.75,.75]),fallbackUsed,fallbackLocks);
assert.deepEqual(forced.filter((v,i)=>v!==fallbackControls[i]),[displayToRaw(rawToDisplay(128,numericUI)+1,numericUI)]);
assert.equal(forced[0],128);assert.notEqual(forced[1],128,'fallback selects one eligible number');
assert.deepEqual(forced.slice(2),fallbackControls.slice(2),'fallback preserves toggles, seeds, locks, and unused values');
assert.deepEqual(mutateValues([0,0],[state.controlUIs[2],state.controlUIs[3]],'Low',sequence([.99,.99])),[0,0],'toggle/seed-only no-op remains probabilistic');
assert.deepEqual(mutateValues([128],[numericUI],'Low',sequence([]),[true],{0:true}),[128],'all-locked action has no fallback');
for(const widget of ['slider','number','toggle','seed']){
  const ui=widget==='seed'?state.controlUIs[3]:widget==='toggle'?state.controlUIs[2]:{...numericUI,widget};
  for(const mutate of [false,true]){
    assert.deepEqual(exploreValues([17.25,93.5],[ui,ui],[true,false],{...createExploreSession([]),locks:{0:true}},mutate,sequence([])),[17.25,93.5],`${widget}: locks and unused values are preserved bit-for-bit`);
  }
}
// A coarse step can erase a selected delta; the fallback still changes one value.
const coarse={...numericUI,displayMax:10,step:5};
assert.equal(mutateValues([127.5],[coarse],'Low',sequence([0,.51,0,.75]))[0],255);
// Numeric changes must not force a seed reroll or toggle flip after their failed checks.
assert.deepEqual(mutateValues([127.5,0,0],[numericUI,state.controlUIs[2],state.controlUIs[3]],'Low',sequence([0,.75,.99,.99])).slice(1),[0,0]);
state.explore.locks={};state.controls[0]=100;
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
  const beforeMutate=[...state.controls];
  action('High',1);assert.equal(state.explore.strength,'High');assert.equal(strengthMenu.hidden,true);
  assert.deepEqual(state.explore.undo,beforeMutate,'one Mutate saves the complete prior array');
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
