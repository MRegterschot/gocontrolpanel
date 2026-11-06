import Handlebars from "handlebars";
import { createRequire } from "node:module";
import { Worker } from "node:worker_threads";

// Handlebars parses templates slowly inside QuickJS (pick & ban's takes longer than a plugin call
// may run), so templates are compiled to JavaScript here and only executed in the sandbox. A
// hostile template can't gain anything from this: the generated code runs in the sandbox too.
export function precompileTemplates(sources: Record<string, string>): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const [name, source] of Object.entries(sources)) {
    try {
      specs[name] = Handlebars.precompile(source) as string;
    } catch (error) {
      throw new Error(
        `Template ${name} doesn't compile: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  return specs;
}

export interface CompileLimits {
  timeoutMs: number;
  maxHeapMb: number;
  maxTemplates: number;
}

export const DEFAULT_COMPILE_LIMITS: CompileLimits = {
  timeoutMs: 5_000,
  maxHeapMb: 64,
  maxTemplates: 200,
};

const handlebarsPath = createRequire(import.meta.url).resolve("handlebars");

// Runs in the worker; CommonJS because eval workers are not modules
const WORKER_SOURCE = `
const { parentPort, workerData } = require("node:worker_threads");
const Handlebars = require(workerData.handlebarsPath);
const specs = {};
for (const [name, source] of Object.entries(workerData.sources)) {
  try {
    specs[name] = Handlebars.precompile(source);
  } catch (error) {
    parentPort.postMessage({ error: "Template " + name + " doesn't compile: " + (error && error.message) });
    return;
  }
}
parentPort.postMessage({ specs });
`;

// Plugin packages are untrusted: their templates compile in a worker with a deadline and a
// heap limit, so a pathological template can't stall or exhaust the service
export function precompileUntrustedTemplates(
  sources: Record<string, string>,
  limits: CompileLimits = DEFAULT_COMPILE_LIMITS,
): Promise<Record<string, string>> {
  if (Object.keys(sources).length > limits.maxTemplates) {
    return Promise.reject(new Error(`A plugin may have at most ${limits.maxTemplates} templates`));
  }
  if (Object.keys(sources).length === 0) return Promise.resolve({});

  return new Promise((resolve, reject) => {
    const worker = new Worker(`(() => {${WORKER_SOURCE}})()`, {
      eval: true,
      workerData: { sources, handlebarsPath },
      resourceLimits: {
        maxOldGenerationSizeMb: limits.maxHeapMb,
        maxYoungGenerationSizeMb: Math.max(4, Math.floor(limits.maxHeapMb / 4)),
        stackSizeMb: 4,
      },
    });
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      fn();
    };
    const timer = setTimeout(
      () => finish(() => reject(new Error("Compiling the plugin's templates took too long"))),
      limits.timeoutMs,
    );
    worker.once("message", (message: { specs?: Record<string, string>; error?: string }) =>
      finish(() =>
        message.error ? reject(new Error(message.error)) : resolve(message.specs ?? {}),
      ),
    );
    worker.once("error", (error) =>
      finish(() => reject(new Error(`Compiling the plugin's templates failed: ${error.message}`))),
    );
    worker.once("exit", (code) =>
      finish(() => reject(new Error(`Template compiler stopped (exit ${code})`))),
    );
  });
}
