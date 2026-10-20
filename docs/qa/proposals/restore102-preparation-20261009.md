# Preparación restore102 — 2026-10-09

Propiedad exclusiva de este paquete: `scripts/local/docker-tools/backup-final-102.mjs`, `scripts/local/docker-tools/restore-final-db-102.mjs` y este documento. No se editaron scripts101, pruebas existentes, matriz ni checkpoints. No se ejecutó Docker, respaldo, restauración, Auth ni pruebas funcionales. Sólo revisión de código y `node --check` de ambos scripts.

## Preparado para revisión por root

El respaldo requiere Linux `/workspace`, `ABA_QA_DOCKER_BACKUP102=1` y declaración explícita `ABA_QA_WRITERS_QUIESCENT=1`. Valida proyecto origen, mounts conocidos, servicios activos y bindings loopback. Mantiene una transacción exportadora `REPEATABLE READ READ ONLY`; el dump usa `pg_dump --snapshot` y las capturas DB importan el mismo snapshot. Repite las capturas dentro del snapshot y compara una captura independiente posterior para detectar escrituras observables durante la ventana. Storage compara inventario origen antes, copia y origen después. Cualquier divergencia conserva parciales y no publica el nuevo locator.

Crea UUID nuevo y archivos exclusivos `wx`. Captura configuración de servicios y IDs inmutables de imágenes, roles con flags/contraseñas cifradas/límites/caducidad/config, memberships y ACL en cinco schemas. Las capturas de baseline incluyen fingerprints de tablas de public/private/storage/supabase_migrations y Auth users/identities, catálogo con lista exacta de 102 versiones, políticas, flags RLS y hashes de funciones. No se inventan 90 tablas ni conteos de objetos: deriva los efectivos y registra el alcance. El forward102 debe coincidir con SHA aprobado. Las capturas/envelopes y dump/inventario están ligadas por manifest inmutable y SHA256, con UUID propio. Una sola clave AES256GCM privada dentro del proyecto; no se afirma respaldo externo.

Antes de publicar el locator copia los aliases históricos `restore-final-current.json` y `restore-final-data-proof.json` a nombres fechados con UUID, usando `wx`. El locator nuevo se publica al terminar mediante rename de temporal; el alias histórico data-proof se conserva sin sustituirlo. Los archivos por UUID de backups anteriores y volúmenes no se eliminan.

La restauración DB exige `ABA_QA_ISOLATED_RESTORE102=1` y `ABA_QA_EXPECTED_BACKUP_ID` exacto. Rechaza schemas de locator anteriores, manifests ajenos, hashes distintos, catálogo distinto, alias de reintento o cualquier container/volumen destino ya existente. Crea exclusivamente destino UUID nuevo, labels de proyecto y backup, sin red/puertos; imagen DB por ID local previamente capturado. Verifica mounts/imagen/labels antes de restaurar. Instala roles guardados, restaura dump y compara tablas/lista migraciones/políticas/RLS/funciones con baseline cifrado del backup. Conciliación de ACL y memberships modifica sólo destino aislado y vuelve a comparar. Guarda proof por UUID con `wx` y mantiene `restored:false`.

## Gates pendientes antes de ejecutar

1. Root termina escrituras de QA y detiene o controla todos los productores de escrituras durante el respaldo; esta variable es una declaración del operador, no un mecanismo que bloquee servicios. El conjunto de tablas fingerprinted no cubre todas las tablas restauradas.
2. Root revisa scripts y ejecuta respaldo102. Es necesario verificar experimentalmente que el storage-api actual expone Node y que supabase_admin puede exportar snapshot/dump y leer catálogos; se reutilizan patrones existentes, sin comprobación en esta preparación.
3. Después del respaldo, root obtiene UUID real del locator y lo fija explícitamente en restore DB y cada verificación restante. Si un intento falla y deja destino, no se puede volver a ejecutar sobre él: conserva destino y genera estrategia de nuevo UUID/manifest revisada; no borrar/reutilizar automáticamente.
4. Se requieren nuevas verificaciones físicas Storage102, servicios Auth/Storage recuperados, actores ordinarios (incluidas cuentas nuevas), RLS por perfiles y alcance mínimo introducido por forward102. Deben leer baseline del manifest/snapshot guardado y exigir UUID igual en locator/proofs/envelopes. No comparar con origen vivo como esperado ni capturar faltantes durante restore.
5. Scripts101 existentes no están adaptados: algunos fijan catálogo101, flags RESTORE101, Storage26, ACL342 o leen baseline vivo. **No ejecutarlos contra locator102 ni actualizar documentación con sus resultados.** `restore-final-data-proof.json` sigue histórico101 hasta publicación explícita de proof102 completo; el nuevo DB proof tiene nombre `restore-final-data-proof-<UUID>.json`.
6. La recuperación DB prepared sólo verifica datos y definiciones; prueba roles SQL reales y Auth/Storage ordinarios quedan pendientes. REST/Realtime/SMTP/PWA/VPS recuperados tampoco se afirman. QA014 permanece abierto.

## Límites y riesgos conocidos

- PostgreSQL y Storage no tienen snapshot transaccional común. Inventarios iguales detectan cambios observados; no excluyen un cambio transitorio que termine idéntico. Configuración de servicios y archivos también requiere quiescencia. La captura independiente posterior no convierte el ensayo en bloqueo de escrituras.
- Los hashes de filas y definiciones conservan el método MD5 interno del ensayo anterior; sus colecciones están ligadas por SHA256. No constituyen defensa criptográfica frente a atacante que controla la base.
- Snapshot/manifest y claves quedan en la misma máquina. Copia fuera de máquina depende del usuario; no se sale del dominio autorizado.
- pg_dump preserva el alcance completo de la base; fingerprints y ACL se limitan a scopes declarados. Config de roles de pg_authid se incluye; configuraciones per-database/per-role en pg_db_role_setting no se verifican específicamente en este paquete.
- Credenciales pasan por argumentos Docker de forma equivalente al mecanismo existente; no se imprimen ni se incluyen en evidencia pública. No se exponen stdout/stderr crudos al fallar.
- La ruta Docker/socket y mounts vienen del entorno aprobado existente; los scripts no configuran Windows ni acceden a rutas host externas.

## Segunda entrega preparada — servicios y pruebas102

Se añadieron únicamente los candidatos siguientes; no se ejecutaron:

- `scripts/local/docker-tools/start-final-services-102.mjs`
- `tests/local/restore-final102-data.mjs`
- `tests/local/restore-final102-api.mjs`
- `tests/local/restore-final102-rls.mjs`

El respaldo102 ahora incluye las credenciales sintéticas cifradas e identidades confirmadas de fixture más las dos cuentas aceptadas desktop/mobile (valida sus manifests privados y restauración del email original), metadatos del PNG golden, metadata del grant mínimo revocado y nueve proyecciones ordinarias RLS capturadas en el mismo snapshot. El grant revocado exige capabilities vacías, scope mínimo null y rechazo de `read_program_session_v2`. Las credenciales no van en manifest público, argumentos del worker ni logs: se descifran y pasan por stdin únicamente al worker recuperado.

Orden que root debe revisar y ejecutar sólo tras terminar escrituras QA:

1. Linux/tools: `ABA_QA_DOCKER_BACKUP102=1`, `ABA_QA_WRITERS_QUIESCENT=1` → `backup-final-102.mjs`.
2. Fijar `ABA_QA_EXPECTED_BACKUP_ID` al UUID exacto recién capturado; mantenerlo en cada paso. Linux/tools: `ABA_QA_ISOLATED_RESTORE102=1` → `restore-final-db-102.mjs`.
3. Host CLI en Desktop ABA: `ABA_QA_RESTORE102_DATA=1` → `tests/local/restore-final102-data.mjs`. Verifica cada archivo del respaldo contra inventario/hash del manifest; requiere Storage destino vacío y copia exclusivamente a volumen etiquetado propio. Compara inventario completo destino, baseline DB guardado y catálogo102; no lee origen vivo como esperado.
4. Linux/tools: `ABA_QA_START_RECOVERED102=1` → `start-final-services-102.mjs`. Sólo Auth/Storage en namespace de la DB exacta que está `network:none`, sin puertos; cada servicio usa ID de imagen guardado. Valida labels backup/proyecto, mounts y configuración Auth doble confirmación real. SMTP apunta a loopback aislado y no se arranca correo.
5. Host CLI: `ABA_QA_RESTORE102_API=1` → `tests/local/restore-final102-api.mjs`. `localStatus()` sólo obtiene metadatos y claves locales; no login ni petición HTTP a Auth origen. Worker en namespace DB exacto comprueba password login + `/user` de las cuentas recuperadas (conteo derivado), descarga PNG A y denegación B/anónimo; cierra sus sesiones locales. Reusar cuentas previamente aceptadas valida login recuperado, no una aceptación nueva. El PNG se concilia contra snapshot/target y hash/bytes golden conocidos.
6. Host CLI: `ABA_QA_RESTORE102_RLS=1` → `tests/local/restore-final102-rls.mjs`. Compara definiciones exactas de políticas/RLS/funciones/ACL/roles/memberships con snapshot; nueve perfiles con claims ordinarios deben igualar sus proyecciones guardadas. Ejecuta SELECT anónimo para acreditar rechazo real. Forward102 comprueba `read_program_session_v2` security invoker; el helper `aba_program_student_scope_v2` es security definer por contrato, no invoker. Ambos exponen EXECUTE exclusivamente a authenticated, además del propietario. Tres políticas de sesión exigen record.view y student.view. Grant mínimo revocado conserva estado y no concede capacidades/scope/snapshot.

Todos los proofs usan `restore-final-data-proof-<UUID>.json`, validan UUID/digest de manifest y rechazan locator de otro backup. No se lee ni modifica el alias data-proof101. El paso final marca únicamente el ensayo limitado como restaurado en proof/locator102; no actualiza QA014, documentación canónica ni aceptación del usuario.

Los workers de inventario/copia/health/API se conservan con nombres por UUID y labels propios; no hay `--rm`, prune, deletes ni sustitución de contenedores existentes. Un fallo conserva destinos y no habilita reintento automático sobre ellos.

Los checks RLS usan perfiles PostgreSQL autenticados con claims ordinarios y los UUID del fixture, no REST recuperado. Sigue sin haber evidencia de recuperación REST/Realtime/SMTP/PWA/VPS ni copia fuera de máquina. La comparación de datos es previa al login recuperado, que legítimamente puede actualizar metadata Auth en el destino. La preparación sólo obtuvo `node --check` PASS; SQL, disponibilidad de imágenes, mounts, arranque y peticiones deben comprobarse durante la ejecución por root.
