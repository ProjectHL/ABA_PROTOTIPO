# Runbook de backup y restore — ABA Clínico

## Objetivo

Demostrar recuperación antes de abrir la PoC sin restaurar encima de
`ABA_staging`. La evidencia usa conteos e invariantes; nunca exporta contenido
clínico a logs o documentos.

## Estrategia mínima

- En Supabase Pro o superior, confirmar que existe un backup gestionado reciente.
- En Free, o como copia adicional, crear un dump lógico con Supabase CLI y
  almacenarlo cifrado fuera de la VPS.
- Restaurar únicamente en un proyecto temporal autorizado o en una instancia
  local aislada y vacía.
- Objetivo inicial MVP: RPO de 24 horas y RTO de 4 horas. El propietario debe
  aceptar o reemplazar estos valores antes de la PoC.

Los backups gestionados de Supabase no incluyen objetos binarios de Storage. El
MVP no usa adjuntos, pero esta excepción debe reevaluarse cuando se habiliten.

## Backup lógico

Requiere Supabase CLI, Docker y la cadena de conexión obtenida desde **Connect**.
No escriba esa cadena en el repositorio ni en el acta.

```sh
mkdir -p aba-backup
chmod 700 aba-backup
supabase db dump --db-url "<CONNECTION_STRING>" -f aba-backup/roles.sql --role-only
supabase db dump --db-url "<CONNECTION_STRING>" -f aba-backup/schema.sql
supabase db dump --db-url "<CONNECTION_STRING>" -f aba-backup/data.sql --use-copy --data-only
sha256sum aba-backup/roles.sql aba-backup/schema.sql aba-backup/data.sql
```

Los archivos pueden contener cuentas y datos clínicos. Cífrelos inmediatamente,
limite su acceso y elimine las copias temporales sólo mediante el procedimiento
aprobado por el propietario. No los suba a Git, tickets o mensajería.

## Restore aislado

El destino debe estar vacío, ser desechable y no enviar correos. Use versiones de
PostgreSQL/Supabase compatibles. La documentación oficial recomienda restaurar
los tres archivos en una sola transacción:

```sh
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file aba-backup/roles.sql \
  --file aba-backup/schema.sql \
  --command 'SET session_replication_role = replica' \
  --file aba-backup/data.sql \
  --dbname "<ISOLATED_RESTORE_CONNECTION_STRING>"
```

No apunte `<ISOLATED_RESTORE_CONNECTION_STRING>` a `ABA_staging`.

## Verificación sin contenido clínico

Ejecute en origen y restore, compare únicamente resultados agregados y confirme:

```sql
select 'organizations' as object_name, count(*) as row_count from public.organizations
union all select 'memberships', count(*) from public.memberships
union all select 'clients', count(*) from public.clients
union all select 'clinical_sessions', count(*) from public.clinical_sessions
union all select 'session_program_records', count(*) from public.session_program_records;

select count(*) as public_tables_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;

select count(*) as invalid_constraints
from pg_constraint
where not convalidated;
```

La aceptación exige conteos conciliados, cero tablas públicas sin RLS, cero
constraints inválidos y ejecución verde de las pruebas DB contra un replay limpio.
Registre duración del backup, duración del restore, timestamp recuperado, RPO/RTO
observado, hashes y responsable.

## Fallo y escalamiento

- Si el dump falla, conserve el error sin cadenas de conexión y no inicie el corte.
- Si el restore parcial falla, destruya el destino aislado y repita desde un
  destino vacío; no improvise reparaciones sobre staging.
- Si los conteos o invariantes difieren, B4 permanece bloqueado.
- Un restore gestionado sobre el proyecto activo produce indisponibilidad y puede
  perder cambios posteriores. Requiere una autorización destructiva separada y no
  forma parte de este ensayo.
