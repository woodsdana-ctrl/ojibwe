import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, readdir} from 'node:fs/promises';
import {content} from '../src/content.js';
import {itemIcon} from '../src/illustration-icons.js';

const root = new URL('../', import.meta.url);
const readAsset = path => readFile(new URL(path, root), 'utf8');
const checkSvg = (svg, label) => {
  assert.match(svg, /<svg\b[^>]*xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i, `${label}: SVG namespace`);
  assert.match(svg, /\bviewBox=["'][\d. -]+["']/i, `${label}: scalable viewBox`);
  assert.match(svg, /<title\b[^>]*>\s*[^<]+<\/title>/i, `${label}: accessible title`);
  assert.doesNotMatch(svg, /<(?:script|foreignObject)\b|\bon\w+\s*=/i, `${label}: artwork cannot run code`);
  assert.doesNotMatch(svg, /(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:)|url\(\s*["']?(?:https?:|\/\/|data:)/i, `${label}: self-contained local artwork`);
};

test('all twelve game locations have distinct, accessible, local scene illustrations', async () => {
  const ids = Object.keys(content.locations);
  assert.equal(ids.length, 12);
  const scenes = await Promise.all(ids.map(id => readAsset(`assets/illustrations/${id}.svg`)));
  assert.equal(new Set(scenes).size, ids.length, 'Each place receives its own scene');
  scenes.forEach((svg, index) => checkSvg(svg, ids[index]));
});

test('every fictional family character has an accessible, local portrait', async () => {
  const ids = Object.keys(content.characters);
  assert.equal(ids.length, 8);
  const portraits = await Promise.all(ids.map(id => readAsset(`assets/portraits/${id}.svg`)));
  assert.equal(new Set(portraits).size, ids.length, 'Portraits distinguish the characters');
  portraits.forEach((svg, index) => checkSvg(svg, ids[index]));
});

test('illustrated assets do not embed restricted archive photography or contact external image hosts', async () => {
  for (const directory of ['assets/illustrations/', 'assets/portraits/']) {
    for (const filename of await readdir(new URL(directory, root))) {
      if (!filename.endsWith('.svg')) continue;
      const svg = await readAsset(directory + filename);
      checkSvg(svg, directory + filename);
      assert.doesNotMatch(svg, /ojibwe\.lib\.umn\.edu|mnhs\.org|wikimedia\.org/i);
    }
  }
});

// Icons are decorative inside already labelled buttons, so they stay outside
// the accessibility tree instead of competing with the item name.
test('all nineteen inventory items have local decorative SVG icons', () => {
  const items = Object.keys(content.items);
  assert.equal(items.length, 19);
  for (const id of items) {
    const svg = itemIcon(id);
    assert.match(svg, /<svg\b/);
    assert.match(svg, /viewBox=["']0 0 40 40["']/);
    assert.match(svg, /aria-hidden=["']true["']/);
    assert.doesNotMatch(svg, /<(?:script|foreignObject)\b|\bon\w+\s*=|(?:href|src)\s*=/i, id);
  }
});
