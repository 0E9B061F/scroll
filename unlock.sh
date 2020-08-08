#!/bin/bash

REPO=`cat ./arch-repo`
LOCK=$REPO/locks

locks() {
  ls -p1 $LOCK | grep -v /
}

NMBR=`locks | wc -l`

plural() {
  num=$1
  sng=$2
  plr=$3
  if [ "$1" -gt 1 ]; then
    echo "$plr"
  else
    echo "$sng"
  fi
}

main() {
  if [ "$NMBR" -gt 0 ]; then
    plural $NMBR "Found lock:" "Found locks:"
    locks | sed 's/^/  > /'
    inst="(ENTER to delete, ctrl+c to exit)"
    plural $NMBR "Delete it? $inst" "Delete them? $inst"
    read
    rm $LOCK/*
    plural $NMBR "Deleted lock." "Deleted $NMBR locks."
  else
    echo "No locks found at $LOCK"
  fi
}


main
