# R5-PERCENTAGE-RESIZE-CANCEL-001

Estado: CERRADO FOCAL V10, 2026-10-09.

En una sesión sintética propia, guardar porcentaje con cinco ensayos I/A/E/NR/null, recargar, solicitar dos ensayos y rechazar la confirmación. Esperado: cinco ensayos conservados y campo cantidad=5. Obtenido: el campo muestra2 aunque el borrador confirmado conserva5 y las cinco tarjetas siguen presentes. No se acreditó pérdida de datos; el fallo es desincronización del campo de cantidad.

La corrección remonta únicamente el NumberInput cuando se rechaza la confirmación, para recuperar el valor derivado de measurement.trials.length. Sin cambios de contratos, migraciones, permisos ni datos originales. Tipado y lint focal PASS; build y repetición pendientes.

Reproducción privada preservada: .aba.local/qa/percentage-phase-v9-desktop-journal-repro-v9.json. La sesión propia se reutiliza con guardas de identidad, etapa, dos recibos y un único borrador baseline confirmado; no se inicia otra sesión para completar el recorrido escritorio. El intento móvil no escribió: se detuvo por la sesión propia activa de escritorio, y conserva diagnóstico histórico.


## 2026-10-09 — fases/porcentaje y corrección V10

Docker reanudado manualmente; web/Auth200. R5-PERCENTAGE-RESIZE-CANCEL-001 cerrado focal: cancelar cambio5→2 conservaba cinco ensayos pero NumberInput mostraba2; remonte sólo del campo cancelado restablece5. Tipado/lint/buildwebpackPASS. Candidato V10 oOsSbvhBdtZSHeN1230vG en loopback3001, V9 detenido/preservado.

Escritorio retomado1/1PASS39,9s sin repetir inicio/borrador confirmadosV9; móvil frescoV10 PASS. Cuatro fases baseline/treatment/generalization/maintenance persistidas; I/A/E/NR y quinto null dan25% (denominador4), ayuda gestural conservada. Borrador/reload/envío conserva IDs y recordedAt de los ensayos; capturedAt global se actualiza legítimamente al persistir. Cancelar reducción conserva DTO y restaura campo5; expansión a6 añade sólo null y reducción a5 conserva cinco observaciones. Cada recorrido: cuatro registros, diez ACK UI y archivoRPC; cancelar diálogo no escribe, sesión propia cancelada/archivada, todas las proyecciones ajenas idénticas. Escritorio mixto2ACK V9+8ACK V10; móvil10ACK V10. Diagnóstico de aserción capturedAt del arnés conservado, sin confundirlo con pérdida de timestamps.

Evidencia: tests/e2e/r5.percentage-phase-v9.spec.mjs y safes/journals V10 fechados. Sin nuevos contratos/migraciones/permisos. QA12/16 permanece; QA003/004/015/016 abiertos. Restore102 vigente para su snapshot/contratos; datos sintéticos añadidos después no se atribuyen a ese respaldo. Recorridos humanos siguen para el final.
