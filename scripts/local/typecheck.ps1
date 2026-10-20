. "$PSScriptRoot/common.ps1"
Assert-LocalTools
Invoke-Checked (Join-Path $NodeDir 'node.exe') @((Join-Path $LocalRoot 'node_modules/typescript/bin/tsc'),'--noEmit','--incremental','false')
