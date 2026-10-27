# Releases de BrainForge Companion en el catálogo — diseño

- **Estado:** pendiente de aprobación
- **Fecha:** 2026-10-26
- **Repositorio:** `capgemini-ai-config`
- **Tipo:** arquitectónico
- **Base:** `main` tras el PR #2 (biblioteca de skills: `tools/`, `taxonomy/`, `CATALOG.v2.json`, tests con `node:test`)

## 1. Objetivo

El portal de IA debe mostrar la información de las releases de `dmuleroa/dcx-brain-forge` y ofrecer un botón que descargue solo el `.vsix`. Cada release nueva debe reflejarse sin intervención manual.

## 2. Restricciones acordadas

- `dcx-brain-forge` es privado y **debe seguir siéndolo**. Solo se expone el `.vsix`.
- Este repo es público, así que el `.vsix` no se republica aquí: el acceso al portal está controlado y la descarga debe pasar por su login.
- No se modifica el workflow de releases de `dcx-brain-forge`. La detección es por pull programado.
- El portal (`amutarbo-cap/IA-Portal`) tiene backend propio (NestJS), donde puede guardar un token y devolver archivos.
- `CATALOG.json` y `CATALOG.v2.json` no se editan a mano: los regenera la GitHub Action.
- Se respeta la estructura de `main`: lógica en `tools/`, tests en `tests/*.test.js` con `node:test`, validación en `validate-pr.yml`.

## 3. Alcance y reparto

Son dos subproyectos con ciclos independientes:

- **Parte A (este repo):** el catálogo aporta los metadatos de las releases. Es lo que cubren este spec y su plan.
- **Parte B (repo IA-Portal):** pantalla y endpoint de descarga. Este spec solo define el contrato que debe cumplir.

## 4. Estado de `main` que condiciona el diseño

| Hecho en `main` | Consecuencia |
|---|---|
| Hay dos catálogos: `CATALOG.json` (v1, raíz con `version`) y `CATALOG.v2.json` (raíz con `schemaVersion`), ambos generados en `generate-catalog.yml`. | `releases` se añade a **ambos**. El portal sigue en v1 (`docs/consumers/README.md` indica no apuntar `HUB_CATALOG_URL` a v2); v2 es el contrato de futuro. |
| El portal valida el catálogo v1 con `CatalogSchema`, un `z.object` no estricto. | Una clave nueva `releases` se ignora, no rompe. Para usarla, el portal debe declararla (parte B). |
| El generador v1 vuelca el YAML de `resources/<x>/` tal cual en `resources[]`. | La configuración de la fuente de releases **no** va en `resources/`: filtraría el nombre del repo privado al catálogo público. |
| La lógica nueva vive en `tools/` (`tools/catalog/build-v2.js`, `tools/lib/`) y se prueba en `tests/` con fixtures. | `releases.js` y su helper van en `tools/`, con tests y fixture propios. |
| `build-v2.js` exporta `buildCatalogV2(root, options)` pura e inyectable; su CLI escribe el archivo. | Las releases se inyectan por `options.releases`: los tests siguen sin red. |
| `validate-pr.yml` ejecuta `npm test`, `validate-yamls` y los validadores de `tools/validate`. | Los tests nuevos corren en CI sin cambios. No hace falta tocar `validate-yamls.js`. |
| `.github/CODEOWNERS` asigna propietarios por carpeta. | Se añade `sources/`. |

## 5. Parte A: catálogo de metadatos

### 5.1 Configuración

Un fichero nuevo `sources/releases.yaml`, fuera de las categorías de activos (no es un agente, skill ni MCP, así que no lleva README ni lo recorren los generadores de activos):

```yaml
sources:
  - name: brainforge-companion
    repo: dmuleroa/dcx-brain-forge
    asset_pattern: "*.vsix"
    max_releases: 10
```

El repo origen vive solo aquí y **no se emite** en ningún catálogo.

### 5.2 Código

- `tools/catalog/releases.js`:
  - `toCatalogEntries(apiReleases, source)`: función pura que convierte la respuesta de la API en la entrada del catálogo.
  - `fetchReleases(repo, { token, fetch })`: llama a `GET /repos/{repo}/releases` (con `fetch` inyectable).
  - `resolveReleases(root, { previous, token, fetch, warn })`: lee `sources/releases.yaml`, recupera y convierte cada fuente, y aplica el respaldo de §5.5.
- `tools/lib/write-catalog.js`: `writeCatalogIfChanged(file, catalog)`, que compara con el archivo existente **ignorando `generatedAt`** y solo escribe si hay diferencias.
- `tools/catalog/build-v2.js`: `buildCatalogV2` incluye `options.releases ?? []` en la salida; su CLI llama a `resolveReleases` y escribe con `writeCatalogIfChanged`.
- `.github/scripts/generate-catalog.js` (v1): usa los mismos dos helpers y añade `releases` al catálogo.

Reglas de `toCatalogEntries`:

- Descarta borradores y prereleases.
- Selecciona el asset cuyo nombre cumple `asset_pattern`; si una release no tiene ninguno, la omite con un aviso.
- Ordena de más reciente a más antigua por `publishedAt` y conserva las primeras `max_releases`.
- No incluye notas de la release ni el nombre del repo origen.

### 5.3 Formato

Misma sección `releases` en `CATALOG.json` y en `CATALOG.v2.json`:

```json
"releases": [
  {
    "name": "brainforge-companion",
    "latest": "0.2.8",
    "versions": [
      {
        "version": "0.2.8",
        "tag": "v0.2.8",
        "publishedAt": "2026-10-26T08:46:34Z",
        "asset": {
          "name": "brainforge-companion-0.2.8.vsix",
          "size": 771527,
          "sha256": "a0e410aa3b4249b55d8887e34c6523f5f77ede51e270f158c95b9b29b106e695",
          "assetId": 677555191
        }
      }
    ]
  }
]
```

- `version` es el tag sin la `v` inicial.
- `sha256` es el `digest` de la API sin el prefijo `sha256:`.
- `assetId` es el `id` numérico del asset de la API REST (no el `node_id` `RA_...`).
- v1: la raíz no cambia (`version: "1.0.0"`). La sección es aditiva.
- v2: `schemaVersion` pasa de `2.0.0` a `2.1.0` (campo aditivo, según la regla de semver de su spec); se actualiza el test que lo comprueba.

### 5.4 Refresco

`generate-catalog.yml` gana:

- Un disparador `schedule` (cada 30 min), además del push a `main` y la PR.
- `BRAINFORGE_TOKEN` como variable de entorno en los pasos de generación.
- Un bloque `concurrency` para que el cron y un push a `main` no compitan por el `git push`.

Hoy `generatedAt` cambia en cada ejecución, y con el cron eso crearía un commit cada 30 min. `writeCatalogIfChanged` evita ese commit cuando no hay cambios reales; el paso de commit existente ya hace `git diff --staged --quiet ||`, así que no commitea si los archivos no cambian.

### 5.5 Token y errores

`BRAINFORGE_TOKEN`: PAT fine-grained con solo `Contents: read` sobre `dcx-brain-forge`, guardado como secreto de Actions.

- Sin token (por ejemplo PRs desde forks) o error de la API: se avisa por consola y se **conserva la sección `releases` del catálogo anterior** (`previous`). La generación del resto del catálogo no falla.
- Respuesta de la API sin releases válidas: mismo comportamiento, para no vaciar `releases` por accidente.

### 5.6 Documentación y gobierno

- `README.md`: añadir `sources/` a la estructura y explicar cómo añadir una fuente de releases y el secreto necesario.
- `.github/CODEOWNERS`: línea `sources/  @amutarbo`.
- `docs/consumers/README.md`: nueva sección para IA-Portal con el contrato de §6.

## 6. Parte B: contrato para el portal (IA-Portal)

No se implementa aquí. El portal debe:

1. Declarar `releases` en `CatalogSchema` (`hub-sync/dto/catalog.dto.ts`) y leerlo del catálogo v1 (`HUB_CATALOG_URL` sigue apuntando a `CATALOG.json`).
2. Mostrar versión, fecha y tamaño, con el botón de descarga de `latest`.
3. Exponer un endpoint autenticado, por ejemplo `GET /downloads/brainforge-companion/:version`, que:
   - comprueba la sesión del usuario;
   - busca la versión en el catálogo y responde 404 a cualquiera que no esté;
   - llama a `GET /repos/dmuleroa/dcx-brain-forge/releases/assets/{assetId}` con `Accept: application/octet-stream` y su propio token de solo lectura (el repo origen es configuración del portal, no viene del catálogo);
   - reenvía el archivo con `Content-Disposition: attachment; filename="<asset.name>"`;
   - puede verificar el `sha256` del catálogo antes de entregarlo.
4. No exponer nunca el token al navegador.

## 7. Pruebas

Con `node:test`, en `tests/`, ejecutadas por `npm test` en CI:

- `tests/releases.test.js`: `toCatalogEntries` con un fixture de la respuesta real de `v0.2.8` (`tests/fixtures/releases/`): asset correcto, descarte de borradores y prereleases, release sin `.vsix`, orden y recorte a `max_releases`; `resolveReleases` con `fetch` simulado: éxito, sin token, error de red y respuesta vacía (respaldo con `previous`).
- `tests/write-catalog.test.js`: no reescribe si solo cambia `generatedAt`; reescribe si cambia otra cosa.
- `tests/build-v2.test.js`: el catálogo incluye `releases` y `schemaVersion` `2.1.0`.
- Ejecución en seco del generador contra la API real, comprobando el formato de `releases`.

## 8. Fuera de alcance

- Copiar o republicar el `.vsix` en este repo.
- Modificar `dcx-brain-forge` o su workflow de releases.
- Notas de la release en el catálogo.
- Implementación de la parte B.
- Migrar el portal a `CATALOG.v2.json`.
