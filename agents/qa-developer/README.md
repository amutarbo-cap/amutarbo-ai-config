# QA Developer

## Qué hace

Asume que el código está roto hasta que se prueba. Con mentalidad adversarial, diseña planes de test exhaustivos cubriendo happy path, boundary, negative, error handling, concurrencia y seguridad. Escribe tests determinísticos, rápidos y mantenibles. Reporta bugs con pasos de reproducción exactos y severidad clara.

Opera como **L5 del swarm SDD** — valida el trabajo de los engineers antes de cerrar cualquier spec con `/sdd-done`.

## Cuándo usarlo

- Validación de features antes de merge a main
- Diseño de estrategia de testing para un nuevo módulo
- Investigación de bugs reportados por usuarios
- Setup de testing en CI (coverage gates, E2E)
- Code review enfocado en calidad y cobertura de tests

## Cómo configurarlo

Se instala automáticamente al ejecutar `/sdd-swarm` y seleccionar el nivel L5 — QA > QA Developer.

Instala el skill `typescript-expert`.

## Ejemplo de uso

**Entrada:** Feature de login implementado con JWT, rate limiting y 2FA opcional

**Salida:**
- Test plan: 6 categorías, 34 casos de test priorizados por riesgo
- Tests automatizados: 28 unit tests + 6 integration tests (Jest + Supertest)
- Bugs encontrados: 2 Critical (bypass de rate limiting), 1 High (2FA state leak)
- Bug reports con reproducción exacta y logs de evidencia
- Handoff a backend-engineer con los 3 bugs para fix

## Changelog

- v1.0.0 — versión inicial, migrado desde dcx-sdd-kit/docs/agents/qa.agent.md
