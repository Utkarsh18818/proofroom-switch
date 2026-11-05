$ErrorActionPreference='Stop'
. 'A:\FlipTheSwitch\runtime\enter-runtime.ps1'
$controllerVersion='0.31.1-dev.311.g63c85ad'
$controllerRoot="A:\FlipTheSwitch\runtime\controller\releases\$controllerVersion"
New-Item -ItemType Directory -Path $controllerRoot -Force | Out-Null
$controllerUrl="https://github.com/sandbox-quantum/switch/releases/download/switch-agent-controller-v$controllerVersion/switch-agent-controller-$controllerVersion.tgz"
if(-not(Test-Path -LiteralPath "$controllerRoot\controller.tgz")){Invoke-WebRequest -Uri $controllerUrl -OutFile "$controllerRoot\controller.tgz"}
if(-not(Test-Path -LiteralPath "$controllerRoot\controller.tgz.sig")){Invoke-WebRequest -Uri "$controllerUrl.sig" -OutFile "$controllerRoot\controller.tgz.sig"}
@'
const fs=require('node:fs'),crypto=require('node:crypto');
const base='A:/FlipTheSwitch/runtime/controller/releases/0.31.1-dev.311.g63c85ad/';
const hash=crypto.createHash('sha256').update(fs.readFileSync(base+'controller.tgz')).digest('hex');
if(hash!=='3d4179981f13f977e178b476857a62e864ca71c01af1839239b4afc70688ac6d')throw Error('Controller SHA256 mismatch');
const key=crypto.createPublicKey({key:Buffer.from('MCowBQYDK2VwAyEAaRFfp1Yd/b91KkZs8Vj/OQSdsZS2ifd+rZu24pKTMpU=','base64'),format:'der',type:'spki'});
const message=Buffer.from('switch-agent-controller-release-v1\n0.31.1-dev.311.g63c85ad\n'+hash+'\n');
if(!crypto.verify(null,message,key,Buffer.from(fs.readFileSync(base+'controller.tgz.sig','utf8').trim(),'base64')))throw Error('Official release signature invalid');
console.log('Controller archive SHA256 and official Ed25519 signature verified.');
'@ | node -
if($LASTEXITCODE -ne 0){throw 'Controller verification failed'}
if(-not(Test-Path -LiteralPath "$controllerRoot\package\cli.mjs")){
 $controllerEntries=& tar -tzf "$controllerRoot\controller.tgz"
 if($controllerEntries | Where-Object {$_ -notmatch '^package/' -or $_ -match '\.\.'}){throw 'Unexpected archive entry'}
 & tar -xzf "$controllerRoot\controller.tgz" -C $controllerRoot
 if($LASTEXITCODE -ne 0){throw 'Controller extraction failed'}
}
@{version=$controllerVersion;sha256='3d4179981f13f977e178b476857a62e864ca71c01af1839239b4afc70688ac6d';signingKey='release-2026-10';cliPath="$controllerRoot\package\cli.mjs";signatureVerified=$true} | ConvertTo-Json | Set-Content -LiteralPath 'A:\FlipTheSwitch\runtime\controller\release.json' -Encoding utf8
$controllerConfigPath='A:\FlipTheSwitch\runtime\private\server-env.json'
if(Test-Path -LiteralPath $controllerConfigPath){
 $controllerConfig=Get-Content -LiteralPath $controllerConfigPath -Raw | ConvertFrom-Json -AsHashtable
 $controllerFlags=@(([string]$controllerConfig['FEATURE_FLAGS_ENABLED']).Split(',') | Where-Object {$_})
 if('agent_management' -notin $controllerFlags){$controllerFlags+='agent_management'}
 $controllerConfig['FEATURE_FLAGS_ENABLED']=$controllerFlags -join ','
 if(-not $controllerConfig['CONTROLLER_TOKEN_SECRET']){$controllerConfig['CONTROLLER_TOKEN_SECRET']=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()}
 $controllerConfig | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $controllerConfigPath -Encoding utf8
}
Write-Output 'Pinned controller prepared on A:. If server feature settings changed, restart Switch before enrollment.'
