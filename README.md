# 📜 scroll backup system
[![Version][icon-ver]][repo]
[![License][icon-lic]][license]
[![NPM][icon-npm]][pkg]

**scroll** is a configurable backup system with support for [restic][restic] and [rsync][rsync] backends. It features:
* Configurable compound commands called **plans**
* Backups to multiple restic backends in a single command
* **Frozen** restic snapshots that will never be pruned by the `trim` command
* An efficient trimming strategy for restic backends
* Automatic **tagging** to allow multiple targets from multiple hosts to coexist in a single restic repository
* Automatic `HOST/TARGETNAME` directory structure for rsync backends, allowing multiple targets from multiple hosts to coexist in a single location
* Support for **email reports**
* scroll is **multi-platform**. Currently tested under Linux and Windows.

# Overview

**scroll** is simple to use. To backup all targets to all backends:

```sh
# Dots are wildcards
scroll backup . .
```

To backup two targets (`docs,art`) to a single backend (`remote`):

```sh
# Multiple targets or backends are seperated with a comma
scroll backup docs,art remote
```

To restore a target (`docs`) from a backend (`remote`) to a local path (`/home/nn`):

```sh
# Dots are wildcards
scroll restore docs remote /home/nn
```

## Scheduling

Note that **scroll** currently has no built-in scheduling; to run backup operations automatically you'll need to use whatever facilities your system provides for that (cron, systemd timers, Windows' Task Scheduler). In the future **scroll** may provide a scheduling daemon to be more system-agnostic.

# Configuration

Scroll is configured using YAML. Under Linux, the default configuration file is located at `/etc/scroll/scroll.yaml`. Under Windows its path is `%ALLUSERSPROFILE%\scroll\scroll.yaml` (typically `C:\ProgramData\scroll\scroll.yaml`).

Below is an example configuration with commentary:

```yaml
# Backups are named locations that store backups.
backends:
  # By default, scroll uses restic backends. These may use any path or URL
  # supported by restic.
  local: /backups/scroll/repo
  remote: rest:http://nn:axiom@0x2764.com:3333/ArkadyIV/repo
  # Using the `MODE::` syntax, you can specify the backend type.
  # `sync::` is used here to create rsync backends:
  local-sync: sync::/backups/scroll/sync
  remote-sync: sync::ssh://nn@0x2764.com:7777/backups/scroll/sync
# Targets are named locations to be backed up.
targets:
  docs:
    # A target may include multiple paths:
    path:
      - /home/nn/docs
      - /home/nn/records
    # Paths may be excluded from the target:
    exclude: /home/nn/docs/temp
    policy: --keep-daily 7
  art:
    path: /home/nn/art
    # Policies are used with restic backends to control how many snapshots are
    # kept when the `trim` command is run.
    policy: --keep-daily 7
  movies:
    # If you don't plan to store a target in any restic backend, you don't need
    # to specify any trim policy.
    path: /home/nn/movies
  music:
    path: /home/nn/music
# Plans are configurable compound commands, allowing you to run multiple scroll
# commands as one, or to configure arguments to single commands:
plan:
  main:
    - "backup docs,art local,remote"
    - "backup music local-sync,remote-sync"
  weekly:
    - "backup movies local-sync,remote-sync"
```

# Commands

**`help / h [COMMAND]`**

Print help information. If no COMMAND is given, print all help information.

**`list / ls [TARGET] [REPO]`**

List snapshots for the given target and repo, or all repos and targets if these
are not given.

**`plan / p [NAME]`**

Run a plan by NAME. If no name is given, run the default plan.

**`backup / b [TARGET] [REPO] [TAG...]`**

Backup TARGET to REPO, with optional TAGs.

**`freeze TARGET REPO TITLE [TAG...]`**

Take frozen snapshot of TARGET to REPO, with a TITLE and optional TAGs. Frozen
snapshots are ignored by the trim command.

**`frozen [TARGET] [REPO]`**

List frozen snapshots for the given target and repo.

**`init`**

Perform initial setup.

**`trim / t [TARGET] [REPO]`**

Forget and prune snapshots for TARGET in REPO.

**`find / f TARGET REPO [PATH...]`**

Search for snapshots containing one or more PATHs in the given TARGET and REPO.

**`restore / r TARGET REPO PATH`**

Restore the given TARGET from REPO to PATH.

**`unlock / u [REPO]`**

Unlock REPO, or all repos.

**`check / c [REPO] [ARG...]`**

Check the integrity of REPO, or all repos.

**`x [REPO] [ARG...]`**

Execute arbitrary restic commands for the given REPO.

**`backends`**

List all configured backends.

**`targets`**

List all configured targets.

**`show`**

Show configuration details.

**`report [LONG]`**

Send a report if mailing is configured.

# License

Copyright 2024 **[0E9B061F][gh]**<br/>
Available under the terms of the [Mozilla Public License Version 2.0.][license]


[gh]:https://github.com/0E9B061F
[repo]:https://github.com/0E9B061F/scroll
[license]:https://github.com/0E9B061F/scroll/blob/master/LICENSE
[pkg]:https://www.npmjs.com/package/scroll
[restic]:https://github.com/restic/restic
[rsync]:https://github.com/RsyncProject/rsync

[icon-ver]:https://img.shields.io/github/package-json/v/0E9B061F/scroll.svg?style=flat-square&logo=github&color=%236e7fd2
[icon-lic]:https://img.shields.io/github/license/0E9B061F/scroll.svg?style=flat-square&color=%236e7fd2
[icon-npm]:https://img.shields.io/npm/v/scroll-backup.svg?style=flat-square&logo=npm&color=%23de2657
