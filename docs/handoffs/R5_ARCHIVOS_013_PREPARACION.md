# R5 — ARCHIVOS-013 preparado, validación final pendiente

Fecha: 2026-09-27. Checkout Desktop; cambios existentes conservados.

Implementación: scripts/local/attachment-cleanup.mjs y wrapper PowerShell.
No migración, DML clínico, reset, nuevo endpoint público ni ampliación de permisos.
Storage usa API administrativa sólo local; Auth identifica al admin y PostgreSQL
revalida membresía, clínica, lote y referencias bajo locks. Preview/hash/retención,
respaldo completo de metadatos y bytes, intención durable, recibos, recuperación
parcial y reconciliación implementados; runbook actualizado.

## Evidencia ejecutada en R5

- Node 22.23.2 --check y --help: exit 0.
- ESLint de utilidad y pruebas: exit 0, sin errores ni advertencias.
- Parser PowerShell del wrapper: sin errores.
- Vitest 4.1.11, tests/local/attachment-cleanup.test.mjs: 28/28 pruebas pasan.
  Cubren estado, referencias, retención, ámbito, integridad, rutas, confirmación,
  preview adulterado y restricción SQL. No prueban Storage ni borrado real.
- tests/local/attachment-cleanup-preview.mjs: exit 0 contra stack real usando
  admin-a del lote sintético existente; Auth temporal revocada al terminar.
- Preview ed67bd6d-9a89-42c8-a7c2-c5dd8bde0734: 0 candidatos, 0 excluidos.
  SQL/session/locks/Auth/preview funcionan; clínica B rechazada para admin-a.
  Artefacto privado ignorado por Git, no contenido clínico en evidencia.

Reprueba tras reforzar el catálogo FK (tabla/columnas origen Y destino exactos,
no sólo nombres de tablas): preview 6253764a-6131-49ad-83cd-0b08a567d21b,
0 candidatos/0 excluidos, rechazo entre clínicas confirmado y ningún borrado.
También se exige autorización viva para un apply vacío o previamente completado.

La primera ejecución de Vitest fue impedida por sandbox al crear caché .vite-temp;
ejecución autorizada en Desktop pasó. Sin relajación de comprobaciones de entorno.
Ningún objeto fue eliminado, no se ejecutaron apply ni backup sobre datos reales.

## Revisión adicional 2026-09-28

El preview de sólo lectura `351d8568-af96-4b42-819b-7294e0dd7af9`
usó retención **QA** explícita de un día sobre la clínica A y el lote sintético:
0 candidatos, 0 excluidos, rechazo de clínica B confirmado, cero borrados.
No es una política de retención adoptada para datos reales. La consulta de
metadatos mostró que los adjuntos creados por las pruebas UI `qa-r5-%` están
archivados, pero sus registros tienen `test_run_id=null`, porque la ficha UI
de origen también carece de esa etiqueta. ARCHIVOS-013 los excluye del
inventario del lote por diseño; no se etiquetaron retroactivamente ni se
falsearon fechas de archivo. Para validar backup/apply/retry hará falta un
fixture de limpieza sintético nuevo, etiquetado al crearse y con retención
simulada de forma explícita, seguido de autorización específica del preview.

Fixture dedicado preparado después, sin tocar registros anteriores:
`tests/local/attachment-cleanup-fixture.mjs` creó dos objetos PNG de un píxel,
con `test_run_id` del lote desde el inicio y antigüedad simulada sólo para
probar retención QA de un día. La previsualización exacta
`796f24cb-235e-4dc8-a3d8-bb6370b0047e` (hash
`e470ec1131caa97fd160dbe7bf2e75b1a161de8d1648e5a9aa10e070f46b130c`)
contiene **dos candidatos**, cero excluidos y cero referencias vigentes.
`tests/local/attachment-cleanup-backup.mjs` ejecutó backup de ambos: dump
privado de 1 657 212 bytes, bytes 68/68 y SHA-256 verificados contra el
preview; no se ejecutó apply ni se borró Storage. Versiones candidatas:
`48c57520-b2e1-4528-a124-b1b3e1b99ad4` y
`5144a232-a564-4dda-af56-9bb0548e0e76`. El JSON exacto y el backup están
en `.aba.local/attachment-cleanup/796f24cb-235e-4dc8-a3d8-bb6370b0047e/`,
ignorados por Git. Retención QA simulada no establece política real.
Se solicitó autorización específica del usuario para aplicar ese preview;
sin esa respuesta no se elimina ningún objeto.

## Lo que no está acreditado todavía

El respaldo de bytes sí quedó probado. Borrado con recibos,
fallo parcial/reintento y recuperación requieren autorización específica del
preview antes de la eliminación. ARCHIVOS-013 continúa PENDIENTE R5 hasta esa
validación, no se marca cerrado por las pruebas puras ni por un preview.
QA-001–016 globales siguen pendientes; estos resultados son sólo un subpaquete R5.
