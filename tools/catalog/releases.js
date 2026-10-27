// Conversión de releases de la API REST de GitHub a entradas de catálogo.
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

module.exports = { toCatalogEntries };
