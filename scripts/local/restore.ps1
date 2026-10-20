param([Parameter(Mandatory=$true)][string]$BackupId,[Parameter(Mandatory=$true)][string]$TargetContainer,[string]$Confirm='', [switch]$Apply)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
if($BackupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'){throw 'BackupId UUIDv4 requerido.'}
if($TargetContainer -notmatch '^supabase_db_aba-restore-[0-9a-f]{8}$'){throw 'Solo contenedor DB de proyecto aba-restore-ID8 aislado es destino válido. Nunca desarrollo ni histórico.'}
$taskPath=Join-Path $LocalState "backups/$BackupId.dump"
if(!(Test-Path -LiteralPath $taskPath)){throw 'Respaldo local no encontrado.'}
$taskInspect=(& $Docker inspect --type container $TargetContainer | ConvertFrom-Json)[0]
if($LASTEXITCODE -ne 0 -or $taskInspect.Name -ne "/$TargetContainer" -or $taskInspect.Config.Labels.'com.supabase.cli.project' -ne $TargetContainer.Substring(12)){throw 'Identidad Docker del destino no comprobada.'}
if(!$taskInspect.State.Running -or $taskInspect.HostConfig.NetworkMode -ne 'none'){throw 'El destino debe estar activo y sin red para evitar exposición de datos restaurados.'}
$taskMounts=@($taskInspect.Mounts | Where-Object {$_.Type -eq 'volume' -and $_.Name -eq $TargetContainer -and $_.Destination -eq '/var/lib/postgresql/data'})
if($taskMounts.Count -ne 1 -or @($taskInspect.Mounts).Count -ne 1){throw 'El destino no usa exclusivamente el volumen DB QA esperado.'}
foreach($taskPort in $taskInspect.NetworkSettings.Ports.PSObject.Properties){if($taskPort.Value){throw 'El destino no puede publicar puertos.'}}
$taskEmptyCounts=& $Docker exec $TargetContainer psql -U supabase_admin -d postgres -Atc "select (select count(*) from auth.users)::text||':'||(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r')::text"
if($LASTEXITCODE -ne 0 -or $taskEmptyCounts -ne '0:0'){throw 'Restore exige destino vacío: cero usuarios Auth y cero tablas públicas. No repetir sobre datos restaurados.'}
$taskRealtimeTables=& $Docker exec $TargetContainer psql -U supabase_admin -d postgres -Atc "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='realtime' and c.relkind='r'"
if($LASTEXITCODE -ne 0 -or $taskRealtimeTables -ne '0'){throw 'Inicializa el destino con Realtime deshabilitado; sus particiones impiden el restore --clean.'}
if(!$Apply){Write-Host "Preview: restauraría $taskPath SOLO en $TargetContainer, PG17 sin red ni puertos publicados. QA/restauración se ejecutan únicamente en R5.";exit 0}
if($Confirm -ne "RESTORE ISOLATED $TargetContainer"){throw 'Confirmación de destino aislado no coincide.'}
# Explicit restore may replace objects ONLY in this exact, checked, disposable target.
$taskRealtimeRole=& $Docker exec $TargetContainer psql -U supabase_admin -d postgres -Atc "select 1 from pg_roles where rolname='supabase_realtime_admin' and not rolcanlogin"
if($LASTEXITCODE -ne 0){throw 'No se pudo comprobar el rol Realtime del destino.'}
if($taskRealtimeRole -ne '1'){
    $taskRoleName=& $Docker exec $TargetContainer psql -U supabase_admin -d postgres -Atc "select 1 from pg_roles where rolname='supabase_realtime_admin'"
    if($LASTEXITCODE -ne 0 -or $taskRoleName){throw 'Rol Realtime existente con atributos inesperados.'}
    & $Docker exec $TargetContainer psql -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -Atc 'create role supabase_realtime_admin nologin noinherit' | Out-Null
    if($LASTEXITCODE -ne 0){throw 'No se pudo crear rol gestionado NOLOGIN en destino aislado.'}
}
$taskArchivePath="/tmp/aba-r5-$BackupId.dump"
& $Docker exec $TargetContainer test -e $taskArchivePath
if($LASTEXITCODE -ne 0){& $Docker cp $taskPath "${TargetContainer}:$taskArchivePath";if($LASTEXITCODE -ne 0){throw 'Copia del respaldo al destino aislado falló.'}}
$taskLocalHash=(Get-FileHash -LiteralPath $taskPath -Algorithm SHA256).Hash.ToLowerInvariant()
$taskRemoteHash=((& $Docker exec $TargetContainer sha256sum $taskArchivePath) -split ' ')[0].ToLowerInvariant()
if($LASTEXITCODE -ne 0 -or $taskRemoteHash -ne $taskLocalHash){throw 'SHA-256 del respaldo dentro del destino no coincide.'}
$taskStart=New-Object Diagnostics.ProcessStartInfo
$taskStart.FileName=$Docker
$taskStart.Arguments="exec $TargetContainer pg_restore -U supabase_admin --exit-on-error --clean --if-exists -d postgres $taskArchivePath"
$taskStart.UseShellExecute=$false;$taskStart.CreateNoWindow=$true
$taskStart.RedirectStandardError=$true;$taskStart.RedirectStandardOutput=$true
$taskProcess=[Diagnostics.Process]::Start($taskStart)
$taskErrors=$taskProcess.StandardError.ReadToEndAsync()
$taskOutput=$taskProcess.StandardOutput.ReadToEndAsync()
$taskProcess.WaitForExit()
$taskErrorText=$taskErrors.GetAwaiter().GetResult()
$taskOutput.GetAwaiter().GetResult() | Out-Null
if($taskProcess.ExitCode -ne 0){
    $taskReason=@($taskErrorText -split "`r?`n" | Where-Object {$_ -match '^pg_restore: error:'} | Select-Object -First 1)
    $taskSafeReason=if($taskReason.Count){$taskReason[0].Substring(0,[Math]::Min(350,$taskReason[0].Length))}else{'pg_restore falló; revisar destino aislado.'}
    throw "Restauración no confirmada: $taskSafeReason Destino aislado conserva evidencia parcial; no se reinició desarrollo."
}
Write-Host 'Dump restaurado en destino aislado. Requiere conciliación final R5 y respaldo Storage físico separado; no equivale a QA aprobado.'
