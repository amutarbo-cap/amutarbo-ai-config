const ID_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const CUE_RE = /(úsala|\busa\b|use when|trigger)/i;
const SEMVER_RE = /^\d+\.\d+\.\d+$/;
const KINDS = ['common', 'tech', 'migration'];

function validateSkill({ dir, frontmatter: fm, hasReadme, taxonomy }) {
  const errors = [];
  const err = message => errors.push(message);

  if (!fm.name) err('falta name');
  if (!fm.description) err('falta description');
  else if (!CUE_RE.test(fm.description)) err('description sin cláusula de uso ("Úsala cuando…" / "Use when…")');

  if (!KINDS.includes(fm.kind)) {
    err(`kind inválido: ${fm.kind}`);
    return errors;
  }

  if (!fm.id || !ID_RE.test(fm.id)) err(`id inválido: ${fm.id}`);

  let expectedDir = null;
  if (fm.kind === 'common') {
    if (!String(fm.id).startsWith('common-')) err('prefijo de id debe ser common-');
    expectedDir = `skills/common/${fm.id}`;
  } else if (fm.kind === 'tech') {
    if (!taxonomy.technologies.has(fm.technology)) err(`technology desconocida: ${fm.technology}`);
    if (!String(fm.id).startsWith(`${fm.technology}-`)) err(`prefijo de id debe ser ${fm.technology}-`);
    expectedDir = `skills/tech/${fm.technology}/${fm.id}`;
  } else {
    if (!fm.from || !fm.to) err('falta from/to en migration');
    if (!String(fm.id).startsWith(`mig-${fm.from}-to-${fm.to}-`)) err(`prefijo de id debe ser mig-${fm.from}-to-${fm.to}-`);
    expectedDir = `skills/migrations/${fm.from}-to-${fm.to}/${fm.id}`;
  }
  if (dir !== expectedDir) err(`ruta debe ser ${expectedDir}, es ${dir}`);

  if (!taxonomy.categories.has(fm.category)) err(`category desconocida: ${fm.category}`);

  for (const tag of fm.tags || []) {
    if (!taxonomy.tags.has(tag)) err(`tag desconocido: ${tag}`);
  }

  for (const target of fm.applies_to || []) {
    if (target === '*') continue;
    if (target.startsWith('domain:')) {
      if (!taxonomy.domains.has(target.slice('domain:'.length))) err(`applies_to inválido: ${target}`);
    } else if (!taxonomy.technologies.has(target)) {
      err(`applies_to inválido: ${target}`);
    }
  }

  if (!SEMVER_RE.test(String(fm.version))) err(`version debe ser semver x.y.z: ${fm.version}`);
  if (!hasReadme) err('falta README.md');

  return errors;
}

module.exports = { validateSkill };
