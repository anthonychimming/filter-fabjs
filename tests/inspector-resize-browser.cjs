// Optional: FILTER_FAB_PLAYWRIGHT points to an existing Playwright installation.
const {chromium}=require(process.env.FILTER_FAB_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),cp=require('node:child_process');
(async()=>{
 const server=cp.spawn(process.execPath,['scripts/dev-server.mjs'],{env:{...process.env,PORT:'8108'},stdio:'ignore'});
 let browser;try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const hasTouch of [false,true])for(const [width,height,deviceScaleFactor] of [[1920,1080,1],[1536,864,1.25],[1280,720,1.5],[1024,768,2]]){
   const context=await browser.newContext({viewport:{width,height},deviceScaleFactor,hasTouch});
   const page=await context.newPage();await page.addInitScript(()=>localStorage.setItem('ffw-renderer','cpu'));
   await page.goto('http://127.0.0.1:8108/');await page.waitForFunction(()=>window.FilterFabJS&&document.querySelector('#statusText').textContent==='Preview ready');
   await page.evaluate(()=>document.fonts.ready);
   const toggle=page.locator('#inspectorToggle'),resize=page.locator('#inspectorResize');
   const cdp=await context.newCDPSession(page);
   const touch=async(type,x,y)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x,y,id:1,radiusX:1,radiusY:1}]});
   await resize.evaluate(e=>{window.resizeStarts=0;e.addEventListener('pointerdown',()=>window.resizeStarts++);});
   assert.equal(await resize.evaluate(e=>getComputedStyle(e,'::after').content),'none');
   assert.equal(await page.evaluate(()=>matchMedia('(pointer:coarse)').matches),hasTouch);
   for(const key of ['Home','End','Home']){
    await resize.focus();await page.keyboard.press(key);await page.waitForTimeout(40);
    for(const [u,v] of [[1,1],[43,1],[1,63],[43,63],[22,32]]){
     const box=await toggle.boundingBox(),x=box.x+u,y=box.y+v;
     assert.ok(await toggle.evaluate((e,{x,y})=>e.contains(document.elementFromPoint(x,y)),{x,y}),'full button target must own all corners');
     const before=await resize.getAttribute('aria-valuenow'),starts=await page.evaluate(()=>window.resizeStarts);
     if(hasTouch)await toggle.tap({position:{x:u,y:v}});else await toggle.click({position:{x:u,y:v}});
     await page.waitForTimeout(40);
     assert.equal(await page.evaluate(()=>window.resizeStarts),starts,'toggle must not start separator drag');
     assert.equal(await page.locator('.app').getAttribute('data-inspector-dragging'),null);
     assert.equal(await resize.getAttribute('aria-valuenow'),before);
     assert.equal(await toggle.getAttribute('aria-expanded'),'false');
     if(hasTouch){const b=await toggle.boundingBox();await page.touchscreen.tap(b.x+22,b.y+32);}else await toggle.click();
    }
    // Resize on both sides of the tab, including the expanded coarse pointer target.
    for(const side of [-1,1]){
     await resize.focus();await page.keyboard.press('Home');await page.keyboard.press('ArrowLeft');await page.waitForTimeout(40);
     const t=await toggle.boundingBox(),r=await resize.boundingBox(),x=r.x+(hasTouch?-10:4),y=side<0?t.y-32:t.y+t.height+32;
     assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x,y}),'inspectorResize');
     const before=Number(await resize.getAttribute('aria-valuenow'));
     if(hasTouch){await touch('touchStart',x,y);await touch('touchMove',x-16,y);}else{await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x-16,y);}
     assert.notEqual(await page.locator('.app').getAttribute('data-inspector-dragging'),null);
     if(hasTouch)await touch('touchEnd');else await page.mouse.up();
     assert.ok(Number(await resize.getAttribute('aria-valuenow'))>before);
     assert.equal(await toggle.getAttribute('aria-expanded'),'true');
    }
   }
   await resize.focus();await page.keyboard.press('Home');assert.equal(await resize.getAttribute('aria-valuenow'),'320');await page.keyboard.press('Shift+ArrowLeft');assert.equal(await resize.getAttribute('aria-valuenow'),'352');assert.equal(await resize.getAttribute('aria-label'),'Inspector width');assert.equal(await toggle.getAttribute('aria-label'),'Hide inspector');
   await context.close();console.log(`PASS ${hasTouch?'touch/coarse':'mouse'} ${width}x${height} scale ${deviceScaleFactor}`);
  }
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
