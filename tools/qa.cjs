const { chromium } = require('./browser/node_modules/playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const url = process.env.PREVIEW_URL || 'http://127.0.0.1:8769/';
const executablePath = process.env.CHROMIUM_PATH || chromium.executablePath();
(async () => {
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
  const errors = [], failed = [], checks = [];
  fs.mkdirSync(path.join(root, 'qa'), { recursive: true });
  const watch = page => {
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(url)) failed.push(`${r.status()} ${r.url()}`); });
  };
  const revealAll = async page => {
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 550) { scrollTo(0,y); await new Promise(r => setTimeout(r,80)); } });
    await page.waitForFunction(() => [...document.querySelectorAll('main img')].every(i => i.complete && i.naturalWidth > 0));
    await page.evaluate(() => scrollTo(0,0));
    await page.waitForTimeout(900);
  };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }); watch(page);
    assert.equal((await page.goto(url)).status(), 200);
    assert.match(await page.title(), /Uncover the forces of flow/);
    await page.waitForFunction(() => document.fonts.check('16px Space') && document.fonts.check('16px Manrope'));
    await page.waitForTimeout(500);
    const canvasFrame = () => page.locator('#flow-canvas').evaluate(c => c.toDataURL());
    const first = await canvasFrame(); await page.waitForTimeout(150);
    assert.notEqual(await canvasFrame(), first);
    await page.locator('#motion-toggle').click(); await page.waitForTimeout(80);
    const stopped = await canvasFrame(); await page.waitForTimeout(150);
    assert.equal(await canvasFrame(), stopped);
    assert.equal(await page.locator('#motion-toggle').getAttribute('aria-pressed'), 'true');
    await page.locator('#field-info').click();
    assert.match(await page.locator('#dialog-content').innerText(), /passive tracers in this frozen velocity field/);
    await page.keyboard.press('Escape');
    await page.screenshot({ path: path.join(root, 'qa/redesign-home-desktop.png') });
    checks.push('Hero: real-field tracers animate and pause, frozen-field explanation, self-hosted fonts load');
    assert.deepEqual(await page.locator('[data-study]').evaluateAll(sections => sections.map(s => s.dataset.study)), ['ravfm','stco','deforming','vato']);
    assert.deepEqual(await page.locator('[data-study]').evaluateAll(sections => sections.map(s => s.dataset.date)), ['2026-03-13','2026-08-20','2026-08-31','2026-09-01']);
    await page.locator('a[href="#research"]').first().click();
    assert.equal(await page.locator('#research').getAttribute('data-study'), 'ravfm');
    await page.locator('#research').screenshot({path:path.join(root,'qa/research-first.png')});
    checks.push('Research starts with Matteo’s RA-VFM; four chapters follow first arXiv submission dates');

    await page.locator('#stco-video').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#stco-video').paused && document.querySelector('#stco-video').currentTime > .1);
    assert.ok(Math.abs(await page.locator('#stco-video').evaluate(v => v.duration) - 4.8) < .05);
    await page.locator('#stco-play').click();
    await page.locator('#stco-position').fill('500');
    await page.waitForFunction(() => Math.abs(document.querySelector('#stco-video').currentTime - 2.4) < .05);
    assert.equal(await page.locator('#stco-video').evaluate(v => v.paused), true);
    await page.locator('#stco-play').click();
    await page.waitForFunction(() => !document.querySelector('#stco-video').paused);
    await page.locator('#stco-expand').click();
    await page.waitForFunction(() => document.fullscreenElement?.id === 'stco-screen' || document.querySelector('#stco-screen').classList.contains('expanded'));
    await page.locator('#stco-expand').click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('#stco-screen').classList.contains('expanded'));
    await page.locator('#stco-play').click();
    checks.push('Independent STCO player decodes, plays, pauses, seeks and enters/exits fullscreen');

    await page.locator('#swimming-video').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('#swimming-video').paused && document.querySelector('#swimming-video').currentTime > .1);
    assert.ok(Math.abs(await page.locator('#swimming-video').evaluate(v => v.duration) - 4) < .05);
    await page.locator('.film-pause').click();
    assert.equal(await page.locator('#swimming-video').evaluate(v => v.paused), true);
    await page.locator('.film-pause').click();
    await page.waitForFunction(() => !document.querySelector('#swimming-video').paused);
    await page.locator('#research-screen').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#swimming-video').paused && !document.querySelector('#research-video').paused);
    await page.locator('#video-play').click();
    checks.push('Swimming cycle decodes and plays; user pause/play and offscreen pause work');

    assert.ok(Math.abs(await page.locator('#research-video').evaluate(v => v.duration) - 6) < .05);
    await page.locator('#sweep-select').selectOption('incidence');
    await page.waitForFunction(() => Math.abs(document.querySelector('#research-video').duration - 8.4) < .05);
    assert.equal(await page.locator('#research-video').evaluate(v => v.paused), true);
    await page.locator('#media-position').fill('550');
    await page.waitForFunction(() => Math.abs(document.querySelector('#research-video').currentTime / document.querySelector('#research-video').duration - .55) < .02);
    assert.match(await page.locator('#position-label').innerText(), /9°/);
    await page.locator('#video-play').click();
    await page.waitForFunction(() => !document.querySelector('#research-video').paused);
    await page.locator('#video-play').click();
    await page.locator('#sweep-select').selectOption('leadtime');
    await page.waitForFunction(() => Math.abs(document.querySelector('#research-video').duration - 6) < .05);
    assert.equal(await page.locator('#research-video').evaluate(v => v.paused), true);
    checks.push('VATO lead-time/incidence media decode; sweep changes preserve user pause, labels and seeking work');

    await page.locator('#media-expand').click();
    await page.waitForFunction(() => !!document.fullscreenElement || document.querySelector('#research-screen').classList.contains('expanded'));
    await page.locator('#media-expand').click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('#research-screen').classList.contains('expanded'));
    checks.push('Fullscreen opens and closes');
    for (const id of ['deforming', 'vato', 'stco', 'ravfm']) {
      await page.locator(`[data-project="${id}"]`).first().click();
      assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
      for (const summary of await page.locator('dialog summary').all()) await summary.click();
      for (const img of await page.locator('dialog img').all()) await img.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => [...document.querySelectorAll('dialog img')].every(i => i.complete && i.naturalWidth > 0));
      if (id !== 'ravfm') {
        assert.equal(await page.locator('dialog video').evaluate(v => v.controls), true);
        await page.locator('dialog video').evaluate(v => v.play());
        await page.waitForFunction(() => !document.querySelector('dialog video').paused);
      }
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').evaluate(d => d.open), false);
      if (id !== 'ravfm') await page.waitForFunction(() => document.querySelector('dialog video').paused);
    }
    await page.locator('#credits-open').click();
    assert.match(await page.locator('#dialog-content').innerText(), /CC BY-NC-ND 4.0/);
    assert.match(await page.locator('#dialog-content').innerText(), /official King’s College London/);
    await page.locator('.dialog-close').click();
    checks.push('Four study dialogs, all scientific figures, native detail videos, keyboard dismissal and credits work');
    await page.locator('#people').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('.principal, .person').count(), 6);
    for (const name of ['Juan Li','Xingxin Yang','Vedang Joshi','Matteo Liguori','Yichen Li','Zhan Zhang']) assert.ok((await page.locator('#people').innerText()).includes(name));
    assert.equal(await page.locator('#people img').count(), 3);
    for (const img of await page.locator('#people img').all()) { await img.scrollIntoViewIfNeeded(); await img.evaluate(i => i.decode()); }
    assert.equal(await page.locator('#people a[href^="https:"][href*="kcl.ac.uk"]').count(), 4);
    checks.push('Six requested people, three official portraits and four institutional profile links');
    await page.locator('#publications').scrollIntoViewIfNeeded();
    assert.equal(await page.locator('#kcl-outputs>a').count(), 5);
    assert.equal(await page.locator('#kcl-outputs>a[href^="https://kclpure.kcl.ac.uk/portal/en/publications/"]').count(), 5);
    assert.deepEqual(await page.locator('#kcl-outputs .pub-type').evaluateAll(nodes => nodes.map(n => n.firstChild.textContent)), ['2022','2023','2024','2024','2026']);
    assert.match(await page.locator('#kcl-outputs').innerText(), /Accepted \/ in press/);
    for (const row of await page.locator('#kcl-outputs>a').all()) await row.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await page.locator('#publications').screenshot({path:path.join(root,'qa/research-outputs.png')});
    await page.locator('.preprint-archive summary').click();
    assert.equal(await page.locator('#preprint-outputs>a').count(), 4);
    assert.equal(await page.locator('#preprint-outputs').isVisible(), true);
    for (const id of ['2603.13078','2608.20477','2609.00461','2609.00507']) assert.equal(await page.locator(`#preprint-outputs a[href="https://arxiv.org/abs/${id}"]`).count(), 1);
    await page.locator('.preprint-archive summary').click();
    checks.push('Five sourced KCL outputs in year order, distinct in-press status, expandable four-preprint archive with correct arXiv links');
    await revealAll(page);
    await page.screenshot({ path: path.join(root, 'qa/redesign-full-desktop.png'), fullPage: true });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' }); watch(mobile);
    await mobile.goto(url); await mobile.waitForTimeout(400);
    assert.equal(await mobile.locator('#motion-toggle').getAttribute('aria-pressed'), 'true');
    assert.equal(await mobile.locator('#swimming-video').evaluate(v => v.paused && v.currentTime === 0), true);
    await mobile.locator('.menu-toggle').click();
    assert.equal(await mobile.locator('#navigation').isVisible(), true);
    await mobile.locator('#navigation a[href="#people"]').click();
    assert.equal(await mobile.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    for (const width of [390,320,768,1024]) {
      await mobile.setViewportSize({width,height:844});
      for (const id of ['research','stco','deforming','vato','publications']) {
        await mobile.locator(`#${id}`).scrollIntoViewIfNeeded();
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px: ${id}`);
      }
      assert.equal(await mobile.locator('#research-video').evaluate(v => v.paused), true);
      assert.equal(await mobile.locator('#stco-video').evaluate(v => v.paused), true);
      await mobile.locator('.preprint-archive summary').click();
      assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await mobile.locator('.preprint-archive summary').click();
    }
    await mobile.setViewportSize({width:390,height:844});
    await revealAll(mobile);
    await mobile.screenshot({path:path.join(root,'qa/redesign-home-mobile.png')});
    await mobile.screenshot({path:path.join(root,'qa/redesign-full-mobile.png'),fullPage:true});
    checks.push('320/390/768/1024px layouts: no horizontal overflow; reduced-motion defaults and mobile People navigation work');
    const plain = await browser.newPage({javaScriptEnabled:false}); watch(plain);
    await plain.goto(url);
    assert.equal(await plain.locator('h1').isVisible(), true);
    assert.equal(await plain.locator('#research-video').evaluate(v => v.controls), true);
    assert.equal(await plain.locator('.principal, .person').count(), 6);
    assert.equal(await plain.locator('#stco-video').evaluate(v => v.controls), true);
    assert.equal(await plain.locator('.publication-list>a').count(), 9);
    checks.push('Without JavaScript: team, research summaries, nine output links and native videos remain available');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    checks.push('No browser script errors or failing same-origin resources');
    const report = {status:'passed',url,checks,errors,failed};
    fs.writeFileSync(path.join(root,'qa/report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
