#!/usr/bin/env bash
set -euo pipefail

CASK_PATH="packaging/macos/cask/gitlocal.rb"
VERSION=""
URL=""
SHA256=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --cask)
      CASK_PATH="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --url)
      URL="$2"
      shift 2
      ;;
    --sha256)
      SHA256="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "${VERSION}" || -z "${URL}" || -z "${SHA256}" ]]; then
  echo "Usage: $0 [--cask path] --version VERSION --url URL --sha256 SHA256" >&2
  exit 1
fi

perl -0pi -e "s/version \"[^\"]+\"/version \"${VERSION}\"/" "${CASK_PATH}"
perl -0pi -e "s/sha256 \"[^\"]+\"/sha256 \"${SHA256}\"/" "${CASK_PATH}"
perl -0pi -e "s#url \"[^\"]+\"#url \"${URL}\"#" "${CASK_PATH}"

echo "Updated ${CASK_PATH}"
