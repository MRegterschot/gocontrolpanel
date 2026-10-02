import { Manialink, ManialinkDeps } from "./manialink";

export interface ActionButton {
  name: string;
  icon: string;
  type?: "image" | "text";
  action?: string;
}

// Shared expandable button bar in the top-left corner; plugins add their entry points here
export class ActionGroup {
  private readonly widget: Manialink;
  private actions: ActionButton[] = [];

  constructor(deps: ManialinkDeps) {
    this.widget = new Manialink(deps, {
      id: "action-group-widget",
      template: "action-group",
      withUpdate: false,
      position: { x: -156, y: 85 },
    });
  }

  add(action: ActionButton): void {
    this.actions = [...this.actions.filter((a) => a.name !== action.name), action];
    this.widget.setData({ actions: this.actions });
    this.widget.display();
  }

  remove(name: string): void {
    this.actions = this.actions.filter((a) => a.name !== name);
    this.widget.setData({ actions: this.actions });

    if (this.actions.length === 0) {
      this.widget.destroy();
    } else {
      this.widget.display();
    }
  }

  list(): readonly ActionButton[] {
    return this.actions;
  }
}
