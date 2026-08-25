import { ServerError } from "@/types/responses";
import { describe, expect, it } from "vitest";
import { isExpectedError, toClientError } from "../errors";

describe("toClientError", () => {
  it("exposes ServerError messages, which we author ourselves", () => {
    expect(
      toClientError(new ServerError("Map not found", "MapNotFound")),
    ).toEqual({ message: "Map not found", code: "MapNotFound" });
  });

  it("exposes Hetzner API validation feedback", () => {
    expect(
      toClientError({ code: "uniqueness_error", message: "name already used" }),
    ).toEqual({ message: "Name already used", code: "uniqueness_error" });
  });

  it("unwraps an XML-RPC fault from the game server", () => {
    expect(
      toClientError(
        new ServerError("Error: XML-RPC fault: Login unknown.", "GbxError"),
      ),
    ).toEqual({ message: "Login unknown.", code: "GbxError" });
  });

  // The point of the module: internals must not reach the browser.
  it("hides the detail of errors we did not author", () => {
    const prismaish = Object.assign(
      new Error(
        'Invalid `db.servers.findMany()` invocation: column "secret" does not exist',
      ),
      { name: "PrismaClientKnownRequestError", code: "P2022" },
    );
    expect(toClientError(prismaish)).toEqual({
      message: "Something went wrong",
      code: "InternalError",
    });
  });

  it("hides plain Errors and non-error values", () => {
    const generic = { message: "Something went wrong", code: "InternalError" };
    expect(toClientError(new Error("ECONNREFUSED 10.0.0.4:22"))).toEqual(
      generic,
    );
    expect(toClientError(new TypeError("x is not a function"))).toEqual(
      generic,
    );
    expect(toClientError("a bare string")).toEqual(generic);
    expect(toClientError(null)).toEqual(generic);
    expect(toClientError(undefined)).toEqual(generic);
  });

  it("does not treat an arbitrary object with a message as a Hetzner error", () => {
    expect(toClientError({ message: "internal detail" })).toEqual({
      message: "Something went wrong",
      code: "InternalError",
    });
  });
});

describe("isExpectedError", () => {
  it("treats an unauthorized request as routine", () => {
    expect(
      isExpectedError(new ServerError("Unauthorized", "Unauthorized")),
    ).toBe(true);
  });

  it("does not treat other ServerErrors as routine", () => {
    expect(isExpectedError(new ServerError("Boom", "GbxConnectionError"))).toBe(
      false,
    );
  });

  it("does not treat unknown errors as routine", () => {
    expect(isExpectedError(new Error("boom"))).toBe(false);
    expect(isExpectedError(null)).toBe(false);
  });
});
