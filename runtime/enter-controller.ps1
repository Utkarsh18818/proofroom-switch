$ErrorActionPreference='Stop'
. 'A:\FlipTheSwitch\runtime\enter-runtime.ps1'
$agentProfile='A:\FlipTheSwitch\runtime\private\agent-profile'
$codexOnPath=Get-Command codex.exe -ErrorAction SilentlyContinue
$codexTool=if($codexOnPath){$codexOnPath.Source}else{
 $codexInstallRoot=Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)) 'OpenAI\Codex\bin'
 if(Test-Path -LiteralPath $codexInstallRoot){Get-ChildItem -LiteralPath $codexInstallRoot -Filter codex.exe -Recurse -File | Select-Object -First 1 -ExpandProperty FullName}
}
if(-not $codexTool){throw 'Installed Codex executable not found'}
$env:PATH=(Split-Path -Parent $codexTool)+';'+$env:PATH
$env:CODEX_HOME='A:\FlipTheSwitch\runtime\private\codex-home'
$env:SWITCH_CONTROLLER_DATA_DIR='A:\FlipTheSwitch\runtime\controller\data'
$env:SWITCH_CONTROLLER_SELF_UPDATE='off'
$env:USERPROFILE=$agentProfile
$env:APPDATA=Join-Path $agentProfile 'AppData\Roaming'
$env:LOCALAPPDATA=Join-Path $agentProfile 'AppData\Local'
$env:XDG_CACHE_HOME=Join-Path $agentProfile 'cache'
$env:XDG_CONFIG_HOME=Join-Path $agentProfile 'config'
$env:XDG_STATE_HOME=Join-Path $agentProfile 'state'
foreach($agentFolder in @($agentProfile,$env:CODEX_HOME,$env:APPDATA,$env:LOCALAPPDATA,$env:XDG_CACHE_HOME,$env:XDG_CONFIG_HOME,$env:XDG_STATE_HOME)) { New-Item -ItemType Directory -Path $agentFolder -Force | Out-Null }

$agentCodexConfig=Join-Path $env:CODEX_HOME 'config.toml'
if(-not(Test-Path -LiteralPath $agentCodexConfig)){
 [IO.File]::WriteAllText($agentCodexConfig,"sandbox_mode = `"workspace-write`"`n[sandbox_workspace_write]`nwritable_roots = [`"A:/FlipTheSwitch/project/.state`"]`n")
}
