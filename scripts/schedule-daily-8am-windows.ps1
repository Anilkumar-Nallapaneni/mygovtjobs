# Register Windows Task Scheduler — daily 8:00 AM India Standard Time
# Run once from repo root (PowerShell as Administrator):
#   .\scripts\schedule-daily-8am-windows.ps1

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$TaskName = "BharatNaukri-Daily-8AM-IST-Sync"

$Python = Get-Command python -ErrorAction SilentlyContinue
if (-not $Python) {
  $Python = Get-Command py -ErrorAction SilentlyContinue
}
if (-not $Python) {
  throw "Python not found. Install Python 3.12+ and add to PATH."
}

$Action = New-ScheduledTaskAction `
  -Execute $Python.Source `
  -Argument "`"$RepoRoot\scripts\run-daily-8am-sync.py`"" `
  -WorkingDirectory $RepoRoot

# 8:00 AM in India — use local trigger; set time zone in Task Scheduler UI if needed
$Trigger = New-ScheduledTaskTrigger -Daily -At "8:00AM"

$Settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 3)

Register-ScheduledTask `
  -TaskName $TaskName `
  -Action $Action `
  -Trigger $Trigger `
  -Settings $Settings `
  -Description "BharatNaukri: fetch official India govt jobs once per day (IngestAgent)." `
  -Force

Write-Host "Registered task: $TaskName"
Write-Host "Manual test: npm run daily:sync"
Write-Host "Force re-run:  npm run daily:sync -- --force"
