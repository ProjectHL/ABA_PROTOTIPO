# Contratos compartidos V2 — R0

Estado: contratos clínicos V2 definidos y pendientes de integración en R2/R3; ledger e identidad profesional aplicados en R1. QA NO EJECUTADO.

## Propiedad

El orquestador mantiene `src/domain/measurements/measurement-v2.ts` y `src/domain/programs/design-v2.ts`. A3 los consume; A6 deriva métricas desde ellos; A7 conserva el mismo comando/IDs/versión/idempotencia en su cola. No se duplica el contrato en cada módulo.

## Captura

- `MeasurementV2`: schemaVersion=2, fase, capturedAt y notas originales.
- Porcentaje: ID/orden, I/A/E/NR o null sin registrar; fecha nullable emparejada; ayuda respuesta y ayudas estímulo. Métrica I/(I+A+E+NR). No se utiliza el denominador de ensayos planificados.
- Frecuencia: eventos individuales y ventanas activas separadas; no se aceptan eventos fuera de observación ni ventanas solapadas. Se deriva eventos/minuto de esas ventanas, excluyendo pausas.
- Intervalos: ID/orden/inicio/fin/observación nullable; método total/parcial/momentáneo. Métrica positivos/observados; cobertura observados/planificados se devuelve separada.
- Duración: episodios inicio/fin nullable; total y promedio solo de episodios cerrados; abiertos separados. No se infiere cierre al cancelar un modal.
- Latencia: antecedente/tiempo, respuesta/tiempo, estado pendiente/respondió/NR y cierre. Solo respuestas observadas entran en promedio; NR y pendientes se devuelven aparte.
- `CaptureCommandV2`: operación, idempotencia, recordId, sessionId, studentId, programId y programVersionId separados, versión esperada y acción; revisión exige motivo/version existente.
- Validación de envío conserva registros incompletos como borradores; no transforma ensayos pendientes en NR ni episodios abiertos en cerrados. Intervalos parcialmente observados sí pueden enviarse con cobertura visible.
- `readPersistedMeasurement` devuelve V1 con su payload original y detailsUnavailable; no convierte booleanos antiguos a códigos clínicos.

## Diseño

- `ProgramDesignV2` preserva nombres/campos originales del diseñador de adquisición y conducta.
- Pasos conservan ID/orden/descripción; conjuntos conservan ID/nombre/ítems. No se reemplazan por arrays de texto plano.
- Funciones múltiples, precursores, procedimiento, generalización/ayudas y crisis están representados.
- Campos backend adicionales se conservan en propiedades explícitas compatibles: skillArea, teachingProcedure, promptLevels, hypothesizedFunctionNotes, preventionStrategy, responseStrategy.
- Borradores permiten campos incompletos; la validación publicada añade requisitos sin mutar el diseño.
- `readProgramDesign` conserva V1 sin convertir textos en estructura inventada.
- Comando borrador separa programa/version/predecesor y lleva operación/idempotencia/version esperada. La inmutabilidad de publicaciones será una garantía DB, no solo TypeScript.

## Verificación y pendientes

Contrato offline añadido en `src/domain/offline/sync.ts` (2026-09-12): cola aislada por userId/clinicId reutiliza exclusivamente comandos sesión/captura V2; excluye diseñador/admin. Dependencias requieren recibos persistidos, no basta que otra entrada esté lista; dependencias ausentes/cíclicas no se envían. Estados pending/in-flight/acknowledged/bloqueos/superseded distinguen trabajo pendiente de servidor confirmado. Recuperación tras interrupción conserva comando, operación e idempotencia. Bloqueos por permisos/conflictos conservan payload; resolución debe crear revisión explícita, no sobrescritura automática. Manifiesto descarga enumera fichas/documentos elegidos por scope. Tipado de proyecto pasa; falta IndexedDB/caché PWA, ejecución/red/recibos, pantallas, revalidación permisos y QA integral. No hay sincronización ni caché creado en R0.

Contratos adjuntos/colaboración añadidos (2026-09-12): `src/domain/attachments/attachment.ts` y `src/domain/collaboration/student-share.ts`. Servicio común tiene propósitos/recurso, metadatos/versiones, límite 20 MiB general y 5 MiB avatar; foto/avatars solo JPEG/PNG; documentación/chat/comercial PDF/JPEG/PNG. Comprobación de tamaño/cabecera y SHA-256 usa bytes reales. No es parser completo ni antivirus; validación de documentos/imágenes y adaptadores Storage siguen pendientes. Reserva, confirmación y archivo son comandos separados; una reserva no acredita carga persistida. No se ofrece borrado destructivo en el contrato.

Compartir usa niveles inequívocos full-read/program-results/clinical-edit, mensaje original, versión esperada e idempotencia en invitación/reenvío/aceptación/rechazo/cancelación/cambio/revocación. Publicaciones familiares seleccionan IDs de versiones de programas, revisiones de registros y versiones de adjuntos; referencias deben verificarse por ficha y permiso en DB. Son DTO/puertos, no un motor de autorización: adaptadores y migraciones deben extender `private.has_student_capability` / `get_student_capabilities` existentes, negar pendientes y excluir membresía general/admin/facturación/delegación para externos. No se han modificado grants/RLS, ni se concede acceso familiar por leer tablas clínicas.

Skill Supabase utilizada para revisar cambios vigentes y modelo Storage; índice changelog markdown rechazado por el navegador por content-type, se consultó equivalente HTML filtrado. Referencias: https://supabase.com/changelog?types=breaking-change, https://supabase.com/docs/guides/storage/security/access-control y https://supabase.com/docs/guides/storage/buckets/fundamentals. Mantener grants explícitos y RLS, no crear objetos propios en schemas gestionados ni exponer service_role. Tipado pasa; garantía runtime/seguridad queda para integración y QA final.

Contrato ficha añadido en `src/domain/students/student-v2.ts`: nombre nullable para historia con fallback a iniciales, RUT opcional normalizado con dígito verificador separado del identificador clínico, referencia fotografía, diagnóstico reportado/motivo/contexto y personas/hermanos con UUID estable. Familia/contacto son roles de una misma persona, no copias de identidad; los contactos principales requieren rol de contacto. Alta exige nombre; actualización histórica admite nombre ausente sin inventarlo. Comandos incluyen versión esperada e idempotencia; archivo/reactivación exigen confirmación explícita. La fecha local de clínica debe suministrarse a `parseStudentInputV2` al validar nacimiento, evitando el cambio de día UTC. RUT es validación de formato/checksum, no consulta ni acreditación de identidad; referencia SII: https://www.sii.cl/preguntas_frecuentes/inf_general/001_023_5071.htm y módulo 11 en https://www.sii.cl/ccp/formato_envio_cp_electronico.pdf.

Ficha V2 pasa tipado (2026-09-12). Pendientes: migración compatible de personas/IDs, DTO y formularios originales, RPC y autorización existentes, relación segura de adjunto, historial/medicación y revisión clínica; no hay persistencia V2 de ficha todavía.

Contrato sesión añadido en `src/domain/sessions/session-v2.ts`: snapshot con ficha/clínica/programas, eventos identificados y secuencia contigua, timeline de estados draft/active/paused/finished/cancelled, tiempo activo determinista desde eventos y capturedAt; comandos versionados/idempotentes y confirmación terminal. No sustituye los eventos DB aún ni migra sesiones históricas.

Tipado de proyecto completo mediante `tsc --noEmit --incremental false`: exit 0 tras añadir los dos esquemas (2026-09-12). No acredita validación runtime ni seguridad. Las validaciones y métricas deben entrar en la QA integral R5.

Pendientes explícitos: conectar componentes originales, adaptar DTO originales sin pérdida, retirar contratos duplicados V1 manteniendo lectura histórica, persistir eventos/estados de sesión, migraciones de JSONB/revisiones/idempotencia, RPC atómicos y autorizados, orden DB, regenerar tipos, publicación inmutable, integración A6/A7. No se ha aplicado ninguna migración de V2.

La matriz vigente está en `docs/MATRIZ_UX_CONTRATO_PERSISTENCIA_ABA_LOCAL.md` (434 acciones; 378 iniciales). El gate documental para iniciar R1 está registrado en `docs/REVISION_R0_GATE_R1.md`; el inventario puede ampliarse ante nuevos controles sin dar por integrada ninguna acción.

Contrato agenda añadido en `src/domain/agenda/appointment.ts`: cita con inicio/fin absolutos y zona explícita, participantes profesionales/personas familiares sin duplicados, recordatorios separados y recurrencia semanal por fecha/hora local. La regla distingue resolución de hora ambigua (earlier/later/reject) y rechaza hora inexistente; no suma semanas como segundos UTC. El adaptador debe resolver y verificar instantes locales, autorizar participantes y vínculo con sesión de la misma ficha. La recurrencia declarativa no es un scheduler implementado.

Comandos de agenda incluyen ID estable, operationId/idempotencyKey, expectedVersion y alcance single/occurrence/series; series exige su propia versión esperada. Alta exige versión0; cambios versión persistida; cancelación exige motivo y confirmación. Estudiante de input y comando debe coincidir. Pendientes: persistencia, resolución efectiva de zona/horarios, eventos/recibos, excepciones de serie, calendario original compatible y recordatorios durables. Tipado completo exit0; no ejecutado QA ni aplicado esquema.

Corrección operativa preventiva: scripts/run-local-auth-e2e.mjs ya no ejecuta db reset en finally. Revisión estática y node --check correctos; no se ejecutó el runner. No implica que sus fixtures históricos estén aislados ni limpios: R5 debe validar destino y limpieza explícita por lote antes de usarlo.

Contrato comercial en `src/domain/commercial/subscription.ts`: catálogo de versiones, plazas incluidas/máximas y ocupadas, suscripción activa/cancelada, vigencia y comandos confirmados/versionados/idempotentes. Importes usan enteros en unidades menores, moneda y precisión explícitas, siempre demonstration=true. Documentos internos distinguen resumen/propuesta/acuerdo, predecesor y referencia de adjunto; taxDocument=false y paymentRequested=false. No contiene medios de pago, tokens de proveedor, folios tributarios ni acciones de cobro. Cancelar nunca elimina fichas ni membresías.

Contrato soporte en `src/domain/support/ticket.ts`: alta/respuesta/cambio de estado con identidad estable, versión esperada y claves; snapshot completo ordenado con mensajes identificados y autor servidor; transición legal no concede permiso. Incluye solicitud comercial con permiso de contacto. Adaptadores deben comprobar solicitante/personal autorizado de la clínica, controles de abuso para solicitudes públicas y persistencia durable. No prometer IA ni atención instantánea/24x7. Estos contratos pasan tipado; persistencia, UI, historial de estados y ejemplos operativos quedan pendientes de A5 y QA integral R5.

Contrato común de resultados en `src/domain/commands/result.ts`: acknowledged exige receiptId, serverVersion y committedAt; replayed identifica repetición del recibo durable original. `version-conflict` exige expectedVersion/currentVersion reales; los conflictos de operación, clave o payload no aceptan versiones inventadas. rejected distingue permiso, validación, recurso y transición. `readCommandResult` valida identidad de operación, clave y recurso antes de aceptar el resultado. Timeout/red offline es resultado desconocido, no recibo ni rechazo; HTTP exitoso por sí solo no confirma persistencia.

Integración pura con `applySyncResult` en `src/domain/offline/sync.ts`: comprueba scope activo e identidad, solo acepta entradas pendientes/en vuelo, confirma únicamente recibo validado y bloquea conflictos/permisos/validación sin modificar el payload. Solo `version-conflict` debe corresponder a expectedVersion enviada y exige versiones persistidas distintas; colisiones de identidad no fabrican currentVersion. El adaptador IndexedDB todavía debe persistir esta transición atómicamente antes de actualizar UI. No existe transporte ni ledger DB V2 implementado; el tipado exit0 no prueba durabilidad, idempotencia ni autorización runtime. A3 implementa recibos transaccionales; A7 implementa almacenamiento/transporte/resolución visible; validación integral corresponde a R5.

Contrato chat en `src/domain/collaboration/chat.ts`: comandos identificados/versionados para conversación, mensajes y lectura; audiencia, participantes y adjuntos conservan IDs estables. Páginas ordenadas contienen cursor y cobertura explícita; mensajes vacíos o adjuntos duplicados se rechazan. Falta autorizar/persistir, recuperar tras reconexión e integrar Realtime y UI por A4.

R1 separa transporte Supabase de identidad de sesión: servidor/proxy usan `SUPABASE_INTERNAL_URL` cuando existe y mantienen fallback público; navegador sigue usando exclusivamente `NEXT_PUBLIC_SUPABASE_URL`. La clave de almacenamiento de servidor/proxy coincide con la clave por defecto del navegador, derivada del hostname público, no del hostname interno de Docker. No se modifica el flujo de cookies ni la validación `getClaims`. Referencia SSR vigente: https://supabase.com/docs/guides/auth/server-side/creating-a-client; derivación del namespace confirmada en las librerías instaladas. QA funcional queda pendiente de R5. Los enlaces Storage generados desde servidor también deberán usar destino accesible al navegador mediante el servicio común de adjuntos.

Ledger V2 aplicado por root en `20260913150733_reintegration_command_receipts.sql`: privado, sin acceso directo de clientes, claves por clínica/actor y resultado durable en la misma transacción de mutación. Identidad profesional aplicada en `20260913151455_reintegration_professional_identity.sql` consume ese ledger mediante implementaciones privadas autorizadas y wrappers invoker públicos. Junto con `20260914120224_reintegration_clinic_invitation_boundary.sql`, forman el historial local de36 migraciones, con tipos regenerados y revisión de tipado. Esto no acredita QA ni persistencia clínica V2: el protocolo está en `docs/PROTOCOLO_COMANDOS_V2_LEDGER.md` y las garantías funcionales se comprobarán en R5.
