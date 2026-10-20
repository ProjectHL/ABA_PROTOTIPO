# Desarrollo

## Entorno

Usar Node.js 22 y npm según `package.json`. `npm ci` reproduce las dependencias del lockfile. Docker es necesario para levantar PostgreSQL local y para probar el contenedor de despliegue; también puede usarse un PostgreSQL 17 instalado en la máquina.

Crear `.env.local` desde `.env.example`, sin versionarlo. `DATABASE_URL` apunta a PostgreSQL; `AUTH_SECRET` (32 bytes o más) firma las cookies de sesión. `SMTP_*` habilita invitaciones y recuperación; sin SMTP en desarrollo el mensaje se imprime en consola. `STORAGE_ROOT` define el volumen privado de archivos.

## Primer acceso

No hay registro público: las cuentas nacen por invitación de un administrador. En una base recién migrada no existe ningún usuario, así que el primero se crea desde la consola:

```sh
DATABASE_URL=postgresql://... npm run user:create -- \
  --email admin@clinica.test --password 'UnaClave12!Segura' \
  --name 'Nombre Apellido' --org 'Clínica Demo'
```

El comando es idempotente: si el usuario ya existe actualiza la contraseña y confirma el correo; si la organización ya existe la reutiliza. También acepta `ADMIN_PASSWORD` en el entorno en lugar de `--password`, para no dejar la clave en el historial de shell. Ese administrador entra por `/login` y desde Equipo invita al resto.

Para un entorno nuevo y desechable, cree una base vacía y aplique `npm run db:migrate`. El script ejecuta `db/bootstrap.sql` (roles, esquema `auth`, shim de Storage) y las migraciones pendientes de `db/migrations/`, registrando cada versión en `public.schema_migrations`. Es idempotente. No apuntar pruebas de escritura a producción ni ejecutar un reset sobre volúmenes con trabajo que deba conservarse. La CI crea y prepara su propio entorno efímero.

Las invitaciones y la recuperación de contraseña requieren SMTP y `NEXT_PUBLIC_APP_URL` correctos para el entorno. El correo impreso en consola durante desarrollo no constituye entrega por Internet. Las invitaciones se procesan en `src/features/team/invitation.service.ts` y la verificación de adjuntos en `src/modules/attachments/verify.server.ts`.

## Datos de demostración

Solo para desarrollo y pruebas. `npm run seed:demo` carga seis fichas clínicas ficticias (DEMO-001 a DEMO-006) y dos cuentas de ejemplo, reutilizando la primera clínica activa con administrador:

```sh
DATABASE_URL=postgresql://... npm run seed:demo
```

Imprime las credenciales (`clinico@demo.test` y `lector@demo.test`, clave `Demo1234!Segura` o la que indique `DEMO_PASSWORD`). El clínico queda asignado como terapeuta de las seis fichas; el perfil de lectura no recibe asignaciones, así que sirve para comprobar que no ve datos clínicos.

El seed vive en `db/seed/demo.sql` y no lo ejecuta `npm run db:migrate`: las migraciones solo leen `db/bootstrap.sql` y `db/migrations/`. Es idempotente (los estudiantes usan identificadores fijos) y aborta si no hay clínica con administrador. Se niega a correr con `APP_ENV=production`; dentro de la imagen de despliegue, donde `NODE_ENV=production`, exige `--force` o `DEMO_DATA=yes`. Aun así, la regla operativa es no ejecutarlo nunca contra el ambiente productivo.

## Comandos habituales

| Comando | Uso |
|---|---|
| `npm run dev -- --webpack` | Servidor web de desarrollo |
| `npm run lint` | Análisis estático |
| `npm run typecheck` | Comprobación TypeScript |
| `npm test` | Suite Vitest |
| `npm run test:db` | Pruebas de base incluidas en Vitest |
| `npm run test:e2e` | Recorrido público con Playwright |
| `npm run seed:demo` | Datos ficticios para desarrollo y pruebas |
| `npm run build -- --webpack` | Construcción de la aplicación |
| `npm start` | Servir una construcción existente |

Las pruebas autenticadas y de backend tienen precondiciones adicionales descritas en [TESTING.md](TESTING.md). Para ejecutar la web en un contenedor, consultar [infra](../infra/README.md).

## Organización y cambios

1. Crear una rama desde `main` para cada cambio coherente.
2. Identificar la ruta, el contrato de dominio y la autorización por recurso afectados.
3. Mantener las validaciones de cliente y servidor y la compatibilidad de los datos existentes.
4. Añadir una migración nueva si cambia el esquema. No reescribir migraciones ya aplicadas.
5. Actualizar `src/lib/db/database.types.ts` cuando cambie el esquema. Es un archivo de tipos escrito a mano a partir de las migraciones; `npm run typecheck` detecta desajustes estructurales.
6. Ejecutar las pruebas pertinentes y los controles estáticos. Describir en el cambio qué se verificó y qué sigue pendiente.

Los comandos con recibos deben conservar su identidad al reintentar. Un error de transporte no demuestra que la transacción haya fallado. No resolver conflictos sobrescribiendo versiones ni generando otro identificador a ciegas.

## Archivos compartidos

El repositorio contiene producto, migraciones, pruebas mantenidas y documentación de desarrollo. Los entornos privados, resultados de ejecución, informes de auditoría puntuales, respaldos y archivos generados no forman parte del código entregable. Mantener los ejemplos de configuración con valores genéricos.

Antes de publicar un cambio, revisar `git diff --cached`, las reglas de exclusión y los resultados de CI. No incluir datos clínicos, tokens, contraseñas ni exportaciones de Storage. Un `.env.example` contiene nombres y placeholders; no debe convertirse en una copia de un entorno operativo.
