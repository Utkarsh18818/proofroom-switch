param([string]$PostgresBin='C:\Program Files\PostgreSQL\17\bin')
$ErrorActionPreference='Stop'
$proofRoot='A:\FlipTheSwitch'
$runtimeRoot=Join-Path $proofRoot 'runtime'
$sourceRoot=Join-Path $runtimeRoot 'switch'
$requiredCommit='12c48336dd37a18c70f3e8ccec0807ada452407d'
foreach($relative in @('runtime','runtime\tools','runtime\python','runtime\postgres','runtime\private','cache\uv','cache\npm','tmp','evidence','deliverables')){
 New-Item -ItemType Directory -Path (Join-Path $proofRoot $relative) -Force | Out-Null
}
. "$runtimeRoot\enter-runtime.ps1"
if(-not(Get-Command node -ErrorAction SilentlyContinue)){throw 'Node.js 22+ is required.'}
if(-not(Get-Command git -ErrorAction SilentlyContinue)){throw 'Git is required.'}
if(-not(Test-Path -LiteralPath "$PostgresBin\initdb.exe")){throw 'Existing PostgreSQL 17 binaries are required. Pass -PostgresBin with their directory.'}
if(-not(Test-Path -LiteralPath "$sourceRoot\.git")){
 git -c core.longpaths=true clone --depth 1 --no-checkout https://github.com/sandbox-quantum/switch.git $sourceRoot
 if($LASTEXITCODE -ne 0){throw 'Switch clone failed.'}
 git -C $sourceRoot fetch --depth 1 origin $requiredCommit
 if($LASTEXITCODE -ne 0){throw 'Pinned Switch revision fetch failed.'}
 git -C $sourceRoot -c core.autocrlf=false checkout --detach $requiredCommit
 if($LASTEXITCODE -ne 0){throw 'Pinned Switch checkout failed.'}
}else{
 $head=git -C $sourceRoot rev-parse HEAD
 if($head -ne $requiredCommit){throw 'Existing Switch checkout differs from the pinned version; refusing to overwrite it.'}
}
$uvPath="$runtimeRoot\tools\uv\uv.exe"
if(-not(Test-Path -LiteralPath $uvPath)){
 $downloadScript=@'
const fs=require("node:fs"),crypto=require("node:crypto");
(async()=>{const r=await fetch("https://github.com/astral-sh/uv/releases/download/0.13.7/uv-x86_64-pc-windows-msvc.zip");if(!r.ok)throw new Error("uv download failed");const b=Buffer.from(await r.arrayBuffer());if(crypto.createHash("sha256").update(b).digest("hex")!=="0cdc5b38fe5a8168ed6a25814f5ba43c21d313dd3187314fccb37b7cec46e021")throw new Error("uv checksum mismatch");fs.writeFileSync("A:/FlipTheSwitch/runtime/tools/uv-0.13.7.zip",b);})().catch(e=>{console.error(e.message);process.exit(1)});
'@
 node -e $downloadScript
 if($LASTEXITCODE -ne 0){throw 'Verified uv download failed.'}
 Expand-Archive -LiteralPath "$runtimeRoot\tools\uv-0.13.7.zip" -DestinationPath "$runtimeRoot\tools\uv" -Force
}
& $uvPath python install 3.13.18 --no-bin --no-registry
if($LASTEXITCODE -ne 0){throw 'A:-based Python installation failed.'}
& $uvPath sync --project "$sourceRoot\core" --python 3.13.18 --no-dev --locked
if($LASTEXITCODE -ne 0){throw 'Locked Switch dependency installation failed.'}
$normalizeScript=@'
const fs=require("node:fs"),p=require("node:path");
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=p.join(d,e.name);if(e.isDirectory())walk(f);else if(e.name.endsWith(".md")){const s=fs.readFileSync(f,"utf8");if(s.includes("\r\n"))fs.writeFileSync(f,s.replaceAll("\r\n","\n"));}}}
walk("A:/FlipTheSwitch/runtime/switch/core/switch_core/connections/catalog");
'@
node -e $normalizeScript
if($LASTEXITCODE -ne 0){throw 'Catalog checkout normalization failed.'}
& "$sourceRoot\core\.venv\Scripts\python.exe" "$runtimeRoot\apply-gateway-ui.py"
if($LASTEXITCODE -ne 0){throw 'Gateway UI overlay verification failed.'}
Push-Location -LiteralPath "$sourceRoot\gateway"
try{
 npm.cmd ci --no-audit --no-fund
 if($LASTEXITCODE -ne 0){throw 'Gateway dependency installation failed.'}
 npm.cmd run build
 if($LASTEXITCODE -ne 0){throw 'Gateway build failed.'}
}finally{Pop-Location}
$clusterPath="$runtimeRoot\postgres\data"
$freshCluster=-not(Test-Path -LiteralPath "$clusterPath\PG_VERSION")
$configPath="$runtimeRoot\private\server-env.json"
if(-not(Test-Path -LiteralPath $configPath)){
 if(-not $freshCluster){throw 'Database exists but its secret configuration is missing; refusing to replace credentials.'}
 node "$runtimeRoot\init-config.mjs"
 if($LASTEXITCODE -ne 0){throw 'Private configuration generation failed.'}
}
. "$runtimeRoot\enter-runtime.ps1"
if($freshCluster){
 & "$PostgresBin\initdb.exe" -D $clusterPath -U proofroom_owner "--pwfile=$runtimeRoot\private\pg-password.txt" --auth=scram-sha-256 --encoding=UTF8 --locale=C
 if($LASTEXITCODE -ne 0){throw 'Project database initialization failed.'}
 & "$PostgresBin\pg_ctl.exe" -D $clusterPath -l "$runtimeRoot\postgres\postgres.log" -o '-h 127.0.0.1 -p 55437' -w start
 if($LASTEXITCODE -ne 0){throw 'Project database startup failed.'}
 $env:PGPASSWORD=$env:DB_OWNER_PASSWORD
 try{
  & "$PostgresBin\psql.exe" -h 127.0.0.1 -p 55437 -U proofroom_owner -d postgres -v ON_ERROR_STOP=1 -f "$runtimeRoot\private\init-database.sql"
  if($LASTEXITCODE -ne 0){throw 'Project database role setup failed.'}
 }finally{Remove-Item Env:PGPASSWORD}
}
node -e 'const f=require("node:fs"),p="A:/FlipTheSwitch/runtime/private/server-env.json";const c=JSON.parse(f.readFileSync(p,"utf8").replace(/^\uFEFF/,""));c.GATEWAY_UI_DIR="A:/FlipTheSwitch/runtime/switch/gateway/dist";f.writeFileSync(p,JSON.stringify(c,null,2)+"\n");'
if($LASTEXITCODE -ne 0){throw 'Gateway UI configuration failed.'}
Write-Output 'Native setup ready. Run A:\FlipTheSwitch\launch.ps1, then runtime\verify-server.mjs.'
Write-Output 'No Docker was used. This script requires the existing PostgreSQL binaries.'
