const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const fs=require('node:fs'),cp=require('node:child_process'),assert=require('node:assert/strict');
const sizes=[[778,622],[1024,768],[700,900],[720,450],[390,844],[320,568],[640,360],[1440,900]];
async function seedPagination(page){
 await page.addInitScript(()=>{
   localStorage.setItem('ffw-custom-presets',JSON.stringify(Array.from({length:110},(_,i)=>({
     format:'filter-fab-js',version:2,id:`pager-${i}`,name:`Pager Filter ${String(i).padStart(3,'0')}`,tags:['Art'],formulas:['r','g','b','a']
   }))));
 });
}

async function checkBottomPagination(page,{touch=false,screenshot}={}){
 const dialog=page.locator('.filter-browser[open]'),scroller=dialog.locator('.browser-results-scroll'),pager=dialog.locator('.browser-pages-bottom');
 await dialog.locator('[data-source]').selectOption('custom');
 const previous=pager.getByRole('button',{name:'Previous page'}),next=pager.getByRole('button',{name:'Next page'});
 assert.ok(await previous.isDisabled());
 assert.equal(await pager.locator('[data-bottom-range]').textContent(),'1–50 of 110');
 const initial=await scroller.evaluate(node=>node.getBoundingClientRect().bottom);
 assert.ok((await pager.boundingBox()).y>=initial,'pager begins below the visible results');
 await next.scrollIntoViewIfNeeded();
 await next.focus();
 if(!touch)await page.keyboard.press('Shift');
 const g=await dialog.evaluate(d=>{
   const scroller=d.querySelector('.browser-results-scroll'),list=d.querySelector('.filter-results'),pager=d.querySelector('.browser-pages-bottom');
   const rect=node=>node.getBoundingClientRect().toJSON();
   const [prev,range,next]=[...pager.children].map(rect),scroll=rect(scroller),row=rect(pager),footer=rect(d.querySelector('.library-actions'));
   return {prev,range,next,scroll,row,footer,lastCard:rect(list.lastElementChild),listOverflow:getComputedStyle(list).overflowY,
     overflow:scroller.scrollWidth>scroller.clientWidth,focus:getComputedStyle(pager.lastElementChild).outlineStyle,
     pagerPosition:getComputedStyle(pager).position};
 });
 assert.equal(g.overflow,false);
 assert.equal(g.listOverflow,'visible','results list does not scroll independently');
 assert.equal(g.pagerPosition,'static');
 assert.ok(g.prev.height>=(touch?44:36)&&g.next.height>=(touch?44:36));
 assert.ok(g.prev.width>=44&&g.next.width>=44);
 assert.ok(g.prev.right<=g.range.left&&g.range.right<=g.next.left);
 assert.ok(Math.abs((g.range.left+g.range.right)-(g.row.left+g.row.right))<=2);
 assert.ok(g.lastCard.bottom<=g.row.top&&g.row.top>=g.scroll.top-1&&g.row.bottom<=g.footer.top+1);
 if(!touch)assert.equal(g.focus,'solid');
 if(screenshot)await page.screenshot({path:screenshot});
 await next.press('Enter');
 assert.equal(await scroller.evaluate(e=>e.scrollTop),0);
 assert.equal(await dialog.locator('[data-page]').textContent(),'Page 2 of 3');
 assert.equal(await pager.locator('[data-bottom-range]').textContent(),'51–100 of 110');
 assert.ok(await dialog.locator('[data-entry-action="preview"]').first().evaluate(e=>e===document.activeElement));
 assert.ok(await dialog.locator('[data-apply]').isDisabled(),'paging keeps Apply disabled until a preview renders');
 await page.waitForFunction(()=>document.querySelector('.filter-card[data-thumbnail-ready="true"]'));
 assert.notEqual(await dialog.locator('.filter-card').last().getAttribute('data-thumbnail-ready'),'true','out-of-view thumbnails remain lazy');
 await previous.press('Enter');
 assert.equal(await dialog.locator('[data-page]').textContent(),'Page 1 of 3');
 assert.equal(await scroller.evaluate(e=>e.scrollTop),0);
 const topPrevious=dialog.locator('[data-prev]'),topNext=dialog.locator('[data-next]');
 await topNext.press('Enter');
 assert.ok(await topNext.evaluate(e=>e===document.activeElement));
 await topNext.press('Enter');
 assert.ok(await topNext.isDisabled());
 assert.ok(await topPrevious.evaluate(e=>e===document.activeElement),'focus transfers when the top control reaches its boundary');
}

(async()=>{
 const phase=process.argv.includes('--baseline')?'before':'after',out=process.env.FILTER_FAB_REVIEW_DIR||'../library-ux-review';fs.mkdirSync(out,{recursive:true});
 const server=cp.spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'8114'},stdio:'ignore'});let browser;
 try{
 browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext();const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('ffw-renderer','cpu');localStorage.setItem('ffw-inspector-discovered','true')});
 if(phase==='after')await seedPagination(page);
 await page.route('https://anthonychimming.github.io/filter-fabjs-library/**',route=>route.abort());
 await page.goto('http://localhost:8114');await page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready');
 const measurements=[];
 for(const [width,height] of sizes){
 await page.setViewportSize({width,height});await page.waitForTimeout(200);if(await page.locator('#inspectorToggle').getAttribute('aria-expanded')==='false')await page.locator('#inspectorToggle').click();await page.locator('#browseFiltersBtn').click();await page.waitForTimeout(400);
 const g=await page.evaluate(()=>{const d=document.querySelector('.filter-browser'),list=d.querySelector('.filter-results'),r=(d.querySelector('.browser-results-scroll')||list).getBoundingClientRect(),box=d.getBoundingClientRect(),rect=s=>d.querySelector(s).getBoundingClientRect().toJSON();return {viewport:[innerWidth,innerHeight],dialog:box.toJSON(),results:r.toJSON(),above:r.top-box.top,below:box.bottom-r.bottom,completeRows:[...list.querySelectorAll('.filter-card')].filter(e=>{const b=e.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom}).length,horizontalOverflow:d.scrollWidth>d.clientWidth||document.documentElement.scrollWidth>innerWidth,canvas:document.querySelector('#displayCanvas').getBoundingClientRect().toJSON(),inspector:document.querySelector('#inspector').getBoundingClientRect().toJSON(),actions:rect('.library-actions'),focus:document.activeElement.outerHTML.slice(0,180)}});
 measurements.push(g);await page.screenshot({path:`${out}/${phase}-${width}x${height}.png`});
 if(phase==='after'){assert.equal(g.horizontalOverflow,false,`${width}: overflow`);if(width===778)assert.ok(g.completeRows>=2,'778x622 acceptance');for(const selector of ['[data-search]','[data-source]','[data-favorites]','[data-close]','[data-cancel]','[data-apply]']){const b=await page.locator(`.filter-browser ${selector}`).boundingBox();assert.ok(b&&b.y>=0&&b.y+b.height<=height,`${width}: ${selector} reachable`);}}
 if(phase==='after')await checkBottomPagination(page,{screenshot:`${out}/pager-${width}x${height}.png`});
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.filter-browser').open&&document.activeElement.id==='browseFiltersBtn');
 }
 fs.writeFileSync(`${out}/${phase}-measurements.json`,JSON.stringify(measurements,null,2));
 if(phase==='after'){
 // Real app transaction and keyboard containment at the primary reproduction size.
 await page.setViewportSize({width:778,height:622});await page.waitForTimeout(200);if(await page.locator('#inspectorToggle').getAttribute('aria-expanded')==='false')await page.locator('#inspectorToggle').click();
 const state=await page.evaluate(()=>window.FilterFabJS.getLibraryPreviewState());await page.locator('#browseFiltersBtn').click();
 const dialog=page.locator('.filter-browser');await dialog.locator('[data-source]').selectOption('builtin');await dialog.locator('[data-entry-action="preview"]').first().click();await page.waitForFunction(()=>!document.querySelector('.filter-browser [data-apply]').disabled);
 assert.equal((await page.evaluate(()=>window.FilterFabJS.getLibraryPreviewState())).activeKey,state.activeKey,'candidate does not commit');
 for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.querySelector('.filter-browser').contains(document.activeElement)),'modal contains focus');}
 await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('.filter-browser').open);assert.deepEqual(await page.evaluate(()=>window.FilterFabJS.getLibraryPreviewState()),state,'Escape restores transaction');
 // Controlled larger catalogue verifies visible paging and hidden restriction controls at 320px.
 await page.evaluate(async()=>{const {createFilterBrowser}=await import('/src/ui/filter-browser.js'),{catalogEntry}=await import('/src/app/filter-catalog.js');const launcher=document.createElement('button');launcher.id='fixtureLauncher';launcher.textContent='Fixture';document.body.append(launcher);const entries=Array.from({length:105},(_,i)=>catalogEntry({id:`fixture-${i}`,name:`Fixture ${i}`,description:'Compact card description',author:'Author',tags:['Art'],formulas:['r','g','b','a']},'builtin',{favorite:false,tags:[]}));window.compactFixture=createFilterBrowser({launcher,getEntries:()=>entries,begin:()=>true,preview:()=>true,apply:()=>true,cancel:()=>true,toggleFavorite:e=>e.favorite=!e.favorite,onError:e=>{throw e;}});launcher.click();});
 await page.setViewportSize({width:320,height:568});await page.waitForTimeout(150);const fixture=page.locator('.filter-browser[open]');
 await fixture.locator('[data-next]').click();assert.equal(await fixture.locator('[data-page]').textContent(),'Page 2 of 3');
 assert.equal(await fixture.evaluate(e=>e.scrollWidth>e.clientWidth),false);await fixture.locator('summary').click();await fixture.locator('[data-choices] input').first().check();await fixture.locator('summary').click();assert.equal(await fixture.locator('[data-restrictions]').textContent(),'1 active');await fixture.locator('[data-reset]').click();await page.screenshot({path:`${out}/after-320-pagination.png`});await page.keyboard.press('Escape');
 await page.evaluate(async()=>{window.compactFixture.dialog.remove();const {createFilterBrowser}=await import('/src/ui/filter-browser.js');const entries=Array.from({length:55},(_,i)=>({key:`online:geometry-${i}`,id:`geometry-${i}`,name:`Online geometry ${i}`,source:'online',author:'Author',description:'Sample description',tags:[],favorite:false}));window.compactFixture=createFilterBrowser({launcher:document.querySelector('#fixtureLauncher'),getEntries:()=>entries,getOnlineState:()=>({status:'ready'}),begin:()=>true,preview:()=>true,previewOnline:()=>true,downloadOnline:()=>true,resolveOnlinePreviewUrl:()=>'',apply:()=>true,cancel:()=>true,toggleFavorite:()=>{},onError:e=>{throw e;}});document.querySelector('#fixtureLauncher').click();});
 await page.setViewportSize({width:778,height:622});await page.waitForTimeout(200);assert.ok(await fixture.evaluate(e=>{const r=e.querySelector('.browser-results-scroll').getBoundingClientRect();return [...e.querySelectorAll('.filter-card')].filter(c=>{const b=c.getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom}).length>=2}),'two complete Online cards with Favorite and Download');await page.screenshot({path:`${out}/after-778-online.png`});await page.keyboard.press('Escape');
 // 200% equivalent CSS viewport; true OS/browser zoom and on-screen keyboard are manual checks.
 await page.setViewportSize({width:720,height:450});await page.locator('#fixtureLauncher').evaluate(e=>e.click());await page.waitForTimeout(150);assert.equal(await fixture.evaluate(e=>e.scrollWidth>e.clientWidth),false);await page.screenshot({path:`${out}/after-200percent-equivalent.png`});await page.keyboard.press('Escape');
 const touch=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});const mobile=await touch.newPage();await seedPagination(mobile);await mobile.route('https://anthonychimming.github.io/filter-fabjs-library/**',r=>r.abort());await mobile.goto('http://localhost:8114');await mobile.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready');await mobile.locator('#inspectorToggle').click();await mobile.locator('#browseFiltersBtn').click();assert.equal(await mobile.evaluate(()=>document.activeElement.hasAttribute('data-search')),false,'coarse opening avoids search keyboard');await mobile.screenshot({path:`${out}/after-coarse-390.png`});await checkBottomPagination(mobile,{touch:true,screenshot:`${out}/pager-touch-390x844.png`});await touch.close();
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify(measurements.map(g=>({size:g.viewport,rows:g.completeRows,above:g.above,below:g.below,overflow:g.horizontalOverflow}))));
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1});
