"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import MatchOverview from "./match-overview";

export default function MatchOverviewDialog({ matchId, onClose }: { matchId: number | null; onClose: () => void }) {
  return (
    <Dialog open={matchId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Match overview</DialogTitle>
        <DialogDescription className="sr-only">Live state, standings and chat of the match.</DialogDescription>
        {matchId !== null && (
          <>
            <Button variant="ghost" size="icon" className="absolute top-2.5 right-10 size-7" title="Open in new tab" asChild>
              <Link href={`/match/${matchId}`} target="_blank">
                <IconExternalLink />
              </Link>
            </Button>
            <MatchOverview matchId={matchId} embedded />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
