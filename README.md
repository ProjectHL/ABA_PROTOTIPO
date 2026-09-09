# ABA Clínico

Plataforma de gestión clínica ABA construida con Next.js, TypeScript, Mantine y Supabase.

## Requisitos

- Node.js 20.9 o superior
- Acceso al proyecto Supabase de staging

## Inicio local

```bash
npm install
copy .env.example .env.local
npm run dev
```

El proyecto local ya incluye `.env.local` para el entorno de staging. Nunca subas ese archivo al repositorio.

## Comandos

```bash
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:e2e
npm run build
npm run start
```

## Arquitectura

- `app/`: rutas de Next.js App Router.
- `src/views/`: pantallas de la aplicación.
- `src/features/`: módulos clínicos reutilizables.
- `src/lib/supabase/`: clientes de navegador, servidor y actualización de sesión.
- `proxy.ts`: refresca la sesión y redirige a `/login` las rutas protegidas.

## Supabase

La aplicación usa las variables `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. La clave publicable puede estar en el navegador; la seguridad de los datos depende de las políticas RLS. No uses una clave `service_role` en componentes de cliente ni variables `NEXT_PUBLIC_`.

El espacio clínico en `src/modules/clinical/` consulta y escribe Supabase mediante capacidades por estudiante. Incluye ficha ampliada, programas versionados y captura de porcentaje, frecuencia e intervalos. Las migraciones recuperadas y las pruebas PostgreSQL aisladas viven en `supabase/migrations/` y `tests/database/`.

Los datos sintéticos usan un UUID `ABA_TEST_RUN_ID`, pero el UUID no es una credencial: primero debe registrarse como lote abierto mediante una operación admin de la clínica. Sólo se aplica al crear una ficha y no puede añadirse durante una edición. Antes de una PoC real, siga [OPERACION_POC.md](OPERACION_POC.md): respaldo, congelamiento, inventario, ensayo de limpieza, limpieza por lote y verificación. En la PoC deje esa variable vacía y no conserve lotes abiertos.

El entorno local reproducible y sus comandos se documentan en [supabase/README.md](supabase/README.md). `supabase/seed.sql` no contiene pacientes ni usuarios capaces de iniciar sesión.

La administración de clínica puede invitar cuentas mediante la Edge Function `invite-clinic-member`, que exige JWT y vuelve a autorizar el rol admin antes de usar Auth administrativo. El despliegue para VPS se encuentra en `Dockerfile` y `deploy/`. No publique sin aplicar las migraciones, configurar URLs de Auth, HTTPS, una clave estable de Server Actions y respaldos.
