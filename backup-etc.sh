restic --verbose                \
  -r /disks/backups/restic-repo \
  --password-file ./key         \
  backup                        \
    --tag Arch                  \
    --tag etc-backup            \
    /etc
