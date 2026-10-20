# Búsqueda autorizada V13 — propuesta focal de evidencia

**Escritorio 1/1 PASS (26,9 s), móvil 1/1 PASS (17,9 s), en serie. Lint final PASS.** Build `rFuUzZbqYsCB2mKTHX09X` en `http://localhost:3001`. Perfiles admin-a/admin-b sintéticos; cero comandos clínicos. Auth liberada.

BUSQUEDA-002: las consultas reales de estudiante, programa y documento dieron cada una 1 resultado A y 0 B. Se compararon orden, cantidad, título, tipo y subtítulo contra `aba_authorized_search_v2` ordinario y su schema. Consulta vacía/corta muestra validación; no-match devuelve cero; Escape cierra.

BUSQUEDA-003: click Abrir sobre el resultado correlacionado por kind/id conduce a su ruta exacta y cierra el modal. Se verificaron ID clínico/nombre de la ficha, título de la versión actual/dimensión/conteo detallado de filas V2 contra DTO persistido del programa, y documento v2 Disponible en Documentación Legal, con recarga en cada destino. El documento abre la ficha; no se fabrica ruta de Storage ni se descarga. B recibe chart 404 sin CSV y carpetas A no disponibles sin nombre ni tab legal.

Recursos: own94 versión29; programa `3265dba8-6df0-4736-9d08-75308903a930`, versión actual `bf036894-38ca-4a9a-8456-5e8e3d37f1eb` n.º1. Documento sintético existente de b347: attachment `b6b17132-72a9-464a-907b-9c1d002b7fb4`, versión `a839a0ff-de63-4652-b1fa-96f0bb387495` n.º2, 68 bytes/SHA `bc21a4fa21aaa7c5eb60fbd88394d86813afd10ad287bf7274d0e1c588ea2764`, creado por admin-a. El testBatchId legacy null sólo se acepta para ese tuple completo acreditado por `r5.offline.spec.mjs:205` y `R5_OFFLINE_QA.md:21`, además de clínica/ficha QA exactas.

El primer intento falló antes de UI porque el guard exigía testBatchId no-null. Se conservó `authorized-search-v13-desktop-before-provenance-fix.json`, cero escrituras/búsquedas, y root autorizó resume explícito tras inspección y corrección del arnés; no fue defecto de producto ni se creó documento.

Los DTO de ambas fichas, programas/sesiones y metadatos documentales permanecieron exactamente iguales. Los hashes iniciales son idénticos entre escritorio y móvil; sesión97 está incluida en el DTO original intacto. Los journals y safes `authorized-search-v13-{desktop,mobile}-{journal,safe}.json` y sus hashes están vinculados en la propuesta JSON.

Límites: no prueba positiva supervisor/técnico, descarga de bytes, firma Storage ni transición de permisos en este paquete. Se exige journal del grupo completo antes de Auth. Esta evidencia propone conciliar BUSQUEDA-002/003; **QA003 global y aceptación humana siguen abiertos**. Sin modificaciones de canon/mapa/producto.
