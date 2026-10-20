param([switch]$Apply)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
$taskStatus=Get-LocalStatus
$taskConfig=Get-Content -LiteralPath (Join-Path $LocalProject 'supabase/config.toml') -Raw
foreach($taskSlug in @('invite-clinic-member','resend-clinic-invitation','verify-attachment-upload')){
    $taskPattern='(?ms)^\[functions\.'+[regex]::Escape($taskSlug)+'\]\s*\r?\n(?<body>.*?)(?=^\[|\z)'
    $taskSection=[regex]::Match($taskConfig,$taskPattern)
    if(!$taskSection.Success -or $taskSection.Groups['body'].Value -notmatch '(?m)^verify_jwt\s*=\s*true\s*$'){throw 'Sin configuración JWT verificada: no servir Edge.'}
}
if(!(Test-Path -LiteralPath (Join-Path $LocalState 'functions.snapshot.json'))){throw 'Sin snapshot revisado; ejecutar configure -SyncFunctions primero.'}
# Check only: preview/serve must not synchronise unreviewed changes implicitly.
& "$PSScriptRoot/sync-functions.ps1" -Check
if(!$Apply){Write-Host 'PREVIEW: CLI2.117 functions serve recreará SOLO EdgeRuntime y refrescará rutas Kong. DB/Storage/volúmenes/lote permanecen. Requiere -Apply explícito; proceso foreground permanece activo hasta interrupción.';exit 0}
Invoke-Checked 'powershell.exe' @('-NoProfile','-File',(Join-Path $PSScriptRoot 'build-docker-wrapper.ps1'))
$taskEmptyEnv=Join-Path $LocalState 'edge.empty.env'
if(Test-Path -LiteralPath $taskEmptyEnv){if((Get-Item -LiteralPath $taskEmptyEnv).Length -ne 0){throw 'Env Edge vacío divergente: revisar, no overwrite.'}}
else{[IO.File]::WriteAllText($taskEmptyEnv,'')}
$taskPreviousNetwork=[Environment]::GetEnvironmentVariable('SUPABASE_NETWORK_ID','Process')
$taskPreviousDocker=[Environment]::GetEnvironmentVariable('ABA_REAL_DOCKER','Process')
$taskPreviousPath=$env:PATH;$taskPreviousErrorPreference=$ErrorActionPreference
try{
    $env:SUPABASE_NETWORK_ID=$LocalNetwork;$env:ABA_REAL_DOCKER=$Docker
    $env:PATH="$(Join-Path $LocalState 'bin');$taskPreviousPath"
    $ErrorActionPreference='Continue'
    # No debug; stdout/stderr stay in memory, never publish SDK errors or keys.
    $taskProgress=& $Cli --network-id $LocalNetwork --workdir $LocalProject functions serve --env-file $taskEmptyEnv 2>&1
    $taskExit=$LASTEXITCODE
}finally{
    [Environment]::SetEnvironmentVariable('SUPABASE_NETWORK_ID',$taskPreviousNetwork,'Process')
    [Environment]::SetEnvironmentVariable('ABA_REAL_DOCKER',$taskPreviousDocker,'Process')
    $env:PATH=$taskPreviousPath;$ErrorActionPreference=$taskPreviousErrorPreference
}
if($taskExit -ne 0){throw 'Serve Edge terminó sin éxito. No reiniciar a ciegas: revisar categoría local y estado SOLO Edge; datos conservados.'}
Write-Host 'Proceso serve Edge terminó exit0; verificar estado antes de declarar disponible. Sin reset ni seeds.'
