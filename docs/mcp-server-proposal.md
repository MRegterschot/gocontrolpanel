# Potential future feature: MCP server

Status: idea for future consideration; not implemented or scheduled.

A Model Context Protocol (MCP) server could give AI assistants structured access to GoControlPanel server state, plugin diagnostics and development workflows. The strongest use case is closing the plugin development feedback loop: inspect the environment, build and validate a plugin, deploy it to a development server, observe its behavior and iterate.

## Value and scope

- Diagnose live server and plugin problems using runtime state, configuration, granted capabilities and errors.
- Help plugin authors test changes against a designated development server.
- Expose SDK documentation, types and examples matching the target SDK version, especially for authors working outside this repository.
- Later, support scoped server administration such as configuring map pools and preparing matches.

General repository editing and wrappers around existing build commands offer less additional value: coding assistants can already read files and run the SDK CLI. Runtime feedback and useful diagnostics should drive the feature.

## Suggested first version

Start with read-only tools such as `list_servers`, `get_server_state` and `get_plugin_status`. Return structured results scoped to the caller's accessible servers. Add bounded, plugin-filtered logs and recent events once suitable diagnostic interfaces exist. Expose versioned SDK documentation and examples as MCP resources.

Then consider package validation and deployment to explicitly configured development servers, followed by isolated scenario tests using recorded or synthetic events. Event replay must run in a test harness rather than inject synthetic events into a live match. Actual visual behavior still needs verification in Trackmania.

An example target workflow is: "This widget stops updating after a map change; reproduce the problem and fix it." The assistant would inspect configuration and errors, edit the plugin through its normal file tools, build and validate the package, deploy to the development server and inspect the resulting behavior.

## Architecture and boundaries

Implement a thin MCP adapter in a separate workspace package, reusing application operations and shared validation instead of duplicating business logic. Local stdio transport could support developer tooling; remote HTTP could support deployed panels. Choose the initial transport and authentication model when implementation is planned.

Dedicated-server connections and plugin execution must remain in the GBX service. The MCP adapter must live outside the plugin sandbox. Enforce user and server authorization at every entry point, preserve auditing for writes and redact secrets from configuration and diagnostics. The internal `GBX_SERVICE_TOKEN` is not a substitute for user authorization. Prefer specific operations over unrestricted GBX calls, database access or arbitrary code execution tools.

## Existing foundations and additional work

- The [Plugin SDK](plugin-sdk.md) CLI already scaffolds, builds, packages and validates plugins.
- The [GBX service internal routes](../apps/gbx-service/src/http/routes/internal.ts) already provide server status, live snapshots and plugin reloads; they are internal interfaces, not a user-authorized public API.
- Existing sandbox tests and the [real-server test plan](real-server-testing.md) provide starting points for verification.
- Structured plugin diagnostics, a reusable event-replay harness and an authorized development deployment workflow need design and implementation; MCP does not supply these features itself.

Prioritize reusable diagnostics and testing operations, then expose them through MCP. Evaluate the feature by whether it meaningfully reduces the manual build, upload, reproduce and inspect cycle for plugin authors.
