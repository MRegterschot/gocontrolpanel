import { paginationQuery } from "@/lib/api-route";
import { codriverStatuses } from "@/types/codriver";
import { z } from "zod";

export const codriverHistoryQuery = paginationQuery.extend({
  status: z.enum(codriverStatuses).optional(),
  login: z.string().trim().max(100).optional(),
});
