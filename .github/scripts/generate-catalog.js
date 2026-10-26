const fs = require('fs');
const path = require('path');

const yaml = require('js-yaml');
const { parseFrontmatter } = require('../../tools/lib/frontmatter');
const { findSkillDirs } = require('../../tools/validate/run');

const CATEGORIES = ['agents', 'skills', 'mcps', 'resources'];
const ROOT = path.join(__dirname, '..', '..');

// Recorre skills/ en cualquier profundidad (common/, tech/<tech>/...) y mantiene la forma v1.
function readSkillFiles() {
  return findSkillDirs(ROOT, 'skills')
    .map(rel => {
      const dirPath = path.join(ROOT, rel);
      const files = fs.readdirSync(dirPath);

      try {
        const fileContent = fs.readFileSync(path.join(dirPath, 'SKILL.md'), 'utf8');
        const { data, body } = parseFrontmatter(fileContent, `${rel}/SKILL.md`);
        return {
          ...data,
          content: body.trim(),
          rawContent: fileContent,
          path: rel,
          hasReadme: files.includes('README.md'),
        };
      } catch (e) {
        console.warn(`Warning: no se pudo parsear ${rel}/SKILL.md:`, e.message);
        return null;
      }
    })
    .filter(Boolean);
}

function readYamlFiles(category) {
  const categoryPath = path.join(ROOT, category);

  if (!fs.existsSync(categoryPath)) return [];

  return fs.readdirSync(categoryPath)
    .filter(dir => {
      if (dir.startsWith('.')) return false;
      return fs.statSync(path.join(categoryPath, dir)).isDirectory();
    })
    .map(dir => {
      const dirPath = path.join(categoryPath, dir);
      const files = fs.readdirSync(dirPath);

      const yamlFile = files.find(f => f.endsWith('.yaml') && !f.startsWith('.'));
      if (!yamlFile) return null;

      try {
        const content = fs.readFileSync(path.join(dirPath, yamlFile), 'utf8');
        const data = yaml.load(content);
        return {
          ...data,
          path: `${category}/${dir}`,
          hasReadme: files.includes('README.md'),
        };
      } catch (e) {
        console.warn(`Warning: no se pudo parsear ${category}/${dir}/${yamlFile}:`, e.message);
        return null;
      }
    })
    .filter(Boolean);
}

const catalog = {
  version: '1.0.0',
  generatedAt: new Date().toISOString(),
  agents: readYamlFiles('agents'),
  skills: readSkillFiles(),
  mcps: readYamlFiles('mcps'),
  resources: readYamlFiles('resources'),
};

fs.writeFileSync(
  path.join(ROOT, 'CATALOG.json'),
  JSON.stringify(catalog, null, 2)
);

console.log(`CATALOG.json generado:`);
Object.entries(catalog).forEach(([key, val]) => {
  if (Array.isArray(val)) console.log(`  ${key}: ${val.length} items`);
});