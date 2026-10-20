param([Parameter(Mandatory=$true)][string]$BackupId)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
Get-LocalStatus | Out-Null
if ($BackupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$') { throw 'BackupId UUIDv4 requerido.' }
$taskDirectory=Join-Path $LocalState 'backups'
New-Item -ItemType Directory -Force -Path $taskDirectory | Out-Null
$taskPath=Join-Path $taskDirectory "$BackupId.dump"
if(Test-Path -LiteralPath $taskPath){throw 'Respaldo existente; no se sobrescribe.'}
$taskStart=New-Object Diagnostics.ProcessStartInfo
$taskStart.FileName=$Docker
$taskStart.Arguments='exec supabase_db_aba-reintegration-local pg_dump -U postgres -Fc postgres'
$taskStart.UseShellExecute=$false
$taskStart.CreateNoWindow=$true
$taskStart.RedirectStandardOutput=$true
$taskStart.RedirectStandardError=$true
$taskProcess=[Diagnostics.Process]::Start($taskStart)
$taskErrors=$taskProcess.StandardError.ReadToEndAsync()
$taskStream=[IO.File]::Open($taskPath,[IO.FileMode]::CreateNew)
try {$taskProcess.StandardOutput.BaseStream.CopyTo($taskStream)} finally {$taskStream.Dispose()}
$taskProcess.WaitForExit()
if($taskProcess.ExitCode -ne 0){throw 'Respaldo falló; archivo parcial retenido para inspección. No se borró la base.'}
& powershell.exe -NoProfile -File (Join-Path $PSScriptRoot 'backup-services.ps1') -BackupId $BackupId
if($LASTEXITCODE -ne 0){throw 'Dump creado, pero respaldo cifrado de Auth/Storage falló; conservar dump y corregir antes del restore.'}
Write-Host "Dump local creado en $taskPath. Contiene información sensible Auth; no compartir ni versionar. Storage físico requiere respaldo separado por lote y verificación final R5."
