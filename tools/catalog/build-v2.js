const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { parseFrontmatter } = require('../lib/frontmatter');
const { loadTaxonomy } = require('../lib/taxonomy');
const { findSkillDirs } = require('../validate/run');

const LIST_FIELDS = ['applies_to', 'tags', 'requires'];

// Lista ficheros de una carpeta de skill, en rutas relativas posix, sin entradas ocultas.
function listFiles(dir, rel = '') {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true })
    .filter(e => !e.name.startsWith('.'))
    .flatMap(e => {
      const childRel = path.posix.join(rel, e.name);
      return e.isDirectory() ? listFiles(dir, childRel) : [childRel];
    });
}

// Hash sobre cada fichero (ruta + contenido binario), en orden de ruta.
function skillChecksum(dir) {
  const hash = crypto.createHash('sha256');
  for (const rel of listFiles(dir).sort()) {
    hash.update(rel);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(dir, rel)));
    hash.update('\0');
  }
  return `sha256:${hash.digest('hex')}`;
}

function readYamlDirs(root, category) {
  const base = path.join(root, category);
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base, { withFileTypes: true })
    .filter(e => !e.name.startsWith('.') && e.isDirectory())
    .flatMap(e => {
      const files = fs.readdirSync(path.join(base, e.name));
      const yamlFile = files.find(f => f.endsWith('.yaml') && !f.startsWith('.'));
      if (!yamlFile) return [];
      const data = yaml.load(fs.readFileSync(path.join(base, e.name, yamlFile), 'utf8'));
      return [{ ...data, path: `${category}/${e.name}`, hasReadme: files.includes('README.md') }];
    });
}

function readAliases(root) {
  const file = path.join(root, 'taxonomy', 'aliases.yaml');
  if (!fs.existsSync(file)) return {};
  return yaml.load(fs.readFileSync(file, 'utf8')) || {};
}

function add(index, key, id) {
  (index[key] = index[key] || []).push(id);
}

function buildCatalogV2(root, options = {}) {
  const now = options.now || new Date();
  const warn = options.warn || console.warn;
  const taxonomy = options.taxonomy || loadTaxonomy(root);

  const seen = new Map();
  const skills = [];
  const index = { byTag: {}, byTechnology: {}, byDomain: {}, migrations: {} };

  for (const rel of findSkillDirs(root, 'skills')) {
    const file = `${rel}/SKILL.md`;
    let fm;
    try {
      ({ data: fm } = parseFrontmatter(fs.readFileSync(path.join(root, file), 'utf8'), file));
    } catch (e) {
      warn(`${file}: omitida: ${e.message}`);
      continue;
    }

    const id = fm.id || fm.name;
    if (seen.has(id)) throw new Error(`id duplicado ${id}: ${seen.get(id)} y ${rel}`);
    seen.set(id, rel);

    const entry = {
      id,
      version: fm.version ?? null,
      kind: fm.kind ?? null,
      category: fm.category ?? null,
      technology: fm.technology ?? null,
      applies_to: fm.applies_to || [],
      tags: fm.tags || [],
      requires: fm.requires || [],
      status: fm.status ?? null,
      path: rel,
      checksum: skillChecksum(path.join(root, rel)),
      description: fm.description ?? null,
    };
    skills.push(entry);

    for (const tag of entry.tags) add(index.byTag, tag, id);
    if (entry.technology) {
      add(index.byTechnology, entry.technology, id);
      const tech = taxonomy.technologies.get(entry.technology);
      if (tech) add(index.byDomain, tech.domain, id);
    }
    for (const target of entry.applies_to) {
      if (String(target).startsWith('domain:')) add(index.byDomain, target.slice('domain:'.length), id);
    }
    if (fm.kind === 'migration') add(index.migrations, `${fm.from}->${fm.to}`, id);
  }

  return {
    schemaVersion: '2.0.0',
    generatedAt: now.toISOString(),
    skills,
    agents: readYamlDirs(root, 'agents'),
    mcps: readYamlDirs(root, 'mcps'),
    profiles: [],
    scenarios: [],
    aliases: readAliases(root),
    index,
  };
}

module.exports = { buildCatalogV2, skillChecksum };

if (require.main === module) {
  const root = path.join(__dirname, '..', '..');
  const catalog = buildCatalogV2(root);
  fs.writeFileSync(path.join(root, 'CATALOG.v2.json'), JSON.stringify(catalog, null, 2));
  console.log(`CATALOG.v2.json generado: ${catalog.skills.length} skills, ${catalog.agents.length} agents, ${catalog.mcps.length} mcps`);
}
