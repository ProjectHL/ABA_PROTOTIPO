# Gate R4 — aceptado técnicamente para R5

Último corte vigente: R5_SESIONES_BORRADOR_Y_CORRECCION.md; UI sesión1/1,
API74/74 y regresiones10/10, build/tipos exit0. Catálogo99 sin SQL nuevo.
Huella318: 2031eafc23964252767c0e43d9ae08390408702d59951ab164dabba130bcaad0.
QA/ARCHIVOS-013 pendientes de aceptación integral; cortes inferiores históricos.

Último corte vigente: R5_PROGRAMAS_Y_CINCO_DIMENSIONES.md. Programa publicado
y captura de cinco dimensiones finalizada por UI real; desktop2/2 y móvil2/2,
API73/73 y regresiones10/10; build/tipos actual exit0. Catálogo99 sin SQL nuevo.
Huella318: 934d313621cc4d9760a31d755049be11d6f10739d4c0b228b426256cbf77ed54.
QA/ARCHIVOS-013 siguen sin aceptación integral. Cortes inferiores históricos.

Último corte R5: catálogo99, API72/72 y UI4/4; build actual y typecheck exit0.
Huella318 archivos: 53d4cb25976e08ba95a2b798815e6e67fd408cb9bfb9910f65ae5bc0203173ec.
R5_UI_FICHA_Y_BUILD.md documenta el defecto de DTO corregido y cobertura parcial.
Los cortes/huellas inferiores son históricos, no aceptación local vigente.

Actualización posterior R5: QA real detectó y corrigió tres defectos de permisos
mediante 20260927160133. Catálogo actual 98, lectura API 71/71. Huella actual de
317 archivos: f9524f576897ab96ed5266567087d56564de45b80d5815fa03b4f004874c0886.
Typecheck actual exit0; el build de 316 archivos descrito abajo es histórico.
Ver R5_LECTURAS_PERMISOS_Y_POSTMAN.md. Aceptación técnica no garantiza ausencia
de defectos funcionales; QA-001–016 y ARCHIVOS-013 aún no están aceptados.

Actualización: 2026-09-27. Objetivo completo: R3 módulos dependientes y R4 ensamblaje.
Consolidación completada: R4_CONSOLIDACION_CIERRE_LOCAL.md. A4/A6/A7 y ensamblaje
aceptados técnicamente; ARCHIVOS-013 y QA-001–016 pendientes. No aprobación funcional.
La tabla inferior conserva los criterios contrastados; sus cierres de consolidación
quedan resueltos por ese informe, no constituyen nuevas tareas abiertas.
No se sustituye por pasar build ni por cerrar una lista de incidencias pequeñas.
Fuente de alcance: SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md y decisión de chat diferido.

## Estado vigente después de habilitar Docker

Dos forwards aplicados y catálogo verificado: 97 migraciones, ocho cuerpos SQL
idénticos a fuente, ACL/search_path/callers/policy revisados, advisors sin hallazgos.
Tipos regenerados y build/tipado/lint runtime verdes. Detalle completo:
R4_FORWARDS_APLICADOS_CATALOGO.md. Once warnings SQL históricos, no lint global limpio.
La dependencia de motor/migraciones quedó resuelta; gate técnico consolidado,
sin QA aprobada. Lista ejecutable única: docs/CHECKLIST_EJECUCION_INTEGRAL_ABA_LOCAL.md.
Chat y adjuntos quedan como upgrade; R6 es independiente del cierre local.
Los resultados de este corte documentado no acreditan salud actual ni QA funcional.

## Identificación reproducible del corte

- Checkout: C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO; no la copia OneDrive.
- HEAD: 39071f8542968f334ab6732a9a4a222d4ad0a1a1 más cambios locales preservados.
- Node: v22.23.2. Build Next 16.3.4 más reciente exit 0, TypeScript y 23 páginas.
- Huella SHA-256 de fuente tras recuperación de metas: `17f2b42da1cf90cce021cd6ffbe0622fce6036834827a6dedbd31c757a3a1b22`.
- 316 archivos: app, src, public, supabase/migrations (recursivos), package.json,
  package-lock.json, next.config.ts y tsconfig.json. Rutas relativas con `/`, orden
  lexical JS; por archivo se concatena ruta + LF + SHA-256 de bytes crudos + LF;
  el digest indicado es SHA-256 de esa concatenación. No incluye entorno, secretos,
  runtime portátil, archivos generados ni documentos. No es hash del esquema aplicado.
- Esta huella identifica una fuente, no un release aceptado, commit nuevo ni prueba
  de QA. Recalcular tras cambios; no atribuir el build de este corte a otra fuente.

## Requisitos de cierre y evidencia restante

Verificación runtime ampliada: 31 entradas (30 App Router y proxy), 153 fuentes
locales tras borrar imports de tipo mediante transpilación; cero imports locales
sin resolver y cero ChatPage/modules/chat/clinical/workspace/mock/dummy runtime.
Lint de este grafo TypeScript runtime: cero errores y cero advertencias tras
corregir UpgradePlanModal, LocalAvatarSelector, CalendarPage y cleanup de refs
(ver último corte de auditoría). No implica lint de todo el repositorio histórico,
scripts públicos/operativos ni QA. El código histórico encontrado
sólo desde imports de tipo no se convierte en consumidor runtime por ese motivo.

| Requisito | Evidencia actual | Cierre que falta |
|---|---|---|
| A4 acceso profesional, solicitudes internas, vínculos/publicación familiar, notificaciones y recordatorios | Contratos/UI/RPC conectados; handoffs de solicitudes, descarga, ejemplos y notificaciones; recuperación tras ACK corregida; boundary aplicado y verificado. | Consolidar trazabilidad de requisitos, permisos, consumidores y rutas. |
| A6 dashboard, búsqueda, métricas, metas, gráficos y PDF/CSV | R3_A6_REVISION_INTEGRACION y ejemplos; fuentes activas, medidas V2 y V1 separado; cierre inmutable aplicado y verificado. | Consolidar trazabilidad de métricas, metas, filtros, exportaciones y permisos. |
| A7 descarga explícita, captura durable, recuperación, dependencias, revocación y conflictos | R3_A7_REVISION_INTEGRACION, ejemplos y cortes de aislamiento/transacciones/reintentos. | Concluir conciliación global de requisitos y capacidades con persistencia vigente; QA sólo R5. |
| Una app, auth y autorización compartidas, sin mocks/chat activos | Grafo/rutas revisados en auditoría; shell compartido; build final. | Revalidar contra cualquier edición posterior; no inferir permisos DB desde UI. |
| Migraciones/tipos coherentes con código | Catálogo confirmado 97 aplicado; forwards verificados, tipos regenerados y controles registrados. | Revalidar sólo ante cambios posteriores; no repetir aplicación ya completada. |
| Matriz por acción y pendientes explícitos | 434 filas: 404 integradas, cero R4 por fila, 16 QA, 1 R5 y 13 upgrade. | La revisión requisito por requisito debe soportar estados; el conteo no acredita gate. |
| Ejemplos y manuales de entrega | A4_POSTMAN_EXAMPLES, A6_OPERACION_EJEMPLOS, A7_OPERACION_EJEMPLOS; guías/runbooks. | Verificar coherencia final con contratos/aplicación; colección y ejecución integral pertenecen a R5. |
| Versión local lista para QA | Huella de fuente y build registrados, sin commit/reset. | Gate R4 no aceptado; fijar corte definitivo cuando se resuelvan pendientes, no adelantar R5/R6. |

## Secuencia finita restante

1. Consolidar trazabilidad R3/R4 y registrar aceptación técnica, sin confundirla con QA.
2. Dentro de R5 preparar ARCHIVOS-013 y colección Postman 2.1 sin secretos; sin eliminación real automática.
3. Ejecutar QA-001–016, corregir y repetir casos afectados y regresiones relacionadas.
4. Entregar versión exacta, matriz validada, evidencia, manuales y limitaciones; obtener aceptación local.
5. Detener trabajo de cierre; no iniciar mejoras ni R6 automáticamente.

Las instrucciones anteriores para despausar Docker y aplicar forwards fueron sustituidas
por el catálogo verificado de 97 migraciones. El historial permanece en los informes
cronológicos R4_AUDITORIA_GLOBAL_2026-09-26.md y R4_FORWARDS_APLICADOS_CATALOGO.md.
No ejecutar de nuevo operaciones resueltas ni atribuir esos resultados a servicios actuales
sin comprobarlos. Las once advertencias SQL clasificadas sólo bloquean si existe evidencia
de defecto funcional o de seguridad.
