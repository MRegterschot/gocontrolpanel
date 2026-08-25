import { ServerError } from "@/types/responses";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { isExpectedError, toClientError } from "../errors";
import { validate } from "../validation";

const Schema = z.object({
  name: z.string().min(1, "Name is required"),
  size: z.number().int().positive(),
  labels: z.array(z.string()).optional(),
});

describe("validate", () => {
  it("returns the parsed value when the input is valid", () => {
    expect(validate(Schema, { name: "vol-1", size: 10 })).toEqual({
      name: "vol-1",
      size: 10,
    });
  });

  it("strips properties the schema does not declare", () => {
    // Matters at the action boundary: a caller cannot smuggle extra fields
    // through into a database write or an API body.
    expect(
      validate(Schema, { name: "vol-1", size: 10, isAdmin: true }),
    ).toEqual({ name: "vol-1", size: 10 });
  });

  it("throws a ValidationError naming the offending fields", () => {
    expect(() => validate(Schema, { name: "", size: -1 })).toThrow(ServerError);

    try {
      validate(Schema, { name: "", size: -1 });
    } catch (error) {
      expect((error as ServerError).name).toBe("ValidationError");
      expect((error as ServerError).message).toContain(
        "name: Name is required",
      );
      expect((error as ServerError).message).toContain("size:");
    }
  });

  it("rejects input of the wrong shape entirely", () => {
    expect(() => validate(Schema, null)).toThrow(ServerError);
    expect(() => validate(Schema, "not an object")).toThrow(ServerError);
    expect(() => validate(Schema, [])).toThrow(ServerError);
  });

  it("produces an error that is exposed to the client but not to Sentry", () => {
    try {
      validate(Schema, { name: "", size: 1 });
    } catch (error) {
      // Field feedback is our own text, so it is safe to show...
      expect(toClientError(error)).toEqual({
        message: "name: Name is required",
        code: "ValidationError",
      });
      // ...and bad input from a caller is not an incident.
      expect(isExpectedError(error)).toBe(true);
    }
  });
});
