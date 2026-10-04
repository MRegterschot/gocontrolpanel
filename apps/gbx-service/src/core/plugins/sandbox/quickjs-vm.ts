import variant from "@jitl/quickjs-wasmfile-release-sync";
import {
  newQuickJSWASMModuleFromVariant,
  newVariant,
  type QuickJSContext,
  type QuickJSHandle,
  type QuickJSRuntime,
} from "quickjs-emscripten-core";

// One QuickJS interpreter in its own WebAssembly instance (about 0.7 MB), so a plugin that
// breaks the interpreter only breaks itself. Values cross as JSON strings.

export type FaultKind = "timeout" | "memory" | "crash";

// The plugin broke a limit or the interpreter; the plugin has to be turned off
export class SandboxFault extends Error {
  constructor(
    readonly kind: FaultKind,
    message: string,
  ) {
    super(message);
    this.name = "SandboxFault";
  }
}

// An ordinary exception thrown by plugin code
export class GuestError extends Error {
  constructor(name: string, message: string, readonly guestStack?: string) {
    super(message);
    this.name = name || "Error";
  }
}

export interface VmOptions {
  wasmModule: WebAssembly.Module;
  memoryBytes: number;
  stackBytes: number;
  now: () => number;
  // Synchronous host function; the return value is sent back as JSON
  onHostCall(method: string, argsJson: string): unknown;
  // Asynchronous host function; settled later through the bridge
  onHostAsync(id: number, method: string, argsJson: string): void;
  // Milliseconds spent in the guest by every entry, for the per-minute CPU budget
  onCpu(ms: number): void;
}

type BridgeArg = string | number | boolean;

export class QuickJsVm {
  private deadline = Number.POSITIVE_INFINITY;
  private disposed = false;
  private bridge: QuickJSHandle | null = null;

  private constructor(
    private readonly runtime: QuickJSRuntime,
    private readonly vm: QuickJSContext,
    private readonly options: VmOptions,
  ) {}

  static async create(options: VmOptions): Promise<QuickJsVm> {
    const module = await newQuickJSWASMModuleFromVariant(
      newVariant(variant, { wasmModule: options.wasmModule }),
    );
    const runtime = module.newRuntime();
    runtime.setMemoryLimit(options.memoryBytes);
    runtime.setMaxStackSize(options.stackBytes);
    const vm = runtime.newContext();
    const instance = new QuickJsVm(runtime, vm, options);
    runtime.setInterruptHandler(() => options.now() > instance.deadline);
    instance.installHostFunctions();
    return instance;
  }

  get isDisposed(): boolean {
    return this.disposed;
  }

  // Runs a script in the global scope
  evaluate(source: string, filename: string, budgetMs: number): void {
    this.enter(budgetMs, () => {
      const result = this.vm.evalCode(source, filename, { type: "global" });
      if (result.error) throw this.toError(result.error);
      result.value.dispose();
    });
  }

  // Calls __tmcp[method]; returns the plain result, or a promise when the guest returned one
  callBridge(method: string, args: BridgeArg[], budgetMs: number): unknown {
    let promise: Promise<unknown> | null = null;
    const value = this.enter(budgetMs, () => {
      const bridge = this.bridgeHandle();
      const fn = this.vm.getProp(bridge, method);
      const handles = args.map((arg) => this.toHandle(arg));
      try {
        const result = this.vm.callFunction(fn, bridge, ...handles);
        if (result.error) throw this.toError(result.error);
        try {
          if (this.isPromise(result.value)) {
            promise = this.awaitGuestPromise(result.value);
            return undefined;
          }
          return this.vm.dump(result.value);
        } finally {
          result.value.dispose();
        }
      } finally {
        fn.dispose();
        for (const handle of handles) {
          if (handle.alive && handle !== this.vm.true && handle !== this.vm.false) handle.dispose();
        }
      }
    });
    this.runJobs(budgetMs);
    return promise ?? value;
  }

  // Promise continuations queued by the last entry
  runJobs(budgetMs: number): void {
    if (this.disposed) return;
    this.enter(budgetMs, () => {
      const result = this.runtime.executePendingJobs();
      if (result.error) throw this.toError(result.error);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.bridge?.dispose();
      this.vm.dispose();
      this.runtime.dispose();
    } catch {
      // A leaked handle makes QuickJS abort on teardown; the instance is dropped either way
    }
  }

  private installHostFunctions(): void {
    const { vm } = this;
    const hostCall = vm.newFunction("__host_call", (methodHandle, argsHandle) => {
      let response: string;
      try {
        const value = this.options.onHostCall(vm.getString(methodHandle), vm.getString(argsHandle));
        response = JSON.stringify({ ok: true, value: value === undefined ? null : value });
      } catch (error) {
        response = JSON.stringify({ ok: false, error: describeError(error) });
      }
      return vm.newString(response);
    });
    vm.setProp(vm.global, "__host_call", hostCall);
    hostCall.dispose();

    const hostAsync = vm.newFunction("__host_async", (idHandle, methodHandle, argsHandle) => {
      this.options.onHostAsync(
        vm.getNumber(idHandle),
        vm.getString(methodHandle),
        vm.getString(argsHandle),
      );
    });
    vm.setProp(vm.global, "__host_async", hostAsync);
    hostAsync.dispose();
  }

  private bridgeHandle(): QuickJSHandle {
    if (!this.bridge) {
      const handle = this.vm.getProp(this.vm.global, "__tmcp");
      if (this.vm.typeof(handle) !== "object") {
        handle.dispose();
        throw new SandboxFault("crash", "The sandbox runtime is missing");
      }
      this.bridge = handle;
    }
    return this.bridge;
  }

  private enter<T>(budgetMs: number, fn: () => T): T {
    if (this.disposed) throw new SandboxFault("crash", "The sandbox was disposed");
    const started = this.options.now();
    this.deadline = started + budgetMs;
    try {
      return fn();
    } catch (error) {
      if (error instanceof SandboxFault || error instanceof GuestError) throw error;
      // The WebAssembly instance aborted; nothing in it can be trusted any more
      throw new SandboxFault("crash", `The sandbox crashed: ${describeError(error).message}`);
    } finally {
      this.deadline = Number.POSITIVE_INFINITY;
      this.options.onCpu(Math.max(0, this.options.now() - started));
    }
  }

  private toError(handle: QuickJSHandle): Error {
    let raw: any;
    try {
      raw = this.vm.dump(handle);
    } finally {
      handle.dispose();
    }
    const name = raw && typeof raw === "object" && typeof raw.name === "string" ? raw.name : "Error";
    const message =
      raw && typeof raw === "object" && typeof raw.message === "string" ? raw.message : String(raw);
    if (name === "InternalError" && message === "interrupted") {
      return new SandboxFault("timeout", "The plugin ran longer than its time limit");
    }
    if (message === "out of memory") {
      return new SandboxFault("memory", "The plugin used more memory than its limit");
    }
    return new GuestError(name, message, typeof raw?.stack === "string" ? raw.stack : undefined);
  }

  private isPromise(handle: QuickJSHandle): boolean {
    if (this.vm.typeof(handle) !== "object") return false;
    const then = this.vm.getProp(handle, "then");
    try {
      return this.vm.typeof(then) === "function";
    } finally {
      then.dispose();
    }
  }

  // The native promise settles once the guest's promise does, as later entries run its jobs
  private awaitGuestPromise(handle: QuickJSHandle): Promise<unknown> {
    return this.vm.resolvePromise(handle).then((result) => {
      if (result.error) throw this.toError(result.error);
      try {
        return this.vm.dump(result.value);
      } finally {
        result.value.dispose();
      }
    });
  }

  private toHandle(arg: BridgeArg): QuickJSHandle {
    if (typeof arg === "string") return this.vm.newString(arg);
    if (typeof arg === "number") return this.vm.newNumber(arg);
    return arg ? this.vm.true : this.vm.false;
  }
}

export function describeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) return { name: error.name, message: error.message };
  return { name: "Error", message: String(error) };
}
