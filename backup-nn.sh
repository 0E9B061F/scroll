restic --verbose                \
  -r /disks/backups/restic-repo \
  --password-file ./key         \
  backup                        \
    --tag Arch                  \
    --tag nn-backup             \
    --exclude="**/node_modules" \
    /home/nn
