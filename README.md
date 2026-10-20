# ABA Clínico

Plataforma de gestión clínica ABA construida con Next.js, TypeScript, Mantine y Supabase.

## Requisitos

- Node.js 22.23.2 y npm 10.9.8 (runtime portátil con comprobación SHA-256 mediante scripts/local/install-node.ps1).
- Docker Desktop con motor Linux operativo y Supabase CLI versionado del repositorio.
- Desarrollo sobre Supabase local; staging/VPS no son requisitos para construir el producto local.

## Inicio local

```powershell
powershell -NoProfile -File scripts/local/install-node.ps1
$env:PATH = "$PWD/.runtime.local/node-v22.23.2-win-x64;$env:PATH"
npm ci
npm run local:configure
npm run local:start -- -SkipWeb
npm run local:schema
# Aplicación explícita de las migraciones revisadas, solo por el orquestador:
npm run local:schema -- -Apply
npm run local:types
# Crear un lote sintético explícito según scripts/local/README.md antes del uso clínico.
npm run local:start
npm run local:status
```

La reintegración técnica R1–R4 está en curso según `SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md`.
R1 y P1/R2 están aceptados técnicamente; R3/R4 conservan pendientes explícitos y R5 aún no ha ejecutado QA funcional. El bloque anterior no acredita producto completo ni QA aprobado.
El chat profesional, familiar y sus adjuntos están fuera del release actual y se conservan como upgrade posterior; consulte [docs/DECISION_CHAT_UPGRADE_POSTERIOR.md](docs/DECISION_CHAT_UPGRADE_POSTERIOR.md).
`local:configure` crea `.aba.local/stack` y se niega a sobrescribir una configuración existente.
`local:schema` sincroniza migraciones comprobando SHA-256 y muestra el plan; sin `-Apply` no las ejecuta.
No copiar secretos de staging al entorno local. Los fixtures se crean por lote explícito después del esquema.
No ejecutar reset como arranque o cierre de pruebas. QA integral se realiza exclusivamente
después de integración (R5); los resultados históricos no aprueban el producto reintegrado.

Puede existir un `.env.local` histórico de staging: se conserva y no debe usarse para este flujo.
El entorno generado `.aba.local/browser.env` está ignorado por Git y no contiene claves privilegiadas.
El stack histórico `aba_prototipo` y el nuevo `aba-reintegration-local` usan los mismos puertos:
detener uno conservando volúmenes antes de iniciar el otro; nunca usar `stop --no-backup` ni `stop --all`.
Docker/Next local usa http://localhost:3000, Studio http://127.0.0.1:54323 y correo http://127.0.0.1:54324.

## Comandos

```powershell
npm run local:typecheck
npm run local:stop
```

Las suites `test`, `test:db` y `test:e2e` son históricas; no ejecutarlas durante R0–R4.
El build y la validación integral del producto conectado se coordinan en R4/R5 según la spec maestra.

Documentación operativa vigente:

- `scripts/local/README.md`: preparación, arranque, parada, fixtures y respaldo del entorno local.
- `OPERACION_POC.md`: controles del operador para ensayo y corte clínico.
- `docs/GUIA_USUARIO_LOCAL.md`: navegación y flujos permitidos para usuarios del release actual.

## Arquitectura

- `app/`: rutas de Next.js App Router.
- `src/views/`: pantallas de la aplicación.
- `src/features/`: módulos clínicos reutilizables.
- `src/lib/supabase/`: clientes de navegador, servidor y actualización de sesión.
- `proxy.ts`: refresca la sesión y redirige a `/login` las rutas protegidas.

## Supabase

La aplicación usa las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Servidor/proxy pueden usar `SUPABASE_INTERNAL_URL` para alcanzar la API desde Docker, conservando el namespace de sesión del host público. La clave publicable puede estar en el navegador; la seguridad de los datos depende de las políticas RLS. No uses una clave `service_role` en componentes de cliente ni variables `NEXT_PUBLIC_`.

El espacio clínico en `src/modules/clinical/` consulta y escribe Supabase mediante capacidades por estudiante. Incluye ficha ampliada, programas versionados y captura de porcentaje, frecuencia e intervalos. Las migraciones recuperadas y las pruebas PostgreSQL aisladas viven en `supabase/migrations/` y `tests/database/`.

Los datos sintéticos usan un UUID `ABA_TEST_RUN_ID`, pero el UUID no es una credencial: primero debe registrarse como lote abierto mediante una operación admin de la clínica. Sólo se aplica al crear una ficha y no puede añadirse durante una edición. Antes de una PoC real, siga [OPERACION_POC.md](OPERACION_POC.md): respaldo, congelamiento, inventario, ensayo de limpieza, limpieza por lote y verificación. En la PoC deje esa variable vacía y no conserve lotes abiertos.

El entorno local reproducible y sus comandos se documentan en [supabase/README.md](supabase/README.md). `supabase/seed.sql` no contiene pacientes ni usuarios capaces de iniciar sesión.

La administración de clínica puede invitar cuentas mediante la Edge Function `invite-clinic-member`, que exige JWT y vuelve a autorizar el rol admin antes de usar Auth administrativo. El despliegue para VPS se encuentra en `Dockerfile` y `deploy/`. No publique sin aplicar las migraciones, configurar URLs de Auth, HTTPS, una clave estable de Server Actions y respaldos.
