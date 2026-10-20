# Revisión root A2 R2 — ficha y adjuntos

Fecha: 2026-09-15. Resultado: **PARCIAL / NO ACEPTADO**. Root aplicó únicamente la estructura aditiva segura en `20260915124349_reintegration_students_clinical_v2.sql`; comandos, lecturas, adjuntos y UI siguen sin acreditar integración.

## Bloqueantes de contrato y UI

1. `authorizedStudentSummary.displayName` debe admitir los mismos 200 caracteres que `fullName`; su comentario tampoco puede decir que omite RUT cuando la búsqueda autorizada lo necesita.
2. Historial necesita identidad lógica y de versión separadas (`historyId`, `versionId`, `supersedesVersionId`, `version`). La UI actual reutiliza `selectedMedication.id` como nueva versión y como supersedida, y usa `student.version` como versión del historial: ambas cosas son incorrectas.
3. Consentimiento también necesita su versión persistida en el DTO y no puede usar la versión de ficha. Las reglas create/correct/replace/revoke deben distinguir versión inicial, predecesor y confirmación destructiva.
4. Una ficha V1 con `version:null` no puede quedar permanentemente ineditable. Diseñar un comando explícito de inicialización V2 con versión0 y payload confirmado, sin atribuir nombre/RUT/detalle desconocido ni inventar un backfill.
5. Los reintentos deben conservar identidad por payload hasta un resultado terminal en ficha, estado, historial, consentimiento, foto y cada fase del adjunto. Un error de red/timeout conserva exactamente el mismo comando.
6. Completar familia/contactos editables, archivo histórico de identidades ausentes, hermanos separados, foto y documentos (listar, preview/descarga temporal, reemplazo, archivo) y consentimientos; no basta mostrar filas V1.

## Bloqueantes SQL/Storage

1. Validar forma/tipos antes de casts; persistir todos los campos de `clients`, perfil, personas, hermanos y foto; derivar el mismo `test_run_id` del recurso.
2. Implementar cuerpos concretos para student/history/consent, list/detail y reserve/verify/confirm/archive/list/read. Los comentarios no constituyen RPC.
3. Mapear colisiones del ledger como conflictos de identidad sin versiones; sólo version-conflict lleva expected/current. Toda mutación, evento y recibo debe compartir transacción.
4. No usar `clinical_audit_events` con valores que su constraint V1 rechaza. Crear evento V2 propio o ampliar la restricción de forma explícita y compatible.
5. Verificación de bytes debe usar un secreto dedicado de alcance mínimo; el destino se deriva del servidor y confirmación sólo ocurre tras tamaño, firma MIME y SHA-256 reales. Nunca URL pública, upsert ni delete físico.
6. Resolver FKs de `photo_attachment_id`/evidencia una vez aplicada la tabla de adjuntos, incluyendo recurso y lote coherentes. Chat y comercial permanecen fail-closed hasta A4/A5.

Postman y QA funcional continúan reservados para R5/A8.
