param([Parameter(Mandatory=$true)][string]$BatchId)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
if ($BatchId -notmatch '^[0-9a-fA-F-]{36}$') { throw 'BatchId UUID requerido.' }
Get-LocalStatus | Out-Null
Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $PSScriptRoot 'fixtures.mjs'),$BatchId)
