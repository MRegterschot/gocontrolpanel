import { describe, expect, it } from "vitest";
import {
  FrameParser,
  HANDSHAKE,
  encodeFrame,
  encodeHandshake,
} from "../src/wire.js";
import {
  faultResponse,
  methodCall,
  methodResponse,
  parseMethodCall,
} from "../src/xml.js";

describe("framing", () => {
  it("round-trips frames split across chunks", () => {
    const xml = methodCall("GetPlayerList", [1000, 0]);
    const buf = Buffer.concat([
      encodeHandshake(),
      encodeFrame(0x80000005, xml),
      encodeFrame(1, "<x/>"),
    ]);
    const parser = new FrameParser(true);
    const frames = [];
    for (let i = 0; i < buf.length; i += 7)
      frames.push(...parser.push(buf.subarray(i, i + 7)));
    expect(parser.handshake).toBe(HANDSHAKE);
    expect(frames).toEqual([
      { handle: 0x80000005, xml },
      { handle: 1, xml: "<x/>" },
    ]);
  });

  it("uses the utf8 byte length in the header", () => {
    const buf = encodeFrame(1, "é");
    expect(buf.readUInt32LE(0)).toBe(2);
    expect(buf.readUInt32LE(4)).toBe(1);
  });

  it("rejects oversized frames", () => {
    const head = Buffer.alloc(8);
    head.writeUInt32LE(0x7fffffff, 0);
    expect(() => new FrameParser().push(head)).toThrow(/too large/);
  });
});

describe("xml helpers", () => {
  it("parses calls and builds responses", async () => {
    expect(await parseMethodCall(methodCall("Echo", ["a", "b"]))).toEqual({
      method: "Echo",
      params: ["a", "b"],
    });
    expect(methodResponse(true)).toContain("<boolean>1</boolean>");
    expect(faultResponse(-1000, "Unknown method")).toContain("<fault>");
  });
});
