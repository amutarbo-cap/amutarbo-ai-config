# capgemini-ai-config

Repo central de agentes, skills y MCPs para el ecosistema DCX AI.
Distribuye configuraciones a `dcx-sdd-kit` e `IA-Portal` vía GitHub Actions.

> **Contexto comprimido en el vault:**
> Lee `C:\Users\amutd\dcx-brain\proyectos\capgemini-ai-config.md` antes de empezar.
> Estado de trabajo actual: `C:\Users\amutd\dcx-brain\sesion-activa.md`

## Reglas rápidas

- `CATALOG.json` nunca se edita manualmente — lo regenera la GitHub Action
- Cada agente/skill/mcp vive en su propia carpeta con un `README.md`
- Usa `mcps/.example/` como plantilla para MCPs nuevos. Las skills se crean con el generador de skills de Claude (no hay plantilla de skills en el repo)
- Versioning semántico obligatorio en cada YAML (`version: x.y.z`)
