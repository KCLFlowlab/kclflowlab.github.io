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

    for (const [id, duration, caption] of [['vato',6,/Direct predictions/], ['stco',4.8,/independently queried/]]) {
      await page.locator(`#tab-${id}`).click();
      await page.waitForFunction(expected => Math.abs(document.querySelector('#research-video').duration - expected) < .05 && document.querySelector('#research-video').readyState >= 2, duration);
      assert.equal(await page.locator('#research-video').evaluate(v => v.paused), true);
      assert.match(await page.locator('#media-caption').innerText(), caption);
      await page.locator('#media-position').fill('500');
      await page.waitForFunction(() => Math.abs(document.querySelector('#research-video').currentTime / document.querySelector('#research-video').duration - .5) < .02);
      await page.locator('#video-play').click();
      await page.waitForFunction(() => !document.querySelector('#research-video').paused);
      await page.locator('#video-play').click();
      await page.locator('#operator-details').click();
      assert.match(await page.locator('#dialog-title').innerText(), id === 'vato' ? /VATO/ : /STCO/);
      await page.keyboard.press('Escape');
    }
    await page.locator('#tab-vato').click();
    await page.locator('#sweep-select').selectOption('incidence');
    await page.waitForFunction(() => Math.abs(document.querySelector('#research-video').duration - 8.4) < .05);
    await page.locator('#media-position').fill('550');
    await page.waitForFunction(() => Math.abs(document.querySelector('#research-video').currentTime / document.querySelector('#research-video').duration - .55) < .02);
    assert.match(await page.locator('#position-label').innerText(), /9°/);
    await page.locator('#video-play').click();
    await page.waitForFunction(() => !document.querySelector('#research-video').paused);
    await page.locator('#video-play').click();
    await page.locator('#tab-vato').focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-stco').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#tab-vato').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#tab-stco').getAttribute('aria-selected'), 'true');
    checks.push('All four videos decode/play; operator switches preserve pause; seeking, incidence labels, keyboard tabs and dynamic study button work');

    await page.locator('#media-expand').click();
    await page.waitForFunction(() => !!document.fullscreenElement || document.querySelector('#research-screen').classList.contains('expanded'));
    await page.locator('#media-expand').click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('#research-screen').classList.contains('expanded'));
    checks.push('Fullscreen opens and closes');
    for (const id of ['deforming', 'vato', 'stco', 'ravfm']) {
      if (id === 'vato' || id === 'stco') await page.locator(`#tab-${id}`).click();
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
      for (const id of ['vato','stco']) {
        await mobile.locator(`#tab-${id}`).click();
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow at ${width}px`);
        assert.equal(await mobile.locator('#research-video').evaluate(v => v.paused), true);
      }
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
    assert.equal(await plain.locator('.publication-list>a').count(), 4);
    checks.push('Without JavaScript: team, research summaries, four paper links and native operator video remain available');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    checks.push('No browser script errors or failing same-origin resources');
    const report = {status:'passed',url,checks,errors,failed};
    fs.writeFileSync(path.join(root,'qa/report.json'),JSON.stringify(report,null,2));
    console.log(JSON.stringify(report,null,2));
  } finally {await browser.close();}
})().catch(error => {console.error(error);process.exitCode=1;});
