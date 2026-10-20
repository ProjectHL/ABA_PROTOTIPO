# Conservación de cola offline — V21

OFFLINE-016: conservación de cola acreditada en escritorio y móvil sobre V21. Conflicto real y operación reemplazante correlacionada; cancelar descarte conserva tres entradas, confirmar elimina sólo pending y conserva acknowledged/superseded y caché. Reconexión sin envío del comando descartado. Cinco recibos por sesión; ambas sesiones sintéticas canceladas y archivadas, snapshots previos y alumno original exactos. Escritorio recuperado en18,2s y móvil en17,6s; son continuaciones con journal y hash de origen, no dos corridas completas desde cero.

- Desktop inicial interrumpido por handler residual de diálogo del test; corregido y recuperada misma sesión.
- Mobile inicial: notificación interceptó clic Descargar ficha tras primer ACK. Reanudación con contexto nuevo pasó; superposición del aviso móvil pendiente de evaluación visual, no declarada corregida.
- Caché sin blobs adjuntos en este caso; selección de adjuntos tiene evidencia separada.
- QA003/004/014/015/016 siguen abiertos; QA11/16.
- PROGRAMAS037: ensayo V1 no encontró diseño histórico en alumno original; no aprobado. Registro de medición V1 existente no sustituye diseño V1.
