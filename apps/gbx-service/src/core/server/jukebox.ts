import type { GbxConnection } from "../gbx/connection";
import type { Logger } from "../logger";
import type { JukeboxStore } from "../ports";

// Queue maintained by the web app; the head becomes the next map when the podium starts
export class Jukebox {
  constructor(
    private readonly serverId: string,
    private readonly store: JukeboxStore,
    private readonly gbx: GbxConnection,
    private readonly log: Logger,
  ) {}

  async queueNextMap(): Promise<void> {
    const next = await this.store.peek(this.serverId);
    if (!next) return;

    await this.gbx.call("ChooseNextMap", next.fileName);
    // Only dequeue once the server accepted it, so a failure keeps the entry
    await this.store.pop(this.serverId);
    this.log.info({ fileName: next.fileName }, "Queued next map from jukebox");
  }
}
