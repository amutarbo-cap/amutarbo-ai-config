# capgemini-ai-config

Repositorio central para distribuir configuraciones de IA reutilizables entre proyectos Capgemini:
- **Agentes**: especialistas IA para tareas específicas (accesibilidad, testing, code review, etc.)
- **Skills**: extensiones o comandos para potenciar flujos de trabajo
- **MCPs**: integraciones con servicios externos (Figma, GitHub, Jira, etc.)

Una sola fuente de verdad. Los repos consumidores sincronizan cambios mediante GitHub Actions.

## Estructura

```text
.
├── agents/                    # Agentes especializados
│   ├── accesibilidad/
│   │   ├── accesibilidad.yaml
│   │   └── README.md
│   └── .example/              # Plantilla de referencia
├── skills/                    # Skills por tipo y tecnología
│   ├── common/                # Skills transversales
│   └── tech/                  # Skills por tecnología
├── mcps/                      # Integraciones MCP
│   └── .example/
│       ├── mcp.yaml
│       └── README.md
├── resources/                 # Recursos compartidos
├── sources/                   # Fuentes externas de releases
├── .github/workflows/         # CI/CD para validación
├── CATALOG.json               # Índice generado automáticamente
└── README.md
```

## Releases externas

Algunas herramientas se publican como releases de otro repositorio. `sources/releases.yaml` declara de dónde leerlas:

```yaml
sources:
  - name: brainforge-companion
    repo: <owner>/<repo>
    asset_pattern: "*.vsix"
    max_releases: 10
```

- `name`: identificador en el catálogo.
- `repo`: repositorio origen de las releases.
- `asset_pattern`: patrón del asset a incluir (las releases sin asset que lo cumpla se omiten).
- `max_releases`: número máximo de versiones, de más reciente a más antigua.

La GitHub Action regenera los catálogos cada 30 minutos (cron) y añade la sección `releases` a `CATALOG.json` y `CATALOG.v2.json`, con versión, fecha, nombre, tamaño, `sha256` y `assetId` del asset. Solo hace commit si hay cambios reales.

Requiere el secreto de Actions `BRAINFORGE_TOKEN`: un PAT fine-grained con únicamente `Contents: read` sobre el repo origen. El nombre del repo origen no se publica en los catálogos.

- GitHub desactiva los workflows programados de repos públicos tras 60 días sin actividad en el repo; si las releases dejan de refrescarse, reactivar el workflow desde la pestaña Actions o hacer cualquier commit.
- `generatedAt` refleja el último cambio real de contenido del catálogo, no la última ejecución.
- `asset_pattern` distingue mayúsculas de minúsculas.

## Crear un nuevo agente

1. Copia la plantilla `.example/`:
   ```bash
   cp -r agents/.example agents/mi-agente
   ```

2. Edita `mi-agente/agente.yaml`:
   ```yaml
   name: mi-agente
   version: 1.0.0
   description: Qué hace
   model: claude-sonnet-4-6
   tools: [web_search]
   tags: [categoria]
   maintainer: "@tu-usuario"
   ```

3. Edita `mi-agente/README.md` con:
   - **Qué hace**: descripción clara
   - **Cuándo usarlo**: casos de uso
   - **Cómo configurarlo**: setup/instalación
   - **Ejemplo de uso**: interacción real
   - **Changelog**: v1.0.0 inicial

4. Commitea:
   ```bash
   git add agents/mi-agente/
   git commit -m "feat: add mi-agente"
   ```

## Crear una nueva skill

Las skills se generan con el generador de skills de Claude y se colocan en `skills/common/` (transversal) o en `skills/tech/<tecnología>/`. Cada skill necesita `SKILL.md` con frontmatter completo (ver `docs/superpowers/specs/2026-10-26-skills-library-platform-design.md`, §7) y un `README.md`. El validador (`node tools/validate/run.js`) comprueba el resultado.

## Crear una nueva integración MCP

1. Copia la plantilla:
   ```bash
   cp -r mcps/.example mcps/mi-mcp
   ```

2. Edita `mi-mcp/mcp.yaml`:
   ```yaml
   name: mi-mcp
   version: 1.0.0
   description: Qué servicio integra
   url: https://mcp.servicio.com/sse
   auth:
     type: oauth2  # oauth2 | api_key | none
     scopes: [scope1, scope2]
   tags: [integracion]
   maintainer: "@tu-usuario"
   ```

3. Edita `mi-mcp/README.md` documentando el servicio y configuración

4. Commitea

## Versionado

- Usa **tags semánticos** para releases estables: `v1.0.0`, `v1.1.0`
- En repos consumidores, fija `ref` a un tag para reproducibilidad
- Usa `main` solo para cambios en desarrollo

## Validación

El repo ejecuta validación automática en cada PR:
- Esquema YAML correcto (script: `.github/scripts/validate-yamls.js`)
- Estructura de archivos completa
- Generación automática de `CATALOG.json`

## Desde repos consumidores

Los repos que consumen este catálogo pueden sincronizar cambios:

1. Copia `templates/consumer-sync.yml` → `.github/workflows/sync-ai-config.yml`
2. Ajusta:
   - `paths`: qué carpetas quieres traer (`agents/**`, `skills/**`, etc)
   - `target_root`: destino en tu repo (`./ai-config`, `./`, etc)
   - `ref`: rama/tag del repo central (`main`, `v1.0.0`, etc)
3. Ejecuta manualmente o programa con `schedule`

**Si este repo es privado**, agrega un secret al repo consumidor:
- `AI_CONFIG_SOURCE_TOKEN`: PAT con acceso a lectura de `capgemini-ai-config`

## Convenciones

- Cada agente/skill/MCP debe tener owner (maintainer) y versión en su YAML
- Evitar lógica específica de un proyecto en el catálogo central
- Las plantillas `.example/` son referencias, no código acoplado
- El nombre del agente/skill/MCP debe coincidir con la carpeta

## Contribuir

1. Crea una rama: `git checkout -b feat/nuevo-agente`
2. Sigue la plantilla `.example/` para tu tipo (agente/MCP) o el generador de skills (skills)
3. Asegúrate que el YAML es válido (valida localmente si es posible)
4. Pushea y abre PR
5. La validación automática comprobará estructura y esquema
6. Once merged, el `CATALOG.json` se regenera automáticamente
