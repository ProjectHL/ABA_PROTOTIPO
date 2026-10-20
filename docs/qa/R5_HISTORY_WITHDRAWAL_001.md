# R5-HISTORY-WITHDRAWAL-001

Estado: CERRADO FOCAL V14; QA003 global abierto.


## 2026-10-10 — perfiles B y retiro clínico V14

Perfiles B V13/catalog102: supervisor crea/publica programa por UI; técnico inicia/guarda/reabre/envía/finaliza/archiva su sesión. Escritorio resume1/1PASS15,7s y móvil1/1PASS26,4s,14ACK correlacionados. Roles/asignaciones/ficha13/originales exactos. Dos programas/registros nuevos retenidos y sólo sus sesiones archivadas. Incidentes del arnés capturedAt/hasActiveSession/revision0 documentados sin duplicar escrituras. Evidencia docs/qa/R5_ROLE_ACTIONS_V13_20261010.{json,md}; regresión focal finalV14 pendiente.

Defecto R5-HISTORY-WITHDRAWAL-001 reproducido por control disabled/ausencia de transición, corregido y cerrado focal. Nuevo forward20261010152644 aplicado local103/103 tras dry-run exclusivo. Comando existente conserva forma y añade retire-reference confirmado sólo para referencias no farmacológicas activas, payload exacto; crea sucesor inactive, conserva predecesor/evidencia y usa permisos/versiones/recibos canónicos. No DELETE ni nuevos grants/RLS. UI muestra Retirada, conserva versiones, bloquea corrección activa de retirada, permite cancelar sin escribir y recuperar misma operación desconocida. V1 exige inicialización explícita; originales no modificados.

Candidato V14 -N6_dbDzA8P56-Y0qP5nR; typecheck/lintfocal/buildwebpackPASS y contrato3/3PASS. UI escritorio17,2s+móvil15,2s PASS, ocho recibos únicos y reintento escritorio con mismo recibo/sin doble versión; cuatro guardasSQL puras PASS, alteración de contenido y clínicaB rechazadas. Baselineclínico/programas exactos fuera de cuatro cadenas nuevas propias. Capturas responsive inspeccionadas; dc1b0c4 no tiene esta pestaña no farmacológica, por lo que no se inventa un par QA004 con Documentación Legal. Evidencia docs/qa/R5_HISTORY_WITHDRAWAL_V14_20261010.json.

QA-014 REABIERTO: restore102 se conserva como prueba histórica y no acredita función/constraints103. Pendiente respaldo+restore aislado103, sin recuperar sobre stack activo. Estado actual11/16; QA003/004/014/015/016 abiertos. Falta diseño conductual, medicación específica, estadosUI/controles restantes, familiasUX y regresión final. Recorridos humanos siguen al final.
