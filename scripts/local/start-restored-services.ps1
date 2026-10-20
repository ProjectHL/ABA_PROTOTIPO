param(
    [Parameter(Mandatory=$true)][string]$BackupId,
    [Parameter(Mandatory=$true)][string]$TargetProject,
    [string]$Confirm='',
    [switch]$Apply
)
if($PSVersionTable.PSVersion.Major -lt 7){throw 'Este arranque requiere PowerShell 7 para pasar variables nativas a Docker sin fragmentarlas.'}
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
if($BackupId -notmatch '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$'){throw 'BackupId UUIDv4 requerido.'}
if($TargetProject -notmatch '^aba-restore-[0-9a-f]{8}$'){throw 'Sólo se admite proyecto local aba-restore-ID8.'}
$taskDb="supabase_db_$TargetProject"
$taskServicesPath=Join-Path $LocalState "backups/$BackupId.services.dpapi"
if(!(Test-Path -LiteralPath $taskServicesPath)){throw 'Configuración cifrada de servicios no encontrada.'}
Add-Type -AssemblyName System.Security
$taskPlain=[Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($taskServicesPath),$null,[Security.Cryptography.DataProtectionScope]::CurrentUser)
$taskConfig=[Text.Encoding]::UTF8.GetString($taskPlain) | ConvertFrom-Json
if($taskConfig.schemaVersion -ne 1 -or $taskConfig.backupId -ne $BackupId -or $taskConfig.sourceProject -ne 'aba-reintegration-local' -or !$taskConfig.services.auth -or !$taskConfig.services.storage){throw 'Configuración de respaldo incompatible.'}
$taskInspect=(& $Docker inspect --type container $taskDb | ConvertFrom-Json)[0]
if($LASTEXITCODE -ne 0 -or $taskInspect.Name -ne "/$taskDb" -or !$taskInspect.State.Running -or $taskInspect.Config.Labels.'com.supabase.cli.project' -ne $TargetProject -or $taskInspect.HostConfig.NetworkMode -ne 'none'){throw 'DB restaurada exacta, activa y sin red no comprobada.'}
$taskMounts=@($taskInspect.Mounts | Where-Object {$_.Type -eq 'volume' -and $_.Name -eq $taskDb -and $_.Destination -eq '/var/lib/postgresql/data'})
if($taskMounts.Count -ne 1 -or @($taskInspect.Mounts).Count -ne 1){throw 'Volumen DB restaurado no comprobado.'}
foreach($taskPort in $taskInspect.NetworkSettings.Ports.PSObject.Properties){if($taskPort.Value){throw 'DB restaurada no puede publicar puertos.'}}
$taskStorageVolume="supabase_storage_$TargetProject"
$taskVolume=(& $Docker volume inspect $taskStorageVolume | ConvertFrom-Json)[0]
if($LASTEXITCODE -ne 0 -or $taskVolume.Name -ne $taskStorageVolume -or $taskVolume.Labels.'com.supabase.cli.project' -ne $TargetProject){throw 'Volumen Storage restaurado no comprobado.'}
$taskUsers=& $Docker exec $taskDb psql -U supabase_admin -d postgres -Atc 'select count(*) from auth.users'
if($LASTEXITCODE -ne 0 -or [int]$taskUsers -lt 1){throw 'Auth restaurado no comprobado.'}
$taskNames=@("supabase_auth_${TargetProject}-recovered","supabase_storage_${TargetProject}-recovered")
foreach($taskName in $taskNames){if((& $Docker ps -a --filter "name=^$taskName`$" --format '{{.Names}}') -contains $taskName){throw "Contenedor $taskName ya existe; no se sobrescribe."}}
if(!$Apply){Write-Host "Preview: iniciaría Auth y Storage desde configuración DPAPI $BackupId sólo en $TargetProject, compartiendo DB sin red ni puertos.";exit 0}
if($Confirm -ne "START ISOLATED $TargetProject"){throw 'Confirmación del destino aislado no coincide.'}
foreach($taskKind in @('auth','storage')){
    $taskSaved=$taskConfig.services.$taskKind
    if($taskKind -eq 'auth' -and $taskSaved.image -ne 'public.ecr.aws/supabase/gotrue:v2.196.0'){throw 'Imagen Auth inesperada.'}
    if($taskKind -eq 'storage' -and $taskSaved.image -ne 'public.ecr.aws/supabase/storage-api:v1.72.1'){throw 'Imagen Storage inesperada.'}
    $taskName=if($taskKind -eq 'auth'){$taskNames[0]}else{$taskNames[1]}
    $taskArgs=@('run','-d','--name',$taskName,'--label',"com.supabase.cli.project=$TargetProject",'--network',"container:$taskDb")
    if($taskKind -eq 'storage'){$taskArgs+=@('--mount',"type=volume,source=$taskStorageVolume,target=/mnt")}
    $taskRewroteDb=$false
    foreach($taskEnv in $taskSaved.environment){
        if(($taskKind -eq 'auth' -and $taskEnv -like 'GOTRUE_DB_DATABASE_URL=*') -or ($taskKind -eq 'storage' -and $taskEnv -like 'DATABASE_URL=*')){
            $taskKey=($taskEnv -split '=',2)[0]
            $taskUrl=[UriBuilder](($taskEnv -split '=',2)[1]);$taskUrl.Host='127.0.0.1';$taskUrl.Port=5432
            $taskEnv="$taskKey=$($taskUrl.Uri.AbsoluteUri)";$taskRewroteDb=$true
        }elseif($taskEnv -like 'API_EXTERNAL_URL=*'){$taskEnv='API_EXTERNAL_URL=http://127.0.0.1:9999'}
        elseif($taskEnv -like 'GOTRUE_SITE_URL=*'){$taskEnv='GOTRUE_SITE_URL=http://127.0.0.1:3999'}
        $taskArgs+=@('--env',$taskEnv)
    }
    if(!$taskRewroteDb){throw "URL DB de $taskKind ausente; no arrancar."}
    $taskArgs+=@([string]$taskSaved.image)
    foreach($taskCommand in $taskSaved.command){$taskArgs+=@([string]$taskCommand)}
    & $Docker @taskArgs | Out-Null
    if($LASTEXITCODE -ne 0){throw "Inicio aislado de $taskKind falló. Conservar estado para diagnóstico."}
    $taskStarted=(& $Docker inspect --type container $taskName | ConvertFrom-Json)[0]
    if(!$taskStarted.State.Running -or $taskStarted.Config.Labels.'com.supabase.cli.project' -ne $TargetProject -or $taskStarted.HostConfig.NetworkMode -notlike 'container:*'){throw "Aislamiento de $taskKind no comprobado."}
    foreach($taskPort in $taskStarted.NetworkSettings.Ports.PSObject.Properties){if($taskPort.Value){throw "$taskKind publicó puertos; detener sólo ese servicio QA."}}
}
foreach($taskHealth in @(@('Auth','http://127.0.0.1:9999/health'),@('Storage','http://127.0.0.1:5000/status'))){
    $taskCode=''
    for($taskTry=0;$taskTry -lt 15 -and $taskCode -ne '200';$taskTry++){
        $taskCode=& $Docker exec $taskDb curl --silent --output /dev/null --write-out '%{http_code}' $taskHealth[1] 2>$null
        if($taskCode -ne '200'){Start-Sleep -Seconds 1}
    }
    if($taskCode -ne '200'){throw "$($taskHealth[0]) no respondió HTTP 200 dentro del destino aislado; conservar contenedores para diagnóstico."}
    Write-Host "$($taskHealth[0]) interno HTTP 200, sin puertos publicados."
}
