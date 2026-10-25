import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertProvisioningChoices,
  HandlebarsServer,
} from "../src/lib/handlebars";

const template = (name: string) =>
  HandlebarsServer.compile(
    readFileSync(path.join(__dirname, "../hetzner", name), "utf-8"),
  );

const hostile = `a'b"$(touch /tmp/pwned)\`id\`;x`;

describe("provisioning templates", () => {
  it("keeps database values as single shell words", () => {
    const script = template("database-init.sh.hbs")({
      db_type: "postgres",
      db_user: "tmcp",
      db_name: "tmcp",
      db_password: hostile,
      db_root_password: hostile,
    });
    const line = script
      .split("\n")
      .find((l) => l.includes("POSTGRES_PASSWORD"))!;
    const value = line
      .trim()
      .replace(/^-e POSTGRES_PASSWORD=/, "")
      .replace(/ \\$/, "");
    // bash reads the quoted word back as the literal value, without running anything
    expect(execFileSync("bash", ["-c", `printf %s ${value}`]).toString()).toBe(
      hostile,
    );
  });

  it("refuses line breaks that would end an env heredoc", () => {
    const render = template("add-server.sh.hbs");
    const data = {
      stack_name: "stack-1",
      dedi_login: "login",
      dedi_password: "pw\nEOF\ntouch /tmp/pwned",
    };
    expect(() => render(data)).toThrow(/line breaks/);
  });

  it("quotes the stack name used in paths", () => {
    const script = template("add-server.sh.hbs")({
      stack_name: "$(id)",
      dedi_login: "login",
      dedi_password: "pw",
    });
    expect(script).toContain("STACK_NAME='$(id)'");
    expect(script).not.toContain("{{");
  });

  it("only accepts known database and controller types", () => {
    expect(() => assertProvisioningChoices("mysql", "pyplanet")).not.toThrow();
    expect(() => assertProvisioningChoices("mysql/;id")).toThrow();
    expect(() => assertProvisioningChoices(undefined, "../evil")).toThrow();
  });
});
