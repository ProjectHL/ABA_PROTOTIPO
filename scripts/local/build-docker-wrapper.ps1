. "$PSScriptRoot/common.ps1"
# Windows PowerShell compiles a standalone .NET Framework console executable.
if($PSVersionTable.PSEdition -ne 'Desktop'){throw 'Invoca este compilador mediante powershell.exe, no pwsh.'}
$taskBin=Join-Path $LocalState 'bin'
New-Item -ItemType Directory -Path $taskBin -Force | Out-Null
$taskOutput=Join-Path $taskBin 'docker.exe'
$taskHash=Join-Path $taskBin 'docker.source.sha256'
$taskSource=Join-Path $PSScriptRoot 'DockerLoopback.cs'
$taskSourceHash=(Get-FileHash -LiteralPath $taskSource -Algorithm SHA256).Hash
if((Test-Path -LiteralPath $taskOutput) -and (Test-Path -LiteralPath $taskHash) -and (Get-Content -LiteralPath $taskHash -Raw).Trim() -eq $taskSourceHash){exit 0}
if(Test-Path -LiteralPath $taskOutput){Remove-Item -LiteralPath $taskOutput}
Add-Type -TypeDefinition (Get-Content -LiteralPath $taskSource -Raw) -Language CSharp -OutputAssembly $taskOutput -OutputType ConsoleApplication
[IO.File]::WriteAllText($taskHash,$taskSourceHash)
