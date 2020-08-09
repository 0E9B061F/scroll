$REPO=Get-Content .\data\win-repo
$LOGF=Get-Content .\data\win-logs
$KEYF=".\data\key"
$LOGS="$REPO\$LOGF"

restic --verbose `
    -r "$REPO" `
    --password-file "$KEYF" `
    $args

$tag=Get-Date -UFormat "%Y-%m-%d/%T>"
$a=$args[0..($args.Length-2)]
Add-Content -Path "$LOGS" -Value "$tag ran '$a'"
