# A5 R2 — Agenda, gestión comercial y soporte

Estado: **PROPUESTO / PARCIAL — no integrado, no QA aprobado**. Fecha: 2026-09-15.

## Entrega de código

- `src/modules/calendar/contracts.ts` y `calendar.server.ts`: DTO de agenda, lectura y comando `aba_calendar_command_v2`. El adaptador exige que la clínica capturada coincida con la activa y solo acepta un `CommandResult` con identidad exacta.
- `src/modules/commercial/contracts.ts` y `commercial.server.ts`: lectura del catálogo/plan/documentos, cambios de suscripción y documentos internos. Las mutaciones requieren administración de la clínica y nunca aceptan pagos, impuestos ni documentos tributarios.
- `src/modules/support/contracts.ts` y `support.server.ts`: tickets, lectura autorizada y solicitud comercial pública con contrato no clínico.
- `src/components/UpgradePlanModal.tsx`: conserva el modal original pero consulta catálogo/plan autorizado, muestra importes de demostración y mantiene la misma operación/idempotency key si se reintenta la misma selección durante la apertura. La UI no afirma cambio hasta recibir `acknowledged`.
- `src/views/LandingPage.tsx`: corrige los textos y affordances existentes: elimina promesas de IA, soporte humano 24/7, repositorio/redes externos sin destino y descripciones ajenas al producto. El botón de contacto se dirige al destino local `/support`, cuya ruta/pantalla final es integración de root R4.

Los RPC consumidos, aún no existentes, son: `aba_calendar_command_v2`, `aba_calendar_read_v2`, `aba_subscription_command_v2`, `aba_commercial_document_command_v2`, `aba_commercial_read_v2`, `aba_support_ticket_command_v2`, `aba_support_ticket_read_v2` y `aba_commercial_inquiry_v2`.

## Propuesta de persistencia

`A5_R2_AGENDA_COMERCIAL_SOPORTE_PROPOSAL.sql` contiene DDL, índices y RLS/grants limitados a las tablas nuevas:

- agenda con serie/ocurrencia, zona IANA explícita, participantes, recordatorios persistidos, eventos y vínculo a sesión;
- plan/versiones, suscripción por clínica y documentos comerciales únicamente internos y de demostración;
- tickets, mensajes ordenados, eventos de estado y solicitudes comerciales públicas sin datos clínicos.

No se creó, aplicó ni ejecutó migración. Root debe generarla con Supabase CLI, revisar la sintaxis y aplicar solo tras resolver las dependencias.

## Dependencias de integración que no se deben adivinar

1. A2 debe confirmar las tablas/FK canónicas para `family_person_id` y `attachment_version_id`. La propuesta no inventa ni enlaza IDs estables de personas/adjuntos que aún no están aplicados.
2. A3/root deben decidir si el vínculo final se conserva contra `clinical_sessions` V1 o se migra a la sesión V2. La propuesta usa el FK compuesto V1 existente para que el vínculo nunca cambie de ficha, pero no pretende declarar equivalencia clínica V1/V2.
3. Root debe implementar las funciones SQL concretas descritas al final de la propuesta: validación JSON estricta, lock/replay del ledger, reautorización posterior al lock, comparación de versión real y emisión de recibo en la misma transacción. No hay permiso concedido por los Server Actions.
4. Root integra rutas `/calendar`, `/support` y `/plans` y los slots de `MainLayout`; A5 no modifica `app/**` ni `MainLayout` por propiedad exclusiva.
5. A2 extiende el servicio de adjuntos para el recurso comercial; hasta entonces el documento solo puede exponer metadatos, nunca Storage público.

## Cobertura de matriz propuesta

- Agenda: `AGENDA-001` a `AGENDA-012`.
- Comercial: `COMERCIAL-001` a `COMERCIAL-013`.
- Soporte: `SOPORTE-001` a `SOPORTE-018`.

La cobertura anterior es de contrato/adaptador/propuesta, no evidencia funcional. Rutas, persistencia aplicada, calendar UI completa, documentos adjuntos y recordatorios programados siguen pendientes de integración.

## Ejemplos Postman documentales — no ejecutados

```json
{
  "p_organization_id": "<clinic-uuid>",
  "p_command": {
    "schemaVersion": 2,
    "operationId": "<stable-operation-uuid>",
    "idempotencyKey": "<stable-key-uuid>",
    "appointmentId": "<appointment-uuid>",
    "studentId": "<student-uuid>",
    "expectedVersion": 0,
    "action": "create",
    "input": { "studentId": "<student-uuid>", "title": "Sesión", "notes": "", "startsAt": "2026-09-15T14:00:00-03:00", "endsAt": "2026-09-15T15:00:00-03:00", "timeZone": "America/Santiago", "participants": [{ "kind": "professional", "userId": "<user-uuid>" }], "reminderMinutesBefore": [60], "recurrence": null }
  }
}
```

```json
{
  "p_organization_id": "<clinic-uuid>",
  "p_command": { "schemaVersion": 2, "operationId": "<stable-operation-uuid>", "idempotencyKey": "<stable-key-uuid>", "subscriptionId": "<subscription-uuid>", "clinicId": "<clinic-uuid>", "expectedVersion": 3, "confirmation": true, "commercialMode": "internal-demonstration", "action": "change-plan", "planVersionId": "<plan-version-uuid>", "seats": 5, "reason": "Cambio interno de demostración confirmado." }
}
```

R5/A8 consolidará esos ejemplos en una colección Postman con autenticación local sin secretos y ejecutará los casos de recurrencia, reprogramación, cancelación, zona horaria, recordatorios, plazas, documentos, tickets, reintento y aislamiento.

## Evidencia estática

`npm exec -- tsc --noEmit --incremental false` terminó con exit 0 tras esta entrega. Se ejecutó solo como revisión de tipado, no como suite ni QA funcional. `git diff --check` terminó sin errores; los avisos CRLF observados corresponden a cambios ya presentes ajenos al paquete.
