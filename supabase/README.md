# Backend Supabase

El esquema se mantiene en las migraciones SQL de este directorio. Auth, PostgreSQL, Storage, Realtime y Edge Functions respaldan la aplicación Next.js. Los tipos públicos generados están en src/lib/supabase/database.types.ts.

## Desarrollo

Usar Node 22 y Docker. Crear un stack dedicado de desarrollo antes de ejecutar las pruebas de integración; no reutilizar una base con datos de usuarios. npm run supabase:start inicia el proyecto local definido en config.toml; npm run supabase:stop conserva su estado. Comprobar puertos y conflictos con otros stacks antes de iniciarlo.

El seed contiene organizaciones y membresías sintéticas. Las pruebas CI crean cuentas temporales y fichas ficticias; no dependen de archivos privados del desarrollador. npm run supabase:reset es destructivo y sólo se utiliza en el stack desechable de CI o con autorización expresa para reconstruir una base de pruebas.

## Cambios de esquema

Crear una migración forward nueva; no modificar migraciones ya aplicadas. Revisar grants, RLS, autorizaciones por recurso, concurrencia e idempotencia. Generar tipos con la CLI versionada desde el stack correcto y comprobarlos con npm run supabase:types:check. No conectar estos comandos a producción para ejecutar pruebas.

## Configuración

Las variables de entorno contienen configuración específica de cada instalación y no se versionan. .env.example contiene únicamente marcadores. No incluir service_role, tokens de sesión o contraseñas en código cliente. Configurar correo, URL pública y callbacks en cada destino. Las funciones Edge se encuentran en functions/.
