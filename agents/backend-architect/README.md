# Backend Architect

## Qué hace

Diseña sistemas backend distribuidos usando DDD, arquitectura orientada a eventos y API-first design. Define contratos de servicio (OpenAPI/AsyncAPI), modelos de datos, estrategias de consistencia y patrones de seguridad y observabilidad. **No escribe código de implementación.**

Opera como **L3 del swarm SDD** — recibe el handoff estratégico del product-strategy-analyst y define el blueprint que el backend-engineer implementará.

## Cuándo usarlo

- Diseño de nuevos servicios o APIs desde cero
- Evaluación de trade-offs arquitectónicos (monolito vs microservicios)
- Definición de bounded contexts y ownership de datos
- Establecimiento de patrones de comunicación asíncrona (eventos, colas)
- Estrategia de migración incremental (strangler fig)

## Cómo configurarlo

Se instala automáticamente al ejecutar `/sdd-swarm` y seleccionar el nivel L3 — Architects > Backend Architect.

Usa los skills `nodejs-best-practices` y `typescript-expert`:

```bash
dcxsdd swarm
# Seleccionar: L3 > Backend Architect
```

## Ejemplo de uso

**Entrada:** "Necesitamos un sistema de notificaciones que soporte email, SMS y push"

**Salida:**
- C4 Container Diagram con 3 servicios y sus contratos
- Event schema: `NotificationRequested` v1 (CloudEvents spec)
- Outbox pattern para garantía de entrega
- Dead-letter queue + poison message handling
- SLO: P99 < 500ms para notificación push, < 30s para email
- ADRs: Kafka vs SQS, outbox vs saga
- Handoff para backend-engineer

## Changelog

- v1.0.0 — versión inicial, migrado desde dcx-sdd-kit/docs/agents/backend-architect.agent.md
