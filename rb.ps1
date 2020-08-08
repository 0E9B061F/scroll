$REPO=Get-Content .\win-repo
$KEYF=".\key"

restic --verbose `
    -r "$REPO" `
    --password-file $KEYF `
    $args

Add-Content -Path $REPO\logs.txt -Value "Ran '$args'"
