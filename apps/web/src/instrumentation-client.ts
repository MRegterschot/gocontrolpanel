import { browserOptions } from "@/lib/sentry/browser";
import { initializeSentry } from "./lib/sentry/init";

initializeSentry(browserOptions);
