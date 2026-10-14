import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {content} from '../src/content.js';
import {newGame, execute} from '../src/engine.js';
import {parse} from '../src/parser.js';
import {route} from './route.mjs';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('assets/documents/manifest.json', root), 'utf8'));
const sources = content.sourceLibrary;
const byId = id => sources.find(source => source.id === id);
const sha256 = data => createHash('sha256').update(data).digest('hex');
// These are the SHA-256 values recorded when the official GovInfo PDFs were downloaded.
// Keeping the originals independently of the asset manifest detects accidental replacement.
const originalPdfs = {
  treaty1855: '869dffe2a7a1049496e90622dafc839bb56bafc8f1ff5fcef533c8f9b87e35dc',
  nelson1889: '48ccee81d978aa040dd659ef95c15f12b499a52ef74d4a1b383fc411d5ca52de',
  restoration2020: 'e6693ea5ba010da68ade0847f42be0842365e9312aff12f6b74f17db689220ce'
};
const localPath = path => path.replace(/^\.\//, '');

test('three embedded primary legal documents retain their official downloaded PDF bytes', async () => {
  const documents = sources.filter(source => source.kind === 'document');
  assert.deepEqual(documents.map(source => source.id).sort(), Object.keys(originalPdfs).sort());
  for (const source of documents) {
    const url = new URL(source.sourceUrl);
    assert.equal(url.protocol, 'https:');
    assert.equal(url.hostname, 'www.govinfo.gov');
    assert.match(url.pathname, /^\/content\/pkg\/.+\/pdf\/.+\.pdf$/);
    assert.equal(source.rights.canEmbed, true);
    const entry = manifest.find(item => item.path === localPath(source.pdfPath));
    assert.ok(entry, `Manifest missing PDF for ${source.id}`);
    assert.equal(entry.sourceId, source.id);
    assert.equal(entry.originalSource, source.sourceUrl);
    assert.equal(entry.sha256, originalPdfs[source.id]);
    const pdf = await readFile(new URL(entry.path, root));
    assert.equal(pdf.subarray(0, 5).toString('ascii'), '%PDF-');
    assert.equal(pdf.length, entry.bytes);
    assert.equal(sha256(pdf), originalPdfs[source.id]);
  }
});

test('all six local facsimile pages are PNGs linked to their original source and recorded hash', async () => {
  const pages = sources.flatMap(source => (source.pages || []).map(page => ({source, page})));
  assert.equal(pages.length, 6);
  assert.equal(new Set(pages.map(({page}) => page.imagePath)).size, 6);
  const pngHeader = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  for (const {source, page} of pages) {
    assert.match(page.imagePath, /^\.\/assets\/documents\/[^/]+\.png$/);
    const entry = manifest.find(item => item.path === localPath(page.imagePath));
    assert.ok(entry, `Manifest missing ${page.imagePath}`);
    assert.equal(entry.sourceId, source.id);
    assert.equal(entry.originalSource, source.sourceUrl);
    assert.equal(entry.type, 'page rendered from official PDF');
    const image = await readFile(new URL(entry.path, root));
    assert.deepEqual(image.subarray(0, 8), pngHeader);
    assert.equal(image.subarray(12, 16).toString('ascii'), 'IHDR');
    assert.ok(image.readUInt32BE(16) > 800, 'Facsimile retains readable scan dimensions');
    assert.equal(image.readUInt32BE(20), 1400, 'Facsimile retains its rendered scan height');
    assert.equal(image.length, entry.bytes);
    assert.equal(sha256(image), entry.sha256);
    assert.match(page.label, /Printed p\.\d+/);
  }
  for (const source of sources.filter(source => source.pages)) {
    assert.ok(source.pages.some(page => page.imagePath === source.imagePath));
  }
  assert.equal(manifest.length, 9, 'The manifest accounts for three PDFs and six scans');
});

test('restricted archive images remain credited source links, without bundled reproductions', () => {
  const photographs = sources.filter(source => source.kind === 'photograph');
  assert.equal(photographs.length, 4);
  for (const source of sources.filter(source => source.presentation === 'archive-link')) {
    assert.equal(source.rights.canEmbed, false, source.id);
    assert.equal(source.imagePath, undefined, source.id);
    assert.equal(source.pdfPath, undefined, source.id);
    assert.equal(source.pages, undefined, source.id);
    assert.equal(new URL(source.sourceUrl).hostname, 'ojibwe.lib.umn.edu');
    assert.match(new URL(source.sourceUrl).pathname, /^\/collection\//);
    assert.ok(source.repository);
    assert.ok(source.rights.statement);
    assert.equal(manifest.some(entry => entry.sourceId === source.id), false);
  }
});

test('seasonal archive records retain actual dates, geography, and the limits of the evidence', () => {
  const spring = byId('cass-lake-sugaring');
  assert.equal(spring.place, 'Cass Lake, Minnesota');
  assert.match(spring.date, /not recorded/i);
  assert.ok(spring.missingMetadata.includes('Date'));
  const bucket = byId('sap-bucket-making');
  assert.equal(bucket.date, 'Circa 1956');
  assert.equal(bucket.place, 'Mille Lacs, Minnesota');
  const rice = byId('rice-harvest-photo');
  assert.equal(rice.date, 'Circa 1920');
  assert.equal(rice.place, 'Mille Lacs, Minnesota');
  const fishing = byId('ice-fishing-photo');
  assert.equal(fishing.date, 'April 1948');
  assert.equal(fishing.place, 'Lake Mille Lacs, Minnesota');
  assert.equal(fishing.creator, 'Monroe Killy, photographer');
  assert.match(fishing.caption, /April 1948/);
  assert.doesNotMatch(fishing.caption, /winter/i);
  assert.match(fishing.context, /April, not winter/);
  const summer = byId('food-drying-racks');
  assert.equal(summer.kind, 'object');
  assert.match(summer.context, /not a picture of people picking blueberries/);
  assert.match(summer.date, /not recorded/i);
  assert.match(summer.place, /not recorded/i);
  const household = byId('joseph-corn-survey');
  assert.equal(household.kind, 'record');
  assert.equal(household.place, 'Lac du Flambeau Agency, Wisconsin');
  assert.match(household.date, /May 10,\s*1922/);
});

test('the Nelson Act includes the allotment proviso alongside the removal clause', () => {
  const nelson = byId('nelson1889');
  assert.ok(nelson.transcript.some(excerpt => /removed to and take up their residence on the White Earth Reservation/.test(excerpt.text)));
  const proviso = nelson.transcript.find(excerpt => /Provided further/.test(excerpt.page));
  assert.ok(proviso, 'The removal clause must not be shown without the significant proviso');
  assert.equal(proviso.text, 'That any of the Indians residing on any of said reservations may, in his discretion, take his allotment in severalty under this act on the reservation where he lives at the time of the removal herein provided for is effected, instead of being removed to and taking such allotment on White Earth Reservation.');
  assert.match(nelson.context, /proviso permitting a person to take an allotment on the reservation where they lived/);
  assert.match(nelson.context, /not.*proof that everyone left Leech Lake/i);
});

test('the 2020 law is dated as retrospective findings rather than an original mid-century deed', () => {
  const restoration = byId('restoration2020');
  assert.equal(restoration.date, '2020-12-23');
  assert.match(restoration.context, /1948–1959/);
  assert.match(restoration.context, /11,760 acres/);
  assert.match(restoration.context, /retrospective evidence/);
  assert.match(restoration.context, /not an original 1948–1959 sales deed/);
  assert.match(restoration.context, /does not prove the fictional game family lost a particular parcel/);
  assert.match(restoration.transcript[0].text, /without the consent of a majority of the rightful landowners/);
});

test('source commands select the original document without changing adventure progress', () => {
  assert.deepEqual(parse('SOURCES'), {verb: 'sources'});
  assert.equal(parse('VIEW TREATY').verb, 'source');
  const state = newGame();
  for (const command of route.slice(0, route.indexOf('go trail'))) execute(state, command);
  const before = structuredClone(state);
  const commands = [
    ['SOURCES', null], ['DOCUMENTS', null], ['PHOTOS', null],
    ['VIEW TREATY', 'treaty1855'], ['OPEN NELSON ACT', 'nelson1889'],
    ['VIEW RESTORATION LAW', 'restoration2020'], ['VIEW RICE PHOTO', 'rice-harvest-photo']
  ];
  for (const [command, sourceId] of commands) {
    assert.deepEqual(execute(state, command), {effect: 'sources', sourceId, text: ''});
  }
  assert.equal(state.turns, before.turns + commands.length);
  assert.deepEqual({...state, turns: before.turns}, before);
});
