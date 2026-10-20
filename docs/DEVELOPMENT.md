# Desarrollo

## Entorno

Usar Node.js 22 y npm según `package.json`. `npm ci` reproduce las dependencias del lockfile. Docker es necesario para el backend Supabase local y para probar el contenedor de despliegue.

Crear `.env.local` desde `.env.example`, sin versionarlo. Los valores `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` identifican el backend usado por el navegador. Una clave pública no reemplaza RLS; una clave privilegiada nunca debe usar el prefijo `NEXT_PUBLIC_` ni llegar al cliente.

Para un entorno nuevo y desechable, `npm run supabase:start` inicia el stack local definido en `supabase/config.toml`. Consultar su configuración mediante la CLI local y provisionar las migraciones de `supabase/migrations/`. No apuntar pruebas de escritura a producción ni ejecutar un reset sobre volúmenes con trabajo que deba conservarse. La CI crea y prepara su propio entorno efímero.

Las invitaciones requieren configuración de Auth, URLs de redirección y correo apropiadas para el entorno. El correo capturado localmente no constituye entrega por Internet. Las Edge Functions se encuentran en `supabase/functions/` y deben estar disponibles en el backend utilizado.

## Comandos habituales

| Comando | Uso |
|---|---|
| `npm run dev -- --webpack` | Servidor web de desarrollo |
| `npm run lint` | Análisis estático |
| `npm run typecheck` | Comprobación TypeScript |
| `npm test` | Suite Vitest |
| `npm run test:db` | Pruebas de base incluidas en Vitest |
| `npm run test:e2e` | Recorrido público con Playwright |
| `npm run build -- --webpack` | Construcción de la aplicación |
| `npm start` | Servir una construcción existente |

Las pruebas autenticadas y de backend tienen precondiciones adicionales descritas en [TESTING.md](TESTING.md). Para ejecutar la web en un contenedor, consultar [deploy](../deploy/README.md).

## Organización y cambios

1. Crear una rama desde `main` para cada cambio coherente.
2. Identificar la ruta, el contrato de dominio y la autorización por recurso afectados.
3. Mantener las validaciones de cliente y servidor y la compatibilidad de los datos existentes.
4. Añadir una migración nueva si cambia el esquema. No reescribir migraciones ya aplicadas.
5. Actualizar los tipos de `src/lib/supabase/database.types.ts` desde un backend local con las migraciones correspondientes y comprobar su sincronización con `npm run supabase:types:check`.
6. Ejecutar las pruebas pertinentes y los controles estáticos. Describir en el cambio qué se verificó y qué sigue pendiente.

Los comandos con recibos deben conservar su identidad al reintentar. Un error de transporte no demuestra que la transacción haya fallado. No resolver conflictos sobrescribiendo versiones ni generando otro identificador a ciegas.

## Archivos compartidos

El repositorio contiene producto, migraciones, pruebas mantenidas y documentación de desarrollo. Los entornos privados, resultados de ejecución, informes de auditoría puntuales, respaldos y archivos generados no forman parte del código entregable. Mantener los ejemplos de configuración con valores genéricos.

Antes de publicar un cambio, revisar `git diff --cached`, las reglas de exclusión y los resultados de CI. No incluir datos clínicos, tokens, contraseñas ni exportaciones de Storage. Un `.env.example` contiene nombres y placeholders; no debe convertirse en una copia de un entorno operativo.
