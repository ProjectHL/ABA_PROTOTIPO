param([string]$ReviewedBaselinePath,[switch]$Check)
. "$PSScriptRoot/common.ps1"
# Source tree is reviewed by root. No services, migrations or secrets are touched.
$taskConfigPath=Join-Path $LocalProject 'supabase/config.toml'
$taskConfig=Get-Content -LiteralPath $taskConfigPath -Raw
if($taskConfig -notmatch '(?m)^project_id\s*=\s*"aba-reintegration-local"\s*$'){throw 'Proyecto aislado incorrecto.'}
$taskSource=Join-Path $LocalRoot 'supabase/functions'
$taskTarget=Join-Path $LocalProject 'supabase/functions'
$taskManifestPath=Join-Path $LocalState 'functions.snapshot.json'
function Read-Hashes([string]$Path){
    $taskResult=@{}
    if(!$Path){return $taskResult}
    $taskDocument=Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json -ErrorAction Stop
    if($taskDocument.version -ne 1 -or $taskDocument.project -ne $LocalNetwork){throw 'Manifest de funciones inválido.'}
    foreach($taskProperty in $taskDocument.files.PSObject.Properties){
        if($taskProperty.Name -notmatch '^[a-z0-9][a-z0-9_-]*/[a-zA-Z0-9_./-]+$' -or $taskProperty.Name -match '(^|/)\.\.(/|$)' -or $taskProperty.Value -notmatch '^[0-9a-fA-F]{64}$'){throw 'Hash o ruta de función inválidos.'}
        $taskResult[$taskProperty.Name]=[string]$taskProperty.Value
    }
    return $taskResult
}
$taskKnown=if(Test-Path -LiteralPath $taskManifestPath){Read-Hashes $taskManifestPath}else{@{}}
$taskReviewed=Read-Hashes $ReviewedBaselinePath
$taskNext=@{}; $taskPlan=@(); $taskConfigAppend=''
$taskFiles=@(Get-ChildItem -LiteralPath $taskSource -Recurse -File -Force)
if(!$taskFiles){throw 'No hay fuentes de funciones revisadas.'}
foreach($taskItem in @(Get-ChildItem -LiteralPath $taskSource -Recurse -Force)+@(Get-Item -LiteralPath $taskSource)){
    if($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'No se permiten enlaces en fuentes Edge.'}
}
if(Test-Path -LiteralPath $taskTarget){foreach($taskItem in @(Get-ChildItem -LiteralPath $taskTarget -Recurse -Force)+@(Get-Item -LiteralPath $taskTarget)){
    if($taskItem.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'No se permiten enlaces en destino Edge.'}
}}
foreach($taskFile in $taskFiles){
    $taskRelative=$taskFile.FullName.Substring($taskSource.Length+1).Replace('\','/')
    if($taskRelative -notmatch '^[a-z0-9][a-z0-9_-]*/[a-zA-Z0-9_./-]+$' -or $taskRelative -match '(^|/)\.' -or $taskFile.Extension -notin @('.ts','.js','.json','.html','.css')){throw 'Fuente Edge no permitida; no se copian env ni archivos ocultos.'}
    $taskNewHash=(Get-FileHash -LiteralPath $taskFile.FullName -Algorithm SHA256).Hash
    $taskDestination=Join-Path $taskTarget $taskRelative
    if(Test-Path -LiteralPath $taskDestination){
        $taskOldHash=(Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash
        if($taskOldHash -ne $taskNewHash -and $taskOldHash -ne $taskKnown[$taskRelative] -and $taskOldHash -ne $taskReviewed[$taskRelative]){throw 'Drift local Edge no reconocido. Revisar hash y aportar baseline explícita; no overwrite.'}
    }
    $taskNext[$taskRelative]=$taskNewHash
    $taskPlan+=@{Source=$taskFile.FullName;Target=$taskDestination;Hash=$taskNewHash}
}
if(Test-Path -LiteralPath $taskTarget){foreach($taskFile in Get-ChildItem -LiteralPath $taskTarget -Recurse -File -Force){
    $taskRelative=$taskFile.FullName.Substring($taskTarget.Length+1).Replace('\','/')
    if(!$taskNext.ContainsKey($taskRelative)){throw 'Archivo Edge aislado no presente en fuentes. No se elimina ni se ignora drift.'}
}}
foreach($taskSlug in @($taskNext.Keys | ForEach-Object{($_ -split '/')[0]} | Select-Object -Unique)){
    $taskPattern='(?ms)^\[functions\.'+[regex]::Escape($taskSlug)+'\]\s*\r?\n(?<body>.*?)(?=^\[|\z)'
    $taskSection=[regex]::Match($taskConfig,$taskPattern)
    if($taskSection.Success){
        $taskVerification=@([regex]::Matches($taskSection.Groups['body'].Value,'(?m)^verify_jwt\s*=\s*(true|false)\s*(?:#.*)?$'))
        if($taskVerification.Count -ne 1 -or $taskVerification[0].Groups[1].Value -ne 'true'){throw 'Sección Edge existente distinta de verify_jwt=true: requiere revisión explícita, no overwrite.'}
    }else{$taskConfigAppend+="`n[functions.$taskSlug]`nverify_jwt = true`n"}
}
# All drift/config guards pass before the first copy. Preserve recognised old hashes
# if a copy is interrupted, allowing exact recovery without accepting arbitrary drift.
if($Check){
    if($taskConfigAppend -or $taskKnown.Count -ne $taskNext.Count){throw 'Snapshot/config Edge no sincronizados; ejecutar sync explícito.'}
    foreach($taskEntry in $taskPlan){
        $taskRelative=$taskEntry.Source.Substring($taskSource.Length+1).Replace('\','/')
        if(!(Test-Path -LiteralPath $taskEntry.Target) -or $taskKnown[$taskRelative] -ne $taskEntry.Hash -or (Get-FileHash -LiteralPath $taskEntry.Target -Algorithm SHA256).Hash -ne $taskEntry.Hash){throw 'Snapshot/fuentes Edge no coinciden. No servir cambios no sincronizados.'}
    }
    Write-Host 'Snapshot Edge y configuración verificados sin escrituras.'
    exit 0
}
foreach($taskEntry in $taskPlan){
    New-Item -ItemType Directory -Force -Path ([IO.Path]::GetDirectoryName($taskEntry.Target)) | Out-Null
    Copy-Item -LiteralPath $taskEntry.Source -Destination $taskEntry.Target
    if((Get-FileHash -LiteralPath $taskEntry.Target -Algorithm SHA256).Hash -ne $taskEntry.Hash){throw 'Hash de copia Edge no coincide. Servicios no modificados.'}
}
if($taskConfigAppend){[IO.File]::AppendAllText($taskConfigPath,$taskConfigAppend)}
$taskManifest=@{version=1;project=$LocalNetwork;files=$taskNext}
[IO.File]::WriteAllText($taskManifestPath,($taskManifest | ConvertTo-Json -Depth 4))
Write-Host 'Fuentes Edge sincronizadas con hashes; verify_jwt=true. No se reinició ningún servicio. Nuevos nombres/config requieren recrear SOLO Edge explícitamente.'
