# A4 — ejemplos operativos para la colección final

Fecha: 2026-09-26. Documentación, no colección/suite. No ejecutar hasta R5.
Chat y sus adjuntos excluidos. Se revisaron contratos TS y adaptadores actuales;
esto no acredita que el backend haya ejecutado estos ejemplos.

Base local: `api_url=http://127.0.0.1:54321`, `app_url=http://localhost:3000`.
RPC: POST `{{api_url}}/rest/v1/rpc/NOMBRE`, Content-Type application/json,
apikey `{{publishable_key}}`, Authorization `Bearer {{access_token}}`.
Tokens/credenciales sólo en entorno privado de operador; nunca versionarlos.
Variables UUID deben sustituirse por identidades/recursos del lote sintético
autorizado. No crear fixtures ni escribir desde esta guía durante R4.

## Reglas de comandos

Cada comando nuevo genera UUID nuevos `operation_id` e `idempotency_key`.
Ante resultado desconocido, repetir body completo exacto, incluidos esos UUID.
Una nueva acción usa nuevas claves y expectedVersion leído, no el número supuesto.
No enviar propiedades ajenas: los contratos son cerrados. HTTP 200 no es éxito:
validar status y correlación operationId/idempotencyKey/resourceId; acknowledged
requiere receiptId/serverVersion/committedAt. Conflicto conserva borrador; releer
antes de decidir otra operación. Fallo de refresco no invalida un recibo conocido.

## Invitación externa por ficha

Lectura `aba_student_share_read_v2`:
`{"p_organization_id":"{{clinic_id}}"}`. Bandeja recibida previa a contexto:
`{"p_organization_id":null}`. No crea membresía general.

Comando `aba_student_share_command_v2`, alta:

```json
{"p_organization_id":"{{clinic_id}}","p_command":{"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","invitationId":"{{invitation_id}}","studentId":"{{student_id}}","expectedVersion":0,"action":"invite","recipientEmail":"externo.sintetico@aba.example.test","level":"program-results","message":"Consulta de los programas y resultados autorizados."}}
```

Para acciones existentes, conservar invitationId/studentId de la lectura y usar
expectedVersion numérico vigente. Base p_command (envuelta con p_organization_id):

```json
{"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","invitationId":"{{invitation_id}}","studentId":"{{student_id}}","expectedVersion":1,"action":"accept"}
```

El 1 es ilustrativo, sustituir por versión leída. Variantes de esa base:

| Acción | Campos exactos adicionales | Identidad ejecutora |
|---|---|---|
| accept | ninguno | Destinatario Auth exacto |
| reject | ninguno | Destinatario Auth exacto |
| resend | ninguno | Gestor interno autorizado |
| cancel | ninguno | Gestor interno autorizado |
| change-level | `"level":"full-read","reason":"Cambio solicitado por responsable."` | Gestor interno autorizado |
| revoke | `"reason":"Fin de colaboración.","confirmation":true` | Gestor interno autorizado |

Nivel también puede ser clinical-edit: no concede usuarios, facturación ni
delegación. Pendiente no concede acceso. Leer detalle/historial desde la UI.

## Solicitudes internas V2

Lectura `aba_student_access_request_read_v2`:
`{"p_organization_id":"{{clinic_id}}"}`. No usar RPC legacy revocadas.

Crear mediante `aba_student_access_request_command_v2`:

```json
{"p_organization_id":"{{clinic_id}}","p_command":{"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","requestId":"{{request_id}}","studentId":"{{student_id}}","expectedVersion":0,"action":"request","resourceType":"program","requestedActions":["program.edit"],"reason":"Revisión autorizada del diseño."}}
```

Otras combinaciones cerradas: student→student.edit;
record_config→record_config.create/record_config.edit; chart→chart.configure.
Solicitante debe ser elegible actualmente; no se solicita acceso externo por esto.

Decidir mediante `aba_student_access_decision_command_v2`:

```json
{"p_organization_id":"{{clinic_id}}","p_command":{"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","requestId":"{{request_id}}","studentId":"{{student_id}}","expectedVersion":1,"action":"approve","expiresAt":"{{future_expiration_iso}}","reason":"Autorización temporal revisada.","confirmation":true}}
```

expiresAt debe ser instante ISO con offset futuro válido según reglas servidor.
Denegar usa action=deny y expiresAt=null; conservar reason/confirmation y versión
vigente. Decisión exige gestor autorizado, no sólo conocer requestId.

## Vínculo familiar y publicaciones

Lectura `aba_family_access_read_v2`:
`{"p_organization_id":"{{clinic_id}}","p_client_id":"{{student_id}}"}`.
Bandeja recibida sin contexto usa ambos null; no concede contenido clínico.

Invitar con `aba_family_access_command_v2`:

```json
{"p_organization_id":"{{clinic_id}}","p_command":{"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","linkId":"{{link_id}}","studentId":"{{student_id}}","familyPersonId":"{{family_person_id}}","expectedVersion":0,"action":"invite","recipientEmail":"familia.sintetica@aba.example.test","message":"Invitación al portal familiar."}}
```

Acciones existentes usan p_command con operationId/idempotencyKey/linkId/studentId/
familyPersonId/expectedVersion vigente/action. accept/reject por destinatario;
cancel por gestor: sin email/message. revoke añade confirmation=true y reason
no vacío, por gestor. No existe acción familiar resend en el contrato vigente.

Gestión `aba_family_publication_manage_read_v2`:
`{"p_organization_id":"{{clinic_id}}","p_client_id":"{{student_id}}"}`.
Seleccionar sólo IDs autorizados devueltos por esa consulta.

Publicar con `aba_family_publication_command_v2`:

```json
{"p_organization_id":"{{clinic_id}}","p_command":{"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","publicationId":"{{new_publication_id}}","studentId":"{{student_id}}","expectedVersion":0,"predecessorId":null,"programVersionIds":["{{released_program_version_id}}"],"recordRevisionIds":["{{submitted_record_revision_id}}"],"attachmentVersionIds":["{{available_document_version_id}}"],"familyPersonIds":["{{active_family_person_id}}"],"introduction":"Contenido seleccionado expresamente para esta familia."}}
```

Las listas pueden estar vacías individualmente, según selección autorizada; no
inventar IDs si un tipo no se publica. Sucesor usa NUEVO publicationId, predecessorId
vigente y expectedVersion leída; conserva el borrador al consultar una sustitución
concurrente. Versiones no son IDs de programa/registro/adjunto lógico.

Portal `aba_family_portal_read_v2` y agenda `aba_family_calendar_read_v2`:
`{"p_organization_id":"{{clinic_id}}"}` por destinatario vigente. Agenda exige
participación familiar explícita. No consultar tablas clínicas como sustituto.

Documento `aba_family_document_read_v2`:
`{"p_organization_id":"{{clinic_id}}","p_publication_id":"{{current_publication_id}}","p_version_id":"{{published_document_version_id}}"}`.
Devuelve metadatos, no descarga bytes ni firma URL. Flujo real de descarga:
GET `{{app_url}}/family/documents?clinicId={{clinic_id}}&publicationId={{current_publication_id}}&versionId={{published_document_version_id}}`
con cookie de sesión de navegador válida y contexto familiar activo. No sustituir
esa sesión por service_role. Storage sólo permite object.get_authenticated para
familia autorizada; no listar, firmar, subir o cachear offline por este permiso.

**Pendiente de aplicar:** migración 20260926221536 endurece recurso/identidad viva.
No dar descarga/portal por aceptados hasta aplicación, catálogo y revisión final.

## Campana y recordatorios

Lectura `aba_notifications_read_v2`: `{"p_limit":50}`.
Materializar `aba_due_reminders_dispatch_v2`: `{"p_limit":100}`; ES ESCRITURA,
sólo ejecutar en R5 autorizado. Recibo por destinatario, no promesa de cron externo
ni correo; la campana lo llama al recuperar estado.

Lectura/no lectura con `aba_notification_read_state_v2`:

```json
{"p_notification_id":"{{notification_id}}","p_read":true,"p_expected_version":1,"p_operation_id":"{{operation_id}}","p_idempotency_key":"{{idempotency_key}}"}
```

p_read=false marca no leída con versión actual y otra operación; un retry exacto
no modifica versión ni identidad. Navegación se hace sólo tras recibo confirmado
y guardas. Autoridad servidor por destinatario, no por resourcePath enviado.

## Trazabilidad y aceptación posterior

Fuentes: src/domain/collaboration/student-share.ts, access-request.ts;
modules/collaboration/contracts.ts y collaboration.server.ts;
modules/family/contracts.ts y family.server.ts;
modules/notifications/contracts.ts y notifications.server.ts;
app/family/documents/route.ts. No duplicar Server Actions para facilitar Postman:
en R5 se prueban sus pantallas reales además de las API autorizadas.

A8 deberá cubrir replay exacto/colisión, doble envío, permisos revocados, dos
clínicas, versiones sustituidas, vínculo/persona/org/ficha inactivos y reconexión.
Estos ejemplos no son QA aprobado ni reemplazan la colección final Postman2.1.
