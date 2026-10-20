# R3 / A4 — notificaciones y entrega local de recordatorios

> Estado vigente 2026-09-27: R3/R4 aceptados técnicamente para R5 en R4_CONSOLIDACION_CIERRE_LOCAL.md. Forwards aplicados; catálogo local reconsultado: 97 migraciones, última 20260926221536. Los estados de aplicación pendiente/pausa/401+3 inferiores son cortes históricos, no tareas vigentes. QA funcional y aceptación local siguen pendientes; chat y R6 no condicionan el cierre local.

Fecha: 2026-09-26. Revisión estática de fuentes; sin QA funcional ni catálogo nuevo.
No acredita A4 completo. Familia/documentos y dashboard siguen con forwards pendientes.

## Requisito → contrato → persistencia → interfaz

| Acción | Evidencia vigente |
|---|---|
| NOTIFICACIONES-001 | MainLayout monta NotificationsBell por actor en el shell compartido, incluido portal familiar. Popover abre y relee estado. |
| NOTIFICACIONES-002 | loadNotifications valida Auth contra identidad, materializa vencidos y lee aba_notifications_read_v2; DTO correlaciona actor. SQL limita a user_id=auth.uid(), últimas 50 en adaptador (máximo RPC 100). |
| NOTIFICACIONES-003/004 | NotificationStateCommand conserva UUIDs, read boolean y expectedVersion; RPC verifica destinatario, replay exacto antes de versión, lock de fila y recibo correlacionado. No UPDATE directo para authenticated. |
| NOTIFICACIONES-005 | Abrir respeta guardas; si está no leída exige recibo antes de navegar a resourcePath. La ruta destino reautoriza, la campana no concede acceso clínico. |
| NOTIFICACIONES-006 | Canal postgres_changes filtra user_id; migración 20260920183134 añade user_notifications_v2 a supabase_realtime. Evento dispara relectura, no se trata como estado clínico definitivo. |
| NOTIFICACIONES-007 | Relectura al abrir, foco, online, visible y suscripción; secuencia invalida respuestas anteriores. Error Realtime ofrece recuperación persistida; limpieza retira canal/listeners/timer. |
| NOTIFICACIONES-008 | Lectura autenticada dispara aba_due_reminders_dispatch_v2. Forward aplicado 20260926151252 selecciona vencidos aún no recibidos por actor; lock calendario/filas y revalidación de participantes. Recibo PK reminder_id,user_id; sent sólo cuando todos los destinatarios vigentes tienen recibo. |

Fuentes completas del consumidor/contrato/adaptador: NotificationsBell.tsx,
notifications.server.ts y contracts.ts; composición MainLayout.tsx. Persistencia:
20260920183134_collaboration_notifications.sql,
20260921003020_collaboration_reminder_delivery.sql y
20260926151252_reminder_pending_recipient_selection.sql. Nombres de eventos
share accepted/rejected/level-changed/revoked corregidos por forward
20260926150023; el trigger convierte esos eventos a notificaciones persistidas.

## Reintentos y cambios de contexto

- Pendiente en memoria mantiene comando exacto y snapshot incluso si la lectura
  posterior ya no incluye la fila entre las últimas 50. Reintentar no crea claves.
- Un conflicto/rechazo exige consulta antes de un comando nuevo. ACK actualiza
  readAt/version desde recibo; un refresh fallido no revierte esa confirmación.
- Actor remonta la campana. Las notificaciones son inbox del destinatario entre
  clínicas, no una lista clínica filtrada por la clínica seleccionada. Cambiar
  clínica no otorga acceso al recurso; abrir vuelve a pasar por su ruta autorizada.
- Guardas de shell/navegación y beforeunload bloquean abandono de cambios de lectura
  pendientes. No confundir retención en memoria con recuperación durable offline.

## Límites de seguridad y operación

RLS SELECT de user_notifications_v2 exige destinatario Auth; DML directo retirado.
RPC definer tienen search_path vacío y EXECUTE público/anon retirado; lectura y
estado concedidos sólo a authenticated y con chequeo de actor/destinatario. Recibos
de recordatorio están en private, RLS habilitada y sin grants API. No se usan
user_metadata ni rutas recibidas del cliente como autorización de esos comandos.
Estas afirmaciones son de fuente SQL, no catálogo actual verificado.

La entrega es local, dentro de la aplicación. Mientras esté visible/conectada,
la campana consulta cada 60 segundos y al recuperar foco/conexión. No existe en
este flujo cron de correo, push del sistema operativo ni entrega garantizada con
aplicación cerrada. Materializar vencidos es escritura; no ejecutar RPC durante R4.
Ejemplos: A4_POSTMAN_EXAMPLES.md.

## Evidencia y pendientes

No se cambió runtime ni SQL en este corte. Ocho filas de matriz actualizadas con
fuentes activas, conservando estados y conteo. Docker reconsultado: manualmente
pausado. No se despausó ni se aplicaron migraciones.

R5: suscripción real, recuperación tras caída, replay/colisión y conflictos,
destinatarios entre clínicas, revocación/cancelación concurrentes, entrega parcial
y ausencia de duplicados. No marcar QA por fuente ni aceptar todo A4 por este subpaquete.

## Corte posterior — consulta y mutación excluyentes

La consulta explícita podía empezar antes de un cambio de lectura y terminar
después de su conflicto, borrando reviewRows con una respuesta anterior. Ahora
consultLock se toma sincrónicamente antes de await: bloquea nuevas mutaciones
hasta terminar. Consultar rechaza pendientes/resultados desconocidos y escrituras
en curso; sólo una respuesta vigente exitosa permite limpiar la revisión. La
recuperación periódica no limpia reviewRows y los retries conservan sus claves.

Botones reflejan la exclusión; validación por ref evita depender de un render
posterior. No se altera el contrato, el recibo confirmado ni la persistencia.
Grafo runtime 153 fuentes: lint cero errores/advertencias; Next 16.3.4 build y
TypeScript exit 0 con 23 páginas. Sin QA, RPC funcionales, SQL ni datos nuevos.
