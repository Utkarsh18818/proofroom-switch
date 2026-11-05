$ErrorActionPreference='Stop'
$controllerRoot='A:\FlipTheSwitch\runtime\controller'
$controllerPidPath=Join-Path $controllerRoot 'controller.pid'
if(Test-Path -LiteralPath $controllerPidPath){
 $controllerId=[int](Get-Content -LiteralPath $controllerPidPath)
 $controllerExisting=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$controllerId)
 if($controllerExisting){
  if($controllerExisting.CommandLine -notlike '*A:\FlipTheSwitch\runtime\controller\run.ps1*'){throw 'Controller PID belongs to another process; inspect before restarting.'}
  Write-Output 'ProofRoom controller already running.';return
 }
}
$controllerProcess=Start-Process -FilePath 'C:\Program Files\PowerShell\7\pwsh.exe' -ArgumentList '-NoProfile','-File',"$controllerRoot\run.ps1" -WorkingDirectory $controllerRoot -WindowStyle Hidden -RedirectStandardOutput "$controllerRoot\stdout.log" -RedirectStandardError "$controllerRoot\stderr.log" -PassThru
Set-Content -LiteralPath $controllerPidPath -Value $controllerProcess.Id -Encoding ascii
Write-Output 'ProofRoom controller started.'
