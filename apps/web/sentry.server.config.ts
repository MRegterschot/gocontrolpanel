import { initializeSentry } from "@/lib/sentry/init";
import { serverOptions } from "@/lib/sentry/server";

initializeSentry(serverOptions);
