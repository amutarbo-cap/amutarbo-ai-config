const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { loadTaxonomy } = require('../tools/lib/taxonomy');

const ROOT = path.join(__dirname, '..');

test('loadTaxonomy returns the four collections', () => {
  const t = loadTaxonomy(ROOT);
  assert.ok(t.domains instanceof Set);
  assert.ok(t.technologies instanceof Map);
  assert.ok(t.categories instanceof Set);
  assert.ok(t.tags instanceof Set);
});

test('every technology points to a known domain', () => {
  const t = loadTaxonomy(ROOT);
  for (const [id, { domain }] of t.technologies) {
    assert.ok(t.domains.has(domain), `${id} → dominio desconocido ${domain}`);
  }
});

test('spec technologies are present with their domain', () => {
  const t = loadTaxonomy(ROOT);
  assert.strictEqual(t.technologies.get('angular').domain, 'frontend');
  assert.strictEqual(t.technologies.get('spring-boot').domain, 'backend');
  assert.strictEqual(t.technologies.get('android').domain, 'mobile');
  assert.strictEqual(t.technologies.get('pega').domain, 'low-code');
});

test('loadTaxonomy throws on invalid YAML', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-'));
  fs.mkdirSync(path.join(dir, 'taxonomy'));
  for (const f of ['domains', 'technologies', 'categories', 'tags']) {
    fs.writeFileSync(path.join(dir, 'taxonomy', `${f}.yaml`), f === 'tags' ? 'a: [unclosed' : '[]');
  }
  assert.throws(() => loadTaxonomy(dir), /tags\.yaml/);
});
