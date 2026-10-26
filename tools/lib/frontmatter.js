const yaml = require('js-yaml');

const FRONTMATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;

function parseFrontmatter(content, source = 'frontmatter') {
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(FRONTMATTER);
  if (!match) return { data: {}, body: content };
  try {
    return { data: yaml.load(match[1]) || {}, body: match[2] };
  } catch (e) {
    throw new Error(`${source}: frontmatter inválido: ${e.message}`);
  }
}

module.exports = { parseFrontmatter };
