import assert from 'node:assert/strict';
import {createCanvasView} from '../src/ui/canvas-view.js';

const listeners={},captures=new Set(),attrs={},win={};
const state={source:{},width:1000,height:800,zoom:'manual',zoomLevel:1,view:'filtered'};
const stage={scrollLeft:100,scrollTop:100,clientHeight:400,style:{setProperty(){}},getBoundingClientRect:()=>({left:0,top:0,width:500,height:400}),addEventListener(type,fn){(listeners[type]??=[]).push(fn)},setAttribute(k,v){attrs[k]=v},removeAttribute(k){delete attrs[k]},setPointerCapture(id){captures.add(id)},hasPointerCapture(id){return captures.has(id)},releasePointerCapture(id){captures.delete(id)},ownerDocument:{addEventListener(){},defaultView:{addEventListener(type,fn){win[type]=fn}}}};
const canvas={style:{},getBoundingClientRect(){return {left:24-stage.scrollLeft,top:24-stage.scrollTop,width:Math.round(state.width*state.zoomLevel),height:Math.round(state.height*state.zoomLevel)}}};
const el={stage,canvas,wrap:{style:{}},zoomLabel:{}};
let allowed=true;const view=createCanvasView({state,el,ctx:{},canInteract:()=>allowed});
function fire(type,options={}){let prevented=false;const event={target:canvas,clientX:200,clientY:150,pointerId:7,pointerType:'mouse',button:1,buttons:4,deltaY:0,deltaMode:0,preventDefault(){prevented=true},...options};for(const fn of listeners[type]||[])fn(event);return prevented;}
const before=canvas.getBoundingClientRect(),fx=(200-before.left)/before.width,fy=(150-before.top)/before.height;
assert.ok(fire('wheel',{deltaY:-120}));let after=canvas.getBoundingClientRect();assert.ok(Math.abs(after.left+fx*after.width-200)<.01);assert.ok(Math.abs(after.top+fy*after.height-150)<.01);assert.ok(state.zoomLevel>1);assert.equal(el.zoomLabel.textContent,`${Math.round(state.zoomLevel*100)}%`);
const level=state.zoomLevel;assert.equal(fire('wheel',{deltaY:100,ctrlKey:true}),false);assert.equal(fire('wheel',{deltaY:100,target:{}}),false);allowed=false;assert.equal(fire('wheel',{deltaY:100}),false);allowed=true;assert.equal(state.zoomLevel,level);
fire('pointerdown');assert.ok(captures.has(7));const left=stage.scrollLeft,top=stage.scrollTop;fire('pointermove',{clientX:210,clientY:160});assert.equal(stage.scrollLeft,left-10);assert.equal(stage.scrollTop,top-10);fire('pointerup',{clientX:210,clientY:160});assert.equal(state.zoom,'manual');assert.equal(captures.size,0);assert.equal(attrs['data-panning'],undefined);
fire('pointerdown');fire('pointerup');assert.equal(state.zoom,'manual','middle click must preserve zoom');
for(const cancel of ['pointercancel','lostpointercapture','blur','lock','source']){state.zoom='manual';fire('pointerdown');if(cancel==='blur')win.blur();else if(cancel==='lock')view.endMiddleGesture();else if(cancel==='source')view.invalidatePixels();else fire(cancel);fire('pointerup');assert.equal(captures.size,0);assert.equal(state.zoom,'manual',cancel);}
fire('pointerdown');fire('pointermove',{buttons:0});assert.equal(captures.size,0);
assert.ok(fire('auxclick'));assert.equal(fire('auxclick',{target:{}}),false);
console.log('Canvas mouse navigation smoke: pass.');
