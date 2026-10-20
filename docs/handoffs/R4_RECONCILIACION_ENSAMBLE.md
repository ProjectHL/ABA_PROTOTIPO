# R4 — reconciliación de ensamblaje

> Estado vigente 2026-09-27: R3/R4 aceptados técnicamente para R5 en R4_CONSOLIDACION_CIERRE_LOCAL.md. Forwards aplicados; catálogo local reconsultado: 97 migraciones, última 20260926221536. Los estados de aplicación pendiente/pausa/401+3 inferiores son cortes históricos, no tareas vigentes. QA funcional y aceptación local siguen pendientes; chat y R6 no condicionan el cierre local.

Fecha: 2026-09-21. Estado: en curso; revisión estática, sin QA funcional.

## Alcance conciliado en este corte

Las filas históricas seguían describiendo pantallas “propuestas” o conexiones pendientes aunque los verticales ya habían sido ensamblados. Este corte reconcilia la matriz contra el código actual y los handoffs técnicos previos:

- Shell: rutas reales de dashboard, fichas y accesos; avatar privado, presets, selección local y retiro/sustitución.
- Programación/resultados: apertura del gráfico real, filtros, series, tabla, notas, correcciones, CSV/PDF, unidades y escala validada.
- Captura: porcentaje, frecuencia, intervalos, duración y latencia conectados a `MeasurementV2`, `SessionPage` y comandos/recibos de servidor. Los componentes legacy no conectados no constituyen la evidencia; la evidencia vigente es `DataCollectionEngine` y sus capturadores V2.
- Colaboración: compartir por ficha, invitaciones enviadas/recibidas, niveles, reenvío, cancelación, aceptación/rechazo del destinatario, revocación y guardas. Las solicitudes iniciadas por un tercero que luego requieren “aprobar/denegar por propietario” son un flujo diferente, ahora integrado con solicitudes internas V2 (`COMPARTIR-030` y `COMPARTIR-031`; corte 2026-09-26).
- Familia y notificaciones: vínculos, invitación, publicación versionada, proyección mínima, agenda, revocación, campana, lectura, navegación autorizada, recuperación Realtime y recordatorios durables. Descarga familiar sensible autorizada e implementada con revalidación por petición: `R4_DESCARGA_FAMILIAR_SEGURA.md`; QA R5 pendiente. Chat está diferido por decisión separada.
- Estados globales: carga, vacíos de cada lectura, error recuperable, reintento, 404, acceso no disponible, retorno y cierre de alerta sin mutación.
- Operación local: start/status/stop conservadores, fixtures por lote, cambio local de perfil, secretos ignorados, URL navegador/contenedor, Node 22, Compose aislado, Mailpit, cleanup explícito y backup/restore con destino validado.
- Equipo: creación/cambio/suspensión de asignaciones por ficha mediante límite servidor vigente.

## Exclusiones y pendientes reales

- `COMPARTIR-030` y `COMPARTIR-031`: integradas técnicamente con contrato/persistencia/UI V2 y decisión del propietario. Evidencia en docs/handoffs/R4_SOLICITUDES_ACCESO_V2.md; QA R5 pendiente.
- `ARCHIVOS-013`: permanece `PENDIENTE R5`; corresponde a limpieza física explícita por lote, no a descarga familiar. Véase `docs/runbooks/ATTACHMENT_PHYSICAL_CLEANUP.md`.
- `QA-*`: permanece en R5. `QA-008` excluye chat del release actual.
- `CHAT-*` y `FAMILIA-009`: `DIFERIDO UPGRADE`, no pendientes ni integrados.

## Evidencia de ensamblaje

- Un solo `IdentityProvider`/`OfflineProvider` y `MainLayout`/`IdentityShell` compartidos.
- Rutas App Router compiladas en una aplicación; `/chat` queda deliberadamente no operativa.
- Los slots activos de búsqueda, notificaciones y offline se montan desde `MainLayout`; se retiraron fallbacks que aún anunciaban adaptadores A4/A6 pendientes.
- Los componentes mock/provisionales históricos no están importados por rutas App Router activas. Se conservan sin borrado destructivo mientras no formen parte del grafo del release.
- Manuales conciliados: `scripts/local/README.md` (entorno), `OPERACION_POC.md` (operador) y `docs/GUIA_USUARIO_LOCAL.md` (usuario).
- Typecheck, ESLint focal, `git diff --check` focal y build Next.js 16.3.4 verdes después del ajuste final de shell/captura. El build compiló TypeScript y generó 23 páginas/rutas; `/chat` está en el grafo de rutas pero su página ejecuta `notFound()` y no expone la interfaz dormida.
- No se ejecutan suites funcionales durante R4.

## Corte 2026-09-26 — solicitudes V2

Migración V2 de solicitudes aplicada al stack local, grants legacy revocados,
tipos regenerados, build/tipado/lint focal y advisor de seguridad verificados.
Evidencia y revisión final pendiente en `docs/handoffs/R4_SOLICITUDES_ACCESO_V2.md`.
Corte final del paquete: COMPARTIR-030/031 integradas técnicamente con elegibilidad, locks de participantes, validadores defensivos y detalle/historial. QA no aprobada.

Auditoría global en curso: `docs/handoffs/R4_AUDITORIA_GLOBAL_2026-09-26.md`.
Corrige consulta familiar de programas/resultados, aislamiento de snapshots,
guardas de navegación del shell y replay offline. No declara cierre total R3/R4.

## Estado vigente de aceptación — 2026-09-26

Gate explícito y huella del corte en `R4_GATE_ESTADO_ACTUAL.md`. El dashboard
preparado y portal/agenda/descarga familiares requieren dos forwards aún no
aplicados por Docker manualmente pausado. Matriz: 401 INTEGRADO + 3 PENDIENTE R4
+ 16 QA + 1 R5 + 13 upgrade = 434. Recuperación offline y tras ACK en consumidores
familiares/colaboración corregidas; lint/build/tipado verdes, no QA funcional.
Los apartados anteriores registran ensamblaje técnico, no aceptación vigente del
límite SQL familiar ni gate completo. Chat sigue excluido.
