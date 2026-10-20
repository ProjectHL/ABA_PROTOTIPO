. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
$taskStatus = Get-LocalStatus
Write-Host "API $($taskStatus.API_URL); Studio http://127.0.0.1:54323; Mailpit http://127.0.0.1:54324"
# Never display status env/json directly: it contains service-role and DB credentials.
if (Test-Path -LiteralPath (Join-Path $LocalState 'browser.env')) { Invoke-LocalCompose @('ps') }
