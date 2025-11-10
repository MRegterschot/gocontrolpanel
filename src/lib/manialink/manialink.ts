import nunjucks from "@/lib/nunjucks";
import "server-only";
import ManialinkManager, {
  getManialinkManager,
} from "../managers/manialink-manager";

export default class Manialink {
  private firstDisplay: boolean = true;
  protected readonly manialinkManager: ManialinkManager;

  public readonly login?: string;
  public id: string = "manialink";
  private template: string = "manialink.hbs";
  private data: unknown;
  private position: string = "0 0";

  constructor(manialinkManager: ManialinkManager, login?: string) {
    this.manialinkManager = manialinkManager;
    this.login = login;
  }

  public async display() {
    this.manialinkManager.displayManialink(this, this.firstDisplay);
    this.firstDisplay = false;
  }

  public async hide() {
    this.manialinkManager.hideManialink(this);
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
