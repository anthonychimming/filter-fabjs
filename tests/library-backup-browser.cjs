const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process'),path=require('node:path'),{pathToFileURL}=require('node:url');
const version=JSON.parse(fs.readFileSync('package.json')).version;
const collection='ffw-custom-presets',pref='ffw-entry-v1:custom:';
const filter=id=>({format:'filter-fab-js',version:2,id,name:'Saved '+id,author:'Test',description:'雨',tags:['Test'],formulas:['r','g','b','a']});
const records=[filter('one'),filter('two')];
const server=cp.spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'8128'},stdio:'ignore'});
let browser;
async function run(){
  browser=await chromium.launch({channel:'msedge',headless:true});
  const reports=[];
  for(const url of ['http://localhost:8128/index.html','http://localhost:8128/dist/site/index.html',pathToFileURL(path.resolve(`dist/chromameld-rgba-v${version}.html`)).href]){
    const context=await browser.newContext({viewport:{width:1366,height:768},acceptDownloads:true}),page=await context.newPage();
    const errors=[];page.on('pageerror',error=>errors.push(error.message));
    await context.addInitScript(({records,collection,pref})=>{localStorage.clear();localStorage.setItem('ffw-renderer','cpu');localStorage.setItem(collection,JSON.stringify(records));localStorage.setItem(pref+'one',JSON.stringify({version:1,favorite:true,tags:['私']}));localStorage.setItem('ffw-entry-v1:builtin:pass',JSON.stringify({version:1,favorite:true,tags:['Excluded']}));},{records,collection,pref});
    await page.route('https://anthonychimming.github.io/filter-fabjs-library/**',route=>route.abort());
    await page.goto(url);await page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready');
    await page.locator('#authorModeTab').click();await page.locator('#filterName').fill('Dirty draft');await page.locator('#formulaR').fill('r+3');await page.locator('#exploreModeTab').click();
    await page.locator('#browseFiltersBtn').click();const library=page.locator('#filterLibraryDialog');
    await library.locator('[data-source]').selectOption('custom');await library.locator('[data-search]').fill('Saved one');
    await library.locator('[data-entry-action="preview"]').first().click();await page.waitForFunction(()=>!document.querySelector('[data-apply]').disabled);
    const snapshot=()=>page.evaluate(()=>{const canvas=document.querySelector('#displayCanvas'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let hash=0;for(let i=0;i<pixels.length;i++)hash=(hash*31+pixels[i])|0;return{preview:window.FilterFabJS.getLibraryPreviewState(),program:window.FilterFabJS.getLastProgram(),name:document.querySelector('#filterName').value,formula:document.querySelector('#formulaR').value,hash};});
    const initial=await snapshot();
    const manage=()=>page.getByRole('button',{name:'Manage My Filters'}).click();
    await manage();await page.keyboard.press('Escape');assert.equal(await library.evaluate(el=>el.open),true);assert.equal(await page.locator('#libraryManageMenu').isVisible(),false);assert.equal(await page.getByRole('button',{name:'Manage My Filters'}).evaluate(el=>el===document.activeElement),true);
    await manage();await page.getByRole('menuitem',{name:'Export backup'}).click();assert.match(await page.locator('.library-backup-dialog').textContent(),/2 saved My Filters/);
    const downloading=page.waitForEvent('download');await page.getByRole('button',{name:'Download backup',exact:true}).click();const download=await downloading,backup=JSON.parse(fs.readFileSync(await download.path(),'utf8'));
    assert.match(download.suggestedFilename(),/^filter-fabjs-my-filters-\d{4}-\d\d-\d\d.json$/);assert.equal(backup.filters.length,2);assert.equal(backup.appVersion,version);assert.equal(backup.filters[0].preferences.favorite,true);assert(!JSON.stringify(backup).includes('Excluded'));assert.deepEqual(await snapshot(),initial);
    const importFile=async value=>{await manage();const choosing=page.waitForEvent('filechooser');await page.getByRole('menuitem',{name:'Import backup'}).click();await(await choosing).setFiles({name:'library.json',mimeType:'application/json',buffer:Buffer.from(typeof value==='string'?value:JSON.stringify(value))});};
    await importFile(backup);await page.locator('.library-backup-dialog').waitFor();assert.equal(await page.getByRole('button',{name:'Import 0 filters'}).isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await library.evaluate(el=>el.open),true);assert.deepEqual(await snapshot(),initial);
    const incoming=structuredClone(backup);incoming.filters[0].document.name='Conflicting imported';incoming.filters[1].document.id='new-id';
    await importFile(incoming);await page.locator('.library-backup-dialog').waitFor();await page.getByRole('radio',{name:'Skip conflicts'}).check();assert.equal(await page.getByRole('button',{name:'Import 1 filters',exact:true}).isEnabled(),true);await page.getByRole('radio',{name:'Keep both (recommended)'}).check();await page.getByRole('button',{name:'Import 2 filters',exact:true}).click();
    assert.match(await page.locator('.library-backup-status').textContent(),/2 filters added/);assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).length,collection),4);assert.deepEqual(await snapshot(),initial);
    await importFile(incoming);await page.locator('.library-backup-dialog').waitFor();assert.equal(await page.getByRole('button',{name:'Import 0 filters'}).isDisabled(),true);await page.keyboard.press('Escape');
    const before=await page.evaluate(key=>localStorage.getItem(key),collection);
    await importFile('{bad');await page.getByRole('alert').filter({hasText:'valid JSON'}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),collection),before);
    const extra=structuredClone(backup);extra.filters=extra.filters.slice(0,1);extra.filters[0].document.id='quota-id';
    await importFile(extra);await page.locator('.library-backup-dialog').waitFor();await page.evaluate(key=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key)throw new Error('QuotaExceededError');return original.call(this,k,v);};window.restoreBackupStorage=()=>Storage.prototype.setItem=original;},collection);await page.getByRole('button',{name:'Import 1 filters',exact:true}).click();await page.getByRole('alert').filter({hasText:'existing library was preserved'}).waitFor();assert.equal(await page.evaluate(key=>localStorage.getItem(key),collection),before);assert.equal(await page.evaluate(key=>localStorage.getItem(key),pref+'quota-id'),null);await page.evaluate(()=>window.restoreBackupStorage());await page.keyboard.press('Escape');
    await importFile(extra);await page.locator('.library-backup-dialog').waitFor();await page.evaluate(key=>localStorage.setItem(key,localStorage.getItem(key)+' '),collection);await page.getByRole('button',{name:'Import 1 filters',exact:true}).click();await page.getByRole('alert').filter({hasText:'another tab'}).waitFor();await page.keyboard.press('Escape');
    assert.deepEqual(await snapshot(),initial);
    for(const [width,height] of [[1366,768],[1024,768],[768,1024],[320,568],[640,360],[683,384]]){
      await page.setViewportSize({width,height});await manage();await page.getByRole('menuitem',{name:'Export backup'}).click();await page.locator('.library-backup-dialog').waitFor();const bounds=await page.locator('.library-backup-dialog').evaluate(el=>({width:el.getBoundingClientRect().width,overflow:el.scrollWidth>el.clientWidth+1}));assert(bounds.width<=width);assert(!bounds.overflow);if(url.endsWith('/index.html')&&[320,1366].includes(width)){fs.mkdirSync('backup-review',{recursive:true});await page.screenshot({path:`backup-review/export-${width}.png`});}await page.getByRole('button',{name:'Download backup',exact:true}).scrollIntoViewIfNeeded();await page.keyboard.press('Escape');
    }
    await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#filterLibraryDialog').open);assert.equal(await page.locator('#filterName').inputValue(),'Dirty draft');assert.equal(await page.locator('#formulaR').inputValue(),'r+3');await page.locator('#presetSelect option[value="custom:new-id"]').waitFor({state:'attached'});
    await page.setViewportSize({width:1366,height:768});await page.locator('#browseFiltersBtn').click();
    await page.evaluate(()=>{const original=File.prototype.text;File.prototype.text=function(){return new Promise(resolve=>window.finishPendingBackup=()=>{File.prototype.text=original;resolve('{invalid after close}');});};});
    await importFile(backup);await page.waitForFunction(()=>Boolean(window.finishPendingBackup));await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('#filterLibraryDialog').open);await page.evaluate(()=>window.finishPendingBackup());await page.waitForTimeout(100);assert.equal(await page.locator('.library-backup-dialog').count(),0);
    assert.deepEqual(errors,[]);reports.push({url,result:'PASS export, conflicts, idempotency, invalid/quota/stale safety, modal Escape, draft/preview preservation, six viewport sizes'});
    // Restore favorites in a new browser context from the exported file.
    const clean=await browser.newContext(),restored=await clean.newPage();await clean.addInitScript(()=>{localStorage.clear();localStorage.setItem('ffw-renderer','cpu');});await restored.route('https://anthonychimming.github.io/filter-fabjs-library/**',r=>r.abort());await restored.goto(url);await restored.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready');await restored.locator('#browseFiltersBtn').click();await restored.getByRole('button',{name:'Manage My Filters'}).click();await restored.locator('.library-manage input[type=file]').setInputFiles({name:'restore.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});await restored.getByRole('button',{name:'Import 2 filters',exact:true}).click();assert.equal(await restored.evaluate(key=>JSON.parse(localStorage.getItem(key)).favorite,pref+'one'),true);await clean.close();await context.close();
  }
  console.log(JSON.stringify(reports,null,2));
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();server.kill();});
