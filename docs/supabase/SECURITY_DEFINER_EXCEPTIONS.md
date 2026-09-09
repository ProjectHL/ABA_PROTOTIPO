# Registro de excepciones `SECURITY DEFINER`

Fecha: 2026-09-08
Alcance: esquema `public`, B2 local y staging.
Estado remoto: migración `20260908150936_b2_idempotent_clinic_invitation` verificada; Edge Function `invite-clinic-member` v2 activa con `verify_jwt=true` y rechazo anónimo `401` verificado.

## Regla de aceptación

Una función pública `SECURITY DEFINER` sólo permanece ejecutable por
`authenticated` cuando necesita al menos una de estas propiedades: operación
atómica en varias tablas, acceso controlado a `auth`/`private`, auditoría que el
cliente no puede escribir o aplicación uniforme de locks y concurrencia. Todas
deben fijar `search_path=''`, resolver el actor con `auth.uid()`, validar clínica o
capacidad y negar `anon`.

## Excepciones conservadas

| Firma | Consumidor | Motivo de `DEFINER` | Frontera de autorización | Evidencia negativa | Decisión |
|---|---|---|---|---|---|
| `append_clinical_history_entry(...)` | Server Action ficha | Corrección y `supersedes` atómicos | `student.edit` por cliente | técnico/otra clínica/direct DML | CONSERVAR |
| `get_student_capabilities(uuid)` | carga de ficha y autorización | Evalúa helpers privados sin exponer tablas | membresía, asignación, vigencia y lote abierto | clínica cruzada, future, frozen | CONSERVAR |
| `mvp_begin_clinic_invitation(uuid,uuid,text,text)` | Edge `invite-clinic-member` | Persiste intent antes de Auth en tabla privada | admin activo de la clínica | no admin, tenant ajeno, conflicto | CONSERVAR |
| `mvp_complete_clinic_invitation(uuid,uuid)` | Edge `invite-clinic-member` | Lee Auth y escribe membresía+auditoría+estado en una transacción | admin activo y operación pendiente | no admin, Auth ausente, repetición | CONSERVAR |
| `mvp_cleanup_test_run(uuid,uuid,text)` | runbook de corte | Eliminación ordenada, ledger y lock de lote | admin, lote de clínica, frozen y confirmación exacta | open, otra clínica, doble cleanup | CONSERVAR OPERATIVA |
| `mvp_finish_session(uuid)` | Server Action captura | Finalización idempotente con precondiciones | `record.submit` del estudiante | sesión vacía, otra clínica, técnico no autorizado | CONSERVAR |
| `mvp_freeze_test_batch(uuid,uuid)` | runbook de fixtures | Congela el lote y corta capacidades de forma central | admin y lote de clínica | supervisor, lote inexistente/limpio | CONSERVAR OPERATIVA |
| `mvp_open_test_batch(uuid,uuid)` | runbook de fixtures | Registra lote gobernado antes de crear dummy | admin activo de la clínica | supervisor, UUID no registrado | CONSERVAR OPERATIVA |
| `mvp_save_record(...)` | Server Action captura | Idempotencia, concurrencia y relaciones sesión/programa | `record.capture/submit` por estudiante | versión stale, relación ajena, doble envío | CONSERVAR |
| `mvp_save_student(...)` | Server Action ficha | Ficha+familia atómicas y control de versión | admin/supervisor; dummy sólo admin+lote open | direct DML, stale, lote inventado/frozen | CONSERVAR |
| `mvp_set_member(uuid,uuid,text,text)` | administración de equipo | Serializa rol/estado, último admin y auditoría | admin activo de la clínica | no admin, último admin, otra clínica | CONSERVAR |
| `mvp_team(uuid)` | administración de equipo | Lee correo desde `auth.users` sin exponer Auth | admin activo de la clínica | no admin y otra clínica | CONSERVAR |
| `record_consent_reference(...)` | Server Action ficha | Trazabilidad y reemplazo atómico | `student.edit` y decisiones de supervisor/admin | direct DML, otra clínica, referencia inválida | CONSERVAR |
| `save_client_context(...)` | Server Action ficha | Upsert con versión optimista y auditoría | `student.edit` por cliente | direct DML, stale y otra clínica | CONSERVAR |
| `set_student_assignment(...)` | administración por estudiante | Integridad clínica/usuario, vigencia y auditoría | admin o supervisor principal autorizado | no admin, usuario ajeno, tenant cruzado | CONSERVAR |

## Grants retirados en B2

Estas funciones conservan su definición por compatibilidad del historial, pero B2
revoca `EXECUTE` a `authenticated` porque no tienen consumidor en `src/`, Edge ni
runbooks del MVP:

- `append_clinical_history_entries(uuid,jsonb,uuid)`
- `create_client(text,text,text,date,text,jsonb,jsonb,uuid)`
- `decide_student_authorization(uuid,text,timestamptz,uuid)`
- `request_student_authorization(uuid,text,text[],text,uuid)`
- `revoke_student_authorization(uuid,uuid)`

No se borran todavía para evitar romper una migración histórica o integración no
inventariada. Su reactivación exige consumidor identificado, pruebas positivas y
negativas, y una migración nueva por firma exacta.

## Controles de gate

- Catálogo: `anon = false`, `authenticated = true` sólo para las 15 excepciones.
- Configuración: las 15 funciones tienen `search_path=''`.
- Pruebas: `tests/database/clinical.test.ts` cubre aislamiento, suspensión,
  vigencia, DML directo, lotes, invitación idempotente, captura y cleanup.
  `scripts/test-local-invitation.mjs` recorre Auth + Edge + Mailpit con JWT reales
  locales y verifica auto-registro bloqueado `422`, `401`, `403`, `409`, reintento
  `200`, membresía, auditoría y estado privado `completed`; los fixtures se
  preparan sólo por PostgreSQL local.
  `scripts/test-local-invitation-failures.mjs` fuerza únicamente en PostgreSQL
  local la ausencia del usuario Auth, un fallo transaccional al insertar la
  auditoría y la pérdida simulada de la respuesta posterior al commit. Verifica
  rollback completo, estado `pending` recuperable, reintentos sin duplicados y
  elimina el trigger temporal en `finally`.
  `scripts/test-local-authorization.mjs` usa sesiones Auth/JWT reales contra
  PostgREST/RPC y verifica dos clínicas, los tres perfiles, membresía suspendida,
  asignación futura, usuario sin asignación, DML directo y acceso cruzado.
  `tests/e2e/authenticated.local.spec.ts` confirma en la UI que admin, supervisor
  y técnico reciben navegación y controles coherentes con esas capacidades.
- Operación: no se acepta un WARN nuevo del Advisor sin añadirlo a este registro.
- Pendiente externo: activar protección de contraseñas filtradas en Auth.
