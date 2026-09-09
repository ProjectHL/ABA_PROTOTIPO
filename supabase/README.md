# Supabase — desarrollo local y migraciones

Esta carpeta es ejecutable y versionada. Contiene la configuración local, 30
migraciones SQL, un seed exclusivamente sintético y la Edge Function del MVP.
El proyecto remoto de staging es `ABA_staging`; nunca se reconstruye ni se carga
con `seed.sql` desde los comandos locales.

## Desarrollo local

Requisitos: Docker Desktop activo y dependencias instaladas.

```powershell
npx supabase start
npx supabase db reset --local
npx supabase status
npm run supabase:test:invitation
npm run supabase:test:invitation-failures
npm run supabase:test:authorization
npm run test:e2e:local-auth
```

Preflight remoto de Auth para `ABA_staging` (sólo lecturas públicas y rechazo
anónimo; no crea usuarios ni envía correos):

```powershell
npm run supabase:staging:auth-preflight
```

El comando exige que `NEXT_PUBLIC_SUPABASE_URL` corresponda al project ref de
staging. Un exit code distinto de cero mantiene abierta la puerta B2.

`db reset --local` elimina y reconstruye sólo la base Docker local. No sustituir
`--local` por `--linked`. Para detenerla conservando sus volúmenes:

```powershell
npx supabase stop
```

La configuración deshabilita Storage, Realtime y Analytics porque están fuera del
alcance del MVP. Mailpit y Edge Runtime permanecen activos para probar invitaciones
sin entregar correos reales. `auto_expose_new_tables = false` obliga a declarar los
grants de cada nuevo objeto. El proveedor email está habilitado para login e
invitaciones; `auth.enable_signup = false` mantiene cerrado el auto-registro público.

## Seed y datos dummy

`seed.sql` crea dos clínicas y cuatro membresías sintéticas. Los usuarios no tienen
contraseña ni identidad y no pueden iniciar sesión. Las pruebas autenticadas deben
crear cuentas temporales mediante la API administrativa local; no se guardan claves
en Git. Después de ejecutarlas, usar `npm run supabase:reset` para recuperar el seed.

El seed no contiene pacientes. Un fixture clínico sólo puede crearse contra un lote
abierto mediante `mvp_open_test_batch`, y esa operación exige un admin de la clínica.
No ejecutar `mvp_cleanup_test_run` sobre staging durante desarrollo.

## Flujo de migraciones

1. Crear una migración con `npx supabase migration new <nombre>`.
2. Editar únicamente el archivo nuevo y revisar permisos/RLS/índices.
3. Ejecutar `npx supabase db reset --local` y la suite del repositorio.
4. Regenerar tipos desde el destino validado.
5. Promover la migración inmutable y comprobar advisors/ledger.

Las especificaciones históricas viven en `docs/supabase/`; `migrations/` contiene
solamente archivos con el patrón `<timestamp>_<nombre>.sql`.
