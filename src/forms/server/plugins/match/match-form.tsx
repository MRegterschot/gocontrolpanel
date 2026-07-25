"use client";

import { updateServerPlugin } from "@/actions/database/server-plugins";
import { UserMinimal } from "@/actions/database/users";
import { getScripts } from "@/actions/filemanager";
import { getLocalMaps } from "@/actions/gbx/server";
import FormElement from "@/components/form/form-element";
import Modal from "@/components/modals/modal";
import SelectFolderModal from "@/components/modals/plugins/plugins/select-folder-modal";
import { Button } from "@/components/ui/button";
import { Form, FormDescription, FormLabel } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSearchUsers } from "@/hooks/use-search-users";
import {
  getErrorMessage,
  pickAndBanToString,
  stringToPickAndBan,
} from "@/lib/utils";
import { LocalMapInfo } from "@/types/map";
import { MatchPluginConfig } from "@/types/plugins/match";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  IconDeviceFloppy,
  IconFileImport,
  IconFolder,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import Papa from "papaparse";
import { useEffect, useMemo, useRef, useState } from "react";
import { Control, useFieldArray, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { MatchPluginSchema, MatchPluginSchemaType } from "./match-schema";

export default function MatchForm({
  serverId,
  pluginId,
  config,
  onSubmit,
  onClose,
}: {
  serverId: string;
  pluginId: string;
  config?: MatchPluginConfig;
  onSubmit?: (config: MatchPluginConfig) => void;
  onClose?: () => void;
}) {
  const { data: session } = useSession();

  const [selectFolderModalOpen, setSelectFolderModalOpen] = useState(false);

  const [loadingScripts, setLoadingScripts] = useState(true);
  const [scripts, setScripts] = useState<string[]>([]);

  const [loadingLocalMaps, setLoadingLocalMaps] = useState(true);
  const [localMaps, setLocalMaps] = useState<LocalMapInfo[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchScripts() {
      try {
        const { data, error } = await getScripts(serverId);
        if (error) {
          throw new Error(error);
        }
        setScripts(data);
      } catch (error) {
        toast.error("Failed to load scripts", {
          description: getErrorMessage(error),
        });
      } finally {
        setLoadingScripts(false);
      }
    }

    async function fetchLocalMaps() {
      try {
        const { data, error } = await getLocalMaps(serverId);
        if (error) {
          throw new Error(error);
        }
        setLocalMaps(data);
      } catch (error) {
        toast.error("Failed to load local maps", {
          description: getErrorMessage(error),
        });
      } finally {
        setLoadingLocalMaps(false);
      }
    }

    fetchScripts();
    fetchLocalMaps();
  }, [serverId]);

  const localFolders = useMemo(() => {
    const folders: Record<string, LocalMapInfo[]> = {};

    localMaps.forEach((map) => {
      // Remove the file name from the path and get the folder name
      const folderName =
        map.FileName.substring(0, map.FileName.lastIndexOf("/")) || "root";

      if (!folders[folderName]) {
        folders[folderName] = [];
      }

      folders[folderName].push(map);
    });

    return folders;
  }, [localMaps]);

  let defaultAdmins = config?.admins;
  if (!defaultAdmins) {
    defaultAdmins = session ? [session.user.login] : [];
  }

  const { search, searchResults, searching, loading } = useSearchUsers({
    defaultUsers: [
      ...defaultAdmins,
      ...(config?.pickAndBan?.players?.map((p) => p.login) || []),
      ...(config?.pickAndBan?.teams?.flatMap((t) => t.players) || []),
    ],
    field: "login",
  });

  const form = useForm<MatchPluginSchemaType>({
    resolver: zodResolver(MatchPluginSchema),
    defaultValues: {
      ...config,
      admins: defaultAdmins.map((login) => ({ login })),
      maps: config?.maps?.map((filename) => ({ filename })) || [],
      pickAndBan: config?.pickAndBan
        ? {
            ...config.pickAndBan,
            type: config.pickAndBan.type || "player",
            order: stringToPickAndBan(config.pickAndBan.order),
            teams: config.pickAndBan.teams?.map((team) => ({
              ...team,
              players: team.players.map((login) => ({ login })),
            })),
          }
        : undefined,
    },
  });

  const { control } = form;

  const {
    fields: adminFields,
    append: appendAdmin,
    remove: removeAdmin,
  } = useFieldArray({
    control,
    name: "admins",
  });

  const {
    fields: mapFields,
    append: appendMap,
    remove: removeMap,
  } = useFieldArray({
    control,
    name: "maps",
  });

  const {
    fields: pickAndBanOrderFields,
    append: appendPickAndBanOrder,
    remove: removePickAndBanOrder,
  } = useFieldArray({
    control,
    name: "pickAndBan.order",
  });

  const type = useWatch({
    control,
    name: "pickAndBan.type",
  });

  const order = useWatch({
    control,
    name: "pickAndBan.order",
  });

  const {
    fields: pickAndBanPlayerFields,
    append: appendPickAndBanPlayer,
    remove: removePickAndBanPlayer,
  } = useFieldArray({
    control,
    name: "pickAndBan.players",
  });

  const {
    fields: pickAndBanTeamFields,
    append: appendPickAndBanTeam,
    remove: removePickAndBanTeam,
    replace: replacePickAndBanTeams,
  } = useFieldArray({
    control,
    name: "pickAndBan.teams",
  });

  async function handleSubmit(values: MatchPluginSchemaType) {
    try {
      const updatedConfig: MatchPluginConfig = {
        ...values,
        admins: values.admins?.filter((e) => e.login).map((e) => e.login) || [],
        maps:
          values.maps?.filter((e) => e.filename).map((e) => e.filename) || [],
        pickAndBan: values.pickAndBan
          ? {
              ...values.pickAndBan,
              choosePosition: values.pickAndBan.choosePosition ?? false,
              order: pickAndBanToString(values.pickAndBan.order),
              teams: values.pickAndBan.teams?.map((team) => ({
                ...team,
                players: team.players.map((p) => p.login),
              })),
            }
          : undefined,
      };

      const { error } = await updateServerPlugin(
        serverId,
        pluginId,
        updatedConfig,
      );
      if (error) {
        throw new Error(error);
      }
      toast.success("Config successfully saved");
      onSubmit?.(updatedConfig);
    } catch (error) {
      toast.error("Failed to save config", {
        description: getErrorMessage(error),
      });
    }
  }

  const handleConfigImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      const json: MatchPluginConfig = JSON.parse(text);
      const formattedConfig: MatchPluginSchemaType = {
        ...json,
        admins: json.admins?.map((admin) => ({ login: admin })),
        maps: json.maps?.map((map) => ({ filename: map })),
        pickAndBan: json.pickAndBan
          ? {
              ...json.pickAndBan,
              order: stringToPickAndBan(json.pickAndBan.order),
              teams: json.pickAndBan.teams?.map((team) => ({
                seed: team.seed,
                players: team.players.map((login) => ({ login })),
              })),
            }
          : undefined,
      };

      const importedConfig = MatchPluginSchema.parse(formattedConfig);
      form.reset(importedConfig);
      toast.success("Config imported successfully");
    } catch (error) {
      toast.error("Failed to import config", {
        description: getErrorMessage(error),
      });
    }
  };

  const handleTeamUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const teams = data.map((row, index) => ({
          seed: index + 1,
          name: row.Team,
          players: Array.from({ length: 5 })
            .map((_, i) => row[`Player Login ${i + 1}`]?.trim())
            .filter(Boolean)
            .map((login) => ({ login })),
        }));

        replacePickAndBanTeams(teams);

        // Allow uploading the same file again
        event.target.value = "";
      },
    });
  };

  if (loading || loadingScripts || loadingLocalMaps) {
    return <span className="text-muted-foreground">Loading...</span>;
  }

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="flex flex-col gap-4"
        >
          <Tabs defaultValue="general" className="col-span-2">
            <TabsList className="w-full">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="pick-and-ban">Pick and Ban</TabsTrigger>
              <TabsTrigger value="lobby">Lobby</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FormElement
                      className="max-w-64 sm:max-w-92 w-full"
                      name={"script"}
                      label="Script"
                      description="The script to run for the match. This script will be loaded when the match starts."
                      placeholder="MyGamemode.Script.txt"
                      options={scripts.map((script) => ({
                        label: script,
                        value: script,
                      }))}
                      type="select"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size={"icon"}
                    onClick={() => form.setValue("script", "")}
                  >
                    <IconTrash />
                    <span className="sr-only">Clear Script</span>
                  </Button>
                </div>

                {/* Maps */}
                <div className="flex flex-col gap-2">
                  <div>
                    <FormLabel className="text-sm">Maps</FormLabel>
                    <FormDescription className="max-w-xs whitespace-normal wrap-break-word">
                      The maps to be played in the match. The order determines
                      the sequence in which the maps will be played. Pick and
                      ban will use these maps and override the order.
                    </FormDescription>
                  </div>
                  {mapFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <div className="flex-1">
                        <FormElement
                          name={`maps.${index}.filename`}
                          placeholder="Select a map..."
                          options={localMaps.map((localMap) => ({
                            label: localMap.Name,
                            value: localMap.FileName,
                            parseTmTags: true,
                          }))}
                          className="max-w-64 sm:max-w-92 w-full"
                          type="select"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="destructive"
                        size={"icon"}
                        onClick={() => removeMap(index)}
                      >
                        <IconTrash />
                        <span className="sr-only">Remove Map</span>
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendMap({ filename: "" })}
                  >
                    <IconPlus />
                    Add Map
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSelectFolderModalOpen(true)}
                  >
                    <IconFolder />
                    Select Folder
                  </Button>
                </div>

                {/* Admins */}
                <div className="flex flex-col gap-2">
                  <div>
                    <FormLabel className="text-sm">Admins</FormLabel>
                    <FormDescription className="max-w-xs whitespace-normal wrap-break-word">
                      Users who can execute commands and manage the match
                      plugin. You can add multiple users by searching for their
                      names.
                    </FormDescription>
                  </div>
                  {adminFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <div className="flex-1">
                        <FormElement
                          name={`admins.${index}.login`}
                          className="w-full"
                          placeholder="Search user..."
                          onSearch={search}
                          options={searchResults.map((u) => ({
                            label: u.nickName,
                            value: u.login,
                          }))}
                          isLoading={searching}
                          type="search"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size={"icon"}
                        onClick={() => removeAdmin(index)}
                      >
                        <IconTrash />
                        <span className="sr-only">Remove Admin</span>
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendAdmin({ login: "" })}
                  >
                    <IconPlus />
                    Add User
                  </Button>
                </div>
              </div>
            </TabsContent>
            <TabsContent value="pick-and-ban">
              <div className="flex flex-col gap-4">
                <FormElement
                  name={"pickAndBan.type"}
                  label="Pick and Ban Type"
                  description="The type of pick and ban process. Choose between 'player' or 'team' to determine how the picks and bans will be executed."
                  options={[
                    { label: "Player", value: "player" },
                    { label: "Team", value: "team" },
                  ]}
                  type="select"
                  isRequired
                />

                {type === "player" && (
                  <FormElement
                    name={"pickAndBan.choosePosition"}
                    label="Choose Position"
                    description="If enabled, the player performing the pick action can choose the position of the map in the order. If disabled, the position will be the default pick order."
                    type="checkbox"
                    isRequired
                  />
                )}

                <div className="flex flex-col gap-2">
                  <div>
                    <FormLabel className="text-sm">Pick and Ban</FormLabel>
                    <FormDescription className="max-w-xs whitespace-normal wrap-break-word">
                      The order of picks and bans for the match. Choose between
                      &quot;pick&quot;, &quot;ban&quot;, or &quot;random&quot;
                      for each action and set the seed of the player who will
                      perform the action. The players are defined below.
                    </FormDescription>
                  </div>
                  {pickAndBanOrderFields.map((field, index) => (
                    <div key={field.id} className="flex gap-2">
                      <div className="flex-1 flex gap-2">
                        <FormElement
                          name={`pickAndBan.order.${index}.action`}
                          placeholder="Select an action..."
                          options={[
                            { label: "Pick", value: "pick" },
                            { label: "Ban", value: "ban" },
                            { label: "Random", value: "random" },
                          ]}
                          className="w-full"
                          rootClassName="flex-1"
                          type="select"
                        />

                        {order?.[index]?.action !== "random" && (
                          <FormElement
                            name={`pickAndBan.order.${index}.seed`}
                            type="number"
                            min={1}
                            className="w-24"
                          />
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size={"icon"}
                        onClick={() => removePickAndBanOrder(index)}
                      >
                        <IconTrash />
                        <span className="sr-only">Remove Step</span>
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendPickAndBanOrder({ action: "pick", seed: 1 })
                    }
                  >
                    <IconPlus />
                    Add Step
                  </Button>
                </div>

                {type === "team" && (
                  <div className="flex flex-col gap-2">
                    <div>
                      <FormLabel className="text-sm">Teams</FormLabel>
                      <FormDescription className="max-w-xs whitespace-normal wrap-break-word">
                        The teams that will participate in the pick and ban
                        process. Each team is assigned a seed, which is used in
                        the pick and ban order. Also add players to the team.
                      </FormDescription>
                    </div>

                    <div className="flex flex-col gap-6">
                      {pickAndBanTeamFields.map((field, index) => (
                        <div key={field.id} className="flex flex-col gap-2">
                          <FormElement
                            name={`pickAndBan.teams.${index}.name`}
                            label={`Team Name`}
                            rootClassName="w-full"
                            placeholder="Team Name"
                          >
                            <Button
                              type="button"
                              variant="destructive"
                              collapse="sm"
                              onClick={() => removePickAndBanTeam(index)}
                            >
                              <IconTrash />
                              Remove Team
                            </Button>
                          </FormElement>

                          <FormElement
                            name={`pickAndBan.teams.${index}.seed`}
                            type="number"
                            label={`Seed`}
                            rootClassName="w-24"
                            min={1}
                          />

                          {/* Players in team */}
                          <TeamFields
                            control={control}
                            teamIndex={index}
                            search={search}
                            searchResults={searchResults}
                            searching={searching}
                          />

                          <Separator className="mt-4" />
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() =>
                          appendPickAndBanTeam({
                            seed: pickAndBanTeamFields.length + 1,
                            players: [],
                          })
                        }
                      >
                        <IconPlus />
                        Add Team
                      </Button>

                      <div className="flex flex-1 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <IconUpload />
                          Import Teams
                        </Button>

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".csv"
                          className="hidden"
                          onChange={handleTeamUpload}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {type === "player" && (
                  <div className="flex flex-col gap-2">
                    <div>
                      <FormLabel className="text-sm">Players</FormLabel>
                      <FormDescription className="max-w-xs whitespace-normal wrap-break-word">
                        The players who will participate in the pick and ban
                        process. Each player is assigned a seed, which is used
                        in the pick and ban order.
                      </FormDescription>
                    </div>
                    {pickAndBanPlayerFields.map((field, index) => (
                      <div key={field.id} className="flex gap-2">
                        <div className="flex-1 flex gap-2">
                          <FormElement
                            name={`pickAndBan.players.${index}.seed`}
                            type="number"
                            min={1}
                            className="w-16"
                          />

                          <FormElement
                            name={`pickAndBan.players.${index}.login`}
                            className="w-full"
                            rootClassName="flex-1"
                            placeholder="Search user..."
                            onSearch={search}
                            options={searchResults.map((u) => ({
                              label: u.nickName,
                              value: u.login,
                            }))}
                            isLoading={searching}
                            type="search"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="destructive"
                          size={"icon"}
                          onClick={() => removePickAndBanPlayer(index)}
                        >
                          <IconTrash />
                          <span className="sr-only">Remove Player</span>
                        </Button>
                      </div>
                    ))}

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        appendPickAndBanPlayer({
                          login: "",
                          seed: pickAndBanPlayerFields.length + 1,
                        })
                      }
                    >
                      <IconPlus />
                      Add Player
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="lobby">
              <div className="flex flex-col gap-4">
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FormElement
                      className="max-w-64 sm:max-w-92 w-full"
                      name={"lobby.script"}
                      label="Lobby Script"
                      description="The script to run for the lobby. This script will be loaded when the lobby starts."
                      placeholder="MyLobby.Script.txt"
                      options={scripts.map((script) => ({
                        label: script,
                        value: script,
                      }))}
                      type="select"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size={"icon"}
                    onClick={() => form.setValue("lobby.script", "")}
                  >
                    <IconTrash />
                    <span className="sr-only">Clear Lobby Script</span>
                  </Button>
                </div>

                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <FormElement
                      className="max-w-64 sm:max-w-92 w-full"
                      name={"lobby.map"}
                      label="Lobby Map"
                      description="The map to use for the lobby. This map will be loaded when the lobby starts."
                      placeholder="MyLobby.Map.Gbx"
                      options={localMaps.map((localMap) => ({
                        label: localMap.Name,
                        value: localMap.FileName,
                        parseTmTags: true,
                      }))}
                      type="select"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="destructive"
                    size={"icon"}
                    onClick={() => form.setValue("lobby.map", "")}
                  >
                    <IconTrash />
                    <span className="sr-only">Clear Lobby Map</span>
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-between gap-2">
            <Button
              variant={"outline"}
              collapse="sm"
              onClick={onClose}
              className="self-end"
            >
              <IconX />
              Close
            </Button>

            <div className="flex gap-2">
              <Button type="button" variant={"outline"} className="mr-2">
                <label
                  htmlFor="config-import"
                  className="flex items-center gap-2"
                >
                  <IconFileImport />
                  Import Config
                  <input
                    id="config-import"
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleConfigImport}
                  />
                </label>
              </Button>

              <Button
                type="submit"
                collapse="sm"
                disabled={form.formState.isSubmitting}
              >
                <IconDeviceFloppy />
                Save
              </Button>
            </div>
          </div>
        </form>
      </Form>

      <Modal
        isOpen={selectFolderModalOpen}
        setIsOpen={setSelectFolderModalOpen}
      >
        <SelectFolderModal
          data={localFolders}
          onSubmit={(maps) => {
            const newMaps = maps?.map((map) => ({
              filename: map.FileName,
            }));
            form.setValue("maps", newMaps);
          }}
        />
      </Modal>
    </>
  );
}

function TeamFields({
  control,
  teamIndex,
  search,
  searchResults,
  searching,
}: {
  control: Control<MatchPluginSchemaType>;
  teamIndex: number;
  search: (query?: string) => Promise<void>;
  searchResults: UserMinimal[];
  searching: boolean;
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `pickAndBan.teams.${teamIndex}.players`,
  });

  return (
    <div className="flex flex-col gap-2">
      <FormLabel className="text-sm">Players</FormLabel>
      {fields.map((field, index) => (
        <div key={field.id} className="flex gap-2">
          <div className="flex-1 flex gap-2">
            <FormElement
              name={`pickAndBan.teams.${teamIndex}.players.${index}.login`}
              className="w-full"
              rootClassName="flex-1"
              placeholder="Search user..."
              onSearch={search}
              options={searchResults.map((u) => ({
                label: u.nickName,
                value: u.login,
              }))}
              isLoading={searching}
              type="search"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size={"icon"}
            onClick={() => remove(index)}
          >
            <IconTrash />
            <span className="sr-only">Remove Player</span>
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() =>
          append({
            login: "",
          })
        }
      >
        <IconPlus />
        Add Player
      </Button>
    </div>
  );
}
