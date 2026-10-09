import type { ManialinkTheme } from "@gcp/shared";
import type { ActionRouter } from "../action-router";
import type { ManialinkService } from "../manialink-service";
import type { TemplateRenderer } from "../template-renderer";

export interface Vector2 {
  x: number;
  y: number;
}

export interface ManialinkDeps {
  renderer: TemplateRenderer;
  manialinks: ManialinkService;
  actions: ActionRouter;
  // The server's theme; the renderer's default when absent
  theme?: () => ManialinkTheme;
}

export interface ManialinkOptions {
  id: string;
  template: string;
  // Player specific when set, public otherwise
  login?: string;
  // Pairs the page with a "<template>-update" page that carries data changes
  withUpdate?: boolean;
  position?: Vector2;
  size?: Vector2;
  title?: string;
  hideWhileDriving?: boolean;
  data?: unknown;
}

export class Manialink {
  readonly login?: string;
  private id: string;
  private template: string;
  private position: Vector2;
  private size: Vector2;
  private title: string;
  private hideWhileDriving: boolean;
  private data: unknown;
  private readonly updatePage: Manialink | null;

  constructor(
    protected readonly deps: ManialinkDeps,
    options: ManialinkOptions,
  ) {
    this.login = options.login;
    this.id = options.id;
    this.template = options.template;
    this.position = options.position ?? { x: 0, y: 0 };
    this.size = options.size ?? { x: 100, y: 80 };
    this.title = options.title ?? "";
    this.hideWhileDriving = options.hideWhileDriving ?? false;
    this.data = options.data;

    this.updatePage =
      options.withUpdate === false
        ? null
        : new Manialink(deps, {
            id: `${options.id}-update`,
            template: `${options.template}-update`,
            login: options.login,
            withUpdate: false,
            title: options.title,
            data: options.data,
          });
  }

  getId(): string {
    return this.id;
  }

  display(): void {
    this.deps.manialinks.display(this.id, this.render(), this.login);
    this.updatePage?.display();
  }

  // Sends only the data page; the main page keeps its client-side state
  update(): void {
    this.updatePage?.display();
  }

  hide(): void {
    this.deps.manialinks.hide(this.id, this.login);
    this.updatePage?.hide();
  }

  destroy(): void {
    this.deps.manialinks.destroy(this.id, this.login);
    this.updatePage?.destroy();
  }

  setData(data: unknown): void {
    this.data = data;
    this.updatePage?.setData(data);
  }

  setTitle(title: string): void {
    this.title = title;
    this.updatePage?.setTitle(title);
  }

  setPosition(position: Vector2): void {
    this.position = position;
  }

  setSize(size: Vector2): void {
    this.size = size;
  }

  render(): string {
    return this.deps.renderer.render(
      this.template,
      {
        id: this.id,
        position: this.position,
        size: this.size,
        title: this.title,
        hideWhileDriving: this.hideWhileDriving,
        data: this.data,
      },
      this.deps.theme?.(),
    );
  }
}
