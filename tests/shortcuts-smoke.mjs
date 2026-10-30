import assert from 'node:assert/strict';
import {dispatchShortcut} from '../src/ui/shortcuts.js';
let calls=[],view='filtered', selected=false;
const button=id=>({click(){calls.push(id);if(id==='original'||id==='split')view=view===id?'filtered':id;},closest(){return null;}});
const buttons=Object.fromEntries(['openImageBtn','exportImageBtn','copyImageBtn','fullscreenBtn','zoomOut','zoomIn','zoomFit','original','split'].map(id=>[id,button(id)]));
const context={blocked:false,editable:false,selectedText:()=>selected,hasImage:true,button:id=>buttons[id],viewButton:id=>buttons[id]};
function send(key,options={}){let prevented=false;const event={key,ctrlKey:false,metaKey:false,shiftKey:false,altKey:false,repeat:false,preventDefault(){prevented=true;},...options};return [dispatchShortcut(event,context),prevented];}
for(const [key,expected] of [['o','original'],['o','filtered'],['c','split'],['o','original'],['c','split']]){assert.deepEqual(send(key),[true,true]);assert.equal(view,expected);}
for(const [key,id,opts] of [['-','zoomOut',{}],['+','zoomIn',{shiftKey:true}],['=','zoomIn',{}],['0','zoomFit',{}],['o','openImageBtn',{ctrlKey:true}],['e','exportImageBtn',{metaKey:true,shiftKey:true}],['c','copyImageBtn',{ctrlKey:true}],['f','fullscreenBtn',{}]]){assert.equal(send(key,opts)[0],true);assert.equal(calls.at(-1),id);}
for(const [key,opts] of [['+', {ctrlKey:true}],['-', {metaKey:true}],['0',{ctrlKey:true}],['c',{ctrlKey:true,shiftKey:true}],['v',{ctrlKey:true}],['F11',{}],['o',{shiftKey:true}],['f',{altKey:true}],['o',{repeat:true}],['o',{isComposing:true}]])assert.deepEqual(send(key,opts),[false,false]);
assert.equal(send('-', {repeat:true})[0],true);
selected=true;assert.deepEqual(send('c',{ctrlKey:true}),[false,false]);selected=false;
for(const field of ['blocked','editable']){context[field]=true;assert.deepEqual(send('o'),[false,false]);context[field]=false;}
context.hasImage=false;assert.deepEqual(send('c',{ctrlKey:true}),[false,false]);context.hasImage=true;
buttons.openImageBtn.disabled=true;assert.deepEqual(send('o',{ctrlKey:true}),[false,false]);
console.log('shortcut dispatcher smoke tests passed');
import {writePngClipboard} from '../src/io/image-io.js';
let written=false;
globalThis.ClipboardItem=class {static supports(type){return type==='image/png';} constructor(data){this.data=data;}};
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{clipboard:{write(items){written=true;assert.ok(items[0].data['image/png'] instanceof Promise);return Promise.resolve();}}}});
let resolveBlob;const delayed=new Promise(resolve=>{resolveBlob=resolve;});const writing=writePngClipboard(delayed);assert.equal(written,true,'clipboard write must begin before encoding resolves');resolveBlob(new Blob(['png'],{type:'image/png'}));await writing;

let restored=[];context.restoreSnapshot=key=>{restored.push(key);return key==='1'||key==='2';};
assert.deepEqual(send('1'),[true,true]);assert.deepEqual(send('2'),[true,true]);assert.deepEqual(send('3'),[false,false]);
for(const opts of [{ctrlKey:true},{metaKey:true},{altKey:true},{shiftKey:true},{repeat:true},{isComposing:true},{defaultPrevented:true}]){const count=restored.length;assert.deepEqual(send('1',opts),[false,false]);assert.equal(restored.length,count);}
context.editable=true;assert.deepEqual(send('1'),[false,false]);context.editable=false;context.blocked=true;assert.deepEqual(send('1'),[false,false]);context.blocked=false;

let saves=[];context.saveSnapshot=number=>{saves.push(number);return true;};
for(const [key,code,number] of [['!','Digit1','1'],['@','Digit2','2'],['#','Digit3','3'],['$','Digit4','4']]){const count=restored.length;assert.deepEqual(send(key,{shiftKey:true,code}),[true,true]);assert.equal(saves.at(-1),number);assert.equal(restored.length,count);}
for(const options of [{shiftKey:true,code:'Numpad1'},{shiftKey:true,code:'KeyA'},{shiftKey:true,code:'Digit1',repeat:true},{shiftKey:true,code:'Digit1',ctrlKey:true},{shiftKey:true,code:'Digit1',metaKey:true},{shiftKey:true,code:'Digit1',altKey:true},{shiftKey:true,code:'Digit1',isComposing:true},{shiftKey:true,code:'Digit1',defaultPrevented:true}]){const count=saves.length;assert.deepEqual(send('!',options),[false,false]);assert.equal(saves.length,count);}
for(const field of ['blocked','editable']){context[field]=true;const count=saves.length;assert.deepEqual(send('!',{shiftKey:true,code:'Digit1'}),[false,false]);assert.equal(saves.length,count);context[field]=false;}
context.saveSnapshot=()=>false;assert.deepEqual(send('!',{shiftKey:true,code:'Digit1'}),[false,false]);
