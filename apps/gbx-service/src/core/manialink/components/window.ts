import { Manialink, ManialinkDeps, ManialinkOptions } from "./manialink";

export interface WindowOptions extends Omit<ManialinkOptions, "login"> {
  login: string;
  title: string;
  onClose?: () => void;
}

// Player-specific window with a close button wired to "close-window-<id>"
export class Window extends Manialink {
  declare readonly login: string;
  private readonly removeCloseAction: () => void;
  private closed = false;

  constructor(deps: ManialinkDeps, private readonly options: WindowOptions) {
    super(deps, options);
    this.removeCloseAction = deps.actions.register(
      `close-window-${options.id}`,
      (answer) => {
        // Windows of other players share the id; only close our own
        if (answer.Login !== this.login) return;
        this.close();
      },
    );
  }

  close(): void {
    if (this.closed) return;
    this.destroy();
    this.options.onClose?.();
  }

  override destroy(): void {
    this.closed = true;
    this.removeCloseAction();
    super.destroy();
  }
}
