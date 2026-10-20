# R5 — conflicto real y respuesta perdida

2026-09-27. Checkout Desktop autorizado, cambios conservados. Progreso parcial,
no aceptación integral. Chat/R6 excluidos; sin nuevo SQL, grants, reset o borrado.

## Resultado ejecutado

- tests/e2e/r5.conflicts.spec.mjs desktop1/1 pasa, 35.6s. Dos páginas reales del
  mismo actor sintético leen la misma sesión. A guarda; B obsoleto recibe conflicto,
  conserva texto B y bloquea guardar. Consulta muestra A; aceptar revisión no
  escribe (la otra página sigue leyendo A). Sólo guardar explícitamente persiste B.
- Server Action update-notes ejecutada realmente mediante route.fetch; respuesta
  completada y luego abortada hacia navegador. Otra vista lee la nota persistida
  antes de reintentar. UI conserva operación incierta y bloquea otra escritura.
  Reintento repite exactamente command completo: IDs, clave, versión, fecha y texto.
  Recibo correlacionado libera bloqueo y recarga conserva resultado.
- Finalizar sin captura enviada se rechaza por guarda vigente. No se debilitó:
  volver y cancelar explícitamente confirma estado cancelled, no finished.
  Una sesión sintética adicional, reutilizada durante intentos parciales, sin
  registros inventados ni eliminación de historial.
- API75/75 + regresiones10/10: 85/85, 6.44s. Estado cancelled, notas exactas,
  eventos started/cancelled y cero registros. Lectura diagnóstica de metadata de
  private.command_receipts, limitada a clínica/actor/recurso UUID comprobados:
  server_version ordenadas 1..N coinciden con versión N de la sesión. Sin doble
  incremento/recibo por replay. No se expone ledger ni concede privilegios al app.
  Se repitieron aislamiento, cinco dimensiones y revisión anterior por API ordinaria.

## Ajustes de QA y precauciones

El botón retry aparece también mientras la petición está pendiente. El primer
test terminó antes de completar route.fetch: no prueba defecto de aplicación.
Se espera explícitamente fin de transporte, error de fetch sanitizado, y cleanup
espera callbacks. Ese diagnóstico inicial incluyó cookie de cuenta sintética;
se revocaron únicamente sesiones admin-a del lote comprobado, sin tocar cuentas
reales. Nueva ejecución reemplazó output de fallo; no copiar secretos a evidencia.
Revocar sesión no supone invalidación instantánea de todo JWT ya emitido.

El reporter line no conserva attachments body como archivo. Se reemplazó la
lectura fallida de un resumen ausente por conciliación directa de metadata del
ledger: no fabricar artifact ni ejecutar otra sesión sólo para generar reporte.
Una primera batería tuvo84 passes/1 fallo de recogida; no se cuenta como85/85.

Código funcional no cambió en este paquete: sigue build/tipos verificado del corte
R5_SESIONES_BORRADOR_Y_CORRECCION.md, catálogo99, huella318:
2031eafc23964252767c0e43d9ae08390408702d59951ab164dabba130bcaad0.
Screenshot sintética conflicto-reintento-cancelado.png en output conflicts ignorado.
No repetir UI tras cancelación: podría proponer otra sesión. API read-only usa
ABA_QA_LOCAL_READ/CAPTURE_READ/SESSION_READ/CONFLICT_READ=1 y valida recursos existentes.

## Continuación

QA-007/015 aportan conflicto de sesión y replay real; no todas las concurrencias,
capturas V1 o offline. Siguiente bloque resultados/dashboard/PDF/CSV y metas;
siguen familia/documentos/agenda/notificaciones/offline/revocación, restore aislado
y ARCHIVOS-013 (autorización exacta de preview antes de eliminación). Postman
preparado no ejecutado. QA-001–016 no se declaran aceptadas por este caso.
