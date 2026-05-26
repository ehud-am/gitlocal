#!/usr/bin/env bash
set -euo pipefail

ARTIFACT_PATH="${1:?Usage: $0 ARTIFACT_PATH [EXPECTED_SHA256]}"
EXPECTED_SHA256="${2:-}"

test -f "${ARTIFACT_PATH}"
ACTUAL_SHA256="$(shasum -a 256 "${ARTIFACT_PATH}" | awk '{print $1}')"

if [[ -n "${EXPECTED_SHA256}" && "${ACTUAL_SHA256}" != "${EXPECTED_SHA256}" ]]; then
  echo "Checksum mismatch: expected=${EXPECTED_SHA256} actual=${ACTUAL_SHA256}" >&2
  exit 1
fi

echo "${ACTUAL_SHA256}"
