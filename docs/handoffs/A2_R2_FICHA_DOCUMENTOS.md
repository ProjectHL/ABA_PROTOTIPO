# A2 R2 — ficha y documentos (entrega para revisión root)

Estado: **PARCIAL / PROPUESTO / pendiente de revisión e integración root**. No es QA aprobado y no se ejecutaron consultas funcionales, Postman, Storage ni recorridos UI. Esta no es una entrega cerrada: faltan migraciones/RPC/worker, listado/preview/versionado de documentos y las acciones de personas/historial indicadas abajo.

## Código entregado

- `src/views/StudentsPage.tsx` conserva lista/detalle original y carga mediante clínica activa, RLS y `get_student_capabilities`; no usa la consulta cliente/mocks de la ruta oficial.
- `src/features/students/StudentsList.tsx` conserva búsqueda, Vigentes/Antiguos/Todos, tarjeta, menú y alta; el modal de alta genera comando V2, jamás inserta una tarjeta local.
- `src/features/students/StudentDetail.tsx` conserva cabecera/tabs General, Familia, Documentos, Medicación y Programación. Los cambios sólo se anuncian tras `acknowledged`; conflicto/rechazo conserva formulario y transporte es desconocido.
- `src/modules/students/contracts.ts` publica `AuthorizedStudentSummary`, `StudentDetailDto`, personas con `roles` simultáneos y hermanos separados.
- `src/modules/students/student.server.ts` compara `clinicId` con identidad activa, restringe organización, usa `get_student_capabilities`, mantiene valores V1 como `null` (nombre, RUT, foto, frecuencia/notas) y define el boundary RPC V2.
- `src/modules/attachments/attachment.server.ts` reserva → carga privada → re-descarga/verifica header/SHA → confirma. Si el objeto ya existe tras timeout, verifica su huella y reintenta la confirmación con la misma identidad; nunca usa `upsert`, URL pública ni service role.
- `src/modules/attachments/contracts.ts` exige envelope `CommandResult + AttachmentVersion`: versión sólo en `acknowledged`; reserva/confirmación tienen operation/key distintos y estables individualmente.

El DTO requerido por A3 está disponible en `src/modules/students/student.server.ts`: `listAuthorizedStudents(clinicId)` y `getAuthorizedStudent(studentId, clinicId)`. `version: null` identifica una fila V1 sin versión numérica; ningún consumidor debe fabricar `expectedVersion`.

## Propuestas SQL para root

- `A2_STUDENTS_CLINICAL_PROPOSAL.sql`: perfil V2 aditivo, personas/roles e IDs estables, hermanos separados, revisiones de historial/medicación, vínculo de consentimiento, RLS/grants/índices y compatibilidad V1.
- `A2_ATTACHMENTS_STORAGE_PROPOSAL.sql`: metadatos/versiones/asociaciones, bucket privado `clinical-attachments`, convivencia con `profile-avatars`, políticas Storage, hashes/límites y boundary RPC.
- `A2_COMMANDS_PROPOSAL.sql`: secuencia concreta de autorización, ledger, replay, locks, reautorización, auditoría y recibo; incluye alta sin fila preexistente y prohibición de borrar IDs de personas/hermanos asociados.
- `A2_VERIFY_ATTACHMENT_EDGE.ts.proposal`: frontera Edge propuesta que valida JWT, descarga con credencial restringida, comprueba tamaño/magic/SHA y sólo entonces invoca confirmación privada idempotente.

Ambas terminan en `rollback` y son **propuestas que no se aplicaron**. Root debe crear nombres/orden de migración con CLI, revisar referencias de funciones existentes y regenerar tipos. Después de cualquier recibo/objeto real corresponde forward-fix, no rollback destructivo.

## Contratos/RPC que root debe implementar y revisar

1. `aba_student_command_v2(organization_id, command)`; el alta preautoriza sólo clínica activa + admin/supervisor, y el RPC vuelve a autorizar tras reservar el ID. Update/archive/reactivate requieren `student.edit` antes y después de locks.
2. `aba_clinical_history_command_v2` y `aba_consent_command_v2`; usan ledger por operación/clave/recurso, versión esperada, auditoría/revisión y recibo en la misma transacción.
3. `aba_attachment_reserve_v2`, `aba_attachment_confirm_v2`, `aba_attachment_archive_v2`; devuelven `{ result, version }`, con `resourceId=attachmentId`, y sólo `acknowledged` expone versión.
4. `aba_attachment_read_v2` y `aba_attachment_resource_authorized_v2`; validan la asociación exacta (incluido chat/comercial) en DB antes de firmar. El servidor cambia origen de URL firmada a `NEXT_PUBLIC_SUPABASE_URL`; API interno `127.0.0.1:54321` no se filtra al navegador.

Los wrappers deben consumir `private.has_student_capability` / `get_student_capabilities`, no `user_metadata`; ledger primero, lock de recurso segundo, revalidación posterior, y rollback conjunto de mutación/auditoría/recibo. Los conflictos de operation/key/payload se devuelven sin `currentVersion`; sólo `version-conflict` lleva versiones.

## Ejemplos Postman manuales (documentación; no ejecutados)

Usar `{{api_public}}/rest/v1/rpc/...`, clave pública y token de una sesión local en variables de entorno; no incluir secretos en la colección.

```http
POST {{api_public}}/rest/v1/rpc/aba_student_command_v2
Content-Type: application/json
Authorization: Bearer {{access_token}}
apikey: {{publishable_key}}

{
  "p_organization_id":"{{clinic_id}}",
  "p_command":{"schemaVersion":2,"operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}","studentId":"{{student_id}}","expectedVersion":3,"action":"archive","payload":null,"statusConfirmation":true}
}
```

```http
POST {{api_public}}/rest/v1/rpc/aba_attachment_confirm_v2
Content-Type: application/json
Authorization: Bearer {{access_token}}
apikey: {{publishable_key}}

{
  "p_organization_id":"{{clinic_id}}",
  "p_command":{"action":"confirm-upload","operationId":"{{confirm_operation_id}}","idempotencyKey":"{{confirm_key}}","attachmentId":"{{attachment_id}}","versionId":"{{version_id}}","expectedVersion":1,"resource":{"kind":"student","clinicId":"{{clinic_id}}","studentId":"{{student_id}}"}}
}
```

La reserva se envía antes con **otros** `operationId`/`idempotencyKey`; confirmar no sustituye carga ni permite confirmar un objeto sin bytes/SHA verificados. Cualquier timeout se documenta como desconocido y se reintenta con la misma operación correspondiente.

## Matriz de acciones

- Parcialmente cableadas a presentación/adaptador V2, aún pendientes de RPC/migración/worker root: FICHA-001..018, FICHA-023..027, FICHA-031; HISTORIAL-002,005..011,014..019; ARCHIVOS-001,002,010..012.
- Conservadas como lectura explícita sin inventar valor V1: FICHA-011..013,018, HISTORIAL-002,005, ARCHIVOS-001.
- Pendientes de completar tras el esquema/RPC: FICHA-014 (foto), FICHA-019..022 y 028..030, FICHA-032..035; HISTORIAL-001,003,004,012,013; ARCHIVOS-003..009,013. A4 debe integrar compartir/chat/familia; A5 la autorización exacta de documento comercial; A1 integra avatar mediante el servicio común; A7 consume sólo los comandos/recibos, no una cola adicional.

## Verificación realizada

`Node 22.23.2` + `tsc --noEmit --incremental false`: **exit 0** después de los cambios A2. Es comprobación estática, no evidencia funcional ni de permisos/Storage.
