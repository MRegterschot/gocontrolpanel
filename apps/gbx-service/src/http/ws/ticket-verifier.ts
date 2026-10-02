import { verifyWsTicket, type SessionClaims } from "@gcp/shared";
import type { Clock } from "../../core/ports";

// Verifies WS tickets and rejects a ticket that was already used (they travel in URLs)
export class TicketVerifier {
  private readonly used = new Map<string, number>();

  constructor(
    private readonly secret: string,
    private readonly clock: Pick<Clock, "now">,
  ) {}

  async verify(ticket: string): Promise<SessionClaims> {
    const verified = await verifyWsTicket(ticket, this.secret);
    this.prune();

    if (this.used.has(verified.ticketId)) {
      throw new Error("WS ticket was already used");
    }
    this.used.set(verified.ticketId, verified.expiresAt);
    return verified.claims;
  }

  private prune() {
    const now = this.clock.now();
    for (const [id, expiresAt] of this.used) {
      if (expiresAt <= now) this.used.delete(id);
    }
  }
}
