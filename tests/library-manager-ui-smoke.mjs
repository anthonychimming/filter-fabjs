import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { catalogue } from '../tools/library-manager/lib/catalogue-state.mjs';

const source=await fs.readFile(new URL('../tools/library-manager/ui/library-manager.js',import.meta.url),'utf8');
const shell=await fs.readFile(new URL('../tools/library-manager/ui/index.html',import.meta.url),'utf8');
const css=await fs.readFile(new URL('../tools/library-manager/ui/library-manager.css',import.meta.url),'utf8');
const first={id:'signal-weave',name:'Chromatic Signal Weave',tags:[]},second={...first,id:'another-weave'};
function summary({pending=true,published=false,draft=false}={}){
  const documents=draft||published?[first]:[first,second];
  const snapshot={sources:new Map(documents.map(document=>[document.id,{document}])),packages:new Map(published?[[first.id,{id:first.id,revision:1,document:first}]]:[]),registry:{filters:published?[{id:first.id,revision:1}]:[]},historyComplete:true,publishedIds:new Set()};
  const candidates=new Map(pending?documents.map(document=>[document.id,{kind:'add',approved:true,revision:1,document}]):[]);
  const online={state:'checked',manifest:{filters:published?[{id:first.id,revision:1}]:[]}};
  return{filters:catalogue(snapshot,candidates,{online}),pending:[...candidates].map(([id,item])=>({id,name:item.document.name,kind:item.kind,revision:item.revision,approved:true,changes:[]})),workspaceCount:candidates.size,health:{valid:true,errors:[],warnings:[]},online:{state:'checked',error:null},dirty:[],stale:false,recovery:false};
}
function ui(fixture,fixtureId=first.id){
  const nodes=new Map();let document;
  class Node{
    constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.text='';this.dataset={};this.attributes={};this.listeners=new Map();this.value='';}
    set textContent(value){this.text=String(value);this.children=[];}
    get textContent(){return this.text+this.children.map(child=>child.textContent).join(' ');}
    append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
    replaceChildren(...children){this.text='';this.children=[];this.append(...children);}
    setAttribute(name,value){this.attributes[name]=String(value);}
    getAttribute(name){return this.attributes[name]??null;}
    removeAttribute(name){delete this.attributes[name];}
    addEventListener(name,handler){if(!this.listeners.has(name))this.listeners.set(name,[]);this.listeners.get(name).push(handler);}
    async click(){for(const handler of this.listeners.get('click')||[])await handler({target:this});}
    focus(options){document.activeElement=this;this.focusOptions=options;}
    scrollIntoView(options){this.scrollOptions=options;}
    remove(){this.parent.children=this.parent.children.filter(child=>child!==this);}
    querySelector(selector){return all(this).slice(1).find(node=>selector.startsWith('#')?node.id===selector.slice(1):selector.startsWith('.')?node.className===selector.slice(1):node.tagName===selector.toUpperCase())||null;}
  }
  const get=id=>{if(!nodes.has(id)){const node=new Node();node.id=id;nodes.set(id,node);}return nodes.get(id);};
  document={body:new Node('body'),activeElement:null,getElementById:get,createElement:tag=>new Node(tag),createTextNode:text=>{const node=new Node('#text');node.textContent=text;return node;}};
  get('status').value='All';get('sort').value='name';get('history-panel').hidden=true;get('publish-panel').hidden=true;
  const context=vm.createContext({document,fixture,fixtureId,fetch:()=>assert.fail('Navigation must not perform API operations')});
  vm.runInContext(source.slice(0,source.lastIndexOf('await run(async()=>{token=')),context);
  vm.runInContext('state=fixture;selected=fixtureId;render();',context);
  return{get,document,context,progress:()=>vm.runInContext('({section,selected,state})',context)};
}
function all(node){return[node,...node.children.flatMap(all)];}
const buttons=node=>all(node).filter(child=>child.tagName==='BUTTON');
const reviewButton=app=>buttons(app.get('details')).find(node=>node.textContent==='Review & Publish');

const ready=summary();assert.equal(ready.filters[0].status,'Ready to Publish','API lifecycle label remains unchanged');
const detail=ui(ready,second.id),cta=reviewButton(detail);
assert.ok(cta);assert.equal(cta.tagName,'BUTTON');assert.equal(cta.type,'button');assert.equal(cta.className,'primary');
assert.ok(detail.get('details').children.indexOf(cta)<detail.get('details').children.findIndex(node=>node.tagName==='IMG'),'next step precedes the long preview and description');
assert.match(detail.get('details').textContent,/Ready for Publication Review · Revision 1/);
assert.match(detail.get('filters').textContent,/Ready for Publication Review/);
assert.match(detail.get('details').textContent,/Next step.*ready for validation and review/);
const deletion=buttons(detail.get('details')).find(node=>node.textContent==='Delete Draft');
assert.equal(deletion.className,'danger');assert.notEqual(deletion.className,cta.className);
assert.ok(buttons(detail.get('details')).findIndex(node=>node.textContent==='History')<buttons(detail.get('details')).indexOf(deletion));
assert.match(shell,/<option value="Ready to Publish">Ready for Publication Review<\/option>/);
assert.match(shell,/Review &amp; Publish →/);assert.match(css,/:focus-visible/);assert.match(css,/\[data-filter-id\]:focus/);
const failedChecks=summary({pending:false,published:true});failedChecks.filters[0].publication.pr={number:2,state:'OPEN',checks:'Failed'};failedChecks.filters[0].status='PR Open · Checks Failed';
assert.match(ui(failedChecks).get('details').textContent,/Checks Failed. Do not merge this pull request until validation passes/);
const failedDeployment=summary({pending:false,published:true});failedDeployment.filters[0].publication.onlineConfirmed=false;failedDeployment.filters[0].publication.deploymentState='deployment-failed';failedDeployment.filters[0].publication.pr={number:2,state:'MERGED',checks:'Failed',deployment:{state:'Failed'},publicationValid:false,publicationError:'Publication requires repair.'};failedDeployment.filters[0].status='Merged · Deployment Failed';
const repairUi=ui(failedDeployment);assert.match(repairUi.get('details').textContent,/Deployment failed. Check GitHub Actions/);assert.match(repairUi.get('details').textContent,/Repair the Online Library catalogue version/);assert.ok(!repairUi.get('details').textContent.includes('Do not merge'));
failedDeployment.filters[0].publication.onlineConfirmed=true;failedDeployment.filters[0].publication.deploymentState='online';failedDeployment.filters[0].status='Published Online';assert.ok(!ui(failedDeployment).get('details').textContent.includes('Repair the Online Library catalogue version'));

// All entry points execute the real event listeners and preserve identity in a
// shared multi-filter batch, even when two filters have the same display name.
for(const entry of ['detail','top','footer']){
  const fixture=summary(),app=ui(fixture,second.id),before=JSON.stringify(fixture);
  await(entry==='detail'?reviewButton(app):app.get(entry==='top'?'publish-tab':'review-button')).click();
  const progress=app.progress();assert.equal(progress.section,'publish');assert.equal(progress.selected,second.id);
  assert.equal(app.get('publish-panel').hidden,false);assert.equal(app.get('library-panel').hidden,true);
  assert.equal(app.get('publish-tab').getAttribute('aria-current'),'page');
  const rows=app.get('publish-panel').children.filter(node=>node.dataset.filterId);
  assert.equal(rows.length,2);assert.deepEqual(rows.map(node=>node.dataset.filterId),[first.id,second.id]);
  const target=rows.find(node=>node.dataset.filterId===second.id);
  assert.equal(app.document.activeElement,target);assert.equal(target.tabIndex,-1);
  assert.equal(target.getAttribute('aria-labelledby'),target.children[0].id);
  assert.equal(target.focusOptions.preventScroll,true);assert.equal(target.scrollOptions.block,'start');
  assert.match(target.textContent,/Chromatic Signal Weave/);
  assert.ok(buttons(app.get('publish-panel')).some(node=>node.textContent==='Validate Publication'));
  assert.equal(JSON.stringify(fixture),before,'navigation preserves the batch and does not publish');
}
const single=summary();single.filters=single.filters.filter(item=>item.id===first.id);single.pending=single.pending.filter(item=>item.id===first.id);single.workspaceCount=1;
const singleUi=ui(single);await reviewButton(singleUi).click();assert.equal(singleUi.document.activeElement.dataset.filterId,first.id);
const published=summary({pending:false,published:true});assert.equal(published.filters[0].status,'Published Online');assert.equal(reviewButton(ui(published)),undefined);
const draft=summary({pending:false,draft:true});assert.equal(draft.filters[0].status,'Draft');assert.equal(reviewButton(ui(draft)),undefined);
for(const [status,contentState] of [['Prepared Locally','ready'],['Pushed','ready'],['PR Open','ready'],['Merged · Awaiting Online Deployment','ready'],['Unpublished','unpublished'],['Invalid','invalid'],['Incomplete','incomplete']]){
  const fixture=summary({pending:false,draft:true});fixture.filters[0]={...fixture.filters[0],status,contentState};
  assert.equal(reviewButton(ui(fixture)),undefined,status+' must not offer workspace review without a candidate');
}
for(const contentState of ['draft','invalid','incomplete']){
  const fixture=summary();fixture.filters.find(item=>item.id===first.id).contentState=contentState;assert.equal(reviewButton(ui(fixture)),undefined);
}
const relabelled=summary();relabelled.filters.find(item=>item.id===first.id).status='Changed';assert.ok(reviewButton(ui(relabelled)),'authoritative pending/content state controls the CTA');
const noPending=ui(published);await noPending.get('publish-tab').click();assert.equal(noPending.document.activeElement.tagName,'H1');
const filtered=ui(summary());filtered.get('status').value='Ready to Publish';vm.runInContext('renderList();',filtered.context);assert.equal(buttons(filtered.get('filters')).length,2);
const badges=node=>all(node).filter(child=>child.className?.split(' ').includes('status-badge'));
for(const [status,semantic] of [
  ['Published Online','success'],['Deployment Failed','failure'],['Validation Failed','failure'],['Invalid','failure'],
  ['Ready to Publish','progress'],['Prepared Locally','progress'],['Pushed','progress'],['PR Open','progress'],
  ['Merged · Awaiting Online Deployment','attention'],['Merged · Online Status Unknown','attention'],
  ['Online Status Unknown','attention'],['PR Status Unknown','attention'],['PR Closed','attention'],['Changed','attention'],
  ['Merged · Deployment Failed','failure'],['PR Open · Checks Failed','failure'],
  ['Draft','neutral'],['Unpublished','neutral'],['Incomplete','neutral'],['Unknown','neutral'],['Future State','neutral'],['constructor','neutral']
]){
  const fixture=summary({pending:false,draft:true});fixture.filters[0].status=status;fixture.filters[0].revision=1;
  fixture.filters[0].publication.gitState='prepared-local';const before=JSON.stringify(fixture),app=ui(fixture);
  const list=badges(app.get('filters'))[0],detail=badges(app.get('details'))[0];
  assert.equal(list.className,'status-badge status-'+semantic,status);
  assert.equal(detail.className,list.className,'list and detail share semantics');
  const label=status==='Ready to Publish'?'Ready for Publication Review':status;
  assert.equal(list.textContent,label+' · r1');assert.equal(detail.textContent,label+' · Revision 1');
  await app.get('publish-tab').click();assert.equal(badges(app.get('publish-panel'))[0].className,list.className,'workspace shares semantics');
  assert.equal(JSON.stringify(fixture),before,'badge rendering does not mutate lifecycle data');
}
const workspaceBadges=ui(summary());await workspaceBadges.get('publish-tab').click();
assert.ok(badges(workspaceBadges.get('publish-panel')).every(node=>node.className==='status-badge status-progress'));
const checksUi=ui(failedChecks);assert.ok(badges(checksUi.get('details')).some(node=>node.textContent==='Failed'&&node.className==='status-badge status-failure'));
const remoteFixture=summary({pending:false,published:true});remoteFixture.remotePublication={pushed:true,remoteKnown:true,pr:{number:17,state:'OPEN',checks:'Failed',deployment:{state:'Pending'}}};
const remoteUi=ui(remoteFixture);await remoteUi.get('publish-tab').click();
assert.ok(badges(remoteUi.get('publish-panel')).some(node=>node.textContent==='#17 · OPEN'&&node.className==='status-badge status-progress'));
assert.ok(badges(remoteUi.get('publish-panel')).some(node=>node.textContent==='Failed'&&node.className==='status-badge status-failure'));
assert.ok(badges(remoteUi.get('publish-panel')).some(node=>node.textContent==='Pending'&&node.className==='status-badge status-attention'));
assert.equal(vm.runInContext("statusSemanticClass('Failed','deployment')",checksUi.context),'status-failure');
assert.equal(vm.runInContext("statusSemanticClass('unknown','future')",checksUi.context),'status-neutral');
assert.equal(vm.runInContext("statusSemanticClass('toString','__proto__')",checksUi.context),'status-neutral');
for(const [kind,states] of Object.entries({pr:{OPEN:'progress',MERGED:'attention',CLOSED:'attention'},checks:{Passed:'success',Pending:'progress',Failed:'failure',Unknown:'attention'},deployment:{Passed:'success',Pending:'attention',Failed:'failure',Unknown:'attention'},validation:{valid:'success',invalid:'failure'}})){
  for(const [value,semantic] of Object.entries(states))assert.equal(vm.runInContext(`statusSemanticClass(${JSON.stringify(value)},${JSON.stringify(kind)})`,checksUi.context),'status-'+semantic);
}
// Verify normal-text AA against the actual opaque dark-theme tokens.
function luminance(hex){const channels=hex.match(/\w{2}/g).map(value=>parseInt(value,16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722;}
for(const semantic of ['success','progress','attention','failure','neutral']){
  const token=part=>{const match=css.match(new RegExp('--status-'+semantic+'-'+part+':(#[0-9a-f]{6})'));assert.ok(match);return match[1].slice(1);};
  const ratio=(luminance(token('fg'))+.05)/(luminance(token('bg'))+.05);
  assert.ok(ratio>=4.5,semantic+' contrast '+ratio.toFixed(2)+' must meet AA');
  assert.match(css,new RegExp('\\.status-'+semantic+'\\{'));
  assert.notEqual(token('border'),'151820','badge boundary differs from app background');
}
assert.match(css,/overflow-wrap:anywhere/);assert.match(css,/@media\(forced-colors:active\)/);
console.log('Library Manager primary publication CTA, labels, shared navigation, ID focus, batch preservation and lifecycle exclusions passed.');
console.log('Library Manager semantic badges, exact state mapping, shared views, unchanged labels/lifecycle, fallback and AA contrast passed.');
