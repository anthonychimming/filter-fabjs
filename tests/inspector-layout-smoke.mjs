import assert from 'node:assert/strict';
import fs from 'node:fs';
import { inspectorWidthBounds,readInspectorWidth,createInspectorLayout } from '../src/ui/inspector-layout.js';

assert.deepEqual(inspectorWidthBounds(1920),{min:320,max:520});
assert.deepEqual(inspectorWidthBounds(1024),{min:320,max:384});
for(const value of [null,'bad','{}','{"version":2,"inspectorWidth":400}','{"version":1,"inspectorWidth":"400"}'])assert.equal(readInspectorWidth({getItem:()=>value}),384);
assert.equal(readInspectorWidth({getItem:()=>'{"version":1,"inspectorWidth":900}'}),520);
assert.equal(readInspectorWidth({getItem(){throw Error('blocked')}}),384);

class Element{
  constructor(){this.listeners={};this.attrs={};this.dataset={};this.style={setProperty:(k,v)=>this.style[k]=v};this.inert=false;this.hidden=false;this.scrollTop=120;}
  addEventListener(k,fn){this.listeners[k]=fn;}
  setAttribute(k,v){this.attrs[k]=v;}
  getAttribute(k){return this.attrs[k];}
  removeAttribute(k){delete this.attrs[k];}
  getBoundingClientRect(){return {width:1440,right:1440};}
  getClientRects(){return [1];}
  focus(){doc.activeElement=this;}
  contains(e){return e===this||e===tab;}
  querySelector(){return tab;}
  querySelectorAll(){return [tab,close];}
  setPointerCapture(id){this.capture=id;}
  hasPointerCapture(id){return this.capture===id;}
  releasePointerCapture(){this.capture=null;}
}
const elements=Object.fromEntries(['inspector','inspectorToggle','inspectorResize','inspectorClose','inspectorExpand','inspectorBackdrop'].map(k=>[k,new Element()]));
const app=new Element(),workspace=new Element(),tab=new Element(),close=elements.inspectorClose;
tab.tabIndex=close.tabIndex=0;tab.closest=close.closest=()=>null;
const doc={activeElement:null,querySelector:s=>s==='.app'?app:s==='.workspace'?workspace:null,getElementById:k=>elements[k],addEventListener(k,fn){this[k]=fn;}};
const desktop={matches:true,addEventListener(k,fn){this.change=fn;}},mobile={matches:false,addEventListener(k,fn){this.change=fn;}};
const win={matchMedia:s=>s.includes('1024')?desktop:mobile,addEventListener(){}};
let saved,writes=0;const layout=createInspectorLayout({document:doc,window:win,storage:()=>({getItem:()=>null,setItem(k,v){writes++;saved=JSON.parse(v);}})});
const fire=(node,type,extra={})=>node.listeners[type]({preventDefault(){},stopImmediatePropagation(){},...extra});
const resize=elements.inspectorResize,toggle=elements.inspectorToggle,panel=elements.inspector;
assert.equal(resize.attrs['aria-valuenow'],'384');
fire(resize,'keydown',{key:'ArrowLeft'});assert.equal(saved.inspectorWidth,400);
fire(resize,'keydown',{key:'ArrowRight',shiftKey:true});assert.equal(saved.inspectorWidth,368);
fire(resize,'keydown',{key:'End'});assert.equal(saved.inspectorWidth,520);
fire(resize,'pointerdown',{pointerId:1,button:0});const before=writes;
fire(resize,'pointermove',{pointerId:2,clientX:1000});assert.equal(writes,before);
fire(resize,'pointermove',{pointerId:1,clientX:1120});assert.equal(resize.attrs['aria-valuenow'],'320');assert.equal(writes,before);
fire(resize,'pointerup',{pointerId:1});assert.equal(saved.inspectorWidth,320);assert.equal(resize.capture,null);
doc.activeElement=tab;layout.hide();assert.equal(panel.inert,true);assert.equal(doc.activeElement,toggle);
fire(toggle,'click');assert.equal(panel.inert,false);assert.equal(panel.scrollTop,120);assert.equal(resize.attrs['aria-valuenow'],'320');
desktop.matches=false;desktop.change();assert.equal(panel.inert,true);assert.equal(workspace.inert,false);
fire(toggle,'click');assert.equal(panel.attrs.role,'dialog');assert.equal(workspace.inert,true);assert.equal(doc.activeElement,tab);
doc.activeElement=close;let prevented=false;doc.keydown({key:'Tab',preventDefault(){prevented=true;}});assert.ok(prevented);assert.equal(doc.activeElement,tab);
doc.keydown({key:'Escape',preventDefault(){},stopImmediatePropagation(){}});assert.equal(workspace.inert,false);assert.equal(doc.activeElement,toggle);
mobile.matches=true;mobile.change();fire(toggle,'click');fire(elements.inspectorExpand,'click');assert.equal(app.dataset.inspectorExpanded,'true');
desktop.matches=true;desktop.change();assert.equal(panel.attrs.role,undefined);assert.equal(workspace.inert,false);assert.equal(panel.inert,false);
desktop.matches=false;desktop.change();tab.disabled=true;fire(toggle,'click');assert.equal(doc.activeElement,close,'rendering must still permit a focusable overlay close action');tab.disabled=false;
layout.destroy();assert.equal(workspace.inert,false,'teardown must release background interaction');
const html=fs.readFileSync('index.html','utf8');
assert.ok(html.indexOf('<main class="workspace"')<html.indexOf('<header class="topbar'));
assert.ok(html.indexOf('<footer class="statusbar"')<html.indexOf('</main>'));
assert.ok(html.indexOf('</main>')<html.indexOf('id="inspector"'));
assert.equal((html.match(/id="formulaR"/g)||[]).length,1);
console.log('Inspector width, pointer/keyboard persistence, focus, modal transitions and shell smoke: pass.');
