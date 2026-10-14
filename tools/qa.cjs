const {chromium}=require('./browser/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8769/';
const executablePath=process.env.CHROMIUM_PATH||chromium.executablePath();
(async()=>{
 const browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
 const errors=[],failed=[],checks=[];
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failed.push(`${r.status()} ${r.url()}`);});};
 const close=async p=>{await p.locator('.dialog-close').click();await p.waitForFunction(()=>!document.querySelector('dialog').open);};
 const open=async(p,key)=>{await p.locator('#study-'+key).click();await p.waitForFunction(k=>document.querySelector('dialog').open&&document.querySelector('.study-switcher [aria-current]')?.getAttribute('href')==='#study-'+k,key);};
 const images=async p=>{for(const s of await p.locator('.figure-gallery summary').all())await s.click();for(const i of await p.locator('.figure-gallery img').all()){await i.scrollIntoViewIfNeeded();await i.evaluate(e=>e.decode());}};
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});watch(page);
  assert.equal((await page.goto(url)).status(),200);await page.evaluate(()=>document.fonts.ready);
  assert.match(await page.title(),/Fluid physics/);
  await page.waitForFunction(()=>document.querySelector('#flow-canvas').width>1);
  await page.waitForTimeout(200);
  const frame=()=>page.locator('#flow-canvas').evaluate(c=>c.toDataURL());
  const a=await frame();await page.waitForTimeout(140);assert.notEqual(await frame(),a);
  await page.locator('#motion-toggle').click();await page.waitForTimeout(80);const paused=await frame();await page.waitForTimeout(140);assert.equal(await frame(),paused);
  assert.equal(await page.locator('.wordmark img').getAttribute('src'),'assets/kclflowlab-logo.png');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight),true);
  await page.mouse.wheel(0,900);assert.equal(await page.evaluate(()=>scrollY),0);
  await page.locator('#layer-toggle').click();assert.equal(await page.locator('.hero-scene').evaluate(e=>e.classList.contains('tracers-only')),true);await page.locator('#layer-toggle').click();
  await page.locator('#field-info').click();assert.match(await page.locator('#dialog-content').innerText(),/passive tracers in this frozen velocity field/);await close(page);
  checks.push('One viewport research field; no page scrolling; original black logo, real-field particles, pause and field-layer toggle work');
  assert.deepEqual(await page.locator('.research-node').evaluateAll(es=>es.map(e=>e.dataset.project)),['ravfm','stco','deforming','vato']);
  assert.deepEqual(await page.locator('.research-node').evaluateAll(es=>es.map(e=>e.dataset.date)),['2026-03-13','2026-08-20','2026-08-31','2026-09-01']);
  await page.locator('[data-filter="ai"]').click();assert.equal(await page.locator('.research-node:not(.filtered-out)').count(),2);assert.equal(await page.locator('#study-count').innerText(),'02 MATCHES');
  await page.locator('[data-filter="forces"]').click();assert.deepEqual(await page.locator('.research-node:not(.filtered-out)').evaluateAll(es=>es.map(e=>e.dataset.project)),['ravfm','deforming']);
  await page.locator('[data-filter="all"]').click();assert.equal(await page.locator('.filtered-out').count(),0);
  await page.locator('#study-ravfm').hover();await page.waitForFunction(()=>document.querySelector('[data-connection="ravfm"]').classList.contains('highlight'));
  checks.push('Four chronological thumbnail nodes, meaningful force/AI filters and highlighted navigation connections');
  await open(page,'ravfm');assert.match(await page.locator('#dialog-title').innerText(),/bird/);await images(page);await close(page);
  assert.equal(await page.evaluate(()=>document.activeElement.id),'study-ravfm');
  for(const [key,duration]of[['stco',4.8],['deforming',4],['vato',6]]){
   await open(page,key);await page.waitForFunction(d=>Math.abs(document.querySelector('#research-video').duration-d)<.05,duration);
   await page.waitForFunction(()=>!document.querySelector('#research-video').paused&&document.querySelector('#research-video').currentTime>.05);
   await page.locator('#video-play').click();assert.equal(await page.locator('#research-video').evaluate(v=>v.paused),true);
   await page.locator('#media-position').fill('500');await page.waitForFunction(d=>Math.abs(document.querySelector('#research-video').currentTime-d/2)<.03,duration);
   if(key==='vato'){
    await page.locator('#sweep-select').selectOption('incidence');await page.waitForFunction(()=>Math.abs(document.querySelector('#research-video').duration-8.4)<.05);
    assert.equal(await page.locator('#research-video').evaluate(v=>v.paused),true);await page.locator('#media-position').fill('550');assert.match(await page.locator('#position-label').innerText(),/9°/);
    await page.locator('#sweep-select').selectOption('vato');await page.waitForFunction(()=>Math.abs(document.querySelector('#research-video').duration-6)<.05);
    assert.equal(await page.locator('#research-video').evaluate(v=>v.paused),true);
   }
   await page.locator('#media-expand').click();await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('.research-screen').classList.contains('expanded'));
   await page.locator('#media-expand').click();await page.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('.research-screen').classList.contains('expanded'));
   await page.locator('#video-play').click();await page.waitForFunction(()=>!document.querySelector('#research-video').paused);
   const handle=await page.locator('#research-video').elementHandle();await page.locator('[data-view="figures"]').click();assert.equal(await handle.evaluate(v=>v.paused),true);
   await images(page);await close(page);
  }
  checks.push('All four original MP4s decode; play, pause, seek, VATO sweep selection and fullscreen work; switching views stops hidden media');
  await open(page,'vato');await page.locator('.study-switcher a[href="#study-stco"]').click();await page.waitForFunction(()=>document.querySelector('#dialog-title').textContent.includes('Different futures'));
  await page.goBack();await page.waitForFunction(()=>document.querySelector('#dialog-title').textContent.includes('Teach AI'));
  await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog').open);
  await page.goto(url+'#study-deforming');await page.waitForFunction(()=>document.querySelector('dialog').open&&document.querySelector('#dialog-title').textContent.includes('thrust'));await close(page);
  checks.push('Direct study links, workspace study switching, browser Back, Escape and focus return work');
  await page.locator('[data-route="people"]').click();await page.waitForSelector('.principal');
  assert.equal(await page.locator('.principal,.person').count(),6);assert.equal(await page.locator('#people img').count(),3);
  for(const name of ['Juan Li','Xingxin Yang','Vedang Joshi','Matteo Liguori','Yichen Li','Zhan Zhang'])assert.ok((await page.locator('#people').innerText()).includes(name));
  for(const i of await page.locator('#people img').all()){await i.scrollIntoViewIfNeeded();await i.evaluate(e=>e.decode());}
  await page.locator('#dialog-content').evaluate(e=>e.scrollTop=0);await page.screenshot({path:path.join(root,'qa/atlas-people-desktop.png')});await close(page);
  await page.locator('[data-route="publications"]').click();await page.waitForSelector('#kcl-outputs');assert.equal(await page.locator('#kcl-outputs>a').count(),5);
  assert.match(await page.locator('#kcl-outputs').innerText(),/Accepted \/ in press/);
  await page.locator('.preprint-archive summary').click();assert.equal(await page.locator('#preprint-outputs>a').count(),4);await close(page);
  await page.locator('.header-contact').click();await page.waitForSelector('.contact-details');assert.equal(await page.locator('.contact-details a[href="mailto:juan.li@kcl.ac.uk"]').count(),1);await close(page);
  await page.locator('#credits-open').click();assert.match(await page.locator('#dialog-content').innerText(),/CC BY-NC-ND 4.0/);await close(page);
  checks.push('Dedicated People, Outputs, Contact and source panels preserve six researchers, three official portraits, five KCL outputs and four preprints');
  await page.mouse.move(800,80);await page.screenshot({path:path.join(root,'qa/atlas-desktop.png')});
  await open(page,'vato');await page.locator('#video-play').click();await page.screenshot({path:path.join(root,'qa/atlas-study-desktop.png')});await close(page);

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});watch(mobile);
  await mobile.goto(url);await mobile.evaluate(()=>document.fonts.ready);
  assert.equal(await mobile.locator('#motion-toggle').getAttribute('aria-pressed'),'true');
  for(const [width,height]of[[320,667],[390,750],[390,844],[768,844],[1024,768],[1440,900]]){
   await mobile.setViewportSize({width,height});await mobile.waitForTimeout(100);
   const layout=await mobile.evaluate(()=>{
    const rect=s=>document.querySelector(s).getBoundingClientRect();const nodes=[...document.querySelectorAll('.research-node')].map(e=>e.getBoundingClientRect());
    const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
    return {fits:document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight,nodesFit:nodes.every(r=>r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight),overlap:nodes.some((n,i)=>nodes.some((m,j)=>i<j&&overlap(n,m))),guideOverlap:overlap(rect('.atlas-intro'),rect('.atlas-guide')),footerOverlap:nodes.some(n=>overlap(n,rect('.field-footer')))};
   });
   assert.equal(layout.fits,true,`Field fits ${width}`);assert.equal(layout.nodesFit,true,`Nodes fit ${width}`);assert.equal(layout.overlap,false,`Nodes overlap ${width}`);assert.equal(layout.guideOverlap,false,`Title/filter overlap ${width}`);assert.equal(layout.footerOverlap,false,`Node/footer overlap ${width}`);
   await open(mobile,'vato');await mobile.waitForSelector('#research-video');assert.equal(await mobile.locator('#research-video').evaluate(v=>v.paused),true);
   assert.equal(await mobile.locator('#dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth),true,`Workspace overflow ${width}`);await close(mobile);
  }
  await mobile.setViewportSize({width:390,height:844});await mobile.screenshot({path:path.join(root,'qa/atlas-mobile.png')});
  await open(mobile,'vato');await mobile.screenshot({path:path.join(root,'qa/atlas-study-mobile.png')});await close(mobile);
  await mobile.locator('[data-route="people"]').click();await mobile.waitForSelector('.principal');assert.equal(await mobile.locator('#dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await close(mobile);
  checks.push('320/390/768/1024/1440px layouts fit the viewport with no overlapping nodes or controls; mobile study media appears first; reduced motion pauses animation');
  const plain=await browser.newPage({javaScriptEnabled:false});watch(plain);await plain.goto(url);assert.equal(await plain.locator('.no-script a').count(),6);assert.equal(await plain.locator('h1').isVisible(),true);
  checks.push('Without JavaScript: static field and thumbnails remain visible, with direct research and profile links');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={status:'passed',url,checks,errors,failed};fs.writeFileSync(path.join(root,'qa/report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
