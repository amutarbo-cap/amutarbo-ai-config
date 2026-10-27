const fs = require('node:fs');

// Serializa el catálogo sin `generatedAt` para comparar contenido real.
function stable(catalog) {
  const { generatedAt, ...rest } = catalog;
  return JSON.stringify(rest);
}

// Escribe el catálogo solo si cambia algo distinto de `generatedAt`.
// Devuelve true si escribió el archivo.
function writeCatalogIfChanged(file, catalog) {
  try {
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (stable(existing) === stable(catalog)) return false;
  } catch {
    // No existe o JSON inválido: se escribe.
  }
  fs.writeFileSync(file, JSON.stringify(catalog, null, 2));
  return true;
}

module.exports = { writeCatalogIfChanged };
