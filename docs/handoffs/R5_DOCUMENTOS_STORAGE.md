# R5 — documentos privados y Storage (QA-009 parcial)

2026-09-28. Checkout exclusivo `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
Sólo la ficha `QA-R5-A-2155E99E` y un PNG sintético de un píxel. No se
leyeron ni eliminaron documentos clínicos reales.

## Evidencia ejecutada

- `tests/e2e/r5.documents.spec.mjs` sobre la interfaz real del servicio local:
  escritorio/móvil **2/2** en la repetición ampliada (20,5 s/18,1 s). El archivo
  con MIME PNG pero firma falsa y otro de 20 MiB + 1 byte fueron rechazados sin
  documento visible. La carga válida produjo v1 disponible; su descarga
  coincidió byte por byte con el PNG enviado. La sustitución produjo v2
  disponible y una segunda descarga idéntica. Con v2 todavía activa, clínica B,
  externo y familiar sintéticos no pudieron leerla por RPC ni crear URL firmada
  directamente en Storage. El archivado explícito ocultó v2 de la lista activa;
  al incluir archivados se mostró como tal y su botón Descargar quedó
  deshabilitado. No se borraron bytes.
- El primer intento falló antes de la confirmación porque faltaba el contenedor
  local `supabase_edge_runtime_aba-reintegration-local`, aunque DB/Auth/Storage
  estaban sanos. `scripts/local/serve-edge.ps1` en preview verificó hashes del
  snapshot y `verify_jwt=true` en tres funciones; `-Apply` recreó **sólo** Edge.
  Docker mostró Edge `Up`; no se reiniciaron DB/Auth/Storage ni se tocaron
  volúmenes. La repetición pasó. El script foreground debe mantenerse vivo
  durante QA; Docker arriba sin Edge no equivale a stack funcional completo.
- Lectura agregada de metadatos `qa-r5-%` tras los ensayos: diez versiones
  archivadas y **una** versión `pending-upload` del intento interrumpido. No se
  reutilizó un comando perdido ni se eliminó ese objeto. Su tratamiento pasa
  por la previsualización/retención de ARCHIVOS-013 y autorización exacta, nunca
  por limpieza automática.
- `tests/e2e/r5.family-documents.spec.mjs`: publicación familiar desde la ficha,
  lectura del portal y descarga de la versión publicada por la identidad familiar,
  con bytes idénticos al PNG; revocación desde la ficha, respuesta **403** al
  repetir exactamente la URL descargada y desaparición del documento tras
  actualizar el portal. Pasó escritorio **1/1** y móvil **1/1** el 2026-09-28.
  El móvil requirió tocar coordenadas del viewport visual porque el layout
  desborda horizontalmente y `locator.click()` de Playwright apuntaba a otro
  campo; el toque real sobre el botón sí publicó. Se crearon únicamente
  personas/documentos/publicaciones sintéticos; la última ejecución revocó
  el vínculo familiar activo. No hubo borrado físico.
- La primera ejecución E2E reveló dos defectos de integración, corregidos y
  repetidos: inicio familiar intentaba cargar `/dashboard` clínico y fallaba al
  parsear respuesta nula; ahora redirige a `/family` y el servidor rechaza
  roles no profesionales. La introducción de publicación usaba
  `event.currentTarget.value` dentro de un actualizador de estado diferido y
  podía lanzar una excepción; ahora captura el valor antes de actualizar.
  TypeScript, lint focal y repetición de `r5.dashboard.spec.mjs` en
  escritorio/móvil **2/2** pasaron después de las correcciones.

## Pendiente para cerrar QA-009

La ruta familiar publicada y la revocación de esa misma URL quedaron cubiertas
en ambos tamaños de pantalla.

La comprobación adicional del 2026-09-28 reveló un defecto real: una URL
firmada profesional emitida antes de archivar un PNG sintético siguió
respondiendo **200** tras el archivo lógico. Esto coincide con el contrato de
Storage: la firma continúa válida hasta expirar aunque cambien permisos o
sesiones. Se corrigió el flujo para nuevas lecturas con
`app/attachments/read/route.ts`, `temporaryAttachmentReadUrl` y el forward
`20260928182438_clinical_attachment_authenticated_download_only.sql`.
La política Storage permite `object.get_authenticated` con RLS de recurso,
pero impide crear URL firmada directa. La ruta comprueba sesión y versión
exacta, descarga con JWT del usuario, verifica longitud/SHA-256 y revalida
antes de responder; no almacena bytes en caché. El token de las URLs firmadas
emitidas *antes* del forward no puede anularse sin eliminar el objeto:
caduca por su propio plazo, máximo cinco minutos en esta aplicación. No se
borró ningún objeto para forzar esa revocación.

Destino `aba-reintegration-local` verificado; dry-run mostró sólo el forward
anterior, aplicado sin reset/seed/borrado. Catálogo **100**. Advisors security
local: sin hallazgos. Build de producción aislado en
`.aba.local/qa/next-build-attachment-route`: exit 0, ruta dinámica presente.
TypeScript y lint focal: exit 0. `r5.documents.spec.mjs` pasó escritorio y
móvil **2/2**: descarga idéntica, petición anónima sin bytes, creación directa
de URL firmada denegada incluso al profesional, archivo lógico y **403** al
reutilizar la URL de aplicación con la misma sesión. El primer ensayo negativo
anterior al forward quedó como evidencia de la reproducción (200 tras archivo).
El portal familiar siguió descargando y revocando: móvil pasó en la corrida
conjunta, escritorio pasó en repetición aislada. La corrida conjunta tuvo un
fallo intermitente de login de escritorio antes de llegar a Storage (3/4);
no se atribuye a esta política sin más evidencia.

Faltan ARCHIVOS-013 sobre una previsualización exacta y el resto de QA R5.
Esta evidencia no acepta todo QA-009 ni la totalidad de R5. El PNG y las
descargas son sintéticos; chat y R6 siguen fuera del release local.
