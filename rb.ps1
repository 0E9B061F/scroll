function q {
    $filter=$args[0]
    $out=jq -r "$filter" .\data\windows.json
    return [string[]]$out
}

$WILD="."
$SOLO=$WILD
$LOGF=[string](q ".logs")
$KEYF="./data/key"
$SAFEMODE=$false
$FORCE=$false

function perform {
    [string]$name,[string[]]$tail=$args
    $repo=[string](q ".repos.$name")
    if ($SAFEMODE) {
        Write-Host "SAFEMODE: $tail"
    } else {
        restic --verbose `
            -r "${repo}" `
            --password-file "${KEYF}" `
            @tail
        $tag=Get-Date -UFormat "%Y-%m-%d/%T>"
        Add-Content -Path "$repo\$LOGF" -Value "$tag ran '$tail'"
    }
}

function action {
    [string[]]$tail=$args
    if ($SOLO -eq $WILD) {
        $names = q ".repos | keys | .[]"
        ForEach ($name in $names) {
            perform $name @tail
        }
    } else {
        perform $SOLO @tail
    }
}

function cmd.list {
    action "snapshots"
}

function cmd.repos {
    $names=q ".repos | keys | .[]"
    for ($n=0; $n -lt $names.Length; $n++) {
        $name=$names[$n]
        $rpath=[string](q ".repos.${name}")
        Write-Host "${n}: $name ($rpath)"
    }
}

function cmd.backups {
    $names=q ".backups | keys | .[]"
    for ($n=0; $n -lt $names.Length; $n++) {
        $name=$names[$n]
        $rpath=[string](q ".backups.${name}")
        Write-Host "${n}: $name ($rpath)"
    }
}

function cmd.logs {
    if ($SOLO -eq $WILD) {
        $names = q ".repos | keys | .[]"
        ForEach ($name in $names) {
            $rpath=[string](q ".repos.${name}")
            Get-Content -Path "$rpath\$LOGF"
        }
    } else {
        $rpath=[string](q ".repos.${SOLO}")
        Get-Content -Path "$rpath\$LOGF"
    }
}

function cmd.backup.inner {
    [string]$name,[string[]]$tail=$args
    $path=[string](q ".backups.$name")
    $btag=q ".tags.backups.$name[]"
    $btag=($btag | % {"--tag " + $_}) -join " " -split " "
    $utag=@()
    $auto="$tail $btag" -match "--tag AUTO"
    if (-Not $auto) {
        $utag=@("--tag", "USER")
    }
    action "backup" @utag @btag @tail $path
}

function cmd.backup {
    [string[]]$tail=$args
    $atag=@()
    $gtag=q ".tags.global[]"
    $gtag=($gtag | % {"--tag " + $_}) -join " " -split " "
    $bname=$WILD
    if ($tail.Length -gt 0 -and $tail[0] -ne "") {
        $bname, $tail=$tail
    }
    if ($tail.Length -gt 0 -and $tail[0] -ne "") {
        $SOLO, $tail=$tail
        if ($tail.Length -gt 0) {
            $atag=($tail | % {"--tag " + $_}) -join " " -split " "
        }
    }
    if ($bname -eq $WILD) {
        $names=q ".backups | keys | .[]"
        ForEach ($name in $names) {
            cmd.backup.inner $name @gtag @atag
        }
    } else {
        cmd.backup.inner $bname @gtag @atag
    }
  }

  function translate {
    [string]$native,[string[]]$tail=$args
    return $native -replace "([a-z]+)=([a-zA-Z0-9]+)","--keep-`$1 `$2" -split " "
  }

  function cmd.forget {
    [string[]]$tail=$args
    $dry=""
    if ($tail[0] -eq "P" -or $tail[0] -eq "D") {
        $h,$tail=$tail
        $dry="--dry-run"
    }
    $pairs=@()
    $bname=$WILD
    if ($tail.Length -gt 0 -and $tail[0] -ne "") {
        $bname, $tail=$tail
    }
    if ($tail.Length -gt 0 -and $tail[0] -ne "") {
        $SOLO, $tail=$tail
        if ($tail.Length -gt 0) {
            $pairs=translate $tail -join " "
        }
    }
    if ($bname -eq $WILD) {
        $names=q ".backups | keys | .[]"
        if (-not $FORCE -and $dry -eq "") {
            Read-Host "Confirm forget operation: ENTER to confirm, ctrl+c to exit"
        }
        ForEach ($name in $names) {
            $path=q ".backups.$name"
            action "forget" $dry "--path" $path @pairs
        }
    } else {
        $path=[string](q ".backups.$bname")
        if (-not $FORCE -and $dry -eq "") {
            Read-Host "Confirm forget operation: ENTER to confirm, ctrl+c to exit"
        }
        action "forget" $dry "--path" $path @pairs 
    }
  }

  function cmd.prune {
      action "prune"
  }

function main {
    [string]$CMD, [string[]]$tail = $args
    if ($CMD -eq "S") {
        $SAFEMODE=$true
        main @tail
    } elseif ($CMD -ceq "x") {
        action @tail
    } elseif ($CMD -ceq "X") {
        $SOLO, $tail = $tail
        action @tail
    } elseif ($CMD -ceq "list") {
        if ($tail.Count -gt 0) {
            $SOLO, $tail = $tail
        }
        cmd.list
    } elseif ($CMD -ceq "repos") {
        cmd.repos
    } elseif ($CMD -ceq "backups") {
        cmd.backups
    } elseif ($CMD -ceq "logs") {
        if ($tail.Count -gt 0) {
            $SOLO, $tail = $tail
        }
        cmd.logs
    } elseif ($CMD -ceq "unlock") {
        Write-Host "Error: unimplemented on this platform"
    } elseif ($CMD -ceq "backup") {
        cmd.backup @tail
    } elseif ($CMD -ceq "forget") {
        cmd.forget @tail
    } elseif ($CMD -ceq "FORGET") {
        $FORCE=$true
        cmd.forget @tail
    } elseif ($CMD -ceq "prune") {
        if ($tail.Count -gt 0) {
            $SOLO, $tail = $tail
        }
        cmd.prune
    } else {
        Write-Host "Error: unknown command '$CMD'"
    }
}

main @args
