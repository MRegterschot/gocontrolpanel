import { PlayerInfo } from "@/types/player";
import "server-only";
import Manialink from "../manialink/components/manialink";
import { GbxClientManager } from "./gbxclient-manager";
import ActionGroup from "../manialink/components/action-group";

export default class ManialinkManager {
  private readonly listenerId: string;
  private readonly clientManager: GbxClientManager;
  private publicManialinks: { [id: string]: Manialink } = {};
  private playerManialinks: { [login: string]: { [id: string]: Manialink } } =
    {};
  protected actionGroup: ActionGroup;

  constructor(clientManager: GbxClientManager) {
    this.clientManager = clientManager;
    this.listenerId = crypto.randomUUID();

    this.clientManager.addListeners(this.listenerId, {
      playerConnect: this.onPlayerConnect.bind(this),
      playerDisconnect: this.onPlayerDisconnect.bind(this),
    });

    this.actionGroup = new ActionGroup(this);
  }

  private async onPlayerConnect(player: PlayerInfo) {
    const multi = [];

    // Re-display all public manialinks to the newly connected player
    for (const manialink of Object.values(this.publicManialinks)) {
      const xml = await manialink.render();
      multi.push([
        "SendDisplayManialinkPageToLogin",
        player.login,
        xml,
        0,
        false,
      ]);
    }

    // Re-display all player-specific manialinks to the newly connected player
    if (this.playerManialinks[player.login]) {
      for (const manialink of Object.values(
        this.playerManialinks[player.login],
      )) {
        const xml = await manialink.render();
        multi.push([
          "SendDisplayManialinkPageToLogin",
          player.login,
          xml,
          0,
          false,
        ]);
      }
    }

    this.clientManager.client.multicall(multi);
  }

  private onPlayerDisconnect(login: string) {
    if (!this.playerManialinks[login]) return;

    delete this.playerManialinks[login];
  }

  public async displayManialink(
    manialink: Manialink,
    firstRender: boolean = true,
  ) {
    if (firstRender) {
      if (!manialink.login) {
        // Check if manialink already exists, if so, destroy it
        if (
          this.publicManialinks[manialink.id] &&
          this.publicManialinks[manialink.id] !== manialink
        ) {
          await this.destroyManialink(this.publicManialinks[manialink.id]);
        }

        this.publicManialinks[manialink.id] = manialink;
      } else {
        if (!this.playerManialinks[manialink.login]) {
          this.playerManialinks[manialink.login] = {};
        }

        // Check if manialink already exists, if so, destroy it
        if (
          this.playerManialinks[manialink.login][manialink.id] &&
          this.playerManialinks[manialink.login][manialink.id] !== manialink
        ) {
          await this.destroyManialink(
            this.playerManialinks[manialink.login][manialink.id],
          );
        }

        this.playerManialinks[manialink.login][manialink.id] = manialink;
      }
    }

    const xml = await manialink.render();

    if (manialink.login) {
      this.clientManager.client.send(
        "SendDisplayManialinkPageToLogin",
        manialink.login,
        xml,
        0,
        false,
      );
    } else {
      this.clientManager.client.send("SendDisplayManialinkPage", xml, 0, false);
    }
  }

  public async hideManialink(manialink: Manialink) {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks><manialink id="${manialink.id}"></manialink></manialinks>`;

      if (manialink.login) {
        this.clientManager.client.send(
          "SendDisplayManialinkPageToLogin",
          manialink.login,
          xml,
          0,
          false,
        );
      } else {
        this.clientManager.client.send(
          "SendDisplayManialinkPage",
          xml,
          0,
          false,
        );
      }
    } catch (e) {
      console.error("Error hiding manialink:", e);
    }
  }

  public async destroyManialink(manialink: Manialink, hide = true) {
    if (hide) {
      this.hideManialink(manialink);
    }

    if (manialink.login) {
      for (const login of Object.keys(this.playerManialinks)) {
        if (this.playerManialinks[login][manialink.id]) {
          delete this.playerManialinks[login][manialink.id];
        }
      }
    } else {
      for (const id of Object.keys(this.publicManialinks)) {
        if (id === manialink.id) {
          delete this.publicManialinks[id];
        }
      }
    }
  }
}
