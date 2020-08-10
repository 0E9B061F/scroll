#!/bin/bash

./backup.sh        \
  --tag Arch       \
  --tag etc-backup \
  /etc $*
