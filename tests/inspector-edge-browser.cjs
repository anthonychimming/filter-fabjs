const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),cp=require('node:child_process');
(async()=>{
 const server=cp.spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'8107'},stdio:'ignore'});
 let browser;try{
 browser=await chromium.launch({channel:'msedge',headless:true});const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('ffw-renderer','cpu'));
 const ready=()=>page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready'&&!document.body.classList.contains('ui-locked'));
 const toggle=page.locator('#inspectorToggle'),hint=page.locator('#inspectorHint');
 const geometry=async()=>{
  await page.waitForTimeout(120);
  const g=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {toggle:r('#inspectorToggle'),stage:r('#canvasStage'),panel:r('#inspector'),expanded:document.querySelector('#inspectorToggle').getAttribute('aria-expanded')==='true',width:innerWidth,height:innerHeight,overflow:document.documentElement.scrollWidth>innerWidth};});
  assert.ok(!g.overflow);assert.equal(g.toggle.width,44);assert.equal(g.toggle.height,64);assert.ok(g.toggle.x>=0&&g.toggle.right<=g.width);assert.ok(g.toggle.y>=0&&g.toggle.bottom<=g.height);
  if(!g.expanded)assert.equal(g.toggle.right,g.width);else assert.equal(g.toggle.x,Math.max(0,g.panel.x-44));
  assert.ok(Math.abs(g.toggle.y+32-(g.stage.y+g.stage.height/2))<1,'workspace vertical center');
  const hit=await toggle.evaluate(e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.right-15,r.top+32));});assert.ok(hit,'toggle must receive clicks');
  if(g.expanded){const overlaps=await page.locator('#inspector').evaluate(panel=>{const t=document.querySelector('#inspectorToggle').getBoundingClientRect();return [...panel.querySelectorAll('.sidebar-scroll button,.sidebar-scroll input,.sidebar-scroll textarea,.sidebar-scroll select')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&r.height&&r.left<t.right&&r.right>t.left&&r.top<t.bottom&&r.bottom>t.top;}).map(e=>e.id||e.textContent);});assert.deepEqual(overlaps,[],'tab must not overlap inspector controls');}

 };
 fs.mkdirSync('review-results',{recursive:true});
 for(const [width,height] of [[1920,1080],[1440,900],[1024,768],[1023,768],[768,1024],[767,900],[390,844],[320,568]]){
  await page.setViewportSize({width,height});await page.goto('http://127.0.0.1:8107/');await ready();
  assert.equal(await toggle.getAttribute('aria-expanded'),String(width>=1024));await geometry();
  await toggle.focus();await page.keyboard.press('Enter');assert.equal(await toggle.getAttribute('aria-expanded'),String(width<1024));await geometry();
  await page.screenshot({path:`review-results/toggle-${width}.png`});
  if(width<768){await page.locator('#inspectorExpand').click();await geometry();await page.locator('#inspectorExpand').click();}
  if(width<1024){await toggle.focus();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'exploreModeTab');await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'inspectorToggle');await page.evaluate(()=>document.body.classList.add('ui-locked'));await geometry();await page.evaluate(()=>document.body.classList.remove('ui-locked'));}

  if(width<1024){await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'inspectorToggle');await toggle.click();}else await toggle.click();
  await page.locator('#authorModeTab').click();await page.locator('#formulaR').fill('r + ctl(0)');
  await toggle.click();await toggle.click();assert.equal(await page.locator('#formulaR').inputValue(),'r + ctl(0)');
  await page.locator('#exploreModeTab').click();await page.locator('#browseFiltersBtn').click();await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>document.activeElement.id),'browseFiltersBtn');
 }
 await page.setViewportSize({width:390,height:844});await page.evaluate(()=>localStorage.removeItem('ffw-inspector-discovered'));await page.reload();await ready();assert.ok(await hint.isVisible());await geometry();
 await page.screenshot({path:'review-results/discovery-390.png'});await page.locator('#inspectorHintDismiss').click();assert.ok(!await hint.isVisible());await page.reload();await ready();assert.ok(!await hint.isVisible());
 await page.evaluate(()=>localStorage.removeItem('ffw-inspector-discovered'));await page.reload();await ready();await toggle.click();assert.ok(!await hint.isVisible());await toggle.click();await page.reload();await ready();assert.ok(!await hint.isVisible());
 await page.setViewportSize({width:1440,height:900});await page.reload();await ready();
 await page.evaluate(async()=>{window.toggleRenders=0;const {RendererManager}=await import('/src/renderers/renderer-manager.js');const old=RendererManager.prototype.renderWithFallback;RendererManager.prototype.renderWithFallback=function(...args){window.toggleRenders++;return old.apply(this,args);};});
 const fit=async()=>{await page.waitForTimeout(120);const g=await page.evaluate(()=>{const r=s=>document.querySelector(s).getBoundingClientRect();const a=r('#canvasStage'),b=r('#canvasWrap'),style=getComputedStyle(document.querySelector('#canvasStage')),left=parseFloat(style.paddingLeft),right=parseFloat(style.paddingRight),top=parseFloat(style.paddingTop),bottom=parseFloat(style.paddingBottom);return {x:a.x+left+(a.width-left-right)/2-b.x-b.width/2,y:a.y+top+(a.height-top-bottom)/2-b.y-b.height/2};});assert.ok(Math.abs(g.x)<2&&Math.abs(g.y)<2);};
 await fit();await toggle.click();await fit();await toggle.click();await fit();
 await page.locator('#zoomIn').click();const size=await page.locator('#canvasWrap').evaluate(e=>[e.style.width,e.style.height]);await toggle.click();await toggle.click();assert.deepEqual(await page.locator('#canvasWrap').evaluate(e=>[e.style.width,e.style.height]),size);assert.equal(await page.evaluate(()=>window.toggleRenders),0);
 await page.setViewportSize({width:390,height:844});await geometry();assert.equal(await toggle.getAttribute('aria-expanded'),'false');await toggle.click();await page.setViewportSize({width:1440,height:900});await geometry();assert.equal(await toggle.getAttribute('aria-expanded'),'true');
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await toggle.evaluate(e=>getComputedStyle(e).transitionDuration),'0s');
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8107/dist/site/');await ready();await geometry();await toggle.click();await geometry();
 await page.goto('http://127.0.0.1:8107/dist/chromameld-rgba-v2.10.0.html');await ready();await geometry();await toggle.click();await geometry();
 assert.deepEqual(errors,[]);console.log('PASS: eight widths; edge geometry/hit targets; keyboard; compact dialogs; author edits; library; discovery persistence; Fit/manual zoom; no filter rerenders; resizing; reduced motion.');
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
