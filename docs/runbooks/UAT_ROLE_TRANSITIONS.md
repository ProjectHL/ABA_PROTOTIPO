# Transiciones reversibles de perfil para UAT

Este procedimiento acompaña `UAT_SECUENCIAL_PERFILES.md`. Se ejecuta únicamente
en `ABA_staging`, con datos sintéticos y mediante el MCP de Supabase. No es una
migración y no debe aplicarse en producción.

## Variables resueltas en cada ejecución

- `ORGANIZATION_ID`: clínica de la cuenta designada.
- `DESIGNATED_USER_ID`: cuenta que se valida como admin, supervisor y técnico.
- `GUARD_USER_ID`: cuenta sintética existente que queda como admin de resguardo.
- `CLIENT_ID`: ficha activa con `test_run_id` y asignaciones existentes para
  ambas cuentas.

No se copian correos, contraseñas, JWT ni contenido clínico al acta. Antes de
escribir, el operador vuelve a resolver estos identificadores desde la base y
exige exactamente una fila para cada cuenta.

## Snapshot obligatorio

Antes de promover la cuenta de resguardo y antes de la primera transición,
registrar
en memoria operativa —no en Git— el
resultado de estas lecturas:

```sql
select organization_id, user_id, role, status, test_run_id
from public.memberships
where organization_id = '<ORGANIZATION_ID>'::uuid
  and user_id in ('<DESIGNATED_USER_ID>'::uuid, '<GUARD_USER_ID>'::uuid)
order by user_id;

select id, organization_id, client_id, user_id, role, is_primary, status,
       effective_at, ended_at, test_run_id
from public.student_assignments
where organization_id = '<ORGANIZATION_ID>'::uuid
  and client_id = '<CLIENT_ID>'::uuid
  and user_id in ('<DESIGNATED_USER_ID>'::uuid, '<GUARD_USER_ID>'::uuid)
order by user_id;
```

Abortar si la ficha no es sintética, alguna cuenta no pertenece a la clínica,
la cuenta designada no es el supervisor primario activo inicial o no existe una
asignación activa no primaria para el resguardo.

## Preparar supervisor

Ejecutar sólo después de que la cuenta designada cierre sesión:

```sql
begin;
set transaction isolation level serializable;

do $uat$
declare affected integer;
begin
  update public.memberships
  set role = 'supervisor', status = 'active'
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and user_id = '<DESIGNATED_USER_ID>'::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected membership row count: %', affected; end if;

  if (select count(*) from public.memberships
      where organization_id = '<ORGANIZATION_ID>'::uuid and role = 'admin' and status = 'active') < 1
  then raise exception 'transition would leave the clinic without an active admin'; end if;

  update public.student_assignments
  set role = 'supervisor', is_primary = true, status = 'active', ended_at = null
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and client_id = '<CLIENT_ID>'::uuid
    and user_id = '<DESIGNATED_USER_ID>'::uuid
    and status = 'active';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected assignment row count: %', affected; end if;

  if (select count(*) from public.student_assignments
      where client_id = '<CLIENT_ID>'::uuid and status = 'active' and is_primary) <> 1
  then raise exception 'expected exactly one active primary supervisor'; end if;
end
$uat$;

commit;
```

Verificar que la membresía sea `supervisor/active`, la asignación sea
`supervisor/active` y haya exactamente un supervisor primario activo.

## Preparar técnico

La cuenta designada debe volver a cerrar sesión. Primero se mueve la condición
de supervisor primario a la cuenta sintética de resguardo para no dejar la ficha
sin responsable:

```sql
begin;
set transaction isolation level serializable;

do $uat$
declare affected integer;
begin
  update public.student_assignments
  set is_primary = false
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and client_id = '<CLIENT_ID>'::uuid
    and user_id = '<DESIGNATED_USER_ID>'::uuid
    and status = 'active';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected designated assignment row count: %', affected; end if;

  update public.student_assignments
  set role = 'supervisor', is_primary = true, status = 'active', ended_at = null
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and client_id = '<CLIENT_ID>'::uuid
    and user_id = '<GUARD_USER_ID>'::uuid
    and status = 'active';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected guard assignment row count: %', affected; end if;

  update public.memberships
  set role = 'therapist', status = 'active'
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and user_id = '<DESIGNATED_USER_ID>'::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected membership row count: %', affected; end if;

  update public.student_assignments
  set role = 'therapist', is_primary = false, status = 'active', ended_at = null
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and client_id = '<CLIENT_ID>'::uuid
    and user_id = '<DESIGNATED_USER_ID>'::uuid
    and status = 'active';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected designated assignment row count: %', affected; end if;

  if (select count(*) from public.student_assignments
      where client_id = '<CLIENT_ID>'::uuid and status = 'active' and is_primary) <> 1
  then raise exception 'expected exactly one active primary supervisor'; end if;
end
$uat$;

commit;
```

Verificar membresía y asignación `therapist/active`, además de un único
supervisor primario activo distinto de la cuenta designada.

## Restauración obligatoria

La restauración usa exactamente los valores del snapshot, no valores supuestos.
Para el estado actualmente inventariado, el orden seguro es retirar primero el
`is_primary` temporal y restaurar después el original. Esta transacción restaura
ambas membresías y asignaciones. La membresía del resguardo se restaura por MCP
porque su rol heredado no se expone como perfil del MVP; la promoción a admin ya
quedó auditada por la RPC de la interfaz:

```sql
begin;
set transaction isolation level serializable;

do $uat$
declare affected integer;
begin
  update public.student_assignments
  set is_primary = false
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and client_id = '<CLIENT_ID>'::uuid
    and user_id = '<GUARD_USER_ID>'::uuid
    and status = 'active';
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected guard assignment row count: %', affected; end if;

  update public.student_assignments
  set role = '<ORIGINAL_DESIGNATED_ASSIGNMENT_ROLE>',
      is_primary = <ORIGINAL_DESIGNATED_IS_PRIMARY>,
      status = '<ORIGINAL_DESIGNATED_ASSIGNMENT_STATUS>',
      ended_at = <ORIGINAL_DESIGNATED_ENDED_AT>
  where id = '<ORIGINAL_DESIGNATED_ASSIGNMENT_ID>'::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected designated assignment restore count: %', affected; end if;

  update public.student_assignments
  set role = '<ORIGINAL_GUARD_ASSIGNMENT_ROLE>',
      is_primary = <ORIGINAL_GUARD_IS_PRIMARY>,
      status = '<ORIGINAL_GUARD_ASSIGNMENT_STATUS>',
      ended_at = <ORIGINAL_GUARD_ENDED_AT>
  where id = '<ORIGINAL_GUARD_ASSIGNMENT_ID>'::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected guard assignment restore count: %', affected; end if;

  update public.memberships
  set role = '<ORIGINAL_DESIGNATED_MEMBERSHIP_ROLE>',
      status = '<ORIGINAL_DESIGNATED_MEMBERSHIP_STATUS>'
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and user_id = '<DESIGNATED_USER_ID>'::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected designated membership restore count: %', affected; end if;

  update public.memberships
  set role = '<ORIGINAL_GUARD_MEMBERSHIP_ROLE>',
      status = '<ORIGINAL_GUARD_MEMBERSHIP_STATUS>'
  where organization_id = '<ORGANIZATION_ID>'::uuid
    and user_id = '<GUARD_USER_ID>'::uuid;
  get diagnostics affected = row_count;
  if affected <> 1 then raise exception 'unexpected guard membership restore count: %', affected; end if;

  if (select count(*) from public.memberships
      where organization_id = '<ORGANIZATION_ID>'::uuid and role = 'admin' and status = 'active') < 1
  then raise exception 'restoration would leave the clinic without an active admin'; end if;

  if (select count(*) from public.student_assignments
      where client_id = '<CLIENT_ID>'::uuid and status = 'active' and is_primary) <> 1
  then raise exception 'expected exactly one active primary supervisor after restore'; end if;
end
$uat$;

commit;
```

Los placeholders `ended_at` deben convertirse a `null` o a un literal
`timestamptz` válido. Después se repiten ambas consultas del snapshot y se
comprueba coincidencia exacta. La cuenta designada inicia una sesión nueva como
admin, vuelve a ver **Administración** y se confirma un único supervisor primario
activo en la ficha.

Si cualquier escritura afecta cero o más de una fila, se ejecuta `rollback` y
se detiene el UAT. No se improvisan `insert`, `delete` ni cambios sobre una ficha
distinta.
