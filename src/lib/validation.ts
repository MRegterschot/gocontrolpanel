import { ServerError } from "@/types/responses";
import { z } from "zod";

/**
 * Validates input at the server-action boundary.
 *
 * Every exported `"use server"` function is a public HTTP endpoint whose
 * arguments are attacker-controlled. The zod schemas in `src/forms` run in the
 * browser as form validation, which is a UX affordance and no more -- a request
 * made directly against the action never touches them. This is where they are
 * enforced.
 *
 * Failures throw a `ServerError` coded `ValidationError`, which `lib/errors`
 * treats as expected: the message is safe to show (it is our own field
 * feedback), it is logged at `warn`, and it does not raise a Sentry event.
 */
export function validate<S extends z.ZodType>(
  schema: S,
  input: unknown,
): z.infer<S> {
  const result = schema.safeParse(input);

  if (!result.success) {
    throw new ServerError(formatIssues(result.error), "ValidationError");
  }

  return result.data;
}

/** Renders zod issues as `field: message`, joined -- safe to show to the caller. */
function formatIssues(error: z.ZodError): string {
  const issues = error.issues.map((issue) => {
    const path = issue.path.join(".");
    return path ? `${path}: ${issue.message}` : issue.message;
  });

  // Deduplicate: a union or a refine can report the same message on one field.
  return [...new Set(issues)].join(", ") || "Invalid input";
}
