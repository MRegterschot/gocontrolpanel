import ManialinkManager from "../../managers/manialink-manager";
import Manialink from "./manialink";

export default class Widget extends Manialink {
  constructor(
    manialinkManager: ManialinkManager,
    login?: string,
    update: boolean = true,
  ) {
    super(manialinkManager, login, update);
    this.setTemplate("widget");
  }
}
