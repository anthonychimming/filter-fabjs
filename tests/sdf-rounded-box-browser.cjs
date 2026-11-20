// Optional browser integration fixture, following the repo's Playwright convention.
const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
  const server=spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'18882'},stdio:'ignore'});
  let browser;
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage();
    await page.addInitScript(()=>{
      localStorage.setItem('ffw-renderer','cpu');
      localStorage.setItem('ffw-custom-presets',JSON.stringify([{format:'filter-fab-js',version:2,
        id:'legacy-box',name:'Legacy Box',mathMode:'legacy',formulas:['r','g','0?sdfRoundedBox(x,y,0,0,10,10,1,0):b','a']}]));
    });
    await page.route('https://anthonychimming.github.io/**',route=>route.abort());
    await page.goto('http://localhost:18882');
    await page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready');
    const state=()=>page.evaluate(()=>({
      identity:window.FilterFabJS.getLibraryPreviewState().activeKey,
      formulas:window.FilterFabJS.getLastProgram(),pixels:document.querySelector('#displayCanvas').toDataURL(),
      storage:localStorage.getItem('ffw-custom-presets')
    }));
    const before=await state();
    if(await page.locator('#inspectorToggle').getAttribute('aria-expanded')==='false')await page.locator('#inspectorToggle').click();
    await page.locator('#browseFiltersBtn').click();
    await page.locator('[data-source]').selectOption('custom');
    await page.locator('.filter-card [data-thumbnail-state="failed"]').waitFor();
    await page.locator('.filter-card-preview').click();
    await page.getByText(/Channel 3: sdfRoundedBox\(\) requires native float mode/).first().waitFor();
    assert(await page.locator('[data-apply]').isDisabled());
    assert.deepEqual(await state(),before);
    console.log('Rejected legacy local thumbnail and preview; active filter, canvas and storage preserved.');
  }finally{await browser?.close();server.kill()}
})().catch(error=>{console.error(error);process.exitCode=1});
