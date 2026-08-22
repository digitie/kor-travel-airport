#!/usr/bin/env bash
set -euo pipefail

cat >&2 <<'MESSAGE'
Legacy ODROID deployment is disabled.
Use scripts/deploy-server14.sh for 192.168.1.14 only.
Docker must never be started, stopped, or rebuilt on 192.168.1.13.
MESSAGE
exit 2
