# A1 — ejemplos de operaciones para colección final

Propuestas de solicitudes, no colección/suite QA. No se ejecutaron; A8 consolida Postman2.1 exclusivamente R5. Variables locales sin secretos guardados: `api_url=http://127.0.0.1:54321`, `app_url=http://localhost:3000`, `publishable_key`, `access_token`, `email`, `password`, `organization_id`, `target_user_id`, `client_id`, `operation_id`, `idempotency_key`. Claves/token/password se introducen manualmente desde el lote local, no se exportan ni versionan.

Auth usa `apikey: {{publishable_key}}`; REST/RPC/Storage/Edge además `Authorization: Bearer {{access_token}}` y JSON Content-Type donde corresponde.

| Operación | Método/ruta | Body / notas |
|---|---|---|
| Login Auth real | POST `{{api_url}}/auth/v1/token?grant_type=password` | `{"email":"{{email}}","password":"{{password}}"}`; token queda solo entorno privado |
| Identidad comprobada | GET `{{api_url}}/auth/v1/user` | Sin body; no usar user_metadata como autorización |
| Contexto/perfil | POST `{{api_url}}/rest/v1/rpc/aba_identity_context` | `{"p_organization_id":"{{organization_id}}"}`; null permite elección de clínica |
| Equipo administración | POST `{{api_url}}/rest/v1/rpc/aba_team` | `{"p_organization_id":"{{organization_id}}"}`; solo admin activo de clínica |
| Cambiar/suspender/reactivar perfil membresía | POST `{{api_url}}/rest/v1/rpc/mvp_set_member` | `{"p_organization_id":"{{organization_id}}","p_user_id":"{{target_user_id}}","p_role":"therapist","p_status":"inactive"}`; roles admin/supervisor/therapist, status active/inactive |
| Invitar membresía clínica | POST `{{api_url}}/functions/v1/invite-clinic-member` | `{"organizationId":"{{organization_id}}","operationId":"{{operation_id}}","email":"persona.sintetica@aba.example.test","role":"supervisor"}`; requestedOperationId debe coincidir; operationId canónico y delivery se validan por separado. SMTP solo mediante claim durable |
| Asignar/modificar/suspender ficha | POST `{{api_url}}/rest/v1/rpc/set_student_assignment` | `{"p_client_id":"{{client_id}}","p_user_id":"{{target_user_id}}","p_role":"therapist","p_status":"active"}`; motor vigente; no autoasignación |
| Recuperación | POST `{{api_url}}/auth/v1/recover?redirect_to=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fconfirm%3Fnext%3D%2Freset-password` | `{"email":"{{email}}"}`; enlace se comprueba en Mailpit y navegador, no OTP inventado |
| Cambio password | PUT `{{api_url}}/auth/v1/user` | `{"password":"{{new_password}}"}`; sesión real reciente, política12/lower/upper/digit/symbol |
| Cambio email propio | PUT `{{api_url}}/auth/v1/user` | `{"email":"nuevo.correo.sintetico@aba.example.test"}`; no cambia profile.email: Auth double_confirm verifica anterior/nuevo |
| Logout | POST `{{api_url}}/auth/v1/logout?scope=local` | Revoca sesión local; UI advierte pendientes mediante adaptador A7 |

Guardar perfil con concurrencia y recibo durable:

```json
{"p_organization_id":"{{organization_id}}","p_target_user_id":"{{target_user_id}}","p_expected_version":0,"p_operation_id":"{{operation_id}}","p_idempotency_key":"{{idempotency_key}}","p_payload":{"name":"Persona sintética","profession":"Profesional ABA","title":"Supervisor","description":"Evaluación local","phone":"","avatarObjectPath":null,"avatarPreset":"blue"}}
```

POST `{{api_url}}/rest/v1/rpc/aba_save_professional_profile`. Guardar solo si recibo status=acknowledged y operationId/idempotencyKey/resourceId coinciden exactamente. Reintento exacto devuelve mismo receiptId; versión cambiada o clave/payload divergente devuelve conflicto, conserva campos. Suspensión/revocación se comprueban antes del replay.

Avatar: POST `{{api_url}}/storage/v1/object/profile-avatars/{{target_user_id}}/{{avatar_id}}.png`, Content-Type image/png, body binarioPNG≤5MiB, sin x-upsert. Firma temporal POST `/storage/v1/object/sign/profile-avatars/{{target_user_id}}/{{avatar_id}}.png` con `{"expiresIn":300}`. Enlazar avatarObjectPath mediante comando de perfil; subida sola no confirma perfil guardado. Sustituir/retirar archiva referencia, no borra bytes; servicioA2 centralizará adjuntos.

Clínica activa/cookies/ServerActions y callbacks PKCE/confirmación se comprueban mediante UI real al final; no se añade backend duplicado para Postman. Restauración, aislamiento dosclínicas, Mailpit y suspensión están pendientes de QA final.

## Entrega durable inicial y reenvío explícito

Esquema root aplicado38 y Edge sincronizado/servido por root (handle76753 activo; ambos JWTtrue). Postman Desktop local12.28.0 confirmado; estos ejemplos **no son una colección/suite ni fueron ejecutados**. Variables adicionales sin valores reales: invitation_id, delivery_id, delivery_version. No exportar entornos con claves, passwords ni tokens.

Primera invitación: createUser sin correo → membresía completada → mismo worker durable con operation/key ambos UUID canónico. Cuenta ya confirmada: agregado, iniciar sesión, sin otro correo. Respuesta membership requestedOperationId==UUID enviado, role exacto y status completed. deliveryError no invalida la membresía ACK. Si delivery existe, org y invitation/op/key deben coincidir con la invitación canónica. invited true requiere sent/source auth; **sent significa Auth aceptó solicitud, no recepción ni aceptación**.

Listar invitaciones canónicas de clínica (admin activo, JWT propio):

```http
POST {{api_url}}/rest/v1/rpc/aba_team_invitation_deliveries
```

```json
{"p_org":"{{organization_id}}"}
```

Respuesta lista invitationId/userId/email/role/accepted/eligible/lastDelivery; no claimToken. La operación bloqueada sigue visible y bloquea por destinatario+clínica, no solo invitationId.

Nueva petición **explícita** de reenvío (nuevos UUID operation/key después de confirmar intención):

```http
POST {{api_url}}/functions/v1/resend-clinic-invitation
```

```json
{"organizationId":"{{organization_id}}","invitationId":"{{invitation_id}}","operationId":"{{operation_id}}","idempotencyKey":"{{idempotency_key}}"}
```

No body actor/email/redirect. Edge deriva actor de getUser y destinatario original de DB. Respuesta {delivery:DTO}; comparar organizationId/invitationId/operationId/idempotencyKey exactos. Claim y finish worker no son endpoints de prueba con JWT usuario y service-role no se introduce en Postman.

Tras respuesta de red incierta, **consultar la misma operación**, no crear otra:

```http
POST {{api_url}}/rest/v1/rpc/aba_team_invitation_delivery_status
```

```json
{"p_org":"{{organization_id}}","p_invite":"{{invitation_id}}","p_operation":"{{operation_id}}","p_key":"{{idempotency_key}}"}
```

DTO estricto: deliveryId, organizationId, invitationId, operationId, idempotencyKey, payloadVersion1, state, version, createdAt, updatedAt, expiresAt|null, errorCode|null, confirmationSource|null, testRunId|null. Replay misma op/key no hace otro Authcall. Reserva pending caduca90s sin claim→failed/reservation-expired, conocido sin correo autorizado. Claim caduca90s→unknown, posible SMTP. No exact-once SMTP+DB ni retry ciego. pending/claimed/unknown bloquean nueva petición.

Resolver unknown solo con revisión concreta y versión base (admin actual):

```http
POST {{api_url}}/rest/v1/rpc/aba_resolve_team_invitation_delivery
```

```json
{"p_org":"{{organization_id}}","p_delivery":"{{delivery_id}}","p_expected_version":3,"p_decision":"observed-sent","p_evidence_ack":true}
```

La versión3 es ilustrativa: sustituir por delivery_version leído. observed-sent exige correo concreto constatado en Mailpit y registra source operator-mailpit. Alternativa allow-new-request autoriza posible duplicado; **resolver no envía**. Comparar deliveryId/org/invite y version==base+1, state sent/failed y errorCode operator-observed-mailpit/operator-authorized-possible-duplicate exactos. Conflicto conserva estado y obliga reconsulta. Nueva solicitud tras terminal sent/unconfirmed o failed definitivo requiere otra acción explícita y UUIDs nuevos.

Los ServerActions A1 además reciben clinicId esperado y rechazan si la cookie activa cambió. No se construye endpoint extra para probar esa guarda: recorrido UI real R5. No password recovery para terceros.
