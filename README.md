**scroll** is a configurable backup system with support for `restic` and `rsync` backends. It supports backing up mutliple targets to multiple backends, has an efficient trimming strategy for `restic` backends and has support for email reports. **scroll** is multi-platform, and is currently tested under Linux and Windows.

# Configuration

Scroll is configured using YAML. Under Linux, the default configuration file location is `/etc/scroll/scroll.yaml`.

Below is an example configuration:

```yaml
backends:
  repo-a: ./data/repo-a
  repo-b: snap::./data/repo-b
  sync-a: sync::./data/sync-a
  sync-b: sync::./data/sync-b
targets:
  test1:
    path:
      - ./data/target/dir1
      - ./data/target/dir2
    exclude: ./data/target/dir1/exc
    policy: --keep-daily 7
  test2:
    path: ./data/target/dir5
  test3:
    path: ./data/target/dir8
plan:
  - "backup test1 repo-a,repo-b"
  - "backup test2 sync-a"
  - "backup test3 sync-b"
  - "trim . ."

```

# Usage

**`scroll help / h [COMMAND]`**
Print help information. If no COMMAND is given, print all help information.

**`scroll list / ls [TARGET] [REPO]`**
List snapshots for the given target and repo, or all repos and targets if these
are not given.

**`scroll plan / p [NAME]`**
Run a plan by NAME. If no name is given, run the default plan.

**`scroll backup / b [TARGET] [REPO] [TAG...]`**
Backup TARGET to REPO, with optional TAGs.

**`scroll freeze TARGET REPO TITLE [TAG...]`**
Take frozen snapshot of TARGET to REPO, with a TITLE and optional TAGs. Frozen
snapshots are ignored by the trim command.

**`scroll frozen [TARGET] [REPO]`**
List frozen snapshots for the given target and repo.

**`scroll init`**
Perform initial setup.

**`scroll trim / t [TARGET] [REPO]`**
Forget and prune snapshots for TARGET in REPO.

**`scroll find / f TARGET REPO [PATH...]`**
Search for snapshots containing one or more PATHs in the given TARGET and REPO.

**`scroll restore / r TARGET REPO PATH`**
Restore the given TARGET from REPO to PATH.

**`scroll unlock / u [REPO]`**
Unlock REPO, or all repos.

**`scroll check / c [REPO] [ARG...]`**
Check the integrity of REPO, or all repos.

**`scroll x [REPO] [ARG...]`**
Execute arbitrary restic commands for the given REPO.

**`scroll backends`**
List all configured backends.

**`scroll targets`**
List all configured targets.

**`scroll show`**
Show configuration details.

**`scroll report [LONG]`**
Send a report if mailing is configured.
