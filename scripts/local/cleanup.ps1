param([Parameter(Mandatory=$true)][string]$BatchId,[string]$Confirm='')
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
Get-LocalStatus | Out-Null
Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $PSScriptRoot 'cleanup.mjs'),$BatchId,$Confirm)
