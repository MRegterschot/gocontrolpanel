import { ServerError } from "@/types/responses";
import { describe, expect, it } from "vitest";
import {
  capitalize,
  capitalizeWords,
  formatBytes,
  formatTime,
  getCurrentId,
  getErrorMessage,
  getList,
  isValidHetznerServerName,
  removePrefix,
  toReadableTitle,
} from "../utils";

describe("formatTime", () => {
  it("renders a placeholder for missing or non-positive times", () => {
    expect(formatTime(undefined)).toBe("--:--.---");
    expect(formatTime(0)).toBe("--:--.---");
    expect(formatTime(-1)).toBe("--:--.---");
  });

  it("renders sub-minute times as zero-padded seconds", () => {
    expect(formatTime(1234)).toBe("01.234");
    expect(formatTime(59999)).toBe("59.999");
  });

  it("renders minute-and-over times with a minute component", () => {
    expect(formatTime(60000)).toBe("1:00.000");
    expect(formatTime(83456)).toBe("1:23.456");
  });
});

describe("getErrorMessage", () => {
  it("uses the message of an Error", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
  });

  it("uses the message of a ServerError", () => {
    expect(
      getErrorMessage(new ServerError("not allowed", "Unauthorized")),
    ).toBe("not allowed");
  });

  it("capitalises a bare object with a message, such as a Hetzner API error", () => {
    expect(
      getErrorMessage({ code: "not_found", message: "no such server" }),
    ).toBe("No such server");
  });

  it("unwraps an XML-RPC fault", () => {
    expect(
      getErrorMessage(new Error("Error: XML-RPC fault: Login unknown.")),
    ).toBe("Login unknown.");
  });

  it("falls back to a generic message for values it cannot read", () => {
    expect(getErrorMessage(null)).toBe("Something went wrong");
    expect(getErrorMessage("a bare string")).toBe("Something went wrong");
  });
});

describe("getList", () => {
  it("passes arrays through", () => {
    expect(getList<string>(["a", "b"])).toEqual(["a", "b"]);
  });

  it("wraps a bare string", () => {
    expect(getList<string>("a")).toEqual(["a"]);
  });

  it("returns an empty list for null and undefined", () => {
    expect(getList<string>(null)).toEqual([]);
    expect(getList<string>(undefined)).toEqual([]);
  });

  // This branch only exists because the MySQL schema stores these columns as
  // Json while the Postgres one uses a native array. See ARCHITECTURE_REVIEW.md
  // section 2 -- the helper should disappear once the schemas converge.
  it("returns the keys of a plain object", () => {
    expect(getList<string>({ a: 1, b: 2 })).toEqual(["a", "b"]);
  });
});

describe("formatBytes", () => {
  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("scales to the largest fitting unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 ** 3)).toBe("1 GB");
  });

  it("clamps beyond the largest known unit rather than reading past the array", () => {
    expect(formatBytes(1024 ** 6)).toBe("1048576 TB");
  });

  it("honours the decimals argument", () => {
    expect(formatBytes(1536, 0)).toBe("2 KB");
  });
});

describe("getCurrentId", () => {
  it("extracts the server id from a server route", () => {
    expect(getCurrentId("/server/abc-123/live")).toBe("abc-123");
    expect(getCurrentId("/server/abc-123/files/editor")).toBe("abc-123");
  });

  it("returns null for routes without a server id", () => {
    expect(getCurrentId("/admin/users")).toBeNull();
    expect(getCurrentId("/")).toBeNull();
  });
});

describe("isValidHetznerServerName", () => {
  it("accepts valid hostnames", () => {
    expect(isValidHetznerServerName("tm-server-1")).toBe(true);
    expect(isValidHetznerServerName("a.b.c")).toBe(true);
  });

  it("rejects names that are not valid hostnames", () => {
    expect(isValidHetznerServerName("-leading-dash")).toBe(false);
    expect(isValidHetznerServerName("Uppercase")).toBe(false);
    expect(isValidHetznerServerName("under_score")).toBe(false);
    expect(isValidHetznerServerName("")).toBe(false);
  });

  it("rejects names longer than 253 characters", () => {
    expect(isValidHetznerServerName("a".repeat(254))).toBe(false);
  });
});

describe("string helpers", () => {
  it("capitalises the first letter only", () => {
    expect(capitalize("hello world")).toBe("Hello world");
    expect(capitalize("")).toBe("");
  });

  it("capitalises every word", () => {
    expect(capitalizeWords("hello world")).toBe("Hello World");
  });

  it("removes a prefix only when present", () => {
    expect(removePrefix("/UserData/Maps", "/UserData")).toBe("/Maps");
    expect(removePrefix("/Maps", "/UserData")).toBe("/Maps");
  });

  it("turns a field name into a readable title", () => {
    expect(toReadableTitle("serverName")).toBe("Server Name");
  });
});
