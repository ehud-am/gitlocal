#!/usr/bin/env bash
set -euo pipefail

VERSION="$(node -p "require(process.cwd() + '/package.json').version")"
CASK_PATH="${1:-packaging/macos/cask/gitlocal.rb}"
APP_PATH="${2:-native/macos/build/Build/Products/Release/GitLocal.app}"

grep -q "version \"${VERSION}\"" "${CASK_PATH}"
grep -q "GitLocal-${VERSION}-macos" "${CASK_PATH}"

if [[ -d "${APP_PATH}" ]]; then
  APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "${APP_PATH}/Contents/Info.plist")"
  if [[ "${APP_VERSION}" != "${VERSION}" ]]; then
    echo "App version mismatch: app=${APP_VERSION} package=${VERSION}" >&2
    exit 1
  fi
fi

echo "Version alignment passed for ${VERSION}"
