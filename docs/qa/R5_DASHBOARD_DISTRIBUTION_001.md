# R5-DASHBOARD-DISTRIBUTION-001

Estado: CERRADO FOCAL V12.


## 2026-10-09 — dashboard, composición UX V12

Defecto R5-DASHBOARD-DISTRIBUTION-001 cerrado focal. Comparación visual directa de pares dc1b0c4/candidato desktop1440×900 y móvil390×844: antes, bienvenida/KPI a ancho total y sesiones/gráficos6/6 rompían distribución exigida por spec. Corrección en DashboardPage: columna5 bienvenida+sesionesactivas+finalizadas, columna7 KPI+sesioneslínea+logrosbarras; móvil conserva ese orden. Cuatro KPI reales y tarjetas adicionales persistidas se conservan; no se repone simulación de roles/ModoAplicador, porcentajes mock ni resultados inventados.

Prueba final tests/e2e/r5.dashboard-ux-v12.spec.mjs: 2/2 PASS24,3s en serie. Geometría5/7 y orden móvil, scroll horizontal inexistente, contadores contra RPC autorizado, logros mensuales,12bucketsanuales/tooltip por estudiante contra persistencia, ampliación/cierre con filtros, rangoactividad, refresco y logout. Cero escrituras clínicas. Lint PASS; tipado/lint del cambio y build webpack PASS. Candidato V12 0Ehm1gKf372lHuuQ0KjeM, loopback3001; V11 detenido/preservado. Fallos previos del arnés por puntos superpuestos y borde del área de tooltip conservados; interacción final hover real sobre columna dentro del plot, sin force/dispatch, sin cambio de cálculo del producto.

Pares PNG, hashes y adaptaciones en docs/qa/R5_DASHBOARD_UX_V12_20261009.json. Comparación focal de distribución aprobada, no aprobación global QA004. Bienvenida con nombre exacto y expansión/navegación de sesiones se mantienen pendientes separados. QA003/004/015 abiertos; QA12/16 y404acciones integradas conservan denominadores.
