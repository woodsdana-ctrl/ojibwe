import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {existsSync, mkdirSync} from 'node:fs';
import {content} from '../src/content.js';
import {AUTO_KEY} from '../src/storage.js';
import {route} from './route.mjs';

const require = createRequire(import.meta.url);
let chromium;
try { ({chromium} = require('playwright')); }
catch { throw Error('Visual browser checks need optional Playwright tooling from the development environment.'); }
const origin = 'http://127.0.0.1:8013';
const server = spawn(process.execPath, ['scripts/serve.mjs'], {
  cwd: new URL('..', import.meta.url), env: {...process.env, PORT: '8013'}, stdio: ['ignore', 'pipe', 'pipe']
});
let browser;
const errors = [];
const externalRequests = [];
const command = async (page, input) => {
  await page.locator('#command').fill(input);
  await page.locator('#command').press('Enter');
};
const savedState = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), AUTO_KEY);
const imageLoaded = locator => locator.evaluate(image => new Promise(resolve => {
  if (image.complete) return resolve(image.naturalWidth);
  image.addEventListener('load', () => resolve(image.naturalWidth), {once: true});
  image.addEventListener('error', () => resolve(0), {once: true});
}));
// Native dialog close events run asynchronously; await their focus restoration
// before opening a different control with the keyboard.
const afterDialogClose = async (page, selector, action) => {
  await page.locator(selector).evaluate(dialog => {
    dialog.visualTestClose = new Promise(resolve => dialog.addEventListener('close', () => resolve(), {once: true}));
  });
  await action();
  await page.locator(selector).evaluate(async dialog => {await dialog.visualTestClose; delete dialog.visualTestClose;});
};
const dismissDialog = (page, selector) => afterDialogClose(page, selector, () => page.keyboard.press('Escape'));
const closeMap = async page => {
  if (await page.locator('#map-dialog').isVisible()) await dismissDialog(page, '#map-dialog');
};
const mapTravel = (page, id) => afterDialogClose(page, '#map-dialog', () => page.locator(`.map-place[data-location="${id}"]`).click());
const sceneCommand = (page, input) => page.locator(`[data-scene-command="${input}" i]`);
const noOverflow = async (page, label) => {
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    page: document.documentElement.scrollWidth,
    scene: document.querySelector('#scene-view').getBoundingClientRect().toJSON(),
    main: document.querySelector('main').getBoundingClientRect().toJSON()
  }));
  assert.ok(layout.page <= layout.viewport, `${label}: page has no horizontal overflow`);
  assert.ok(layout.scene.left >= 0 && layout.scene.right <= layout.viewport, `${label}: scene fits the screen`);
};

try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(Error('Visual test server did not start')), 10000);
    server.stdout.once('data', () => {clearTimeout(timer); resolve();});
    server.once('error', error => {clearTimeout(timer); reject(error);});
    server.once('exit', code => {clearTimeout(timer); reject(Error('Visual test server exited ' + code));});
  });
  const executablePath = process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
  browser = await chromium.launch({executablePath, headless: true, args: ['--no-sandbox']});
  const page = await browser.newPage({viewport: {width: 1366, height: 768}});
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).origin !== origin) externalRequests.push(request.url());
  });
  await page.goto(origin + '/');
  await page.locator('#scene-view img.scene-art').waitFor();
  await command(page, 'LOOK');
  assert.ok(await imageLoaded(page.locator('#scene-view img.scene-art')) > 0);
  assert.equal(await page.locator('.scene-era').getAttribute('data-year'), '2026');
  assert.equal(await page.locator('.scene-person[data-character="grandma"]').count(), 1);

  // Original document pages are part of the scene and open the existing accessible viewer.
  const beforeSource = await savedState(page);
  const treaty = content.sourceLibrary.find(source => source.id === 'treaty1855');
  const treatyCard = page.locator('#scene-view .scene-source[data-source-id="treaty1855"]');
  assert.equal(await treatyCard.count(), 1);
  assert.equal(await treatyCard.locator('img').getAttribute('src'), treaty.imagePath);
  assert.ok(await imageLoaded(treatyCard.locator('img')) > 800, 'The scene uses the actual readable facsimile');
  await treatyCard.focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('.source-dialog').isVisible(), true);
  assert.equal(await page.locator('.source-choice[aria-pressed="true"]').getAttribute('data-source-id'), 'treaty1855');
  assert.equal(await page.locator('.source-facsimile img').getAttribute('src'), treaty.imagePath);
  await dismissDialog(page, '.source-dialog');
  assert.equal(await page.locator('.source-dialog').isVisible(), false);
  assert.equal(await page.evaluate(() => document.activeElement.dataset.sourceId), 'treaty1855');
  assert.deepEqual(await savedState(page), beforeSource, 'Inspecting a scene document leaves game progress unchanged');

  // The illustrated map uses engine navigation; it cannot skip the opening requirement.
  await page.locator('#map-open').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#map-dialog').evaluate(dialog => dialog.matches(':modal')), true);
  assert.equal(await page.locator('.map-place[data-location="shed"]').count(), 0, 'An undiscovered remote destination is not exposed on the map');
  const lockedTrail = page.locator('.map-place[data-location="trail"]');
  if (!await lockedTrail.isDisabled()) await lockedTrail.click();
  await closeMap(page);
  assert.equal((await savedState(page)).location, 'kitchen', 'Map cannot bypass the locked home exit');
  await page.locator('#map-open').click();
  await mapTravel(page, 'archive');
  await closeMap(page);
  assert.equal((await savedState(page)).location, 'archive');
  for (const [id, flag] of [['treaty1855', 'boundaryRead'], ['nelson1889', 'landRead'], ['restoration2020', 'restorationRead']]) {
    const card = page.locator(`#scene-view .scene-source[data-source-id="${id}"]`);
    await card.focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.source-choice[aria-pressed="true"]').getAttribute('data-source-id'), id);
    assert.equal(await page.locator('.source-facsimile img').getAttribute('src'), content.sourceLibrary.find(source => source.id === id).imagePath);
    assert.equal((await savedState(page)).flags[flag], true, `Examining the original ${id} also reads its game exhibit card`);
    await dismissDialog(page, '.source-dialog');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.sourceId), id);
  }
  await page.locator('#map-open').click();
  await mapTravel(page, 'kitchen');
  await closeMap(page);
  assert.equal((await savedState(page)).location, 'kitchen', 'Visited map destinations retrace the ordinary routes');
  await page.locator('#map-open').click();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('#map-dialog'))), true, 'Keyboard focus stays inside the open map');
  await dismissDialog(page, '#map-dialog');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'map-open');

  // Portraits and object buttons use the same command engine as the text input.
  await page.locator('.scene-person[data-character="grandma"]').click();
  assert.equal((await savedState(page)).flags.intro, true);
  await sceneCommand(page, 'TAKE LIST').click();
  const listItem = page.locator('#inventory-items .inventory-item[data-item="list"]');
  assert.equal(await listItem.count(), 1);
  assert.equal(await listItem.locator('svg[aria-hidden="true"]').count(), 1);
  await listItem.focus();
  await page.keyboard.press('Enter');
  assert.match(await page.locator('#transcript .entry').last().textContent(), /If you bring four sticks, I will notice/);
  await command(page, 'DROP LIST');
  assert.equal(await listItem.count(), 0, 'Dropped objects leave the visual inventory');
  assert.equal(await sceneCommand(page, 'TAKE LIST').count(), 1, 'A dropped essential can be picked up again in the scene');
  await sceneCommand(page, 'TAKE LIST').click();
  assert.equal(await listItem.count(), 1);
  const beforeInventory = await savedState(page);
  await page.locator('#inventory-open').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#inventory-dialog').evaluate(dialog => dialog.matches(':modal')), true);
  assert.equal(await page.locator('#inventory-detail .inventory-item[data-item="list"]').count(), 1);
  await dismissDialog(page, '#inventory-dialog');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'inventory-open');
  assert.deepEqual(await savedState(page), beforeInventory, 'Opening the illustrated inventory does not advance the story');

  mkdirSync('test-results', {recursive: true});
  for (const [label, viewport] of [
    ['chromebook', {width: 1366, height: 768}],
    ['phone', {width: 390, height: 844}]
  ]) {
    await page.setViewportSize(viewport);
    await noOverflow(page, label);
    if (label === 'phone') {
      await sceneCommand(page, 'EXAMINE PHOTO').click();
      assert.match(await page.locator('#transcript .entry').last().textContent(), /ancestors of your family/);
    }
    await page.screenshot({path: `test-results/visual-kitchen-${label}.png`, fullPage: true});
    await page.locator('#map-open').click();
    const mapLayout = await page.locator('#map-dialog').evaluate(dialog => {
      const rect = dialog.getBoundingClientRect();
      const close = dialog.querySelector('#map-close').getBoundingClientRect();
      return {left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom,
        width: innerWidth, height: innerHeight, fits: dialog.scrollWidth <= dialog.clientWidth,
        closeVisible: close.left >= rect.left && close.right <= rect.right && close.top >= rect.top && close.bottom <= rect.bottom};
    });
    assert.ok(mapLayout.left >= 0 && mapLayout.right <= mapLayout.width && mapLayout.top >= 0 && mapLayout.bottom <= mapLayout.height, `${label}: map dialog fits screen`);
    assert.ok(mapLayout.fits && mapLayout.closeVisible, `${label}: map has no horizontal overflow and its close control is reachable`);
    await page.locator('#map-dialog').screenshot({path: `test-results/visual-map-${label}.png`});
    await afterDialogClose(page, '#map-dialog', () => page.locator('#map-close').click());
  }
  await page.setViewportSize({width: 1366, height: 768});
  await command(page, 'RESTART');
  await page.locator('#confirm-restart').click();
  assert.equal(await page.locator('#inventory-items .inventory-item').count(), 0);

  // Complete the actual public route and check every location as the player reaches it.
  const seen = new Map();
  const checkScene = async () => {
    const state = await savedState(page);
    const room = content.locations[state.location];
    const art = page.locator('#scene-view img.scene-art');
    assert.match(await art.getAttribute('src'), new RegExp(`/illustrations/${state.location}\\.svg$`));
    assert.ok(await imageLoaded(art) > 0, `${state.location}: scene illustration loads`);
    assert.ok((await art.getAttribute('alt'))?.trim(), `${state.location}: illustration has a textual description`);
    assert.equal(await page.locator('.scene-era').getAttribute('data-year'), room.time === '1926' ? '1926' : '2026');
    if (room.time === '1926') {
      assert.equal(await page.locator('#scene-view .scene-source[data-source-id="restoration2020"]').count(), 0, `${state.location}: a 2020 law cannot appear inside a 1926 scene`);
      assert.equal(await page.locator('#scene-view img[src*="2020-restoration"]').count(), 0);
    }
    for (const sourceCard of await page.locator('#scene-view .scene-source img, #scene-view .scene-document-object img').all()) {
      const sourceId = await sourceCard.evaluate(image => image.closest('[data-source-id]').dataset.sourceId);
      const source = content.sourceLibrary.find(item => item.id === sourceId);
      assert.equal(source?.rights.canEmbed, true, 'Only permitted facsimiles are embedded in scenes');
      assert.equal(await sourceCard.getAttribute('src'), source.imagePath, 'Scene documents use intact original facsimile assets');
      assert.ok(await imageLoaded(sourceCard) > 800);
    }
    if (!seen.has(state.location)) {
      await page.setViewportSize({width: 390, height: 844});
      await page.locator('#scene-view .scene-picture').scrollIntoViewIfNeeded();
      await noOverflow(page, `${state.location} on phone`);
      const clippedOrObscured = await page.locator('#scene-view .scene-hotspot').evaluateAll(buttons => buttons.flatMap(button => {
        const rect = button.getBoundingClientRect();
        const frame = button.closest('.scene-picture').getBoundingClientRect();
        const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        const fits = rect.left >= frame.left - 1 && rect.right <= frame.right + 1 && rect.top >= frame.top - 1 && rect.bottom <= frame.bottom + 1;
        return fits && center?.closest('button') === button ? [] : [button.dataset.sceneCommand];
      }));
      assert.deepEqual(clippedOrObscured, [], `${state.location}: phone scene object controls remain visible and tappable`);
      await page.setViewportSize({width: 1366, height: 768});
      await page.evaluate(() => scrollTo(0, 0));
    }
    seen.set(state.location, await art.getAttribute('src'));
    await noOverflow(page, state.location);
  };
  await checkScene();
  for (const input of route) {
    await command(page, input);
    await checkScene();
    if (input === 'go trail') {
      await page.locator('#map-open').click();
      const winter = page.locator('.map-place[data-location="hut"]');
      if (!await winter.isDisabled()) await winter.click();
      await closeMap(page);
      assert.equal((await savedState(page)).location, 'trail', 'Map cannot bypass the seasonal puzzle locks');
    }
    if (input === 'go archive') {
      const documentObjects = page.locator('#scene-view .scene-document-object');
      assert.equal(await documentObjects.count(), 3, 'Actual primary source scans also appear on the illustrated archive table');
      await documentObjects.first().focus();
      const sourceId = await documentObjects.first().getAttribute('data-source-id');
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.source-dialog').isVisible(), true);
      assert.equal(await page.locator('.source-choice[aria-pressed="true"]').getAttribute('data-source-id'), sourceId);
      await dismissDialog(page, '.source-dialog');
      assert.equal(await page.evaluate(() => document.activeElement.classList.contains('scene-document-object')), true);
      await page.screenshot({path: 'test-results/visual-records-chromebook.png', fullPage: true});
    }
    if (input === 'use support on basket stand') await page.screenshot({path: 'test-results/visual-grove-1926.png', fullPage: true});
  }
  assert.equal((await savedState(page)).ended, true, 'The full adventure remains winnable through the visual update');
  assert.equal(seen.size, 12);
  assert.equal(new Set(seen.values()).size, 12, 'All twelve locations render distinct scene assets');
  await page.locator('#journal-open').focus();
  await page.keyboard.press('Enter');
  assert.equal(await page.locator('#journal-dialog').evaluate(dialog => dialog.matches(':modal')), true);
  for (const teaching of ['Wisdom', 'Love', 'Respect', 'Bravery', 'Honesty', 'Humility', 'Truth']) {
    assert.match(await page.locator('#journal-detail .teaching-tags').textContent(), new RegExp(teaching));
  }
  assert.ok(await page.locator('#journal-detail .journal-note').count() > 5, 'The visual journal includes the actual discoveries');
  assert.ok(await page.locator('#journal-detail .journal-word a').count() > 10, 'Encountered vocabulary keeps its dictionary links');
  await dismissDialog(page, '#journal-dialog');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'journal-open');

  // Let the browser XML parser validate every piece of SVG art, beyond checking that it loads.
  const paths = [...seen.values(), ...Object.keys(content.characters).map(id => `./assets/portraits/${id}.svg`)];
  const invalid = await page.evaluate(async paths => {
    const bad = [];
    for (const path of paths) {
      const response = await fetch(path);
      const document = new DOMParser().parseFromString(await response.text(), 'image/svg+xml');
      if (!response.ok || document.querySelector('parsererror')) bad.push(path);
    }
    return bad;
  }, paths);
  assert.deepEqual(invalid, [], 'All scenes and portraits are valid SVG documents');
  assert.deepEqual(externalRequests, [], 'Visuals load without third-party image or archive requests');
  assert.deepEqual(errors, []);
  console.log('Visual browser checks passed: 12 scenes, portraits, reversible inventory, authentic scene documents, 1926/2026 separation, accessible map, route locks, full winning path, keyboard focus and phone/Chromebook layouts.');
} finally {
  if (browser) await browser.close();
  server.kill();
}
