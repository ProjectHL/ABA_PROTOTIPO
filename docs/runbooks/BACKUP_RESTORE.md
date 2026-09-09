# Runbook de backup y restore — ABA Clínico

## Objetivo

Demostrar recuperación antes de abrir la PoC sin restaurar encima de
`ABA_staging`. La evidencia usa conteos e invariantes; nunca exporta contenido
clínico a logs o documentos.

## Estrategia mínima

- En Supabase Pro o superior, confirmar que existe un backup gestionado reciente.
- En Free, o como copia adicional, crear un dump lógico con Supabase CLI y
  almacenarlo cifrado fuera de la VPS.
- Restaurar únicamente en un proyecto temporal autorizado o en un stack
  Supabase local aislado y vacío. Una imagen PostgreSQL por sí sola no basta:
  Auth debe ejecutar primero sus migraciones gestionadas con versiones
  compatibles con el origen.
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
supabase db dump --db-url "<CONNECTION_STRING>" --schema public,private -f aba-backup/schema_app.sql
supabase db dump --db-url "<CONNECTION_STRING>" -f aba-backup/data.sql --use-copy --data-only
sha256sum aba-backup/roles.sql aba-backup/schema_app.sql aba-backup/data.sql
```

`schema_app.sql` contiene sólo la estructura propia de `public` y `private`;
`data.sql` conserva también los datos gestionados necesarios de Auth. Los archivos
pueden contener cuentas, hashes, tokens y datos clínicos. Cífrelos inmediatamente,
limite su acceso y elimine las copias temporales sólo mediante el procedimiento
aprobado por el propietario. No los suba a Git, tickets o mensajería.

## Restore aislado

El destino debe estar vacío, ser desechable y no enviar correos. Use versiones de
PostgreSQL, Supabase CLI y Auth compatibles. Inicie primero el stack Supabase para
que Auth cree y migre sus tablas gestionadas; luego restaure los tres archivos en
una sola transacción:

```sh
psql \
  --single-transaction \
  --variable ON_ERROR_STOP=1 \
  --file aba-backup/roles.sql \
  --file aba-backup/schema_app.sql \
  --command 'SET session_replication_role = replica' \
  --file aba-backup/data.sql \
  --dbname "<ISOLATED_RESTORE_CONNECTION_STRING>"
```

No apunte `<ISOLATED_RESTORE_CONNECTION_STRING>` a `ABA_staging`.
No restaure un dump completo de estructura sobre los esquemas gestionados que el
stack ya preparó. Si Auth no tiene las mismas columnas que el dump, descarte el
destino y alinee las versiones; no excluya silenciosamente `auth.users`.

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

select count(*) as invalid_app_constraints
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where not con.convalidated and n.nspname in ('public', 'private');

select count(*) as orphan_memberships
from public.memberships m
left join auth.users u on u.id = m.user_id
where u.id is null;
```

La aceptación exige conteos conciliados, cero tablas públicas sin RLS, cero
constraints inválidos en los esquemas de aplicación, cero membresías huérfanas,
Auth saludable y ejecución verde de las pruebas DB contra un replay limpio.
Constraints gestionados no validados se registran por separado con su esquema y
nombre; no se ocultan ni se atribuyen automáticamente a la aplicación. Registre
duración del backup, duración del restore, timestamp recuperado, RPO/RTO observado,
hashes y responsable.

## Ensayo local del 9 de septiembre de 2026

El ensayo usó sólo datos sintéticos y un stack Supabase temporal sin puertos
externos adicionales. El origen se detuvo conservando volúmenes, el destino se
eliminó al finalizar y el origen volvió con sus conteos intactos.

- SHA de aplicación evaluado: `640389c6a519992f89408d18b617204144e12fc4`.
- Dump efectivo: roles, estructura `public/private` y datos completos incluidos
  Auth; generación aproximada menor a 10 segundos.
- Hashes SHA-256: `roles.sql`
  `25873cec56a2cc6514e204f420231777f85c03da818caa7090cdcdfa89776ecd`;
  `schema_app.sql`
  `f08ab4f25e871c10392601982f019f46317a789b8e61f099edcebb8b1487dcd9`;
  `data.sql`
  `7f9baa5e40740bd2498cd709e30a3f04b352b96669df08924f0e38b78466f5d1`.
- Restore SQL transaccional: menor a 1 segundo. RTO frío observado: menor a 2
  minutos, incluyendo descarga inicial de imágenes; no representa aún un restore
  remoto con volumen clínico.
- Origen y restore: 2 organizaciones, 4 usuarios Auth, 4 membresías, 0 clientes,
  0 sesiones, 0 registros de sesión, 30 tablas públicas y 57 políticas.
- Invariantes: 0 tablas públicas sin RLS, 0 constraints inválidos en
  `public/private`, 0 membresías huérfanas y GoTrue v2.196.0 saludable.
- El stack temporal habilitó Realtime y reportó un constraint gestionado no
  validado (`realtime.messages:messages_payload_exclusive`); quedó fuera del gate
  de aplicación y fue registrado explícitamente.

Dos intentos se rechazaron antes del PASS: PostgreSQL sin GoTrue produjo deriva
de columnas Auth; restaurar sólo `public/private` dejó 4 membresías huérfanas.
Ambos restores se ejecutaron en una transacción y se revirtieron sin dejar estado
parcial.

## Fallo y escalamiento

- Si el dump falla, conserve el error sin cadenas de conexión y no inicie el corte.
- Si el restore parcial falla, destruya el destino aislado y repita desde un
  destino vacío; no improvise reparaciones sobre staging.
- Si los conteos o invariantes difieren, B4 permanece bloqueado.
- Un restore gestionado sobre el proyecto activo produce indisponibilidad y puede
  perder cambios posteriores. Requiere una autorización destructiva separada y no
  forma parte de este ensayo.
