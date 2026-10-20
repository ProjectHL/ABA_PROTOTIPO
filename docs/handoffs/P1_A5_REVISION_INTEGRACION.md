# P1 — revisión de integración A5 (2026-09-18)

Revisión estática de rutas, vistas, contratos y migraciones. INTEGRADO no significa QA aprobado. No se ejecutaron pruebas funcionales ni escrituras clínicas para esta revisión.

## Cobertura conciliada

- AGENDA-001–012: app/calendar/page.tsx → CalendarPage → appointmentCommandSchema → calendar.server → aba_calendar_read_v2 / aba_calendar_command_v2 / aba_calendar_linkable_sessions_v2. DDL 20260916050000, validación/comandos 20260916104236 / 20260916104414, recurrencia 20260916102312 y lecturas 20260917162205 / 20260917162350. Calendario/listado, cita, participantes, zona, serie/ocurrencia y vínculo de sesión conectados.
- AGENDA-008 sólo acredita configuración y persistencia del recordatorio. Entrega durable, notificación, reintento y cancelación de entrega son dependencia P2/A4; scheduled no significa enviado.
- COMERCIAL-001, 002, 004–013: app/plans/page.tsx → PlansPage; IdentityShell → UpgradePlanModal → /plans?plan. Contratos de suscripción/documento → commercial.server → RPC V2 de 20260916051000. Adjuntos privados e historial montados con 20260917164427. Gestión interna de demostración, sin cobros ni documentos tributarios; cierre del modal no modifica el plan. COMERCIAL-006 no implica un segundo flujo de aprobación externa.
- SOPORTE-001–018: shell, landing y rutas /help, /support, /contact conectadas. Tickets, mensajes, estados y solicitudes comerciales mediante support.server y 20260916052000. Root conectó navegación de secciones y Conocer más a anclas reales, Documentación local a /help y retiró cursor/animación interactiva de tarjetas informativas. Los sociales sin configurar son texto no interactivo. No se promete IA, atención inmediata ni 24/7.

Resultado actualizado: 43/43 filas A5 INTEGRADO técnico. Matriz global tras sesión/captura base: 97 integradas y 337 pendientes; es estado de conciliación, no porcentaje de producto terminado. La conciliación completa de A2/programación aún falta.

## Correcciones durante la revisión

CalendarPage, PlansPage y SupportPage ofrecen reconsulta dentro del modal de conflicto. No se puede aceptar una lectura en curso, fallida o sin recurso vigente. La aceptación mantiene el texto y requiere nuevo envío; cancelaciones comerciales/de agenda deben volver a confirmarse. Planes no convierte una lectura fallida en una suscripción nueva. Citas canceladas, documentos archivados y respuestas a tickets cerrados no se habilitan desde la revisión.

## COMERCIAL-003 — ocupación vigente corregida

La migración forward 20260919052718 hace que aba_commercial_read_v2 cuente memberships activas en cada lectura sin mutar el snapshot comercial ni cambiar grants. El contrato permite representar sobreocupación real y PlansPage muestra una alerta con el exceso; los comandos continúan impidiendo seleccionar menos plazas que la ocupación vigente. Aplicada sólo a aba-reintegration-local y confirmada por catálogo; sin consulta funcional.

## Evidencia y límites

TypeScript pasó tras las correcciones A5 y landing. QA visual/funcional permanece R5. Las guardas actuales cubren menú del shell, formularios y beforeunload; no se acredita navegación nativa atrás SPA. Sin migraciones, reset, fixtures ni reinicios en este paquete.
