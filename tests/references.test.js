const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { checkAgentSkillRefs } = require('../tools/validate/references');
const { buildCatalogV2 } = require('../tools/catalog/build-v2');
const { loadTaxonomy } = require('../tools/lib/taxonomy');

const REPO = path.join(__dirname, '..');
const EXTERNAL = ['sdd-'];

const catalog = (agentSkills) => ({
  skills: [{ id: 'common-accessibility' }],
  aliases: { 'accessibility-a11y': 'common-accessibility' },
  agents: [{ name: 'tester', skills: agentSkills }],
});

test('reference resolved by alias has no error', () => {
  assert.deepStrictEqual(checkAgentSkillRefs(catalog(['accessibility-a11y']), EXTERNAL), []);
});

test('reference resolved by id has no error', () => {
  assert.deepStrictEqual(checkAgentSkillRefs(catalog(['common-accessibility']), EXTERNAL), []);
});

test('external prefixed reference has no error', () => {
  assert.deepStrictEqual(checkAgentSkillRefs(catalog(['sdd-run']), EXTERNAL), []);
});

test('unresolved reference names the agent and the skill', () => {
  const errors = checkAgentSkillRefs(catalog(['inexistente']), EXTERNAL);
  assert.strictEqual(errors.length, 1);
  assert.ok(errors[0].includes('tester') && errors[0].includes('inexistente'));
});

test('every agent reference in this repo resolves', () => {
  const taxonomy = loadTaxonomy(REPO);
  const built = buildCatalogV2(REPO, { taxonomy, warn: () => {} });
  assert.deepStrictEqual(checkAgentSkillRefs(built, EXTERNAL), []);
});
