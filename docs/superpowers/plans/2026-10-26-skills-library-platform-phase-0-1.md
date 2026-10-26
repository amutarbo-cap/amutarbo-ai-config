# Biblioteca de skills — Implementación fases 0 y 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar el repo con un modelo de skills agrupado por tipo y tecnología, validado en CI, con `CATALOG.v2.json` generado en paralelo al v1 y los 8 activos restantes migrados a sus IDs nuevos.

**Architecture:** Un módulo de frontmatter compartido alimenta un validador y un generador de catálogo v2 recursivo. Los scripts viven en `tools/` y la CI los ejecuta en PR y en push. Las skills se mueven con `git mv` y se referencian por ID; un mapa de alias en el catálogo permite a los agentes seguir funcionando durante la transición.

**Tech Stack:** Node.js 20, `js-yaml` (ya en `package.json`), `node:test` y `node:assert` (built-in, sin dependencias nuevas), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-26-skills-library-platform-design.md` (commit `8a2a8d9`). Este plan implementa solo las fases 0 y 1, secciones 3, 4, 6, 7, 8, 12 y 13 de la spec, más los cambios de la §14 que son de este repo.

## Global Constraints

- Semver obligatorio: `version: x.y.z` en cada activo (CLAUDE.md). Para skills, ver decisión D3.
- `CATALOG.json` nunca se edita a mano. Lo genera la CI (CLAUDE.md).
- Cada agente, skill y MCP tiene su carpeta con `README.md` (CLAUDE.md), ver decisión D5.
- Un ID de skill es inmutable. Un renombrado conserva el nombre antiguo como alias (spec §6).
- Ningún archivo de skill puede existir en dos rutas (spec §13).
- Sin dependencias nuevas en `package.json` salvo que una tarea lo diga explícitamente.
- Commits con el trailer `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. Si Git no tiene identidad configurada, usar `git -c user.name=amutarbo -c user.email=amut.denia@gmail.com commit` solo para ese commit, sin tocar la configuración global.
- No hacer `git push` ni abrir PR sin aprobación explícita.
- Los 4 `openspec-*` y `qa-test-planner` se eliminan (spec §12). Son 13 skills actuales, así que tras la eliminación quedan 8. La spec dice "13 skills" en §13: corregir a 8 al cerrar la fase 1.

## Decisiones pendientes

Estas decisiones bloquean las tareas indicadas. Ninguna se resuelve en implementación: si no hay respuesta, la tarea se detiene en ese punto y se pregunta.

- **D1 — Clasificación de `typescript-expert`, `mcp-builder`, `ui-ux-pro-max`.** Bloquea T1.1 para esas tres skills. `typescript-expert` además la referencian agentes (T1.2). Pendiente de respuesta.
- **D2 — `skills/.example/`.** La spec la retira, pero CLAUDE.md dice "Usa `.example/` como plantilla para cualquier elemento nuevo". Bloquea T1.4. Opciones: (a) retirarla y actualizar CLAUDE.md; (b) mantenerla. Pendiente.
- **D3 — Dónde van los metadatos de las skills existentes.** Ninguna de las 13 tiene `version`, y varias parecen de terceros (p. ej. `angular-developer` trae `license` y `metadata.author` de Google). Añadir campos al frontmatter modifica el texto original. Recomendación por defecto: fichero `skill.meta.yaml` junto a `SKILL.md` para las skills de terceros, sin tocar su `SKILL.md`. Bloquea T0.3 (lectura de metadatos) y T1.1. Pendiente de confirmar.
- **D4 — Coexistencia de catálogos.** La spec pide `CATALOG.json` v2 y v1 en paralelo, que no caben en el mismo nombre. Recomendación por defecto: v1 sigue en `CATALOG.json` y el v2 se escribe en `CATALOG.v2.json`; al cerrar la migración de consumidores se intercambian. Bloquea T0.4. Pendiente.
- **D5 — README por skill.** CLAUDE.md lo exige y la spec no lo menciona. Recomendación por defecto: el validador avisa (como hace hoy `validate-yamls.js` para agentes) y no falla. Bloquea T0.3. Pendiente.

## Review Focus

Entradas y fallos probables que ninguna tarea cubre de forma explícita, en orden de probabilidad:

1. **Frontmatter mal formado en una skill de terceros** (YAML inválido o sin cierre `---`). Debe avisar y omitir esa skill, no tumbar el catálogo entero. Lo mismo ocurre hoy en `generate-catalog.js`.
2. **Finales de línea CRLF** en `SKILL.md`. `parseFrontmatter` debe seguir funcionando.
3. **Dos skills con el mismo ID** en carpetas distintas. El build debe fallar y nombrar ambas rutas.
4. **Ficheros ocultos o no-directorios bajo `skills/`** (p. ej. `.DS_Store`, `.example`). Deben ignorarse, no tratarse como skills.
5. **Ficheros binarios o no UTF-8 dentro de una skill** (scripts, imágenes). El checksum debe leer búferes, no texto, o fallará con los assets de `skills/accessibility-a11y/` o `skills/ui-ux-pro-max/`.

Cada línea se verifica en la tarea que posee el código (T0.3 o T0.4), con su test propio.

---

## Mapa de ficheros

| Fichero | Responsabilidad | Tarea |
|---|---|---|
| `package.json` | script `test` | T0.1 |
| `tests/` | tests `node:test` | T0.1–T0.4 |
| `taxonomy/technologies.yaml` | tecnología → dominio | T0.2 |
| `taxonomy/domains.yaml` | dominios válidos | T0.2 |
| `taxonomy/categories.yaml` | categorías válidas | T0.2 |
| `taxonomy/tags.yaml` | vocabulario de tags | T0.2 |
| `tools/lib/frontmatter.js` | parseo de frontmatter (extraído de `generate-catalog.js`) | T0.3 |
| `tools/lib/taxonomy.js` | carga y consulta de `taxonomy/` | T0.2 |
| `tools/validate/skill.js` | reglas de una skill | T0.3 |
| `tools/validate/run.js` | CLI del validador (recorre todo el repo) | T0.3 |
| `tools/catalog/build-v2.js` | construcción de `CATALOG.v2.json` | T0.4 |
| `.github/scripts/generate-catalog.js` | catálogo v1 (sin cambio de salida) | T0.4 |
| `.github/CODEOWNERS` | propiedad por carpeta | T0.5 |
| `.github/PULL_REQUEST_TEMPLATE.md` | checklist de PR | T0.5 |
| `.github/workflows/validate-pr.yml` | CI de PR: test + validador | T0.6 |
| `.github/workflows/generate-catalog.yml` | genera v1 y v2 | T0.6 |
| `skills/common/…`, `skills/tech/…` | skills migradas | T1.1 |
| `agents/*/*.yaml` | referencias a skills | T1.2 |
| `.github/actions/sync-ai-config/action.yml` | valores por defecto de `paths` | T1.3 |

---

## Fase 0 — Cimientos

### Task T0.1: Harness de tests

**Files:**
- Modify: `package.json`
- Create: `tests/smoke.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `npm test` ejecuta `node --test tests/`. Todas las tareas siguientes añaden tests bajo `tests/`.

- [ ] **Step 1: Escribir el test de humo**

```js
const test = require('node:test');
const assert = require('node:assert');

test('harness runs', () => {
  assert.strictEqual(1 + 1, 2);
});
```

- [ ] **Step 2: Añadir el script**

En `package.json`, añadir `"scripts": { "test": "node --test tests/" }`. No añadir dependencias.

- [ ] **Step 3: Verificar**

Run: `npm test`
Expected: `# pass 1`, `# fail 0`.

- [ ] **Step 4: Commit**

```bash
git add package.json tests/smoke.test.js
git commit -m "test: add node:test harness"
```

### Task T0.2: Taxonomía (vocabulario controlado)

**Files:**
- Create: `taxonomy/domains.yaml`, `taxonomy/technologies.yaml`, `taxonomy/categories.yaml`, `taxonomy/tags.yaml`
- Create: `tools/lib/taxonomy.js`
- Test: `tests/taxonomy.test.js`

**Interfaces:**
- Consumes: nada
- Produces: `loadTaxonomy(root: string) -> { domains: Set<string>, technologies: Map<string, { domain: string }>, categories: Set<string>, tags: Set<string> }`

Contenido inicial (de la spec §4 y §6):
- `domains.yaml`: `frontend`, `backend`, `mobile`, `low-code`.
- `technologies.yaml`: angular, react, vue → frontend; nodejs, spring-boot → backend; ios, android → mobile; servicenow, pega, salesforce → low-code.
- `categories.yaml`: quality, security, architecture, documentation, delivery, ux, data, migration, build.
- `tags.yaml`: lista de los tags ya usados en `agents/*/*.yaml` y `skills/*/SKILL.md` (ver `grep`), sin sinónimos. Cualquier tag nuevo se añade aquí en el mismo PR.

- [ ] **Step 1: Escribir los tests**

Test de que `loadTaxonomy` devuelve las cuatro colecciones, que cada tecnología apunta a un dominio existente, y que no hay IDs repetidos en `technologies.yaml`:

```js
test('every technology points to a known domain', () => {
  const t = loadTaxonomy(ROOT);
  for (const [id, { domain }] of t.technologies) {
    assert.ok(t.domains.has(domain), `${id} → dominio desconocido ${domain}`);
  }
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test -- tests/taxonomy.test.js`
Expected: FAIL, `loadTaxonomy` no existe.

- [ ] **Step 3: Crear los YAML y `tools/lib/taxonomy.js`**

Implementar `loadTaxonomy` con `js-yaml`. Lanza error si un YAML no parsea.

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `npm test`
Expected: todos pasan.

- [ ] **Step 5: Commit**

```bash
git add taxonomy tools/lib/taxonomy.js tests/taxonomy.test.js
git commit -m "feat(taxonomy): add controlled vocabulary for skills"
```

### Task T0.3: Frontmatter compartido y validador de skills

**Files:**
- Create: `tools/lib/frontmatter.js`, `tools/validate/skill.js`, `tools/validate/run.js`
- Modify: `.github/scripts/generate-catalog.js` (usar `tools/lib/frontmatter.js`, sin cambiar la salida)
- Test: `tests/frontmatter.test.js`, `tests/validate-skill.test.js`, fixtures en `tests/fixtures/skills/`

**Interfaces:**
- Consumes: `loadTaxonomy` (T0.2)
- Produces:
  - `parseFrontmatter(content: string) -> { data: object, body: string }`. Acepta CRLF. Si no hay bloque, devuelve `data: {}`. Si el YAML es inválido, lanza `Error` con la ruta.
  - `validateSkill({ dir, frontmatter, meta, taxonomy }) -> string[]`. Devuelve errores vacíos si la skill es válida. `meta` es el contenido de `skill.meta.yaml` si existe (D3).
  - `run.js`: recorre `skills/`, imprime errores y avisos, sale con código 1 si hay errores.

**Reglas de `validateSkill`** (solo para skills con `kind` declarado; las que no lo tienen se reportan como aviso "pendiente de migración" hasta T1.1, tras lo cual pasan a error):

1. `name` y `description` obligatorios. `description` debe contener una cláusula de uso (`/úsala|usa|use when|trigger/i`).
2. `kind` ∈ {`common`, `tech`, `migration`}.
3. `id` coincide con `^(common|[a-z0-9]+|mig-[a-z0-9]+-to-[a-z0-9]+)-[a-z0-9-]+$` y su prefijo corresponde a `kind`.
4. La ruta cumple la convención: `common` → `skills/common/<id>`; `tech` → `skills/tech/<technology>/<id>`; `migration` → `skills/migrations/<from>-to-<to>/<id>`.
5. `category` ∈ `taxonomy.categories`. `technology` ∈ `taxonomy.technologies`.
6. Cada tag ∈ `taxonomy.tags`.
7. Cada entrada de `applies_to` es `*`, `domain:<d>` con `d` en `taxonomy.domains`, o un ID de tecnología.
8. `version` cumple semver `x.y.z` (en `meta` o en frontmatter según D3).
9. Si no hay `README.md` en la carpeta: aviso (D5), no error.

- [ ] **Step 1: Tests de `parseFrontmatter`**

Casos: frontmatter normal, CRLF (Review Focus 2), sin bloque, YAML inválido (lanza con la ruta). Mapea a Review Focus 1 en el generador, que debe capturar el error y avisar.

- [ ] **Step 2: Tests de `validateSkill`**

Un test por regla de la lista, con un fixture válido y uno roto por caso. Incluir un caso de ID con prefijo distinto a `kind`.

- [ ] **Step 3: Test de ficheros ignorados (Review Focus 4)**

`run.js` no debe tratar `.DS_Store` ni `.example` como skill.

- [ ] **Step 4: Ejecutar y ver que fallan**

Run: `npm test`
Expected: FAIL en los tests nuevos.

- [ ] **Step 5: Implementar `frontmatter.js`, `skill.js` y `run.js`**

Mover `parseFrontmatter` de `generate-catalog.js` a `tools/lib/frontmatter.js` sin cambiar su comportamiento para el catálogo v1. Verificar después que `node .github/scripts/generate-catalog.js` produce el mismo `CATALOG.json` que antes (diff vacío salvo `generatedAt`).

- [ ] **Step 6: Ejecutar y ver que pasan**

Run: `npm test && node tools/validate/run.js`
Expected: tests pasan; `run.js` muestra avisos de "pendiente de migración" para las 13 skills y sale con 0.

- [ ] **Step 7: Commit**

```bash
git add tools/lib/frontmatter.js tools/validate tests .github/scripts/generate-catalog.js
git commit -m "feat(validate): add skill frontmatter validator"
```

### Task T0.4: Generador de catálogo v2 recursivo

**Files:**
- Create: `tools/catalog/build-v2.js`
- Modify: `.github/scripts/generate-catalog.js` (sin cambio de salida v1)
- Test: `tests/build-v2.test.js`, fixtures en `tests/fixtures/tree/`

**Interfaces:**
- Consumes: `parseFrontmatter` (T0.3), `loadTaxonomy` (T0.2)
- Produces:
  - `buildCatalogV2(root: string, { now?: Date }) -> CatalogV2`. Lanza `Error` si hay IDs duplicados, citando ambas rutas (Review Focus 3).
  - `skillChecksum(dir: string) -> "sha256:<hex>"`: hash sobre los ficheros de la carpeta, ordenados por ruta relativa, leídos como búfer (Review Focus 5).
  - Forma de `CatalogV2`: `{ schemaVersion: "2.0.0", generatedAt, skills: [...], agents: [...], mcps: [...], profiles: [], scenarios: [], aliases: {}, index: { byTag, byTechnology, byDomain, migrations } }`. Cada skill: `{ id, version, kind, category, technology, applies_to, tags, requires, status, path, checksum, description }`. Sin `content` ni `rawContent`.

**Reglas:**
- Recorre `skills/` en profundidad. Una carpeta con `SKILL.md` es una skill; no se recorre dentro de ella salvo para el checksum.
- Ignora entradas que empiezan por `.` (Review Focus 4).
- Si el frontmatter de una skill no parsea, avisa con su ruta y la omite (Review Focus 1).
- Para skills de terceros sin `id`, usa `name` como ID y `kind: null`.
- `index.byTag`, `byTechnology`, `byDomain` mapean a listas de IDs; `migrations` mapea `"<from>-><to>"` a IDs.

- [ ] **Step 1: Fixture de árbol**

`tests/fixtures/tree/skills/common/common-x/SKILL.md`, `tests/fixtures/tree/skills/tech/angular/angular-y/SKILL.md` con `README.md`, un `.hidden/`, un fichero binario `scripts/blob.bin` con bytes no UTF-8, y `tests/fixtures/tree/skills/tech/angular/broken/SKILL.md` con YAML inválido.

- [ ] **Step 2: Tests**

- Encuentra las skills a cualquier profundidad (`common-x`, `angular-y`) y omite `broken` con aviso.
- No incluye `content` ni `rawContent` en ninguna skill.
- `index.byTechnology.angular` contiene `angular-y`; `index.byTag` mapea cada tag.
- Dos skills con el mismo `id` en carpetas distintas lanzan error que cita ambas rutas.
- `skillChecksum` es estable entre llamadas, y cambia al modificar un byte de `blob.bin`.
- Ignora `.hidden/`.

- [ ] **Step 3: Ejecutar y ver que fallan**

Run: `npm test -- tests/build-v2.test.js`
Expected: FAIL, `buildCatalogV2` no existe.

- [ ] **Step 4: Implementar**

`buildCatalogV2` y `skillChecksum` en `tools/catalog/build-v2.js`. Escribir la salida con un CLI al final del fichero (`if (require.main === module)`) que escribe `CATALOG.v2.json` (D4).

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test && node tools/catalog/build-v2.js`
Expected: tests pasan; `CATALOG.v2.json` generado con las 13 skills, `kind: null` en las que no tienen metadatos.

- [ ] **Step 6: Commit**

```bash
git add tools/catalog tests/build-v2.test.js tests/fixtures/tree
git commit -m "feat(catalog): add recursive catalog v2 builder"
```

Nota: `CATALOG.v2.json` no se commitea a mano. Lo genera la CI en T0.6.

### Task T0.5: Gobernanza (CODEOWNERS y plantilla de PR)

**Files:**
- Create: `.github/CODEOWNERS`, `.github/PULL_REQUEST_TEMPLATE.md`

**Interfaces:**
- Consumes: nada
- Produces: nada (documentación y reglas de revisión)

- [ ] **Step 1: `CODEOWNERS`**

```
skills/common/   @amutarbo
skills/tech/     @amutarbo
skills/migrations/ @amutarbo
taxonomy/        @amutarbo
```

Los owners reales se reemplazan cuando haya equipos (spec §12). Sin `owners_team` en los metadatos hasta entonces.

- [ ] **Step 2: Plantilla de PR**

Checklist: versión bumpeada si se modificó una skill; tags nuevos añadidos en `taxonomy/`; `README.md` presente; `npm test` pasa; catálogo regenerado por la CI, no a mano.

- [ ] **Step 3: Verificar**

Run: `test -f .github/CODEOWNERS && test -f .github/PULL_REQUEST_TEMPLATE.md && echo ok`
Expected: `ok`.

- [ ] **Step 4: Commit**

```bash
git add .github/CODEOWNERS .github/PULL_REQUEST_TEMPLATE.md
git commit -m "chore(governance): add CODEOWNERS and PR template"
```

### Task T0.6: CI de PR y de generación

**Files:**
- Modify: `.github/workflows/validate-pr.yml`, `.github/workflows/generate-catalog.yml`

**Interfaces:**
- Consumes: `npm test` (T0.1), `tools/validate/run.js` (T0.3), `tools/catalog/build-v2.js` (T0.4)
- Produces: CI que en PR ejecuta tests y validador, y en push regenera v1 y v2.

- [ ] **Step 1: `validate-pr.yml`**

Añadir un job paso a paso: `npm ci` en la raíz, `npm test`, `node tools/validate/run.js`. Mantener el paso existente de `validate-yamls.js`.

- [ ] **Step 2: `generate-catalog.yml`**

Tras el paso existente, añadir `node tools/catalog/build-v2.js`. El `git add` debe incluir `CATALOG.v2.json`.

- [ ] **Step 3: Verificar sintaxis**

Run: `node -e "require('js-yaml').load(require('fs').readFileSync('.github/workflows/validate-pr.yml','utf8')); require('js-yaml').load(require('fs').readFileSync('.github/workflows/generate-catalog.yml','utf8')); console.log('ok')"`
Expected: `ok`.

Nota: el comportamiento real de la CI solo se ve tras un push de la rama. Eso requiere aprobación (ver Global Constraints).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows
git commit -m "ci: run tests, validator and catalog v2 generation"
```

---

## Fase 1 — Migración del repo

### Task T1.1: Mover las skills a `common/` y `tech/`

**Files:**
- Move (con `git mv`): las skills según la tabla de abajo
- Create: `skills/<ruta-nueva>/skill.meta.yaml` por cada skill (D3)
- Delete: `skills/openspec-apply-change/`, `skills/openspec-archive-change/`, `skills/openspec-explore/`, `skills/openspec-propose/`, `skills/qa-test-planner/`

**Interfaces:**
- Consumes: validador (T0.3), decisiones D1 y D3
- Produces: árbol nuevo con IDs que cumplen las reglas de T0.3

Tabla de migración (ID = nombre de carpeta nueva):

| Carpeta actual | Carpeta nueva (ID) | kind | Tecnología |
|---|---|---|---|
| `accessibility-a11y` | `skills/common/common-accessibility` | common | — |
| `angular-developer` | `skills/tech/angular/angular-developer` | tech | angular |
| `vue-best-practices` | `skills/tech/vue/vue-best-practices` | tech | vue |
| `nodejs-best-practices` | `skills/tech/nodejs/nodejs-best-practices` | tech | nodejs |
| `vercel-react-best-practices` | `skills/tech/react/react-best-practices` | tech | react (rename, alias en T1.2) |
| `typescript-expert` | **pendiente D1** | — | — |
| `mcp-builder` | **pendiente D1** | — | — |
| `ui-ux-pro-max` | **pendiente D1** | — | — |

Notas:
- Para `angular-developer`, `vue-best-practices`, `nodejs-best-practices` y `react-best-practices` el ID empieza por el slug de la tecnología. Así cumplen la regla 3 de T0.3 sin renombrar `name` en `SKILL.md`, porque ese nombre es el que Claude usa para invocarlas. Solo `vercel-react-best-practices` cambia de nombre, y eso requiere alias.
- `skill.meta.yaml` (D3) contiene: `id`, `version: 1.0.0`, `kind`, `category`, `technology` (si aplica), `applies_to`, `tags`, `status: stable`, `maintainer: "@amutarbo"`, `sources` (URL del origen si se conoce; si no, omitir el campo).
- `common-accessibility` mantiene `name: accessibility-a11y` en `SKILL.md` (es el nombre que referencian agentes). Hasta T1.2 el alias lo cubre.

- [ ] **Step 1: Test de no duplicación**

En `tests/migration.test.js`: ningún `SKILL.md` aparece con el mismo contenido en dos rutas (hash de contenido; spec §13).

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `npm test -- tests/migration.test.js`
Expected: pasa sobre el árbol actual (no hay duplicados); el test sirve como guardia para la migración.

- [ ] **Step 3: Eliminar las cinco skills de la eliminación**

Run: `git rm -r skills/openspec-apply-change skills/openspec-archive-change skills/openspec-explore skills/openspec-propose skills/qa-test-planner`

Antes de borrar, comprobar que ningún agente las referencia: `grep -rn "openspec\|qa-test-planner" agents/` debe no devolver nada (ya verificado al explorar; repetir para confirmar).

- [ ] **Step 4: Mover las cinco skills no bloqueadas**

Con `git mv` para cada fila de la tabla sin "pendiente". Crear `skill.meta.yaml` tras mover. Para `vercel-react-best-practices`, el `name` de `SKILL.md` no se cambia (ver T1.2).

- [ ] **Step 5: Verificar**

Run: `npm test && node tools/validate/run.js && node tools/catalog/build-v2.js`
Expected: tests pasan; validador sin errores para las cinco migradas; las tres pendientes (D1) siguen en `skills/` y aparecen como aviso "pendiente de migración".

- [ ] **Step 6: Commit**

```bash
git add -A skills tests/migration.test.js
git commit -m "refactor(skills): migrate skills to common/tech layout and remove openspec and qa-test-planner"
```

### Task T1.2: Alias y referencias de agentes

**Files:**
- Modify: `agents/accesibilidad/accesibilidad.yaml` (línea `skills:`), `agents/*/*.yaml` si referencian skills migradas
- Modify: `tools/catalog/build-v2.js` (campo `aliases`)
- Create: `tools/validate/references.js`
- Test: `tests/references.test.js`

**Interfaces:**
- Consumes: `buildCatalogV2` (T0.4), `aliases` como mapa `{ "<nombre-antiguo>": "<id-nuevo>" }`
- Produces: `checkAgentSkillRefs(catalog) -> string[]`. Devuelve un error por cada `skills:` de agente que no resuelve a un ID ni a un alias.

Alias obligatorios:
- `accessibility-a11y` → `common-accessibility`
- `vercel-react-best-practices` → `react-best-practices`

- [ ] **Step 1: Tests**

- Un agente que referencia `accessibility-a11y` resuelve vía alias.
- Un agente que referencia `inexistente` produce error con el nombre del agente.

- [ ] **Step 2: Ejecutar y ver que fallan**

Run: `npm test -- tests/references.test.js`
Expected: FAIL.

- [ ] **Step 3: Implementar `aliases` y `checkAgentSkillRefs`**

`aliases` se construye desde una lista en `taxonomy/aliases.yaml` (fichero nuevo, en el mismo PR, con los dos alias de arriba).

- [ ] **Step 4: Actualizar agentes**

Cambiar `agents/accesibilidad/accesibilidad.yaml` a `skills: [common-accessibility]`. Verificar que los demás agentes ya no referencian nombres antiguos; `typescript-expert` (agentes con `typescript-expert` en su lista) queda sin tocar hasta resolver D1.

- [ ] **Step 5: Ejecutar y ver que pasan**

Run: `npm test && node tools/validate/run.js`
Expected: pasan. Los agentes que referencian `typescript-expert` no fallan por esto mientras D1 esté pendiente, porque `typescript-expert` sigue existiendo en `skills/`. Si se elimina tras D1, el test marca el error y se corrige en ese momento.

- [ ] **Step 6: Commit**

```bash
git add taxonomy/aliases.yaml tools/catalog/build-v2.js tools/validate/references.js tests/references.test.js agents
git commit -m "feat(catalog): add aliases and validate agent skill references"
```

### Task T1.3: Corregir valores por defecto de la action de sync

**Files:**
- Modify: `.github/actions/sync-ai-config/action.yml` (input `paths`)

**Interfaces:**
- Consumes: estructura real del repo (`agents`, `skills`, `mcps`, `CATALOG.json`)
- Produces: el valor por defecto de `paths` apunta a rutas existentes.

Valor nuevo por defecto: `agents,skills,mcps,CATALOG.json`. Los consumidores que pasen `paths` explícitos no se ven afectados.

- [ ] **Step 1: Verificar el fallo actual**

Simular la copia con el bloque bash de la action, con `.central-ai-config` apuntando a una copia del repo y `paths` por defecto. Expected: falla con `Path not found in source repo: catalog/agents`. Esto confirma que el valor por defecto actual no funciona.

- [ ] **Step 2: Cambiar el valor por defecto**

- [ ] **Step 3: Verificar**

Repetir la simulación. Expected: copia `agents`, `skills`, `mcps` y `CATALOG.json` a `.ai-config/`.

- [ ] **Step 4: Commit**

```bash
git add .github/actions/sync-ai-config/action.yml
git commit -m "fix(sync): point default paths to existing repo layout"
```

### Task T1.4: Retirar `skills/.example/`

**Files:**
- Delete: `skills/.example/` (solo si D2 = retirar)
- Modify: `CLAUDE.md` (solo si D2 = retirar, para cambiar la regla de `.example/`)

**Interfaces:**
- Consumes: decisión D2
- Produces: un único punto de plantilla

Esta tarea no se ejecuta hasta resolver D2. Si D2 = mantener, se omite y se deja constancia en el informe final.

- [ ] **Step 1: Ejecutar solo tras D2 = retirar**

Run: `git rm -r skills/.example && npm test && node tools/validate/run.js`
Expected: tests pasan; el validador no referencia `.example`.

- [ ] **Step 2: Commit**

```bash
git add -A skills CLAUDE.md
git commit -m "chore(skills): retire skills/.example in favor of scaffold templates"
```

### Task T1.5: Criterios de aceptación de fases 0–1

**Files:**
- Modify: `docs/superpowers/specs/2026-10-26-skills-library-platform-design.md` (§13: "13 skills" → número real tras T1.1)

**Interfaces:**
- Consumes: todo lo anterior
- Produces: informe de aceptación con salidas reales

- [ ] **Step 1: Comprobaciones de la spec §13**

Run: `npm test && node tools/validate/run.js && node tools/catalog/build-v2.js`

Verificar con la salida real:
- El catálogo v2 lista todas las skills migradas con `id`, `kind`, `path` y `checksum`.
- El validador rechaza tags fuera de `taxonomy/` (test de T0.3 lo cubre).
- Ningún `SKILL.md` aparece en dos rutas (test de T1.1).
- `CATALOG.json` v1 se sigue generando sin cambios de forma (diff salvo `generatedAt`).

- [ ] **Step 2: Corregir el número en la spec**

Sustituir "13 skills actuales" en §13 por el número real. Commit.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-10-26-skills-library-platform-design.md
git commit -m "docs: update acceptance criteria to actual skill count"
```

---

## Self-Review

**Cobertura de la spec (fases 0–1):**
- §3 estructura: T0.2 (taxonomy), T1.1 (common/tech), T0.3 (tools).
- §4 taxonomía: T0.2 y reglas de T0.3.
- §6 skills por tecnología y naming: T1.1 (tabla de migración), T1.2 (alias).
- §7 frontmatter y CATALOG v2: T0.3 y T0.4. El frontmatter completo de la spec se aplica a las skills nuevas; las de terceros usan `skill.meta.yaml` (D3).
- §8 gobernanza: T0.5 (CODEOWNERS y PR template). Bump de versión y similitud en CI quedan fuera de esta fase; ver Fuera de alcance.
- §9 publicación: T0.6 (CI de PR y generación). Release y zips quedan fuera de esta fase.
- §12 decisiones: aplicadas en T1.1 (eliminación) y en la spec ya commiteada.
- §13 criterios: T1.5.
- §14 consumidores: los cambios en `dcx-sdd-kit` e `IA-Portal` no son de este repo y quedan fuera. Los cambios de este repo sí están cubiertos (T0.4 recursivo, T1.2 alias, T1.3 action).

**Fuera de alcance de este plan (fases 2–6 y lo que no es de este repo):**
- Bump de versión obligatorio en CI y similitud de skills (§8). Se planifica en la fase 2.
- Release con zips y `bundle-manifest.json` (§9, fase 4).
- Escenarios y perfiles (`profiles/`, `scenarios/`). Solo se crean en fase 4.
- Scaffold `new-skill` y `common-skill-factory` (§8). Fase 3.
- Cambios en `dcx-sdd-kit` e `IA-Portal`.

**Consistencia de tipos:** `loadTaxonomy` (T0.2) se usa en T0.3 y T0.4 con la misma forma. `buildCatalogV2` (T0.4) produce `aliases` que consume `checkAgentSkillRefs` (T1.2). `parseFrontmatter` (T0.3) lo usa T0.4.

**Decisiones pendientes:** D1 bloquea los tres pasos de T1.1 y el ID de `typescript-expert` en T1.2. D2 bloquea T1.4. D3, D4 y D5 están marcadas en sus tareas; si no se confirman, las tareas usan el valor por defecto indicado en la sección de decisiones.

**Review Focus:** cada línea tiene un test en su tarea (Review Focus 1 y 2 en T0.3 y T0.4; 3 y 5 en T0.4; 4 en T0.3). Ninguna tarea se queda sin test en su línea de Review Focus.

**Proporción:** el plan tiene muchos más bloques de contenido que el código que describe; el código real queda para el implementador.

---

## Execution Handoff

Plan completo, guardado en `docs/superpowers/plans/2026-10-26-skills-library-platform-phase-0-1.md`. Por favor revísalo. Antes de implementar necesito:

1. **Decisiones D1 a D5.** Las cinco tienen recomendación por defecto. D1 es la única que no tiene valor por defecto: sin ella, `typescript-expert`, `mcp-builder` y `ui-ux-pro-max` quedan sin migrar.
2. **Método de ejecución.** Recomiendo **Native** (`superpowers:executing-plans`): las tareas dependen mucho unas de otras (T0.3 → T0.4 → T1.1), son 14 tareas y un error en las interfaces de la fase 0 se propagaría. Con una revisión final de la rama, el coste es menor que una revisión por tarea.

¿El plan recoge lo que quieres, y qué método prefieres?
