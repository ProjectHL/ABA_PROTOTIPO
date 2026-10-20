# Campana — controles QA003 focal V12

Desktop1/1PASS13,3s; móvil1/1PASS10,7s en serie. Candidato0Ehm1gKf372lHuuQ0KjeM. NOTIFICACIONES003/004 acreditan clicks de Marcar leída/no leída, recibos correlacionados y recarga. NOTIFICACIONES005 acredita Abrir recordatorio propio ya leído→Agenda /calendar, sin comando adicional.

Cada proyecto2ACK UI: readfalse,readtrue; versión16→18 escritorio y18→20 móvil. Estado boolean original true restaurado; readAt cambia legítimamente al marcar leída y NO se declara timestamp restaurado. Contenido/createdAt/otrasnotificacionesA/B exactos. Sólo aviso sintético existente, ningún fixture nuevo ni borrado. Sin defecto producto.

Límites:

- No revoked-resource notification navigation case or foreign UI bell click tested; B ordinary read isolation only. Existing Auth/RLS/revocation suites remain distinct.
- Positive /calendar navigation only; not all resourcePaths or notification kinds.
- Fixture was originallyread; original boolean true restored but original readAt timestamp not restored by normal markread. Safe explicitly readAtTimestampRestored=false. Unread-Abrir branch exists in test but did not execute; no coverage claimed.
- No new websocket/reconnect assertion: existing realtime-v5 independent; no QA003/004 whole approval or UX comparison.

Comprobantes y recibos por proyecto en JSON; no se modifica canon ni mapa.
