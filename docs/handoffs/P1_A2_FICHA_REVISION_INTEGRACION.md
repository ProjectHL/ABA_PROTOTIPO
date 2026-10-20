# P1 — revisión de integración de ficha, historial y adjuntos (2026-09-19)

Revisión estática: 66/67 acciones técnicas A2 conciliadas. No hay QA aprobado.

- La lista autorizada permite alta, búsqueda por nombre/iniciales/ID clínico/RUT/diagnóstico, filtros de vigencia y apertura de ficha. Las migraciones `20260919055014` y `20260919163445` incorporan ID clínico y tarjeta ampliada a la proyección; fueron aplicadas al stack local sin reset.
- Alta y edición recuperan el selector original de diagnósticos y la opción «Otro» con especificación libre/autocompletada. La tarjeta muestra diagnóstico, sesión V2 activa/pausada, asignación familiar activa y profesional asignado visible según las políticas vigentes; no infiere estados desde borradores ni contactos.
- Información General conserva la ficha original y persiste identificación, RUT normalizado, diagnóstico reportado, motivo y contexto mediante comando versionado. Alta, actualización, archivo y reactivación retienen una identidad estable para reintentos y distinguen recibo de fallo posterior de lectura.
- Familia/contactos/hermanos usan IDs estables, un contacto principal, formularios conservados y actualización versionada de la ficha. No recrean silenciosamente una persona retirada concurrentemente.
- Historial Clínico expone diagnósticos, evaluaciones y procedimientos; permite alta/corrección, agrupa la cadena por `historyId`, muestra versiones anteriores y no ofrece borrado de evidencia.
- Medicación permite alta, corrección, actualización de tratamiento, finalización, reactivación e historial expandido; dosis, frecuencia, prescriptor, fechas y notas permanecen campos separados.
- Fotografía y documentos usan Storage privado: validación PDF/JPEG/PNG y 20 MiB, reserva/confirmación, reintento exacto, enlace temporal, descarga, sustitución versionada y archivo lógico. Consentimientos permiten crear, corregir, reemplazar, revocar y vincular evidencia confirmada.
- Los conflictos conservan el borrador, exigen relectura autorizada y aceptación explícita antes de un nuevo envío. Las guardas cubren navegación del shell, atrás/adelante nativo, cambio de clínica, cierre de sesión y `beforeunload`.

`ARCHIVOS-013` queda reasignado a Root/A8 en P6/R5 mediante `docs/runbooks/ATTACHMENT_PHYSICAL_CLEANUP.md`: requiere preview, autorización exacta, respaldo, revalidación de referencias y recibo por objeto. No se expone en la ficha ordinaria y el cierre P1 no ejecuta borrados. Advisors de seguridad sin hallazgos; typecheck y lint dirigido exit 0. No se ejecutaron recorridos funcionales ni visuales.
