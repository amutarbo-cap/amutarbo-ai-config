const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { writeCatalogIfChanged } = require('../tools/lib/write-catalog');

function tmpFile() {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wc-')), 'CATALOG.json');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

test('writes when the file does not exist', () => {
  const file = tmpFile();
  const catalog = { generatedAt: 'a', x: 1 };
  assert.strictEqual(writeCatalogIfChanged(file, catalog), true);
  assert.deepStrictEqual(readJson(file), catalog);
  assert.strictEqual(fs.readFileSync(file, 'utf8'), JSON.stringify(catalog, null, 2));
});

test('does not rewrite when only generatedAt changes', () => {
  const file = tmpFile();
  writeCatalogIfChanged(file, { generatedAt: 'a', x: 1 });
  const old = new Date('2020-01-01T00:00:00Z');
  fs.utimesSync(file, old, old);
  assert.strictEqual(writeCatalogIfChanged(file, { generatedAt: 'b', x: 1 }), false);
  assert.strictEqual(readJson(file).generatedAt, 'a');
  assert.strictEqual(fs.statSync(file).mtime.getTime(), old.getTime());
});

test('rewrites when another field changes', () => {
  const file = tmpFile();
  writeCatalogIfChanged(file, { generatedAt: 'a', x: 1 });
  assert.strictEqual(writeCatalogIfChanged(file, { generatedAt: 'b', x: 2 }), true);
  assert.strictEqual(readJson(file).x, 2);
});

test('rewrites when the existing file is not valid JSON', () => {
  const file = tmpFile();
  fs.writeFileSync(file, '{ not json');
  assert.strictEqual(writeCatalogIfChanged(file, { generatedAt: 'a', x: 1 }), true);
  assert.strictEqual(readJson(file).x, 1);
});
