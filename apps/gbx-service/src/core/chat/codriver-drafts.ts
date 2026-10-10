// A request may be this long in total; the panel accepts no more
export const MAX_DRAFT_LENGTH = 1200;
const DRAFT_TTL_MS = 5 * 60_000;

// Long requests typed in parts with /co+ (chat lines hold 255 characters); the window's Send includes them
export class CodriverDrafts {
  private readonly drafts = new Map<
    string,
    { text: string; expires: number }
  >();
  private readonly listeners = new Set<(login: string) => void>();

  constructor(private readonly now: () => number = Date.now) {}

  get(login: string): string {
    const draft = this.drafts.get(login);
    if (draft && draft.expires > this.now()) return draft.text;
    this.drafts.delete(login);
    return "";
  }

  // The new draft, or null when it would be longer than a request may be
  append(login: string, text: string): string | null {
    const current = this.get(login);
    const next = current ? `${current} ${text.trim()}` : text.trim();
    if (next.length > MAX_DRAFT_LENGTH) return null;
    this.drafts.set(login, { text: next, expires: this.now() + DRAFT_TTL_MS });
    this.changed(login);
    return next;
  }

  clear(login: string): void {
    if (this.drafts.delete(login)) this.changed(login);
  }

  // Told when a player's draft changes, so an open window can show it
  onChange(listener: (login: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private changed(login: string): void {
    for (const listener of this.listeners) listener(login);
  }
}
