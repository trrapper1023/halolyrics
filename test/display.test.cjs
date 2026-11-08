'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const {makeFrames, frameAt} = require('../src/lyric-scroll.cjs');
const {buildFrameV2, buildAlignPacket} = require('../src/pixelbar-protocol.cjs');

test('短句一次显示，长句的最后一帧包含句尾', () => {
  assert.deepEqual(makeFrames('花再 test'), ['花再 test']);
  const line = '甲乙丙丁戊己庚辛壬癸甲乙丙丁戊己庚辛壬癸';
  const frames = makeFrames(line);
  assert(frames.every(frame => Buffer.byteLength(frame) <= 48));
  assert(frames.length > 1 && line.endsWith(frameAt(frames, 3.9, 4)));
});

test('文字、歌词模式和时钟帧均使用 64 字节与 V2 校验', () => {
  for (const frame of [
    buildFrameV2(0xe8, [0, 1, 65]),
    buildAlignPacket(1, 102, 175, 255),
    buildFrameV2(0xef, [1, 0xf0, 0xb4, 0xc8, 0, 1, 0, 0, 0xff]),
  ]) {
    assert.equal(frame.length, 64);
    const end = 6 + frame.readUInt16BE(4);
    assert.equal(frame[end], frame.subarray(1, end).reduce((a,b)=>a+b,0) % 256);
  }
});
