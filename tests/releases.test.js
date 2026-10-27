const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { toCatalogEntries } = require('../tools/catalog/releases');

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'releases', 'api-releases.json'), 'utf8'));
const SOURCE = { name: 'brainforge-companion', repo: 'dmuleroa/dcx-brain-forge', asset_pattern: '*.vsix', max_releases: 10 };

function convert(source = SOURCE, warnings = []) {
  return toCatalogEntries(FIXTURE, source, { warn: m => warnings.push(m) });
}

test('maps the v0.2.8 release to a catalog version', () => {
  const entry = convert();
  assert.deepStrictEqual(entry.versions[0], {
    version: '0.2.8',
    tag: 'v0.2.8',
    publishedAt: '2026-10-26T08:46:34Z',
    asset: {
      name: 'brainforge-companion-0.2.8.vsix',
      size: 771527,
      sha256: 'a0e410aa3b4249b55d8887e34c6523f5f77ede51e270f158c95b9b29b106e695',
      assetId: 677555191,
    },
  });
});

test('skips drafts and prereleases so latest is the newest stable', () => {
  const entry = convert();
  assert.strictEqual(entry.latest, '0.2.8');
  assert.ok(!entry.versions.some(v => v.tag === 'v0.3.0' || v.tag === 'v0.3.0-rc.1'));
});

test('orders by publishedAt descending', () => {
  assert.deepStrictEqual(convert().versions.map(v => v.version), ['0.2.8', '0.2.7', '0.2.5']);
});

test('omits a release without a vsix and warns', () => {
  const warnings = [];
  const entry = convert(SOURCE, warnings);
  assert.ok(!entry.versions.some(v => v.tag === 'v0.2.6'));
  assert.ok(warnings.some(w => w.includes('v0.2.6')));
});

test('strips a missing v prefix only when present', () => {
  const v = convert().versions.find(x => x.tag === '0.2.5');
  assert.strictEqual(v.version, '0.2.5');
});

test('keeps only max_releases', () => {
  const entry = convert({ ...SOURCE, max_releases: 1 });
  assert.strictEqual(entry.versions.length, 1);
  assert.strictEqual(entry.latest, '0.2.8');
});

test('never leaks repo or notes', () => {
  const json = JSON.stringify(convert());
  assert.ok(!json.includes('dmuleroa'));
  for (const r of FIXTURE) assert.ok(!json.includes(r.body));
});

test('returns null latest and no versions when nothing matches', () => {
  const entry = convert({ ...SOURCE, asset_pattern: '*.zip' });
  assert.strictEqual(entry.latest, null);
  assert.deepStrictEqual(entry.versions, []);
});
