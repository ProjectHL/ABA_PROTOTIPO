# P1 — revisión de integración de sesión y captura (2026-09-19)

Revisión estática. INTEGRADO no significa QA aprobado; los recorridos concurrentes y de navegador quedan para R5.

## Cadena integrada

- Ruta real app/session/[studentId]/page.tsx carga identidad y lectura autorizada, y reinicia estado por actor, clínica y ficha.
- SessionPage consume SessionCommandV2 y CaptureCommandV2 estrictos antes de retener operaciones. La persistencia usa program-session.server y las funciones V2 de 20260916044000 sobre el esquema 20260916043000.
- Los recibos ya no generan eventos ni registros inventados en el navegador. Tras ACK se exige una lectura autorizada con la versión confirmada; si falla, sólo se reintenta la lectura.
- Operaciones inciertas conservan operationId, idempotencyKey y payload exactos. El bloqueo síncrono evita dobles envíos y cruces entre sesión/captura.
- Conflictos conservan notas/mediciones locales, exigen leer el recurso vigente y aceptar la base nueva sin enviar automáticamente. Un conflicto de captura no rebasa silenciosamente las notas de sesión.
- Borradores persistidos se reabren. Un registro nuevo nunca confirmado puede descartarse localmente con aviso; un borrador persistido se archiva mediante action=discard y se retira sólo después de relectura confirmada. Registros enviados sólo se corrigen con motivo y no se descartan desde esta pantalla.
- Inicio, selección, pausa, reanudación, notas, varios registros, cinco dimensiones, envío, corrección, finalización y cancelación usan persistencia real. V1 se muestra como histórico sin inventar I/A/E/NR ni ayudas.
- DataCollectionEngine bloquea edición durante operaciones y no vuelve a notificar al padre por efectos de sincronización interna. Cerrar el modal no finaliza sesión ni programa.
- Guardas cubren botón atrás propio, enlaces, beforeunload y cambios locales/operaciones. Atrás/adelante nativo de historial SPA no se acredita cerrado en P1.

## Evidencia

Typecheck, lint dirigido y `git diff --check` sin errores; sólo avisos LF/CRLF existentes. Matriz SESION-001–022 conciliada como INTEGRADO técnico.

- SESION-020: el diseño publicado conserva una dimensión predeterminada, pero cada captura V2 puede declarar cualquiera de las cinco dimensiones válidas. Cambiarla crea otra captura y conserva la anterior; una captura local vacía puede reutilizar su identidad antes de persistirse. No se convierten observaciones entre dimensiones.
- SESION-021: los agregados V1 se muestran como históricos de sólo lectura con `true`/`false`, conteo o duración manual disponibles. No se habilita deshacer/corregir como V2 ni se fabrican I/A/E/NR, eventos o timestamps. Las nuevas observaciones usan MeasurementV2.
- SESION-022: `ArchiveSessionCommandV2` requiere motivo, permiso `record.submit`, versión esperada, lock, identidad/idempotencia y recibo. Sólo archiva borradores o estados terminales; una sesión activa debe pausarse y terminarse/cancelarse primero. El archivo retira la sesión de captura operativa sin borrar registros ni resultados.

La migración forward `20260920172710_close_p1_session_capture_contracts.sql` fue aplicada únicamente a `aba-reintegration-local`; tipos regenerados con Node 22. Advisors de seguridad locales sin hallazgos. No se ejecutaron comandos clínicos ni QA funcional.

No se ejecutaron comandos clínicos ni QA funcional. La validación de interacción, concurrencia y aislamiento queda en R5.
