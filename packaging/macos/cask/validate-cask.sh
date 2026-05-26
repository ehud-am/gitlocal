#!/usr/bin/env bash
set -euo pipefail

CASK_PATH="${1:-packaging/macos/cask/gitlocal.rb}"

test -f "${CASK_PATH}"
ruby -c "${CASK_PATH}" >/dev/null

grep -Eq '^[[:space:]]*version "[^"]+"' "${CASK_PATH}"
grep -Eq '^[[:space:]]*sha256 "[^"]+"' "${CASK_PATH}"
grep -Eq '^[[:space:]]*url "[^"]+"' "${CASK_PATH}"
grep -Eq '^[[:space:]]*name "GitLocal"' "${CASK_PATH}"
grep -Eq '^[[:space:]]*desc "[^"]+"' "${CASK_PATH}"
grep -Eq '^[[:space:]]*homepage "https://github.com/ehud-am/gitlocal"' "${CASK_PATH}"
grep -Eq '^[[:space:]]*app "GitLocal.app"' "${CASK_PATH}"

if grep -q "PLACEHOLDER_SHA256" "${CASK_PATH}"; then
  echo "Cask still contains placeholder checksum" >&2
  exit 1
fi

echo "Cask metadata validation passed for ${CASK_PATH}"
