const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Las skills no usan YAML propio: las valida tools/validate/run.js sobre SKILL.md.
const REQUIRED_FIELDS = {
  agents:    ['name', 'version', 'description', 'model', 'maintainer'],
  mcps:      ['name', 'version', 'description', 'url', 'maintainer'],
  resources: ['name', 'version', 'description', 'maintainer'],
};

const ROOT = path.join(__dirname, '..', '..');
let hasErrors = false;

Object.entries(REQUIRED_FIELDS).forEach(([category, required]) => {
  const categoryPath = path.join(ROOT, category);
  if (!fs.existsSync(categoryPath)) return;

  fs.readdirSync(categoryPath)
    .filter(dir => !dir.startsWith('.'))
    .forEach(dir => {
      const dirPath = path.join(categoryPath, dir);
      if (!fs.statSync(dirPath).isDirectory()) return;

      const files = fs.readdirSync(dirPath);
      const yamlFile = files.find(f => f.endsWith('.yaml'));

      if (!yamlFile) {
        console.error(`ERROR: ${category}/${dir} no tiene fichero .yaml`);
        hasErrors = true;
        return;
      }

      try {
        const content = fs.readFileSync(path.join(dirPath, yamlFile), 'utf8');
        const data = yaml.load(content);

        required.forEach(field => {
          if (!data[field]) {
            console.error(`ERROR: ${category}/${dir}/${yamlFile} le falta el campo "${field}"`);
            hasErrors = true;
          }
        });

        if (!files.includes('README.md')) {
          console.warn(`WARN: ${category}/${dir} no tiene README.md`);
        }

      } catch (e) {
        console.error(`ERROR: no se puede parsear ${category}/${dir}/${yamlFile}:`, e.message);
        hasErrors = true;
      }
    });
});

if (hasErrors) {
  console.error('\nValidación fallida. Corrige los errores antes de mergear.');
  process.exit(1);
} else {
  console.log('Validación correcta.');
}