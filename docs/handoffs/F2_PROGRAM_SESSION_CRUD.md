# F2 — Programas, sesiones y resultados CRUD

## Archivos propiedad de F2

- `supabase/migrations/20260910184219_functional_program_session_crud.sql`
- `src/modules/program-session/contracts.ts`
- `src/modules/program-session/actions.ts`
- `src/modules/program-session/panels.tsx`
- `src/modules/program-session/index.ts`
- `docs/handoffs/F2_PROGRAM_SESSION_CRUD.md`

La migración fue aplicada al Supabase local en Docker el 2026-09-09. No fue aplicada a staging ni a ninguna base remota.

## Matriz CRUD alcanzada

| Objeto | Crear / leer | Editar / transición | Retiro |
| --- | --- | --- | --- |
| Programa / versión | `create_program_draft`, `create_program_successor`; carga SSR existente | `mvp_update_program_draft` sólo con `version_state=draft`; `transition_program` activa, pausa, reactiva y discontinúa | `discontinued` (soft delete) |
| Registro de medición | `mvp_save_record` con `p_submit=false`; resultados sólo leen `submitted=true` | Reabrir, conservar payload crudo/unidades, guardar o enviar con `mvp_save_record` | `mvp_discard_record` borra físicamente sólo un borrador propio no enviado |
| Sesión | Creación implícita existente en `mvp_save_record`; carga SSR existente | `mvp_finish_session`; `mvp_archive_session` mueve `draft` o `completed` a `archived` | Nunca borra una sesión finalizada |
| Resultados | `PersistedResults` y panel de sesiones | N/A | N/A |

## Tablas, RPC y contratos

Tablas: `programs`, `program_versions`, `clinical_sessions`, `session_program_records`, `clinical_record_events`.

RPC existentes consumidos: `create_program_draft`, `create_program_successor`, `transition_program`, `mvp_save_record`, `mvp_finish_session`.

RPC nuevos: `mvp_update_program_draft(p_program_id, p_version_id, p_title, p_design)`, `mvp_discard_record(p_id, p_expected_version)`, `mvp_archive_session(p_session_id)`.

Los RPC nuevos usan `SECURITY DEFINER` sólo porque las tablas mantienen escrituras directas revocadas. Fijan `search_path=''`, comprueban autenticación y `private.has_student_capability`, y revocan ejecución antes de otorgarla explícitamente a `authenticated`.

Exports del módulo `@/modules/program-session`: `programSessionCommand`, schemas/tipos de programa y medición, `ProgramLifecyclePanel`, `SessionResultsPanel`, `PersistedResults`.

## Integración F3 exacta

En `src/modules/clinical/workspace.tsx`:

```tsx
import { ProgramLifecyclePanel, SessionResultsPanel } from '@/modules/program-session';
```

Reemplazar el contenido del panel `programs` por `<ProgramLifecyclePanel data={data} />` y el del panel `sessions` por `<SessionResultsPanel data={data} />`.

No se requieren cambios a la carga SSR: ambos reciben `Pick<WorkspaceData, 'student' | 'capabilities' | 'programs' | 'versions' | 'sessions' | 'records'>`. Tras aplicar la migración local, F3 debe regenerar `database.types.ts` para exponer las tres firmas nuevas.

Cancelar en los modales no llama a ningún RPC. La captura no crea una sesión hasta que el primer `mvp_save_record` persiste el borrador o envío.

## Curl / JSON sintéticos para Postman

Variables: `SUPABASE_URL=http://127.0.0.1:54321`, `SUPABASE_PUBLISHABLE_KEY`, `USER_JWT`, `PROGRAM_ID`, `VERSION_ID`, `SESSION_ID`, `RECORD_ID`.

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/mvp_update_program_draft" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"p_program_id":"{{PROGRAM_ID}}","p_version_id":"{{VERSION_ID}}","p_title":"Imitación vocal","p_design":{"kind":"acquisition","goal":"Imitar sílabas","skillArea":"Lenguaje","antecedent":"Modelo verbal","steps":["Presentar modelo"],"teachingProcedure":"Ensayo discreto","sets":["10 ensayos"],"promptLevels":["Modelo"],"errorCorrection":"Repetir modelo","masteryCriterion":"80% en tres sesiones"}}'
```

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/mvp_discard_record" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"p_id":"{{RECORD_ID}}","p_expected_version":1}'
```

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/mvp_archive_session" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{"p_session_id":"{{SESSION_ID}}"}'
```

Ejemplo existente para guardar borrador de porcentaje con `mvp_save_record`:

```json
{"p_id":"{{RECORD_ID}}","p_session_id":"{{SESSION_ID}}","p_client_id":"{{CLIENT_ID}}","p_program_version_id":"{{VERSION_ID}}","p_dimension":"percentage","p_payload":{"trials":[true,false,true]},"p_expected_version":0,"p_submit":false}
```

## Pendientes / incompatibilidades

- F3 integró los puntos compartidos y actualizó las firmas RPC versionadas. La migración ya está aplicada localmente.
- `Reactivar` llama a `transition_program` con `p_next_status='active'` y `p_version_id=null`, que es la rama de reactivación de un programa pausado. La activación de un borrador conserva su UUID de versión.
- No se inició Docker, Supabase CLI, staging ni un MCP remoto.

## Verificación

No creé ni ejecuté tests Jest, Vitest o Playwright. Tampoco ejecuté lint, build ni typecheck, conforme a la directiva F2.
