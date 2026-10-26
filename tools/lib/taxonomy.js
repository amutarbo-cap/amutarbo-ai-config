const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

function readList(root, file, key) {
  const full = path.join(root, 'taxonomy', file);
  try {
    const data = yaml.load(fs.readFileSync(full, 'utf8')) || {};
    return data[key] || [];
  } catch (e) {
    throw new Error(`no se puede parsear taxonomy/${file}: ${e.message}`);
  }
}

function loadTaxonomy(root) {
  const domains = new Set(readList(root, 'domains.yaml', 'domains'));
  const technologies = new Map(
    readList(root, 'technologies.yaml', 'technologies').map(t => [t.id, { domain: t.domain }])
  );
  const categories = new Set(readList(root, 'categories.yaml', 'categories'));
  const tags = new Set(readList(root, 'tags.yaml', 'tags'));
  return { domains, technologies, categories, tags };
}

module.exports = { loadTaxonomy };
