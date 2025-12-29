"use client";

import ConfirmModal from "@/components/modals/confirm-modal";
import Modal from "@/components/modals/modal";
import CreateCompetitionModal from "@/components/modals/tournaments/competition/create-competition";
import EditRegistrationSettingsModal from "@/components/modals/tournaments/competition/edit-registration-settings";
import CreateMatchModal from "@/components/modals/tournaments/match/create-match";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { CompetitionNode } from "@/hooks/tournaments/competitions/use-competition-tree";
import { reducers } from "@/lib/tourney-manager";
import { cn } from "@/lib/utils";
import { IconCalendar, IconChevronUp } from "@tabler/icons-react";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { toast } from "sonner";
import { Timestamp } from "spacetimedb";
import { useReducer } from "spacetimedb/react";
import CompetitionStatusBadge from "../status/competition-status-badge";
import MatchStatusBadge from "../status/match-status-badge";
import RegistrationBadge from "./registration-badge";

interface CompetitionTreeProps {
  tree: CompetitionNode;
  sectionIndex: number;
  subsectionIndex?: number;
  isLast?: boolean;
}

export default function CompetitionTree({
  tree,
  sectionIndex,
  subsectionIndex = 0,
  isLast = true,
}: CompetitionTreeProps) {
  const { data: session } = useSession();

  const register = useReducer(reducers.registerPlayer);
  const unregister = useReducer(reducers.unregisterPlayer);

  // Stage children toggle
  const [isOpen, setIsOpen] = useState(false);

  // Modals
  const [isEditRegistrationSettingsOpen, setIsEditRegistrationSettingsOpen] =
    useState(false);
  const [isAddMatchOpen, setIsAddMatchOpen] = useState(false);
  const [isAddStageOpen, setIsAddStageOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  const isRegistered = tree.registeredPlayers.some(
    (rp) => rp.accountId === "3467014a-c1cc-4aae-99fe-6beb5eca232a", //session?.user.id
  );

  const handleRegisterToggle = () => {
    if (!session?.user.id) {
      toast.error("You must be logged in to register");
      return;
    }

    if (tree.registrationSettings.tag === "None") {
      toast.error("Registration is not open for this competition");
      return;
    }

    try {
      if (isRegistered) {
        unregister({
          competitionId: tree.id,
        });
        toast.success("Unregistered successfully");
      } else {
        register({
          competitionId: tree.id,
        });
        toast.success("Registered successfully");
      }
    } catch (error) {
      toast.error("Failed to update registration");
    }
  };

  return (
    <div>
      <div className="flex gap-2 sm:gap-4">
        <div className="flex flex-col items-center">
          <Card className="rounded-full w-10 min-h-10 sm:w-12 sm:min-h-12 grid place-items-center font-semibold text-sm sm:text-base">
            {sectionIndex + 1}
            {String.fromCharCode(97 + subsectionIndex)}
          </Card>
          {(!isLast || isOpen) && <div className="w-px bg-border h-full"></div>}
        </div>

        <Card className="flex-1 gap-2 mb-4 p-3 min-h-20">
          <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
            <div className="flex flex-1 flex-col gap-1 sm:gap-0">
              <div className="flex justify-between items-start sm:items-center gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <h3 className="text-lg font-semibold truncate max-w-51 lg:max-w-118 xl:max-w-180">
                    {tree.name}
                  </h3>

                  <CompetitionStatusBadge status={tree.status} />
                </div>

                <div className="flex gap-2 items-center ml-auto">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {tree.registrationSettings.tag !== "None" && (
                        <DropdownMenuItem
                          onClick={() => setIsRegisterOpen(true)}
                        >
                          {isRegistered ? "Unregister" : "Register"}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => setIsEditRegistrationSettingsOpen(true)}
                      >
                        Edit registration settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsAddMatchOpen(true)}>
                        Add match
                      </DropdownMenuItem>

                      <DropdownMenuItem onClick={() => setIsAddStageOpen(true)}>
                        Add stage
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <ConfirmModal
                    isOpen={isRegisterOpen}
                    onClose={() => setIsRegisterOpen(false)}
                    variant={isRegistered ? "destructive" : "default"}
                    onConfirm={handleRegisterToggle}
                    title={
                      isRegistered
                        ? "Unregister from competition"
                        : "Register for competition"
                    }
                    description={
                      isRegistered
                        ? `Are you sure you want to unregister from ${tree.name}?`
                        : `Do you want to register for ${tree.name}?`
                    }
                    confirmText={isRegistered ? "Unregister" : "Register"}
                    cancelText="Cancel"
                  />

                  <Modal
                    isOpen={isEditRegistrationSettingsOpen}
                    setIsOpen={setIsEditRegistrationSettingsOpen}
                  >
                    <EditRegistrationSettingsModal
                      data={{
                        competitionId: tree.id,
                        registrationSettings: tree.registrationSettings,
                      }}
                    />
                  </Modal>

                  <Modal isOpen={isAddMatchOpen} setIsOpen={setIsAddMatchOpen}>
                    <CreateMatchModal data={tree.id} />
                  </Modal>

                  <Modal isOpen={isAddStageOpen} setIsOpen={setIsAddStageOpen}>
                    <CreateCompetitionModal data={tree.id} />
                  </Modal>
                </div>
              </div>

              {(tree.startingAt || tree.endingAt) && (
                <div className="flex gap-2 items-center text-muted-foreground text-sm">
                  <IconCalendar size={16} />

                  {tree.startingAt && (
                    <span>
                      {tree.startingAt.toDate().toLocaleDateString("en-UK", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}

                  {tree.startingAt && tree.endingAt && <span>-</span>}

                  {tree.endingAt && (
                    <span>
                      {tree.endingAt.toDate().toLocaleDateString("en-UK", {
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}

              <div className="space-x-2 sm:mt-1">
                <RegistrationBadge
                  registrationSettings={tree.registrationSettings}
                />
              </div>
            </div>
          </div>

          <Separator />

          {tree.matches.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No matches in this stage.
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
              {tree.matches.map((match, i) => (
                <Card
                  key={match.id}
                  className="p-2 rounded-lg cursor-pointer hover:border-white transition-all"
                >
                  <div className="flex gap-2 items-center justify-between">
                    <span className="text-sm">Match {i + 1}</span>
                    <MatchStatusBadge status={match.status} />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>

      {tree.children.length > 0 && (
        <div className="flex gap-4 w-full">
          {!isLast && !isOpen && (
            <div className="flex flex-col items-center w-12">
              <div className="w-px bg-border flex-1"></div>
            </div>
          )}

          <div className="flex flex-1 flex-col">
            <div className="flex flex-col mb-4">
              {isOpen &&
                tree.children.map((child, i) => (
                  <CompetitionTree
                    key={child.id}
                    tree={child}
                    sectionIndex={sectionIndex + 1}
                    subsectionIndex={i}
                    isLast={i === tree.children.length - 1}
                  />
                ))}

              <div className={cn("w-full", (isLast || isOpen) && "pl-16")}>
                <div
                  className="relative flex items-center gap-2"
                  onClick={() => setIsOpen((prev) => !prev)}
                >
                  <Separator className="flex-1" />
                  <Button
                    size={"icon"}
                    variant="ghost"
                    className="shrink-0 px-2"
                  >
                    <IconChevronUp
                      className={cn(isOpen ? "rotate-0" : "rotate-180")}
                    />
                  </Button>
                  <Separator className="flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
