// GBXRemote 2 framing: uint32 LE xml length + uint32 LE handle + xml
export const HANDSHAKE = "GBXRemote 2";
// Request handles carry the high bit; responses echo them, callbacks do not have it
export const REQUEST_BIT = 0x80000000;
export const CALLBACK_HANDLE = 1;
const MAX_FRAME = 16 * 1024 * 1024;

export function encodeHandshake(): Buffer {
  const body = Buffer.from(HANDSHAKE, "utf8");
  const head = Buffer.alloc(4);
  head.writeUInt32LE(body.length);
  return Buffer.concat([head, body]);
}

export function encodeFrame(handle: number, xml: string): Buffer {
  const body = Buffer.from(xml, "utf8");
  const buf = Buffer.alloc(8 + body.length);
  buf.writeUInt32LE(body.length, 0);
  buf.writeUInt32LE(handle >>> 0, 4);
  body.copy(buf, 8);
  return buf;
}

export interface Frame {
  handle: number;
  xml: string;
}

// Incremental frame reader; throws on oversized frames
export class FrameParser {
  private buf = Buffer.alloc(0);
  private handshakeDone: boolean;
  handshake: string | null = null;

  // expectHandshake: parse the leading "GBXRemote 2" first (client side)
  constructor(expectHandshake = false) {
    this.handshakeDone = !expectHandshake;
  }

  push(chunk: Buffer): Frame[] {
    this.buf = Buffer.concat([this.buf, chunk]);
    const frames: Frame[] = [];
    for (;;) {
      if (this.buf.length < 4) break;
      const size = this.buf.readUInt32LE(0);
      if (size > MAX_FRAME) throw new Error(`frame too large (${size})`);
      if (!this.handshakeDone) {
        if (this.buf.length < 4 + size) break;
        this.handshake = this.buf.subarray(4, 4 + size).toString("utf8");
        this.buf = this.buf.subarray(4 + size);
        this.handshakeDone = true;
        continue;
      }
      if (this.buf.length < 8 + size) break;
      frames.push({
        handle: this.buf.readUInt32LE(4),
        xml: this.buf.subarray(8, 8 + size).toString("utf8"),
      });
      this.buf = this.buf.subarray(8 + size);
    }
    return frames;
  }
}
