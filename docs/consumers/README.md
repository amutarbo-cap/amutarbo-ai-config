# Cambios necesarios en los repos consumidores

Este documento describe qué tienen que cambiar `dcx-sdd-kit` e `IA-Portal` para consumir la reorganización de skills de `capgemini-ai-config` (PR #2, spec `docs/superpowers/specs/2026-10-26-skills-library-platform-design.md`, §14).

Las referencias a código de cada repo se verificaron leyendo su estado en GitHub en `main`/`master` (solo lectura). No se ha modificado nada en esos repos.

## Qué cambia en este repo

| Antes | Después |
|---|---|
| Skills planas en `skills/<nombre>/` | `skills/common/<id>/` y `skills/tech/<tecnología>/<id>/` |
| `skills/.example/` como plantilla | Retirada. Las skills se crean con el generador de skills de Claude |
| `openspec-*` y `qa-test-planner` | Eliminadas |
| Skills sin metadatos | Frontmatter con `id`, `kind`, `category`, `applies_to`, `tags`, `version` |
| `CATALOG.json` (v1) | Sigue en `CATALOG.json`, con la misma forma. Ahora lista las skills en cualquier profundidad y con sus rutas nuevas |
| — | `CATALOG.v2.json` (nuevo, generado por la CI). Incluye `schemaVersion`, `aliases` e `index`, y **no** tiene `version` en la raíz |

### Nombres: se conservan los históricos

El campo `name` de cada `SKILL.md` **no cambia** (salvo que se indique). Lo que cambia es el `id` y la ruta. El mapa de nombres antiguos a IDs nuevos está en `taxonomy/aliases.yaml`:

| Nombre histórico (`name`) | ID nuevo | Ruta nueva |
|---|---|---|
| `accessibility-a11y` | `common-accessibility` | `skills/common/common-accessibility` |
| `typescript-expert` | `common-typescript-expert` | `skills/common/common-typescript-expert` |
| `mcp-builder` | `common-mcp-builder` | `skills/common/common-mcp-builder` |
| `ui-ux-pro-max` | `common-ui-ux-pro-max` | `skills/common/common-ui-ux-pro-max` |
| `vercel-react-best-practices` | `react-best-practices` | `skills/tech/react/react-best-practices` |
| `angular-developer` | `angular-developer` | `skills/tech/angular/angular-developer` |
| `vue-best-practices` | `vue-best-practices` | `skills/tech/vue/vue-best-practices` |
| `nodejs-best-practices` | `nodejs-best-practices` | `skills/tech/nodejs/nodejs-best-practices` |

Eliminadas (sin sustituto): `openspec-propose`, `openspec-apply-change`, `openspec-explore`, `openspec-archive-change`, `qa-test-planner`.

### Agentes

- `agents/accesibilidad/accesibilidad.yaml` ahora referencia `common-accessibility` (antes `accessibility-a11y`).
- `qa-ux`, `qa-developer`, `backend-architect` y `backend-engineer` ya no referencian skills eliminadas.
- Los demás agentes mantienen sus nombres históricos; el alias los resuelve.
- Las referencias `sdd-*` (`sdd-enrich`, `sdd-run`, `sdd-done`, `sdd-propose`) son externas a este repo y se consideran válidas por prefijo (`taxonomy/external-skills.yaml`).

---

## dcx-sdd-kit

Repositorio: `dmuleroa/dcx-sdd-kit` (propiedad de otro usuario; los cambios los tiene que aprobar su mantenedor).

Hallazgos relevantes:

- `scripts/sync-platform.sh` clona `capgemini-ai-config@main` y hace `cp -r ${TMP_DIR}/skills docs/skills`. Esa copia es plana y ahora `skills/` tiene carpetas de agrupación (`common/`, `tech/`).
- `scripts/transform-agents.js` lee `agents/<nombre>/<nombre>.yaml` y `prompt.md`, y genera `docs/agents-catalog.json` con el campo `skills` de cada agente.
- `skills-lock.json` y las carpetas `.agents/skills/`, `.github/skills/` y `.claude/skills/` contienen **copias** de skills de terceros (`accessibility-a11y`, `angular-developer`, `ui-ux-pro-max`, `typescript-expert`, `qa-test-planner`, etc.). Son duplicados de lo que ahora vive en este repo.
- El README del kit documenta que `/sdd-swarm` instala las skills de soporte de cada agente en `.claude/skills/`, etc.

### Cambios requeridos

1. **Aplanar la copia de skills en `sync-platform.sh`.** Reemplazar `cp -r ${TMP_DIR}/skills docs/skills` por una copia que recorra `skills/**` y copie cada carpeta que tenga `SKILL.md` a `docs/skills/<id>/`. Así `docs/skills/` sigue siendo plano para el resto del kit.
   - Quitar la línea `rm -rf docs/skills/.example`: la carpeta ya no existe (inocua, pero deja de tener sentido).
2. **Resolver nombres de skills con aliases.** Los agentes del kit referencian nombres históricos (p. ej. `frontend-engineer` lista `vercel-react-best-practices`, `typescript-expert`, `ui-ux-pro-max`), y el de accesibilidad ahora lista `common-accessibility`. El kit debe resolver cada referencia contra `CATALOG.v2.json` (campo `aliases` e índice por `id`) antes de instalarla, o bien aceptar ambos nombres.
3. **Quitar las copias locales de skills que ya vienen del catálogo.** Dejar de mantener `.agents/skills/`, `.github/skills/` y `.claude/skills/` a mano, y regenerarlas desde `sync-platform.sh`. Entre ellas, `qa-test-planner` ya no existe en el catálogo: decidir si se borra la copia local o se mueve a un repositorio propio.
4. **Fijar la referencia del catálogo.** `PLATFORM_REF` defaultea a `main`. Para reproducibilidad, usar un tag (`vYYYY.MM.N`) cuando exista una release.
5. **Verificar `transform-agents.js`.** Como las referencias de skills cambian (solo `accesibilidad` cambia de nombre), comprobar que `docs/agents-catalog.json` se genera sin errores tras la sincronización.

### Qué NO cambia

- La estructura de `agents/<nombre>/<nombre>.yaml` y `prompt.md`.
- Los nombres de la mayoría de skills referenciadas.
- El `CATALOG.json` que el kit lee (no se usa directamente; sincroniza el repo entero).

---

## IA-Portal

Repositorio: `amutarbo-cap/IA-Portal` (privado, rama `master`).

Hallazgos relevantes:

- `apps/backend/src/config/app.config.ts`: `GITHUB_REPO` defaultea a `amutarbo-cap/capgemini-ai-config` (correcto, no hay que tocarlo).
- `apps/backend/src/modules/hub-sync/hub-sync.service.ts` descarga el catálogo desde `HUB_CATALOG_URL` y sincroniza `agents`, `mcps` y `prompts`. **No sincroniza skills.**
- `apps/backend/src/modules/hub-sync/dto/catalog.dto.ts` valida el catálogo con zod: `CatalogSchema` exige `version` (string) en la raíz, y `SkillSchema` exige `name` y `version`.
- `apps/backend/src/modules/agent-skills/agent-skills.service.ts` descarga una skill con `githubArchive.folderPathFor('agents', skill.name, skill.path)`: usa el `path` guardado en la tabla `agent_skills`.

### Cambios requeridos

1. **No apuntar `HUB_CATALOG_URL` a `CATALOG.v2.json`.** Su raíz tiene `schemaVersion` y no `version`, así que `CatalogSchema` lo rechazaría. Mantener `CATALOG.json` (v1) hasta que se decida migrar el esquema. Si se migra, actualizar `catalog.dto.ts` para aceptar `schemaVersion`.
2. **Actualizar las rutas guardadas en `agent_skills`.** El `path` antiguo (`skills/<nombre>`) ya no existe. Opciones:
   - Migración SQL: `UPDATE agent_skills SET path = ... WHERE name = ...` con las rutas nuevas de la tabla anterior.
   - O resolver el `path` en tiempo de descarga contra el catálogo, usando el `name` (que no cambia).
   Recomendado: la segunda opción, para no depender de rutas.
3. **Desactivar o borrar filas de skills eliminadas.** Si `agent_skills` contiene `openspec-*` o `qa-test-planner`, su descarga fallará con 404. Revisar la tabla y borrarlas o marcarlas como inactivas.
4. **Actualizar la referencia de skills del agente de accesibilidad.** Si IA-Portal guarda referencias a skills por agente, `accessibility-a11y` puede pasar a `common-accessibility`. El `name` de la skill sigue siendo `accessibility-a11y` en el catálogo v1, así que la búsqueda por nombre no se rompe.
5. **Revisar la validación de `version` en skills.** Las 8 skills migradas tienen `version` (semver), así que `SkillSchema` pasa.

### Qué NO cambia

- `GITHUB_REPO`, `HUB_CATALOG_URL` (si sigue apuntando a `CATALOG.json`) y el sincronismo de agentes y MCPs.
- La descarga de agentes (`agents/<nombre>`) y MCPs (`mcps/<nombre>`): sus rutas no cambian.

---

## Orden recomendado

1. Mergear el PR #2 en `capgemini-ai-config` (la CI debe pasar).
2. IA-Portal: rutas de `agent_skills` y filas eliminadas (no depende de otros cambios).
3. dcx-sdd-kit: aplanado de `sync-platform.sh` y resolución por aliases; después eliminar las copias locales.
4. Cuando ambos estén estables, planificar la migración a `CATALOG.v2.json` como fuente única.

## Pendiente de confirmar

- Quién mantiene `dcx-sdd-kit` (el repo es de `dmuleroa`, no de la organización `amutarbo-cap`).
- Si `agent_skills` en IA-Portal se rellena a mano o desde algún proceso que no he podido ver.
- Si el kit necesita algo más que `docs/skills/<id>/` (por ejemplo, instalar por `name` en las rutas de cada agente IA).
