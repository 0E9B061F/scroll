#!/bin/bash

REPO=`cat ./arch-repo`
LOGS="${REPO}/LOGS"
KEYF="./key"

if [ `whoami` != "root" ]; then
  echo "Error: this script must be run as root"
  exit 1
fi

restic --verbose        \
  -r $REPO              \
  --password-file $KEYF \
  $*

if [[ -z "${SUDO_USER}" ]]; then
  USER=`whoami`
else
  USER="${SUDO_USER}"
fi

echo "$(date +%F/%T)~${USER}> ran '$*'" >> "${LOGS}"
