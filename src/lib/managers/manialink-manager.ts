import { PlayerInfo } from "@/types/player";
import "server-only";
import { logger } from "../logger";
import ActionGroup from "../manialink/components/action-group";
import {
  getKeyPlayerManialinks,
  getKeyPublicManialinks,
  getRedisClient,
} from "../redis";
import { GbxClientManager } from "./gbxclient-manager";
import { getRedisClient } from "../redis";

export default class ManialinkManager {
  private readonly listenerId: string;
  private readonly clientManager: GbxClientManager;
  public actionGroup: ActionGroup;

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

    const publicManialinks = await this.getPublicManialinks();

    // Re-display all public manialinks to the newly connected player
    for (const manialink of publicManialinks) {
      multi.push([
        "SendDisplayManialinkPageToLogin",
        player.login,
        manialink,
        0,
        false,
      ]);
    }

    const playerManialinks = await this.getManialinksForLogin(player.login);

    // Re-display all player-specific manialinks to the newly connected player
    for (const manialink of playerManialinks) {
      multi.push([
        "SendDisplayManialinkPageToLogin",
        player.login,
        manialink,
        0,
        false,
      ]);
    }

    logger.trace(
      multi,
      `Re-displaying manialinks to newly connected player ${player.login}`,
    );

    this.clientManager.client.multicall(multi);
  }

  private async onPlayerDisconnect(login: string) {
    logger.trace(
      { login },
      `Player disconnected, removing player-specific manialinks for ${login}`,
    );

    await this.deleteManialinksForLogin(login);
  }

  public async displayManialink(
    manialinkId: string,
    manialinkData: string,
    login?: string,
  ) {
    if (!login) {
      await this.hideManialink(manialinkId);
      await this.savePublicManialink(manialinkId, manialinkData);
    } else {
      await this.hideManialink(manialinkId, login);
      await this.saveManialinkForLogin(login, manialinkId, manialinkData);
    }

    logger.trace(
      { manialinkId, login, manialinkData },
      `Displaying manialink ${manialinkId} to ${login ? `player ${login}` : "all players"}`,
    );

    if (login) {
      this.clientManager.client.send(
        "SendDisplayManialinkPageToLogin",
        login,
        manialinkData,
        0,
        false,
      );
    } else {
      this.clientManager.client.send(
        "SendDisplayManialinkPage",
        manialinkData,
        0,
        false,
      );
    }
  }

  public async hideManialink(manialinkId: string, login?: string) {
    try {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
            <manialinks><manialink id="${manialinkId}"></manialink></manialinks>`;

      logger.trace(
        { manialinkId, login, xml },
        `Hiding manialink ${manialinkId} for ${login ? `player ${login}` : "all players"}`,
      );

      if (login) {
        this.clientManager.client.send(
          "SendDisplayManialinkPageToLogin",
          login,
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
      logger.error(e, "Error hiding manialink");
    }
  }

  public async destroyManialink(manialinkId: string, login?: string) {
    logger.trace(
      { manialinkId, login },
      `Destroying manialink ${manialinkId} for ${login ? `player ${login}` : "all players"}`,
    );

    this.hideManialink(manialinkId, login);

    if (login) {
      await this.deleteManialinkForLogin(login, manialinkId);
    } else {
      await this.deletePublicManialink(manialinkId);
    }
  }

  public async resendAllManialinks() {
    const multi = [];

    const publicManialinks = await this.getPublicManialinks();

    for (const manialink of publicManialinks) {
      multi.push(["SendDisplayManialinkPage", manialink, 0, false]);
    }

    logger.trace(
      {
        publicManialinks,
      },
      `Resent all manialinks to all players`,
    );
  }

  public getClientManager(): GbxClientManager {
    return this.clientManager;
  }

  private async getPublicManialinks(): Promise<string[]> {
    const redis = await getRedisClient();

    const key = getKeyPublicManialinks();
    const publicManialinkKeys = await redis.hgetall(key);

    return Object.values(publicManialinkKeys);
  }

  private async savePublicManialink(
    manialinkId: string,
    manialinkData: string,
  ) {
    const redis = await getRedisClient();

    const key = getKeyPublicManialinks();
    await redis.hset(key, manialinkId, manialinkData);
  }

  private async deletePublicManialink(manialinkId: string) {
    const redis = await getRedisClient();

    const key = getKeyPublicManialinks();
    await redis.hdel(key, manialinkId);
  }

  private async getManialinksForLogin(login: string): Promise<string[]> {
    const redis = await getRedisClient();

    const key = getKeyPlayerManialinks(login);
    const manialinkKeys = await redis.hgetall(key);

    return Object.values(manialinkKeys);
  }

  private async deleteManialinksForLogin(login: string) {
    const redis = await getRedisClient();

    const key = getKeyPlayerManialinks(login);
    const manialinkKeys = await redis.hgetall(key);

    const multi = redis.multi();

    for (const manialinkId of Object.keys(manialinkKeys)) {
      multi.hdel(key, manialinkId);
    }

    await multi.exec();
  }

  private async saveManialinkForLogin(
    login: string,
    manialinkId: string,
    manialinkData: string,
  ) {
    const redis = await getRedisClient();

    const key = getKeyPlayerManialinks(login);
    await redis.hset(key, manialinkId, manialinkData);
  }

  private async deleteManialinkForLogin(login: string, manialinkId: string) {
    const redis = await getRedisClient();

    const key = getKeyPlayerManialinks(login);
    await redis.hdel(key, manialinkId);
  }

  public async deleteAllManialinks() {
    const redis = await getRedisClient();

    // Delete all public manialinks
    const publicKey = getKeyPublicManialinks();
    const publicManialinkKeys = await redis.hgetall(publicKey);

    const multi = redis.multi();

    for (const manialinkId of Object.keys(publicManialinkKeys)) {
      multi.hdel(publicKey, manialinkId);
    }

    // Delete all player-specific manialinks
    const stream = redis.scanStream({
      match: getKeyPlayerManialinks("*"),
    });

    stream.on("data", (keys: string[]) => {
      for (const key of keys) {
        multi.del(key);
      }
    });

    await new Promise((resolve, reject) => {
      stream.on("end", resolve);
      stream.on("error", reject);
    });

    await multi.exec();
  }
}
