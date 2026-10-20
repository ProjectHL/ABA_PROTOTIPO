. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
if (Test-Path -LiteralPath (Join-Path $LocalState 'browser.env')) { Invoke-LocalCompose @('stop') }
Invoke-LocalCli @('stop','--project-id','aba-reintegration-local')
Write-Host 'Servicios detenidos; volúmenes conservados. No reset ni --no-backup.'
