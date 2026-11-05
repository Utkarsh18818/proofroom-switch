$ErrorActionPreference='Stop'
$runtimeRoot='A:\FlipTheSwitch\runtime'
$pidFile=Join-Path $runtimeRoot 'server.pid'
if(Test-Path -LiteralPath $pidFile) {
  $serverId=[int](Get-Content -LiteralPath $pidFile)
  $parent=Get-CimInstance Win32_Process -Filter ("ProcessId = "+$serverId)
  if($parent -and $parent.ExecutablePath -and $parent.ExecutablePath.StartsWith("$runtimeRoot\switch\core\.venv\",[StringComparison]::OrdinalIgnoreCase)) {
    $children=Get-CimInstance Win32_Process -Filter ("ParentProcessId = "+$serverId)
    foreach($child in $children) {
      if($child.Name -eq 'python.exe' -and $child.ExecutablePath -and $child.ExecutablePath.StartsWith("$runtimeRoot\python\",[StringComparison]::OrdinalIgnoreCase)) {
        Stop-Process -Id $child.ProcessId
      }
    }
    $remaining=Get-Process -Id $serverId -ErrorAction SilentlyContinue
    if($remaining) { Stop-Process -Id $serverId }
  }
}
& 'C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe' -D "$runtimeRoot\postgres\data" -m fast -w stop
if($LASTEXITCODE -ne 0) { throw 'Project database did not stop cleanly; inspect its log.' }
Write-Output 'Project Switch and its isolated database stopped; existing PostgreSQL service untouched.'
