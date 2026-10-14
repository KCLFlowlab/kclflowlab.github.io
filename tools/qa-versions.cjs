const {chromium}=require('./browser/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:8769/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox']});
 const checks=[],errors=[],failed=[];
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&new URL(r.url()).origin===new URL(base).origin)failed.push(r.url())})};
 try{
  // The archived visual really is the historic implementation, not an approximation.
  for(const [source,file]of[['app.js','sculpture.js'],['styles.css','sculpture.css']])assert.equal(fs.readFileSync(path.join(root,'site',file),'utf8'),execFileSync('git',['show',`c05e741:site/${source}`],{cwd:root,encoding:'utf8'}));
  checks.push('The restored renderer and layout exactly match historical commit c05e741.');
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:'reduce'});watch(page);
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('canvas').dataset.fishX);
  assert.equal(await page.locator('.experience-switcher [aria-current]').innerText(),'Swimmer');
  await page.locator('[data-experience-link="sculpture"]').click();await page.waitForURL('**/sculpture.html');await page.waitForFunction(()=>document.querySelector('canvas').dataset.yaw);
  assert.equal(await page.locator('body').getAttribute('data-experience'),'sculpture');assert.equal(await page.locator('canvas').getAttribute('data-fish-x'),null);
  assert.equal(await page.locator('.experience-switcher [aria-current]').innerText(),'Flow form');
  const frame=()=>page.locator('canvas').evaluate(c=>c.toDataURL());
  const still=await frame();await page.waitForTimeout(150);assert.equal(await frame(),still);
  await page.locator('#motion-toggle').click();await page.waitForTimeout(180);const a=await frame();await page.waitForTimeout(150);assert.notEqual(await frame(),a);
  await page.locator('#motion-toggle').click();await page.waitForTimeout(100);
  assert.equal(await page.evaluate(()=>document.elementFromPoint(1150,630).id),'flow-canvas');
  await page.mouse.move(1150,630);await page.mouse.down();await page.mouse.move(1300,660,{steps:8});await page.mouse.up();await page.waitForFunction(()=>+document.querySelector('canvas').dataset.yaw>.9);
  await page.locator('#zoom-in').click();await page.waitForFunction(()=>+document.querySelector('canvas').dataset.zoom>1.05);
  await page.locator('#reset-view').click();await page.waitForFunction(()=>Math.abs(+document.querySelector('canvas').dataset.yaw-.56)<.01);
  await page.goBack();await page.waitForFunction(()=>document.body.dataset.experience==='swimmer');
  await page.goForward();await page.waitForFunction(()=>document.body.dataset.experience==='sculpture');
  await page.locator('[data-experience-link="swimmer"]').click();await page.waitForFunction(()=>document.body.dataset.experience==='swimmer');
  checks.push('Native links switch both ways; browser Back/Forward works; the restored artwork rotates, zooms, animates, pauses and resets.');
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});watch(mobile);
  for(const [file,key]of[['','swimmer'],['sculpture.html','sculpture']]){
   await mobile.goto(new URL(file,base).href);await mobile.evaluate(()=>document.fonts.ready);
   for(const [width,height]of[[320,667],[390,750],[390,844],[768,844],[1024,768],[1366,768],[1440,900]]){
    await mobile.setViewportSize({width,height});await mobile.evaluate(()=>location.hash='research');await mobile.waitForTimeout(100);
    const inspect=()=>mobile.evaluate(()=>{
     const v=document.querySelector('.experience-switcher').getBoundingClientRect();
     const overlap=r=>Math.min(v.right,r.right)-Math.max(v.left,r.left)>2&&Math.min(v.bottom,r.bottom)-Math.max(v.top,r.top)>2;
     const elements=[...document.querySelectorAll('.site-header,.landscape-intro,.domain-portal,.orbit-tools,.landscape-footer,.direction-panel')].filter(e=>getComputedStyle(e).visibility!=='hidden'&&getComputedStyle(e).display!=='none');
     return {fits:v.left>=0&&v.right<=innerWidth&&v.top>=0&&v.bottom<=innerHeight,conflicts:elements.filter(e=>overlap(e.getBoundingClientRect())).map(e=>e.className),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    let layout=await inspect();assert.equal(layout.fits,true,`${key} switch fits ${width}x${height}`);assert.deepEqual(layout.conflicts,[],`${key} overview overlaps ${width}x${height}`);assert.equal(layout.overflow,false);
    await mobile.locator('#domain-ai').click();await mobile.waitForSelector('#direction-title');layout=await inspect();assert.equal(layout.fits,true);assert.deepEqual(layout.conflicts,[],`${key} focused overlaps ${width}x${height}`);
    assert.equal(await mobile.locator('.experience-switcher a:not([aria-current])').isVisible(),true);
    if(width<=700)assert.equal(await mobile.evaluate(()=>{const controls=document.querySelector('.orbit-tools').getBoundingClientRect();return [...document.querySelectorAll('.domain-portal')].every(e=>e.getBoundingClientRect().bottom<=controls.top)}),true,`${key} direction tabs stay above controls at ${width}`);
   }
   await mobile.setViewportSize({width:390,height:844});
   await mobile.locator('.experience-switcher a:not([aria-current])').click();await mobile.waitForFunction(k=>document.body.dataset.experience!==k,key);
   await mobile.goto(new URL(file+'#study-deforming',base).href);await mobile.waitForSelector('#research-video');await mobile.waitForFunction(()=>document.querySelector('#research-video').readyState>=2);
   assert.equal(await mobile.locator('#research-video').evaluate(v=>v.paused),true);
   await mobile.locator('#video-play').click();await mobile.waitForFunction(()=>document.querySelector('#research-video').currentTime>.05&&!document.querySelector('#research-video').paused);
   const video=await mobile.locator('#research-video').elementHandle();await mobile.locator('.dialog-close').click();assert.equal(await video.evaluate(v=>v.paused),true);
   await mobile.locator('[data-route="people"]').click();await mobile.waitForSelector('.principal');assert.deepEqual(await mobile.locator('.person h3').allTextContents(),['Yichen Li','Matteo Liguori','Vedang Joshi','Xingxin Yang','Zhan Zhang']);await mobile.locator('.dialog-close').click();
  }
  checks.push('Both pages retain study deep links, original video playback and team order; switches fit all seven 320–1440px layouts, including direction panels; touch links work.');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={status:'passed',checks,errors,failed};fs.mkdirSync(path.join(root,'qa'),{recursive:true});fs.writeFileSync(path.join(root,'qa/versions-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
