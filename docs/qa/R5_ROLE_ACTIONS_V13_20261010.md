# Roles B V13 — propuesta de evidencia focal

**Escritorio 1/1 PASS en resume exacto (15,7 s); móvil 1/1 PASS desde inicio (26,4 s). Lint final PASS.** Candidato V13 `rFuUzZbqYsCB2mKTHX09X`, catálogo102. Auth liberada. QA003 global permanece abierto.

Se revalidaron roles/membresías y capacidades actuales ordinarias. Ficha B `bbf1e89c-6b06-4f5c-a62a-1d3fa94122de`, QA-R5-B-V5 versión13. Supervisor-b creó y publicó por UI un programa propio por proyecto, con diseño completo exacto contra comando/DTO/recarga y dos ACK (draft0 y publicación1). El técnico-b inició sesión propia usando sólo esa versión, guardó un borrador porcentaje de diez ensayos (I/E y ocho sin registrar), lo reabrió tras recarga y envió el mismo ID v1→v2. Se conciliaron payloads originales completos con cada comando y se comprobó persistencia/recarga.

El técnico finalizó y archivó exclusivamente su sesión mediante confirmaciones UI y motivo, conservando el registro enviado. Cinco ACK técnicos por proyecto; **14 ACK correlacionados en total**, operación/idempotencia/recurso/version exactos. Cada comando fue registrado antes de transmitir; ninguna escritura confirmada se repitió para corregir el arnés.

Negaciones reales: ambos perfiles ven alert de /team limitado a administradores, sin controles de invitación/cambio de rol/suspensión/reactivación. Técnico tiene nombre, Guardar ficha y Archivar ficha disabled; Nuevo Programa y Diseño también visibles pero disabled. No se forzaron acciones ocultas.

Desktop tuvo dos problemas de arnés conservados: igualdad demasiado estricta de capturedAt tras envío y hasActiveSession false del baseline durante sesión propia activa. DataCollectionEngine:58 renueva capturedAt en cada persist; ahora se exige monotonía y todas observaciones idénticas, además de DTO exacto al comando. SQL 20260927161726:202 deriva hasActiveSession de estados active/paused; el resume exige sólo esa diferencia proyectada durante la sesión y DTO original exacto después de archivarla. Los cinco ACK ya existentes se inspeccionaron/reconciliaron antes de continuar sólo finish/archive. No fueron defectos de producto ni hubo duplicación de programa/sesión/registro.

Se retuvieron dos programas y dos registros sintéticos B; las dos sesiones propias quedaron finalizadas y archivadas. Roles, membresías, asignaciones, ficha versión13, registros anteriores y la ficha A/snapshot original completo (incluida sesión97) permanecieron exactamente iguales. Móvil preservó también el programa/registro recién creado por desktop.

Mapeo focal: supervisor PROGRAMAS-003/005/031; técnico SESION-002/010/011/014/022 y PORCENTAJE-022. PROGRAMAS-006 persistió internamente al publicar: no se presenta como prueba separada de Guardar/Reabrir borrador. Negaciones EQUIPO-002/005/006/007 y controles clínicos/programa técnicos son evidencia negativa, no ejecución de esas mutaciones.

Journals/safes `role-actions-v13-{desktop,mobile}-{journal,safe}.json`, discovery y diagnósticos anteriores están vinculados con SHA en la propuesta JSON. No cubre perfiles A positivos, otras dimensiones/acciones completas, altas humanas ni los tres recorridos finales. Sin cambios de producto, canon o migraciones.

Root avanzó después del terminal a V14 `-N6_dbDzA8P56-Y0qP5nR`/catálogo103. Esta evidencia corresponde a V13; queda pendiente regresión focal del candidato final. No se ejecuta más Auth por este agente.



Corrección editorial posterior: commandAction del archivo de sesión ahora archive-session. Ese comando usa sessionId+reason sin action; fallback lo había rotulado save-program-draft. Safes anteriores preservados; journals y recibos intactos, sin nuevas escrituras/ejecuciones. Hashes del informe final reconciliados.
