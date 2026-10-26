const path = require('path');
const { buildCatalogV2 } = require('../catalog/build-v2');

// Cada `skills:` de un agente debe resolver a un ID, a un alias o a un prefijo externo.
function checkAgentSkillRefs(catalog, externalPrefixes = []) {
  const ids = new Set(catalog.skills.map(s => s.id));
  const aliases = catalog.aliases || {};
  const errors = [];

  for (const agent of catalog.agents) {
    for (const ref of agent.skills || []) {
      const resolves = ids.has(ref)
        || ids.has(aliases[ref])
        || externalPrefixes.some(p => ref.startsWith(p));
      if (!resolves) errors.push(`agente ${agent.name || agent.path}: skill no resuelve: ${ref}`);
    }
  }
  return errors;
}

module.exports = { checkAgentSkillRefs };

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const catalog = buildCatalogV2(root, { warn: () => {} });
  const { prefixes } = require('js-yaml').load(require('fs').readFileSync(path.join(root, 'taxonomy', 'external-skills.yaml'), 'utf8'));
  const errors = checkAgentSkillRefs(catalog, prefixes);
  errors.forEach(e => console.error(`ERROR: ${e}`));
  console.log(errors.length ? `Referencias de agentes fallidas: ${errors.length}.` : 'Referencias de agentes correctas.');
  process.exit(errors.length ? 1 : 0);
}
