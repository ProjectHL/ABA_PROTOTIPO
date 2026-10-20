# Pruebas y aceptación

## Pruebas mantenidas

| Capa | Ejecución | Alcance |
|---|---|---|
| Estática | `npm run lint`, `npm run typecheck` | Reglas y contratos TypeScript |
| Vitest | `npm test` | Reglas y contratos incluidos en las suites |
| Base de datos | `npm run test:db` | Suite `tests/database` |
| Navegador público | `npm run test:e2e` | Login, recuperación y redirección de rutas protegidas |
| Navegador autenticado | `npm run test:e2e:local-auth` | Stack Supabase local aislado |
| Construcción | `npm run build -- --webpack` | Compilación del producto |

`playwright.config.ts` selecciona `tests/e2e/public.spec.ts`; `playwright.local.config.ts` selecciona `authenticated.local.spec.ts`. Las configuraciones locales usan Chrome; en CI se instala Chromium. Preparar el navegador correspondiente antes de ejecutar la suite. Los resultados y trazas generados no se versionan y pueden contener información de sesión; usar sólo datos sintéticos.

## Integración con Supabase

La suite autenticada y los scripts de invitaciones/autorización crean datos de prueba. Ejecutarlos únicamente contra un stack local dedicado y desechable, con sus migraciones aplicadas. No reutilizar un entorno con pacientes, una sesión humana en curso ni un backend remoto de producción.

El runner autenticado obtiene la configuración del Supabase local e inicia su propio servidor web en el puerto 3100. La suite pública usa el puerto 3000. Evitar compartir estos puertos con sesiones manuales que deban preservarse.

## Integración continua

[El workflow CI](../.github/workflows/ci.yml) define tres trabajos:

- `verify`: dependencias, lint, tipado, Vitest, navegador público y build con configuración sintética.
- `supabase-local`: stack efímero del runner, migraciones, invitaciones y fallos, autorización, navegador autenticado y sincronización de tipos.
- `container-build`: construcción Docker sin publicación de la imagen.

El reset del stack pertenece al runner efímero de CI. No copiar ese paso sobre un entorno activo con datos que deban conservarse. Un job exitoso demuestra únicamente el alcance de sus pruebas; no acredita la totalidad de los flujos clínicos.

## Aceptación de usuario

Antes de producción se requieren tres recorridos completos: administración de clínica, supervisión y técnico. Deben incluir creación/activación de cuentas, asignaciones, ficha, programas, sesión, registros y resultados, además de las restricciones de cada perfil.

Usar una versión fija, cuentas diferenciadas y datos ficticios. Registrar objetivo, resultado esperado, resultado obtenido y evidencia de cada incidencia. Verificar persistencia tras recarga y nuevo acceso, permisos, recuperación de borradores y continuidad del trabajo. Las pruebas de desconexión o recuperación se realizan en el entorno de pruebas preparado para ese propósito.

Los recorridos finales y la aceptación humana siguen siendo requisitos de entrega. CI verde no los da por ejecutados. Para pruebas por Internet se necesita un ambiente aislado con HTTPS, invitaciones y correo operativo; su publicación se planifica y valida como una actividad separada.
