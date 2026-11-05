$ErrorActionPreference='Stop'
. 'A:\FlipTheSwitch\project\enter.ps1'
& 'A:\FlipTheSwitch\runtime\start.ps1'
$uiResponds=$false
try {$response=Invoke-WebRequest 'http://127.0.0.1:4173/api/session' -TimeoutSec 3;$uiResponds=$response.StatusCode -eq 200} catch {}
if(-not $uiResponds){
 $uiProcess=Start-Process -FilePath 'C:\Program Files\nodejs\node.exe' -ArgumentList 'src/server.js' -WorkingDirectory 'A:\FlipTheSwitch\project' -WindowStyle Hidden -RedirectStandardOutput 'A:\FlipTheSwitch\runtime\ui.stdout.log' -RedirectStandardError 'A:\FlipTheSwitch\runtime\ui.stderr.log' -PassThru
 Set-Content -LiteralPath 'A:\FlipTheSwitch\runtime\ui.pid' -Value $uiProcess.Id -Encoding ascii
}
Write-Output 'ProofRoom UI: http://127.0.0.1:4173'
Write-Output 'Switch Gateway: http://127.0.0.1:8765'
Write-Output 'If Switch was just started, allow startup to finish before signing in.'

if(Test-Path -LiteralPath 'A:\FlipTheSwitch\runtime\controller\data\controller.db'){ & 'A:\FlipTheSwitch\runtime\controller\start.ps1' }

