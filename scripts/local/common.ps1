Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:LocalRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$script:LocalState = Join-Path $LocalRoot '.aba.local'
$script:LocalProject = Join-Path $LocalState 'stack'
$script:LocalNetwork = 'aba-reintegration-local'
$script:NodeDir = Join-Path $LocalRoot '.runtime.local/node-v22.23.2-win-x64'
$script:Docker = Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'
if (!(Test-Path -LiteralPath (Join-Path $LocalRoot 'SPEC_REINTEGRACION_TOTAL_ABA_LOCAL.md'))) { throw 'No es el checkout ABA autorizado.' }
function Invoke-Checked([string]$Exe, [string[]]$Arguments) {
    $taskErrorPreference=$ErrorActionPreference
    try{$ErrorActionPreference='Continue';& $Exe @Arguments;$taskExit=$LASTEXITCODE}finally{$ErrorActionPreference=$taskErrorPreference}
    if ($taskExit -ne 0) { throw "$Exe terminó con código $taskExit." }
}
function Assert-LocalTools([switch]$Engine) {
    if (!(Test-Path -LiteralPath (Join-Path $NodeDir 'node.exe'))) { throw 'Falta Node22 portátil. Ejecuta install-node.ps1.' }
    $env:PATH = "$NodeDir;$([IO.Path]::GetDirectoryName($Docker));$env:PATH"
    if ((& (Join-Path $NodeDir 'node.exe') --version) -ne 'v22.23.2') { throw 'Se requiere Node22.23.2.' }
    $script:Cli = Join-Path $LocalRoot 'node_modules/.bin/supabase.cmd'
    if (!(Test-Path -LiteralPath $Cli)) { throw 'Falta instalación con npm ci y lock existente.' }
    if ((& $Cli --version) -ne '2.117.0') { throw 'Supabase CLI debe ser 2.117.0.' }
    if (!(Test-Path -LiteralPath $Docker)) { throw 'Docker Desktop per-user no encontrado.' }
    if ($Engine) {
        $taskEngine = & $Docker info --format '{{.ServerVersion}}' 2>$null
        if ($LASTEXITCODE -ne 0 -or !$taskEngine) { throw 'Docker instalado, pero motor Linux no operativo. Abre Docker Desktop y revisa WSL2. No se modificará configuración del sistema.' }
    }
}
function Get-LocalStatus {
    $taskConfig=Get-Content -LiteralPath (Join-Path $LocalProject 'supabase/config.toml') -Raw
    if($taskConfig -notmatch '(?m)^project_id\s*=\s*"aba-reintegration-local"\s*$'){throw 'Identidad de proyecto aislado inesperada.'}
    $taskContainers=& $Docker ps --filter 'label=com.supabase.cli.project=aba-reintegration-local' --format '{{.Names}}'
    if($LASTEXITCODE -ne 0 -or !$taskContainers -or !($taskContainers -contains 'supabase_db_aba-reintegration-local') -or !($taskContainers -contains 'supabase_kong_aba-reintegration-local')){throw 'Stack aislado Docker no confirmado.'}
    foreach($taskContainer in $taskContainers){
        $taskNetworkJson=& $Docker inspect --type container $taskContainer --format '{{json .NetworkSettings}}'
        if($LASTEXITCODE -ne 0){throw 'Inspección Docker falló: no hay confirmación de aislamiento.'}
        $taskNetwork=$taskNetworkJson | ConvertFrom-Json -ErrorAction Stop
        if(!$taskNetwork -or !($taskNetwork.Networks.PSObject.Properties.Name -contains $LocalNetwork)){throw 'Red aislada no confirmada.'}
        foreach($taskProperty in $taskNetwork.Ports.PSObject.Properties){foreach($taskBinding in $taskProperty.Value){if($taskBinding -and $taskBinding.HostIp -notin @('127.0.0.1','::1')){throw 'Puertos no aislados: operación rechazada sin generar credenciales.'}}}
    }
    $taskErrorPreference=$ErrorActionPreference
    try{$ErrorActionPreference='Continue';$taskStatus = & $Cli status --workdir $LocalProject -o json 2>$null;$taskExit=$LASTEXITCODE}finally{$ErrorActionPreference=$taskErrorPreference}
    if ($taskExit -ne 0) { throw 'Stack local no disponible; no se ejecutó reset ni limpieza.' }
    $taskData = $taskStatus | ConvertFrom-Json
    if ($taskData.API_URL -ne 'http://127.0.0.1:54321') { throw 'API local inesperada. Destino rechazado.' }
    return $taskData
}
function Invoke-LocalCli([string[]]$Arguments) {
    Invoke-Checked $Cli ($Arguments + @('--workdir', $LocalProject))
}
function Invoke-LocalCompose([string[]]$Arguments) {
    Invoke-Checked $Docker (@('compose','--project-name','aba-local','--env-file',(Join-Path $LocalState 'browser.env'),'-f',(Join-Path $LocalRoot 'deploy/local.compose.yml')) + $Arguments)
}
