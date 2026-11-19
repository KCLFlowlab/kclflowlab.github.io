// Content, navigation and layout QA for the scrolling research page and its study workspace.
const {chromium}=require('./browser/node_modules/playwright-core');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const url=process.env.PREVIEW_URL||'http://127.0.0.1:8769/';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||chromium.executablePath(),headless:true,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 const errors=[],failed=[],checks=[];
 const note=m=>{checks.push(m);console.log('PASS: '+m);};
 const watch=p=>{p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400&&r.url().startsWith(url))failed.push(`${r.status()} ${r.url()}`);});};
 const close=async p=>{await p.locator('.dialog-close').click();await p.waitForFunction(()=>!document.querySelector('dialog').open);};
 const open=async(p,key)=>{await p.evaluate(k=>{location.hash='study-'+k;},key);await p.waitForFunction(k=>document.querySelector('dialog').open&&document.querySelector('.study-switcher [aria-current]')?.getAttribute('href')==='#study-'+k,key);};
 const images=async p=>{for(const s of await p.locator('.figure-gallery summary').all())await s.click();for(const i of await p.locator('.figure-gallery img').all()){await i.scrollIntoViewIfNeeded();await i.evaluate(e=>e.decode());}};
 const shot=(p,f)=>p.screenshot({path:path.join(root,'qa/'+f+'.png')});
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:900}});watch(page);
  assert.equal((await page.goto(url)).status(),200);await page.evaluate(()=>document.fonts.ready);
  assert.match(await page.title(),/Bio-inspired engineering/);
  assert.deepEqual(await page.locator('.site-nav a').allTextContents(),['Research','Publications','Team','Contact']);
  assert.deepEqual(await page.locator('main > section').evaluateAll(s=>s.map(e=>e.id)),['intro','vision','research','publications','team','contact']);
  assert.equal(await page.locator('.wordmark .lab-mark').getAttribute('src'),'assets/kclflowlab-logo.png');assert.equal(await page.locator('.wordmark .kcl-mark').getAttribute('src'),'assets/kcl-logo.svg');
  note('One scrolling page: swimmer, introduction, vision, research (studies + directions), publications, team, contact');

  await page.locator('.pillar[data-domain-link="physics"]').click();await page.waitForFunction(()=>document.querySelector('#domain-physics').getAttribute('aria-selected')==='true');
  assert.equal(new URL(page.url()).hash,'#domain-physics');
  await page.locator('[data-topic="aeroelasticity"]').click();assert.equal(await page.locator('.direction-record').count(),1);assert.match(await page.locator('.direction-record').innerText(),/Slender Wings/);
  await page.locator('#domain-physics').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#domain-ai').getAttribute('aria-selected'),'true');assert.equal(await page.evaluate(()=>document.activeElement.id),'domain-ai');
  await page.locator('[data-topic="observations"]').click();assert.match(await page.locator('.direction-record').innerText(),/Flow completion/);
  await page.locator('[data-topic="design"]').click();assert.match(await page.locator('.direction-record').innerText(),/PEMFC/);assert.equal(await page.locator('#direction-results a[href="https://www.kcl.ac.uk/people/xingxin-yang"]').count(),1);
  await page.locator('#domain-bio').click();assert.equal(await page.locator('.direction-study').count(),2);
  await page.locator('[data-topic="collective"]').click();assert.match(await page.locator('#direction-results').innerText(),/research interest/i);assert.equal(await page.locator('.direction-study').count(),0);
  assert.equal(await page.locator('#direction-results a[href="https://www.kcl.ac.uk/people/vedang-joshi"]').count(),1);
  await page.locator('[data-topic="swimming"]').click();await page.locator('.direction-study').click();await page.waitForSelector('#research-video');await close(page);
  assert.equal(new URL(page.url()).hash,'#domain-bio');assert.equal(await page.evaluate(()=>document.activeElement.className),'direction-study');
  assert.equal(await page.locator('[data-topic="swimming"]').getAttribute('aria-pressed'),'true');
  await shot(page,'research-desktop');
  note('Three direction tabs (arrow-key navigable) and nine topic branches link studies, earlier outputs and labelled interests; closing a study restores the topic and focus');

  assert.deepEqual(await page.locator('.study-card').evaluateAll(es=>es.map(e=>e.dataset.project)),['ravfm','stco','deforming','vato']);
  assert.deepEqual(await page.locator('.study-card').evaluateAll(es=>es.map(e=>e.dataset.date)),['2026-03-13','2026-08-20','2026-08-31','2026-09-01']);
  await page.locator('#study-ravfm').click();await page.waitForSelector('.study-switcher');assert.match(await page.locator('.paper-title').innerText(),/Reynolds-Averaged Vortex Force Map/);await images(page);await close(page);
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
   }
   await page.locator('#media-expand').click();await page.waitForFunction(()=>!!document.fullscreenElement||document.querySelector('.research-screen').classList.contains('expanded'));
   await page.locator('#media-expand').click();await page.waitForFunction(()=>!document.fullscreenElement&&!document.querySelector('.research-screen').classList.contains('expanded'));
   await page.locator('#video-play').click();await page.waitForFunction(()=>!document.querySelector('#research-video').paused);
   const handle=await page.locator('#research-video').elementHandle();await page.locator('[data-view="figures"]').click();assert.equal(await handle.evaluate(v=>v.paused),true);
   await images(page);if(key==='vato')await shot(page,'study-desktop');await close(page);
  }
  note('Four studies in first-preprint order open a workspace with the paper title; all MP4s decode, play, pause, seek and enlarge; VATO sweeps switch; hidden media stop');

  assert.equal(await page.locator('#kcl-outputs>a').count(),5);assert.match(await page.locator('#kcl-outputs').innerText(),/Accepted \/ in press/);
  await page.locator('.preprint-archive summary').click();assert.equal(await page.locator('#preprint-outputs>a').count(),4);
  assert.equal(await page.locator('.principal,.person').count(),6);assert.equal(await page.locator('#team img').count(),3);
  assert.deepEqual(await page.locator('.person h3').allTextContents(),['Yichen Li','Matteo Liguori','Vedang Joshi','Xingxin Yang','Zhan Zhang']);
  assert.equal(await page.locator('#contact a[href="mailto:juan.li@kcl.ac.uk"]').count(),2);
  await page.locator('#field-info-footer').click();assert.match(await page.locator('#dialog-content').innerText(),/not a CFD simulation/);
  await page.locator('[data-open-credits]').click();assert.match(await page.locator('#dialog-content').innerText(),/CC BY-NC-ND 4.0/);assert.equal(await page.locator('#workspace-label').textContent(),'Sources');await close(page);
  await page.locator('#credits-open').click();assert.match(await page.locator('#dialog-content').innerText(),/Space Grotesk/);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog').open);
  note('Publication records and statuses, six people in the requested order, contact, About the visual and Sources retained');

  await page.goto('about:blank');await page.goto(url+'#study-vato');await page.waitForFunction(()=>document.querySelector('dialog').open);await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog').open);
  assert.equal(new URL(page.url()).hash,'');
  await page.goto(url+'#domain-ai');await page.waitForFunction(()=>document.querySelector('#domain-ai').getAttribute('aria-selected')==='true');
  note('Deep links to a study or a direction work; Escape closes a study and clears its link');

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});watch(mobile);
  await mobile.goto(url);await mobile.evaluate(()=>document.fonts.ready);
  await mobile.locator('.menu-toggle').click();await mobile.locator('.site-nav a[href="#team"]').click();await mobile.waitForFunction(()=>Math.abs(document.querySelector('#team').getBoundingClientRect().top)<80);
  assert.equal(await mobile.locator('.menu-toggle').getAttribute('aria-expanded'),'false');
  for(const [width,height]of[[320,667],[390,844],[768,1024],[1024,768],[1366,768],[1440,900]]){
   await mobile.setViewportSize({width,height});await mobile.waitForTimeout(150);
   assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`horizontal overflow at ${width}`);
   await open(mobile,'vato');assert.equal(await mobile.locator('#dialog-content').evaluate(e=>e.scrollWidth<=e.clientWidth),true,`workspace overflow ${width}`);
   assert.equal(await mobile.locator('#research-video').evaluate(v=>v.paused),true);await close(mobile);
  }
  await mobile.setViewportSize({width:390,height:844});await mobile.evaluate(()=>scrollTo(0,0));await mobile.waitForTimeout(200);await shot(mobile,'home-mobile');
  note('320–1440 px layouts have no horizontal overflow; the mobile menu works; reduced motion keeps research videos paused');

  const plain=await browser.newPage({javaScriptEnabled:false});watch(plain);await plain.goto(url);
  assert.equal(await plain.locator('h1').isVisible(),true);assert.equal(await plain.locator('.hero-fallback').isVisible(),true);
  assert.equal(await plain.locator('#kcl-outputs>a').count(),5);assert.equal(await plain.locator('.no-script a').count(),4);
  note('Without JavaScript the full text, publication list, static scientific backdrop and direct paper/code links remain');
  assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
  const report={status:'passed',url,checks,errors,failed};fs.writeFileSync(path.join(root,'qa/report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
