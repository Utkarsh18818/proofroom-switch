$proofBase = 'A:\FlipTheSwitch'
$env:TEMP = Join-Path $proofBase 'tmp'
$env:TMP = $env:TEMP
$env:UV_CACHE_DIR = Join-Path $proofBase 'cache\uv'
$env:UV_PYTHON_INSTALL_DIR = Join-Path $proofBase 'runtime\python'
$env:UV_PYTHON_BIN_DIR = Join-Path $proofBase 'runtime\tools'
$env:UV_TOOL_DIR = Join-Path $proofBase 'runtime\uv-tools'
$env:UV_NO_MODIFY_PATH = '1'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:npm_config_cache = Join-Path $proofBase 'cache\npm'
$env:npm_config_update_notifier = 'false'
$privateConfigPath = Join-Path $proofBase 'runtime\private\server-env.json'
if (Test-Path -LiteralPath $privateConfigPath) {
  $runtimeSettings = Get-Content -LiteralPath $privateConfigPath -Raw | ConvertFrom-Json -AsHashtable
  foreach ($runtimeSetting in $runtimeSettings.GetEnumerator()) {
    [Environment]::SetEnvironmentVariable($runtimeSetting.Key, [string]$runtimeSetting.Value, 'Process')
  }
}
