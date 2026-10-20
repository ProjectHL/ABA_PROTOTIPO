# R5 — respaldo y restauración local aislada (corte de QA-014)

2026-09-28. Checkout exclusivo `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
QA-014 de operación/recuperación local validado sobre datos sintéticos. No
equivale a aceptación integral QA-001–016 ni del release.

- `scripts/local/backup.ps1` produjo el dump privado
  `.aba.local/backups/8570b51b-53b7-415b-8081-2f2313b47be1.dump`, sin
  sobrescribir otro respaldo ni modificar la base activa. Tamaño: 1.658.093
  bytes. SHA-256:
  `5D587285FA27A4DFEF0754C176685D159D5BC7561DBE6A503C52671EF2837525`.
- `pg_restore -l` sobre el mismo archivo finalizó 0 y enumeró 2.079 entradas.
  Es una comprobación de integridad de formato, no una restauración.
- `scripts/local/backup-services.ps1` dejó
  `8570b51b-53b7-415b-8081-2f2313b47be1.services.dpapi` (6.246 bytes,
  SHA-256 `B683839CACB12EE27C344E07D9F8A927A900DABAEC1D439191AB2EFCC4F8E195`).
  Descifrado/verificación de round-trip sólo para el perfil Windows actual.
  Los futuros `backup.ps1` producen también ese artefacto sin sobrescribirlo.
- Storage físico: 26 archivos, 1.768 bytes de archivos (206.568 bytes de uso
  total del directorio). Copia privada en
  `.aba.local/backups/storage-8570b51b-53b7-415b-8081-2f2313b47be1`;
  hash agregado ordenado de rutas y SHA-256 de cada archivo:
  `29b465836fea93e63a761cbcae35424bc201bb1c6a3afd705a20b2e5fcc34a8a`.
  Origen, copia y volumen Storage restaurado coincidieron antes de leer por API.
- `scripts/local/restore.ps1` tuvo un restore `exit 0` en el destino limpio
  `supabase_db_aba-restore-5c9b28f4`, inicializado con la misma CLI y PG17.
  El script exige etiqueta/volumen exactos, destino vacío, sin red ni puertos,
  copia el dump binario al contenedor, compara SHA-256 y sólo entonces ejecuta
  `pg_restore` como `supabase_admin`, conservando owners. Parser PowerShell sin
  errores. Su dependencia es la CLI/Docker local, no que el origen esté activo.
- Origen y restore QA3: 111 tablas en `public`, `private`, `auth`, `storage` y
  `supabase_migrations`; 1.428 filas exactas y fingerprint de conteos por tabla
  `15aa5510649acab747e8b1843aaaa2e4`. Ambos: 8 usuarios Auth, 100
  migraciones, cero tablas públicas sin RLS, cero constraints de aplicación
  inválidos y cero membresías huérfanas. Clínicas 2, clientes 1 y sesiones 3
  también coincidieron en el primer ensayo restaurado.
- GoTrue v2.196.0 sobre QA3 devolvió `/health` HTTP 200. Storage API v1.72.1
  sobre la DB y volumen QA3 devolvió `/status` HTTP 200 y descargó por la API
  interna dos PNG sintéticos del lote, HTTP 200, 68 bytes cada uno y SHA-256
  idéntico a la fixture. Auth y Storage compartieron el espacio de red `none`
  del DB; cero puertos publicados. El origen siguió activo e intacto.
- Tras detener únicamente Auth/Storage QA3, el nuevo
  `scripts/local/start-restored-services.ps1` leyó **sólo** la configuración
  DPAPI respaldada y los reinició con PowerShell 7: ambos HTTP 200 internos,
  sin puertos. Dos descargas Storage posteriores siguieron dando 200, 68 bytes
  y SHA correcto; hash físico origen/restore permaneció idéntico. El script
  rechaza PowerShell 5.1, que fragmentó argumentos nativos al probarlo.
- Candidato activo: `scripts/local/typecheck.ps1` exit 0; build Next 16.3.4
  aislado en `.aba.local/qa/next-build-final` exit 0, 23 páginas estáticas y
  rutas dinámicas presentes. `tsconfig.json` conservó los cambios anteriores:
  se retiraron sólo las dos inclusiones de tipos temporales añadidas por este
  build. Reinicio **sólo web** exit 0; `/api/health` HTTP 200 tras calentamiento,
  `/login` HTTP 200 y `scripts/local/status.ps1` exit 0 con 10 contenedores
  Supabase del origen intactos.

## Incidencias y límite de seguridad

- La CLI publicó temporalmente API/DB de destinos **vacíos** en todas las
  interfaces, incluso al probar una red Docker con opción de loopback. Se
  detuvieron antes de copiar datos; ningún restore se expuso así. No arrancar
  con `supabase start` un destino ya restaurado hasta resolver esa vinculación.
- Dos destinos de diagnóstico se conservaron sin red: QA1 demostró un restore
  directo completo tras depurar el transporte; QA2 quedó parcial al chocar
  `--clean` con constraints heredados de Realtime preinicializado. No reutilizar
  QA2 como respaldo ni repetir restore sobre un destino no vacío.
- La CLI de Windows aceptó listar el dump por stdin, pero `pg_restore -d`
  interpretó el mismo flujo binario como archivo inválido. Copiar el dump al
  contenedor y verificar SHA-256 resolvió ese problema. El destino de restore
  se inicializa con Realtime deshabilitado; el script rechaza tablas Realtime
  preexistentes y crea en QA el rol gestionado `supabase_realtime_admin`
  `NOLOGIN NOINHERIT` cuando falta.
- La recuperación independiente probada es **del mismo equipo y perfil
  Windows**: DPAPI no se traslada por sí solo a otro usuario/host. El dump y
  Storage contienen datos sensibles y siguen ignorados por Git; requieren
  cifrado adicional antes de salir del equipo. El arranque vacío inicial de la
  CLI debe hacerse sin red externa o con firewall; ningún dato restaurado se
  expuso a través de los puertos que la CLI publicó.

Procedimiento reproducible: `docs/runbooks/LOCAL_R5_RECOVERY.md`. QA-014 queda
validado dentro del alcance local/sintético. La aceptación global aún requiere
el resto de QA-001–016 y ARCHIVOS-013. Nunca apuntar el restore al proyecto
activo ni a la copia histórica; no borrar destinos de diagnóstico ni datos
reales por inferencia.

## Ensayo actualizado con101 — 2026-10-05

Respaldo2a2f70e1-9e84-4de8-bca8-c86183e9a482, destinoaba-restore-2a2f70e1; restauración completa exit0 mediante scripts existentes, sin red/puertos y volumen nuevo vacío. Bootstrap directo de la imagenPG17 vigente evitó publicar puertos del stackCLI vacío. Se verificaron Auth0/public0/Realtime0 antes de restore y se creó functions_admin NOLOGIN NOINHERIT únicamente en el destino QA. No se modificaron roles del origen.

Copia Storage26archivos/1768bytes, fingerprints de85tablas principales/1204filas y5privadas/481filas, catálogo101, policy admin actual y RLS9actores, login/userAuth8 y descarga PNG ordinaria A200/B-anónimo denegados. Detalles/hash/artefactos en [corte CLI](R5_CLI_GATE_V5.md). Servicios QA detenidos, volúmenes conservados; DPAPI mismo perfil/equipo sigue siendo una limitación. Actualiza la vigencia local de QA-014, no la aceptación global.


## Bloqueo vigente de entorno y correo — 2026-10-05

Ver [último corte CLI](R5_CLI_GATE_V5.md): invitación/reenvío2/2 y respuesta perdida2/2 aprobados; concesión limitada2/2 y API75/75 previos aprobados. La prueba completa aceptación/cambio de correo falló por autoconfirmación Auth incompatible con promesa de doble confirmación. Cuenta sintética desktop recuperada a correo original, cuenta móvil pendiente de aceptación. Config enable_confirmations=true preparada; runtime aún sin aplicar.

Windows bloquea adaptador Docker loopback (CodeIntegrity3077, VerifiedAndReputableDesktop). Supabase detenido oficialmente con backup/volúmenes preservados; web reanudada. No arranque clínico sin aislamiento verificado. QA-014: evidencia restore101 histórica conservada, **vigencia final pendiente** hasta aplicar/revalidar configuración y entorno. QA-001–013/015 parciales, QA-016 pendiente; ensayo humano reservado para el final.

## Recuperación Docker y correo seguro — 2026-10-05 (estado vigente)

El bloqueo operativo anterior queda resuelto sin configurar Windows ni acceder a carpetas ajenas. PowerShell fue autorizado exclusivamente como intérprete de comandos en ABA y Docker; límite registrado en AGENTS.md. Herramientas Linux dentro de `aba-local-tools-v5`, CLI Supabase 2.117.0 y cliente Docker oficial fijado por digest. Los tres volúmenes DB/Storage/Edge originales se conservaron. Arranque sin seeds ni aplicación automática de migraciones; catálogo101 sin alteración SQL.

Servicios Supabase saludables, todos los bindings publicados127.0.0.1. Auth health200. Config aplicada: GOTRUE_MAILER_AUTOCONFIRM=false, SECURE_EMAIL_CHANGE_ENABLED=true. Comparación antes/después PASS: ocho actores,98proyecciones y PNG exacto; evidencia `.aba.local/qa/persistence-v5/email-confirm-config-20261005.json` y salida after correspondiente. No acredita respaldo de toda la DB, recibos privados, Mailpit ni Realtime mediante ese probe.

R5-AUTH-DOBLE-CONFIRMACION-AUTOCONFIRM corregido y regresado. Correo seguro escritorio/móvil2/2 PASS: primer enlace conserva email anterior, segundo completa cambio; login nuevo y retorno reversible al original, mismas identidades/membresías. Evidencia durable saneada `.aba.local/qa/invite-email-v5-desktop-safe-20261005.json` y `...mobile-safe-20261005.json`. Las repeticiones posteriores reutilizan invitaciones ya aceptadas y contraseñas privadas; no se presentan como nuevas aceptaciones. La aceptación móvil y nueva clave sí pasaron antes de esa repetición,12,1s, sobre303cd976-6539-49cc-b38d-c5d29831031e. Desktop conserva58e3e7fa-0455-4769-9622-27fcbab1eb79. Cuenta real del usuario intacta.

Primer intento móvil no aprobado: Mailpit recreado no conservaba el mensaje anterior. Se reenvió por UI exclusivamente la invitación sintética existente y se aceptó el correo nuevo. No nuevas cuentas, reset ni correo a destinatarios reales. El buzón local no tiene continuidad acreditada entre recreaciones; los recibos SMTP históricos no equivalen a conservar mensajes.

Regresión API final75/75 PASS, cero skipped,7,23s, con lectura de sesión, conflicto y cinco dimensiones habilitada. Lint focal exit0 previo al ajuste de etiquetas de evidencia; se repite en el cierre del paquete. No se declara QA-002 completo por este focal. QA-014 sigue pendiente de vigencia del respaldo/recuperación de configuración final; restore101 previo sigue histórico. Faltan variantes de entregas unknown/claimed/resolution y conciliación QA integral, además de respaldo y manual final. Los tres recorridos humanos y QA-016 continúan reservados al final.

## Restore final Docker confirmado — 2026-10-05 (prevalente)

**QA-014 renovado local/sintético sobre candidato101 y configuración Auth final.** Respaldo e114e774-f4ab-4fed-9a6e-fbf8488318ee, dumpSHA4e908bdf7f5b2e9825dd7f3d1b627fb617abe45126561420ed81a499e5362b85; captura2026-10-05T15:15:19Z. Destino nuevo aba-restore-5936980d, DB sin red/puertos; Auth/Storage comparten únicamente ese namespace. Todos los servicios recuperados quedan detenidos, sus volúmenes conservados; stack activo íntegro y sano.

Restauración pg_restore exit0, catálogo101 y policy admin. Storage26archivos/1768bytes, agregadoSHAa3d3e0f278cd521651aa15b959507e9cb4946be41b31d7fec6415482170808e9, inventarios/hash origen→copia→destino exactos. Datos90tablas/1763filas en public/private/storage/migraciones más Auth users/identities conciliados antes de las pruebas Auth recuperadas; fingerprint8d095bcc04243c19cc4972a1e43f6dd0b2fa474e46e275f2bb9398a77e813de4. No se extrapola a todas las tablas de todos los esquemas; dump/restauración completa sí sin error. Cero tablas públicas sin RLS.

Auth recuperado10logins/User/logout ordinarios: ocho actores originales y dos invitaciones recién aceptadas; mismos IDs y passwords privadas sin evidencia pública. Storage A200/PNG68bytes/SHA exacto; B/anónimo denegados400. Policies públicas/Storage idénticas y RLS9actores (tres positivos/seis denegados) mediante roles PostgreSQL ordinarios y UUIDs autenticados, complementando API Auth/Storage; no se arrancó REST recuperado.

Defectos del procedimiento de restore reproducidos y resueltos sólo en destinos aislados: pg_dump no incluía supabase_functions_admin; respaldo de roles gestionados añadido. Espera de arranque usa pg_isready TCP definitivo, evitando tomar el servidor temporal de inicialización como listo. Los intentos e114e774 y6f2b24e9 quedaron parciales/detenidos y conservados, nunca se reimportó sobre ellos.

La imagen base otorgaba privilegios adicionales al crear objetos bajo el usuario de restauración. Se reconciliaron164objetos sólo en el destino; snapshot portable cifrado de342ACL de tablas/secuencias/esquemas/rutinas en public/private/storage/auth/migraciones. Comparación posterior342/342exacta, nueve negativos/positivos RLS y Auth10/Storage repetidos tras corrección. Roles15 incluyen atributos y hashes de credenciales idénticos al respaldo; membresías gestionadas25/25 idénticas, con opciones admin/inherit/set. No se modificaron grants/roles/RLS del stack activo ni se creó migración.

Config Auth/Storage/DB, roles, ACL y membresías cifradas AES-256-GCM con clave privada separada en .aba.local/backup-keys. Dump, Storage y todos los sobres están bajo .aba.local/backups, ignorados; ninguna salida/HTML/colección contiene secretos. Sin DPAPI, registro, políticas ni carpetas Windows externas. La clave y copias siguen en el mismo equipo: protección frente a pérdida del equipo requiere que el usuario conserve ambos en un soporte seguro independiente. No se realizó esa copia externa.

Evidencia privada saneada: .aba.local/qa/restore-final-current.json y restore-final-data-proof.json. Backup renovado registra configuración final y cuentas aceptadas; datos sintéticos añadidos posteriormente no se atribuyen a este snapshot. Límites: recuperación local aislada; no REST/Realtime/SMTP/PWA ni promoción VPS en destino; ACL verificadas sólo en los cinco esquemas enumerados, sin afirmar cobertura de ACL de otros esquemas. Ver docs/runbooks/LOCAL_R5_DOCKER_TOOLS.md para procedimiento actual. QA-001–013/015 siguen parciales; ensayo humano y QA-016 al final.


## Renovación restore102 — 2026-10-09 (estado vigente)

**QA-014 VALIDADO R5 LOCAL/SINTÉTICO sobre catálogo102; QA12/16.** Respaldo 26980a59-0f88-44ce-ae1c-d4be172bd865, captura 2026-10-09T04:20:06.254Z, dump SHA256 51008786ab943d7cfd35d8693e85e1cb467a9e0a21ecaa34a840fab77d6818a0. Destino aba-restore-26980a59, DB sin red/puertos; Auth/Storage en su mismo namespace aislado. Destinos recuperados y fallidos detenidos, contenedores/volúmenes preservados. Web V9 FdAlCRUJasCmkUnD5NHVn y Auth originales revalidados HTTP200.

PASS: snapshot exportado PostgreSQL y relectura independiente sin escrituras observadas;90 tablas/2350 filas del alcance declarado;102 migraciones;98 políticas,221 funciones,111 flags RLS,343 objetos ACL,15 roles y25 memberships exactamente conciliados. Storage40 archivos/85140 bytes, inventario completo y cada hash iguales entre origen/copia/destino. Auth10 logins/user/logout ordinarios, incluidas dos cuentas previamente aceptadas; no se presenta como nueva aceptación. PNG A200/68bytes/SHA exacto; B/anónimo400 denegados. Nueve perfiles SQL ordinarios (tres positivos/seis denegados), SELECT anónimo42501 y grant mínimo revocado sin capabilities/scope/lectura; forward102 verificado.

Correcciones sólo del procedimiento de ensayo: delimitadores DO, lectura de rolconfig desde pg_roles y preservación de parámetros tipo lista sin alterar la sesión del restaurador. Los tres destinos fallidos4f576c29/356121da/cf4df7d9 se conservaron; ninguna reimportación sobre un destino existente, ninguna modificación de roles/grants del origen. La documentación de preparación queda histórica; scripts y pruebas102 fueron ahora ejecutados.

Evidencia privada saneada: .aba.local/qa/restore-final-data-proof-26980a59-0f88-44ce-ae1c-d4be172bd865.json y locator restore-final-current.json. El alias restore-final-data-proof.json conserva101 histórico; usar el proof por UUID. Dump/config/roles/snapshot cifrados bajo .aba.local/backups y clave separada en .aba.local/backup-keys. Los fingerprints cubren el alcance declarado, no toda tabla del dump; Storage y PostgreSQL carecen de snapshot transaccional común. Clave y respaldo permanecen en el mismo equipo; no hay copia externa. No se acreditan REST/Realtime/SMTP/PWA/VPS recuperados ni configuraciones per-database de roles.

Siguen abiertos QA-003 (controles/rutas/perfiles), QA-004 (comparación UX base), QA-015 (regresión y versión final) y QA-016 (aceptación explícita). Los tres recorridos humanos clínica/supervisor/técnico permanecen planificados para el final. Cambios posteriores de contratos/esquema que invaliden esta evidencia exigen renovar el ensayo.
