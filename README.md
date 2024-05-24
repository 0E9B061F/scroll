# 📜 **scroll** backup system v0.4.6 'HOUSE ABSOLUTE'
[![Version][icon-ver]][repo]
[![Series][icon-ser]][repo]
[![License][icon-lic]][license]
[![NPM][icon-npm]][pkg]

**scroll** is a configurable backup system with support for multiple backends. It features:

* **[restic][restic]** support
* **[rsync][rsync]** support
* Configurable compound commands called **plans**
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

To restore a target (`docs`) from a backend (`remote`) to a local path (`/`):

```sh
scroll restore docs remote /
```

To trim all targets in all restic backends according to the policy of each target:

```sh
scroll trim . .
```

The list command lists snapshots in restic backends:

```sh
scroll list . remote         # List all snapshots for this host in `remote`
scroll host:. ls . remote    # List all snapshots for all hosts in `remote`
scroll h:Corinth ls . remote # List all snapshots for another host in `remote`
```

More example commands:

```sh
# Create frozen snapshots that will be ignored by the `trim` command:
scroll freeze docs local docs-phase-1
scroll frozen . . # List all frozen snapshots
# Run a plan (compound preconfigured commands defined in the configuration file):
scroll plan weekly
# Find all snapshots containing a given path:
scroll find art remote /home/user/art/sketch/2024-01-23.png
# Check the integrity of all restic backends:
scroll check .
# Remove a stale lock:
scroll unlock local
```

## Installation

```sh
npm install -g scroll-backup
```

**NB:** on **Windows**, first run `scroll init` after installation.

After installation, edit your config file and key file, if you plan to use restic backends. 

### Config File

* Linux: `/etc/scroll/scroll.yaml`
* Windows `%ALLUSERSPROFILE%\scroll\scroll.yaml`

Read more about this file and see a commented example in the Configuration section below.

### Key File

* Linux: `/etc/scroll/key`
* Windows `%ALLUSERSPROFILE%\scroll\key`

Place the password used to encrypt and decrypt your restic repos here.

## Scheduling

Note that **scroll** currently has no built-in scheduling; to run backup operations automatically you'll need to use whatever facilities your system provides for that (cron, systemd timers, Windows' Task Scheduler). In the future **scroll** may provide a scheduling daemon to be more system-agnostic.

# Configuration

Scroll is configured using YAML.

* Under Linux, the default configuration file is located at `/etc/scroll/scroll.yaml`
* Under Windows its path is `%ALLUSERSPROFILE%\scroll\scroll.yaml`<br/>
  (typically `C:\ProgramData\scroll\scroll.yaml`)

## Backends

Backends are locations where backups are stored. **scroll** supports multiple backend types; currently these are restic and rsync. When performing backup and restore operations the backend type determines which tool will be used.

### Type Syntax

**scroll** uses a special syntax to specify the type of a backend. It looks like `TYPE::`. For example:
```yaml
backends:
  example-a: snap::/backups/repo
  example-b: sync::ssh://user@host.com:2222/backups
```

Valid types are:

* `snap`: A restic backend. This is the default type if none is given.
* `sync`: An rsync backend.

### restic

restic backends are the default backend type. Configuration example:

```yaml
backends:
  # These are both restic backends with the `snap` type
  local-a: /backups/repo-a
  local-b: snap::/backups/repo-b
  # Any location restic supports will work:
  remote-a: sftp:user@host.com:/backups/repo
  remote-b: sftp://user@host.com:2222//srv/restic-repo
  remote-c: rest:https://user:pass@host.com:8000
```

### rsync

rsync backends are specified with the `sync` type. Configuration example:

```yaml
backends:
  # Any location rsync supports will work:
  local-b: sync::/backups/sync
  remote-a: sync::rsync://user@host.com:9999/backups/sync
  # When using ssh use URL syntax:
  remote-b: sync::ssh://user@host.com:9999/backups/sync
```

## Example Configuration

Below is an example configuration with commentary:

```yaml
# Backends are named locations that store backups.
backends:
  # By default, scroll uses restic backends. These may use any path or URL
  # supported by restic.
  local: /backups/scroll/repo
  remote: rest:http://user:pass@host.com:3333/backups/repo
  # Using the `MODE::` syntax, you can specify the backend type.
  # `sync::` is used here to create rsync backends:
  local-sync: sync::/backups/scroll/sync
  remote-sync: sync::ssh://user@host.com:7777/backups/scroll/sync
# Targets are named locations to be backed up.
targets:
  docs:
    # A target may include multiple paths:
    path:
      - /home/user/docs
      - /home/user/records
    # Paths may be excluded from the target:
    exclude: /home/user/docs/temp
    policy: --keep-daily 7
  art:
    path: /home/user/art
    # Policies are used with restic backends to control how many snapshots are
    # kept when the `trim` command is run.
    policy: --keep-daily 7
  movies:
    # If you don't plan to store a target in any restic backend, you don't need
    # to specify any trim policy.
    path: /home/user/movies
  music:
    path: /home/user/music
# Plans are configurable compound commands, allowing you to run multiple scroll
# commands as one, or to configure arguments for a single commands:
plan:
  # The default plan is named `main`
  # This could be run with either `scroll plan main` or just `scroll plan`
  main:
    - "backup docs,art local,remote"
    - "backup music local-sync,remote-sync"
  # Run this with `scroll plan weekly`
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

Copyright 2020-2024 **[0E9B061F][gh]**<br/>
Available under the terms of the [Mozilla Public License Version 2.0][license].


[gh]:https://github.com/0E9B061F
[repo]:https://github.com/0E9B061F/scroll
[license]:https://github.com/0E9B061F/scroll/blob/master/LICENSE
[pkg]:https://www.npmjs.com/package/scroll-backup
[restic]:https://github.com/restic/restic
[rsync]:https://github.com/RsyncProject/rsync

[icon-ver]:https://img.shields.io/github/package-json/v/0E9B061F/scroll.svg?style=flat-square&logo=github&color=%236e7fd2
[icon-ser]:https://img.shields.io/badge/dynamic/json?color=%236e7fd2&label=series&prefix=%27&query=series&suffix=%27&url=https%3A%2F%2Fraw.githubusercontent.com%2F0E9B061F%2Fscroll%2Fmaster%2Fpackage.json&style=flat-square
[icon-lic]:https://img.shields.io/github/license/0E9B061F/scroll.svg?style=flat-square&color=%236e7fd2
[icon-npm]:https://img.shields.io/npm/v/scroll-backup.svg?style=flat-square&logo=npm&color=%23de2657
