# Pruebas y aceptación

## Pruebas mantenidas

| Capa | Ejecución | Alcance |
|---|---|---|
| Estática | `npm run lint`, `npm run typecheck` | Reglas y contratos TypeScript |
| Vitest | `npm test` | Reglas y contratos incluidos en las suites |
| Base de datos | `npm run test:db` | Suite `tests/database` sobre PGlite con `db/bootstrap.sql` |
| Migraciones reales | `npm run db:migrate` | Bootstrap y migraciones contra PostgreSQL 17 |
| Navegador público | `npm run test:e2e` | Login, recuperación y redirección de rutas protegidas |
| Construcción | `npm run build -- --webpack` | Compilación del producto |

`playwright.config.ts` selecciona `tests/e2e/public.spec.ts`. La cobertura autenticada de navegador quedó pendiente de reconstruir sobre la autenticación propia; por ahora los contratos de autorización se validan en `tests/database` y en los servicios de servidor. Por defecto se usa el Chromium que instala Playwright (`npx playwright install chromium`); `PLAYWRIGHT_CHANNEL=chrome` reutiliza un Chrome del sistema. Los resultados y trazas generados no se versionan y pueden contener información de sesión; usar sólo datos sintéticos.

## Integración con PostgreSQL

`tests/database` levanta PGlite, aplica `db/bootstrap.sql` y ejecuta todas las migraciones. Ese mismo bootstrap se usa en producción, de modo que una migración que dependa de un privilegio o shim ausente falla en la suite. Para validar contra PostgreSQL real, apunte `DATABASE_URL` a una base desechable y ejecute `npm run db:migrate` dos veces: la segunda debe ser un no-op.

No apuntar pruebas de escritura a producción ni a una base con datos clínicos. La suite pública de navegador usa `http://127.0.0.1:3000`. Si ese puerto está ocupado, apunte `PLAYWRIGHT_BASE_URL` a uno libre (por ejemplo `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 npm run test:e2e`); Playwright levanta el servidor en ese mismo puerto.

## Integración continua

[El workflow CI](../.github/workflows/ci.yml) define tres trabajos:

- `verify`: dependencias, lint, tipado, Vitest, navegador público y build con configuración sintética.
- `database`: PostgreSQL 17 efímero, `npm run db:migrate` y verificación de idempotencia.
- `container-build`: construcción Docker sin publicación de la imagen.

El PostgreSQL del job `database` es efímero. No copiar ese patrón sobre un entorno activo con datos que deban conservarse. Un job exitoso demuestra únicamente el alcance de sus pruebas; no acredita la totalidad de los flujos clínicos.

## Aceptación de usuario

Antes de producción se requieren tres recorridos completos: administración de clínica, supervisión y técnico. Deben incluir creación/activación de cuentas, asignaciones, ficha, programas, sesión, registros y resultados, además de las restricciones de cada perfil.

Usar una versión fija, cuentas diferenciadas y datos ficticios. Registrar objetivo, resultado esperado, resultado obtenido y evidencia de cada incidencia. Verificar persistencia tras recarga y nuevo acceso, permisos, recuperación de borradores y continuidad del trabajo. Las pruebas de desconexión o recuperación se realizan en el entorno de pruebas preparado para ese propósito.

Los recorridos finales y la aceptación humana siguen siendo requisitos de entrega. CI verde no los da por ejecutados. Para pruebas por Internet se necesita un ambiente aislado con HTTPS, invitaciones y correo operativo; su publicación se planifica y valida como una actividad separada.
