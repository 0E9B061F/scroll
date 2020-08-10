#!/bin/bash

./backup.sh                   \
  --tag Arch                  \
  --tag nn-backup             \
  --exclude="**/node_modules" \
  /home/nn $*
