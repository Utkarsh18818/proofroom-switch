$ErrorActionPreference='Stop'
$controllerPidPath='A:\FlipTheSwitch\runtime\controller\controller.pid'
if(-not(Test-Path -LiteralPath $controllerPidPath)){return}
$controllerId=[int](Get-Content -LiteralPath $controllerPidPath)
$controllerRootProcess=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$controllerId)
if(-not $controllerRootProcess){return}
if($controllerRootProcess.CommandLine -notlike '*A:\FlipTheSwitch\runtime\controller\run.ps1*'){throw 'Controller PID belongs to another process; refusing to stop.'}
function Stop-ProofRoomChildTree([int]$parentId){
 foreach($controllerChild in @(Get-CimInstance Win32_Process -Filter ("ParentProcessId = "+$parentId))){
  Stop-ProofRoomChildTree $controllerChild.ProcessId
  Stop-Process -Id $controllerChild.ProcessId -ErrorAction SilentlyContinue
 }
}
Stop-ProofRoomChildTree $controllerId
Stop-Process -Id $controllerId -ErrorAction SilentlyContinue
Write-Output 'ProofRoom controller and its child sessions stopped.'
