import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import nunjucks from "@/lib/nunjucks";
import "server-only";

export default class Manialink {
  private firstDisplay: boolean = true;
  protected readonly clientManager: GbxClientManager;

  public readonly login?: string;
  public id: string = "manialink";
  private template: string = "manialink.hbs";
  private data: unknown;
  private position: string = "0 0";

  constructor(clientManager: GbxClientManager, login?: string) {
    this.clientManager = clientManager;
    this.login = login;
  }

  public async display() {
    this.clientManager.manialinkManager.displayManialink(
      this,
      this.firstDisplay,
    );
    this.firstDisplay = false;
  }

  public async hide() {
    this.clientManager.manialinkManager.hideManialink(this);
  }

  public async render(): Promise<string> {
    const manialink = nunjucks.render(this.template, {
      id: this.id,
      position: this.position,
      data: this.data,
    });

    return manialink;
  }

  public setPosition(position: string) {
    this.position = position;
  }

  public setData(data: unknown) {
    this.data = data;
  }

  public setTemplate(template: string) {
    this.template = template;
  }

  public getTemplate(): string {
    return this.template;
  }
}
