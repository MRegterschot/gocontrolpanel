import ManialinkManager from "../managers/manialink-manager";
import Manialink from "./manialink";

export default class Widget extends Manialink {
  private updateManialink: Manialink | null = null;

  constructor(manialinkManager: ManialinkManager, login?: string) {
    super(manialinkManager, login);
    this.setTemplate("widget.njk");
    this.updateManialink = new Manialink(manialinkManager, login);
    this.updateManialink.setTemplate(this.getUpdateTemplate());
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
    return this.getTemplate().replace(".njk", "-update.njk");
  }
}
