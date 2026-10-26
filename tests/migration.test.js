const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { findSkillDirs } = require('../tools/validate/run');

const ROOT = path.join(__dirname, '..');

test('no SKILL.md content appears in two different paths', () => {
  const byHash = new Map();
  for (const rel of findSkillDirs(ROOT, 'skills')) {
    const content = fs.readFileSync(path.join(ROOT, rel, 'SKILL.md'));
    const hash = crypto.createHash('sha256').update(content).digest('hex');
    if (!byHash.has(hash)) byHash.set(hash, []);
    byHash.get(hash).push(rel);
  }
  for (const paths of byHash.values()) {
    assert.strictEqual(paths.length, 1, `duplicado: ${paths.join(', ')}`);
  }
});
