# Recorrido 3 — técnico / aplicador

Planificado el 2026-10-05; NO EJECUTADO. Cuenta nueva con rol therapist propuesta, sesión independiente. Depende de G1/G2, asignación activa y [plan maestro](R5_ENSAYO_FINAL_PERFILES.md). Nunca usar la sesión offline original como sesión terminal de este ensayo.

## Preparación y datos esperados

Antes de capturar, registrar una hoja con observaciones ficticias y resultados calculados: porcentaje con aciertos/errores/NR y ayudas; frecuencia con conteo y ventana; intervalos con duración/tipo/observaciones; duración con eventos y pausas; latencia con inicio/fin/unidad. Calcular según la semántica del contrato vigente y registrar denominadores. Ausencia, NR y cero son distintos. Esta hoja independiente permite detectar un gráfico coherente con un dato mal capturado.

| ID | Acción | Esperado y evidencia |
|---|---|---|
| T-01 | Activar invitación nueva y entrar | Destinatario/UUID exactos, cuenta única, rol therapist y sesión propios. |
| T-02 | Completar perfil; cancelar edición; salir y entrar | Persistencia de valores guardados, cancelación sin cambio; permisos actuales. |
| T-03 | Agenda/dashboard/ficha/programas autorizados | Sólo recursos asignados; versión publicada exacta y documentos legibles cuando corresponda. |
| T-04 | Iniciar sesión clínica propia de ensayo | Identificador/estado persistidos, participantes/programas correctos; doble envío no duplica sesión. |
| T-05 | Porcentaje: acierto/error/NR, ayudas, deshacer y borrador | Observaciones exactas, denominador/NR correctos y cambios sólo según controles existentes. |
| T-06 | Frecuencia: eventos y tiempos/ventana | Conteo/unidad recuperables y métricas conciliadas con hoja esperada. |
| T-07 | Intervalos: parámetros, observaciones y NR | Tipo/duración/denominadores exactos; no mezclar versiones ni convertir capturas. |
| T-08 | Duración: iniciar/parar/pausar/reanudar | Tiempo y eventos correctos, no contar pausa como observación; recarga recupera estado admitido. |
| T-09 | Latencia: inicio/respuesta/tiempo/NR | Unidad y tiempos exactos; ausencia no equivale a cero. |
| T-10 | Cerrar/reabrir captura y recargar borrador | Payload íntegro, dimensión original, dependencias/revisión sin pérdida. |
| T-11 | Descargar ficha y documento individual; desconectar y recargar | App y recurso offline disponibles, bytes/hash exactos; visible diferencia entre local y servidor. |
| T-12 | Capturar cinco dimensiones offline y recargar cola pendiente | Orden/dependencias/payload persistidos; no marcar sincronizado antes de recibo. |
| T-13 | Reconectar y sincronizar; respuesta perdida/replay | Un recibo y una mutación por comando; conservar identidad/payload, sin doble versión. |
| T-14 | Fallo de almacenamiento del ACK después del commit | Reabrir/reintentar comando exacto; servidor reconoce el mismo éxito, cola recuperable. |
| T-15 | Conflicto con edición online del supervisor | No sobrescribe; draft retenido, comparación y resolución con operación nueva trazable. |
| T-16 | Enviar registros y tratar borradores pendientes | Enviados confirmados por servidor; borradores no aparecen como resultados sometidos. |
| T-17 | Finalizar sesión por confirmación; cancelar confirmación previa | Cerrar diálogo no termina; pendientes bloquean cuando corresponde; finalización conserva capturas. |
| T-18 | Otra sesión mínima: cancelar/archivar según permisos | Cancelar no logra programas; archivo conserva historia; no borrar ni reutilizar sesión original. |
| T-19 | Abrir resultados permitidos y entregar a supervisor | Observaciones/estados/versiones iguales a hoja esperada; revisión posterior visible. |
| T-20 | PWA instalación/apertura y logout con cola pendiente | Standalone en plataforma real, guardas de salida y aislamiento; no borrar pendientes automáticamente. |
| T-21 | Login tras reinicio y consulta de capturas/recibos | Datos/versiones intactos, sin duplicados; recuperación documentada y permisos revalidados. |

## Negativas y retorno

Intentar administración/equipo/planes y edición/publicación de programas sin capacidad. Intentar ficha no asignada y clínica B por URL/API; comprobar rechazo. Retirar/suspender asignación mientras está abierta la ficha: no deben aceptarse nuevas escrituras indebidas. Cambiar de usuario y clínica con cache offline: no exposición ni pérdida de cola; comprobar X-08/09 y límites reales de descargas previas.

Ejecutar en escritorio y viewport móvil; registrar aparte dispositivo físico si disponible. Repetir los casos de cinco dimensiones por plataforma según matriz, no extrapolar un PASS de porcentaje a las otras cuatro. Pausas/ayudas/tiempos, borradores, envío/revisión, dependencias y compatibilidad V1 se concilian con supervisor.

Salida G3: IDs/versiones/observaciones/recibos y estados finales entregados a supervisor; sin payload perdido ni cambios ajenos. Todos los casos empiezan NO EJECUTADO; el ensayo no se cierra mientras existan casos obligatorios pendientes o bloqueantes.
