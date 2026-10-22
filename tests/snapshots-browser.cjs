// Optional browser regression, using an existing Playwright installation and Edge.
const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs');
(async()=>{
 const server=cp.spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'8113'},stdio:'ignore'});let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});fs.mkdirSync('review-results/snapshots',{recursive:true});
  for(const width of [1440,390,320]){
   const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('ffw-renderer','cpu'));
   await page.route('https://anthonychimming.github.io/filter-fabjs-library/**',r=>r.abort());
   const ready=()=>page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready'&&!document.body.classList.contains('ui-locked'));
   await page.goto('http://127.0.0.1:8113');await ready();
   const toggle=page.locator('#inspectorToggle');if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
   await page.locator('#browseFiltersBtn').click();const dialog=page.locator('#filterLibraryDialog');
   await dialog.locator('[data-source]').selectOption('builtin');await dialog.locator('[data-search]').fill('Amber Film');
   await dialog.locator('.filter-card-preview').first().click();await page.waitForFunction(()=>!document.querySelector('#filterLibraryDialog [data-apply]').disabled);await dialog.locator('[data-apply]').click();await ready();
   const panel=page.locator('.snapshots-section'),slots=panel.locator('.snapshot-slots button'),status=panel.locator('.snapshot-status');
   await panel.scrollIntoViewIfNeeded();assert.equal(await slots.count(),4);assert.equal(await status.textContent(),'No snapshots saved');
   assert.equal(await slots.first().getAttribute('aria-disabled'),'true');await slots.first().click({force:true});assert.equal(await status.textContent(),'No snapshots saved');
   const values=()=>page.locator('#sliderGrid input').evaluateAll(nodes=>nodes.map(e=>e.type==='checkbox'?e.checked:e.value));
   const original=await values(),save=panel.getByRole('button',{name:'Save current'});
   for(const slot of ['A','B','C','D']){await save.click();await panel.getByRole('button',{name:`Save to ${slot} · Empty`,exact:true}).click();assert.equal(await status.textContent(),`Snapshot ${slot} saved`);}
   await page.getByRole('combobox',{name:'Mutation strength'}).selectOption('Random');await page.getByRole('button',{name:'Mutate',exact:true}).click();await page.waitForTimeout(300);await ready();
   const mutated=await values();assert.notDeepEqual(mutated,original);
   await save.click();page.once('dialog',d=>d.dismiss());await panel.getByRole('button',{name:'Replace A · Saved',exact:true}).click();
   await slots.first().click();await page.waitForTimeout(300);await ready();assert.deepEqual(await values(),original);assert.equal(await status.textContent(),'Snapshot A restored');
   await save.focus();await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Replace A · Saved');
   await page.keyboard.press('End');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Replace D · Saved');
   await page.keyboard.press('Escape');assert.equal(await save.getAttribute('aria-expanded'),'false');assert.ok(await save.evaluate(e=>e===document.activeElement));
   await save.click();page.once('dialog',d=>d.accept());await panel.getByRole('button',{name:'Replace A · Saved',exact:true}).click();assert.equal(await status.textContent(),'Snapshot A saved');
   const help=panel.getByRole('button',{name:'About snapshots'});await help.focus();assert.equal(await panel.locator('[role=tooltip]').evaluate(e=>getComputedStyle(e).visibility),'visible');
   await page.keyboard.press('Escape');assert.ok(await panel.locator('[role=tooltip]').isHidden());
   await slots.first().focus();assert.equal(await slots.first().evaluate(e=>getComputedStyle(e).outlineStyle),'solid');
   const more=panel.getByRole('button',{name:'Snapshot management'});await more.click();await panel.getByRole('button',{name:'Clear all snapshots',exact:true}).click();assert.deepEqual(await values(),original);assert.equal(await status.textContent(),'No snapshots saved');
   await more.click();assert.ok(await panel.getByRole('button',{name:'Clear all snapshots',exact:true}).isDisabled());await page.keyboard.press('Escape');
   const geometry=await slots.evaluateAll(nodes=>{const rects=nodes.map(e=>e.getBoundingClientRect()),row=nodes[0].parentElement;return {overflow:row.scrollWidth>row.clientWidth,oneRow:rects.every(r=>r.top===rects[0].top),equal:rects.every(r=>Math.abs(r.width-rects[0].width)<1),textFits:nodes.every(e=>e.scrollWidth<=e.clientWidth)};});
   assert.deepEqual(geometry,{overflow:false,oneRow:true,equal:true,textFits:true});
   await page.screenshot({path:`review-results/snapshots/${width}.png`});
   await save.click();await panel.getByRole('button',{name:'Save to A · Empty',exact:true}).click();await page.reload();await ready();
   if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();assert.equal(await status.textContent(),'No snapshots saved','snapshots remain session-only');
   assert.deepEqual(errors,[]);console.log(`PASS snapshots ${width}px: save/restore, confirmation, clear, keyboard, tooltip, layout, reload`);await page.close();
  }
 }finally{await browser?.close();server.kill();}
})().catch(error=>{console.error(error);process.exitCode=1;});
