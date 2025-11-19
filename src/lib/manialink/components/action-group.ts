import "@/lib/manialink/compiled_templates";
import ManialinkManager from "../../managers/manialink-manager";
import Widget from "./widget";

type Action = {
  name: string;
  icon: string;
  type?: "image" | "text";
  action?: string;
};

export default class ActionGroup extends Widget {
  private actions: Action[] = [];

  constructor(manialinkManager: ManialinkManager, login?: string) {
    super(manialinkManager, login, false);
    this.setTemplate("action-group");
    this.setId("action-group-widget");
    this.setPosition("-156 85");
  }

  public addAction(action: Action) {
    this.actions.push(action);
    this.setData({ actions: this.actions });
    this.display();
  }

  public removeAction(actionName: string) {
    this.actions = this.actions.filter((a) => a.name !== actionName);
    this.setData({ actions: this.actions });

    if (this.actions.length === 0) {
      this.hide();
    } else {
      this.display();
    }
  }
}
