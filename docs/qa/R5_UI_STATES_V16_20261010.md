# Estados UI V16 — evidencia focal terminal

Candidato `SqXFb86Tn89rgGpuEGkKu`, catálogo 103 según contexto de root. Escritorio **1/1 PASS (15,5 s)** y móvil **1/1 PASS (14,3 s)**. Lint PASS. No se modificó producto ni canon.

Se ejercieron controles reales con admin-a sintético: carga inicial del dashboard, error por lectura abortada, reintento mediante Actualizar y concordancia con DTO autorizado; error durante refresco conserva métricas confirmadas y muestra la advertencia correspondiente. La búsqueda conserva consulta tras fallo, bloquea Escape mientras está ocupada, recupera mediante Buscar y cierra mediante Escape después. La navegación Ver carpetas muestra carga real, abre la ficha sintética por su menú, comprueba nombre/ID persistidos, vuelve mediante Volver a la lista y regresa por Dashboard del sidebar.

Cada proyecto registra tres lecturas abortadas antes de enviarse al servidor y una lectura de lista retenida y luego enviada realmente. Los IDs NextAction se resuelven por nombre exportado en el manifest del candidato; no se fabricaron respuestas. El guard aborta cualquier comando operationId/idempotencyKey antes de enviarlo: **0 intentos de escritura y 0 escrituras clínicas**.

Las proyecciones completas de ficha/programas/sesiones de own94 y del original b347 permanecieron exactas, incluida la sesión original97. Ambos proyectos conservan el hash de referencia `1b9cd3d9f4812228417b8b32149fe709fdbb432ee2b758c350ce67f56896bfa4`.

## Conciliación propuesta

- ESTADOS-001/003/004: cobertura focal de loaders, errores recuperables y reintentos de las superficies dashboard/búsqueda/lista. No equivale a validar todas las rutas.
- FICHA-008: botón real Volver a la lista acreditado en escritorio y móvil.
- BUSQUEDA-001/002: suplemento de estados/recuperación; no sustituye las tres clases de resultado y negativos B acreditados por authorized-search V13.

## Límites pendientes

No se provocó el boundary global `app/error.tsx` ni el fallback global `app/loading.tsx`. ESTADOS-005 (no encontrado) no fue ejercido aquí. Estos fallos son abortos de lectura acotados al navegador, no una caída real del servidor ni pruebas offline/Storage/Realtime. Sólo se ejerció admin-a sintético. **QA003 global permanece abierto**.

## Evidencia

- Test: `tests/e2e/r5.ui-states-v16.spec.mjs`; config: `playwright.ui-states-v16.config.ts`.
- Journals y safes: `.aba.local/qa/ui-states-v16-desktop-{journal,safe}.json` y `.aba.local/qa/ui-states-v16-mobile-{journal,safe}.json`.
- JSON de esta propuesta: `docs/qa/proposals/ui-states-v16-current.json`, con run IDs, aserciones, fallos, hashes SHA256 y límites.
- Preparación preservada por separado: `docs/qa/proposals/ui-states-v16-preparation.{json,md}`.

Clientes Auth cerrados, gates liberados y root informado. No quedan pruebas de este paquete en ejecución.
