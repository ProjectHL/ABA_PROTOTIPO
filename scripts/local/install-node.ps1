. "$PSScriptRoot/common.ps1"
$taskVersion = 'v22.23.2'
$taskArchive = 'node-v22.23.2-win-x64.zip'
$taskRuntime = Join-Path $LocalRoot '.runtime.local'
if (Test-Path -LiteralPath (Join-Path $NodeDir 'node.exe')) { Write-Host 'Node22 portátil ya presente.'; exit 0 }
$taskChecks = (Invoke-WebRequest "https://nodejs.org/dist/$taskVersion/SHASUMS256.txt").Content
$taskLine = $taskChecks -split "`n" | Where-Object { $_ -match "  $taskArchive$" }
$taskExpected = $taskLine.Split(' ')[0]
if ($taskExpected -notmatch '^[a-f0-9]{64}$') { throw 'Checksum oficial no encontrado.' }
New-Item -ItemType Directory -Force -Path $taskRuntime | Out-Null
Invoke-WebRequest "https://nodejs.org/dist/$taskVersion/$taskArchive" -OutFile (Join-Path $taskRuntime $taskArchive)
if ((Get-FileHash -LiteralPath (Join-Path $taskRuntime $taskArchive) -Algorithm SHA256).Hash.ToLower() -ne $taskExpected) { throw 'Checksum Node no coincide; no se instalará.' }
Expand-Archive -LiteralPath (Join-Path $taskRuntime $taskArchive) -DestinationPath $taskRuntime
Invoke-Checked (Join-Path $NodeDir 'node.exe') @('--version')
