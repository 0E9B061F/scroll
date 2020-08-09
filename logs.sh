#!/bin/bash

REPO=`cat ./data/arch-repo`
LOGF=`cat ./data/arch-logs`
LOGS="${REPO}/${LOGF}"


cat "${LOGS}"
