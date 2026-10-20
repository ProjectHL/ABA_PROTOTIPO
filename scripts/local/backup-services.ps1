param([Parameter(Mandatory=$true)][string]$BackupId)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
Get-LocalStatus | Out-Null
if($BackupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'){throw 'BackupId UUIDv4 requerido.'}
$taskDump=Join-Path $LocalState "backups/$BackupId.dump"
if(!(Test-Path -LiteralPath $taskDump)){throw 'Primero crea el dump DB con el mismo BackupId.'}
$taskPath=Join-Path $LocalState "backups/$BackupId.services.dpapi"
if(Test-Path -LiteralPath $taskPath){throw 'Configuración de servicios ya respaldada; no se sobrescribe.'}
$taskServices=[ordered]@{}
foreach($taskKind in @('auth','storage')){
    $taskName="supabase_${taskKind}_aba-reintegration-local"
    $taskInspect=(& $Docker inspect --type container $taskName | ConvertFrom-Json)[0]
    if($LASTEXITCODE -ne 0 -or $taskInspect.Name -ne "/$taskName" -or !$taskInspect.State.Running -or $taskInspect.Config.Labels.'com.supabase.cli.project' -ne 'aba-reintegration-local'){throw "Servicio $taskKind de origen no comprobado."}
    $taskServices[$taskKind]=[ordered]@{image=$taskInspect.Config.Image;command=@($taskInspect.Config.Cmd);environment=@($taskInspect.Config.Env)}
}
$taskPayload=[ordered]@{schemaVersion=1;sourceProject='aba-reintegration-local';backupId=$BackupId;capturedAt=[DateTime]::UtcNow.ToString('o');services=$taskServices}
$taskJson=$taskPayload | ConvertTo-Json -Depth 8 -Compress
Add-Type -AssemblyName System.Security
$taskBytes=[Text.Encoding]::UTF8.GetBytes($taskJson)
$taskEncrypted=[Security.Cryptography.ProtectedData]::Protect($taskBytes,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$taskStream=[IO.File]::Open($taskPath,[IO.FileMode]::CreateNew)
try{$taskStream.Write($taskEncrypted,0,$taskEncrypted.Length)}finally{$taskStream.Dispose()}
$taskRoundTrip=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskPath),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
if(([Text.Encoding]::UTF8.GetString($taskRoundTrip) | ConvertFrom-Json).backupId -ne $BackupId){throw 'Verificación de configuración cifrada falló.'}
Write-Host "Configuración Auth/Storage cifrada con DPAPI del usuario actual en $taskPath. No compartir ni versionar; conservar también la clave/perfil de recuperación antes de moverla a otro equipo."
