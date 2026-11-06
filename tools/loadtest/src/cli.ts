import { browsersConfig, runBrowsers } from "./browsers.js";
import { registrations, runServers, serversConfig } from "./servers.js";
import { Args } from "./util.js";

const USAGE = `Usage: loadtest <servers|browsers> [options]   (see tools/loadtest/README.md)`;

function stopSignal(): Promise<void> {
  return new Promise((resolve) => {
    process.once("SIGINT", resolve);
    process.once("SIGTERM", resolve);
  });
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);
  // Without this, --help would start a run with the defaults
  if (
    !command ||
    ["-h", "--help", "help"].includes(command) ||
    rest.some((a) => a === "-h" || a === "--help")
  ) {
    console.log(USAGE);
    return;
  }
  const args = new Args(rest);
  if (command === "servers") {
    const cfg = serversConfig(args);
    if (args.bool("print-registrations")) {
      console.log(JSON.stringify(registrations(cfg), null, 2));
      return;
    }
    await runServers(cfg, stopSignal());
  } else if (command === "browsers") {
    await runBrowsers(await browsersConfig(args), stopSignal());
  } else {
    throw new Error(USAGE);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error((e as Error).message);
  process.exit(1);
});
