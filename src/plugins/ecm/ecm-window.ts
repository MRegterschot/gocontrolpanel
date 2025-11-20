import ManialinkManager from "@/lib/managers/manialink-manager";
import Window from "@/lib/manialink/components/window";

export default class ECMWindow extends Window {
  constructor(
    manialinkManager: ManialinkManager,
    title: string,
    login: string,
  ) {
    super(manialinkManager, title, "ecm-window", login, false);
    this.setTemplate("windows/ecm/ecm-window");
  }
}
