param([Parameter(Mandatory=$true)][string]$BatchId,[Parameter(Mandatory=$true)][ValidateSet('admin','supervisor','therapist')][string]$Role,[ValidateSet('A','B')][string]$Clinic='A')
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
Get-LocalStatus | Out-Null
Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $PSScriptRoot 'switch-role.mjs'),$BatchId,$Role,$Clinic)
