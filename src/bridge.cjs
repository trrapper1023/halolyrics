'use strict';
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const run = promisify(execFile);
const { join } = require('node:path');
const hid = require('node-hid');
const { buildFrameV2, buildAlignPacket } = require('./pixelbar-protocol.cjs');
const { makeFrames, frameAt } = require('./lyric-scroll.cjs');

const adapter = join(__dirname, '../vendor/mediaremote-adapter');
const normalize = value => String(value || '').normalize('NFKC').trim().toLowerCase();
const resolved = new Map();
let device, song, lines = [], lastLine, lastError, snapshot, load, displayedLine;
let nextWriteAttempt = 0;
let idleSceneApplied = false;
let displayMode;
let devicePath;
let tempoHubOpen;
function report(message) {
  if (message !== lastError) console.log(message);
  lastError = message;
}
function parseLyrics(lrc) {
  return lrc.split(/\r?\n/).flatMap(line => {
    const text = line.replace(/\[[^\]]*\]/g, '').trim();
    return [...line.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)]
      .map(([, minutes, seconds]) => ({ time: 60 * +minutes + +seconds, text }));
  }).sort((a, b) => a.time - b.time);
}
async function getLyrics(id) {
  const url = new URL('https://music.163.com/api/song/lyric');
  url.search = new URLSearchParams({ id, lv: '-1', tv: '-1', kv: '-1' });
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw Error(`网易云歌词请求失败（${response.status}）`);
  const result = await response.json();
  return parseLyrics(result.lrc?.lyric || '');
}
function findDevice() {
  return hid.devices().find(d => d.vendorId === 0x2d99 && [0xa160, 0xa106].includes(d.productId) && d.usagePage === 0xff14);
}
function openDevice() {
  const match = findDevice();
  if (!match) throw Error('未找到花再音箱，请检查 USB 数据连接。');
  const handle = new hid.HID(match.path);
  devicePath = match.path;
  return handle;
}
function releaseDevice() {
  try { device?.close(); } catch {}
  device = undefined;
  displayMode = undefined;
  devicePath = undefined;
  lastLine = undefined;
}
async function watchTempoHub() {
  try {
    let running = true;
    try {
      await run('/usr/bin/pgrep', ['-f', '/EDIFIER TempoHub[.]app/Contents/MacOS/EDIFIER TempoHub$'], { timeout: 2000 });
    } catch (error) {
      if (error.code !== 1) throw error;
      running = false;
    }
    if (running !== tempoHubOpen) {
      tempoHubOpen = running;
      if (running) {
        releaseDevice();
        snapshot = undefined;
        report('TempoHub 已打开，音箱控制已交还。');
      } else {
        idleSceneApplied = false;
        nextWriteAttempt = 0;
        report('TempoHub 未运行，歌词服务自动接管。');
      }
    }
  } catch (error) {
    tempoHubOpen = undefined;
    releaseDevice();
    report(`暂时无法检查 TempoHub 状态：${error.message}`);
  } finally {
    setTimeout(watchTempoHub, 200);
  }
}
function showIdleScene() {
  snapshot = undefined;
  if (tempoHubOpen !== false || performance.now() < nextWriteAttempt) return;
  if (idleSceneApplied && findDevice()?.path === devicePath) return;
  if (idleSceneApplied) {
    idleSceneApplied = false;
    releaseDevice();
  }
  try {
    device ??= openDevice();
    // Native clock scene, template 0. The speaker renders this without USB updates.
    device.write(buildFrameV2(0xef, [1, 0xf0, 0xb4, 0xc8, 0, 1, 0, 0, 0xff]));
    idleSceneApplied = true;
    displayMode = 'clock';
    lastLine = undefined;
    report('已切回内置时钟。');
  } catch (error) {
    nextWriteAttempt = performance.now() + 3000;
    report(`暂未切换到时钟：${error.message}`);
    releaseDevice();
  }
}
function writeLine(text) {
  device ??= openDevice();
  if (displayMode !== 'lyrics') {
    device.write(buildAlignPacket(1, 102, 175, 255));
    displayMode = 'lyrics';
  }
  const bytes = Buffer.from(text);
  device.write(buildFrameV2(0xe8, [0, bytes.length, ...bytes]));
}
function render() {
  const now = performance.now();
  if (tempoHubOpen !== false || !snapshot || song !== snapshot.id || now - snapshot.observedAt > 2000 || now < nextWriteAttempt) return;
  const seconds = snapshot.seconds + (now - snapshot.observedAt) / 1000;
  const index = lines.findLastIndex(line => line.time <= seconds);
  const line = lines[index];
  if (line !== displayedLine?.line) displayedLine = { line, frames: makeFrames(line?.text ?? '') };
  const duration = line ? (lines[index + 1]?.time ?? snapshot.duration ?? line.time + 6) - line.time : 0;
  const current = line ? frameAt(displayedLine.frames, seconds - line.time, duration > 0 ? duration : 6) : '';
  if (current === lastLine) return;
  try { writeLine(current); lastLine = current; report('花再已接收网易云 App 歌词。'); }
  catch (error) {
    releaseDevice();
    nextWriteAttempt = now + 1500;
    report(error.message.includes('exclusive access') ? '花再接口被占用，请退出 TempoHub 和旧的歌词同步程序。' : error.message);
  }
}
async function sync() {
  const state = snapshot;
  if (!state || state.error) { if (state?.error) report(state.error); return; }
  if (!/^\d+$/.test(state.id) || !Number.isFinite(state.seconds)) return;
  if (song !== state.id) {
    if (load) return;
    load = getLyrics(state.id);
    try { lines = await load; song = state.id; lastLine = undefined; }
    catch (error) { report(error.message); return; }
    finally { load = undefined; }
    if (snapshot?.id !== song) return;
  }
  render();
}

async function poll() {
  try {
    if (tempoHubOpen !== false) return;
    const { stdout } = await run('/usr/bin/perl', [join(adapter, 'bin/mediaremote-adapter.pl'), join(adapter, 'MediaRemoteAdapter.framework'), 'get', '--no-artwork', '--now'], { timeout: 4000 });
    const media = JSON.parse(stdout);
    if (media?.bundleIdentifier !== 'com.netease.163music' || !media.title) {
      showIdleScene();
      return;
    }
    if (!media.playing) { showIdleScene(); return; }
    idleSceneApplied = false;
    if (!Number.isFinite(media.elapsedTimeNow)) {
      snapshot = undefined;
      report('正在等待有效的播放进度。');
      return;
    }
    if (device && findDevice()?.path !== devicePath) releaseDevice();
    const observedAt = performance.now();
    const key = [media.title, media.artist, media.duration].join('|');
    if (!resolved.has(key)) {
      snapshot = undefined;
      report('正在匹配当前歌曲的歌词。');
      const search = new URL('https://music.163.com/api/search/get/web');
      search.search = new URLSearchParams({ s: [media.title, media.artist].filter(Boolean).join(' '), type: '1', limit: '30' });
      const response = await fetch(search, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw Error(`网易云歌曲搜索失败（${response.status}）`);
      const result = await response.json();
      if (result.code !== 200) throw Error(`网易云歌曲搜索暂不可用（${result.code ?? "未知状态"}）`);
      const artists = normalize(media.artist);
      const candidates = (result.result?.songs || []).filter(track =>
        normalize(track.name) === normalize(media.title) &&
        (!artists || track.artists?.some(artist => artists.includes(normalize(artist.name))))
      );
      candidates.sort((a, b) => Math.abs(a.duration / 1000 - media.duration) - Math.abs(b.duration / 1000 - media.duration));
      const match = candidates[0];
      resolved.set(key, match && (!media.duration || Math.abs(match.duration / 1000 - media.duration) < 8) ? String(match.id) : null);
    }
    const id = resolved.get(key);
    if (!id) { report(`未匹配到当前录音的网易云歌词：${media.title} · ${media.artist || ''}`); return; }
    snapshot = { id, seconds: media.elapsedTimeNow, observedAt, duration: media.duration };
    await sync();
  } catch (error) {
    report(`同步暂不可用：${error.message}`);
  } finally {
    setTimeout(poll, 750);
  }
}
console.log('歌词同步服务已启动。');
setInterval(render, 60);
void watchTempoHub();
void poll();
process.on('exit', () => { try { device?.close(); } catch {} });
process.on('SIGINT', () => process.exit());
process.on('SIGTERM', () => process.exit());
