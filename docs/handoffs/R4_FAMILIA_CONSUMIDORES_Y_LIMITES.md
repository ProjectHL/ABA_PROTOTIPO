# Familia — conciliación de consumidores y límites R4

> Estado vigente 2026-09-27: R3/R4 aceptados técnicamente para R5 en R4_CONSOLIDACION_CIERRE_LOCAL.md. Forwards aplicados; catálogo local reconsultado: 97 migraciones, última 20260926221536. Los estados de aplicación pendiente/pausa/401+3 inferiores son cortes históricos, no tareas vigentes. QA funcional y aceptación local siguen pendientes; chat y R6 no condicionan el cierre local.

Corte: 2026-09-26. Revisión de fuente, no catálogo vivo ni QA. No aceptado:
el forward 20260926221536 todavía requiere aplicación y verificación local.

## Cadena conectada

| Requisito | Consumidor y contrato inspeccionados | Autoridad persistente |
|---|---|---|
| Contexto familiar sin membresía general | IdentityContext / family.server boundary: clínica activa y usuario Auth exactos | aba_identity_context_impl; el forward usa family_recipient_active_v2 |
| Sólo publicaciones seleccionadas | FamilyPortalPage → loadFamilyHome → familyPortalPage; FamilyPublishedContent renderiza diseño/medición recibidos, sin consultas clínicas adicionales | aba_family_portal_read_v2: publicación vigente, manifiesto de recursos y destinatario exacto |
| Agenda de sólo lectura | loadFamilyHome → familyCalendarPage → tarjetas de citas y zona horaria persistida | aba_family_calendar_read_v2: participación explícita de la misma persona familiar y vínculo vigente |
| Descargar versión expresamente publicada | FamilyDocumentDownload → /family/documents → aba_family_document_read_v2 | family_document_authorized_v2: versión exacta disponible, documento de la ficha y publicación vigente |
| Acceso directo Storage también limitado | Route usa cliente de sesión, nunca service_role | Policy family_document_authenticated_download_v2 → can_read_family_document_object_v2 → family_document_authorized_v2; sólo object.get_authenticated |
| Sin documento familiar en caché automático | fetch same-origin no-store; Blob temporal; public/sw.js sólo cachea shell offline y recursos estáticos | No inserción en IndexedDB/cola offline desde este consumidor |

## Comprobaciones del adaptador y de la ruta

- loadFamilyPortal y loadFamilyHome rechazan publicaciones de clínica distinta.
  loadFamilyHome comprueba también actor/clínica del envelope y clínica de cada cita.
  Estos controles evitan presentar una respuesta inconsistente; no reemplazan SQL.
- Portal remonta por actor/clínica, oculta publicaciones con identidad no verificada
  y descarta respuestas asíncronas anteriores. Consulta fallida permite reintentar.
- Descarga necesita sesión familiar en clínica activa; correlaciona actor, clínica,
  publicación y versión. Comprueba tamaño y SHA-256 de bytes y reconsulta autorización
  después de leer Storage; falla con 403 genérico y cabeceras private/no-store.
- El enlace Blob se revoca; no se emite URL firmada bearer. No se promete recuperar
  una copia descargada ni detener una entrega que ya comenzó.
- El forward restringe organización/ficha/persona/vínculo/actor vigentes y batches
  abiertos donde corresponden. Los callers de portal, identidad, agenda y documento
  lo usan; Storage llega al helper por su policy existente. Falta comprobar esos
  cuerpos y ACL contra el catálogo realmente aplicado.
- /chat sólo ejecuta notFound; ninguna operación de chat se habilita en este paquete.

## Evidencia y gate restante

Grafo runtime: 31 entradas, 153 fuentes, cero imports locales sin resolver y cero
chat/workspace/mock/dummy runtime. Lint cero errores/advertencias. Build Next 16.3.4,
TypeScript y 23 páginas: exit 0 tras el cambio del adaptador.

FAMILIA-007/008 siguen PENDIENTE R4. Requieren aplicar forward y revisar catálogo,
ACL/search_path/callers/advisors, además de la conciliación global de A4. Los casos
de revocación, clínica cruzada, recurso sustituido, I/O concurrente y Storage directo
pertenecen a R5; no se ejecutaron aquí. Chat sigue diferido al upgrade.
