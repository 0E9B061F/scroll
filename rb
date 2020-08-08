#!/bin/bash

REPO=`cat ./arch-repo`
KEYF="./key"

restic --verbose        \
  -r $REPO              \
  --password-file $KEYF \
  $*
