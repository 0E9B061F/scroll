$REPO=Get-Content .\win-repo
$KEYF=".\key"
$LOGS="$REPO\WINDOWS-LOGS"

restic --verbose `
    -r "$REPO" `
    --password-file "$KEYF" `
    $args

$tag=Get-Date -UFormat "%Y-%m-%d/%T>"
$a=$args[0..($args.Length-2)]
Add-Content -Path "$LOGS" -Value "$tag ran '$a'"
