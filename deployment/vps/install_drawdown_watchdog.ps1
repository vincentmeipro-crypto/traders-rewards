param(
  [Parameter(Mandatory = $true)][string]$WatchdogSecret,
  [Parameter(Mandatory = $true)][string]$Mt5ApiSecret,
  [string]$SiteUrl = "https://www.traders-rewards.eu"
)

$ErrorActionPreference = "Stop"
$baseDir = "C:\elysium-mt5"
$python = "C:\Program Files\Python312\python.exe"
$nssm = "C:\elysium-mt5\nssm-extracted\nssm-2.24\win32\nssm.exe"
$service = "TradersRewardsDrawdownWatchdog"
$source = Join-Path $PSScriptRoot "mt5_drawdown_watchdog.py"
$target = Join-Path $baseDir "mt5_drawdown_watchdog.py"

if (-not (Test-Path $python)) { throw "Python 3.12 introuvable: $python" }
if (-not (Test-Path $nssm)) { throw "NSSM introuvable: $nssm" }
if (-not (Test-Path $source)) { throw "Watchdog introuvable: $source" }
Copy-Item $source $target -Force

& $nssm stop $service confirm 2>$null | Out-Null
& $nssm remove $service confirm 2>$null | Out-Null
& $nssm install $service $python $target
& $nssm set $service AppDirectory $baseDir
& $nssm set $service Start SERVICE_AUTO_START
& $nssm set $service AppStdout (Join-Path $baseDir "logs\drawdown-watchdog.log")
& $nssm set $service AppStderr (Join-Path $baseDir "logs\drawdown-watchdog-error.log")
& $nssm set $service AppRotateFiles 1
& $nssm set $service AppRotateBytes 10485760
& $nssm set $service AppEnvironmentExtra "TRADERS_REWARDS_URL=$SiteUrl" "MT5_WATCHDOG_SECRET=$WatchdogSecret" "MT5_API_SECRET=$Mt5ApiSecret" "MT5_LOCAL_URL=http://127.0.0.1:5000" "MT5_WATCHDOG_POLL_SECONDS=1" "MT5_WATCHDOG_RULE_REFRESH_SECONDS=5"
& $nssm start $service
Start-Sleep -Seconds 3
Get-Service $service | Format-Table Name, Status, StartType
Get-Content (Join-Path $baseDir "logs\drawdown-watchdog.log") -Tail 10 -ErrorAction SilentlyContinue