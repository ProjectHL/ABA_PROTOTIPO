# Protocolo común de comandos V2

Estado: propuesta SQL y contrato cliente presentes; NO APLICADO / NO QA APROBADO.
Migración creada por CLI2.117:20260913150733_reintegration_command_receipts.sql.
Contrato de respuesta:src/domain/commands/result.ts. Consumidor puro offline:applySyncResult.

## Identidad y huella

El comando conserva operationId, idempotencyKey y resourceId estables. La identidad
de autor se obtiene de auth.uid validada por el endpoint; clínica/recurso se comprueban
con el motor existente, no con campos editables de perfil ni claims user_metadata.
La huella es SHA256 de representación jsonb del payload validado en servidor. Los
comandos deben pasar el mismo objeto completo al bloqueo y a la emisión, incluyendo
expectedVersion y todos los campos que cambian el resultado. No confiar en un hash
enviado por el cliente ni usar JSON.stringify cliente como autoridad de comparación.

El ledger distingue operación y clave dentro de usuario/clínica. Cambio de payload,
tipo o recurso reutilizando identidad produce conflicto, nunca replay exitoso.
Una operación en otra clínica/usuario no entrega recibos del contexto anterior.

## Orden obligatorio del endpoint

1. Validar identidad/sesión y estructura completa del comando, sin registrar secretos.
2. Resolver clínica/recurso y comprobar autorización vigente con el motor existente.
3. Llamar private.lock_command_replay(org,op,key,resource,type,payload). El lock es
   transaccional por clínica/autor. Si devuelve recibo, devolverlo solo después de
   revalidar autorización donde una revocación concurrente pueda afectar acceso.
4. Si no hay recibo, bloquear la fila del recurso (o reservar su ID de alta), revalidar
   permisos necesarios y comparar expectedVersion con la versión efectiva.
5. Realizar mutación, eventos/auditoría/revisión y asociaciones en la misma transacción.
6. Llamar private.issue_command_receipt(org,op,key,resource,type,payload,version,lote).
7. Devolver acknowledged con receiptId/version/committedAt. Ningún side effect externo
   puede confirmar éxito antes de commit; correo/Storage requiere handoff específico.

El recibo y la mutación se revierten juntos ante error. Emisión tardía duplicada falla
para impedir que un endpoint que omitió replay confirme una segunda mutación.
No envolver el ledger y la escritura de dominio en dos Server Actions/transacciones.
expectedVersion se compara después de buscar replay: el reintento exacto de una
operación ya confirmada debe recuperar el recibo original, no chocar con su propia versión.

## Acceso y límites

Tabla y helpers pertenecen a private. RLS habilitada y grants de API/client/service_role
revocados; helpers SECURITY INVOKER sin elevación. Solo funciones de dominio propias
revisadas pueden invocarlos. Si una operación necesita una función privilegiada,
autoriza explícitamente antes de tocar datos; search_path vacío y EXECUTE revocado
por defecto. No crear RPC genérica de emisión ni otorgar acceso directo al ledger.
Las funciones ledger verifican identidad y coherencia, NO autorización de recurso.

El mutex por autor serializa sus comandos en una clínica; diferentes autores aún
requieren lock/version del recurso para evitar sobrescritura. Todos los endpoints
deben tomar mutex antes de lock de recurso para evitar ciclos. Una colisión de hash
solo añade espera y no reemplaza las comparaciones de identidad/huella.

Los lotes usan FK compuesta organization_id/test_run_id. Sus recibos no se borran
en logout/reset/start/stop. Limpieza física explícita por lote debe inventariar
dependencias antes de ejecutarse. Rollback destructivo solo si ledger vacío y sin
consumidores desplegados; después de uso preferir forward-fix conservando recibos.

## Resultados y trabajo local

Errores SQL40001 por operation/key/payload deben mapearse a conflicto visible con
identidad original, no a error retryable que cambia la clave. Permiso/validación
rechazan sin recibo. Timeout/red desconectada conserva resultado desconocido; reintentar
el mismo comando. UI acepta acknowledged solo tras validar operación/clave/recurso.
IndexedDB persiste la transición atómicamente antes de renderizar confirmación.
Resolución explícita crea nueva operación/clave enlazada a la anterior; nunca LWW.

Los errores del helper se distinguen explícitamente: `idempotency_key_reused` →
`idempotency-key-reused`, `operation_id_reused` → `operation-id-reused`, y
`idempotency_payload_conflict` → `idempotency-payload-conflict`. Este último significa
que los IDs coinciden pero cambió payload/tipo/recurso; no es un conflicto de versión.
`version-conflict` se emite solo al comparar versiones persistidas y distintas.
No mapear todo SQL40001 a la misma categoría ni inventar currentVersion: si hace falta
leerla tras rollback, la consulta debe volver a autorizar el recurso en el contexto
vigente. Un error de transporte o resultado no interpretable conserva estado desconocido.
Los endpoints de sincronización deben devolver el contrato completo y la misma identidad;
el adaptador de perfil A1 actualmente muestra error visible, no ofrece transporte offline.

## Pendientes de integración y aceptación

A1 perfil, A2 ficha/adjuntos, A3 programa/sesión/captura, A4 colaboración, A5 agenda/
gestión/soporte implementan endpoints específicos. El orquestador integra SQL, tipos
del esquema aplicado y rutas; A7 adapta almacenamiento y transporte. No hay endpoint
V2 usando el ledger aplicado todavía. R5 valida doble envío, concurrencia, fallo de
red/commit, replay tras recarga/reinicio, payload distinto, revocación y aislamiento.
No se crearon ni ejecutaron suites intermedias para esta propuesta.
