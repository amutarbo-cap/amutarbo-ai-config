# Biblioteca corporativa de skills por tecnología — Diseño

- **Estado:** aprobada (pendiente de plan de implementación)
- **Fecha:** 2026-10-26
- **Repositorio:** `capgemini-ai-config`
- **Tipo:** arquitectónico

## 1. Visión general

El repositorio pasa de inventario plano de activos a **fuente de verdad de un grafo de activos componibles**. `CATALOG.json` es el contrato único que consumen:

- el **resolvedor** (librería `bundler`), que dada una selección de tecnologías y un escenario devuelve un zip,
- los **agentes** y los **MCPs**, que descubren skills por intención,
- los **repos destino** (`dcx-sdd-kit`, `IA-Portal`) mediante la action de sincronización.

Objetivos que cubre el diseño: biblioteca escalable a cientos de skills y decenas de tecnologías, cero duplicación física de skills, selección multi-tecnología con deduplicación, soporte de escenarios de migración (p. ej. Pega → Angular), y un generador de skills asistido por IA sobre un scaffold.

### Decisiones tomadas

| Decisión | Elección |
|---|---|
| Modelo base | Agrupación física por tipo, IDs globales y perfiles declarativos (Enfoque 2) |
| Consumo | Selección por `CATALOG.json` y resolución a zip; el consumidor nunca copia carpetas a mano |
| Selección del usuario | Varias tecnologías combinables, con escenario opcional |
| Migraciones | Skills de tipo `migration` con par origen→destino |
| Creación de skills | Scaffold (`new-skill`) como base y skill generadora asistida por IA encima |

### Supuesto a validar

"Compartida" significa **una sola skill referenciada** desde varios perfiles, nunca copia ni symlink. Si los consumidores necesitaran copias físicas, este supuesto cambia.

## 2. Arquitectura propuesta

Cuatro capas:

1. **Activos** (`skills`, `agents`, `mcps`, `docs`): contenido con ID global y `version` semver.
2. **Composición** (`profiles`, `scenarios`): declaran qué se incluye. No contienen contenido, solo referencias por ID.
3. **Catálogo** (`CATALOG.json`, generado por CI): activos, perfiles, escenarios e índices invertidos.
4. **Consumo**: resolvedor y empaquetador (zip con `bundle-manifest.json`), descubrimiento por agentes y MCP, y action de sincronización.

### Regla de resolución

1. Entrada: lista de tecnologías y, opcionalmente, escenario (con `from`/`to` si el escenario lo exige).
2. Unión de los perfiles de las tecnologías.
3. Añadir las skills `common` cuyo `applies_to` case con alguna tecnología o dominio seleccionado.
4. Si hay escenario, añadir sus `extra_common` y las skills `migration` que casen con el par.
5. Expandir `requires` y `extends` recursivamente, resolviendo rangos semver.
6. Deduplicar por ID.
7. Fallar si hay ciclos, dependencias rotas o rangos no satisfacibles.
8. Emitir el zip y su `bundle-manifest.json`.

## 3. Estructura de directorios

```
skills/
  common/<id>/SKILL.md              # capacidades transversales (una sola vez)
  tech/<tech>/<id>/SKILL.md         # solo capacidades específicas del stack
  migrations/<from>-to-<to>/<id>/SKILL.md
agents/<id>/                        # sin cambios de contenido
mcps/<id>/                          # sin cambios de contenido
docs/<id>/                          # activos documentales consumibles
profiles/<tech>.yaml                # qué incluye cada tecnología
scenarios/<scenario>.yaml           # migration, greenfield, modernization
taxonomy/
  technologies.yaml                 # tecnología → dominio
  categories.yaml                   # dominios de la skill
  tags.yaml                         # vocabulario cerrado de tags
tools/
  new-skill/                        # scaffold
  validate/                         # validadores
  bundler/                          # resolvedor y empaquetador
.github/
  workflows/                        # validate-pr, generate-catalog, release
  CODEOWNERS
```

- **Vocabulario controlado:** `taxonomy/*.yaml` es la única fuente. La CI rechaza tags, categorías o tecnologías fuera de ahí (evita `a11y` / `accessibility` / `accesibilidad`).
- **Nueva tecnología:** entrada en `taxonomy/technologies.yaml`, carpeta `skills/tech/<tech>/` y `profiles/<tech>.yaml`. No se modifica código.
- **Zip:** layout plano (`.claude/skills/<id>/`) aunque el repo esté agrupado. El `path` real de cada skill está en el catálogo.

## 4. Taxonomía de skills

Cuatro ejes ortogonales en el frontmatter:

| Eje | Campo | Valores |
|---|---|---|
| Tipo | `kind` | `common`, `tech`, `migration` |
| Dominio | `category` | `quality`, `security`, `architecture`, `documentation`, `delivery`, `ux`, `data`, `migration`, `build`… (ver `taxonomy/categories.yaml`) |
| Aplicabilidad | `applies_to` | `["*"]`, `["domain:frontend"]` o IDs de tecnología, p. ej. `["angular"]` |
| Ciclo de vida | `phase` | `design`, `build`, `review`, `test`, `operate`, `migrate` |

Cada tecnología pertenece a un **dominio** (`frontend`, `backend`, `mobile`, `low-code`). Así una skill `common` puede aplicarse a todo un dominio sin editarse al añadir tecnologías.

## 5. Skills comunes

Lista de referencia (obligatorias marcadas con ★):

| Categoría | Skills | Aplica a |
|---|---|---|
| Quality | `common-testing-strategy` ★, `common-unit-testing`, `common-e2e-testing`, `common-test-planning`, `common-code-review` | todas |
| Security | `common-security-review` ★, `common-threat-modeling`, `common-secrets-management`, `common-dependency-audit` | todas |
| Architecture | `common-architecture-review` ★, `common-adr-writing`, `common-api-design`, `common-nfr-checklist` | todas |
| Documentation | `common-documentation` ★, `common-readme-standards`, `common-runbooks`, `common-changelog` | todas |
| UX | `common-accessibility` ★, `common-ux-review`, `common-i18n` | `domain:frontend`, `domain:mobile` |
| Delivery | `common-ci-cd-basics`, `common-observability`, `common-git-workflow` | todas |
| Data | `common-data-modeling`, `common-privacy-gdpr` | según perfil |

**Regla de no duplicación:** una skill `tech` que necesite el *cómo* específico de una capacidad común declara `extends: common-<x>` y solo añade lo diferencial.

## 6. Skills por tecnología

Solo capacidades del stack, sin repetir las comunes.

| Tecnología | Dominio | Skills iniciales (`<tech>-*`) |
|---|---|---|
| Angular | frontend | `components-signals`, `routing-guards`, `state-ngrx`, `forms-reactive`, `testing-harnesses`, `performance-ssr`, `cli-schematics` |
| React | frontend | `hooks-patterns`, `state-management`, `nextjs-app-router`, `performance-rendering`, `testing-library` |
| Vue | frontend | `composition-api`, `pinia-state`, `nuxt`, `testing-vitest` |
| Node.js | backend | `async-patterns`, `express-fastify-apis`, `nestjs`, `error-handling`, `performance-profiling` |
| Spring Boot | backend | `rest-controllers`, `spring-data-jpa`, `spring-security`, `config-profiles`, `testing-slices`, `observability-actuator` |
| ServiceNow | low-code | `scripting-glide`, `flow-designer`, `integrations-rest`, `app-engine-studio`, `atf-testing` |
| Pega | low-code | `case-design`, `rules-decisioning`, `dx-api-constellation`, `data-pages`, `pega-testing-pta` |
| Salesforce | low-code | `apex-patterns`, `lwc-components`, `soql-governor-limits`, `flows-automation`, `sfdx-deployment` |
| iOS | mobile | `swiftui`, `concurrency-async`, `core-data`, `app-store-release`, `xctest` |
| Android | mobile | `jetpack-compose`, `coroutines-flow`, `room-hilt`, `play-release`, `espresso-testing` |

**Migraciones:** `skills/migrations/pega-to-angular/` con `rules-inventory`, `flow-to-components-mapping`, `business-rules-extraction`, `strangler-strategy` y `parity-testing`.

**Naming:**

- ID en kebab-case, minúsculas: `<prefijo>-<capacidad>`.
- Prefijo: `common`, el slug de la tecnología (`angular`) o `mig-<from>-to-<to>`.
- El ID es inmutable. Un renombrado deja la skill antigua en `deprecated` con `replaced_by`.

**Migración de las 13 skills actuales:** `accessibility-a11y` pasa a `common-accessibility`; `angular-developer` a `skills/tech/angular/`; `vue-best-practices` a `skills/tech/vue/`; `nodejs-best-practices` a `skills/tech/nodejs/`; `vercel-react-best-practices` a `skills/tech/react/`; y así con el resto. `openspec-*` y `qa-test-planner` se eliminan de la biblioteca (ver §12). `skills/.example/` se sustituye por la plantilla del scaffold.

## 7. Metadatos y estructura del `CATALOG.json`

### Frontmatter de una skill tech

```yaml
---
name: angular-signals
description: Patrones de signals, computed y effects en Angular 17+. Úsala al crear o refactorizar componentes reactivos.
id: angular-signals
version: 1.2.0
kind: tech
category: build
technology: angular
applies_to: [angular]
phase: [build, review]
tags: [signals, reactivity, performance]
requires: [common-testing-strategy@^1]
extends: []
status: stable            # draft | stable | deprecated
replaced_by: null
sources: ["https://angular.dev/..."]
maintainer: "@amutarbo"
owners_team: frontend-angular
last_reviewed: 2026-10-01
---
```

### Frontmatter de una skill common

```yaml
---
name: common-accessibility
description: Revisión WCAG 2.2 AA para interfaces web y móviles. Úsala al crear o revisar UI.
id: common-accessibility
version: 2.0.0
kind: common
category: ux
applies_to: ["domain:frontend", "domain:mobile"]
phase: [build, review, test]
tags: [wcag, aria, a11y]
status: stable
---
```

### Frontmatter de una skill de migración

```yaml
---
id: mig-pega-to-angular-flow-mapping
kind: migration
from: pega
to: angular
requires: [pega-case-design, angular-components-signals]
---
```

### `profiles/angular.yaml`

```yaml
technology: angular
domain: frontend
includes:
  skills: [angular-*]                 # globs sobre IDs tech
  common: auto                        # por applies_to (domain:frontend, "*")
  agents: [frontend-engineer, frontend-architect, accesibilidad]
  mcps: []
  docs: []
```

### `scenarios/migration.yaml`

```yaml
scenario: migration
requires_pair: true                   # exige from + to
include_kinds: [migration]
extra_common: [common-architecture-review, common-testing-strategy]
```

### Estructura de `CATALOG.json` (v2)

```json
{
  "schemaVersion": "2.0.0",
  "generatedAt": "2026-10-26T10:00:00Z",
  "repoRef": "a1b2c3d",
  "technologies": [{ "id": "angular", "domain": "frontend", "profile": "profiles/angular.yaml" }],
  "skills": [
    {
      "id": "angular-signals", "version": "1.2.0", "kind": "tech",
      "category": "build", "technology": "angular", "applies_to": ["angular"],
      "tags": ["signals"], "requires": ["common-testing-strategy@^1"],
      "status": "stable", "path": "skills/tech/angular/angular-signals",
      "checksum": "sha256:…", "description": "…"
    }
  ],
  "agents": [{ "id": "frontend-engineer", "skills": ["angular-signals"] }],
  "mcps": [],
  "docs": [],
  "profiles": [{ "technology": "angular", "resolved": { "skills": [], "common": [] } }],
  "scenarios": [{ "id": "migration", "requires_pair": true }],
  "index": {
    "byTag": { "wcag": ["common-accessibility"] },
    "byTechnology": { "angular": ["angular-signals"] },
    "byDomain": { "frontend": ["common-accessibility"] },
    "migrations": { "pega->angular": ["mig-pega-to-angular-flow-mapping"] }
  }
}
```

- `schemaVersion` es semver independiente. Un cambio incompatible es major y el resolvedor exige un mínimo.
- `checksum` garantiza integridad y reproducibilidad.
- El catálogo **no incluye el cuerpo** de las skills. Hoy pesa 327 KB por incluir `content` y `rawContent`; los cuerpos se leen por `path` al empaquetar.
- Los campos de agentes se mantienen y se les añade `id`.

### Descubrimiento desde agentes y MCPs

1. **Agentes:** declaran `skills: [...]` y opcionalmente `discover: { technology, phase }`. El resolvedor expande la intención a IDs.
2. **`catalog-mcp` (fase 5)** con:
   - `search_skills(query, technology?, tags?, phase?)`
   - `get_skill(id)`
   - `resolve_bundle(technologies[], scenario?, from?, to?)`
3. **Anti-ruido:** el descubrimiento se apoya en `description`, que debe decir qué hace la skill y cuándo usarla. La CI exige esa cláusula.

### Bundle (zip)

```
bundle-manifest.json     # selección, versiones exactas, checksums, repoRef, fecha
.claude/skills/<id>/…    # layout plano
.claude/agents/…
.mcp.json                # cuando aplique
docs/…
```

## 8. Convenciones y gobernanza

### Versionado

- **Skill:** semver en el frontmatter.
  - *patch*: corrección de texto o ejemplos.
  - *minor*: sección o capacidad nueva compatible.
  - *major*: cambia el comportamiento esperado o elimina contenido.
- **`schemaVersion`:** semver independiente; los cambios incompatibles son major.
- **Dependencias:** `requires` admite rangos (`@^1`). El resolvedor falla si no son satisfacibles.
- **Bump obligatorio:** un PR que modifica una skill sin subir `version` falla en CI. La comparación se hace contra `main`.
- **Deprecación:** `status: deprecated` + `replaced_by`. Se mantiene al menos 2 releases; el resolvedor avisa, no rompe.

### Gobernanza

| Elemento | Regla |
|---|---|
| Propiedad | `CODEOWNERS` por carpeta: `skills/common/` → plataforma/arquitectura; `skills/tech/<tech>/` → equipo de la tecnología. |
| Creación | Siempre vía scaffold o generador, con PR y checklist. |
| Revisión | 1 aprobación del owner; `common` y `migration` requieren 2 (una de arquitectura). |
| Anti-duplicado | CI calcula similitud (descripción + tags) y avisa de solapes. Una skill `tech` que repite una `common` debe usar `extends`. |
| Vocabulario | Tags, categorías y tecnologías solo se añaden en `taxonomy/` y pasan revisión. |
| Ciclo de vida | `draft` (no entra en bundles por defecto) → `stable` → `deprecated`. Revisión cada 6 meses (`last_reviewed`); la CI marca las caducadas. |
| Nueva tecnología | Plantilla de PR: taxonomía + perfil + mínimo 3 skills + owner designado. |

### Generador de skills

**Pieza 1: scaffold (`tools/new-skill`)**

- Uso: `npm run new-skill -- --kind tech --tech angular --name signals`.
- Valida la taxonomía, calcula ID y path, y crea `SKILL.md` con frontmatter completo.
- Crea `references/` y `scripts/` solo si se piden.

**Pieza 2: skill `common-skill-factory` (asistida por IA)**

- Entrada: fuente (URL de docs, repo, PDF o notas), tecnología y tipo.
- Proceso:
  1. Invoca el scaffold.
  2. Redacta el borrador con la estructura estándar: cuándo usarla, principios, patrones, antipatrones, checklist y ejemplos.
  3. Propone `tags`, `requires` y `extends` consultando el catálogo para evitar duplicados.
  4. Marca `status: draft` y abre PR.
- Reglas: cita fuentes en `sources`, no inventa versiones de librerías, y deja la revisión a un humano.

**Pieza 3: plantilla de calidad y rúbrica**

- Secciones obligatorias que valida la CI.
- Rúbrica de revisión: precisión, accionabilidad, cláusula "cuándo usarla", tamaño ≤ 500 líneas con detalle en `references/`.

**Humano en el bucle:** ninguna skill generada por IA pasa a `stable` sin aprobación del owner.

## 9. Estrategia de publicación

GitHub Actions:

| Evento | Acción |
|---|---|
| PR | `validate`: esquema de frontmatter, taxonomía, IDs únicos, referencias resolubles (`requires`, `extends`, `includes`, agentes), bump de semver, similitud. Genera el catálogo en dry-run y lo comenta en el PR. |
| push a `main` | `generate-catalog`: construye `CATALOG.json` v2 con checksums y lo commitea con `[skip ci]`. |
| tag | `release`: publica `CATALOG.json` y un zip por perfil como assets de GitHub Release. |
| consumo | Action `sync-ai-config` actualizada: recibe tecnologías y escenario, resuelve contra el catálogo y descarga solo lo necesario. |

Cambios necesarios en el repo actual:

- `generate-catalog.js` pasa a recorrer recursivamente `skills/` (hoy solo lee un nivel).
- Se corrigen los `paths` por defecto del action de sync (`catalog/...` no existe; la ruta real es el repo raíz).
- La plataforma web y la CLI llaman a la misma librería `bundler`, así que zip web, CLI y Action producen el mismo resultado.

## 10. Roadmap de evolución

| Fase | Alcance | Resultado |
|---|---|---|
| 0. Cimientos | `taxonomy/`, esquema de frontmatter, validador, generador de catálogo v2 recursivo, `CODEOWNERS`, plantilla de PR | Catálogo v2 generado con las 13 skills actuales |
| 1. Migración del repo | Mover las 13 skills a `common/` y `tech/`, asignar IDs y metadatos, retirar `.example`, corregir el action de sync | Estructura nueva; catálogo v1 en paralelo un tiempo |
| 2. Biblioteca base | Skills `common` prioritarias (security, testing, documentation, architecture-review, accessibility) y 3–5 skills por tecnología, empezando por Angular, Pega, Spring Boot y Node.js | Cobertura mínima para bundles útiles |
| 3. Generación | Scaffold `new-skill` y `common-skill-factory` | Skill nueva en minutos, con revisión humana |
| 4. Resolvedor y bundles | Librería `bundler`, perfiles, escenarios, `bundle-manifest.json`, zips por release | Multi-tecnología y `pega→angular` funcionando |
| 5. Plataforma y MCP | Web de selección y descarga, `catalog-mcp`, descubrimiento por intención en agentes | Autoservicio para equipos |
| 6. Escala | Métricas de uso, detección de solapes, evals de skills, firma de bundles | Operación a cientos de skills |

## 11. Riesgos y recomendaciones

| Riesgo | Mitigación |
|---|---|
| Ruptura de consumidores (`dcx-sdd-kit`, `IA-Portal`) | Publicar v1 y v2 en paralelo con `schemaVersion`; migrar por fases; `path` como fuente de verdad. |
| Deriva de taxonomía (sinónimos) | Vocabulario cerrado en `taxonomy/`, validado en CI. |
| Duplicación encubierta | `extends`, similitud en CI y revisión de arquitectura en las `common`. |
| Calidad de skills generadas por IA (alucinaciones, versiones inventadas) | `draft` por defecto, `sources`, rúbrica, aprobación del owner, evals en fase 6. |
| Exceso de contexto en un bundle | Descripciones precisas, carga progresiva (`references/`), límite de tamaño, selección fina en la plataforma. |
| Dependencias circulares o rotas | Validación del grafo en CI; la release falla si hay ciclos. |
| Obsolescencia | `last_reviewed` con caducidad de 6 meses y alertas en CI. |
| Cuello de botella de revisión | Owners por tecnología, no un único revisor central. |
| Migraciones de baja fidelidad (Pega → Angular) | Piloto con casos reales y paridad funcional antes de pasar a `stable`. |

**Recomendaciones:**

1. Hacer primero las fases 0–1, sin contenido nuevo, para probar la plomería antes de crecer.
2. Usar Angular + Pega como piloto de extremo a extremo: cubre migración y low-code, y ejercita todo el modelo.
3. No construir la plataforma web hasta que `bundler` funcione por CLI y por Action.

## 12. Decisiones sobre preguntas abiertas

- **`openspec-*` y `qa-test-planner`:** se eliminan de la biblioteca. No se migran a `common` ni a ninguna tecnología. La retirada efectiva (borrado de carpetas) se hace en la fase 1, dentro del plan aprobado. Quedan en el historial de git.
- **Consumidores:** `dcx-sdd-kit` e `IA-Portal` requieren cambios para consumir el nuevo modelo. Ver §14. Pendiente de verificar en esos repos, que no están disponibles en el entorno de diseño.
- **Owners:** el owner inicial de todos los activos es el mantenedor del repo, `@amutarbo`. Los `owners_team` y la asignación por carpeta en `CODEOWNERS` quedan pendientes de definir con los equipos reales.

## 13. Criterios de aceptación de la fase 0–1

- `tools/catalog/build-v2.js` lista las 8 skills migradas con `id`, `kind`, `path` y `checksum`. `generate-catalog.js` (v1) sigue listando las 8 con su nombre histórico, para que los consumidores de v1 no pierdan skills.
- `validate-yamls` / validador de frontmatter rechaza tags fuera de `taxonomy/`, IDs duplicados y referencias rotas.
- Ningún archivo de skill aparece duplicado en dos rutas.
- El catálogo v1 sigue generándose durante la migración.

## 14. Cambios requeridos en los consumidores

Lo que hay que cambiar en cada consumidor para usar el modelo nuevo. Los puntos marcados con (verificar) dependen de cómo consume hoy cada repo y se confirman al abrir sus pipelines.

### Repo `capgemini-ai-config` (fase 1)

- `generate-catalog.js`: recorrer recursivamente `skills/` y emitir `schemaVersion: 2.0.0`. Hoy lee solo un nivel.
- Mantener el catálogo v1 durante la migración, para que los consumidores actuales no se rompan.
- Corregir el valor por defecto de `paths` en `.github/actions/sync-ai-config/action.yml`: hoy apunta a `catalog/agents,catalog/skills,catalog/sdd,catalog/mcps,manifest.yaml`, rutas que no existen en el repo.
- Eliminar `skills/.example/` (plantilla obsoleta) y sustituirla por la del scaffold.

### Action `sync-ai-config` (todos los consumidores)

- Nuevo input `technologies` (lista) y `scenario` opcional, con `from` y `to` si el escenario lo exige.
- La action resuelve contra `CATALOG.json` (o descarga el zip del perfil de la release) en lugar de copiar carpetas enteras.
- El destino por defecto `.ai-config` cambia al layout que espere cada consumidor (verificar).
- Opción de fijar la versión del catálogo por tag, para reproducibilidad.

### `dcx-sdd-kit` (verificar)

- Dejar de leer skills por nombre fijo. Pasar a consumir el `bundle-manifest.json` del zip.
- Ajustar la lectura de rutas: el zip usa layout plano `.claude/skills/<id>/SKILL.md`.
- Leer `schemaVersion` y rechazar catálogos con major mayor que el soportado.
- Actualizar la referencia a `skills` dentro de sus flujos SDD al nuevo `id` (IDs con prefijo `common-`, `<tech>-`, `mig-`).

### `IA-Portal` (verificar)

- Lo mismo que `dcx-sdd-kit` en lo relativo a catálogo, bundle y `schemaVersion`.
- Si muestra o filtra skills, usar `index.byTechnology`, `index.byDomain` e `index.byTag` del catálogo en lugar de listas planas.
- Si referencia skills por nombre antiguo, migrar a los IDs nuevos según el mapeo de la §6 (p. ej. `accessibility-a11y` → `common-accessibility`).

### Mapeo de nombres antiguos a IDs nuevos

| Nombre actual | ID nuevo |
|---|---|
| `accessibility-a11y` | `common-accessibility` |
| `angular-developer` | `angular-*` (tech/angular) |
| `vue-best-practices` | `vue-*` (tech/vue) |
| `nodejs-best-practices` | `nodejs-*` (tech/nodejs) |
| `vercel-react-best-practices` | `react-*` (tech/react) |
| `typescript-expert` | por clasificar en fase 1 |
| `mcp-builder` | por clasificar en fase 1 |
| `ui-ux-pro-max` | por clasificar en fase 1 |
| `openspec-*`, `qa-test-planner` | eliminadas |

Un alias de compatibilidad en el catálogo v2 (`aliases: { "accessibility-a11y": "common-accessibility" }`) permite que los consumidores migren sin romperse.
