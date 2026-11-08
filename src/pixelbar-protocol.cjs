'use strict';
// SPDX-License-Identifier: GPL-3.0-only
// Extracted from nxz1026/Mineradio; see THIRD_PARTY.md.
const PACKET_LENGTH = 64;

function checksumV2(packetBeforeChecksum) {
  // 从 AA 字节（索引 1）起求和
  let sum = 0;
  for (let i = 1; i < packetBeforeChecksum.length; i++) sum += packetBeforeChecksum[i];
  return sum % 256;
}

function pad64(buf) {
  if (buf.length >= PACKET_LENGTH) return buf.slice(0, PACKET_LENGTH);
  const out = Buffer.alloc(PACKET_LENGTH, 0);
  buf.copy(out, 0);
  return out;
}

function buildFrameV2(cmd, payloadBytes) {
  const payload = Buffer.from(payloadBytes);
  const head = Buffer.from([0x2E, 0xAA, 0xED, cmd, (payload.length >> 8) & 0xFF, payload.length & 0xFF]);
  const before = Buffer.concat([head, payload]);
  const pkt = Buffer.concat([before, Buffer.from([checksumV2(before)])]);
  return pad64(pkt);
}

function buildAlignPacket(alignByte, r, g, b) {
  // cmd 0xEF, payload: 01 R G B 00 02 00 <align> FF
  return buildFrameV2(0xEF, Buffer.from([0x01, r & 0xFF, g & 0xFF, b & 0xFF, 0x00, 0x02, 0x00, alignByte & 0xFF, 0xFF]));
}

module.exports = { buildFrameV2, buildAlignPacket };
