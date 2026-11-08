#!/bin/zsh
set -eu
cd "${0:A:h}/../vendor/mediaremote-adapter"
mkdir -p MediaRemoteAdapter.framework
/usr/bin/xcrun clang -dynamiclib -fobjc-arc -I include -I src \
  src/adapter/*.m src/private/*.m src/utility/*.m \
  -framework Foundation -framework AppKit -framework UniformTypeIdentifiers \
  -o MediaRemoteAdapter.framework/MediaRemoteAdapter
/usr/bin/codesign --force --sign - MediaRemoteAdapter.framework/MediaRemoteAdapter
