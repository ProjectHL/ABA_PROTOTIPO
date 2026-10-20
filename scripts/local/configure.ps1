param([switch]$RefreshAuthInviteTemplate,[switch]$SyncFunctions,[string]$ReviewedBaselinePath)
. "$PSScriptRoot/common.ps1"
if($SyncFunctions){
    if($RefreshAuthInviteTemplate){throw 'Elegir una sola acción explícita de configuración.'}
    & "$PSScriptRoot/sync-functions.ps1" -ReviewedBaselinePath $ReviewedBaselinePath
    exit 0
}
Assert-LocalTools
New-Item -ItemType Directory -Force -Path (Join-Path $LocalProject 'supabase') | Out-Null
$taskConfigPath = Join-Path $LocalProject 'supabase/config.toml'
function Sync-InviteTemplate {
    $taskTemplates=Join-Path $LocalRoot 'supabase/templates'
    if(!(Test-Path -LiteralPath (Join-Path $taskTemplates 'invite.html'))){throw 'Falta template invite.html revisado por root; no se modificó configuración.'}
    $taskDestination=Join-Path $LocalProject 'supabase/templates'
    New-Item -ItemType Directory -Force -Path $taskDestination | Out-Null
    Get-ChildItem -LiteralPath $taskTemplates -File | ForEach-Object {
        $taskTarget=Join-Path $taskDestination $_.Name
        if(Test-Path -LiteralPath $taskTarget){if((Get-FileHash -LiteralPath $taskTarget).Hash -ne (Get-FileHash -LiteralPath $_.FullName).Hash){throw 'Template aislado divergente: requiere revisión, no overwrite.'}}
        else{Copy-Item -LiteralPath $_.FullName -Destination $taskTarget}
    }
}
$taskInviteSection="`n"+'[auth.email.template.invite]'+"`n"+'subject = "Invitación a ABA local"'+"`n"+'content_path = "./supabase/templates/invite.html"'+"`n"
if (Test-Path -LiteralPath $taskConfigPath) {
    if(!$RefreshAuthInviteTemplate){throw 'Configuración aislada existente; se conserva. Revisar cambios manualmente, no sobrescribir.'}
    $taskExisting=Get-Content -LiteralPath $taskConfigPath -Raw
    if($taskExisting -notmatch '(?m)^project_id\s*=\s*"aba-reintegration-local"\s*$'){throw 'Proyecto aislado incorrecto.'}
    if($taskExisting -match '(?m)^\[auth.email.template.invite\]') {throw 'Sección invite existente: revisar explícitamente, no overwrite.'}
    Sync-InviteTemplate
    $taskEdgeSource=Join-Path $LocalRoot 'supabase/functions/invite-clinic-member/index.ts'
    $taskEdgeTarget=Join-Path $LocalProject 'supabase/functions/invite-clinic-member/index.ts'
    if(!(Test-Path -LiteralPath $taskEdgeTarget)){throw 'Snapshot Edge esperado no existe; requiere configure inicial.'}
    Copy-Item -LiteralPath $taskEdgeSource -Destination $taskEdgeTarget
    [IO.File]::AppendAllText($taskConfigPath,$taskInviteSection)
    Write-Host 'Template invite agregado explícitamente. No se aplicaron migraciones/seeds ni se arrancaron servicios.'
    exit 0
}
$taskConfig = Get-Content -LiteralPath (Join-Path $LocalRoot 'supabase/config.toml') -Raw
$taskConfig = $taskConfig -replace 'project_id = "[^"]+"', 'project_id = "aba-reintegration-local"'
$taskConfig = $taskConfig -replace '(?s)(\[realtime\]\s*)enabled = false', '${1}enabled = true'
$taskConfig = $taskConfig -replace '(?s)(\[storage\]\s*)enabled = false', '${1}enabled = true'
$taskConfig = $taskConfig -replace 'file_size_limit = "50MiB"', 'file_size_limit = "20MiB"'
$taskConfig = $taskConfig -replace '(?s)(\[storage.vector\]\s*)enabled = true', '${1}enabled = false'
$taskConfig = $taskConfig -replace '(?s)(\[db.seed\]\s*#.*?\r?\n)enabled = true', '${1}enabled = false'
$taskConfig = $taskConfig -replace 'sql_paths = \["./seed.sql"\]', 'sql_paths = []'
$taskConfig = $taskConfig -replace 'jwt_expiry = 3600', 'jwt_expiry = 900'
$taskConfig = $taskConfig -replace 'email_sent = 2', 'email_sent = 100'
$taskConfig = $taskConfig -replace 'additional_redirect_urls = \[[^\r\n]+\]', 'additional_redirect_urls = ["http://localhost:3000/auth/callback", "http://127.0.0.1:3000/auth/callback", "http://localhost:3000/auth/confirm", "http://127.0.0.1:3000/auth/confirm"]'
Sync-InviteTemplate
[IO.File]::WriteAllText($taskConfigPath, $taskConfig+$taskInviteSection)
Copy-Item -LiteralPath (Join-Path $LocalRoot 'supabase/functions') -Destination (Join-Path $LocalProject 'supabase/functions') -Recurse
# No migrations/seed are copied or applied here. The orchestrator owns schema installation.
Write-Host 'Stack aislado preparado sin esquema de aplicación. Orquestador debe sincronizar/aplicar migraciones explícitamente.'
