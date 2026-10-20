# Registro de excepciones `SECURITY DEFINER`

## Estado de reintegración local — 2026-09-14

La evidencia del candidato anterior conservada abajo es HISTÓRICA: no aprueba el frontend reintegrado ni sus nuevos permisos. Durante R0–R4 solo se revisa código, contratos y tipado; Advisor, casos negativos y recorridos funcionales se consolidan en R5.

Root aplicó38 migraciones al proyecto local aislado `aba-reintegration-local`. En R1, las nuevas APIs de identidad, delivery y las dos APIs de invitación usan wrappers públicos `SECURITY INVOKER` que delegan en implementaciones privadas `SECURITY DEFINER`, con `search_path=''`, autorización explícita y EXECUTE selectivo. Las funciones antiguas que todavía son públicas definer se conservan por historial/consumidores existentes; deberán revisarse de nuevo durante la ampliación del motor existente y el gate R5, no se presume aprobación anterior. La38 añade primera invitación sobre el mismo delivery y caducidad conocida de reservas sin claim.

| Implementación privada | Boundary explícito | Garantía revisada estáticamente | Estado |
|---|---|---|---|
| `aba_identity_context_impl` | AuthUID; clínica elegida entre membresías activas | Perfil global propio y lista de clínicas real; externo/familia no reciben clínica ficticia | APLICADA R1, sin QA |
| `aba_team_impl` | Admin activo de la clínica | Correo Auth no expuesto por lectura general; lista limitada al equipo de esa clínica | APLICADA R1, sin QA |
| `aba_save_professional_profile_impl` | AuthUID propio o admin de miembro de esa clínica; recheck tras locks | Perfil/versión/auditoría/recibo en una transacción; no escrituras directas cliente | APLICADA R1, sin QA |
| `mvp_begin_clinic_invitation_impl` | Admin Auth vigente antes y después del lock de clínica | Intent canónico y conflicto de payload; correo externo no es recibo de membresía | APLICADA R1; ampliación delivery en revisión |
| `mvp_complete_clinic_invitation_impl` | Admin Auth vigente antes y después del lock de clínica | No cambiar rol ni reactivar membresía existente por invitación; evita bypass de último admin | APLICADA R1, sin QA |
| Delivery reserve/list/status/resolve | AuthUID admin vigente y clínica explícita | Reserva/estado durables sin tokens privados; resolución desconocida exige confirmación/versionado | APLICADA R1, sin QA |
| Delivery claim/finish | Solo EXECUTE service_role; actor derivado de getUser por Edge y admin revalidado en DB | Claim privado; clientes no pueden declarar sent; resultado incierto bloquea envío automático | APLICADA R1, sin QA |

`service_role` nunca se configura en Next ni en el navegador. Un eventual USAGE del schema privado para wrappers worker no otorga acceso a sus tablas ni EXECUTE de otros helpers; los grants efectivos se revisan por firma. La autorización clínica sigue el motor existente, no metadatos editables. Registro root de integración: `docs/REVISION_R1_PLATAFORMA_IDENTIDAD.md`.

## Evidencia histórica del candidato anterior

Fecha: 2026-09-10
Alcance: esquema `public`, candidato local F1/F2/hardening y B2 en staging.
Estado remoto: migración `20260908150936_b2_idempotent_clinic_invitation` verificada; Edge Function `invite-clinic-member` v2 activa con `verify_jwt=true` y rechazo anónimo `401` verificado. F1/F2 todavía no se promueven.

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
| `mvp_set_student_status(uuid,uuid,timestamptz,text)` | Server Action ficha | Transición archivado/reactivado con lock y versión optimista | membresía activa, `student.edit` y pertenencia a clínica | otra clínica, estado inválido, versión stale | CONSERVAR |
| `mvp_set_member(uuid,uuid,text,text)` | administración de equipo | Serializa rol/estado, último admin y auditoría | admin activo de la clínica | no admin, último admin, otra clínica | CONSERVAR |
| `mvp_team(uuid)` | administración de equipo | Lee correo desde `auth.users` sin exponer Auth | admin activo de la clínica | no admin y otra clínica | CONSERVAR |
| `mvp_update_program_draft(uuid,uuid,text,jsonb)` | Server Action programas | Actualiza versión draft bajo lock y triggers de integridad | `program.edit`, programa/versión/cliente coincidentes | versión publicada, relación ajena, diseño inválido | CONSERVAR |
| `mvp_discard_record(uuid,integer)` | Server Action captura | Elimina sólo draft propio y conserva evento durable | `record.capture`, actor propietario y versión vigente | enviado, actor ajeno, versión stale | CONSERVAR |
| `mvp_archive_session(uuid)` | Server Action sesiones | Soft-delete idempotente con lock | `record.submit` por estudiante | otra clínica y estado inválido | CONSERVAR |
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

- Catálogo local: `anon = false`, `authenticated = true` sólo para las 19 excepciones; staging conserva 15 hasta promover F1/F2.
- Configuración: las 19 funciones tienen `search_path=''`.
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
- Evidencia actual: 46 controles funcionales, ocho controles finales de aislamiento/mínimo privilegio y `next build` pasan.
- Pendiente externo: deshabilitar auto-registro público y activar protección de contraseñas filtradas en Auth.
