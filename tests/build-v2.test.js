const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildCatalogV2, skillChecksum } = require('../tools/catalog/build-v2');
const { loadTaxonomy } = require('../tools/lib/taxonomy');

const REPO = path.join(__dirname, '..');
const TREE = path.join(__dirname, 'fixtures', 'tree');
const taxonomy = loadTaxonomy(REPO);

function build(root, warnings = []) {
  return buildCatalogV2(root, { now: new Date('2026-10-26T10:00:00Z'), taxonomy, warn: m => warnings.push(m) });
}

function tmpTree(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'tree-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

test('finds skills at any depth and skips the broken one with a warning', () => {
  const warnings = [];
  const catalog = build(TREE, warnings);
  const ids = catalog.skills.map(s => s.id).sort();
  assert.deepStrictEqual(ids, ['angular-y', 'common-x', 'vendor-x']);
  assert.ok(warnings.some(w => w.includes('broken')));
});

test('ignores hidden directories', () => {
  const catalog = build(TREE);
  assert.ok(!catalog.skills.some(s => s.id === 'hidden-x'));
});

test('third-party skill without id uses name and null kind', () => {
  const catalog = build(TREE);
  const vendor = catalog.skills.find(s => s.id === 'vendor-x');
  assert.strictEqual(vendor.kind, null);
  assert.deepStrictEqual(vendor.tags, []);
});

test('skill entries never carry content or rawContent', () => {
  const catalog = build(TREE);
  for (const s of catalog.skills) {
    assert.strictEqual(s.content, undefined);
    assert.strictEqual(s.rawContent, undefined);
  }
});

test('catalog has the v2 top-level shape', () => {
  const catalog = build(TREE);
  assert.strictEqual(catalog.schemaVersion, '2.1.0');
  assert.strictEqual(catalog.generatedAt, '2026-10-26T10:00:00.000Z');
  assert.deepStrictEqual(catalog.releases, []);
  assert.deepStrictEqual(catalog.profiles, []);
  assert.deepStrictEqual(catalog.scenarios, []);
  assert.deepStrictEqual(catalog.aliases, {});
  assert.ok(Array.isArray(catalog.agents));
  assert.ok(Array.isArray(catalog.mcps));
});

test('includes injected releases', () => {
  const releases = [{ name: 'x', latest: '1.0.0', versions: [] }];
  const catalog = buildCatalogV2(TREE, { now: new Date('2026-10-26T10:00:00Z'), taxonomy, warn: () => {}, releases });
  assert.deepStrictEqual(catalog.releases, releases);
});

test('index maps technology and tags to ids', () => {
  const catalog = build(TREE);
  assert.ok(catalog.index.byTechnology.angular.includes('angular-y'));
  assert.ok(catalog.index.byTag.signals.includes('angular-y'));
  assert.ok(catalog.index.byTag.testing.includes('common-x'));
});

test('duplicate id in two folders fails and names both paths', () => {
  const root = tmpTree({
    'skills/common/common-a/SKILL.md': '---\nname: a\ndescription: x. Úsala.\nid: common-dup\nkind: common\n---\n',
    'skills/common/common-b/SKILL.md': '---\nname: b\ndescription: x. Úsala.\nid: common-dup\nkind: common\n---\n',
  });
  assert.throws(() => build(root), err => /common-dup/.test(err.message) && /common-a/.test(err.message) && /common-b/.test(err.message));
});

test('checksum is stable and changes when a binary byte changes', () => {
  const root = tmpTree({
    'skills/x/SKILL.md': 'a',
    'skills/x/scripts/blob.bin': Buffer.from([0xff, 0xfe, 0x00]),
  });
  const dir = path.join(root, 'skills', 'x');
  const first = skillChecksum(dir);
  assert.match(first, /^sha256:[0-9a-f]{64}$/);
  assert.strictEqual(skillChecksum(dir), first);
  fs.writeFileSync(path.join(dir, 'scripts', 'blob.bin'), Buffer.from([0xff, 0xfe, 0x01]));
  assert.notStrictEqual(skillChecksum(dir), first);
});

test('checksum ignores hidden entries', () => {
  const root = tmpTree({ 'skills/x/SKILL.md': 'a' });
  const dir = path.join(root, 'skills', 'x');
  const before = skillChecksum(dir);
  fs.writeFileSync(path.join(dir, '.DS_Store'), 'noise');
  assert.strictEqual(skillChecksum(dir), before);
});
