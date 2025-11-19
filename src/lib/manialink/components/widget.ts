import ManialinkManager from "../../managers/manialink-manager";
import Manialink from "./manialink";

export default class Widget extends Manialink {
  private hasUpdate: boolean = true;
  private updateManialink: Manialink | null = null;

  constructor(
    manialinkManager: ManialinkManager,
    login?: string,
    update: boolean = true,
  ) {
    super(manialinkManager, login);
    this.setTemplate("widget");

    this.hasUpdate = update;
    if (this.hasUpdate) {
      this.updateManialink = new Manialink(manialinkManager, login);
      this.updateManialink.setTemplate(this.getUpdateTemplate());
    }
  }

  public setData(data: unknown) {
    super.setData(data);
    if (this.updateManialink) {
      this.updateManialink.setData(data);
    }
  }

  public async hide() {
    super.hide();
    this.updateManialink?.hide();
  }

  public async destroy() {
    super.destroy();
    this.updateManialink?.destroy();
  }

  public async display() {
    super.display();
    this.updateManialink?.display();
  }

  public update() {
    this.updateManialink?.display();
  }

  public setTemplate(template: string) {
    super.setTemplate(template);
    this.updateManialink?.setTemplate(this.getUpdateTemplate());
  }

  public setId(id: string) {
    this.id = id;
    if (this.updateManialink) this.updateManialink.id = `${id}-update`;
  }

  private getUpdateTemplate(): string {
    return `${this.getTemplate()}-update`;
  }
}
