$REPO=Get-Content .\data\win-repo
$LOGF=Get-Content .\data\win-logs
$LOGS="$REPO\$LOGF"

Get-Content -Path "$LOGS"
