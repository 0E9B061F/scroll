#!/bin/bash

./rb backup                   \
  --tag Arch                  \
  --tag nn-backup             \
  --exclude="**/node_modules" \
  /home/nn
