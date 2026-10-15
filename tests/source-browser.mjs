import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {AUTO_KEY} from '../src/storage.js';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); }
catch { throw Error('Source browser checks need optional Playwright tooling from the development environment.'); }
const origin = 'http://127.0.0.1:8012';
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: new URL('..', import.meta.url), env: {...process.env, PORT: '8012'}, stdio: ['ignore', 'pipe', 'pipe']
});
let browser;
const errors = [];
const externalRequests = [];
const command = async (page, input) => {
  await page.locator('#command').fill(input);
  await page.locator('#command').press('Enter');
};
const savedState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTO_KEY);
const progress = state => {
  const {turns, ...rest} = state;
  return rest;
};
const selectedSource = page => page.locator('.source-choice[aria-pressed="true"]').getAttribute('data-source-id');
const scanLoaded = page => page.locator('.source-facsimile img').evaluate(image => new Promise(resolve => {
  if (image.complete && image.naturalWidth > 0) return resolve(image.naturalWidth);
  image.addEventListener('load', () => resolve(image.naturalWidth), {once: true});
  image.addEventListener('error', () => resolve(0), {once: true});
}));

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Source test server did not start')), 10000);
    server.stdout.once('data', () => {clearTimeout(timer); resolve();});
    server.once('error', error => {clearTimeout(timer); reject(error);});
    server.once('exit', code => {clearTimeout(timer); reject(Error('Source test server exited ' + code));});
  });
  const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1366, height: 768}});
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== origin) externalRequests.push(request.url());
  });
  await page.goto(origin + '/');
  await page.locator('#command').waitFor();
  await command(page, 'TALK TO NOOKOMIS');
  await command(page, 'TAKE LIST');
  const before = await savedState(page);

  await page.locator('#source-open').click();
  const dialog = page.locator('.source-dialog');
  assert.equal(await dialog.isVisible(), true);
  assert.equal(await dialog.evaluate(node => node.tagName === 'DIALOG' && node.matches(':modal')), true);
  assert.equal(await selectedSource(page), 'treaty1855');
  assert.ok(await scanLoaded(page) > 800, 'Treaty facsimile loads as an actual local image');
  assert.match(await page.locator('.source-facsimile img').getAttribute('src'), /1855-treaty-page-2\.png$/);
  assert.match(await page.locator('.source-scan-page').textContent(), /2 \/ 2.*p\.1166/);
  assert.equal(await page.getByRole('button', {name: 'Show next facsimile page'}).isDisabled(), true);
  await page.getByRole('button', {name: 'Show previous facsimile page'}).click();
  assert.match(await page.locator('.source-scan-page').textContent(), /1 \/ 2.*p\.1165/);
  assert.match(await page.getByRole('link', {name: 'Open full-size scan:'}).getAttribute('href'), /1855-treaty-page-1\.png$/);
  assert.ok(await scanLoaded(page) > 800);
  assert.equal(await page.getByRole('button', {name: 'Show previous facsimile page'}).isDisabled(), true);
  await page.getByRole('button', {name: 'Show next facsimile page'}).click();
  assert.match(await page.locator('.source-scan-page').textContent(), /2 \/ 2.*reserved homes/);
  assert.match(await page.getByRole('link', {name: 'Open full-size scan:'}).getAttribute('href'), /1855-treaty-page-2\.png$/);
  assert.ok(await scanLoaded(page) > 800);
  assert.match(await page.locator('.source-transcription').textContent(), /There shall be, and hereby is, reserved and set apart, a sufficient quantity of land for the permanent homes of the said Indians;/);
  assert.match(await page.locator('.source-detail').textContent(), /does not contain the full negotiations/);
  const pdfHref = await page.getByRole('link', {name: 'Open / download PDF'}).getAttribute('href');
  const pdfResponse = await page.request.get(new URL(pdfHref, origin).href);
  assert.equal(pdfResponse.status(), 200);
  assert.equal(pdfResponse.headers()['content-type'], 'application/pdf');
  assert.equal((await pdfResponse.body()).subarray(0, 5).toString('ascii'), '%PDF-');

  for (const [filter, id, date, place, caution] of [
    ['Spring', 'cass-lake-sugaring', /not recorded/i, /Cass Lake, Minnesota/, /not proof of an exact\s*1926 scene/],
    ['Fall', 'rice-harvest-photo', /Circa 1920/, /Mille Lacs, Minnesota/, /not the fictional characters/],
    ['Winter', 'ice-fishing-photo', /April 1948/, /Lake Mille Lacs, Minnesota/, /April, not winter/],
    ['Summer', 'food-drying-racks', /not recorded/i, /not recorded/i, /not a picture of people picking blueberries/]
  ]) {
    await page.locator(`[data-filter="${filter}"]`).click();
    assert.equal(await selectedSource(page), id);
    const metadata = await page.locator('.source-metadata').textContent();
    assert.match(metadata, date);
    assert.match(metadata, place);
    assert.match(await page.locator('.source-detail').textContent(), caution);
    assert.equal(await page.locator('.source-detail img').count(), 0, 'Archive photos are linked without copyrighted image embeds');
    const originalLink = page.locator('.source-link-original');
    assert.match(await originalLink.getAttribute('href'), /^https:\/\/ojibwe\.lib\.umn\.edu\/collection\//);
    assert.equal(await originalLink.getAttribute('target'), '_blank');
  }
  await page.locator('.source-choice[data-source-id="joseph-corn-survey"]').click();
  assert.match(await page.locator('.source-metadata').textContent(), /Lac du Flambeau Agency, Wisconsin/);
  assert.match(await page.locator('.source-metadata').textContent(), /May 10,\s*1922/);
  assert.equal(await page.locator('.source-detail img').count(), 0);

  // Arrow navigation changes the filter while preserving keyboard focus on its button.
  await page.locator('[data-filter="Spring"]').focus();
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-filter="Summer"]').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.evaluate(() => document.activeElement.dataset.filter), 'Summer');
  await page.keyboard.press('Home');
  assert.equal(await page.locator('[data-filter="All"]').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('[data-filter="History"]').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('End');
  assert.equal(await page.locator('[data-filter="Winter"]').getAttribute('aria-pressed'), 'true');
  await page.keyboard.press('Escape');
  assert.equal(await dialog.isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'source-open');
  assert.deepEqual(await savedState(page), before, 'Opening and browsing the shelf leaves the saved adventure unchanged');

  await command(page, 'SOURCES');
  assert.equal(await dialog.isVisible(), true);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'command');
  await command(page, 'VIEW NELSON ACT');
  assert.equal(await selectedSource(page), 'nelson1889');
  assert.ok(await scanLoaded(page) > 800);
  assert.match(await page.locator('.source-transcription').textContent(), /instead of being removed to and taking such allotment on White Earth Reservation/);
  assert.match(await page.locator('.source-detail').textContent(), /not.*proof that everyone left Leech Lake/i);
  await page.locator('.source-choice[data-source-id="restoration2020"]').click();
  assert.ok(await scanLoaded(page) > 800);
  assert.match(await page.locator('.source-metadata').textContent(), /2020-12-23/);
  assert.match(await page.locator('.source-detail').textContent(), /retrospective evidence/);
  await page.keyboard.press('Escape');
  const after = await savedState(page);
  assert.deepEqual(progress(after), progress(before), 'Source commands do not award flags or change inventory, location, journal, or objectives');
  assert.equal(after.turns, before.turns + 2);

  mkdirSync('test-results', {recursive: true});
  for (const [label, viewport] of [
    ['chromebook', {width: 1366, height: 768}],
    ['phone', {width: 390, height: 844}]
  ]) {
    await page.setViewportSize(viewport);
    await page.locator('#source-open').click();
    await page.locator('.source-choice[data-source-id="treaty1855"]').click();
    assert.ok(await scanLoaded(page) > 800);
    const layout = await page.evaluate(() => {
      const modal = document.querySelector('.source-dialog');
      const detail = modal.querySelector('.source-detail');
      const rect = modal.getBoundingClientRect();
      const closeRect = modal.querySelector('.source-close').getBoundingClientRect();
      return {
        left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        viewportWidth: innerWidth, viewportHeight: innerHeight,
        pageFits: document.documentElement.scrollWidth <= innerWidth,
        modalFits: modal.scrollWidth <= modal.clientWidth,
        detailFits: detail.scrollWidth <= detail.clientWidth,
        closeVisible: closeRect.left >= rect.left && closeRect.right <= rect.right && closeRect.top >= rect.top
      };
    });
    assert.ok(layout.left >= 0 && layout.right <= layout.viewportWidth, `${label}: modal fits screen width`);
    assert.ok(layout.top >= 0 && layout.bottom <= layout.viewportHeight, `${label}: modal fits screen height`);
    assert.ok(layout.pageFits && layout.modalFits && layout.detailFits, `${label}: no unintended horizontal overflow`);
    assert.ok(layout.closeVisible, `${label}: close button remains on screen`);
    await dialog.screenshot({path: `test-results/source-shelf-${label}.png`});
    await page.locator('[data-filter="Winter"]').click();
    assert.equal(await selectedSource(page), 'ice-fishing-photo');
    assert.equal(await page.locator('.source-detail img').count(), 0);
    await dialog.screenshot({path: `test-results/source-photo-record-${label}.png`});
    await page.keyboard.press('Escape');
  }
  assert.deepEqual(externalRequests, [], 'The shelf loads local facsimiles without making external archive/image requests');
  assert.deepEqual(errors, []);
  console.log('Source browser checks passed: real local facsimiles, PDF download, paging, archive metadata, commands, keyboard focus, unchanged progress, phone and Chromebook layouts.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
