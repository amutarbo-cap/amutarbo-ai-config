const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { loadTaxonomy } = require('../tools/lib/taxonomy');
const { validateRepo } = require('../tools/validate/run');

const REPO = path.join(__dirname, '..');
const taxonomy = loadTaxonomy(REPO);

function fixtureRepo(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'skills-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

const VALID = `---
name: common-accessibility
description: Revisión WCAG. Úsala al crear UI.
id: common-accessibility
version: 1.0.0
kind: common
category: ux
applies_to: ["domain:frontend"]
tags: [a11y]
status: stable
---
Body
`;

test('valid skill with README yields no errors', () => {
  const root = fixtureRepo({
    'skills/common/common-accessibility/SKILL.md': VALID,
    'skills/common/common-accessibility/README.md': '# a11y',
  });
  const { errors } = validateRepo(root, taxonomy);
  assert.deepStrictEqual(errors, []);
});

test('ignores hidden entries and .example, and dotfiles at skills root', () => {
  const root = fixtureRepo({
    'skills/.DS_Store': 'binary',
    'skills/.example/SKILL.md': '---\nname: x\n---\n',
    'skills/.example/prompt.md': 'x',
    'skills/common/common-accessibility/SKILL.md': VALID,
    'skills/common/common-accessibility/README.md': '# a11y',
  });
  const { errors, warnings } = validateRepo(root, taxonomy);
  assert.deepStrictEqual(errors, []);
  assert.deepStrictEqual(warnings, []);
});

test('undeclared skill (no kind) is a warning, not an error', () => {
  const root = fixtureRepo({
    'skills/legacy/SKILL.md': '---\nname: legacy\ndescription: Legacy. Use when needed.\n---\n',
  });
  const { errors, warnings } = validateRepo(root, taxonomy);
  assert.deepStrictEqual(errors, []);
  assert.ok(warnings.some(w => /pendiente de migración/.test(w) && /legacy/.test(w)));
});

test('declared skill missing README is an error', () => {
  const root = fixtureRepo({
    'skills/common/common-accessibility/SKILL.md': VALID,
  });
  const { errors } = validateRepo(root, taxonomy);
  assert.ok(errors.some(e => /README/.test(e) && /common-accessibility/.test(e)));
});

test('errors name the offending file', () => {
  const root = fixtureRepo({
    'skills/common/common-accessibility/SKILL.md': VALID.replace('kind: common', 'kind: weird'),
    'skills/common/common-accessibility/README.md': '# a11y',
  });
  const { errors } = validateRepo(root, taxonomy);
  assert.ok(errors.some(e => e.includes('skills/common/common-accessibility/SKILL.md') && /kind/.test(e)));
});
