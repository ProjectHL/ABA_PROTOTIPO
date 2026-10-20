# Recuperación local con herramientas Docker — R5

Ámbito exclusivo: C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO y Docker. PowerShell sirve únicamente como intérprete; no configurar Windows, explorar carpetas externas ni usar OneDrive. Ningún comando de este procedimiento borra volúmenes, restablece DB o aplica seeds/migraciones.

Se reutiliza el contenedor `aba-local-tools-v5`, imagen del proyecto `aba-local-web`, red `aba-reintegration-local`, carpeta autorizada en /workspace, volumen de dependencias del proyecto sólo lectura y socket del motor Docker. Sin puertos publicados. Cliente Docker Linux privado dentro de .aba.local/docker-tools, obtenido de docker@sha256:b1805116a6a86cc591b5d5f60a910a0715cdcc9d18d866ad68b1457ead25c35c. CLI Supabase2.117.0 instalado en el volumen del proyecto.

Antes del arranque, verificar que sólo existen los tres volúmenes originales y que el snapshot .aba.local/stack/supabase/config.toml mantiene proyecto ABA, seeds=false, migrations=false y auth.email.enable_confirmations=true. El wrapper scripts/local/docker-tools/bin/docker fuerza127.0.0.1 en puertos54321–54329 y rechaza montajes ajenos y borrados; peticiones de crear los tres volúmenes existentes se resuelven mediante inspect, nunca creación. No invocar el antiguo adaptador Windows.

En un contenedor de herramientas recién iniciado, ejecutar desde la carpeta del proyecto:

```powershell
docker start aba-local-tools-v5
docker exec -d aba-local-tools-v5 node scripts/local/docker-tools/db-proxy.mjs
docker exec -d aba-local-tools-v5 node scripts/local/docker-tools/api-proxy.mjs
docker exec aba-local-tools-v5 node scripts/local/docker-tools/start-stack.mjs
```

Los dos puentes escuchan únicamente en127.0.0.1 dentro de herramientas y conectan a DB/API por DNS de la red Docker. Se requieren porque el CLI usa localhost para verificar servicios. No repetir los puentes si ya están activos. El launcher guarda salida CLI privadamente, publica sólo resultado saneado y verifica que existan los volúmenes originales. No imprimir el log privado: la salida de CLI puede incluir claves.

Si quedan servicios detenidos tras un intento fallido, conservarlos y revisar bindings/configuración exactos antes de reanudar esos contenedores. No usar prune. En el incidente2026-10-05 sólo se recreó el contenedor DB recién generado; su volumen se conservó. No eliminar contenedores ajenos ni destinos de restore.

Después: verificar NetworkSettings.Ports en todos los servicios (sólo127.0.0.1/::1), salud Auth200, las dos flags Auth y persistencia ordinaria antes/after usando checkpoint propio. El helper write-env.mjs usa Docker por PATH; no busca su ejecutable en carpetas Windows. No revelar status JSON ni variables completas.

Resultado actual: arranque CLI exit0;8actores/98proyecciones/PNG PASS; correo seguro escritorio/móvil PASS. Este procedimiento reanuda el stack existente; no sustituye un respaldo completo ni demuestra la recuperación de configuración final. El ensayo restore101 previo es histórico y su dependencia DPAPI aún limita la recuperación; no ejecutar descifrado Windows bajo el alcance actual. La renovación de respaldo/configuración debe realizarse dentro de Docker y de la carpeta autorizada.
## Respaldo y restore de la configuración final (ensayo101)

La herramienta actual crea dump/Storage y sobres cifrados de servicios, roles, ACL y membresías. No usa Windows DPAPI. Antes de iniciar verificar stack/puertos y trabajar exclusivamente en la carpeta Desktop ABA. El comando siguiente crea una copia nueva, nunca sobrescribe:

```powershell
docker exec -e ABA_QA_DOCKER_BACKUP=1 aba-local-tools-v5 node scripts/local/docker-tools/backup-final.mjs
```

Conservar `.aba.local/backups/ID.dump`, `storage-ID`, `ID.services.aesgcm`, `ID.roles.aesgcm`, `ID.acl.aesgcm`, `ID.memberships.aesgcm` e inventario privado, además de `.aba.local/backup-keys/ID.services.key`. La clave es indispensable. Respaldos y clave siguen físicamente en el equipo; la copia a soporte independiente corresponde al usuario y no se realizó. No compartir/versionar estos archivos.

El locator `restore-final-current.json` identifica ID/destino. La siguiente restauración exige volúmenes nuevos; aborta si ya existen. Los destinos parciales se conservan y se detienen; un nuevo intento requiere un locator de intento nuevo que se conserva junto con el anterior. No alterar el backupID ni reimportar sobre datos existentes:

```powershell
docker exec -e ABA_QA_ISOLATED_RESTORE=1 aba-local-tools-v5 node scripts/local/docker-tools/restore-final-db.mjs
```

Aplica roles del sobre antes de pg_restore y espera PostgreSQL TCP definitivo. Guard: sólo proyecto aba-restore-ID8, volúmenes exclusivos, --network none y cero puertos. El origen no se modifica. Scripts tests/local/restore-final-data.mjs, restore-final-acl.mjs, restore-final-memberships.mjs y restore-final-roles.mjs verifican/copían sólo el destino. Ejecutarlos por Node del proyecto con sus opt-ins respectivos. Data sólo puede copiar Storage a volumen vacío; jamás repetirlo tras copiar. ACL y membresías se aplican desde snapshots cifrados del backup; ABA_QA_RESTORE_COMPARE_SOURCE=1 añade contraste con origen vivo para QA, no es requisito de recuperación. Roles verifica también hashes privados en memoria, sin imprimirlos.

Orden obligatorio: DB → Storage vacío y fingerprints → ACL342 → membresías25 → roles15 → servicios. No confundir dump restaurado con permisos correctos: la imagen base puede añadir grants durante CREATE. La conciliación ACL debe ocurrir antes de anunciar el destino como recuperado.

```powershell
docker exec -e ABA_QA_START_RECOVERED=1 aba-local-tools-v5 node scripts/local/docker-tools/start-final-services.mjs
```

Auth/Storage comparten namespace del DB aislado, reescriben URLDB únicamente al localhost del destino y no publican puertos; SMTP también apunta a localhost sin servidor externo. Health200 y flags de doble confirmación son obligatorios. restore-final-api.mjs comprueba Auth/Storage ordinarios; ABA_QA_RESTORE_NEW_INVITES=1 incluye las dos cuentas nuevas sintéticas con passwords de sus journals privados. restore-final-rls.mjs verifica nueve perfiles por roles PostgreSQL y UUIDs exactos. No acredita REST recuperado. Al terminar detener únicamente DB/Auth/Storage del destino y conservar volúmenes, sin prune, reset ni borrado.

Este conjunto es el harness del ensayo101, con lote/PNG/26objetos fijos; no es una herramienta genérica para datos desconocidos. Un cambio de lote, catálogo, inventario o candidato exige nueva conciliación y guardas explícitas. El antiguo procedimiento DPAPI queda como histórico y no se ejecuta bajo el límite operativo actual.


## Renovación restore102 — 2026-10-09 (estado vigente)

**QA-014 VALIDADO R5 LOCAL/SINTÉTICO sobre catálogo102; QA12/16.** Respaldo 26980a59-0f88-44ce-ae1c-d4be172bd865, captura 2026-10-09T04:20:06.254Z, dump SHA256 51008786ab943d7cfd35d8693e85e1cb467a9e0a21ecaa34a840fab77d6818a0. Destino aba-restore-26980a59, DB sin red/puertos; Auth/Storage en su mismo namespace aislado. Destinos recuperados y fallidos detenidos, contenedores/volúmenes preservados. Web V9 FdAlCRUJasCmkUnD5NHVn y Auth originales revalidados HTTP200.

PASS: snapshot exportado PostgreSQL y relectura independiente sin escrituras observadas;90 tablas/2350 filas del alcance declarado;102 migraciones;98 políticas,221 funciones,111 flags RLS,343 objetos ACL,15 roles y25 memberships exactamente conciliados. Storage40 archivos/85140 bytes, inventario completo y cada hash iguales entre origen/copia/destino. Auth10 logins/user/logout ordinarios, incluidas dos cuentas previamente aceptadas; no se presenta como nueva aceptación. PNG A200/68bytes/SHA exacto; B/anónimo400 denegados. Nueve perfiles SQL ordinarios (tres positivos/seis denegados), SELECT anónimo42501 y grant mínimo revocado sin capabilities/scope/lectura; forward102 verificado.

Correcciones sólo del procedimiento de ensayo: delimitadores DO, lectura de rolconfig desde pg_roles y preservación de parámetros tipo lista sin alterar la sesión del restaurador. Los tres destinos fallidos4f576c29/356121da/cf4df7d9 se conservaron; ninguna reimportación sobre un destino existente, ninguna modificación de roles/grants del origen. La documentación de preparación queda histórica; scripts y pruebas102 fueron ahora ejecutados.

Evidencia privada saneada: .aba.local/qa/restore-final-data-proof-26980a59-0f88-44ce-ae1c-d4be172bd865.json y locator restore-final-current.json. El alias restore-final-data-proof.json conserva101 histórico; usar el proof por UUID. Dump/config/roles/snapshot cifrados bajo .aba.local/backups y clave separada en .aba.local/backup-keys. Los fingerprints cubren el alcance declarado, no toda tabla del dump; Storage y PostgreSQL carecen de snapshot transaccional común. Clave y respaldo permanecen en el mismo equipo; no hay copia externa. No se acreditan REST/Realtime/SMTP/PWA/VPS recuperados ni configuraciones per-database de roles.

Siguen abiertos QA-003 (controles/rutas/perfiles), QA-004 (comparación UX base), QA-015 (regresión y versión final) y QA-016 (aceptación explícita). Los tres recorridos humanos clínica/supervisor/técnico permanecen planificados para el final. Cambios posteriores de contratos/esquema que invaliden esta evidencia exigen renovar el ensayo.
