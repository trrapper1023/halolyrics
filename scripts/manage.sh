#!/bin/zsh
set -eu
root="${0:A:h}/.."
label=local.halo.netease-lyrics
domain="gui/$(id -u)"
job="$domain/$label"
base="$HOME/Library/Application Support/HaloNetEaseLyrics"
runtime="$base/managed-runtime"
plist="$HOME/Library/LaunchAgents/$label.plist"
log="$base/managed-service.log"
loaded() { /bin/launchctl print "$job" >/dev/null 2>&1; }
stop() {
  if loaded; then /bin/launchctl bootout "$job"; fi
  for attempt in {1..20}; do
    if ! loaded; then return 0; fi
    sleep 0.25
  done
  echo '旧服务仍未退出，已停止安装。' >&2
  return 1
}
start() {
  for attempt in {1..5}; do
    if /bin/launchctl bootstrap "$domain" "$plist"; then return 0; fi
    sleep 1
  done
  return 1
}
case "${1:-status}" in
  status)
    if loaded; then /bin/launchctl print "$job" | /usr/bin/grep -E 'state =|pid =|runs ='; else echo '歌词服务未运行。'; fi
    ;;
  doctor)
    "$0" status
    if [[ -x "$runtime/vendor/mediaremote-adapter/MediaRemoteAdapter.framework/MediaRemoteAdapter" ]]; then
      /usr/bin/perl "$runtime/vendor/mediaremote-adapter/bin/mediaremote-adapter.pl" \
        "$runtime/vendor/mediaremote-adapter/MediaRemoteAdapter.framework" get --no-artwork --now |
        node -e 'const d=JSON.parse(require("node:fs").readFileSync(0,"utf8")||"null");console.log("网易云状态:",d?.bundleIdentifier==="com.netease.163music"?(d.playing?"播放中":"已暂停"):"未检测到")'
      (cd "$runtime"; node -e 'console.log("支持的 USB 控制接口:",require("node-hid").devices().filter(d=>d.vendorId===11673&&[0xa160,0xa106].includes(d.productId)&&d.usagePage===65300).length)')
    fi
    if [[ -f "$log" ]]; then /usr/bin/tail -n 15 "$log"; fi
    ;;
  install)
    [[ $(uname -s) == Darwin ]] || { echo '仅支持 macOS。'; exit 1; }
    node_bin="$(command -v node)"
    "$node_bin" -e 'if(process.versions.node.split(".")[0]!=="24") throw Error("需要 Node.js 24")'
    command -v npm >/dev/null
    /usr/bin/xcrun --find clang >/dev/null
    /bin/launchctl print "$domain" >/dev/null
    mkdir -p "$base" "${plist:h}"
    lock="$base/.install-lock"
    mkdir "$lock" || { echo '已有安装或卸载操作在运行。'; exit 1; }
    stage="$(mktemp -d "$base/.stage.XXXXXX")"
    trap 'rm -rf -- "$stage"; rmdir "$lock"' EXIT
    mkdir "$stage/new"
    cp -R "$root"/{src,vendor,scripts,package.json,package-lock.json,LICENSE,THIRD_PARTY.md} "$stage/new/"
    (cd "$stage/new"; npm ci --no-audit --no-fund; ./scripts/build-adapter.sh)
    [[ ! -e "$plist" ]] || { echo '检测到现有歌词服务，将使用同一个登录项升级。'; cp "$plist" "$stage/old.plist"; }
    "$node_bin" - "$node_bin" "$runtime" "$log" > "$stage/new.plist" <<'NODE'
const [node, path, log] = process.argv.slice(2);
const esc = s => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
console.log(`<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict>
<key>Label</key><string>local.halo.netease-lyrics</string>
<key>ProgramArguments</key><array><string>${esc(node)}</string><string>${esc(path)}/src/bridge.cjs</string></array>
<key>WorkingDirectory</key><string>${esc(path)}</string>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>ThrottleInterval</key><integer>10</integer>
<key>StandardOutPath</key><string>${esc(log)}</string>
<key>StandardErrorPath</key><string>${esc(log)}</string>
</dict></plist>`);
NODE
    /usr/bin/plutil -lint "$stage/new.plist"
    stop
    if [[ -d "$runtime" ]]; then mv "$runtime" "$stage/old"; fi
    if ! (mv "$stage/new" "$runtime" && cp "$stage/new.plist" "$plist" &&
         /bin/launchctl enable "$job" && start); then
      stop
      rm -rf -- "$runtime"
      if [[ -d "$stage/old" ]]; then mv "$stage/old" "$runtime"; fi
      if [[ -f "$stage/old.plist" ]]; then
        cp "$stage/old.plist" "$plist"
        start
      else
        rm -f -- "$plist"
      fi
      echo '安装失败，已尝试恢复旧版本。' >&2
      exit 1
    fi
    echo '安装完成。请用网易云官方 App 播放歌曲。'
    ;;
  uninstall)
    [[ -d "$runtime" ]] || { echo '没有找到本项目安装的受管版本。'; exit 1; }
    lock="$base/.install-lock"
    mkdir "$lock" || { echo '已有安装或卸载操作在运行。'; exit 1; }
    trap 'rmdir "$lock"' EXIT
    stop
    rm -f -- "$plist" "$log"
    rm -rf -- "$runtime"
    echo '已移除受管版本和登录项。'
    ;;
  *) echo "用法: $0 {install|status|doctor|uninstall}" >&2; exit 2 ;;
esac
