# R5 — resultados y exportaciones sintéticas (corte parcial)

2026-09-28. Checkout exclusivo `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`;
HEAD base `39071f8542968f334ab6732a9a4a222d4ad0a1a1` con cambios de trabajo
preexistentes conservados. Catálogo local vigente: 100 migraciones. No aceptación integral.

## Evidencia ejecutada

- `tests/e2e/r5.results.spec.mjs`: build de producción actualizado, desktop y
  móvil 2/2 (16,7 s). Inicio de sesión real, ficha → Programación → Gráfico,
  cinco dimensiones, seis registros V2 enviados (dos porcentajes, uno por las
  otras dimensiones), corrección de nota v3 visible y logout. La prueba compara
  cada CSV descargado con fecha, ID, valor/unidad, actor, versión, métricas,
  observaciones originales y revisiones de la lectura RPC autenticada. Los PDF
  incluyen sólo IDs de la dimensión filtrada; no mezclan registros de las otras.
- Cinco PDF A4 de una página renderizados a PNG e inspeccionados: cabecera,
  identificación sintética, métricas, notas, UUID, versión y motivo de revisión
  legibles, sin recortes/solapamientos observados. No se equipara extracción de
  texto ni presencia de `%PDF-` con revisión visual.
- Capturas desktop/móvil revisadas. En móvil los cuatro filtros estaban
  comprimidos hasta cortar etiquetas y valores; `SimpleGrid` responsive corrige
  esa interacción. Build Next 16.3.4 compiló, TypeScript terminó, 23 páginas
  estáticas y ruta dinámica del gráfico presentes; `tsc --noEmit` y
  `git diff --check` finalizaron con código 0.
- Tras el cambio, 2/2 repetidos sobre build actualizado. El servicio local
  habitual con Webpack pasó nuevamente desktop 1/1 (37,2 s). Sólo se eliminaron
  tres contenedores web temporales de QA, sin `-v`; nueve servicios Supabase y
  volúmenes permanecen. Sin reset, borrado clínico ni cambios de permisos.
- Ampliación del caso `r5.results.spec.mjs` sobre el servicio habitual:
  desktop/móvil 2/2. Periodo 7 días, fase sin registros (exportación bloqueada),
  retorno a tratamiento, profesional, eje inválido (ampliar bloqueado) y
  ampliación/cierre conservan los resultados. Los cinco CSV/PDF siguen
  conciliados por dimensión.
- `r5.goals.spec.mjs`: desktop/móvil 2/2. Meta porcentual creada v1, editada v2
  con comparator/valor distintos y archivada v3 mediante UI. Lectura Auth
  confirma fila e historial de dos revisiones con valores previos; admin de
  otra clínica obtiene cero filas por RLS. PDF de v1 y v2 descargados por UI:
  la meta vigente se actualiza en el reporte. PDF de v2 renderizado e
  inspeccionado visualmente. No quedan metas activas de esos casos. La ficha
  sintética creada desde UI tiene `test_run_id=null`; estas metas heredan null
  y nunca son candidatas a limpieza por lote: no se ha borrado historial.
- `r5.dashboard.spec.mjs`: desktop/móvil 2/2 tras ampliar el caso. La interfaz
  real concilia cuatro contadores, total/lista visible de sesiones finalizadas,
  logros de semana y mes UTC con `aba_dashboard_read_v2` leído por el mismo actor
  sintético; comprueba leyenda y número de series de estudiantes, cambio a periodo
  anual, filtro de actividad de siete días, ampliaciones y conservación del
  periodo, actualización explícita y logout. Recharts reduce etiquetas del eje
  automáticamente según ancho; el caso no interpreta eso como pérdida de datos.
  No se infiere mejora clínica desde actividad. Ampliación 2026-09-28:
  `r5.dashboard.spec.mjs` concilió además los **12 puntos mensuales** de la
  serie anual y cada valor exacto del tooltip de los estudiantes visibles con
  `aba_dashboard_read_v2`, incluyendo al menos un valor positivo, en
  escritorio/móvil **2/2**. No se extrapola esta prueba a otros reportes.
- La ruta de gráfico comprueba ahora `student.view` y `chart.view` antes de
  cargar el programa. Otra clínica recibe 404, sin vista ni CSV/PDF. Una
  repetición desktop/móvil sobre el web reiniciado ejecutó 8/8 casos UI
  habilitados (ficha/login y resultados positivo/negativo; 8 excluidos por
  gates), 1,7 min. El build posterior compiló y tipó la ruta; lint focal,
  `tsc --noEmit` y `git diff --check` terminaron en 0.
- Denegación de exportación ampliada: admin de clínica B, identidad externa y
  familiar sintéticas reciben 404 al abrir el gráfico de la ficha A, sin CSV,
  PDF ni título clínico. UI desktop/móvil 2/2, sin cambiar vínculos o grants.
- `r5.goal-conflicts.spec.mjs`: desktop/móvil 2/2. Dos vistas editan la misma
  meta; A confirma valor 30, B obsoleta recibe conflicto y conserva borrador 40.
  Consultar versión no escribe; guardar explícitamente confirma 40. Se ejecuta
  una Server Action de valor 60, se deja completar respuesta en el servidor y
  se pierde sólo el ACK del navegador; lectura independiente confirma 60 antes
  del reintento. El retry repite el comando entero (operación, clave, versión,
  recurso y payload) y no duplica versión/revisión. Archivado explícito deja
  cuatro revisiones trazables de ese caso y ninguna meta activa. No se publican
  encabezados/cookies ni se modifican cuentas reales.
- `r5.results.spec.mjs`, caso `QA-012: PDF y CSV de diseño reflejan borrador
  visible sin persistirlo`: desktop/móvil 2/2 (56,5 s). En el diseñador real se
  modifica la topografía sintética sin guardar; ambas descargas contienen el
  borrador, y al cerrar, recargar y reabrir permanece el valor persistido
  original. Los PDF A4 de dos páginas de ambos dispositivos se renderizaron
  (cuatro páginas) e inspeccionaron: texto legible, sin recortes ni solapamientos
  observados. Es exportación de diseño, distinta del reporte de resultados.

## Incidencia de entorno y decisión

El web `next dev` predeterminado (Turbopack, montaje Windows→Docker) devolvía
404 al pulsar Gráfico aunque la ruta existía en fuente y build. La ruta no
aparecía en el manifiesto dev. Tras reiniciar solo web, el 404 persistió.
El build de producción sirvió la misma ruta. `next dev --webpack` también la
sirvió y superó el E2E real; `deploy/local.compose.yml` fija `--webpack` para el
arranque local. El montaje tampoco propagó de inmediato una edición posterior
de `app/`; reiniciar únicamente web cargó la corrección de 404 para clínica
ajena. El runbook local documenta esta precaución. No se alteró Supabase ni se
atribuyó el 404 inicial a permisos: `chart.view` y el programa estaban presentes
en la lectura autenticada.

## Cobertura pendiente (no marcar QA-012 ni R5 completos)

El pendiente histórico «otros reportes» era impreciso: la spec integral y la
matriz sólo nombran PDF/CSV de diseño (`PROGRAMAS-039`), PDF/CSV de resultados
(`RESULTADOS-013/014`) y dashboard; todos tienen evidencia focal anterior.
**No abrir una familia de reportes nueva.** El fixture idempotente
`scripts/local/qa-v1-historical-fixture.sql` añadió un único agregado V1
sintético (sin alterar registros reales). La prueba nueva en
`tests/e2e/r5.results.spec.mjs` pasó en escritorio 1/1: lectura autorizada,
aislamiento de clínica B, vista y CSV/PDF diferenciados de V2. El intento
móvil no llegó a ejecutar el caso porque Docker Desktop se detuvo; tras
reactivar el motor, quedan repetición móvil, inspección visual de ese PDF,
regresión V2 y gate transversal de perfiles/permisos. No se marca QA-012
completo ni aceptación R5.
Postman real, restantes QA-001–016 y ARCHIVOS-013 siguen pendientes en sus
propias filas, no son «otros reportes». PDF/CSV de diseño y puntos/tooltip
anuales del dashboard ya se conciliaron; ello no cierra QA-012 global. El resultado
anterior de API75/75 y regresiones10/10 sigue como evidencia de otro corte, no
se reejecutó en este paquete porque no cambió auth/permisos/contratos.

La evidencia descargada y capturas están en `.aba.local/qa/playwright/` (ignorado,
sin credenciales); `results-final` conserva desktop/móvil del build actualizado.
No usar esta carpeta como respaldo de datos. Chat y R6 siguen diferidos.
