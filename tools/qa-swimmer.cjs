const {chromium}=require('./browser/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 const errors=[],results=[];
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.draws=0;const clear=CanvasRenderingContext2D.prototype.clearRect;CanvasRenderingContext2D.prototype.clearRect=function(...args){window.draws++;return clear.apply(this,args)}});
  await page.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8769/');await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.fishX);
  const data=()=>page.locator('canvas').evaluate(c=>({...c.dataset}));
  const frame=()=>page.locator('canvas').evaluate(c=>c.toDataURL());
  await page.waitForTimeout(600);await page.screenshot({path:'qa/swimmer-desktop.png'});
  let before=await data(),x=+before.fishX,y=+before.fishY;
  await page.mouse.move(x-35,y);await page.waitForFunction(()=>document.querySelector('canvas').classList.contains('fish-hover'));
  await page.mouse.down();assert.equal((await data()).interaction,'fish');
  // A curved pull crosses open water and leaves vortices along the travelled path.
  for(let i=1;i<=30;i++){await page.mouse.move(x-35-160*Math.sin(i/30*Math.PI*.7),y+150*i/30,{steps:1});await page.waitForTimeout(20);}
  await page.mouse.up();await page.waitForTimeout(170);
  let after=await data();assert.ok(Math.hypot(+after.fishX-x,+after.fishY-y)>130);assert.ok(Math.abs(+after.yaw-+before.yaw)<.01);
  assert.ok(+after.wakeCount<=30);assert.ok(+after.particleCount<=390);
  await page.mouse.move(40,100);await page.screenshot({path:'qa/swimmer-drag-wake.png'});
  const wakeA=await frame();await page.waitForTimeout(250);assert.notEqual(await frame(),wakeA);
  results.push('Fish hit testing and hover work; dragging translates the fish without orbiting the camera; the wake continues after release and buffers stay bounded.');
  await page.locator('#motion-toggle').click();await page.waitForTimeout(200);
  const paused=await frame();await page.waitForTimeout(200);assert.equal(await frame(),paused);
  await page.locator('canvas').focus();before=await data();await page.keyboard.press('Shift+ArrowLeft');await page.waitForTimeout(100);after=await data();
  assert.ok(+after.fishX<+before.fishX-10);assert.equal(+after.yaw,+before.yaw);assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  const still=await frame();await page.waitForTimeout(150);assert.equal(await frame(),still);
  await page.keyboard.press('0');await page.waitForTimeout(700);after=await data();assert.ok(Math.abs(+after.fishX-1440*.61)<2);assert.ok(Math.abs(+after.fishY-450)<2);
  results.push('Pause freezes the fish and wake; Shift + arrows move the fish without enabling animation; reset restores the swimmer and camera.');
  await page.locator('#motion-toggle').click();
  const performance=await page.evaluate(async()=>{const n=draws,t=window.performance.now();await new Promise(r=>setTimeout(r,2200));return {fps:(draws-n)*1000/(window.performance.now()-t),particles:+document.querySelector('canvas').dataset.particleCount,vortices:+document.querySelector('canvas').dataset.wakeCount}});
  assert.ok(performance.fps>18,JSON.stringify(performance));
  results.push(`Software Chromium rendered ${performance.fps.toFixed(1)} frames/s after interaction.`);
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(process.env.PREVIEW_URL||'http://127.0.0.1:8769/');await mobile.evaluate(()=>document.fonts.ready);await mobile.waitForFunction(()=>document.querySelector('canvas').dataset.fishX);
  await mobile.screenshot({path:'qa/swimmer-mobile.png'});
  const touch=await mobile.context().newCDPSession(mobile),start=await mobile.locator('canvas').evaluate(c=>({...c.dataset}));
  x=+start.fishX;y=+start.fishY;
  await touch.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});
  assert.equal(await mobile.locator('canvas').getAttribute('data-interaction'),'fish');
  await touch.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+42,y:y+30,id:1}]});
  await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await mobile.waitForTimeout(100);const moved=await mobile.locator('canvas').evaluate(c=>({...c.dataset}));
  assert.ok(+moved.fishX>x+30);assert.equal(moved.yaw,start.yaw);assert.equal(await mobile.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  assert.equal(await mobile.evaluate(()=>scrollY),0);
  results.push('Touch can move the fish with no page scroll; reduced motion remains paused after direct manipulation.');
  assert.deepEqual(errors,[]);fs.writeFileSync('qa/swimmer-report.json',JSON.stringify({results,performance,errors},null,2));console.log(JSON.stringify({results,performance,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
