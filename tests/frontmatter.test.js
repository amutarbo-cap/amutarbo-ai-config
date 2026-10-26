const test = require('node:test');
const assert = require('node:assert');
const { parseFrontmatter } = require('../tools/lib/frontmatter');

test('parses frontmatter and body', () => {
  const { data, body } = parseFrontmatter('---\nname: a\ndescription: b\n---\nBody');
  assert.deepStrictEqual(data, { name: 'a', description: 'b' });
  assert.strictEqual(body, 'Body');
});

test('accepts CRLF line endings', () => {
  const { data, body } = parseFrontmatter('---\r\nname: a\r\ndescription: b\r\n---\r\nBody');
  assert.deepStrictEqual(data, { name: 'a', description: 'b' });
  assert.strictEqual(body, 'Body');
});

test('returns empty data when there is no frontmatter block', () => {
  const { data, body } = parseFrontmatter('Just text');
  assert.deepStrictEqual(data, {});
  assert.strictEqual(body, 'Just text');
});

test('invalid YAML throws an error that names the source path', () => {
  assert.throws(
    () => parseFrontmatter('---\nname: [unclosed\n---\n', 'skills/x/SKILL.md'),
    /skills\/x\/SKILL\.md/
  );
});
