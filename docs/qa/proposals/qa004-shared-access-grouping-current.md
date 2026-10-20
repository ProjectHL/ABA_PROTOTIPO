# QA004 — agrupación de accesos compartidos

2026-10-09T16:32:01.119Z. Sólo lectura; noAuth/UIcandidato/producto/canon. **Pérdida de distribución confirmada en código; reproducción UI candidata pendiente.**

Baseline dc1b0c4 SharedAccessPage líneas213–222 y425–506 agrupa porstudentId con Accordion separated, nombre alumno y cantidad profesionales; vista mock capturada desktop/mobile en ux-baseline-render/.../shared-tab-2.png. Actual SharedAccessPage filtra sent/accepted y dibuja una tabla global820 sin grupo/cantidad/collapse. Esto requiere comparación candidata específica, no aprobar ni descartar como cosmético.

## Corrección propuesta

Root puede restaurar Accordion en pestañaActivas, agrupando únicamente el DTO autorizado actual porclinicId+studentId y conservando IDs invitación. Control alumno+badge, panel filas existentes con scroll local y mismos handlers. Cantidad profesionales desde identidades vinculadas acceptedBy únicas; no inventar nombre/título profesional ni enriquecer con lecturas globales. Fecha disponible createdAt/updatedAt: conservar Actualizada, nunca llamarla aceptación. Tabbadge totalactive permanece. Sent/received/share/requests/familia intactos.

execute/commandFor, expectedVersion/recibo/idempotencia, guardsactor/clinic/pendientes y handlers de cada invitación permanecen sin cambio. No contratos/migraciones/dependencias nuevas. No agrupar por nombre, no revivir grant122886c6 yarevocado ni incluir históricos en activos.

## Reproducción y gate

Root debe abrirActivas con acceso sintético vigente mínimo; comparar PNGs1440x900/390x844 con baseline. Necesita2destinatarios deun mismo alumno y otroalumno para probar agrupación completa; si no existen, registrar eseescenario pendiente hasta fixturepropio mínimo. No usar datos reales. Abrir/cerrar acordeón sin escritura; conteo y IDs coinciden DTO. Verdetalle/cerrar, nivel/cancelar y revocar/dismiss mantienen DTO; móvil controles alcanzables y scroll sólo interior. Capturar cerrado/abierto/acciones.

Tras corrección: nivel/revocación sólo invitaciones nuevas propias con ACK/version/capabilities correlacionados; no afectar originales. V9grant previo quedórevocado (close-safe), no reutilizarlo como activo. Reusar controles de r5.cancel-avatar-v9, adaptando locators alpanel y buildvigente. No se creó suite especulativa ni ejecutóAuth. Protocolo detallado y hashes en JSON compañero. **QA004 sigue pendiente.**
