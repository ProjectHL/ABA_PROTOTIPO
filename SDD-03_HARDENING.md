# SDD-03 — Plan de endurecimiento de RPC, RLS y auditoría

Fecha de inventario: 2026-09-02. Entorno inspeccionado: `ABA_staging` (`arfwuctpwnnuhdgjtxaa`).

Este documento no aplica SQL en staging. Es la especificación y el plan de migración que debe ejecutarse primero en una rama de Supabase con dos usuarios de prueba y dos organizaciones.

## Decisión de seguridad

Las diez RPC de negocio en `public` son necesarias para la PoC y deben mantenerse expuestas únicamente a `authenticated`, mediante grants explícitos. Todas se ejecutan con `SECURITY DEFINER`, por lo que cada una debe probar que la identidad, la membresía y la capacidad del actor son correctas antes de leer o escribir.

Los helpers privilegiados no son una API: deben permanecer en `private` y no tener `EXECUTE` para `anon`, `authenticated` ni `PUBLIC`. La auditoría de acceso debe ser de solo inserción interna y de lectura administrativa, no legible ni escribible desde el navegador.

## Evidencia de inventario

- El advisor de seguridad reporta diez funciones `SECURITY DEFINER` ejecutables por `authenticated` y `student_access_audit_events` con RLS habilitado sin políticas.
- La tabla `student_access_audit_events` tiene RLS activado, cero políticas y ACL solo para `postgres`/`service_role`. Hoy queda cerrada para clientes, lo que es seguro pero no constituye una estrategia de auditoría verificable.
- Las diez RPC usan `SET search_path TO ''`; es correcto y debe conservarse. `anon` no tiene `EXECUTE`; `authenticated` sí.
- `pg_depend` no registra dependencias de tablas para estas funciones, porque las referencias dentro de cuerpos SQL/PLpgSQL no se modelan ahí. La dependencia se determinó desde `pg_get_functiondef`.
- Helpers revisados: `private.has_student_capability`, `private.is_primary_student_supervisor`, `private.student_assignment_role` y `private.audit_student_access_event`. Son `SECURITY DEFINER`; los tres primeros resultaron ejecutables por `authenticated` en PostgreSQL, aunque no deben ser invocables como API.

## Contrato por RPC

| RPC | Consumidor esperado | Validación interna observada | Decisión |
|---|---|---|---|
| `get_student_capabilities` | UI de estudiante | delega a `private.has_student_capability` | Mantener; solo lectura, probar aislamiento por cliente. |
| `create_client` | Supervisor/admin de una única organización | `auth.uid()`, membresía activa y rol supervisor/admin | Mantener; probar 0, 1 y 2 membresías elegibles. |
| `set_student_assignment` | Supervisor principal | `private.is_primary_student_supervisor`, no autoasignación, membresía destino | Mantener; probar cambios entre organizaciones y escalamiento de rol. |
| `request_student_authorization` | Coordinador asignado | `auth.uid()`, rol coordinador y lista permitida de acciones | Mantener; probar cliente ajeno, acciones duplicadas e inválidas. |
| `decide_student_authorization` | Supervisor principal | bloqueo de solicitud, estado pending y vencimiento máximo 90 días | Mantener; probar doble decisión y decisor ajeno. |
| `revoke_student_authorization` | Supervisor principal | decisión aprobada, ausencia de revocación previa | Mantener; probar revocación ajena y doble revocación. |
| `append_clinical_history_entry` | Actor con `student.edit` | `private.has_student_capability` y pertenencia de superseded | Mantener; probar escribir/sustituir historia de otro cliente. |
| `append_clinical_history_entries` | Actor con `student.edit` | valida array y vuelve a invocar la RPC singular | Mantener; probar array vacío, elemento inválido y atomicidad acordada. |
| `save_client_context` | Actor con `student.edit` | capacidad y control optimista `expected_version` | Mantener; probar cliente ajeno y conflicto de versión. |
| `record_consent_reference` | Supervisor principal | estado permitido, cliente y supersedes | Mantener; probar cliente ajeno y estados inválidos. |

## SQL propuesto para una migración revisada

Ejecutar primero en una rama de Supabase. No modificar los cuerpos de las RPC hasta que pasen las pruebas negativas de abajo.

```sql
-- 1. Hacer explícito el perímetro de las RPC públicas.
revoke execute on all functions in schema public from public, anon;

grant execute on function public.get_student_capabilities(uuid) to authenticated;
grant execute on function public.create_client(text, text, text, date, text, jsonb, jsonb, uuid) to authenticated;
grant execute on function public.set_student_assignment(uuid, uuid, text, text, uuid) to authenticated;
grant execute on function public.request_student_authorization(uuid, text, text[], text, uuid) to authenticated;
grant execute on function public.decide_student_authorization(uuid, text, timestamptz, uuid) to authenticated;
grant execute on function public.revoke_student_authorization(uuid, uuid) to authenticated;
grant execute on function public.append_clinical_history_entry(uuid, text, text, date, text, text, date, date, uuid, uuid) to authenticated;
grant execute on function public.append_clinical_history_entries(uuid, jsonb, uuid) to authenticated;
grant execute on function public.save_client_context(uuid, text, text, text, integer, uuid) to authenticated;
grant execute on function public.record_consent_reference(uuid, text, text, text, text, text, timestamptz, timestamptz, text, uuid, uuid) to authenticated;

-- 2. Los helpers no deben ser endpoint invocable.
revoke execute on function private.has_student_capability(uuid, text) from public, anon, authenticated;
revoke execute on function private.is_primary_student_supervisor(uuid) from public, anon, authenticated;
revoke execute on function private.student_assignment_role(uuid) from public, anon, authenticated;
revoke execute on function private.audit_student_access_event(uuid, uuid, text, uuid, text, uuid) from public, anon, authenticated;
```

La sintaxis de firmas debe compararse con `pg_get_function_identity_arguments` justo antes de aplicar. La revocación de helpers exige una prueba de regresión: las RPC `SECURITY DEFINER` deben seguir pudiendo invocarlos bajo su propietario. Si no fuera así, usar un rol propietario dedicado y grants mínimos, no volver a abrir helpers a `authenticated`.

Para la auditoría, mantener deny-by-default al cliente. No se recomienda crear una política `INSERT` para `authenticated`: permitiría falsificar actor/acción si se expone la tabla. La inserción debe continuar solo mediante `private.audit_student_access_event` o triggers internos. La lectura administrativa debe resolverse fuera del navegador (rol de backend protegido o vista en esquema no expuesto); definirla y probarla antes de habilitar soporte clínico.

## Pruebas de aceptación obligatorias

1. Con JWT anónimo, cada RPC devuelve permiso denegado/no es invocable.
2. Con un usuario de organización A, todas las RPC con un `client_id` de organización B devuelven `42501` o no exponen filas.
3. Coordinador de A no puede decidir, revocar ni asignar; supervisor no principal tampoco.
4. Un usuario sin asignación no puede leer capacidades útiles ni crear historial/contexto/consentimiento.
5. La decisión concurrente y la revocación duplicada fallan sin insertar un segundo estado válido.
6. Cada mutación que gestiona acceso deja exactamente un evento en `student_access_audit_events`; el usuario de navegador no puede seleccionar ni insertar esa tabla.
7. `get_advisors(security)` no conserva avisos no aprobados. Cualquier excepción debe indicar función, consumidor, dueño, prueba y fecha de revisión.

## Orden de aplicación

1. Crear rama de base y usuarios/organizaciones/estudiantes fixture.
2. Ejecutar las pruebas negativas contra el estado actual para establecer baseline.
3. Aplicar el SQL de grants/revokes y repetir pruebas funcionales de las diez RPC.
4. Confirmar eventos de auditoría y decidir acceso administrativo fuera del Data API.
5. Ejecutar advisors y generar una migración versionada desde el branch; recién entonces promover a staging.

## Estado de ejecución

El 2026-09-02 se intentó crear la rama sdd03-rpc-hardening desde ABA_staging.
Supabase rechazó la operación porque la organización no tiene un plan Pro o superior,
requisito de la funcionalidad Branching. No se modificaron grants, funciones, RLS,
Auth ni datos de staging.

Para continuar de forma segura se necesita habilitar Branching en la organización o
autorizar un proyecto de desarrollo aislado. No se debe usar staging como sustituto:
las pruebas de regresión de permisos pueden afectar los flujos clínicos existentes.

## Riesgos abiertos

- Cambiar grants sin comprobar consumidores puede romper la UI o integraciones que dependan de helpers privados.
- `SECURITY DEFINER` es aceptable aquí solo mientras los checks internos se mantengan completos; no usarlo como sustituto de RLS.
- `p_test_run_id` es recibido desde el cliente en varias RPC. Debe revisarse su FK/semántica y autorizarse explícitamente antes de usarlo para separar pruebas de datos clínicos.
