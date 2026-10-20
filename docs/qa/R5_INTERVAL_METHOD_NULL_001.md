# R5-INTERVAL-METHOD-NULL-001

Estado: CERRADO FOCAL V9, 2026-10-09.

2026-10-09. V8 BUILD_ID hBWDTZf8SyHXQcLh_yocw. Sesión sintética propia, sin tocar la sesión offline original.

Reproducción: crear un registro de Intervalos cuyo método inicial es Intervalo parcial. Abrir Método y pulsar la opción Intervalo parcial ya seleccionada. Mantine Select permite deseleccionar por defecto, entrega null y el handler lo asigna con un cast. El campo queda vacío. Guardar borrador falla por validación enum whole/partial/momentary, sin comando servidor ni recibo.

Esperado: pulsar el método vigente conserva un método válido. Obtenido: método null impide persistir. No se perdió ninguna captura confirmada: frecuencia y total tienen cinco recibos incluyendo inicio de sesión; parcial sólo estaba local sin guardar. Journal conserva IDs exactos, no se repite creación de sesión ni registros confirmados.

Corrección: Select Método allowDeselect=false y guard explícito ante null en onChange. Sin nuevos contratos, tipos públicos, migraciones o permisos. Prueba focal adicional pulsa dos veces cada uno de los tres métodos y comprueba valor, borrador, reload, envío e IDs. Tipado PASS; lint/build/repetición V9 pendientes al momento del registro.

Prueba: tests/e2e/r5.capture-details-v8.spec.mjs. Reproducción preservada: .aba.local/qa/capture-details-v8-desktop-before-method-fix-20261009.json. La reanudación sólo admite runId/etapa/5comandos/2registros exactos y compara las demás proyecciones con baseline.

Validación: tipado/lint/buildwebpackPASS. BUILD_ID FdAlCRUJasCmkUnD5NHVn. Escritorio retomado55,4s: parcial/momentáneo repetidos dos veces conservan método, borrador/reload/envío. Frecuencia/total precedentes V8 conservados, no se atribuyen V9. Móvil completo fresco1/1PASS1,4min: los tres métodos pulsados dos veces, seis registros, catorceACK UI más archivo RPC. Se conserva reproducción y diagnóstico de orden del arnés; conciliación porID corrigió sólo comparación, sin modificar DTO. Sesiones propias canceladas y archivadas; proyecciones originales idénticas.
