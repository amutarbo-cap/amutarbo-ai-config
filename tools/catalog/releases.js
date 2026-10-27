// Conversión de releases de la API REST de GitHub a entradas de catálogo.
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

// No se copian ni el repo de origen ni las notas (body) al resultado.

// Patrón tipo glob: solo '*' es comodín; el resto se escapa. Anclado al nombre completo.
function patternToRegex(pattern) {
  const escaped = String(pattern)
    .split('*')
    .map(p => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

function stripV(tag) {
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

function toCatalogEntries(apiReleases, source, options = {}) {
  const warn = options.warn || (m => console.warn(m));
  const re = patternToRegex(source.asset_pattern);
  const versions = [];

  for (const rel of apiReleases) {
    if (rel.draft || rel.prerelease) continue;
    const asset = (rel.assets || []).find(a => re.test(a.name));
    if (!asset) {
      warn(`Release ${rel.tag_name} sin asset que case con ${source.asset_pattern}: omitida`);
      continue;
    }
    versions.push({
      version: stripV(rel.tag_name),
      tag: rel.tag_name,
      publishedAt: rel.published_at,
      asset: {
        name: asset.name,
        size: asset.size,
        sha256: String(asset.digest || '').replace(/^sha256:/, ''),
        assetId: asset.id,
      },
    });
  }

  versions.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
  const kept = versions.slice(0, source.max_releases);
  return { name: source.name, latest: kept.length ? kept[0].version : null, versions: kept };
}

async function fetchReleases(repo, options = {}) {
  const doFetch = options.fetch ?? globalThis.fetch;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'capgemini-ai-config-catalog',
  };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  const res = await doFetch(`https://api.github.com/repos/${repo}/releases?per_page=100`, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status} para ${repo}`);
  return res.json();
}

function readPreviousReleases(file) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return data && Array.isArray(data.releases) ? data.releases : [];
  } catch {
    return [];
  }
}

async function resolveReleases(root, options = {}) {
  const warn = options.warn || (m => console.warn(m));
  const previous = options.previous || [];
  const file = path.join(root, 'sources', 'releases.yaml');
  if (!fs.existsSync(file)) return [];
  const config = yaml.load(fs.readFileSync(file, 'utf8')) || {};
  const result = [];

  for (const source of config.sources || []) {
    const prev = previous.find(p => p.name === source.name);
    let entry = null;
    if (!options.token) {
      warn(`Sin token de GitHub: se conserva el catálogo previo de releases para ${source.name}`);
    } else {
      try {
        const api = await fetchReleases(source.repo, { token: options.token, fetch: options.fetch });
        const converted = toCatalogEntries(api, source, { warn });
        if (converted.versions.length) entry = converted;
        else warn(`Sin releases válidas para ${source.name}: se conserva el catálogo previo`);
      } catch (err) {
        warn(`No se pudieron obtener las releases de ${source.name} (${err.message}): se conserva el catálogo previo`);
      }
    }
    if (!entry) entry = prev;
    if (entry) result.push(entry);
  }
  return result;
}

module.exports = { toCatalogEntries, fetchReleases, readPreviousReleases, resolveReleases };
