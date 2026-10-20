# Fases y porcentaje — pendiente de ejecución


## QA003 — fases/porcentaje preparado; ejecución bloqueada por Docker pausado

2026-10-09: tests/e2e/r5.percentage-phase-v9.spec.mjs y playwright.percentage-phase-v9.config.ts preparados para ejecutar en serie escritorio/móvil sobre V9. Alcance: cuatro fases, I/A/E/NR/null, porcentaje25% excluyendo ensayo sin registrar, borrador/reload/envío con IDs/timestamps, resize cancelado y expansión/reducción preservando observaciones; cancelación/archivo sólo de sesión sintética propia y proyecciones originales iguales. Lint focal PASS. Sin cambio de producto.

Intento de ejecución detenido al consultar Docker: daemon informa pausa manual. Ambos casos fallaron en preflight antes de autenticar, crear journal o iniciar sesión; no son defectos funcionales ni prueba aprobada. Docker no fue reanudado ni Windows configurado. Requiere reanudación manual de Docker para continuar la ejecución. QA permanece12/16, QA003/004/015/016 abiertos. Restore102 aprobado conserva vigencia de su snapshot; disponibilidad actual del ambiente está suspendida por pausa manual.


## 2026-10-09 — fases/porcentaje y corrección V10

Docker reanudado manualmente; web/Auth200. R5-PERCENTAGE-RESIZE-CANCEL-001 cerrado focal: cancelar cambio5→2 conservaba cinco ensayos pero NumberInput mostraba2; remonte sólo del campo cancelado restablece5. Tipado/lint/buildwebpackPASS. Candidato V10 oOsSbvhBdtZSHeN1230vG en loopback3001, V9 detenido/preservado.

Escritorio retomado1/1PASS39,9s sin repetir inicio/borrador confirmadosV9; móvil frescoV10 PASS. Cuatro fases baseline/treatment/generalization/maintenance persistidas; I/A/E/NR y quinto null dan25% (denominador4), ayuda gestural conservada. Borrador/reload/envío conserva IDs y recordedAt de los ensayos; capturedAt global se actualiza legítimamente al persistir. Cancelar reducción conserva DTO y restaura campo5; expansión a6 añade sólo null y reducción a5 conserva cinco observaciones. Cada recorrido: cuatro registros, diez ACK UI y archivoRPC; cancelar diálogo no escribe, sesión propia cancelada/archivada, todas las proyecciones ajenas idénticas. Escritorio mixto2ACK V9+8ACK V10; móvil10ACK V10. Diagnóstico de aserción capturedAt del arnés conservado, sin confundirlo con pérdida de timestamps.

Evidencia: tests/e2e/r5.percentage-phase-v9.spec.mjs y safes/journals V10 fechados. Sin nuevos contratos/migraciones/permisos. QA12/16 permanece; QA003/004/015/016 abiertos. Restore102 vigente para su snapshot/contratos; datos sintéticos añadidos después no se atribuyen a ese respaldo. Recorridos humanos siguen para el final.
