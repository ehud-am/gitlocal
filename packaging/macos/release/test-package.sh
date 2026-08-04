#!/usr/bin/env bash
set -euo pipefail

APP_PATH="${1:-native/macos/build/Build/Products/Release/GitLocal.app}"

test -d "${APP_PATH}"
test -x "${APP_PATH}/Contents/MacOS/GitLocal"
test -x "${APP_PATH}/Contents/Resources/runtime/node"
test -f "${APP_PATH}/Contents/Resources/GitLocal.icns"
test ! -d "${APP_PATH}/Contents/Resources/GitLocal.iconset"
test -f "${APP_PATH}/Contents/Resources/gitlocal/package.json"
test -f "${APP_PATH}/Contents/Resources/gitlocal/dist/cli.js"
test -f "${APP_PATH}/Contents/Resources/gitlocal/dist/index.js"
test -f "${APP_PATH}/Contents/Resources/gitlocal/ui/dist/index.html"

APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "${APP_PATH}/Contents/Info.plist")"
PACKAGE_VERSION="$(node -p "require(process.cwd() + '/package.json').version")"
APP_ICON="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIconFile' "${APP_PATH}/Contents/Info.plist")"
APP_ICON_NAME="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIconName' "${APP_PATH}/Contents/Info.plist")"

if [[ "${APP_VERSION}" != "${PACKAGE_VERSION}" ]]; then
  echo "Version mismatch: app=${APP_VERSION} package=${PACKAGE_VERSION}" >&2
  exit 1
fi

if [[ "${APP_ICON}" != "GitLocal" ]]; then
  echo "Icon mismatch: app icon=${APP_ICON}" >&2
  exit 1
fi

if [[ "${APP_ICON_NAME}" != "GitLocal" ]]; then
  echo "Icon name mismatch: app icon name=${APP_ICON_NAME}" >&2
  exit 1
fi

codesign --verify --deep --strict --verbose=2 "${APP_PATH}" >/dev/null

LOG_FILE="$(mktemp)"
SERVICE_PID=""
cleanup() {
  if [[ -n "${SERVICE_PID}" ]] && kill -0 "${SERVICE_PID}" 2>/dev/null; then
    kill "${SERVICE_PID}" 2>/dev/null || true
    wait "${SERVICE_PID}" 2>/dev/null || true
  fi
  rm -f "${LOG_FILE}"
}
trap cleanup EXIT

"${APP_PATH}/Contents/Resources/runtime/node" \
  "${APP_PATH}/Contents/Resources/gitlocal/dist/cli.js" \
  --app-mode >"${LOG_FILE}" 2>&1 &
SERVICE_PID="$!"

SERVICE_URL=""
for _ in {1..50}; do
  if ! kill -0 "${SERVICE_PID}" 2>/dev/null; then
    echo "Packaged service exited before readiness:" >&2
    cat "${LOG_FILE}" >&2
    exit 1
  fi

  SERVICE_URL="$(grep -Eo 'http://(127\.0\.0\.1|localhost):[0-9]+' "${LOG_FILE}" | head -n 1 || true)"
  if [[ -n "${SERVICE_URL}" ]]; then
    break
  fi
  sleep 0.1
done

if [[ -z "${SERVICE_URL}" ]]; then
  echo "Packaged service did not report a readiness URL:" >&2
  cat "${LOG_FILE}" >&2
  exit 1
fi

curl -fsS "${SERVICE_URL}/api/info" >/dev/null

echo "Package validation passed for ${APP_PATH}"
