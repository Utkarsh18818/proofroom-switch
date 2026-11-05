$proofRoot = 'A:\FlipTheSwitch'
$env:TEMP = Join-Path $proofRoot 'tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $proofRoot 'cache\npm'
$env:UV_CACHE_DIR = Join-Path $proofRoot 'cache\uv'
$env:PIP_CACHE_DIR = Join-Path $proofRoot 'cache\pip'
$env:PYTHONDONTWRITEBYTECODE = '1'
$env:PROOFROOM_STATE_DIR = Join-Path $proofRoot 'project\.state'
Set-Location -LiteralPath (Join-Path $proofRoot 'project')
