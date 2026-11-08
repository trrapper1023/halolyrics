'use strict';
const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
const wideGlyph = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}\u3000-\u303f\uff01-\uff60]/u;

function makeFrames(text) {
  const glyphs = Array.from(segmenter.segment(text), entry => entry.segment);
  const frames = [];
  for (let start = 0; start < glyphs.length; start++) {
    let end = start;
    let bytes = 0;
    let columns = 0;
    while (end < glyphs.length) {
      const glyph = glyphs[end];
      const length = Buffer.byteLength(glyph);
      const width = wideGlyph.test(glyph) ? 2 : 1;
      if (bytes + length > 48 || columns + width > 32) break;
      bytes += length;
      columns += width;
      end++;
    }
    if (end === start) {
      frames.push('�');
      continue;
    }
    frames.push(glyphs.slice(start, end).join(''));
    if (end === glyphs.length) break;
  }
  return frames.length ? frames : [''];
}

function frameAt(frames, elapsed, duration) {
  if (frames.length === 1) return frames[0];
  const hold = Math.min(0.45, duration * 0.2);
  const travel = Math.min((frames.length - 1) * 0.22, Math.max(0.01, duration - 2 * hold));
  const fraction = Math.max(0, Math.min(1, (elapsed - hold) / travel));
  return frames[Math.floor(fraction * (frames.length - 1))];
}

module.exports = { makeFrames, frameAt };
