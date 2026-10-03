export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    // Separate module so the edge build doesn't pull in Node-only code
    const { registerNode } = await import("./instrumentation-node");
    await registerNode();
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
