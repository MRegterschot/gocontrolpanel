import ManialinkManager from "@/lib/managers/manialink-manager";
import Manialink from "./manialink";

export default class Window extends Manialink {
  public login: string;
  public onCloseCallback: (() => void) | null = null;

  constructor(
    manialinkManager: ManialinkManager,
    title: string,
    id: string,
    login: string,
    update: boolean = true,
  ) {
    super(manialinkManager, login, update);
    this.login = login;
    this.setTitle(title);
    this.setId(id);
    this.setTemplate("window");

    this.manialinkManager
      .getClientManager()
      .onAction(`close-window-${this.getId()}`, this.onClose);
  }

  private onClose = () => {
    this.manialinkManager
      .getClientManager()
      .offAction(`close-window-${this.getId()}`, this.onClose);
    this.destroy();
    if (this.onCloseCallback) this.onCloseCallback();
  };
}
