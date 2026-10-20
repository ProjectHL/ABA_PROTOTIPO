# R3 / A6 — revisión de fuentes activas

> Estado vigente 2026-09-27: R3/R4 aceptados técnicamente para R5 en R4_CONSOLIDACION_CIERRE_LOCAL.md. Forwards aplicados; catálogo local reconsultado: 97 migraciones, última 20260926221536. Los estados de aplicación pendiente/pausa/401+3 inferiores son cortes históricos, no tareas vigentes. QA funcional y aceptación local siguen pendientes; chat y R6 no condicionan el cierre local.

Fecha: 2026-09-26. Revisión estática; no aceptación funcional ni gate R4 completo.
Dashboard requiere el forward 20260926221035, aún no aplicado. Chat excluido.

## Trazabilidad revisada

| Requisitos | Fuente activa y evidencia | Límite |
|---|---|---|
| RESULTADOS-001–003 | ProgramResults filtra periodo 7/30/90/all, actor y fase sobre capturedAt; ruta chart relee ficha/programa y exige chart.view. | No demuestra interacción ni permisos ejecutados; R5. |
| RESULTADOS-004–006, 012 | ResultsChart y tabla usan measurementV2Metrics; porcentaje conserva I/A/E/NR; revisiones y notas persistidas visibles. | V1 sólo agregado aparte; formatos no soportados se advierten, no calculan. |
| RESULTADOS-007 | Nota usa CaptureCommandV2 revise, conserva medición, exige motivo y record.submit; conflicto consulta versión vigente sin perder nota/motivo. | Transporte incierto conserva comando exacto; concurrencia real R5. |
| RESULTADOS-008–011 | GoalsPanel → ResultGoalCommandV2 → command_result_goal_v2; chart.configure, versión esperada y recibo correlacionado. | Historial inmutable en persistencia; UI muestra metas vigentes, no inventario histórico de metas. |
| RESULTADOS-013–014 | PDF jsPDF multipágina y CSV de points/legacy filtrados; CSV conserva observaciones/revisiones JSON y neutraliza fórmulas. | No es endpoint de exportación ni PDF de diseño; render/descarga R5. |
| RESULTADOS-015–019 | Retorno a ficha con guardas, dimensión única, advertencia no interpretación automática, rango Y finito min<max y porcentual 0–100, modal comparte filtros/series. | PDF textual no exporta el gráfico como imagen; no atribuirle esa capacidad. |
| BUSQUEDA-001–003 | MainLayout monta AuthorizedSearch con key actor/clínica; aba_authorized_search_v2, contrato cerrado y rutas de recurso. | No entrega rutas Storage; navegación reautoriza en destino. |
| DASHBOARD-001–010, 012–013 | DashboardPage keyed actor/clínica; snapshot correlacionado; conteos, sesiones expandibles, enlaces, logros explícitos y modal de actividad. | Sin simulación ni inferencia de mejoría clínica. |
| DASHBOARD-011 | Filtros calendario UTC y por estudiante; actividad por estudiante; DTO finishedAt y forward de cierre por evento finished. | PENDIENTE R4: código preparado requiere aplicar/verificar SQL, no basta compilar. |
| PROGRAMAS-039/041 | Diseñadores exportan diseño PDF/CSV desde borrador visible; ruta chart muestra resultados reales. | Exportar diseño no guarda/publica; no confundir con resultados. |

Archivos revisados: módulos results/contracts, results.server y program-results;
dashboard/contracts y dashboard.server; search/contracts, search.server y
AuthorizedSearch; DashboardPage, MainLayout; ruta chart; exportadores de diseño
CSV/PDF. El proveedor compartido no se duplica. Cambiar actor/clínica oculta
resultados anteriores mediante claves/contexto; no es prueba de aislamiento DB.

La matriz RESULTADOS conservaba referencias a ProgramChartPage/features/charts y
contratos «propuestos» aunque la ruta activa monta ProgramResults. Se corrigieron
13 filas con sus consumidores actuales; se preservaron anclas históricas 018/019.
No cambió el estado de filas ni el conteo por esta corrección documental.

## Evidencia y pendientes

Build Next 16.3.4 previo inmediato: exit 0, TypeScript y 23 páginas. No se modificó
runtime en este corte. Ejemplos copiables: A6_OPERACION_EJEMPLOS.md. Verificación
de contratos por fuente, no ejecución RPC ni suites funcionales.

Persistencia aplicada hasta 20260926152059 según último catálogo confirmado.
No catálogo nuevo mientras Docker está manualmente pausado. Aplicar/verificar los
dos forwards y completar revisión consolidada de autorización/ensamblaje antes
de gate R4. QA visual, métricas conciliadas, exportaciones y concurrencia: R5.

## Corte posterior — exportación de resultados y contexto vivo

Se confirmó que CSV/PDF usan los mismos points/legacy filtrados, separan V1/V2
y mantienen métricas derivadas de originales. PDF carga jsPDF asíncronamente:
antes podía guardar el snapshot tras cambiar de contexto o salir de la pantalla.
Ahora valida contexto antes y después del import y antes de doc.save: componente
montado, identidad verificada, actor/clínica/ficha/programa exactos y chart.view
en los datos vigentes. CSV comprueba el mismo contexto al iniciar; no tiene await.
Errores tardíos del PDF no repueblan otro contexto.

No se añaden consultas clínicas ni se afirma revocación viva en DB desde esta
guarda de navegador; la lectura autorizada del route continúa siendo el origen
de datos. Copias ya descargadas no se recuperan remotamente.

Lint runtime 153 fuentes sin errores/advertencias; build Next 16.3.4 y TypeScript
exit 0, 23 páginas. Sin QA ni SQL. Los PDF de diseño usan otro exportador:
auditar todavía su cancelación por cierre/cambio de contexto; este corte sólo
acredita la protección del reporte de resultados, no todos los exportadores.

## Corte posterior — exportadores de diseño conciliados

La revisión pendiente anterior queda resuelta por fuente para SkillProgramDesigner
y BehaviorProgramDesigner: ambos pasan un predicado obligatorio a
downloadProgramDesignPdf. Se comprueba antes/después de import y antes de save.
El predicado exige montaje, modal abierto, identidad verificada, actor/clínica y
programa/versión sin cambios. Un contador invalida la tarea al cerrar/cambiar
contexto incluso si se vuelve a abrir la misma versión. Se impide iniciar otra
exportación concurrente; errores tardíos no cambian el contexto nuevo.

CSV conserva su serialización completa y protección contra fórmulas; verifica
contexto al iniciar la operación síncrona. PDF sigue reflejando campos visibles:
no publica, guarda ni transforma el borrador. No se afirma revocación DB mediante
estas guardas ni borrado de archivos ya descargados.

Todos los callers del exportador PDF en src inspeccionados: estos dos diseñadores.
Grafo runtime 153 fuentes, lint cero errores/advertencias; build Next 16.3.4 y
TypeScript exit 0, 23 páginas. Sin QA, SQL ni datos nuevos. A6/R4 siguen abiertos
por dashboard y revisión de ensamblaje restante, no por este pendiente de fuente.

## Corte posterior — recuperación de metas tras ACK

La lectura posterior al recibo antes se descartaba y un fallo dejaba el mensaje
«consulta de nuevo» sin un control fuera del modal de conflicto. GoalsPanel ahora
ofrece Consultar metas vigentes, sin escritura pendiente/en curso. Tras ACK no
repite la operación: si falla leer, bloquea altas/ediciones nuevas hasta consulta
exitosa. El borrador de conflicto conserva nombre/valor/criterio y sólo actualiza
la identidad/versión persistida; una meta desaparecida no se recrea.

La consulta recuperada se conecta a ProgramResults: bandeja, gráfico normal,
ampliado y metas del PDF usan la misma proyección. Si las props de servidor se
renuevan, sustituyen la lectura local asociada a las props anteriores; no se
sincronizan mediante un efecto que pueda sobrescribir el borrador. El editor de
metas está aislado por actor/clínica/ficha/programa.

Lint runtime cero errores/advertencias; build Next 16.3.4 y TypeScript exit 0,
23 páginas. Sin cambios DB ni QA. R3/R4 y dashboard forward siguen pendientes.
