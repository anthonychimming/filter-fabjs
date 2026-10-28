// Optional browser regression: uses an existing Playwright installation and Edge.
const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
(async()=>{const server=cp.spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'8111'},stdio:'ignore'});let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});fs.mkdirSync('review-results',{recursive:true});
 for(const [width,height,standalone] of [[1440,900,false],[390,844,false],[320,568,false],[1440,900,true]]){
 const context=await browser.newContext({viewport:{width,height},hasTouch:width<768});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ffw-renderer','cpu'));await page.route('https://anthonychimming.github.io/filter-fabjs-library/**',r=>r.abort());
 const ready=()=>page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready'&&!document.body.classList.contains('ui-locked'));
 await page.goto('http://127.0.0.1:8111/'+(standalone?'dist/chromameld-rgba-v2.9.5.html':''));await ready();
 const toggle=page.locator('#inspectorToggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
 const strength=page.getByRole('combobox',{name:'Mutation strength'}),mutate=page.getByRole('button',{name:'Mutate',exact:true}),undo=page.locator('.adjust-section').getByRole('button',{name:'Undo',exact:true});
 assert.equal(await mutate.count(),1);assert.equal(await page.getByRole('button',{name:'Randomize',exact:true}).count(),0);assert.ok(await mutate.isDisabled());assert.equal(await strength.inputValue(),'Medium');
 assert.deepEqual(await strength.locator('option').allTextContents(),['Subtle','Medium','Strong','Random']);
 const loadFilter=async(name)=>{await page.locator('#browseFiltersBtn').click();const d=page.locator('#filterLibraryDialog');await d.locator('[data-source]').selectOption('builtin');await d.locator('[data-search]').fill(name);await d.locator('.filter-card-preview').first().click();await page.waitForFunction(()=>!document.querySelector('#filterLibraryDialog [data-apply]').disabled);await d.locator('[data-apply]').click();await ready();};
 await loadFilter('Amber Film');
 if(!standalone)await page.evaluate(async()=>{const {RendererManager}=await import('/src/renderers/renderer-manager.js');const previous=RendererManager.prototype.renderWithFallback;window.mutationRenders=0;RendererManager.prototype.renderWithFallback=async function(...args){window.mutationRenders++;if(window.holdMutation)await new Promise(resolve=>window.releaseMutation=resolve);return previous.apply(this,args);};});
 const values=()=>page.locator('#sliderGrid input').evaluateAll(nodes=>nodes.map(e=>e.type==='checkbox'?e.checked:e.value));
 const apply=async(button)=>{const before=await page.evaluate(()=>window.mutationRenders||0);await button.click();await page.waitForTimeout(300);await ready();if(!standalone)assert.equal(await page.evaluate(()=>window.mutationRenders),before+1,'action schedules exactly one renderer invocation');};
 const defaults=await values();await page.locator('#sliderGrid .control-lock').first().click();
 for(const mode of ['Subtle','Medium','Strong','Random']){
  const before=await values(),renders=await page.evaluate(()=>window.mutationRenders||0),undoDisabled=await undo.isDisabled();await strength.selectOption(mode);await page.waitForTimeout(160);
  assert.deepEqual(await values(),before);assert.equal(await undo.isDisabled(),undoDisabled);assert.equal(await page.evaluate(()=>window.mutationRenders||0),renders,'selection alone does not render');
  await apply(mutate);assert.equal((await values())[0],before[0]);assert.equal(await strength.inputValue(),mode);await apply(undo);assert.deepEqual(await values(),before,'Undo restores all displayed widgets');
 }
 await strength.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowDown');assert.equal(await strength.inputValue(),'Medium');assert.equal(await strength.evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
 await strength.selectOption('Strong');await page.locator('#authorModeTab').click();await page.locator('#exploreModeTab').click();assert.equal(await strength.inputValue(),'Strong');
 await page.locator('#sliderGrid .control-lock').first().click();await strength.selectOption('Random');await apply(mutate);await apply(page.locator('#exploreResetBtn'));assert.deepEqual(await values(),defaults);assert.equal(await strength.inputValue(),'Random');
 if(!standalone&&width===1440){
  await page.evaluate(()=>window.holdMutation=true);await mutate.click();await page.waitForFunction(()=>typeof window.releaseMutation==='function');assert.ok(await mutate.isDisabled());assert.ok(await strength.isDisabled());const before=await page.evaluate(()=>window.mutationRenders);await mutate.evaluate(e=>{e.click();e.click();});assert.equal(await page.evaluate(()=>window.mutationRenders),before);
  await strength.evaluate(e=>{e.value='Subtle';e.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await strength.inputValue(),'Random');await page.keyboard.press('Escape');await page.evaluate(()=>{window.holdMutation=false;window.releaseMutation();});await page.waitForTimeout(300);await loadFilter('Gingham');assert.equal(await strength.inputValue(),'Random');
 }
 await page.locator('#sliderGrid').evaluate(e=>e.closest('.sidebar-scroll').scrollTop=e.offsetTop);await mutate.scrollIntoViewIfNeeded();
 const geometry=await page.evaluate(()=>{const group=document.querySelector('.mutation-action').parentElement,r=group.getBoundingClientRect(),items=[...group.children].map(e=>e.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth>innerWidth||group.scrollWidth>group.clientWidth,clip:items.some(b=>b.left<r.left-1||b.right>r.right+1),collision:items.some((a,i)=>items.slice(i+1).some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top))};});assert.deepEqual(geometry,{overflow:false,clip:false,collision:false});
 await page.screenshot({path:`review-results/mutate-${width}${standalone?'-standalone':''}.png`});
 await page.reload();await ready();if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();assert.equal(await strength.inputValue(),'Random','reload preserves preference');
 assert.deepEqual(errors,[]);console.log(`PASS ${width}px ${standalone?'standalone':'source'}: all strengths, selection-only state, render count, Undo/Reset, locks, navigation, persistence, keyboard/focus, layout`);await context.close();
 }
}finally{await browser?.close();server.kill();}})().catch(e=>{console.error(e);process.exitCode=1;});
