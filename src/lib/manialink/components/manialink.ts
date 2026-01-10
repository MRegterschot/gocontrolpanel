import { Handlebars } from "@/lib/handlebars";
import "@/lib/manialink/compiled_templates";
import "server-only";
import ManialinkManager from "../../managers/manialink-manager";

type Vector2 = {
  x: number;
  y: number;
};

export default class Manialink {
  private firstDisplay: boolean = true;
  protected readonly manialinkManager: ManialinkManager;

  private hasUpdate: boolean = true;
  private updateManialink: Manialink | null = null;

  public readonly login?: string;
  public id: string = "manialink";
  private template: string = "manialink";
  private data: unknown;
  private position: Vector2 = { x: 0, y: 0 };
  private size: Vector2 = { x: 100, y: 80 };
  private title: string = "";
  private hideWhileDriving: boolean = false;

  constructor(
    manialinkManager: ManialinkManager,
    login?: string,
    update: boolean = true,
  ) {
    this.manialinkManager = manialinkManager;
    this.login = login;
    this.hasUpdate = update;
    if (this.hasUpdate) {
      this.updateManialink = new Manialink(manialinkManager, login, false);
      this.updateManialink.setTemplate(this.getUpdateTemplate());
    }
  }

  public display() {
    this.manialinkManager.displayManialink(this, this.firstDisplay);
    this.firstDisplay = false;
    this.updateManialink?.display();
  }

  public hide() {
    this.manialinkManager.hideManialink(this);
    this.updateManialink?.hide();
  }

  public destroy() {
    this.manialinkManager.destroyManialink(this);
    this.updateManialink?.destroy();
  }

  public update() {
    this.updateManialink?.display();
  }

  public render(): string {
    // @ts-expect-error Handlebars.templates is dynamically generated
    Handlebars.partials = Handlebars.templates;
    const manialink = Handlebars.templates[this.template]({
      id: this.id,
      position: this.position,
      size: this.size,
      title: this.title,
      hideWhileDriving: this.hideWhileDriving,
      data: this.data,
    });

    return manialink;
  }

  public setPosition(position: Vector2) {
    this.position = position;
  }

  public setSize(size: Vector2) {
    this.size = size;
  }

  public setTitle(title: string) {
    this.title = title;
    this.updateManialink?.setTitle(title);
  }

  public getTitle(): string {
    return this.title;
  }

  public setData(data: unknown) {
    this.data = data;
    this.updateManialink?.setData(data);
  }

  public setTemplate(template: string) {
    this.template = template;
    this.updateManialink?.setTemplate(this.getUpdateTemplate());
  }

  public setHideWhileDriving(hide: boolean) {
    this.hideWhileDriving = hide;
  }

  public setId(id: string) {
    this.id = id;
    if (this.updateManialink) this.updateManialink.id = `${id}-update`;
  }

  public getId(): string {
    return this.id;
  }

  public getTemplate(): string {
    return this.template;
  }

  private getUpdateTemplate(): string {
    return `${this.getTemplate()}-update`;
  }
}
