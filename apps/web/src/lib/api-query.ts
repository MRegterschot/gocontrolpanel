import { intParam } from "@/lib/api-route";
import "server-only";
import { z } from "zod";

// Labels for the CSV export; free text
export const headerList = z.array(z.string().min(1).max(100)).max(50);

// Property paths into a match record ("map.name"), so a plain dotted name
export const columnList = z
  .array(
    z
      .string()
      .regex(/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)*$/)
      .max(100),
  )
  .max(50);

// Search on Trackmania Exchange. Everything but `after` and `count` is handed to TMX as a search
// filter, so the keys are open-ended but bounded.
export const tmxQuery = z
  .object({
    after: intParam.min(0).optional(),
    count: intParam.min(1).max(100).optional(),
  })
  .catchall(z.string().max(200))
  .refine((q) => Object.keys(q).length <= 20, "Too many parameters")
  .transform(({ after, count, ...queryParams }) => ({
    queryParams: queryParams as Record<string, string>,
    after,
    count,
  }));
