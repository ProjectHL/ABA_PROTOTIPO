param([switch]$SkipWeb)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
if (!(Test-Path -LiteralPath (Join-Path $LocalProject 'supabase/config.toml'))) { throw 'Ejecuta configure.ps1 primero.' }
# Binding loopback applies to the entire local Supabase stack, never to remote services.
& $Docker network inspect $LocalNetwork *> $null
if ($LASTEXITCODE -ne 0) { Invoke-Checked $Docker @('network','create','-o','com.docker.network.bridge.host_binding_ipv4=127.0.0.1',$LocalNetwork) }
$taskPreviousNetwork = [Environment]::GetEnvironmentVariable('SUPABASE_NETWORK_ID','Process')
$taskPreviousPath=$env:PATH
$taskPreviousDocker=[Environment]::GetEnvironmentVariable('ABA_REAL_DOCKER','Process')
$taskPreviousErrorPreference=$ErrorActionPreference
Invoke-Checked 'powershell.exe' @('-NoProfile','-File',(Join-Path $PSScriptRoot 'build-docker-wrapper.ps1'))
try {
    $env:SUPABASE_NETWORK_ID=$LocalNetwork
    $env:ABA_REAL_DOCKER=$Docker
    $env:PATH="$(Join-Path $LocalState 'bin');$taskPreviousPath"
    # Windows PowerShell treats ordinary native stderr progress as errors.
    $ErrorActionPreference='Continue'
    $taskStartup = & $Cli --network-id $LocalNetwork --workdir $LocalProject start 2>&1
    $taskStartupExit=$LASTEXITCODE
} finally {
    [Environment]::SetEnvironmentVariable('SUPABASE_NETWORK_ID',$taskPreviousNetwork,'Process')
    [Environment]::SetEnvironmentVariable('ABA_REAL_DOCKER',$taskPreviousDocker,'Process')
    $env:PATH=$taskPreviousPath
    $ErrorActionPreference=$taskPreviousErrorPreference
}
if ($taskStartupExit -ne 0) {
    $taskAllProgress=($taskStartup | ForEach-Object{[string]$_}) -join "`n"
    $taskAdapterErrors=@([regex]::Matches($taskAllProgress,'A1 Docker loopback adapter: Unknown create/run flag (--?[a-z-]{1,36}|\[withheld\]); values withheld') | ForEach-Object{$_.Value})
    if($taskAdapterErrors){Write-Host ($taskAdapterErrors | Select-Object -Unique)}
    throw 'Arranque Supabase falló. Inspecciona logs localmente sin publicar claves. Datos conservados.'
}
$taskNames=& $Docker ps --filter 'label=com.supabase.cli.project=aba-reintegration-local' --format '{{.Names}}'
if($LASTEXITCODE -ne 0){throw 'No se pudo inspeccionar el stack: aislamiento no confirmado. No generes credenciales ni fixtures; verifica Docker y detén únicamente aba-reintegration-local con backup.'}
$taskUnsafe=!($taskNames -contains 'supabase_kong_aba-reintegration-local')
foreach($taskName in $taskNames) {
    $taskPortsJson=& $Docker inspect --type container $taskName --format '{{json .NetworkSettings.Ports}}'
    if($LASTEXITCODE -ne 0){$taskUnsafe=$true;break}
    try{$taskPorts=$taskPortsJson | ConvertFrom-Json -ErrorAction Stop}catch{$taskUnsafe=$true;break}
    if($taskPorts){foreach($taskProperty in $taskPorts.PSObject.Properties){foreach($taskBinding in $taskProperty.Value){if($taskBinding -and $taskBinding.HostIp -ne '127.0.0.1' -and $taskBinding.HostIp -ne '::1'){$taskUnsafe=$true}}}}
    $taskNetworksJson=& $Docker inspect --type container $taskName --format '{{json .NetworkSettings.Networks}}'
    if($LASTEXITCODE -ne 0){$taskUnsafe=$true;break}
    try{$taskNetworks=$taskNetworksJson | ConvertFrom-Json -ErrorAction Stop}catch{$taskUnsafe=$true;break}
    if(!$taskNetworks){$taskUnsafe=$true;break}
    if(!($taskNetworks.PSObject.Properties.Name -contains $LocalNetwork)){$taskUnsafe=$true}
}
if($taskUnsafe -or !$taskNames) {
    try{$ErrorActionPreference='Continue';$taskStopped=& $Cli stop --workdir $LocalProject --project-id 'aba-reintegration-local' 2>&1;$taskStopExit=$LASTEXITCODE}finally{$ErrorActionPreference=$taskPreviousErrorPreference}
    if($taskStopExit -ne 0){throw 'Stack rechazado; la parada con backup FALLÓ. Puede haber puertos expuestos: requiere detener únicamente aba-reintegration-local y verificar Docker antes de continuar. No se generan credenciales ni fixtures.'}
    $taskRemaining=& $Docker ps --filter 'label=com.supabase.cli.project=aba-reintegration-local' --format '{{.Names}}'
    if($LASTEXITCODE -ne 0 -or $taskRemaining){throw 'CLI devolvió parada, pero Docker no confirma el stack detenido. Puede haber puertos expuestos; no generes credenciales ni fixtures.'}
    throw 'Stack rechazado por binding/red no aislados. Parada con backup confirmada por Docker, sin borrar volúmenes. No se generan credenciales ni fixtures.'
}
& (Join-Path $NodeDir 'node.exe') (Join-Path $PSScriptRoot 'write-env.mjs')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar entorno local.' }
if (!$SkipWeb) { Invoke-LocalCompose @('up','-d','--build') }
Write-Host 'ABA http://localhost:3000; Studio http://127.0.0.1:54323; Mailpit http://127.0.0.1:54324. Datos conservados.'
