param([switch]$Apply)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/local/common.ps1"
Assert-LocalTools -Engine

# Schema installation is explicit and separate from start/stop/fixtures. Never reset.
$taskConfigPath = Join-Path $LocalProject 'supabase/config.toml'
if (!(Test-Path -LiteralPath $taskConfigPath)) { throw 'Configura primero el stack aislado.' }
$taskConfig = Get-Content -LiteralPath $taskConfigPath -Raw
if ($taskConfig -notmatch '(?m)^project_id\s*=\s*"aba-reintegration-local"\s*$') { throw 'Proyecto aislado incorrecto; esquema rechazado.' }
if ($taskConfig -notmatch '(?ms)^\[db\]\r?\n(?<db>.*?)(?=^\[|\z)') { throw 'Sección DB aislada ausente.' }
$taskDbSection = $Matches.db
if ($taskDbSection -notmatch '(?m)^port\s*=\s*54322\s*$') { throw 'Puerto DB aislado incorrecto.' }
if ($taskConfig -notmatch '(?ms)\[db.seed\]\s*(?:#[^\r\n]*\r?\n\s*)*enabled\s*=\s*false') { throw 'El stack aislado debe tener seeds automáticos deshabilitados.' }
$null = Get-LocalStatus

# Verify the running Docker target, not merely a loopback URL reported by CLI.
# Restrict inspection to non-secret projections; never print container env/status keys.
$taskDbName = 'supabase_db_aba-reintegration-local'
$taskDbRunning = & $Docker inspect --type container $taskDbName --format '{{.State.Running}}' 2>$null
if ($LASTEXITCODE -ne 0 -or $taskDbRunning -ne 'true') { throw 'PostgreSQL del proyecto aislado no está operativo; esquema rechazado.' }
$taskLabelsJson = & $Docker inspect --type container $taskDbName --format '{{json .Config.Labels}}' 2>$null
if ($LASTEXITCODE -ne 0 -or !$taskLabelsJson) { throw 'No se pudo verificar la etiqueta del contenedor DB.' }
$taskLabels = $taskLabelsJson | ConvertFrom-Json
if ($taskLabels.'com.supabase.cli.project' -ne 'aba-reintegration-local') { throw 'Identidad del contenedor DB incorrecta; esquema rechazado.' }
$taskPortJson = & $Docker inspect --type container $taskDbName --format '{{json .NetworkSettings.Ports}}' 2>$null
if ($LASTEXITCODE -ne 0 -or !$taskPortJson) { throw 'No se pudieron verificar los puertos PostgreSQL.' }
$taskPorts = $taskPortJson | ConvertFrom-Json
$taskDbBindings = @($taskPorts.'5432/tcp')
if (!$taskDbBindings.Count) { throw 'PostgreSQL aislado sin binding comprobable.' }
foreach ($taskBinding in $taskDbBindings) {
    if (!$taskBinding -or $taskBinding.HostPort -ne '54322' -or $taskBinding.HostIp -notin @('127.0.0.1','::1')) { throw 'PostgreSQL no está limitado al destino local esperado; esquema rechazado.' }
}
$taskNetworkJson = & $Docker inspect --type container $taskDbName --format '{{json .NetworkSettings.Networks}}' 2>$null
if ($LASTEXITCODE -ne 0 -or !$taskNetworkJson) { throw 'No se pudo verificar la red aislada.' }
$taskNetworks = $taskNetworkJson | ConvertFrom-Json
if ($taskNetworks.PSObject.Properties.Name -notcontains $LocalNetwork) { throw 'PostgreSQL no pertenece a la red aislada; esquema rechazado.' }

$taskSource = Join-Path $LocalRoot 'supabase/migrations'
$taskTarget = Join-Path $LocalProject 'supabase/migrations'
$taskFiles = @(Get-ChildItem -LiteralPath $taskSource -File -Filter '*.sql' | Sort-Object Name)
if (!$taskFiles.Count) { throw 'No hay migraciones aprobadas por el orquestador.' }
if (@($taskFiles | Where-Object { $_.Name -notmatch '^\d{14}_[a-z0-9_]+\.sql$' }).Count) { throw 'Nombre de migración no válido.' }
$taskVersions = @($taskFiles | ForEach-Object { $_.Name.Substring(0,14) })
if (@($taskVersions | Select-Object -Unique).Count -ne $taskVersions.Count) { throw 'Versiones de migración duplicadas.' }

# Refuse drift before copying anything. Existing migration history/files are never rewritten.
if (Test-Path -LiteralPath $taskTarget) {
    foreach ($taskExisting in Get-ChildItem -LiteralPath $taskTarget -File -Filter '*.sql') {
        $taskOriginal = Join-Path $taskSource $taskExisting.Name
        if (!(Test-Path -LiteralPath $taskOriginal)) { throw "Migración local extra: $($taskExisting.Name). Revisión manual requerida." }
        if ((Get-FileHash -LiteralPath $taskOriginal -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $taskExisting.FullName -Algorithm SHA256).Hash) { throw "Migración local divergente: $($taskExisting.Name). No se sobrescribe." }
    }
}
New-Item -ItemType Directory -Force -Path $taskTarget | Out-Null
foreach ($taskFile in $taskFiles) {
    $taskDestination = Join-Path $taskTarget $taskFile.Name
    if (!(Test-Path -LiteralPath $taskDestination)) { Copy-Item -LiteralPath $taskFile.FullName -Destination $taskDestination }
    if ((Get-FileHash -LiteralPath $taskFile.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash) { throw 'La copia no coincide; no se aplicará esquema.' }
}
Write-Host "Migraciones sincronizadas: $($taskFiles.Count). Proyecto: aba-reintegration-local. Sin seeds ni reset."
if ($Apply) {
    Invoke-LocalCli @('db','push','--local','--skip-vault')
    Write-Host 'Comando de aplicación finalizado. Esto no implica QA aprobado.'
} else {
    Invoke-LocalCli @('db','push','--local','--skip-vault','--dry-run')
    Write-Host 'Solo planificación. Aplicación explícita por orquestador: local:schema -- -Apply.'
}
