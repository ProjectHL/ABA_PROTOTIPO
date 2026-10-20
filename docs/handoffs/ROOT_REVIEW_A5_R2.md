# Revisión root A5 R2 — agenda, comercial y soporte

Fecha: 2026-09-15. Resultado: **PARCIAL / NO APTO PARA MIGRACIÓN**. El código y el DDL son insumos útiles, pero no prueban integración ni QA.

## Bloqueantes P0

1. Todas las referencias a `clients` deben usar la clave canónica `(organization_id, id)` ya aplicada por root. La propuesta usa `(client_id, organization_id)` y no puede apoyarse en una clave alterna inventada.
2. Participantes profesionales y familiares requieren FKs compuestas a membresía/identidad A2 dentro de la misma clínica. `family_person_id` y `professional_user_id` sueltos no son aislamiento tenant.
3. `appointment_participants_v2`, recordatorios, eventos, mensajes y eventos de ticket necesitan `test_run_id` con FK compuesta, derivado del recurso padre; de otro modo los fixtures no son trazables ni limpiables con seguridad.
4. El vínculo de documento a suscripción debe ser compuesto con `organization_id`; el vínculo a adjunto queda diferido hasta la tabla A2 canónica. También falta una tabla/evento inmutable para cambios de suscripción y documento.
5. No basta comentar los RPC: deben existir implementaciones privadas `SECURITY DEFINER` revisadas y wrappers públicos `SECURITY INVOKER`, con privilegios directos revocados. Un wrapper invoker no puede escribir tablas sin un límite privado explícito.
6. Cada comando debe validar el objeto JSON exacto antes de cualquier cast, autorizar antes y después del ledger/locks, mapear colisiones de identidad sin versiones inventadas, persistir evento y emitir `CommandResult` en la misma transacción.
7. Recurrencia debe materializar fechas locales IANA, detectar instantes ambiguos/inexistentes y modelar excepción de ocurrencia/serie sin sumar intervalos UTC. La regla JSON necesita forma cerrada y límites iguales al contrato TypeScript.
8. Cancelación, recordatorios y eventos requieren checks de coherencia (`reason` no vacío y acotado, `sent_at` según estado, payload objeto y transiciones legales). Series y ocurrencias no deben poder quedar enlazadas a estudiantes distintos.
9. Soporte necesita secuencia bloqueada por ticket, transiciones cerradas y pertenencia activa. La consulta anónima necesita función concreta con hash derivado por servidor, rate limit durable, respuesta idempotente y rechazo de toda clave clínica.
10. Revocar privilegios debe incluir `PUBLIC`, `anon`, `authenticated` y `service_role` según el límite; las políticas hijas deben correlacionar organización además del ID aun cuando el UUID sea global.
11. `occupied_seats` no puede ser una cifra confiada al cliente: la mutación debe derivarla de membresías activas dentro del mismo lock. Catálogo y documentos deben permanecer explícitamente de demostración, sin pago, folio ni semántica tributaria.
12. Faltan las rutas/pantallas completas `/calendar`, `/support` y `/plans`, y montar `UpgradePlanModal` desde el slot real de `IdentityShell`; los cambios actuales no están alcanzables de extremo a extremo.

## Decisión de etapa

No crear migración A5 todavía. Resolver dependencias A2/A3 y convertir los requisitos anteriores en DDL/RPC concretos. Postman y QA funcional permanecen exclusivamente en R5/A8.
