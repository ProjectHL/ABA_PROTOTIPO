# Estados UI V16 — preparación

Build `SqXFb86Tn89rgGpuEGkKu`, catálogo103 según root. Lint PASS y list 2 proyectos, sin ejecución aún. Root liberó Auth para ejecución serial tras esta preparación.

Pendientes concretos: dashboard loader/error inicial/Actualizar y refresco fallido conservando DTO confirmado; búsqueda busy/error/retry/cierre; Ver carpetas con loader y lectura real, carpeta propia por menú, Volver a la lista y Dashboard por sidebar. Los errores se generan abortando sólo requests NextAction de lectura identificados por exportedName/ID del manifest; las demoras son gates dentro del contexto Playwright. No se fabrica Flight ni se para servidor.

Se comprueban contadores/resultados/campos contra DTO ordinarios, más snapshots clínicos/programas/sesiones originales exactos y cero comandos operationId/idempotencyKey. Se aborta cualquier intento de comando antes de transmitir.

No repetir ramas ya acreditadas de expansiones/charts V12 o los tres tipos de búsqueda/aislamiento B V13. app/error global y app/loading de ruta quedan explícitamente fuera: este paquete prueba loaders/errores locales reales, no aceptación global por headings. Sin modificación de producto/canon/SQL. Escritorio primero; móvil sólo tras terminal PASS.
