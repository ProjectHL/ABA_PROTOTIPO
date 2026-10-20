param([Parameter(Mandatory=$true)][string]$NextDist,[switch]$Apply)
. "$PSScriptRoot/common.ps1"
Assert-LocalTools -Engine
if($LocalRoot.Replace('\','/').TrimEnd('/') -ne 'C:/Users/Moonlabpc/Desktop/ABA/ABA_PROTOTIPO'){throw 'Desktop root required'}
if($NextDist -notmatch '^\.aba\.local/qa/[a-z0-9-]+$'){throw 'Private QA build directory required'}
$taskBuild=Join-Path $LocalRoot $NextDist
if(-not (Test-Path -LiteralPath (Join-Path $taskBuild 'BUILD_ID'))){throw 'Completed build required'}
if(-not $Apply){Write-Output 'Preview: start isolated QA production on 127.0.0.1:3001; retain current owned container, no volume changes.';return}
$taskStatus=Get-LocalStatus
$taskKey=$taskStatus.ANON_KEY
if(-not $taskKey){$taskKey=$taskStatus.PUBLISHABLE_KEY}
$taskExisting=& $Docker ps -a --filter 'name=^/aba-local-qa-v5$' --format '{{.Names}}'
if($taskExisting){
 $taskLabelsJson=& $Docker inspect aba-local-qa-v5 --format '{{json .Config.Labels}}'
 if($LASTEXITCODE -ne 0){throw 'QA label inspection failed'}
 $taskLabel=($taskLabelsJson | ConvertFrom-Json).'aba.qa'
 if($taskLabel -ne 'r5-v5'){throw 'Existing container is not owned by V5 QA'}
 & $Docker stop aba-local-qa-v5 | Out-Null
 if($LASTEXITCODE -ne 0){throw 'QA stop not confirmed'}
 & $Docker rename aba-local-qa-v5 ('aba-local-qa-v5-saved-'+(Get-Date -Format 'yyyyMMddHHmmss'))
 if($LASTEXITCODE -ne 0){throw 'QA retention not confirmed'}
}
$taskArgs=@('run','-d','--name','aba-local-qa-v5','--label','aba.qa=r5-v5','--network','aba-reintegration-local','-p','127.0.0.1:3001:3001','-w','/workspace','-v',"${LocalRoot}:/workspace",'-v','aba-local_local_node_modules:/workspace/node_modules')
foreach($taskEnvFile in @('.env','.env.local','.env.production','.env.production.local')){$taskArgs+=@('-v',"${LocalState}/browser.env:/workspace/${taskEnvFile}:ro")}
$taskArgs+=@('-e','NODE_ENV=production','-e','ABA_LOCAL_MODE=true','-e',"NEXT_DIST_DIR=$NextDist",'-e','NEXT_TELEMETRY_DISABLED=1','-e','NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321','-e','SUPABASE_INTERNAL_URL=http://supabase_kong_aba-reintegration-local:8000','-e',"NEXT_PUBLIC_SUPABASE_ANON_KEY=$taskKey",'-e','NEXT_PUBLIC_APP_URL=http://localhost:3001','aba-local-web','node','node_modules/next/dist/bin/next','start','--port','3001','--hostname','0.0.0.0')
$taskStart=& $Docker @taskArgs 2>&1
if($LASTEXITCODE -ne 0){throw 'QA candidate failed; private environment withheld'}
Write-Output ('QA production started: '+$NextDist+'; BUILD_ID '+(Get-Content -LiteralPath (Join-Path $taskBuild 'BUILD_ID')))