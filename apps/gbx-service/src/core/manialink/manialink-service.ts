import type { GbxCall, GbxConnection } from "../gbx/connection";
import type { Logger } from "../logger";

function emptyManialink(id: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks><manialink id="${id}"></manialink></manialinks>`;
}

// Displays manialinks and remembers them so (re)connecting players get the same UI.
// Kept in memory: every GBX (re)connect starts from a clean slate anyway.
export class ManialinkService {
  private readonly publicPages = new Map<string, string>();
  private readonly playerPages = new Map<string, Map<string, string>>();

  constructor(
    private readonly gbx: GbxConnection,
    private readonly log: Logger,
  ) {}

  display(id: string, xml: string, login?: string): void {
    this.hide(id, login);

    if (login) {
      this.pagesFor(login).set(id, xml);
      this.gbx.send("SendDisplayManialinkPageToLogin", login, xml, 0, false);
    } else {
      this.publicPages.set(id, xml);
      this.gbx.send("SendDisplayManialinkPage", xml, 0, false);
    }

    this.log.trace({ manialinkId: id, login }, "Displayed manialink");
  }

  hide(id: string, login?: string): void {
    const xml = emptyManialink(id);
    if (login) {
      this.gbx.send("SendDisplayManialinkPageToLogin", login, xml, 0, false);
    } else {
      this.gbx.send("SendDisplayManialinkPage", xml, 0, false);
    }
  }

  destroy(id: string, login?: string): void {
    this.hide(id, login);
    if (login) {
      this.playerPages.get(login)?.delete(id);
    } else {
      this.publicPages.delete(id);
    }
  }

  // Re-sends everything currently displayed (public and per player)
  async resendAll(): Promise<void> {
    const calls: GbxCall[] = [];
    for (const xml of this.publicPages.values()) {
      calls.push(["SendDisplayManialinkPage", xml, 0, false]);
    }
    for (const [login, pages] of this.playerPages) {
      for (const xml of pages.values()) {
        calls.push(["SendDisplayManialinkPageToLogin", login, xml, 0, false]);
      }
    }
    await this.multicall(calls);
  }

  async onPlayerConnect(login: string): Promise<void> {
    const calls: GbxCall[] = [];
    for (const xml of this.publicPages.values()) {
      calls.push(["SendDisplayManialinkPageToLogin", login, xml, 0, false]);
    }
    for (const xml of this.playerPages.get(login)?.values() ?? []) {
      calls.push(["SendDisplayManialinkPageToLogin", login, xml, 0, false]);
    }
    await this.multicall(calls);
  }

  onPlayerDisconnect(login: string): void {
    this.playerPages.delete(login);
  }

  clear(): void {
    this.publicPages.clear();
    this.playerPages.clear();
  }

  // Exposed for tests and diagnostics
  displayedIds(login?: string): string[] {
    return [...(login ? (this.playerPages.get(login)?.keys() ?? []) : this.publicPages.keys())];
  }

  private pagesFor(login: string): Map<string, string> {
    let pages = this.playerPages.get(login);
    if (!pages) {
      pages = new Map();
      this.playerPages.set(login, pages);
    }
    return pages;
  }

  private async multicall(calls: GbxCall[]): Promise<void> {
    if (calls.length === 0) return;
    try {
      await this.gbx.multicall(calls);
    } catch (error) {
      this.log.error({ err: error }, "Failed to send manialinks");
    }
  }
}
