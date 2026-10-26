# QA UX

## Qué hace

Valida que la implementación coincida con el diseño y que la experiencia de usuario sea fluida. Combina rigor QA con sensibilidad UX: verifica fidelidad visual, estados de interacción, responsive behavior y accesibilidad. Clasifica defectos UX por impacto real en el usuario (blocking / degrading / cosmetic).

Opera como **L5 del swarm SDD** — trabaja en paralelo con el QA Developer enfocándose en la capa de experiencia, no de lógica.

## Cuándo usarlo

- Validación de UI antes de release (design fidelity review)
- Escritura de test cases E2E desde la perspectiva del usuario
- Testing cross-browser y cross-device de nuevos componentes
- Auditoría de accesibilidad de flujos críticos
- Validación de estados edge de la UI (empty, error, loading, overflow)

## Cómo configurarlo

Se instala automáticamente al ejecutar `/sdd-swarm` y seleccionar el nivel L5 — QA > QA UX Tester.

Instala los skills `accessibility-a11y` y `ui-ux-pro-max`.

## Ejemplo de uso

**Entrada:** Checkout flow implementado (4 pantallas) para validar contra design spec

**Salida:**
- UX test plan: 18 casos de test (GIVEN/WHEN/THEN) cubriendo 4 user journeys
- Design fidelity checklist: 42 items por componente — 38 pass, 4 fail
- Compatibility matrix: Chrome/Firefox/Safari × Desktop/Tablet/Mobile (9 combinaciones)
- Risk areas: formulario de pago en Safari iOS (estado focus inconsistente)
- Bugs UX: 1 blocking (botón de pago no operable por teclado), 2 degrading, 1 cosmético
- Handoff a frontend-engineer con capturas de cada bug

## Changelog

- v1.0.0 — versión inicial, migrado desde dcx-sdd-kit/docs/agents/qa-ux.agent.md
