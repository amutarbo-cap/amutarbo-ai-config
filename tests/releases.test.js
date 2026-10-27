const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { toCatalogEntries, fetchReleases, resolveReleases, readPreviousReleases } = require('../tools/catalog/releases');

const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'releases', 'api-releases.json'), 'utf8'));
const SOURCE = { name: 'brainforge-companion', repo: 'dmuleroa/dcx-brain-forge', asset_pattern: '*.vsix', max_releases: 10 };

function convert(source = SOURCE, warnings = []) {
  return toCatalogEntries(FIXTURE, source, { warn: m => warnings.push(m) });
}

test('maps the v0.2.8 release to a catalog version', () => {
  const entry = convert();
  assert.deepStrictEqual(entry.versions[0], {
    version: '0.2.8',
    tag: 'v0.2.8',
    publishedAt: '2026-10-26T08:46:34Z',
    asset: {
      name: 'brainforge-companion-0.2.8.vsix',
      size: 771527,
      sha256: 'a0e410aa3b4249b55d8887e34c6523f5f77ede51e270f158c95b9b29b106e695',
      assetId: 677555191,
    },
  });
});

test('gives sha256 null when the asset has no digest', () => {
  const releases = JSON.parse(JSON.stringify(FIXTURE));
  const rel = releases.find(r => !r.draft && !r.prerelease && r.tag_name === 'v0.2.8');
  rel.assets.forEach(a => { delete a.digest; });
  const out = toCatalogEntries(releases, SOURCE, { warn: () => {} });
  const v = out.versions.find(x => x.tag === 'v0.2.8');
  assert.ok(v);
  assert.strictEqual(v.asset.sha256, null);
});

test('skips drafts and prereleases so latest is the newest stable', () => {
  const entry = convert();
  assert.strictEqual(entry.latest, '0.2.8');
  assert.ok(!entry.versions.some(v => v.tag === 'v0.3.0' || v.tag === 'v0.3.0-rc.1'));
});

test('orders by publishedAt descending', () => {
  assert.deepStrictEqual(convert().versions.map(v => v.version), ['0.2.8', '0.2.7', '0.2.5']);
});

test('omits a release without a vsix and warns', () => {
  const warnings = [];
  const entry = convert(SOURCE, warnings);
  assert.ok(!entry.versions.some(v => v.tag === 'v0.2.6'));
  assert.ok(warnings.some(w => w.includes('v0.2.6')));
});

test('strips a missing v prefix only when present', () => {
  const v = convert().versions.find(x => x.tag === '0.2.5');
  assert.strictEqual(v.version, '0.2.5');
});

test('keeps only max_releases', () => {
  const entry = convert({ ...SOURCE, max_releases: 1 });
  assert.strictEqual(entry.versions.length, 1);
  assert.strictEqual(entry.latest, '0.2.8');
});

test('never leaks repo or notes', () => {
  const json = JSON.stringify(convert());
  assert.ok(!json.includes('dmuleroa'));
  for (const r of FIXTURE) assert.ok(!json.includes(r.body));
});

test('returns null latest and no versions when nothing matches', () => {
  const entry = convert({ ...SOURCE, asset_pattern: '*.zip' });
  assert.strictEqual(entry.latest, null);
  assert.deepStrictEqual(entry.versions, []);
});

// --- fetchReleases / resolveReleases / readPreviousReleases ---

const YAML_SRC = fs.readFileSync(path.join(__dirname, '..', 'sources', 'releases.yaml'), 'utf8');
const PREVIOUS = [{ name: 'brainforge-companion', latest: '0.1.0', versions: [] }];

function makeRoot(withYaml = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'releases-'));
  if (withYaml) {
    fs.mkdirSync(path.join(root, 'sources'));
    fs.writeFileSync(path.join(root, 'sources', 'releases.yaml'), YAML_SRC);
  }
  return root;
}

function okFetch(body, calls = []) {
  return async (url, init) => {
    calls.push({ url, init });
    return { ok: true, status: 200, json: async () => body };
  };
}

test('fetchReleases calls the releases endpoint with auth', async () => {
  const calls = [];
  const out = await fetchReleases('dmuleroa/dcx-brain-forge', { token: 'tok', fetch: okFetch(FIXTURE, calls) });
  assert.deepStrictEqual(out, FIXTURE);
  assert.strictEqual(calls[0].url, 'https://api.github.com/repos/dmuleroa/dcx-brain-forge/releases?per_page=100');
  assert.strictEqual(calls[0].init.headers.Authorization, 'Bearer tok');
  assert.strictEqual(calls[0].init.headers.Accept, 'application/vnd.github+json');
});

test('fetchReleases rejects on a non-ok response', async () => {
  const f = async () => ({ ok: false, status: 404 });
  await assert.rejects(fetchReleases('a/b', { token: 't', fetch: f }), /404/);
});

test('fetchReleases error does not leak the repo', async () => {
  const f = async () => ({ ok: false, status: 404 });
  await assert.rejects(
    fetchReleases(SOURCE.repo, { token: 't', fetch: f }),
    err => err.message.includes('404') && !err.message.includes(SOURCE.repo)
  );
});

test('fetchReleases passes an AbortSignal timeout', async () => {
  const calls = [];
  await fetchReleases('a/b', { token: 't', fetch: okFetch([], calls) });
  assert.ok(calls[0].init.signal instanceof AbortSignal);
});

test('resolveReleases warning names the source but not the repo', async () => {
  const warnings = [];
  const f = async () => ({ ok: false, status: 404 });
  await resolveReleases(makeRoot(), { previous: PREVIOUS, token: 'tok', fetch: f, warn: m => warnings.push(m) });
  assert.ok(warnings.some(w => w.includes(SOURCE.name) && w.includes('404')));
  assert.ok(warnings.every(w => !w.includes(SOURCE.repo)));
});

test('resolveReleases returns converted entries on success', async () => {
  const out = await resolveReleases(makeRoot(), { previous: PREVIOUS, token: 'tok', fetch: okFetch(FIXTURE), warn: () => {} });
  assert.strictEqual(out.length, 1);
  assert.strictEqual(out[0].name, 'brainforge-companion');
  assert.strictEqual(out[0].latest, '0.2.8');
});

test('resolveReleases keeps previous without a token', async () => {
  const calls = [];
  const warnings = [];
  const out = await resolveReleases(makeRoot(), { previous: PREVIOUS, fetch: okFetch(FIXTURE, calls), warn: m => warnings.push(m) });
  assert.deepStrictEqual(out, PREVIOUS);
  assert.strictEqual(calls.length, 0);
  assert.ok(warnings.length >= 1);
});

test('resolveReleases keeps previous when the API fails', async () => {
  const warnings = [];
  const f = async () => { throw new Error('red'); };
  const out = await resolveReleases(makeRoot(), { previous: PREVIOUS, token: 'tok', fetch: f, warn: m => warnings.push(m) });
  assert.deepStrictEqual(out, PREVIOUS);
  assert.ok(warnings.length >= 1);
});

test('resolveReleases keeps previous when the API returns an empty list', async () => {
  const out = await resolveReleases(makeRoot(), { previous: PREVIOUS, token: 'tok', fetch: okFetch([]), warn: () => {} });
  assert.deepStrictEqual(out, PREVIOUS);
});

test('resolveReleases keeps previous when no release has a vsix', async () => {
  const noVsix = FIXTURE.map(r => ({ ...r, assets: (r.assets || []).filter(a => !a.name.endsWith('.vsix')) }));
  const out = await resolveReleases(makeRoot(), { previous: PREVIOUS, token: 'tok', fetch: okFetch(noVsix), warn: () => {} });
  assert.deepStrictEqual(out, PREVIOUS);
});

test('resolveReleases returns [] when sources/releases.yaml is missing', async () => {
  const out = await resolveReleases(makeRoot(false), { previous: PREVIOUS, token: 'tok', fetch: okFetch(FIXTURE), warn: () => {} });
  assert.deepStrictEqual(out, []);
});

test('readPreviousReleases returns [] for a missing file, invalid JSON, or no releases key', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'prev-'));
  assert.deepStrictEqual(readPreviousReleases(path.join(dir, 'nope.json')), []);
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, '{not json');
  assert.deepStrictEqual(readPreviousReleases(bad), []);
  const nokey = path.join(dir, 'nokey.json');
  fs.writeFileSync(nokey, '{"a":1}');
  assert.deepStrictEqual(readPreviousReleases(nokey), []);
  const good = path.join(dir, 'good.json');
  fs.writeFileSync(good, JSON.stringify({ releases: PREVIOUS }));
  assert.deepStrictEqual(readPreviousReleases(good), PREVIOUS);
});
