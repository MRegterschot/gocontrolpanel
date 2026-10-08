import { apiRoute } from "@/lib/api-route";
import { getCodriverPanelOverview } from "@/services/codriver";

export const GET = apiRoute(() => getCodriverPanelOverview());
