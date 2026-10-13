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
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400 && r.url().startsWith(url)) failed.push(`${r.status()} ${r.url()}`); });
    assert.equal((await page.goto(url)).status(), 200);
    await page.waitForFunction(() => !document.querySelector('video').paused && document.querySelector('video').currentTime > .1);
    assert.match(await page.title(), /Flow\. Force\. Intelligence\./);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('#video-play').click();
    await page.locator('#media-position').fill('350');
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime / document.querySelector('video').duration - .35) < .02);
    await page.screenshot({ path: path.join(root, 'qa/home-desktop.png') });
    checks.push('Desktop: autoplay, pause, phase seeking, correct title, no overflow');

    const variants = [ ['vato', 6, /direct prediction/], ['stco', 4.8, /independently queried/], ['deforming', 4, /one cycle/] ];
    for (const [id, duration, caption] of variants) {
      await page.locator(`#tab-${id}`).click();
      await page.waitForFunction(expected => Math.abs(document.querySelector('video').duration - expected) < .05 && document.querySelector('video').readyState >= 2, duration);
      assert.equal(await page.locator('video').evaluate(v => v.paused), true);
      assert.match(await page.locator('#media-caption').innerText(), caption);
      await page.locator('#video-play').click();
      await page.waitForFunction(() => !document.querySelector('video').paused && document.querySelector('video').currentTime > .1);
      await page.locator('#video-play').click();
      if (id !== 'deforming') await page.locator('#showcase').screenshot({ path: path.join(root, `qa/showcase-${id}.png`) });
    }
    await page.locator('#tab-vato').click();
    await page.locator('#sweep-select').selectOption('incidence');
    await page.waitForFunction(() => Math.abs(document.querySelector('video').duration - 8.4) < .05);
    await page.locator('#media-position').fill('550');
    await page.waitForFunction(() => Math.abs(document.querySelector('video').currentTime / document.querySelector('video').duration - .55) < .02);
    assert.match(await page.locator('#position-label').innerText(), /9°/);
    await page.locator('#tab-vato').focus();
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.locator('#tab-stco').getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End');
    assert.equal(await page.locator('#flight-figures').isVisible(), true);
    assert.equal(await page.locator('#playback').isVisible(), false);
    assert.equal(await page.locator('video').evaluate(v => v.paused), true);
    checks.push('All four videos decode and play; pause persists across source switches; sweep selection, seeking and keyboard tabs work; still-figure view pauses video');

    await page.locator('#media-expand').click();
    await page.waitForFunction(() => !!document.fullscreenElement || document.querySelector('.research-screen').classList.contains('expanded'));
    assert.equal(await page.evaluate(() => !!document.fullscreenElement || document.querySelector('.research-screen').classList.contains('expanded')), true);
    await page.locator('#media-expand').click();
    await page.waitForFunction(() => !document.fullscreenElement && !document.querySelector('.research-screen').classList.contains('expanded'));
    assert.equal(await page.evaluate(() => !!document.fullscreenElement || document.querySelector('.research-screen').classList.contains('expanded')), false);
    checks.push('Enlarged visualization opens and closes');
    for (const id of ['deforming', 'vato', 'stco', 'ravfm']) {
      await page.locator(`[data-project="${id}"]`).first().click();
      assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
      assert.ok((await page.locator('#dialog-title').innerText()).length > 20);
      for (const summary of await page.locator('dialog summary').all()) await summary.click();
      await page.locator('dialog').evaluate(d => d.scrollTop = d.scrollHeight);
      await page.waitForFunction(() => [...document.querySelectorAll('dialog img')].every(i => i.complete && i.naturalWidth > 0));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('dialog').evaluate(d => d.open), false);
    }
    await page.locator('[data-watch="stco"]').click();
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.locator('#credits-open').click();
    assert.match(await page.locator('#dialog-content').innerText(), /CC BY-NC-ND 4.0/);
    assert.equal(await page.locator('video').evaluate(v => v.paused), true);
    await page.locator('.dialog-close').click();
    checks.push('Four project dialogs, detail figures, Watch navigation, keyboard dismissal and scientific credits work');
    await page.locator('#tab-deforming').click();
    await page.locator('#showcase').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => !document.querySelector('video').paused);
    await page.locator('#lab').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('video').paused);
    checks.push('Offscreen animation automatically pauses');
    await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 600) { scrollTo(0,y); await new Promise(r => setTimeout(r,50)); } });
    await page.waitForFunction(() => [...document.querySelectorAll('.project img')].every(i => i.complete && i.naturalWidth > 0));
    await page.evaluate(() => scrollTo(0,0));
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(root, 'qa/full-desktop.png'), fullPage: true });

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    mobile.on('pageerror', e => errors.push(e.message));
    await mobile.goto(url);
    await mobile.waitForTimeout(300);
    assert.equal(await mobile.locator('video').evaluate(v => v.paused && v.currentTime === 0), true);
    await mobile.locator('.menu-toggle').click();
    assert.equal(await mobile.locator('#navigation').isVisible(), true);
    await mobile.locator('#navigation a[href="#research"]').click();
    assert.equal(await mobile.locator('.menu-toggle').getAttribute('aria-expanded'), 'false');
    for (const width of [390, 320]) {
      await mobile.setViewportSize({ width, height: 844 });
      for (const id of ['deforming', 'vato', 'stco', 'ravfm']) {
        await mobile.locator(`#tab-${id}`).click();
        assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Overflow: ${width}px ${id}`);
      }
    }
    await mobile.setViewportSize({ width: 390, height: 844 });
    await mobile.locator('#tab-deforming').click();
    await mobile.evaluate(() => scrollTo(0,0));
    await mobile.screenshot({ path: path.join(root, 'qa/home-mobile.png') });
    await mobile.screenshot({ path: path.join(root, 'qa/full-mobile.png'), fullPage: true });
    checks.push('Mobile: 390px and 320px with every project, no overflow, reduced-motion default, menu navigation');
    const plain = await browser.newPage({ javaScriptEnabled: false });
    await plain.goto(url);
    assert.equal(await plain.locator('h1').isVisible(), true);
    assert.equal(await plain.locator('video').evaluate(v => v.controls), true);
    assert.equal(await plain.locator('.project').count(), 4);
    checks.push('Without JavaScript: four project summaries, source links and native video controls remain available');
    assert.deepEqual(errors, []); assert.deepEqual(failed, []);
    checks.push('No browser script errors or failing local resource responses');
    const report = { status: 'passed', url, checks, errors, failed };
    fs.writeFileSync(path.join(root, 'qa/report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
