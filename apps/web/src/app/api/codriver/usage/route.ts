import { apiRoute } from "@/lib/api-route";
import { getCodriverUsage } from "@/services/codriver-usage";
export const GET = apiRoute(() => getCodriverUsage());
