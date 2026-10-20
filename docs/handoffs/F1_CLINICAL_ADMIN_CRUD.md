# F1 — Ficha clínica y administración CRUD

## Archivos modificados

- `supabase/migrations/20260910184204_functional_clinical_admin_crud.sql`
- `src/modules/clinical/contracts.ts`
- `src/modules/clinical/actions.ts`
- `src/modules/clinical/workspace.tsx`
- `src/lib/supabase/database.types.ts`

## Matriz CRUD lograda

| Dominio | Crear / leer / editar | Retiro o estado |
| --- | --- | --- |
| Ficha y familia | `mvp_save_student` crea y edita ficha; reemplaza el snapshot de responsables y hermanos dentro de la misma transacción | Sin hard delete de ficha. `mvp_set_student_status` archiva/reactiva con versión esperada. |
| Contexto | `save_client_context` mantiene lectura y actualización versionada | Los campos opcionales se pueden vaciar. |
| Historial y medicación | `append_clinical_history_entry` agrega o corrige con `supersedes_id` | No se elimina historia: la corrección deja la referencia anterior como `superseded`. |
| Consentimiento | `record_consent_reference` agrega una referencia versionada | Estados `revoked` y `expired`; no hay hard delete. |
| Membresías | `mvp_set_member` actualiza rol/estado | `inactive` suspende la membresía. |
| Asignaciones | `set_student_assignment` crea o actualiza asignación | `inactive` retira la asignación. |

## Tablas, RPC y contratos

- `public.clients`: `updated_at` avanza explícitamente al editar ficha y al cambiar estado.
- `public.guardians` y `public.siblings`: snapshot atómico persistido por `mvp_save_student`.
- Nueva RPC local: `public.mvp_set_student_status(p_organization_id uuid, p_client_id uuid, p_expected_updated_at timestamptz, p_status text) returns public.clients`.
- La RPC exige membresía y clínica activas, capacidad `student.edit`, estado permitido (`active`/`archived`) y coincidencia de versión. Revoca `PUBLIC`/`anon` y concede ejecución sólo a `authenticated`.
- El contrato de UI agrega `student-status`; la acción sólo anuncia éxito cuando recibió datos persistidos. La lista separa fichas activas y archivadas, y el modal de transición espera la respuesta del servidor.

## Postman / curl sintéticos

Variables:

```text
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_PUBLISHABLE_KEY=<clave-publica-local>
USER_JWT=<jwt-local-de-usuario>
ORGANIZATION_ID=11111111-1111-1111-1111-111111111111
CLIENT_ID=22222222-2222-2222-2222-222222222222
EXPECTED_UPDATED_AT=2026-09-09T12:00:00Z
```

Archivar una ficha:

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/mvp_set_student_status" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  --data '{"p_organization_id":"11111111-1111-1111-1111-111111111111","p_client_id":"22222222-2222-2222-2222-222222222222","p_expected_updated_at":"2026-09-09T12:00:00Z","p_status":"archived"}'
```

Reactivar usa el mismo endpoint y payload, cambiando `p_status` a `active` y usando el `updated_at` devuelto por la respuesta anterior:

```json
{
  "p_organization_id": "11111111-1111-1111-1111-111111111111",
  "p_client_id": "22222222-2222-2222-2222-222222222222",
  "p_expected_updated_at": "2026-09-09T12:00:01Z",
  "p_status": "active"
}
```

Actualizar ficha (incluye retiro persistido de responsables y hermanos al enviar arreglos vacíos):

```bash
curl -X POST "$SUPABASE_URL/rest/v1/rpc/mvp_save_student" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $USER_JWT" \
  -H "Content-Type: application/json" \
  --data '{"p_organization_id":"11111111-1111-1111-1111-111111111111","p_client_id":"22222222-2222-2222-2222-222222222222","p_expected_updated_at":"2026-09-09T12:00:00Z","p_test_run_id":null,"p_payload":{"clinical_id":"POC-001","initials":"AA","birth_date":"2015-01-01","primary_language":"Español","living_arrangement":"Contexto sintético","guardians":[],"siblings":[]}}'
```

## Pendientes y límites

- La migración fue aplicada al Supabase local en Docker el 2026-09-09. No fue aplicada a staging ni a ninguna base remota.
- F2 mantiene la propiedad de programas, sesiones y resultados.
- La verificación integrada `tsc --noEmit` queda reservada al orquestador durante F3, conforme a la spec.

## Tests

No creé ni ejecuté pruebas Jest, Vitest ni Playwright. Tampoco ejecuté lint, build ni typecheck.
