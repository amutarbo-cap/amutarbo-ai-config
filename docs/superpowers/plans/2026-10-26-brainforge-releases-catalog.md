# Releases de BrainForge Companion en el catálogo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir una sección `releases` (metadatos del `.vsix` de `dmuleroa/dcx-brain-forge`) a `CATALOG.json` y `CATALOG.v2.json`, refrescada por cron sin exponer el repo privado.

**Architecture:** Un módulo `tools/catalog/releases.js` convierte la respuesta REST de GitHub en entradas de catálogo y aplica un respaldo al catálogo anterior si falla. Un helper `tools/lib/write-catalog.js` evita reescribir (y commitear) cuando solo cambia `generatedAt`. Ambos generadores (v1 en `.github/scripts/`, v2 en `tools/catalog/`) los usan, y el workflow gana un cron.

**Tech Stack:** Node 20 (CI) / `node:test`, `js-yaml`, `fetch` global, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-26-brainforge-releases-catalog-design.md`

## Global Constraints

- Rama de trabajo: `amutarbo-cap/Descargar-vsix` (ya rebasada sobre `origin/main`). No hacer push ni tocar `main`.
- `git` no tiene identidad configurada: commitear con `git -c user.name="amutarbo" -c user.email="amut.denia@gmail.com" commit ...`, sin modificar la configuración.
- Cada mensaje de commit termina con la línea `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- `CATALOG.json` y `CATALOG.v2.json` no se editan ni se commitean a mano: se generan solo para verificar y se restauran con `git checkout -- CATALOG.json CATALOG.v2.json`.
- El nombre del repo origen (`dmuleroa/dcx-brain-forge`) y las notas de la release **nunca** aparecen en ningún catálogo.
- Formato de `releases` (v1 y v2): `[{ name, latest, versions: [{ version, tag, publishedAt, asset: { name, size, sha256, assetId } }] }]`; `version` = tag sin la `v` inicial; `sha256` = `digest` sin el prefijo `sha256:`; `assetId` = `id` numérico REST.
- Se descartan borradores y prereleases; orden por `publishedAt` descendente; se conservan las primeras `max_releases` (10).
- v1: la raíz sigue con `version: "1.0.0"`. v2: `schemaVersion` pasa de `2.0.0` a `2.1.0`.
- Tests con `node:test` en `tests/*.test.js`, sin red (`fetch` inyectado). Comando: `npm test`.
- Texto de comentarios, README y avisos en español, como el resto del repo.

## Review Focus

1. Una release sin `.vsix` (solo `.whl`) se omite con aviso y no rompe la generación. → Task 1.
2. Un prerelease o borrador más reciente que la última estable no se convierte en `latest`. → Task 1.
3. Sin token (PR desde fork) el generador conserva `releases` anterior y continúa. → Task 3.
4. La API responde 200 con lista vacía o sin `.vsix` válido: se conserva lo anterior, no se vacía. → Task 3.
5. Solo cambia `generatedAt`: no se reescribe el archivo ni se crea commit. → Task 2.

---

### Task 1: Conversión de releases a entradas de catálogo

**Files:**
- Create: `tools/catalog/releases.js`
- Create: `tests/fixtures/releases/api-releases.json`
- Test: `tests/releases.test.js`

**Interfaces:**
- Produces: `toCatalogEntries(apiReleases: object[], source: {name: string, repo: string, asset_pattern: string, max_releases: number}, options?: {warn?: (msg: string) => void}) => {name: string, latest: string | null, versions: Version[]}`, con `Version` según el formato de Global Constraints. El módulo exporta un objeto (`module.exports = { toCatalogEntries, ... }`) que las tareas 3 añaden.

- [ ] **Step 1: Crear el fixture `tests/fixtures/releases/api-releases.json`**

Array con la forma REST de GitHub (`tag_name`, `draft`, `prerelease`, `published_at`, `assets[{id,name,size,digest}]`), en este orden deliberadamente desordenado. Solo `v0.2.8` es real; el resto es sintético:
  - `v0.2.7`: publicada `2026-10-23T12:45:52Z`, un asset `brainforge-companion-0.2.7.vsix` (id `1002`, size `770000`, digest `sha256:` + 64 `b`).
  - `v0.2.8`: publicada `2026-10-26T08:46:34Z`, assets reales: `brainforge-0.2.8-py3-none-any.whl` (id `677555187`, size `609461`), `brainforge-companion-0.2.8.vsix` (id `677555191`, size `771527`, digest `sha256:a0e410aa3b4249b55d8887e34c6523f5f77ede51e270f158c95b9b29b106e695`), `SHA256SUMS` (id `677555189`, size `198`).
  - `v0.3.0`: `draft: true`, `published_at: null`, con un `.vsix`.
  - `v0.3.0-rc.1`: `prerelease: true`, publicada `2026-10-26T09:00:00Z` (más reciente que v0.2.8), con un `.vsix`.
  - `v0.2.6`: publicada `2026-10-23T12:16:21Z`, solo un `.whl`.
  - `0.2.5` (tag sin `v`): publicada `2026-10-23T10:45:42Z`, un asset `brainforge-companion-0.2.5.vsix` (id `1005`, size `760000`, digest `sha256:` + 64 `c`).
  Todas con `name` igual al tag y un campo `body` con texto de notas (para probar que no se filtra).

- [ ] **Step 2: Escribir los tests en `tests/releases.test.js` (fallan)**

Con `source = { name: 'brainforge-companion', repo: 'dmuleroa/dcx-brain-forge', asset_pattern: '*.vsix', max_releases: 10 }` y el fixture:
  - `maps the v0.2.8 release to a catalog version`: `entry.versions[0]` es `deepStrictEqual` a `{ version: '0.2.8', tag: 'v0.2.8', publishedAt: '2026-10-26T08:46:34Z', asset: { name: 'brainforge-companion-0.2.8.vsix', size: 771527, sha256: 'a0e410aa3b4249b55d8887e34c6523f5f77ede51e270f158c95b9b29b106e695', assetId: 677555191 } }`.
  - `skips drafts and prereleases so latest is the newest stable`: `entry.latest === '0.2.8'` y ninguna versión con tag `v0.3.0` ni `v0.3.0-rc.1`.
  - `orders by publishedAt descending`: `entry.versions.map(v => v.version)` es `['0.2.8', '0.2.7', '0.2.5']`.
  - `omits a release without a vsix and warns`: `v0.2.6` no está en las versiones y un `warn` recolectado contiene `v0.2.6`.
  - `strips a missing v prefix only when present`: la versión de tag `0.2.5` es `'0.2.5'`.
  - `keeps only max_releases`: con `max_releases: 1`, `entry.versions.length === 1` y `entry.latest === '0.2.8'`.
  - `never leaks repo or notes`: `JSON.stringify(entry)` no contiene `dmuleroa` ni el texto del `body` del fixture.
  - `returns null latest and no versions when nothing matches`: con `asset_pattern: '*.zip'`, `entry.latest === null` y `entry.versions` es `[]`.

- [ ] **Step 3: Ejecutar y comprobar que fallan**

Run: `node --test tests/releases.test.js`
Expected: FAIL, `Cannot find module '../tools/catalog/releases'`.

- [ ] **Step 4: Implementar `toCatalogEntries` en `tools/catalog/releases.js`**

Convertir `asset_pattern` a regex escapando metacaracteres y tratando solo `*` como comodín, anclada al nombre completo. Filtrar `draft`/`prerelease`, elegir el primer asset que casa, avisar (vía `options.warn`, por defecto `console.warn`) por cada release sin asset, ordenar por `Date.parse(published_at)` descendente, recortar a `max_releases`, y construir `latest` como la `version` de la primera o `null`. Sin copiar `body` ni `source.repo`.

- [ ] **Step 5: Ejecutar y comprobar que pasan**

Run: `node --test tests/releases.test.js`
Expected: PASS (8 tests).

- [ ] **Step 6: Commit**

```bash
git add tools/catalog/releases.js tests/releases.test.js tests/fixtures/releases/api-releases.json
git commit -m "feat(catalog): convert GitHub releases into catalog entries"
```

---

### Task 2: Escritura del catálogo ignorando `generatedAt`

**Files:**
- Create: `tools/lib/write-catalog.js`
- Test: `tests/write-catalog.test.js`

**Interfaces:**
- Produces: `writeCatalogIfChanged(file: string, catalog: object) => boolean`. Devuelve `true` si escribió. Escribe `JSON.stringify(catalog, null, 2)`.

- [ ] **Step 1: Escribir los tests (fallan)**

Usando un directorio temporal (`fs.mkdtempSync(path.join(os.tmpdir(), 'wc-'))`):
  - `writes when the file does not exist`: devuelve `true` y el archivo parsea igual al catálogo.
  - `does not rewrite when only generatedAt changes`: escribir `{generatedAt:'a', x:1}`, fijar `mtime` antiguo con `fs.utimesSync`, llamar con `{generatedAt:'b', x:1}`: devuelve `false` y el contenido sigue con `generatedAt: 'a'`.
  - `rewrites when another field changes`: `{generatedAt:'a', x:1}` y luego `{generatedAt:'b', x:2}`: devuelve `true` y `x === 2`.
  - `rewrites when the existing file is not valid JSON`: devuelve `true`.

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `node --test tests/write-catalog.test.js`
Expected: FAIL, `Cannot find module '../tools/lib/write-catalog'`.

- [ ] **Step 3: Implementar `writeCatalogIfChanged(file, catalog)` en `tools/lib/write-catalog.js`**

Leer y parsear el existente (si falla o no existe, escribir); comparar `JSON.stringify` de ambos tras quitar `generatedAt`; escribir solo si difieren.

- [ ] **Step 4: Ejecutar y comprobar que pasan**

Run: `node --test tests/write-catalog.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add tools/lib/write-catalog.js tests/write-catalog.test.js
git commit -m "feat(catalog): skip rewriting catalogs when only generatedAt changes"
```

---

### Task 3: Obtención de releases con respaldo y configuración de fuentes

**Files:**
- Modify: `tools/catalog/releases.js`
- Create: `sources/releases.yaml`
- Test: `tests/releases.test.js` (añadir)

**Interfaces:**
- Consumes: `toCatalogEntries` (Task 1).
- Produces (añadir a `module.exports`):
  - `fetchReleases(repo: string, options: {token?: string, fetch?: typeof fetch}) => Promise<object[]>`
  - `readPreviousReleases(file: string) => object[]` (lee `releases` del JSON; `[]` si falta, es inválido o no tiene la clave)
  - `resolveReleases(root: string, options: {previous?: object[], token?: string, fetch?: typeof fetch, warn?: (msg: string) => void}) => Promise<object[]>`

- [ ] **Step 1: Crear `sources/releases.yaml`**

```yaml
sources:
  - name: brainforge-companion
    repo: dmuleroa/dcx-brain-forge
    asset_pattern: "*.vsix"
    max_releases: 10
```

- [ ] **Step 2: Añadir los tests (fallan)**

En `tests/releases.test.js`, con un `root` temporal que contiene `sources/releases.yaml` igual al de arriba, un `fetch` simulado que devuelve `{ ok: true, status: 200, json: async () => apiReleases }`, y `previous = [{ name: 'brainforge-companion', latest: '0.1.0', versions: [] }]`:
  - `fetchReleases calls the releases endpoint with auth`: el `fetch` recibe la URL `https://api.github.com/repos/dmuleroa/dcx-brain-forge/releases?per_page=100` y cabeceras con `Authorization: 'Bearer tok'` y `Accept: 'application/vnd.github+json'`.
  - `fetchReleases rejects on a non-ok response`: con `{ ok: false, status: 404 }` rechaza con un mensaje que incluye `404`.
  - `resolveReleases returns converted entries on success`: resultado de longitud 1 con `name === 'brainforge-companion'` y `latest === '0.2.8'`.
  - `resolveReleases keeps previous without a token`: sin `token`, devuelve `previous`, el `fetch` no se llama y hay un aviso.
  - `resolveReleases keeps previous when the API fails`: `fetch` que lanza `Error('red')`: devuelve `previous` y hay un aviso.
  - `resolveReleases keeps previous when the API returns an empty list`: `json: async () => []`: devuelve `previous`.
  - `resolveReleases keeps previous when no release has a vsix`: lista con solo la release `.whl`: devuelve `previous`.
  - `resolveReleases returns [] when sources/releases.yaml is missing`.
  - `readPreviousReleases returns [] for a missing file, invalid JSON, or no releases key`, y devuelve el array cuando existe.

- [ ] **Step 3: Ejecutar y comprobar que fallan**

Run: `node --test tests/releases.test.js`
Expected: FAIL, `fetchReleases is not a function` (y similares).

- [ ] **Step 4: Implementar las tres funciones en `tools/catalog/releases.js`**

`fetchReleases` usa `options.fetch ?? globalThis.fetch`, cabecera `User-Agent` y `Authorization` solo si hay token, y lanza `Error(\`GitHub API ${status} para ${repo}\`)` si `!ok`. `resolveReleases` carga `sources/releases.yaml` con `js-yaml` (falta → `[]`); por cada fuente: sin token → aviso y entrada previa del mismo `name`; con token → fetch + `toCatalogEntries`, y si `versions` queda vacío o hay error → aviso y entrada previa. Si no hay previa para esa fuente, la omite.

- [ ] **Step 5: Ejecutar y comprobar que pasan**

Run: `node --test tests/releases.test.js`
Expected: PASS (todos los tests del archivo).

- [ ] **Step 6: Commit**

```bash
git add sources/releases.yaml tools/catalog/releases.js tests/releases.test.js
git commit -m "feat(catalog): fetch releases with fallback to the previous catalog"
```

---

### Task 4: Catálogo v2 con `releases`

**Files:**
- Modify: `tools/catalog/build-v2.js` (función `buildCatalogV2`, línea ~109, y el bloque `if (require.main === module)`)
- Modify: `tests/build-v2.test.js:57`

**Interfaces:**
- Consumes: `resolveReleases`, `readPreviousReleases` (Task 3), `writeCatalogIfChanged` (Task 2).
- Produces: `buildCatalogV2(root, options)` acepta `options.releases` (array, por defecto `[]`) y devuelve `releases` en la raíz del catálogo.

- [ ] **Step 1: Actualizar y añadir tests (fallan)**

En `tests/build-v2.test.js`: cambiar la aserción de la línea 57 a `'2.1.0'`; en `catalog has the v2 top-level shape` añadir `assert.deepStrictEqual(catalog.releases, [])`; añadir `includes injected releases`, que llama a `buildCatalogV2(TREE, { now, taxonomy, warn, releases: [{ name: 'x', latest: '1.0.0', versions: [] }] })` y comprueba que `catalog.releases` es esa misma lista.

- [ ] **Step 2: Ejecutar y comprobar que fallan**

Run: `node --test tests/build-v2.test.js`
Expected: FAIL (`'2.0.0' !== '2.1.0'`, `releases` indefinido).

- [ ] **Step 3: Modificar `buildCatalogV2` y el CLI**

Cambiar `schemaVersion` a `'2.1.0'` y añadir `releases: options.releases ?? []` a la salida. En el bloque CLI: pasarlo a una función `async` que lee `readPreviousReleases(CATALOG.v2.json)`, llama a `resolveReleases(root, { previous, token: process.env.BRAINFORGE_TOKEN })`, construye con `buildCatalogV2(root, { releases })` y escribe con `writeCatalogIfChanged`. El `console.log` final incluye el número de entradas de `releases`.

- [ ] **Step 4: Ejecutar la suite completa**

Run: `npm test`
Expected: PASS, 0 fallos.

- [ ] **Step 5: Commit**

```bash
git add tools/catalog/build-v2.js tests/build-v2.test.js
git commit -m "feat(catalog): include releases in CATALOG.v2.json (schema 2.1.0)"
```

---

### Task 5: Catálogo v1 con `releases`

**Files:**
- Modify: `.github/scripts/generate-catalog.js` (bloque final que construye `catalog` y escribe el archivo)

**Interfaces:**
- Consumes: `resolveReleases`, `readPreviousReleases` (Task 3), `writeCatalogIfChanged` (Task 2).

El script v1 se ejecuta al cargarlo y no exporta nada, así que no tiene test unitario; se verifica ejecutándolo.

- [ ] **Step 1: Modificar el final de `generate-catalog.js`**

Envolver la construcción y escritura en una función `async main()`; leer `previous` con `readPreviousReleases` del `CATALOG.json` actual, resolver con `resolveReleases(ROOT, { previous, token: process.env.BRAINFORGE_TOKEN })`, añadir `releases` al objeto `catalog` (la raíz conserva `version: '1.0.0'`) y escribir con `writeCatalogIfChanged`. Invocar `main().catch(...)` terminando con `process.exit(1)` solo ante errores no controlados. El log final imprime también `releases: N items` (ya lo hace el bucle sobre arrays).

- [ ] **Step 2: Verificar sin token (respaldo)**

Run: `node .github/scripts/generate-catalog.js && node -e "const c=require('./CATALOG.json');console.log(c.version, Array.isArray(c.releases), c.releases.length)"`
Expected: un aviso por falta de token, y salida `1.0.0 true 0`.

- [ ] **Step 3: Restaurar y ejecutar la suite**

Run: `git checkout -- CATALOG.json && npm test`
Expected: `CATALOG.json` sin cambios y suite en PASS.

- [ ] **Step 4: Commit**

```bash
git add .github/scripts/generate-catalog.js
git commit -m "feat(catalog): include releases in CATALOG.json (v1)"
```

---

### Task 6: Workflow, gobierno y documentación

**Files:**
- Modify: `.github/workflows/generate-catalog.yml`
- Modify: `.github/CODEOWNERS`
- Modify: `README.md`
- Modify: `docs/consumers/README.md`

- [ ] **Step 1: Modificar `generate-catalog.yml`**

  - Añadir al bloque `on:` un `schedule` con `- cron: '*/30 * * * *'`.
  - Añadir a nivel raíz `concurrency: { group: "generate-catalog-${{ github.ref }}", cancel-in-progress: false }`.
  - Añadir `env: BRAINFORGE_TOKEN: ${{ secrets.BRAINFORGE_TOKEN }}` a los pasos `Generate CATALOG.json` y `Generate CATALOG.v2.json`.
  - Cambiar la condición del paso de commit de `github.event_name == 'push'` a `github.event_name != 'pull_request'`, para que el cron también commitee.

- [ ] **Step 2: Añadir `sources/  @amutarbo` a `.github/CODEOWNERS`.**

- [ ] **Step 3: Documentar en `README.md`**

Añadir `sources/` al árbol de la sección Estructura (`# Fuentes externas de releases`) y una sección corta "Releases externas" que explique: el formato de `sources/releases.yaml`, que el cron lo refresca cada 30 min, que requiere el secreto `BRAINFORGE_TOKEN` (PAT fine-grained, solo `Contents: read` sobre el repo origen) y que el nombre del repo origen no se publica en los catálogos.

- [ ] **Step 4: Añadir a `docs/consumers/README.md` una sección "IA-Portal: releases de BrainForge Companion"**

Con el contrato del spec §6 (declarar `releases` en `CatalogSchema`, mostrar `latest`, endpoint autenticado `GET /downloads/brainforge-companion/:version` que valida contra el catálogo y reenvía el asset con el token propio del portal, sin exponerlo al navegador) y el formato JSON de `releases`.

- [ ] **Step 5: Validar el YAML del workflow y la suite**

Run: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/generate-catalog.yml','utf8'))" && npm test`
Expected: sin errores y suite en PASS.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/generate-catalog.yml .github/CODEOWNERS README.md docs/consumers/README.md
git commit -m "ci(catalog): refresh releases on a schedule and document the contract"
```

---

### Task 7: Verificación de extremo a extremo contra la API real

**Files:** ninguno (solo verificación; no se commitea nada).

- [ ] **Step 1: Generar ambos catálogos con un token de lectura**

Run: `BRAINFORGE_TOKEN="$(gh auth token)" node .github/scripts/generate-catalog.js && BRAINFORGE_TOKEN="$(gh auth token)" node tools/catalog/build-v2.js`
Expected: sin avisos de token; cada log indica `releases: 1 items` (v2: incluye el número de entradas de `releases`).

- [ ] **Step 2: Comprobar el contenido**

Run: `node -e "for (const f of ['CATALOG.json','CATALOG.v2.json']) { const r=require('./'+f).releases[0]; console.log(f, r.name, r.latest, r.versions.length, r.versions[0].asset.assetId, r.versions[0].asset.sha256.length) }"`
Expected: para ambos, `brainforge-companion`, un `latest` igual al tag más reciente sin `v` (hoy `0.2.8` o superior), entre 1 y 10 versiones, un `assetId` numérico y `sha256` de 64 caracteres.

- [ ] **Step 3: Comprobar que nada privado se publica**

Run: `grep -c "dmuleroa/dcx-brain-forge" CATALOG.json CATALOG.v2.json`
Expected: `CATALOG.json:0` y `CATALOG.v2.json:0`.

- [ ] **Step 4: Comprobar que una segunda ejecución no reescribe**

Run: `stat -f %m CATALOG.json > /tmp/m1 && sleep 2 && BRAINFORGE_TOKEN="$(gh auth token)" node .github/scripts/generate-catalog.js && stat -f %m CATALOG.json | diff - /tmp/m1 && echo SIN-CAMBIOS`
Expected: `SIN-CAMBIOS`.

- [ ] **Step 5: Restaurar los catálogos y ejecutar la suite final**

Run: `git checkout -- CATALOG.json CATALOG.v2.json && npm test && git status --short`
Expected: suite en PASS y `git status` sin cambios pendientes.

---

## Acciones manuales fuera del código

1. Crear el PAT fine-grained con solo `Contents: read` sobre `dmuleroa/dcx-brain-forge` (lo debe generar quien tenga acceso a ese repo) y guardarlo como secreto `BRAINFORGE_TOKEN` en `amutarbo-cap/capgemini-ai-config` (Settings → Secrets and variables → Actions). Sin él, el cron conserva las releases anteriores y avisa, pero no las actualiza.
2. Parte B (IA-Portal): implementar el contrato de `docs/consumers/README.md` en un ciclo aparte.
