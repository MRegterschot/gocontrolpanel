import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import { encodePassthroughParams } from "../../src/core/gbx/params";

const { serializeMethodCall } = createRequire(import.meta.url)(
  "xmlrpc/lib/serializer",
) as { serializeMethodCall(method: string, params: unknown[]): string };

describe("passthrough XML-RPC encoding", () => {
  it.each([0, 1, 0.5])("encodes CallVoteRatio %s as a double", (ratio) => {
    const options = { CallVoteRatio: ratio, CurrentMaxPlayers: 32 };
    const params = encodePassthroughParams("SetServerOptions", [options]);
    const xml = serializeMethodCall("SetServerOptions", params);
    expect(xml).toContain(
      `<name>CallVoteRatio</name><value><double>${ratio}</double>`,
    );
    expect(xml).toContain("<name>CurrentMaxPlayers</name><value><int>32</int>");
    expect(options.CallVoteRatio).toBe(ratio);
  });

  it("leaves unrelated calls unchanged", () => {
    const params = [100, 0];
    expect(encodePassthroughParams("GetPlayerList", params)).toBe(params);
  });
});
