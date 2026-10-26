const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('../lib/frontmatter');
const { loadTaxonomy } = require('../lib/taxonomy');
const { validateSkill } = require('./skill');

// Devuelve las carpetas relativas que contienen SKILL.md. Ignora entradas
// ocultas (.DS_Store, .example) y no desciende dentro de una skill.
function findSkillDirs(root, rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) return [];
  return fs.readdirSync(abs, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.isDirectory())
    .flatMap(e => {
      const childRel = path.posix.join(rel, e.name);
      if (fs.existsSync(path.join(root, childRel, 'SKILL.md'))) return [childRel];
      return findSkillDirs(root, childRel);
    });
}

function validateRepo(root, taxonomy) {
  const errors = [];
  const warnings = [];

  for (const rel of findSkillDirs(root, 'skills')) {
    const file = `${rel}/SKILL.md`;
    let frontmatter;
    try {
      ({ data: frontmatter } = parseFrontmatter(fs.readFileSync(path.join(root, file), 'utf8'), file));
    } catch (e) {
      warnings.push(`${file}: omitida por frontmatter inválido: ${e.message}`);
      continue;
    }

    if (!frontmatter.kind) {
      warnings.push(`${rel}: pendiente de migración (sin kind)`);
      continue;
    }

    const hasReadme = fs.existsSync(path.join(root, rel, 'README.md'));
    for (const message of validateSkill({ dir: rel, frontmatter, hasReadme, taxonomy })) {
      errors.push(`${file}: ${message}`);
    }
  }

  return { errors, warnings };
}

module.exports = { validateRepo, findSkillDirs };

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const { errors, warnings } = validateRepo(root, loadTaxonomy(root));
  warnings.forEach(w => console.warn(`WARN: ${w}`));
  errors.forEach(e => console.error(`ERROR: ${e}`));
  console.log(errors.length ? `Validación de skills fallida: ${errors.length} error(es).` : 'Validación de skills correcta.');
  process.exit(errors.length ? 1 : 0);
}
