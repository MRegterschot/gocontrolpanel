// "server-only" throws outside Next's server bundle; scripts run server-side anyway.
// Loaded with bun --preload; declared here so the web typecheck needs no Bun types.
declare const Bun: {
  plugin(plugin: {
    name: string;
    setup(build: {
      module(
        id: string,
        load: () => { exports: object; loader: "object" },
      ): void;
    }): void;
  }): void;
};

Bun.plugin({
  name: "server-only-stub",
  setup(build) {
    build.module("server-only", () => ({ exports: {}, loader: "object" }));
  },
});

export {};
