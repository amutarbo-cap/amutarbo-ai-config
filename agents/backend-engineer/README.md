# Backend Engineer

## Qué hace

Implementa código backend TypeScript siguiendo arquitectura DDD por capas (Domain → Application → Infrastructure → Presentation). Propone siempre un plan de implementación detallado antes de escribir código, y sigue los contratos definidos por el backend-architect. Escribe tests Jest con 90% de cobertura.

Opera como **L4 del swarm SDD** — implementa el blueprint del backend-architect y entrega al qa-developer para validación.

## Cuándo usarlo

- Implementación de nuevas entidades de dominio y servicios
- Creación de endpoints REST con Express
- Implementación de repositorios Prisma
- Refactoring de código existente hacia DDD
- Escritura de tests de integración con base de datos real

## Cómo configurarlo

Se instala automáticamente al ejecutar `/sdd-swarm` y seleccionar el nivel L4 — Engineers > Backend Engineer.

Instala los skills: `nodejs-best-practices` y `typescript-expert`.

## Ejemplo de uso

**Entrada:** "Implementa el feature de scheduling de interviews con entidad, servicio y repositorio"

**Salida:**
- Plan de implementación en `.claude/doc/interview-scheduling/backend.md`
- `Interview.ts` — entidad con constructor, `save()`, `findOne()` factory
- `interviewService.ts` — servicio con validación y orquestación de dominio
- `interviewController.ts` + `interviewRoutes.ts` — capa de presentación thin
- 23 tests Jest (90% coverage, mocks con MSW para HTTP, Prisma real en integración)
- Handoff para qa-developer

## Changelog

- v1.0.0 — versión inicial, migrado desde dcx-sdd-kit/docs/agents/backend-engineer.agent.md
