# Authorized search V13 — preparación, sin ejecución

Estado: **preparado, no ejecutado**. Candidato requerido: `rFuUzZbqYsCB2mKTHX09X`, `http://localhost:3001`.

Archivos exclusivos: `tests/e2e/r5.authorized-search-v13.spec.mjs` y `playwright.authorized-search-v13.config.ts`. ESLint pasó; Playwright `--list` descubrió escritorio/móvil sin iniciar Auth ni navegador.

BUSQUEDA-002 se probará mediante RPC ordinario `aba_authorized_search_v2` y comparación exacta del orden, conteo, título, tipo y subtítulo de resultados UI. Incluye los tres tipos existentes, consulta vacía/corta, sin coincidencias y clínica B sin los IDs A.

BUSQUEDA-003 se probará con clicks reales y ruta igual al DTO autorizado, valores y recarga de ficha, título/versionado vigente/dimensión/conteo persistido de filas del programa y metadatos vigentes del documento en Documentación Legal. El contrato de documento abre la ficha, no una URL Storage. También incluye rutas A manipuladas como B, campos/controles ausentes, chart 404 y snapshots clínicos/programas/sesiones/documentos idénticos antes/después.

Se espera la liberación serial de root. El arnés exige **journal del grupo compartido status complete antes de Auth**, BUILD_ID exacto y ausencia de journal propio pending. No crea datos ni permisos. Prefiere documento sintético own94; fallback autorizado b347 sólo lectura después de comprobar `QA-R5-A-2155E99E` y metadatos del lote sintético. No se toca sesión97 ni se descargan archivos.

No hay resultados funcionales todavía. La propuesta terminal se entregará después de escritorio y móvil, con DTO y aserciones de lectura en journals/safes; no se declara cierre QA003/404 ni cobertura de supervisor/técnico. No se modifica canon, mapa ni producto.

