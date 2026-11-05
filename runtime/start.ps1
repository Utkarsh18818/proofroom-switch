$ErrorActionPreference = 'Stop'
. 'A:\FlipTheSwitch\runtime\enter-runtime.ps1'
$runtimeRoot='A:\FlipTheSwitch\runtime'
& 'C:\Program Files\PostgreSQL\17\bin\pg_isready.exe' -h 127.0.0.1 -p 55437 -d proofroom_switch -U proofroom_app *> $null
if ($LASTEXITCODE -ne 0) {
  & 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D "$runtimeRoot\postgres\data" -l "$runtimeRoot\postgres\postgres.log" -o '-h 127.0.0.1 -p 55437' -w start
  if ($LASTEXITCODE -ne 0) { throw 'Project database failed to start.' }
}
$alreadyRunning=$false
try { $response=Invoke-WebRequest 'http://127.0.0.1:8765/health/ready' -TimeoutSec 3; $alreadyRunning=$response.StatusCode -eq 200 } catch {}
if ($alreadyRunning) { Write-Output 'Switch is already responding. Run node A:/FlipTheSwitch/runtime/verify-server.mjs to check all components.'; return }
$serverProcess=Start-Process -FilePath "$runtimeRoot\switch\core\.venv\Scripts\python.exe" -ArgumentList '-m','switch_core.main' -WorkingDirectory "$runtimeRoot\switch" -WindowStyle Hidden -RedirectStandardOutput "$runtimeRoot\server.stdout.log" -RedirectStandardError "$runtimeRoot\server.stderr.log" -PassThru
Set-Content -LiteralPath "$runtimeRoot\server.pid" -Value $serverProcess.Id -Encoding ascii
Write-Output 'Switch starting at http://127.0.0.1:8765. Allow startup to finish, then run node A:/FlipTheSwitch/runtime/verify-server.mjs.'
