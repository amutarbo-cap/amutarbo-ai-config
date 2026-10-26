const test = require('node:test');
const assert = require('node:assert');
const { validateSkill } = require('../tools/validate/skill');

const taxonomy = {
  domains: new Set(['frontend', 'backend', 'mobile', 'low-code']),
  technologies: new Map([['angular', { domain: 'frontend' }], ['pega', { domain: 'low-code' }]]),
  categories: new Set(['ux', 'build', 'migration']),
  tags: new Set(['a11y', 'signals']),
};

const common = () => ({
  frontmatter: {
    name: 'accessibility-a11y',
    description: 'Revisión WCAG 2.2 AA. Úsala al crear o revisar UI.',
    id: 'common-accessibility',
    version: '1.0.0',
    kind: 'common',
    category: 'ux',
    applies_to: ['domain:frontend'],
    tags: ['a11y'],
    status: 'stable',
  },
  dir: 'skills/common/common-accessibility',
  hasReadme: true,
  taxonomy,
});

const tech = () => ({
  frontmatter: {
    name: 'angular-signals',
    description: 'Signals en Angular. Úsala al refactorizar componentes.',
    id: 'angular-signals',
    version: '1.2.0',
    kind: 'tech',
    category: 'build',
    technology: 'angular',
    applies_to: ['angular'],
    tags: ['signals'],
    status: 'stable',
  },
  dir: 'skills/tech/angular/angular-signals',
  hasReadme: true,
  taxonomy,
});

const migration = () => ({
  frontmatter: {
    name: 'mig-pega-to-angular-flow-mapping',
    description: 'Mapeo de flujos Pega a Angular. Úsala al planificar la migración.',
    id: 'mig-pega-to-angular-flow-mapping',
    version: '1.0.0',
    kind: 'migration',
    category: 'migration',
    from: 'pega',
    to: 'angular',
    applies_to: ['pega'],
    tags: [],
    status: 'draft',
  },
  dir: 'skills/migrations/pega-to-angular/mig-pega-to-angular-flow-mapping',
  hasReadme: true,
  taxonomy,
});

const withFm = (input, patch) => ({ ...input, frontmatter: { ...input.frontmatter, ...patch } });

test('valid common skill has no errors', () => {
  assert.deepStrictEqual(validateSkill(common()), []);
});

test('valid tech skill has no errors', () => {
  assert.deepStrictEqual(validateSkill(tech()), []);
});

test('valid migration skill has no errors', () => {
  assert.deepStrictEqual(validateSkill(migration()), []);
});

test('missing description is an error', () => {
  const errors = validateSkill(withFm(common(), { description: undefined }));
  assert.ok(errors.some(e => /description/.test(e)));
});

test('description without a usage clause is an error', () => {
  const errors = validateSkill(withFm(common(), { description: 'Revisión WCAG 2.2 AA.' }));
  assert.ok(errors.some(e => /cláusula de uso/.test(e)));
});

test('unknown kind is an error', () => {
  const errors = validateSkill(withFm(common(), { kind: 'weird' }));
  assert.ok(errors.some(e => /kind/.test(e)));
});

test('common id without common- prefix is an error', () => {
  const errors = validateSkill(withFm(common(), { id: 'accessibility' }));
  assert.ok(errors.some(e => /prefijo/.test(e)));
});

test('tech id must start with its technology slug', () => {
  const errors = validateSkill(withFm(tech(), { id: 'common-signals' }));
  assert.ok(errors.some(e => /prefijo/.test(e)));
});

test('id with uppercase or spaces is an error', () => {
  const errors = validateSkill(withFm(common(), { id: 'common-Access ibility' }));
  assert.ok(errors.some(e => /id/.test(e)));
});

test('path that does not match kind convention is an error', () => {
  const input = { ...common(), dir: 'skills/tech/angular/common-accessibility' };
  assert.ok(validateSkill(input).some(e => /ruta/.test(e)));
});

test('unknown category is an error', () => {
  assert.ok(validateSkill(withFm(common(), { category: 'nope' })).some(e => /category/.test(e)));
});

test('unknown technology is an error', () => {
  assert.ok(validateSkill(withFm(tech(), { technology: 'cobol' })).some(e => /technology/.test(e)));
});

test('unknown tag is an error', () => {
  assert.ok(validateSkill(withFm(common(), { tags: ['nope'] })).some(e => /tag/.test(e)));
});

test('applies_to with unknown domain is an error', () => {
  assert.ok(validateSkill(withFm(common(), { applies_to: ['domain:xyz'] })).some(e => /applies_to/.test(e)));
});

test('applies_to wildcard and known domain are accepted', () => {
  assert.deepStrictEqual(validateSkill(withFm(common(), { applies_to: ['*', 'domain:frontend'] })), []);
});

test('non-semver version is an error', () => {
  assert.ok(validateSkill(withFm(common(), { version: '1.0' })).some(e => /version/.test(e)));
});

test('missing README is an error', () => {
  assert.ok(validateSkill({ ...common(), hasReadme: false }).some(e => /README/.test(e)));
});

test('migration id must carry mig-<from>-to-<to>- prefix', () => {
  const errors = validateSkill(withFm(migration(), { id: 'mig-angular-to-pega-flow' }));
  assert.ok(errors.some(e => /prefijo/.test(e)));
});
