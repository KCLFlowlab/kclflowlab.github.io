// Interaction QA for the WebGL swimmer: opening sequence, pointer/keyboard steering, bounds, pause and reduced motion.
const {chromium}=require('./browser/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8769/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const errors=[],checks=[];const note=m=>{checks.push(m);console.log('PASS: '+m);};
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  const data=()=>page.locator('#flow-canvas').evaluate(c=>({...c.dataset}));
  const opacity=s=>page.locator(s).evaluate(e=>+getComputedStyle(e).opacity);
  await page.waitForFunction(()=>document.querySelector('#flow-canvas').dataset.renderer==='webgl');
  assert.equal(await page.evaluate(()=>document.body.classList.contains('hero-ready')),false);
  assert.equal((await data()).mode,'intro');
  assert.ok(await opacity('.site-header')<.2&&await opacity('.hero-hint')<.2&&await opacity('.scroll-cue')<.2,'No interface text during the opening');
  await page.screenshot({path:path.join(root,'qa/swimmer-opening.png')});
  await page.waitForFunction(()=>document.body.classList.contains('hero-ready'),null,{timeout:6000});await page.waitForTimeout(1600);
  assert.ok(await opacity('.site-header')>.9&&await opacity('.hero-hint')>.9,'Interface appears after the opening');
  note('Opening shows only the swimmer (WebGL); header, hint and scroll cue fade in after it has entered');

  // The fish follows the pointer.
  const head=async()=>{const d=await data();return [+d.fishX,+d.fishY];};
  let [x,y]=await head();const tx=x<720?1150:290,ty=y<450?680:240;
  const d0=Math.hypot(tx-x,ty-y);
  for(let i=0;i<12;i++){await page.mouse.move(tx+Math.sin(i)*3,ty,{steps:2});await page.waitForTimeout(250);}
  [x,y]=await head();const d1=Math.hypot(tx-x,ty-y);
  assert.ok(d1<d0*.6,`fish approaches pointer (${d0.toFixed(0)} → ${d1.toFixed(0)} px)`);
  note(`Pointer guidance: the fish swam from ${d0.toFixed(0)} px to ${d1.toFixed(0)} px of the cursor`);
  // A click makes it dart.
  await page.waitForTimeout(600);const slow=+(await data()).speed;
  await page.mouse.click(tx>720?300:1150,ty);await page.waitForTimeout(350);const fast=+(await data()).speed;
  assert.ok(fast>slow+.4,`dart raises speed (${slow} → ${fast})`);
  note(`Click to dart: speed ${slow.toFixed(2)} → ${fast.toFixed(2)} scene units/s`);
  // Arrow keys steer it across the screen.
  await page.mouse.move(720,880);await page.locator('body').evaluate(()=>document.activeElement?.blur());
  const before=await head();await page.keyboard.down('ArrowLeft');await page.waitForTimeout(2200);await page.keyboard.up('ArrowLeft');
  const afterLeft=await data();
  assert.ok(Math.abs(+afterLeft.heading)>2.2,`heading turned left (${afterLeft.heading})`);assert.ok(+afterLeft.fishX<before[0]-60,'fish moved left');
  assert.equal(await page.evaluate(()=>scrollY),0,'arrow keys steer instead of scrolling while the water fills the view');
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(1600);await page.keyboard.up('ArrowUp');
  const afterUp=await data();assert.ok(+afterUp.heading<-.6&&+afterUp.heading>-2.6,`heading turned up (${afterUp.heading})`);
  note('Arrow keys steer the fish (left, then up) without scrolling the page');
  const counts=await data();assert.ok(+counts.vortices<=40&&+counts.dye<=1400&&+counts.ambient<=260,JSON.stringify(counts));
  assert.ok(+counts.vortices>3,'wake vortices are shed');
  note(`Bounded wake: ${counts.vortices} vortices, ${counts.dye} dye and ${counts.ambient} ambient particles`);
  const f0=+(await data()).frames;await page.waitForTimeout(2000);const fps=(+(await data()).frames-f0)/2;
  assert.ok(fps>8,`frame rate ${fps}`);note(`Software WebGL rendered ${fps.toFixed(1)} frames/s at 1440×900`);
  await page.screenshot({path:path.join(root,'qa/swimmer-desktop.png')});
  // Pause stops autonomous motion; direct input still animates briefly.
  await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  await page.waitForTimeout(300);let a=+(await data()).frames;await page.waitForTimeout(600);assert.equal(+(await data()).frames,a,'paused');
  await page.locator('body').evaluate(()=>document.activeElement?.blur());await page.keyboard.press('ArrowRight');await page.waitForTimeout(400);assert.ok(+(await data()).frames>a,'input animates while paused');
  await page.locator('#motion-toggle').click();assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'),'false');
  note('Pause freezes the swimmer; direct input still animates it briefly; Play resumes');
  // Rendering stops once the water scrolls out of view.
  await page.evaluate(()=>scrollTo(0,innerHeight*1.6));await page.waitForTimeout(700);a=+(await data()).frames;await page.waitForTimeout(600);
  assert.equal(+(await data()).frames,a,'no rendering off-screen');
  assert.equal(await page.locator('.site-header').evaluate(e=>e.classList.contains('on-page')),true);
  note('Rendering stops when the hero leaves the viewport; the header switches to its page style');

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});mobile.on('pageerror',e=>errors.push(e.message));
  await mobile.goto(url);await mobile.waitForFunction(()=>document.querySelector('#flow-canvas').dataset.renderer==='webgl');
  assert.equal(await mobile.evaluate(()=>document.body.classList.contains('hero-ready')),true);
  const m=()=>mobile.locator('#flow-canvas').evaluate(c=>+c.dataset.frames);
  await mobile.waitForTimeout(300);const m0=await m();await mobile.waitForTimeout(700);assert.equal(await m(),m0,'reduced motion: no autoplay');
  assert.equal(await mobile.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  await mobile.locator('#flow-canvas').tap({position:{x:120,y:300}});await mobile.waitForTimeout(500);assert.ok(await m()>m0,'tap animates');
  await mobile.screenshot({path:path.join(root,'qa/swimmer-mobile.png')});
  note('Reduced motion: the fish rests and the interface is shown at once; a tap still guides it');
  assert.deepEqual(errors,[]);
  const report={status:'passed',url,checks,errors};fs.writeFileSync(path.join(root,'qa/swimmer-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
