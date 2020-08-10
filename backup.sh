#!/bin/bash

AUTO=$(echo "$*" | grep -- "--tag AUTO")

if [[ -z "${AUTO}" ]]; then
  UTAG="--tag USER"
fi

./rb backup $* ${UTAG}
