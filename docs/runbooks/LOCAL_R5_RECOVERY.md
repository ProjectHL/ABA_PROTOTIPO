# Recuperación local R5 — DB, Auth y Storage

Ámbito exclusivo: `C:\Users\Moonlabpc\Desktop\ABA\ABA_PROTOTIPO`.
No usar la copia OneDrive ni un proyecto remoto. No ejecutar `db reset`,
`--no-backup`, ni restaurar encima de `aba-reintegration-local`.

## Respaldo

1. Confirmar que Docker y el proyecto local activo están sanos. Elegir un
   `BackupId` UUIDv4 nuevo y ejecutar `scripts/local/backup.ps1 -BackupId ID`.
   Produce `.aba.local/backups/ID.dump` (DB completa con Auth) y
   `ID.services.dpapi` (configuración Auth/Storage cifrada para el usuario
   Windows actual). Ninguno se sobrescribe ni se versiona. Registrar SHA-256
   y tamaño de ambos.
2. Copiar el volumen físico `supabase_storage_aba-reintegration-local` por
   separado. En el ensayo R5 se creó el directorio privado
   `.aba.local/backups/storage-ID` y se ejecutó
   `docker cp supabase_storage_aba-reintegration-local:/mnt/. <directorio>`.
   Comparar el hash agregado de rutas+SHA-256 de todos los archivos en origen
   y copia. El dump SQL sólo conserva metadatos de Storage, nunca los bytes.
3. No sacar el dump ni la copia Storage del equipo sin cifrado adicional.
   DPAPI sólo puede descifrarse con el mismo perfil Windows: conservar la
   capacidad de recuperación de ese perfil o preparar un respaldo externo
   cifrado por un procedimiento separado.

## Ensayo de restore sin tocar el origen

1. Crear un proyecto Supabase local nuevo `aba-restore-ID8` bajo
   `.aba.local/qa/`, con puertos distintos y PG17 de la misma imagen/CLI.
   Deshabilitar migraciones, seed, Realtime y servicios no necesarios en su
   `config.toml`; mantener Auth y Storage para que inicialicen sus esquemas.
   **Antes de `supabase start`, desconectar la red externa o bloquear esos
   puertos**: la CLI 2.117.0 publicó puertos de un proyecto vacío en todas las
   interfaces aun con una red Docker configurada para loopback. Arrancar sólo
   el destino vacío, comprobar 0 usuarios Auth/0 tablas públicas y detenerlo
   con `supabase stop --project-id aba-restore-ID8` (sin `--no-backup`). Nunca
   restaurar datos mientras el stack CLI esté publicado.
2. Montar **sólo el volumen DB de ese destino** en un contenedor PostgreSQL
   con nombre `supabase_db_aba-restore-ID8`, etiqueta
   `com.supabase.cli.project=aba-restore-ID8`, `--network none`, sin `-p` y
   misma imagen PG17. El ensayo usó `public.ecr.aws/supabase/postgres:17.6.1.167`
   con `/var/lib/postgresql/data`; verificar nombre, volumen, etiqueta, red y
   cero puertos con `docker inspect` antes de continuar.
3. `scripts/local/restore.ps1 -BackupId ID -TargetContainer
   supabase_db_aba-restore-ID8` muestra preview. Sólo tras revisar el destino,
   repetir con `-Confirm 'RESTORE ISOLATED supabase_db_aba-restore-ID8' -Apply`.
   El script rechaza origen, destino no vacío, Realtime preinicializado, red o
   puertos; verifica SHA-256 del dump copiado al contenedor y preserva owners.
   Un fallo conserva destino parcial: no reintentar encima de él.
4. Copiar los archivos del directorio privado `storage-ID` al volumen vacío
   `supabase_storage_aba-restore-ID8` usando un contenedor auxiliar
   `--network none`, montaje de copia `:ro` y montaje de volumen destino. En
   R5 se usó `cp -a /from/. /to/`; antes se comprobó 0 archivos destino y
   después coincidieron conteo, tamaño y hash agregado con origen/copia.
   Nunca copiar sobre un volumen con objetos.
5. Ejecutar con **PowerShell 7**:

   ```powershell
   pwsh.exe -NoProfile -File scripts/local/start-restored-services.ps1 -BackupId 'ID' -TargetProject 'aba-restore-ID8'
   pwsh.exe -NoProfile -File scripts/local/start-restored-services.ps1 -BackupId 'ID' -TargetProject 'aba-restore-ID8' -Confirm 'START ISOLATED aba-restore-ID8' -Apply
   ```

   El script descifra `ID.services.dpapi` del usuario actual, redirige las URL
   DB al destino, inicia Auth/Storage con la DB `--network none` y comprueba
   `/health` y `/status` HTTP 200 internamente. Windows PowerShell 5.1 no pasa
   de forma fiable estas variables a Docker y se rechaza explícitamente.
6. Conciliar sin publicar datos: conteos exactos por tabla y fingerprint,
   usuarios Auth, historial de migraciones, RLS pública, constraints y
   membresías huérfanas. Descargar objetos sintéticos por la API interna de
   Storage y comparar tamaño/SHA. El ensayo de referencia está en
   `docs/handoffs/R5_OPERACION_RESPALDO.md`.

El destino restaurado permanece sin acceso de red; este runbook valida
recuperabilidad local, no una promoción ni conmutación automática de usuarios.
No arrancar con `supabase start` ese destino ya restaurado hasta resolver la
vinculación de puertos. Chat y R6 no forman parte del cierre local.
