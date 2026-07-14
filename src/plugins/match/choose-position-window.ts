import { GbxClientManager } from "@/lib/managers/gbxclient-manager";
import ManialinkManager from "@/lib/managers/manialink-manager";
import Window from "@/lib/manialink/components/window";
import { PlayerManialinkPageAnswer } from "@/types/gbx/player";
import { PickBanAction } from ".";

export default class ChoosePositionWindow extends Window {
  private clientManager: GbxClientManager;

  private currentAction: PickBanAction;
  private positionsAvailable: number[];

  public onChoosePositionCallback: ((position: number) => void) | null = null;

  constructor(
    clientManager: GbxClientManager,
    manialinkManager: ManialinkManager,
    currentAction: PickBanAction,
    positionsAvailable: number[],
    title: string,
    login: string,
  ) {
    super(manialinkManager, title, "choose-position-window", login, false);
    this.clientManager = clientManager;

    this.currentAction = currentAction;
    this.positionsAvailable = positionsAvailable;

    this.setTemplate("windows/match/choose-position-window");
    this.setSize({
      x: this.positionsAvailable.length * 12 + 2,
      y: 14,
    });
    this.setData({
      currentAction: this.currentAction,
      positionsAvailable: this.positionsAvailable,
      choosePositionAction: "match-pickban-choose-position",
    });

    this.clientManager.onAction(
      "match-pickban-choose-position-{position}",
      this.onChoosePosition,
    );
  }

  private onChoosePosition = async (
    data: PlayerManialinkPageAnswer,
    params: Record<string, string>,
  ) => {
    if (data.Login !== this.login) return;

    const position = params["position"];
    if (!position) return;

    this.onChoosePositionCallback?.(parseInt(position, 10));
  };

  updateCurrentAction(currentAction: PickBanAction) {
    this.currentAction = currentAction;
    this.update();
  }

  update() {
    this.setData({
      currentAction: this.currentAction,
    });
    super.update();
  }

  destroy() {
    this.clientManager.offAction(
      "match-pickban-choose-position-{position}",
      this.onChoosePosition,
    );

    super.destroy();
  }
}
