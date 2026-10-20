# Supabase — desarrollo local y migraciones

Esta carpeta es ejecutable y versionada. Contiene la configuración local, 30
migraciones SQL, un seed exclusivamente sintético y la Edge Function del MVP.
El proyecto remoto de staging es `ABA_staging`; nunca se reconstruye ni se carga
con `seed.sql` desde los comandos locales.

## Desarrollo local

Requisitos: Docker Desktop activo y dependencias instaladas.

```powershell
npx supabase start
npx supabase status
```

Preflight remoto de Auth para `ABA_staging` (sólo lecturas públicas y rechazo
anónimo; no crea usuarios ni envía correos):

```powershell
npm run supabase:staging:auth-preflight
```

El comando exige que `NEXT_PUBLIC_SUPABASE_URL` corresponda al project ref de
staging. Un exit code distinto de cero mantiene abierta la puerta B2.

El arranque normal conserva los datos. `db reset --local` es destructivo: elimina
y reconstruye la base local y solo corresponde a una reconstrucción explícitamente
autorizada sobre un destino validado y respaldado. Nunca forma parte de arranque,
parada o cierre automático de pruebas. No sustituir `--local` por `--linked`.
Para detenerla conservando sus volúmenes:

```powershell
npx supabase stop
```

La configuración actual aún deshabilita Storage y Realtime: es una limitación del
MVP anterior, no una exclusión del producto completo. Su habilitación e integración
son pendientes obligatorios. Analytics no forma parte del alcance confirmado.
Mailpit y Edge Runtime permanecen activos para probar invitaciones
sin entregar correos reales. `auto_expose_new_tables = false` obliga a declarar los
grants de cada nuevo objeto. El proveedor email está habilitado para login e
invitaciones; `auth.enable_signup = false` mantiene cerrado el auto-registro público.

## Seed y datos dummy

`seed.sql` crea dos clínicas y cuatro membresías sintéticas. Los usuarios no tienen
contraseña ni identidad y no pueden iniciar sesión. Las pruebas autenticadas deben
crear cuentas temporales mediante la API administrativa local; no se guardan claves
en Git. Su limpieza debe ser explícita y limitada al lote/cuentas de la ejecución;
no reconstruir la base habitual para recuperar el seed. El runner autenticado
histórico ya no ejecuta reset al terminar. Sus recorridos y los otros comandos de
prueba se reservan para R5, tras integración, sobre un destino local validado.

El seed no contiene pacientes. Un fixture clínico sólo puede crearse contra un lote
abierto mediante `mvp_open_test_batch`, y esa operación exige un admin de la clínica.
No ejecutar `mvp_cleanup_test_run` sobre staging durante desarrollo.

## Flujo de migraciones

1. Crear una migración con `npx supabase migration new <nombre>`.
2. Editar únicamente el archivo nuevo y revisar permisos/RLS/índices.
3. El orquestador revisa y ordena las propuestas; aplica únicamente sobre un destino
   local validado, sin reconstruir la base habitual. La creación de una instancia
   aislada o su reconstrucción exige destino explícito y conservación de datos.
4. Regenerar tipos desde el esquema realmente aplicado, no desde propuestas.
5. Revisar advisors/ledger conforme a la fase de integración. Las suites y recorridos
   integrales se ejecutan exclusivamente en R5; no heredar el PASS del MVP anterior.

Las especificaciones históricas viven en `docs/supabase/`; `migrations/` contiene
solamente archivos con el patrón `<timestamp>_<nombre>.sql`.
