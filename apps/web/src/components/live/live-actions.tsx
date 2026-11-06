"use client";
import { pauseMatch, triggerModeScriptEventArray } from "@/actions/gbx/game";
import { getErrorMessage } from "@/lib/utils";
import {
  IconChevronRight,
  IconChevronsRight,
  IconPlayerPause,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { ServerError } from "@/types/responses";

interface LiveActionsProps {
  serverId: string;
  pauseAvailable: boolean;
  isPaused: boolean;
  isWarmUp: boolean;
}

export default function LiveActions({
  serverId,
  pauseAvailable,
  isPaused,
  isWarmUp,
}: LiveActionsProps) {
  const handlePause = async () => {
    try {
      const { error } = await pauseMatch(serverId, !isPaused);
      if (error) {
        throw new ServerError(error, "PauseMatchError");
      }

      toast.success(`Game successfully ${isPaused ? "resumed" : "paused"}`);
    } catch (error) {
      toast.error(`Error while ${isPaused ? "resuming" : "pausing"} the game`, {
        description: getErrorMessage(error),
      });
    }
  };

  const handleEndWarmUpRound = async () => {
    try {
      const { error } = await triggerModeScriptEventArray(
        serverId,
        "Trackmania.WarmUp.ForceStopRound",
        [],
      );
      if (error) {
        throw new ServerError(error, "EndWarmUpRoundError");
      }

      toast.success("Warmup round successfully ended");
    } catch (error) {
      toast.error("Error while ending the warmup round", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleEndWarmUp = async () => {
    try {
      const { error } = await triggerModeScriptEventArray(
        serverId,
        "Trackmania.WarmUp.ForceStop",
        [],
      );
      if (error) {
        throw new ServerError(error, "EndWarmUpError");
      }

      toast.success("Warmup successfully ended");
    } catch (error) {
      toast.error("Error while ending the warmup", {
        description: getErrorMessage(error),
      });
    }
  };

  if (!pauseAvailable && !isWarmUp) {
    return null;
  }

  return (
    <>
      <Separator />
      <div className="flex gap-2 flex-wrap">
        {pauseAvailable && (
          <Button variant={"outline"} collapse="sm" onClick={handlePause}>
            {isPaused ? <IconPlayerPlay /> : <IconPlayerPause />}
            {isPaused ? "Resume" : "Pause"}
          </Button>
        )}

        {isWarmUp && (
          <Button variant={"outline"} onClick={handleEndWarmUpRound}>
            <IconChevronRight />
            End Warmup Round
          </Button>
        )}

        {isWarmUp && (
          <Button variant={"outline"} onClick={handleEndWarmUp}>
            <IconChevronsRight />
            End Warmup
          </Button>
        )}
      </div>
    </>
  );
}
