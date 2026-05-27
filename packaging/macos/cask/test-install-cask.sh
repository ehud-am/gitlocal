#!/usr/bin/env bash
set -euo pipefail

CASK_PATH="${1:-packaging/macos/cask/gitlocal.rb}"
ARTIFACT_PATH="${2:-}"
CASK_TOKEN="gitlocal-local-test"
APP_TARGET="${CASK_TOKEN}.app"
APPDIR="$(mktemp -d "${TMPDIR:-/tmp}/gitlocal-cask-apps.XXXXXX")"
HOMEBREW_CACHE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/gitlocal-homebrew-cache.XXXXXX")"
TEMP_CASK=""
TAP_NAME="gitlocal/local-test"
export HOMEBREW_CACHE="${HOMEBREW_CACHE_DIR}"
export HOMEBREW_NO_AUTO_UPDATE=1

cleanup() {
  brew uninstall --cask --force "${TAP_NAME}/${CASK_TOKEN}" >/dev/null 2>&1 || true
  brew untap --force "${TAP_NAME}" >/dev/null 2>&1 || true
  rm -rf "${APPDIR}"
  rm -rf "${HOMEBREW_CACHE_DIR}"
  if [[ -n "${TEMP_CASK}" ]]; then
    rm -f "${TEMP_CASK}"
  fi
}
trap cleanup EXIT

if [[ -n "${ARTIFACT_PATH}" ]]; then
  ABS_ARTIFACT="$(cd "$(dirname "${ARTIFACT_PATH}")" && pwd)/$(basename "${ARTIFACT_PATH}")"
  SHA256="$(shasum -a 256 "${ABS_ARTIFACT}" | awk '{print $1}')"
  VERSION="$(basename "${ABS_ARTIFACT}" | sed -E 's/^GitLocal-([^-]+)-macos\.zip$/\1/')"
  TEMP_CASK="$(mktemp "${TMPDIR:-/tmp}/gitlocal-local-cask.XXXXXX.rb")"
  cp "${CASK_PATH}" "${TEMP_CASK}"
  perl -0pi -e "s/version \"[^\"]+\"/version \"${VERSION}\"/" "${TEMP_CASK}"
  perl -0pi -e "s#url \"[^\"]+\"#url \"file://${ABS_ARTIFACT}\"#" "${TEMP_CASK}"
  perl -0pi -e "s/sha256 \"[^\"]+\"/sha256 \"${SHA256}\"/" "${TEMP_CASK}"
  CASK_PATH="${TEMP_CASK}"
fi

brew untap --force "${TAP_NAME}" >/dev/null 2>&1 || true
brew tap-new "${TAP_NAME}" >/dev/null
TAP_REPO="$(brew --repository)/Library/Taps/gitlocal/homebrew-local-test"
mkdir -p "${TAP_REPO}/Casks"
cp "${CASK_PATH}" "${TAP_REPO}/Casks/${CASK_TOKEN}.rb"
perl -0pi -e "s/^cask \"[^\"]+\" do/cask \"${CASK_TOKEN}\" do/" "${TAP_REPO}/Casks/${CASK_TOKEN}.rb"
perl -0pi -e "s/app \"GitLocal\.app\"/app \"GitLocal.app\", target: \"${APP_TARGET}\"/" "${TAP_REPO}/Casks/${CASK_TOKEN}.rb"

brew uninstall --cask --force "${TAP_NAME}/${CASK_TOKEN}" >/dev/null 2>&1 || true
brew install --cask --force --appdir="${APPDIR}" "${TAP_NAME}/${CASK_TOKEN}"
test -d "${APPDIR}/${APP_TARGET}"
brew uninstall --cask --force "${TAP_NAME}/${CASK_TOKEN}"

echo "Cask install/uninstall validation passed for ${CASK_PATH}"
