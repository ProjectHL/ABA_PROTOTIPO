# Auditoría Supabase — cierre de seguridad

## 1. Contexto

- Fecha: 2026-09-10.
- Repositorio: `ABA_PROTOTIPO`, commit base `39071f8542968f334ab6732a9a4a222d4ad0a1a1`, con cambios funcionales sin commit.
- Comportamiento inspeccionado: Supabase Docker local `aba_prototipo`, PostgreSQL 17.
- Comparación remota de solo lectura: `ABA_staging` (`arfwuctpwnnuhdgjtxaa`), PostgreSQL 17.
- Alcance: esquema, migraciones, RLS, grants, RPC, Auth, Edge Functions, índices, Realtime, Storage y preparación operacional.
- Límite: no se consultaron filas clínicas; sólo catálogos, conteos agregados y fixtures sintéticos.

## 2. Dictamen

**La lógica funcional local está lista, pero todavía no se autoriza el uso con pacientes reales.** Antes se debe aplicar y validar la migración de mínimo privilegio en staging, habilitar protección de contraseñas filtradas, verificar respaldo/restauración y completar el despliegue HTTPS y la aceptación profesional.

## 3. Mapa estructural

- `public`: 30 tablas de aplicación, todas con RLS habilitado.
- `private`: helpers de autorización y auditoría; no está expuesto por Data API.
- Data API local: sólo `public` y `graphql_public`; `auto_expose_new_tables = false`.
- Auth local: signup global y anónimo deshabilitados, contraseña mínima de 12 caracteres, rotación de refresh token habilitada.
- Edge Function remota: `invite-clinic-member`, activa y con `verify_jwt = true`; valida JWT y autorización de admin mediante RPC antes de usar `service_role`.
- Storage y Realtime: deshabilitados localmente y fuera del alcance del MVP.
- Persistencia: RPC transaccionales para ficha, administración, programas, sesiones, mediciones y limpieza por lote.

## 4. Matriz de controles

| Dominio | Estado | Evidencia | Riesgo/brecha |
|---|---|---|---|
| RLS | VERIFICADO | 30/30 tablas públicas con RLS; 57 políticas catalogadas | Falta prueba negativa consolidada posterior al hardening |
| Grants | VERIFICADO | Sin grants de tabla para `anon`; cuatro tablas conservan privilegios excesivos y tres secuencias permiten avance a roles cliente | S01 |
| RPC | VERIFICADO | Ninguna RPC pública `SECURITY DEFINER` ejecutable por `authenticated` carece de chequeo explícito de identidad/capacidad; `search_path` fijado | Advisors seguirán avisando por diseño; documentar aceptación |
| Integridad multi-tenant | VERIFICADO | RPC filtran por clínica/estudiante, triggers preservan pertenencia y no hay FKs sin índice | Requiere prueba cruzada final |
| Auditoría | VERIFICADO | Eventos inmutables por diseño, salvo INSERT directo en `program_lifecycle_events` | S02 |
| Auth | VERIFICADO / BRECHA | Local cierra signup; preflight staging demuestra signup email y anónimo habilitados; advisor informa protección de contraseñas filtradas deshabilitada | S03, S07 |
| Edge Function | VERIFICADO ESTÁTICO | JWT obligatorio, CORS allow-list y frontera admin antes de `service_role` | Despliegue de la nueva URL/origen aún pendiente |
| Storage/Realtime | FUERA DE ALCANCE | Deshabilitados en local | Ninguno para este MVP |
| Índices | VERIFICADO | No hay FKs públicas sin índice; 57 índices sin uso en staging por bajo volumen | No retirar índices durante la PoC |
| Backup/restore | VERIFICADO LOCAL / SIN BACKUP GESTIONADO | `docs/runbooks/BACKUP_RESTORE.md` registra restore local sintético; organización remota en plan Free | S04 |
| Drift | VERIFICADO | Staging llega hasta B2; faltan F1, F2 y hardening final | S05 |

## 5. Hallazgos

### S01 — P1 — Grants heredados excesivos

- Evidencia: **VERIFICADO** local y staging.
- Objetos: `clinic_admin_events`, `clinical_record_events`, `session_program_records`, `test_data_cleanup_log`; secuencias de auditoría.
- Problema: staging conserva permisos DML/TRUNCATE y local conserva privilegios no requeridos. RLS bloquea DML sin política, pero `TRUNCATE` no está gobernado por RLS y los grants contradicen deny-by-default.
- Impacto: degradación de integridad/defensa en profundidad ante una conexión SQL con rol cliente.
- Salida esperada: roles `anon`/`authenticated` sólo reciben los privilegios estrictamente consumidos por Data API.

### S02 — P1 — Eventos de programa fabricables por acceso directo

- Evidencia: **VERIFICADO** local y staging.
- Objeto: `program_lifecycle_events_insert_granted` y grant INSERT a `authenticated`.
- Problema: la política verifica capacidad sobre el estudiante, pero no fuerza actor, organización ni transición; el evento puede crearse fuera del comando de ciclo de vida.
- Impacto: historial de auditoría clínico inconsistente.
- Salida esperada: sólo los comandos/triggers propietarios crean eventos de ciclo de vida.

### S03 — P1 — Protección de contraseñas filtradas deshabilitada

- Evidencia: **VERIFICADO** por advisor de seguridad de `ABA_staging`.
- Componente: Supabase Auth.
- Impacto: una cuenta podría reutilizar una contraseña conocida en filtraciones.
- Restricción: Supabase la ofrece sólo en Pro o superior.
- Salida esperada: subir a Pro y habilitarla, o aceptar explícitamente el riesgo temporal de Free con signup cerrado, contraseña fuerte y acceso sólo por invitación.

### S07 — P1 — Registros públicos por email y anónimos habilitados en staging

- Evidencia: **VERIFICADO** por `npm run supabase:staging:auth-preflight` el 2026-09-10: proyecto correcto, settings accesibles, email activo, confirmación requerida y Edge rechaza peticiones sin JWT; `public_signup_disabled = false` y `anonymous_signins_disabled = false`.
- Componente: Supabase Auth de `ABA_staging`.
- Impacto: terceros pueden crear cuentas Auth permanentes o anónimas aunque RLS todavía impida membresías/datos; amplía innecesariamente la superficie operativa y contradice el flujo de invitación del MVP.
- Salida esperada: deshabilitar ambos registros públicos y conservar invitaciones administrativas.

### S04 — P1 — Recuperación remota aún no confirmada

- Evidencia: **VERIFICADO LOCAL / VERIFICADO SIN BACKUP GESTIONADO**. El runbook registra un restore local sintético exitoso el 2026-09-09. El MCP confirma plan Free; la documentación de Supabase indica backups diarios automáticos sólo para Pro, Team y Enterprise.
- Componente: operación/backup.
- Impacto: el procedimiento funciona en un stack aislado, pero staging/PoC no tiene restauración diaria gestionada. Una pérdida posterior al ingreso clínico dependería del último dump manual.
- Salida esperada: elegir Pro o establecer dump lógico cifrado, externo y periódico; aceptar RPO/RTO antes del corte.

### S05 — P2 — Drift controlado entre local y staging

- Evidencia: **VERIFICADO** por historial MCP.
- Objetos: migraciones F1, F2 y hardening final aún sólo locales.
- Impacto: staging todavía no representa el candidato funcional que pasó QA.
- Salida esperada: promoción ordenada, advisors posteriores y prueba sintética antes de publicación.

### S06 — P3 — Contexto de rol heredado no vinculado a clínica activa

- Evidencia: **VERIFICADO** en `src/context/RoleContext.tsx`.
- Problema: `RoleContext.tsx` toma la membresía activa más reciente, mientras el servidor usa la cookie de clínica activa.
- Impacto: el componente pertenece a vistas heredadas y no está montado por las rutas activas de `ClinicalPage`; no afecta el candidato actual. Si esas vistas vuelven a habilitarse, la navegación podría mostrar un rol incorrecto.
- Salida esperada: eliminar el código heredado o vincularlo a la misma clínica activa antes de reactivarlo.

## 6. Drift y reproducibilidad

- Local aplica las 30 migraciones presentes en staging más F1 y F2.
- Staging llega hasta `20260908150936_b2_idempotent_clinic_invitation`.
- La migración `20260910184233_final_security_least_privilege.sql` corrige S01 y S02 sin modificar datos ni contratos RPC.
- Los tipos TypeScript fueron actualizados con el bloque funcional y `tsc --noEmit` pasa.
- Fixtures sintéticos continúan identificados; no se autoriza limpieza hasta el corte de la PoC.

## 7. Pruebas ejecutadas y no ejecutadas

Ejecutadas:

- consulta de catálogos local;
- comparación read-only de migraciones, advisors, tablas y Edge Functions en staging;
- 46 comprobaciones REST/RPC funcionales previas;
- ocho controles finales de mínimo privilegio y aislamiento: PASS (el control técnico se repitió con la identidad sintética que sí tenía asignación vigente);
- `git diff --check`, `tsc --noEmit` y `next build`: PASS;
- `docker compose config --quiet`: PASS.

Pendientes:

- advisors después de promover a staging;
- respaldo/restauración;
- despliegue VPS/HTTPS y UAT profesional.

## 8. Handoff normalizado

| id | priority | component | evidence | problem | impact | affected_objects | required_outcome | constraints | dependencies |
|---|---|---|---|---|---|---|---|---|---|
| S01 | P1 | schema/grants | VERIFIED | Privilegios cliente exceden el consumo real | Riesgo de integridad | 4 tablas y 3 secuencias | Mínimo privilegio | Sin romper RPC/lecturas | Migración local |
| S02 | P1 | rls/audit | VERIFIED | INSERT directo de eventos | Auditoría fabricable | `program_lifecycle_events` | Escritura sólo por comandos | Preservar eventos existentes | Migración local |
| S03 | P1 | auth | VERIFIED | Leaked password protection apagada | Credenciales débiles | Auth staging | Protección habilitada | Cambio de plataforma | Acceso propietario |
| S04 | P1 | operations | VERIFIED | Plan Free sin backup diario gestionado | Recuperación depende de exportación manual | Backups/VPS | Pro o dump cifrado periódico con RPO/RTO aceptados | Sin borrar datos | Decisión del propietario |
| S05 | P2 | operations | VERIFIED | Staging detrás de local | Candidato no representado | Historial migraciones | Promoción ordenada | No usar datos reales | S01/S02 validados |
| S06 | P3 | client | VERIFIED | Contexto de rol heredado ignora clínica activa | Riesgo sólo si se reactiva la UI antigua | `RoleContext.tsx` | Eliminar o alinear antes de reactivar | No afecta `ClinicalPage` | Reactivación de vistas heredadas |
| S07 | P1 | auth | VERIFIED | Signup email y anónimo habilitados | Creación no gobernada de cuentas Auth | Auth staging | Ambos registros públicos deshabilitados | Mantener invitaciones admin | Acceso propietario |

Invariantes: aislamiento por clínica, auditoría durable, idempotencia de captura, conflictos visibles y datos dummy preservados hasta el corte. Requieren propietario: S03, acceso VPS/dominio y aceptación profesional. Fuera de alcance: adjuntos, Realtime, facturación, chat y acceso familiar.
