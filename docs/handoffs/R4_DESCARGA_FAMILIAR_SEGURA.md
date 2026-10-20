# Descarga familiar segura — 2026-09-26

Estado vigente posterior: boundary 20260926221536 aplicado y verificado en catálogo,
ACL/policy/callers y advisors; tipos regenerados y build/lint runtime verdes. Véase
R4_FORWARDS_APLICADOS_CATALOGO.md. Descarga integrada técnicamente; gate global y
QA pendientes. Las observaciones de aplicación pendiente siguientes son históricas.

Estado del corte previo: implementada, pero no aceptada. Auditoría consolidada posterior
detectó gates org/ficha/persona activos incompletos en autorización SQL/Storage
directa. El boundary de identidad del route no sustituye ese límite. Corregir
helpers/callers mediante forward antes del gate R4. Ver último corte de
R4_AUDITORIA_GLOBAL_2026-09-26.md; no usar los controles anteriores como cierre global.

Corrección preparada: 20260926221536 añade gate común de organización/ficha/
persona/vínculo/actor vigentes también para SQL/Storage directo, con batches
abiertos para recursos etiquetados. Copias revisadas e idénticas, pero no aplicada:
Docker pausado manualmente. Requiere catálogo/advisors posteriores antes del gate.

Autorización explícita: «Sí, implementar descarga familiar segura».
Checkout: C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO.
Chat sigue excluido; no se habilita ningún adjunto de chat.

## Paquete conectado

- Migración CLI 20260926145135_family_document_download_v2.sql, aplicada únicamente
  a aba-reintegration-local mediante install-local-schema.ps1. Sin reset/seeds.
- RPC dedicado: sesión autenticada, publicación vigente en clínica exacta,
  destinatario familiar con vínculo activo y versión expresamente seleccionada.
  Sólo student-document disponible, perteneciente a esa ficha/clínica; no avatar,
  foto, comercial, pendiente, archivado ni chat. Puede descargar una versión
  histórica disponible si es exactamente la publicada; no sustituye por la última.
- Storage SELECT añade solamente object.get_authenticated y la misma autorización
  viva. No modifica las políticas profesionales, tablas ni capacidades clínicas.
  No habilita listado, firma, escritura o borrado a través del vínculo familiar.
- /family/documents verifica identidad familiar y clínica activa en cada petición;
  RPC antes de leer y después de verificar bytes/tamaño/SHA-256. Usa la sesión de
  Supabase, nunca service_role. Fallos devuelven error genérico sin rutas internas.
- Botón real en /family: fetch same-origin no-store, aislamiento de actor/clínica,
  abort al desmontar/cambiar contexto y enlace Blob local revocado tras un segundo.
  No persiste URL, bytes ni documento en la cola offline o Service Worker.

## Decisión de acceso temporal

No se emite URL firmada bearer de Storage. La URL de aplicación requiere sesión
y revalidación en cada uso; el enlace local sólo inicia la descarga en el navegador.
Así no queda una firma reutilizable tras revocar el vínculo. Una revocación no puede
recuperar archivos ya descargados ni detener bytes cuya entrega ya comenzó. El
destinatario es responsable de las copias guardadas; no se promete borrado remoto.
Una identidad con permisos profesionales independientes conserva sus propios
permisos originales: el nuevo vínculo familiar no los concede ni los restringe.

Referencia de control por operación:
[Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
y [Storage helper functions](https://supabase.com/docs/guides/storage/schema/helper-functions).

## Evidencia y pendiente

Dry-run: exactamente esta migración pendiente. Aplicación local exit 0; tipos DB
regenerados desde catálogo real. Catálogo: SECURITY DEFINER con search_path vacío;
RPC EXECUTE sólo postgres/authenticated; helper interno de autorización sólo
postgres; policy SELECT authenticated restringida a lectura autenticada exacta.
Advisors de seguridad: No issues found. Next build y TypeScript exit 0, 23 páginas
generadas y ruta dinámica /family/documents incluida. ESLint focal final exit 0
después de corregir sanitización del nombre; build/TypeScript repetidos exit 0.

R5 pendiente: descarga PDF/JPEG/PNG, vínculos cruzados/revocados, publicación
sustituida, versión no publicada/archivada, cambio de actor/clínica durante I/O,
rechazo de firmas/listados con identidad sólo familiar, integridad y offline.
No se ejecutaron pruebas funcionales, Postman, fixtures ni aceptación en R4.
Esto cierra la implementación de descarga, no la auditoría global R3/R4 ni R5.

## Corte posterior — consulta recuperable

Portal ofrece reintento/actualización explícitos, oculta contenido con identidad
no verificada y muestra citas en su zona persistida. Lint/build/tipado verdes;
sin QA ni cambios DB. Agenda familiar también queda pendiente del forward
20260926221536 por gates SQL de organización/rol de persona; ver auditoría global.
No aceptar descarga/portal/agenda por estos controles de pantalla.

Conciliación posterior: R4_FAMILIA_CONSUMIDORES_Y_LIMITES.md detalla ruta, adaptador,
portal, agenda, Storage y caché. El adaptador ahora rechaza clínica inconsistente
en cada publicación/cita, además de correlacionar actor/envelope. Lint runtime y
build/tipado verdes; forward y QA siguen pendientes.
