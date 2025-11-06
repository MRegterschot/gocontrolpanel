import Manialink from "./manialink";

export default class Widget extends Manialink {
  constructor(clientManager: any, login?: string) {
    super(clientManager, login);
    this.setTemplate("widget.njk");
  }
}