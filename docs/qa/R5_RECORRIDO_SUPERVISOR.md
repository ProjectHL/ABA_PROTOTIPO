# Recorrido 2 — supervisor

Planificado el 2026-10-05; NO EJECUTADO. Cuenta nueva supervisor propuesta, sesión independiente. Requisitos: G1 completado, invitación propia, ficha sintética asignada y [plan maestro](R5_ENSAYO_FINAL_PERFILES.md). Usuario puede operar esta cuenta; no necesita conservar privilegios admin en la sesión de supervisor.

## Preparar programas y sesión

| ID | Acción | Esperado y evidencia |
|---|---|---|
| S-01 | Recibir invitación local, activar cuenta y establecer acceso | Destinatario/UUID exactos, sesión y membresía supervisor confirmadas; repetición no duplica cuenta. |
| S-02 | Perfil profesional; login/logout y clínica activa | Datos persistidos y permisos actuales; enlaces/contexto correctos. |
| S-03 | Dashboard/búsqueda/ficha asignada y sus pestañas | Lecturas coherentes; comprobar positivas/negativas según capabilities actuales, no asumir permiso por nombre de rol. |
| S-04 | Consultar historial, documentos y consentimientos vigentes | Versiones exactas y descargas autorizadas; edición sólo cuando corresponda. |
| S-05 | Crear programa de habilidad, validar y guardar borrador | Diseño completo, dimensión/unidad/procedimiento/ayudas/criterios existentes; borrador durable, sin publicación implícita. |
| S-06 | Crear programa de conducta con su configuración | Contrato correspondiente y parámetros persistidos; no convertir entre diseños silenciosamente. |
| S-07 | Editar título/configuración; cancelar y descartar borrador explícito | Cancelación no persiste, guardado usa versión actual, avisos de pérdida comprensibles. |
| S-08 | Exportar diseño PDF/CSV del borrador visible | Fidelidad al borrador; exportar no guarda/publica; PDF renderizado e inspeccionado. |
| S-09 | Publicar versiones y probar conflicto concurrente | Versión inmutable exacta disponible para técnico; stale rechazado, draft retenido/revisión consciente. |
| S-10 | Pausar/reactivar/logro/archivo según acciones vigentes | Estados y filtros coherentes, sin alterar capturas históricas; probar sobre recursos de ensayo aptos. |
| S-11 | Revisar agenda/participantes y programa asignado | Horarios/zona/alcance correctos; entregar IDs/versiones al técnico. |

Salida G2: un conjunto de programas aptos para probar las cinco dimensiones; no forzar a un solo programa todas las dimensiones si el contrato exige diseños separados. Dejar el candidato y los datos listos para G3.

## Revisar el trabajo del técnico

| ID | Acción | Esperado y evidencia |
|---|---|---|
| S-12 | Abrir sesión/capturas enviadas y estados | Mismas observaciones, ayudas/tiempos/NR y versiones que el técnico; ninguna ausencia transformada en cero. |
| S-13 | Corregir registro mediante revisión autorizada y motivo | Nueva revisión/recibo, original conservado; técnico ve versión actual tras revalidar. |
| S-14 | Resultados: filtros por periodo/fase/profesional y dimensión | Métricas canónicas sin mezcla de unidades, notas/revisiones y escala correctas. |
| S-15 | Metas crear/editar/archivar; conflicto y replay | Historial y permisos chart.configure, versión actual y recibo único. |
| S-16 | Gráfico, ampliación, tabla y CSV/PDF | Mismos filtros y valores exactos; comparar contra observaciones esperadas antes de captura. |
| S-17 | Dashboard/logros y periodos calendario | Conciliación con sesiones terminadas y snapshot; no sumar borradores ni inferir logro por cancelar. |
| S-18 | Lectura histórica V1 | Compatibilidad de lectura y exportación, sin convertir ni sobrescribir registros originales. |
| S-19 | Solicitar acceso interno cuando sea elegible | Solicitud propia de alcance/motivo; decisión de clínica llega con vigencia real, o rechazo explícito. |
| S-20 | Notificación/Realtime, recarga y nuevo login tras reinicio | Evento real correlacionado y lectura persistida iguales; no confundir polling con Realtime. |

## Negativas y cierre

Intentar ficha no asignada/clínica B/administración sin capacidad por UI y API. Con asignación futura/suspendida/retirada comprobar denegación efectiva. Probar permiso revocado con modal abierto y comando pendiente sin perder draft. No aprobar prueba de solicitud interna si la cuenta ya tiene el permiso solicitado y no es elegible; preparar un recurso sintético apto conforme al contrato.

Escritorio y móvil con variantes vigentes de programas/resultados. Conciliar las cinco dimensiones con [técnico](R5_RECORRIDO_TECNICO.md) y casos X-05/07/12/15/16. Cierre: diseño→publicación→captura→revisión→exportación acreditados, originales preservados y cero bloqueos; todos los resultados comienzan NO EJECUTADO.
