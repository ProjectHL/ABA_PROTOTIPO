# R5 — agenda positiva por interfaz y aislamiento (QA-010 parcial)

Fecha: 2026-09-29. Checkout único:
`C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`. Chat y R6 fuera.

Se añadió `tests/e2e/r5.calendar.spec.mjs` al config Playwright R5 existente,
sin dependencia ni framework nuevo. Sólo corre con `ABA_QA_CALENDAR_UI=1`,
comprueba checkout/API local y usa las cuentas sintéticas `admin-a`/`admin-b`
del lote ready `2155e99e-bda4-4c68-95cf-b74cacd84ecd`. No crea cuentas,
clínicas ni fichas. Reutiliza la ficha sintética estable. La cita tiene título
exacto `QA R5 CITA LOCAL 2155E99E`; si ya existe no se vuelve a crear.

Flujo real: login admin A → `/calendar` → listado → formulario de nueva cita
con estudiante, profesional, hora local America/Santiago y recordatorio →
Server Action `saveAppointmentV2` → recibo visible → recarga y lectura
persistida → logout → login admin B → misma ruta sin cita cruzada → logout.
Ningún endpoint directo sustituyó la operación de interfaz.

Resultado inicial 2026-09-28: escritorio **1/1** (25,3 s), móvil **1/1**
(13,4 s), ambos exit0. Consulta agregada independiente en DB activa: una sola fila
`appointments_v2` para el título exacto, clínica A
`3e8aa653-8cce-46d0-aa4d-2316d1e5d1b1`, `scheduled`, versión 1;
una fila participante y una de recordatorio. Después se vinculó a una sesión
`completed` de la misma ficha sintética: versión 2 y vínculo persistente tras
recarga. No se borró ningún objeto.

Ampliación QA-010 del mismo paquete:

- Segunda cita sintética `QA R5 CITA MUTACIONES 2155E99E`: crear, editar
  nota, reprogramar al 2026-10-07 10:00 y cancelar con motivo explícito.
  El caso pasó por UI desktop y relectura tras recarga; DB confirma estado
  `cancelled`, versión 4, cuatro eventos y el motivo exacto. Cancelar una
  cita de QA no implica borrado físico ni afecta citas reales.
- Serie sintética `QA R5 SERIE SEMANAL 2155E99E`: creación por UI desktop,
  tres ocurrencias visibles tras recarga. DB confirma 3 filas, un mismo
  `series_id` y 10:00 hora America/Santiago los lunes 12, 19 y 26 de octubre.
  Dos intentos previos agotaron el timeout por selectores Playwright sobre
  el overlay/entrada readonly de Mantine; no enviaron comando ni crearon
  filas. Se corrigió sólo la interacción del test y pasó al repetir.
- Edición de toda esa serie y excepción de la ocurrencia del 19 de octubre
  por UI: tras recarga, las tres ocurrencias conservan un `series_id`; las
  del 12 y 26 llevan la nota de serie revisada, mientras la del 19 conserva
  su nota excepcional. DB: las tres en versión 2 y sólo la del 19 marcada
  `is_exception=true`.
- La UI rechazó la hora inexistente `2026-09-06T00:30` y exigió elegir una
  ocurrencia para la hora repetida `2026-04-04T23:30`. Elegida la primera,
  se creó una sola cita sintética, persistida a `2026-04-05 02:30:00+00`
  y sin recordatorios. No se intentó la segunda ocurrencia por UI.
- `tests/local/calendar-time.test.mjs`: 3/3. Hora normal, rechazo de hora
  inexistente del 2026-09-06 y resolución explícita de hora repetida del
  2026-04-04 (primera/última); contrastadas con conversión PostgreSQL local.
- Regresión focal completa 2026-09-29: `r5.calendar.spec.mjs` **7 passed,
  5 skipped** en 50,6 s, exit0. Los cinco omitidos son mutaciones únicas en
  móvil para no duplicar cambios; la lectura/aislamiento móvil sí pasó.

## Gestión comercial interna — 2026-09-29

`tests/e2e/r5.commercial.spec.mjs`, mismo Playwright/checkout, usa sólo
`admin-a`, `admin-b` y `supervisor-a` sintéticos. Los importes del catálogo son
de demostración; ninguna prueba llama a una pasarela de pago ni crea un
documento tributario.

- Clínica A: catálogo Base/Equipo y aviso de demostración visibles; por UI se
  seleccionó «Clínica Equipo» y se ajustaron plazas de 5 a 6. Tras recarga,
  3 ocupadas de 6. DB: suscripción `active`, versión 2, dos eventos,
  `demonstration=true`. Supervisor A no ve comandos ni catálogo comercial.
- Documento `QA R5 RESUMEN INTERNO 2155E99E`: creación con línea sintética,
  sustitución de versión y archivado lógico por UI. Relectura tras recarga;
  DB: una fila versión 3, tres eventos, `archived=true`, `demonstration=true`,
  `tax_document=false` y `payment_requested=false`. Sin adjuntos ni borrado.
- Clínica B, reservada a cancelación de prueba: se seleccionó «Clínica Equipo»
  y canceló la suscripción interna por UI. DB: `cancelled`, versión 2, dos
  eventos, 4 membresías activas conservadas. La clínica A sigue activa.
  El primer intento de la prueba sólo seleccionó el plan: la lectura del botón
  de cancelar ocurrió durante el refresco y la expectativa posterior falló.
  Se esperó explícitamente el botón, se repitió y pasó; no hubo doble alta.
- Regresión focal comercial completa repetida: **4 passed, 2 skipped** en 46,1 s,
  exit0, escritorio y móvil. Las dos omisiones móviles son mutaciones únicas
  de documento/cancelación; plan, plazas y restricción profesional sí pasan
  en móvil.

## Soporte — 2026-09-29

`tests/e2e/r5.support.spec.mjs` ejecutó en interfaz real: supervisor A creó
`QA R5 TICKET LOCAL 2155E99E`; admin A respondió, cambió el estado a «En
curso» con motivo y releyó tras recarga; admin B no vio el ticket de A. DB
local: un ticket `in-progress`, versión 3, dos mensajes y tres eventos.
Regresión conjunta escritorio/móvil **2 passed** en 47,3 s, exit0. La
primera corrida móvil conjunta agotó tiempo porque el test no abría el menú
lateral antes de seleccionar la clínica activa; un caso móvil focal y la
repetición conjunta pasaron tras corregir esa interacción. No hubo cambio
de permisos ni de RPC por ese fallo del test.

## Agenda familiar — 2026-09-29

`tests/e2e/r5.family-calendar.spec.mjs` usa `admin-a` y `familia` del lote
sintético. Cada proyecto crea una persona familiar distinta; el admin invita,
la identidad familiar acepta, y el admin asigna a esa persona como participante
explícita de una cita. El portal no muestra la cita antes de su creación;
durante el vínculo activo la muestra incluso tras recarga; al revocar el
vínculo, la misma cita desaparece tras actualizar el portal. Repetición
escritorio+móvil: **2 passed** en 60,0 s, exit0. DB: exactamente dos citas
`scheduled`, versión 1, con un participante familiar y un recordatorio vigente
cada una; cero vínculos activos al final. Las citas no fueron borradas.

La primera corrida móvil no alcanzó a guardar una persona: el botón del modal
quedaba interceptado al usar coordenadas de layout. Un toque en coordenadas
del viewport visual completó el mismo flujo de interfaz; no se alteró el
backend. Una precondición inicial basada en la tabla UI, antes de terminar la
carga, produjo en la repetición dos personas sintéticas adicionales sin vínculo
(una por proyecto). Se conservan: no son datos reales ni se borraron. La
precondición ahora lee `aba_student_detail_v2` con el admin del lote; la
regresión posterior mantuvo cuatro personas, dos citas y cero vínculos activos,
sin nuevas altas duplicadas. Esta prueba no acredita despacho de recordatorios.

## Recordatorios profesionales — 2026-09-29

`tests/e2e/r5.reminders.spec.mjs` creó por UI una cita exclusivamente
sintética `QA R5 RECORDATORIO DOBLE 2155E99E`, con admin A y técnico A como
participantes y un recordatorio de 180 minutos cuyo vencimiento ya había
ocurrido. Abrir la campana materializó una notificación por destinatario;
consultar de nuevo y repetir toda la prueba no duplicó ninguna. El admin
marcó la notificación como leída mediante la UI; su versión persistente pasó
a 2. Admin B no vio el recordatorio. La agenda releyó `sent` tras recarga.

DB activa: una cita `scheduled` versión 1, un recordatorio `sent` vencido,
dos participantes, dos recibos durables en
`private.appointment_reminder_deliveries_v2` y dos notificaciones, ambas con
ruta `/calendar`; después de la repetición siguieron siendo 1/2/2. La campana
móvil recuperó los avisos de admin A y técnico A, sin aviso cruzado para admin
B. No se alteraron citas reales.

La misma suite incorporó `QA R5 RECORDATORIO FAMILIAR 2155E99E` sobre la
persona familiar sintética ya identificada por el `personId` de su cita de
agenda. Se renovó/aceptó su vínculo desde UI, se creó una cita distinta con
admin A y esa persona como participantes, y cada campana materializó un solo
aviso. DB: un recordatorio vencido `sent`, dos recibos y dos notificaciones:
admin A → `/calendar`, familia → `/family`. Tras revocar, el portal dejó de
mostrar la cita, mientras la campana móvil conservó la notificación histórica
sin restituir acceso. Admin B no vio el aviso. La primera selección intentó
un atributo DOM inexistente y no envió la cita; se corrigió para seleccionar
el valor exacto de Mantine por UUID, sin cambiar permisos ni RPC.

Se añadió `QA R5 RECORDATORIO REVOCADO 2155E99E` con el mismo familiar
registrado como participante, pero con el vínculo revocado verificado por
lectura autorizada **antes** de crear la cita. Al vencer, sólo el admin A
recibió aviso; la familia no vio aviso ni cita en portal, incluso tras
consultar la campana móvil. DB: dos participantes, un recibo y una
notificación profesional, estado `sent`; ningún vínculo familiar activo.
Esto valida la exclusión del destinatario revocado, sin afirmar que se
elimine una notificación ya entregada antes de la revocación.

Regresión focal conjunta escritorio+móvil **5 passed, 5 skipped** en 1,4 min,
exit0. Las omisiones son deliberadas por proyecto: mutaciones únicas en
escritorio y relecturas en móvil. Tras repetirla, los tres recordatorios
mantuvieron conteos de recibos/notificaciones 2/2, 2/2 y 1/1,
respectivamente; el vínculo familiar quedó sin acceso activo.

Pendiente de QA-010 integral: escenarios adicionales de horario/participantes
y el gate global R5. La excepción
de serie y los dos casos DST descritos tienen evidencia UI focal, no cobertura
exhaustiva de todos los horarios. QA-013 tiene
evidencia parcial de aislamiento UI, no aceptación transversal de permisos.
Mantener `QA-010/013` pendientes en la matriz hasta ejecutar los restantes
casos y regresiones.
