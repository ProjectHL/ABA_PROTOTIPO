# ABA local — operación reproducible R1

Checkout autorizado: `C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO`. No usar el cwd OneDrive como copia ejecutable ni archivos staging del host. Todos los pasos se invocan desde el checkout real.

## Runtime y límites

Node **22.23.2** portátil en `.runtime.local/node-v22.23.2-win-x64`, npm **10.9.8**, Supabase CLI local **2.117.0**, Docker Desktop Linux/WSL2 operativo. No sustituye Node global ni cambia daemon, firewall o PATH persistente. El instalador verifica el ZIP contra SHASUMS256 oficial de nodejs.org. `npm ci` usa el lockfile del repositorio; el orquestador controla package/lock.

No comandos remotos, `link`, `reset`, `stop --all`, `--no-backup`, seeds automáticos ni migraciones aplicadas durante start. El esquema es paso explícito del orquestador en `scripts/install-local-schema.ps1 -Apply` después de revisar aislamiento y orden SQL.

## Preparación y arranque

```powershell
powershell.exe -NoProfile -File scripts/local/install-node.ps1
# Usar npm de Node22 portátil para npm ci, no el global Node24.
& .runtime.local/node-v22.23.2-win-x64/npm.cmd ci
powershell.exe -NoProfile -File scripts/local/configure.ps1
powershell.exe -NoProfile -File scripts/local/start.ps1 -SkipWeb
powershell.exe -NoProfile -File scripts/local/status.ps1
```

Configure crea **una sola vez** `.aba.local/stack/supabase/config.toml` con proyecto `aba-reintegration-local`, Storage/Realtime y Mailpit locales, JWT 900 segundos y callbacks locales. Rechaza sobrescribir configuración existente. Copia funciones, **no** migraciones ni seeds. Si cambia configuración, el operador revisa diferencias; no borrar workdir/volúmenes para forzarla.

Start crea/verifica red `aba-reintegration-local` y compila `DockerLoopback.cs` mediante Windows PowerShell .NET Framework en `.aba.local/bin/docker.exe`. El CLI2.117 invoca Docker por PATH; el wrapper existe únicamente en PATH del proceso start y se restaura en finally, junto con `SUPABASE_NETWORK_ID` y `ABA_REAL_DOCKER`. Solo `create/run` con nombre y etiqueta del proyecto aislado reescriben `-p host:container` a `127.0.0.1:host:container`; flags desconocidos, host explícito ajeno, etiquetas duplicadas o red distinta fallan cerrado. Los streams se reenvían binariamente; no logs de argumentos, entornos o claves. No modifica el binario CLI ni Docker.

Antes de producir browser.env, Start comprueba **bindings reales** de todos los contenedores y gateway fijo; una opción de red no equivale a aislamiento. Si falla, intenta stop únicamente del proyecto con backup y distingue parada confirmada de falla de parada. Ante falla de inspección/stop, no continuar: puede haber puertos expuestos. Nunca generar fixtures en ese estado.

DockerDesktop29.7.2 ignoró host_binding_ipv4 en `-p host:container`, incluso en diagnóstico mínimo fuera CLI. El shim ya demostró binding real `127.0.0.1` en contenedor temporal propio; el contenedor fue retirado sin volúmenes. El estado completo de stack se registra en el handoff, no se infiere de esta prueba.

## URLs y entorno

| Consumidor | URL |
|---|---|
| Navegador ABA | http://localhost:3000 |
| Navegador API/Auth/Storage | http://127.0.0.1:54321 |
| Next dentro Compose | http://supabase_kong_aba-reintegration-local:8000 |
| Studio local | http://127.0.0.1:54323 |
| Mailpit local | http://127.0.0.1:54324 |
| PostgreSQL host | 127.0.0.1:54322 |

Compose `deploy/local.compose.yml` es independiente del despliegue VPS, utiliza red externa ya creada y publica Web solo127.0.0.1:3000. Enmascara `.env`, `.env.local`, `.env.development`, `.env.development.local` del host mediante browser.env RO sin borrar/modificar staging. Browser.env contiene únicamente clave publishable/anon y URLs locales, nunca service-role. Los valores privilegiados CLIstatus se mantienen en memoria. Root fija storageKey de cookies server/proxy a la URL pública para que sesiones no se separen por DockerDNS. URLs firmadas internas solo se traducen si coincide origin interno exacto.

Tras esquema explícito y aprobación del orquestador, `start.ps1` sin SkipWeb inicia Compose. No usar `npm run dev` directo en el checkout con `.env.local` staging; usar Compose aislado. Esta fase no ejecuta suites QA ni pruebas funcionales clínicas.

En R5 el web local usa `next dev --webpack`: con el montaje Windows→Docker,
Turbopack devolvía 404 para la ruta anidada de gráficos aunque el build sí la
incluía. Si una edición de `app/` o `src/` no aparece en el contenedor, reiniciar
**sólo** `web` con `Invoke-LocalCompose @('restart','web')` tras cargar
`scripts/local/common.ps1`; verificar `/api/health` y repetir la ruta afectada.
No reiniciar Database/Auth/Storage ni limpiar `.next` o volúmenes por un fallo
de propagación de archivos. Este diagnóstico y QA constan en
`docs/handoffs/R5_RESULTADOS_EXPORTACIONES.md`.

## Fixtures y cambio de rol real

```powershell
# UUIDv4 NUEVO acordado con el orquestador; no ejecutar antes del esquema.
powershell.exe -NoProfile -File scripts/local/fixtures.ps1 -BatchId 'UUIDV4_DEL_LOTE'
powershell.exe -NoProfile -File scripts/local/switch-role.ps1 -BatchId 'UUIDV4_DEL_LOTE' -Role therapist -Clinic A
```

Fixtures crea 2 clínicas y 8 identidades Auth reales: admin/supervisor/técnico en cada clínica, externo y familia sin membresía general. La cuenta supervisor-a pertenece a ambas clínicas y es la única designada para utilidad de rol. Las credenciales aleatorias sintéticas quedan en `.aba.local/batches/UUID.json`, ignorado Git, nunca en docs ni stdout. app_metadata marca procedencia, **no** autoriza recursos. A4 vinculará externo/familia por fichas/publicaciones, sin inventar pertenencia general.

Reintentar **el mismo lote** recupera create Auth ambiguo por email exacto+batch y verifica estado creating/ready, identidad UUIDv4, clínica/name, perfil/test_run y membresías/roles/status. Un lote cerrado no se reabre. SQL agrupa fixtures en transacción y bloquea/verifica batches abiertos. Divergencias se reportan, no se sobrescriben.

Switch-role reautentica por contraseña con Auth real, verifica batch/user/clinic, bloquea clínica/batch y actualiza exactamente una membresía activa con auditoría en la misma transacción. Si afecta0 filas, aborta/rollback. Conserva otro admin activo; nunca toca cuentas ajenas ni metadata de autorización. Revoca sesión temporal y solo después afirma persistencia. Recargar/iniciar sesión refleja permisos servidor, no simulador.

## Parada, limpieza, respaldo y restauración

ARCHIVOS-013 cuenta con utilidad separada `attachment-cleanup.ps1` / `.mjs`, no
llamada por start/stop/fixtures ni cleanup clínico histórico. Preview por clínica,
lote, operador y retención explícitos; backup antes de apply y autorización ligada
al hash exacto; recibos por objeto y reconcile conservador. Requiere token Auth
admin privado y no concede permisos nuevos a la aplicación. Procedimiento vigente:
docs/runbooks/ATTACHMENT_PHYSICAL_CLEANUP.md. No ejecutar borrado real automáticamente.

```powershell
powershell.exe -NoProfile -File scripts/local/stop.ps1
powershell.exe -NoProfile -File scripts/local/cleanup.ps1 -BatchId 'UUIDV4_DEL_LOTE'
# SOLO tras revisar preview y autorizar limpieza clínica exacta:
powershell.exe -NoProfile -File scripts/local/cleanup.ps1 -BatchId 'UUIDV4_DEL_LOTE' -Confirm 'DELETE TEST DATA UUIDV4_DEL_LOTE'
powershell.exe -NoProfile -File scripts/local/backup.ps1 -BackupId 'UUIDV4_DEL_RESPALDO'
powershell.exe -NoProfile -File scripts/local/restore.ps1 -BackupId 'UUIDV4_DEL_RESPALDO' -TargetContainer 'supabase_db_aba-restore-1234abcd'
```

Stop conserva volúmenes y solo detiene Web/proyecto aislado. Cleanup preview es default; ejecución congela y llama RPC histórica clínica exacta por ambos admins reales. **No es limpieza integral de producto**: retiene Auth, perfiles, avatares, recibos, membresías, clínicas y credenciales. A2–A7/root deben ampliar plan de dependencias y eliminación física Storage/Auth en R5; no simular eliminación total. Se marca `clinical-cleaned`, bloqueando rerun fixtures.

Backup crea dump custom PG completo incluyendo Auth (sensible) bajo `.aba.local/backups`, sin overwrite; un fallo conserva parcial para diagnóstico. Storage físico requiere respaldo separado. Restore preview default, solo destino desechable **vacío** `supabase_db_aba-restore-ID8` con label/volumen exactos, red `none`, cero puertos y Realtime deshabilitado durante inicialización; confirmación `RESTORE ISOLATED TARGET` y `-Apply`. Copia el dump al contenedor, compara SHA-256 y restaura como superusuario conservando owners; rechaza repetir sobre un destino con datos. Nunca DB desarrollo/histórica. El ensayo de DB/Storage, Auth y Storage API está documentado en `docs/handoffs/R5_OPERACION_RESPALDO.md`; la operación independiente de servicios sigue pendiente.

## Estado preparado y sincronización Edge

Estado registrado 2026-09-14: root aplicó38 migraciones sin seeds/reset y regeneró tipos. Lote sintético único2155e99e-bda4-4c68-95cf-b74cacd84ecd ready, dos clínicas/ocho Auth; no crear otro para recuperar errores. Next Compose listo en127.0.0.1:3000. SyncFunctions exit0; serve Edge handle76753 activo, ambos JWTtrue y diez contenedores noEdge conservados. No reiniciar por timeout de observación. Postman Desktop12.28.0 local; no suite creada/ejecutada antesR5.

Las fuentes root revisadas se sincronizan explícitamente, sin tocar servicios:

```powershell
powershell.exe -NoProfile -File scripts/local/configure.ps1 -SyncFunctions -ReviewedBaselinePath .aba.local/functions.reviewed-baseline.json
powershell.exe -NoProfile -File scripts/local/sync-functions.ps1 -Check
powershell.exe -NoProfile -File scripts/local/serve-edge.ps1
# Solo después de revisión/autorización root, proceso foreground de larga duración:
powershell.exe -NoProfile -File scripts/local/serve-edge.ps1 -Apply
```

Manifest y baseline son JSON version1/project aba-reintegration-local/files mapa ruta→SHA256, sin secretos. Destino divergente solo se acepta con hash previo reconocido o baseline explícita exacta revisada; extras/links/env abortan. Config secciones verify_jwt distintas abortan, no overwrite. Snapshot hash .aba.local/functions.snapshot.json; Check/preview no escriben.

CLI2.117 congela lista/config de funciones al crear EdgeRuntime. per_worker no descubre nuevo nombre ni JWTconfig automáticamente. functions serve recrea SOLO Edge y refresca rutas Kong; no reinicia DB/Storage, no borra volúmenes ni lote. Foreground permanece activo; registrar handle y comprobar servicios/bindings reales por separado. No reiniciar por timeout de observación ni llamar Auth como prueba. Nuevas publicaciones pasan por el mismo adapter loopback y PATH solo child.

Entrega inicial/reenvío usan registro durable: pending90s sin reclamar termina failed conocido; claimed expirado unknown requiere constatación Mailpit o autorización explícita de posible duplicado. sent=solicitud aceptada por Auth, no correo recibido ni invitación aceptada. No resetPassword third-party ni exactamente una entrega SMTP garantizada.

## Revisión estática permitida

Forward-fix: preservar Auth, recibos/versiones/auditoría, DB/Storage y lote ante error. No reset ni DROP de datos/ledger ni reapertura batch. Root corrige37/38 mediante migración NUEVA CLI, no historia aplicada; sync solo fuentes Edge revisadas y recreación SOLO Edge. SMTP incierto requiere consultar/resolver, nunca nuevo UUID como retry ciego. Rollback de UI solo a código compatible con schema actual, sin borrar recibos. QA/restauración final R5.

`typecheck.ps1` ejecuta tsc Node22 sin emitir ni cache incremental. JS node--check y ParserPowerShell verifican sintaxis, no son suites clínicas. QA integral/postman se crea y ejecuta únicamente A8/R5.

Fuentes oficiales: [networking Compose](https://docs.docker.com/compose/how-tos/networking/), [CLI2.117 Docker invocation](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/legacy-container-cli.ts), [CLI2.117 port flags](https://github.com/supabase/cli/blob/v2.117.0/apps/cli/src/command-internal/db-bootstrap/docker-create-args.ts).

### Gate R5 por CLI (sin secretos exportados)

`run-postman-r5-newman.mjs` requiere `ABA_QA_POSTMAN_NEWMAN=1`, raíz Desktop y stack local. Usa Newman6.2.1 instalado exclusivamente bajo `.aba.local/qa/newman-runner`; la instalación auxiliar no cambia package.json/lock del producto. Colección original2.1 + variables del lote privado sólo en memoria; no exportar entorno, datos de iteración, respuestas ni sincronizar Postman. El reporte guarda conteos, estados y errores saneados. HTTP36/66 se concilia con READS103/187, no sustituye UI. Newman y JSON/reportes privados permanecen ignorados por Git.

`qa-persistence-v5.mjs before|after .aba.local/qa/persistence-v5/CHECKPOINT.json` requiere `ABA_QA_PERSISTENCE_V5_READ=1` y BASE_URL localhost3001. Before rehúsa sobrescribir, after usa el mismo snapshot y escribe `.after.json`. Root reinicia únicamente servicios exactos tras verificar labels/bindings/mounts; nunca reset, down -v, db restore sobre activo o limpieza automática. Sin otras mutaciones/browser durante comparación. Evidencia/pruebas y límites: docs/handoffs/R5_CLI_GATE_V5.md.

Los helpers attachment-cleanup-apply-v5 y recover-v5 son ensayos de lote exacto autorizados, no arranque ordinario ni comando de limpieza recurrente. No repetir apply de primera vez sobre journal existente. Recuperación sólo destino nuevo vacío y aislado; estados archivados conservados. Para futuras eliminaciones siempre un preview/hash y aprobación específica nuevos.
