#!/bin/bash

REPO=`cat ./arch-repo`
KEYF="./key"

if [ `whoami` != "root" ]; then
  echo "Error: this script must be run as root"
  exit 1
fi

restic --verbose        \
  -r $REPO              \
  --password-file $KEYF \
  $*
