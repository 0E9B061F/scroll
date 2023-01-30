#!/bin/bash

q() {
  cat ./data/arch.json | jq -r "$*"
}

supercheck() {
  if [[ `whoami` != "root" ]]; then
    echo "Error: this script must be run as root"
    exit 1
  fi
}

LOGF=$(q ".logs")
KEYF="./data/key"
SOLO=""
USRN="${SUDO_USER}"
[[ -z "${USRN}" ]] && USRN=`whoami`

WILD="."
SOLO=${WILD}

perform() {
  name="$1"
  shift 1
  repo=$(q ".repos.${name}")
  echo
  echo ">>> Repository \"${name}\" (${repo}):"
  restic --verbose            \
    -r "${repo}"              \
    --password-file "${KEYF}" \
    $@
  echo "$(date +%F/%T)~${USRN}> ran '$*'" >> "${repo}/${LOGF}"
}

action() {
  supercheck
  if [[ "${SOLO}" == "${WILD}" ]]; then
    names=( $(q ".repos | keys | .[]") )
    for name in ${names[@]}; do
      perform "${name}" $@
    done
  else
    perform "${SOLO}" $@
  fi
}

trysolo() {
  SOLO="$1"
  [[ -z "${SOLO}" ]] && SOLO=${WILD}
}

tagify() {
  tags="$*"
  echo "${tags}" | sed 's/\(\S\+\)/--tag \1/g'
}

cmd.list() {
  action snapshots
}

cmd.repos() {
  names=( $(q ".repos | keys | .[]") )
  for i in ${!names[@]}; do
    name="${names[$i]}"
    rp=$(q ".repos.${name}")
    echo "${i}: ${name} (${rp})"
  done
}

cmd.backups() {
  names=( $(q ".backups | keys | .[]") )
  for i in ${!names[@]}; do
    name="${names[$i]}"
    bp=$(q ".backups.${name}")
    echo "${i}: ${name} (${bp})"
  done
}

cmd.logs() {
  if [[ "${SOLO}" == "${WILD}" ]]; then
    names=( $(q ".repos | keys | .[]") )
    for name in ${names[@]}; do
      path=$(q ".repos.${name}")
      cat "${path}/${LOGF}"
    done
  else
    path=$(q ".repos.${SOLO}")
    cat "${path}/${LOGF}"
  fi
}

cmd.unlock() {
  supercheck
  if [[ "${SOLO}" == "${WILD}" ]]; then
    names=( $(q ".repos | keys | .[]") )
    for name in ${names[@]}; do
      path=$(q ".repos.${name}")
      ./unlock.sh "${path}"
    done
  else
    path=$(q ".repos.${SOLO}")
    ./unlock.sh "${path}"
  fi
}

cmd.backup() {
  bname="$1"
  gtag=$(q ".tags.global[]" | tr "\n" " ")
  gtag=$(tagify ${gtag})
  atag=""
  if [[ -z "${bname}" ]]; then
    bname=${WILD}
  else
    shift 1
    SOLO="$1"
    if [[ -z "${SOLO}" ]]; then
      SOLO=${WILD}
    else
      shift 1
      atag=$(tagify $@)
    fi
  fi
  if [[ "${bname}" == "${WILD}" ]]; then
    names=( $(q ".backups | keys | .[]") )
    for name in ${names[@]}; do
      path=$(q ".backups.${name}")
      btag=$(q ".tags.backups.${name}[]" | tr "\n" " ")
      btag=$(tagify "${btag}")
      utag=""
      auto=$(echo "${gtag} ${btag} ${atag}" | grep -- "--tag AUTO")
      [[ -z "${auto}" ]] && utag="--tag USER"
      action backup --one-file-system "${utag}" "${gtag}" "${btag}" "${atag}" "${path}"
    done
  else
    path=$(q ".backups.${bname}")
    btag=$(q ".tags.backups.${bname}[]" | tr "\n" " ")
    btag=$(tagify "${btag}")
    utag=""
    auto=$(echo "${gtag} ${btag} ${atag}" | grep -- "--tag AUTO")
    [[ -z "${auto}" ]] && utag="--tag USER"
    action backup --one-file-system "${utag}" "${gtag}" "${btag}" "${atag}" "${path}"
  fi
}


CMD="$1"
shift 1

if [[ "${CMD}" == "x" ]]; then
  action $@
elif [[ "${CMD}" == "X" ]]; then
  SOLO="$1"
  shift 1
  action $@
elif [[ "${CMD}" == "list" ]]; then
  trysolo $@
  cmd.list
elif [[ "${CMD}" == "repos" ]]; then
  cmd.repos
elif [[ "${CMD}" == "backups" ]]; then
  cmd.backups
elif [[ "${CMD}" == "logs" ]]; then
  trysolo $@
  cmd.logs
elif [[ "${CMD}" == "unlock" ]]; then
  trysolo $@
  cmd.unlock
elif [[ "${CMD}" == "backup" ]]; then
  cmd.backup $@
fi
