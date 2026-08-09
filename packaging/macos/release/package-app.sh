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
mkdir -p "${GITLOCAL_RESOURCES}/ui" "${GITLOCAL_RESOURCES}/node_modules" "${RUNTIME_RESOURCES}"
cp -R "${ROOT_DIR}/dist" "${GITLOCAL_RESOURCES}/dist"
cp -R "${ROOT_DIR}/ui/dist" "${GITLOCAL_RESOURCES}/ui/dist"
cp "${ROOT_DIR}/package.json" "${GITLOCAL_RESOURCES}/package.json"

# node-pty ships a native addon and is intentionally --external to the esbuild bundle (see
# src/terminal/session-manager.ts), so it's never inlined into dist/index.js. It must be copied
# alongside dist/ here so Node's module resolution walk-up finds it at runtime inside the bundle.
cp -R "${ROOT_DIR}/node_modules/node-pty" "${GITLOCAL_RESOURCES}/node_modules/node-pty"

NODE_PATH="$(command -v node)"
cp "${NODE_PATH}" "${RUNTIME_RESOURCES}/node"
chmod +x "${RUNTIME_RESOURCES}/node"

# Official nodejs.org/actions-setup-node builds are statically linked, but some distributions
# (e.g. Homebrew's node formula) link `node` dynamically against a shared libnode.*.dylib. Copy
# that dylib alongside the binary if present, so the packaged app doesn't depend on the dylib
# still being installed at its original build-machine path. Mirrors dyld's own @rpath search
# order (same directory, then a sibling lib/ directory) so it resolves without further rpath work.
NODE_DIR="$(dirname "${NODE_PATH}")"
LIBNODE_NAME="$(otool -L "${NODE_PATH}" | awk '/libnode\.[0-9]+\.dylib/ { n = $1; sub(/^.*\//, "", n); print n; exit }')"
if [[ -n "${LIBNODE_NAME}" ]]; then
  for candidate in "${NODE_DIR}/${LIBNODE_NAME}" "${NODE_DIR}/../lib/${LIBNODE_NAME}"; do
    if [[ -f "${candidate}" ]]; then
      cp "${candidate}" "${RUNTIME_RESOURCES}/${LIBNODE_NAME}"
      break
    fi
  done
  if [[ ! -f "${RUNTIME_RESOURCES}/${LIBNODE_NAME}" ]]; then
    echo "warning: ${NODE_PATH} depends on ${LIBNODE_NAME} but it could not be located to bundle" >&2
  fi
fi

mkdir -p "${SWIFT_MODULE_CACHE}"
swift -module-cache-path "${SWIFT_MODULE_CACHE}" "${ROOT_DIR}/packaging/macos/release/generate-app-icon.swift" "${ICON_PATH}"

/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${VERSION}" "${APP_PATH}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${VERSION}" "${APP_PATH}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIconFile GitLocal" "${APP_PATH}/Contents/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleIconName GitLocal" "${APP_PATH}/Contents/Info.plist"

xattr -cr "${APP_PATH}"
codesign --force --deep --sign - "${APP_PATH}" >/dev/null
codesign --verify --deep --strict --verbose=2 "${APP_PATH}" >/dev/null

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
