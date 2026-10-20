param(
  [Parameter(Mandatory=$true)][ValidateSet('preview','backup','apply','reconcile')][string]$Mode,
  [string]$ClinicId='', [string]$BatchId='', [string]$ActorId='',
  [int]$RetentionDays=0, [switch]$OperationsSettled,
  [string]$PreviewId='', [string]$Confirm=''
)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
Get-LocalStatus | Out-Null
if($Mode -eq 'preview') {
  if(!$OperationsSettled -or $RetentionDays -lt 1){throw 'Retención explícita y operaciones inciertas resueltas requeridas.'}
  Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $PSScriptRoot 'attachment-cleanup.mjs'),'preview',$ClinicId,$BatchId,$ActorId,[string]$RetentionDays,'SETTLED')
} elseif($Mode -eq 'apply') {
  if(!$Confirm){throw 'Autorización específica del preview requerida. No eliminado.'}
  Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $PSScriptRoot 'attachment-cleanup.mjs'),'apply',$PreviewId,$Confirm)
} else {
  Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $PSScriptRoot 'attachment-cleanup.mjs'),$Mode,$PreviewId)
}
