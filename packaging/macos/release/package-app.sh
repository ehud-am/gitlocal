#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
VERSION="$(node -p "require('${ROOT_DIR}/package.json').version")"
BUILD_DIR="${ROOT_DIR}/native/macos/build"
ARTIFACT_DIR="${ROOT_DIR}/packaging/macos/release/artifacts"
APP_PATH="${BUILD_DIR}/Build/Products/Release/GitLocal.app"
RESOURCES_PATH="${APP_PATH}/Contents/Resources"
GITLOCAL_RESOURCES="${RESOURCES_PATH}/gitlocal"
RUNTIME_RESOURCES="${RESOURCES_PATH}/runtime"
ICON_PATH="${RESOURCES_PATH}/GitLocal.icns"
SWIFT_MODULE_CACHE="${BUILD_DIR}/SwiftModuleCache"
ARTIFACT_PATH="${ARTIFACT_DIR}/GitLocal-${VERSION}-macos.zip"

mkdir -p "${ARTIFACT_DIR}"

npm run build

xcodebuild \
  -project "${ROOT_DIR}/native/macos/GitLocal/GitLocal.xcodeproj" \
  -scheme GitLocal \
  -configuration Release \
  -derivedDataPath "${BUILD_DIR}" \
  CODE_SIGNING_ALLOWED=NO

rm -rf "${GITLOCAL_RESOURCES}" "${RUNTIME_RESOURCES}"
mkdir -p "${GITLOCAL_RESOURCES}/ui" "${RUNTIME_RESOURCES}"
cp -R "${ROOT_DIR}/dist" "${GITLOCAL_RESOURCES}/dist"
cp -R "${ROOT_DIR}/ui/dist" "${GITLOCAL_RESOURCES}/ui/dist"
cp "${ROOT_DIR}/package.json" "${GITLOCAL_RESOURCES}/package.json"

NODE_PATH="$(command -v node)"
cp "${NODE_PATH}" "${RUNTIME_RESOURCES}/node"
chmod +x "${RUNTIME_RESOURCES}/node"

mkdir -p "${SWIFT_MODULE_CACHE}"
swift -module-cache-path "${SWIFT_MODULE_CACHE}" "${ROOT_DIR}/packaging/macos/release/generate-app-icon.swift" "${ICON_PATH}"

/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "${APP_PATH}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${VERSION}" "${APP_PATH}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile GitLocal" "${APP_PATH}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIconName GitLocal" "${APP_PATH}/Contents/Info.plist"

touch "${APP_PATH}"
if [[ -x /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister ]]; then
  /System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister \
    -f -R -trusted "${APP_PATH}" >/dev/null 2>&1 || true
fi

rm -f "${ARTIFACT_PATH}" "${ARTIFACT_PATH}.sha256"
(
  cd "$(dirname "${APP_PATH}")"
  ditto -c -k --keepParent "GitLocal.app" "${ARTIFACT_PATH}"
)
shasum -a 256 "${ARTIFACT_PATH}" > "${ARTIFACT_PATH}.sha256"

echo "${ARTIFACT_PATH}"
