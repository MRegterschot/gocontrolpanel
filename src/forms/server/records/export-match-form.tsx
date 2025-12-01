"use client";

import { MatchesWithMapAndRecords } from "@/actions/database/matches";
import FormElement from "@/components/form/form-element";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconPlus, IconTrash } from "@tabler/icons-react";
import { useForm } from "react-hook-form";
import {
  ExportMatchSchema,
  ExportMatchSchemaType,
} from "./export-match-schema";

const POSSIBLE_VALUES = [
  {
    value: "createdAt",
    label: "Timestamp",
  },
  {
    value: "map.name",
    label: "Map Name",
  },
  {
    value: "accountId",
    label: "Account Id",
  },
  {
    value: "user.nickName",
    label: "Player Name",
  },
  {
    value: "time",
    label: "Time",
  },
  {
    value: "round",
    label: "Round Number",
  },
  {
    value: "points",
    label: "Points",
  },
  {
    value: "checkpoints",
    label: "Checkpoints",
  },
];

export default function ExportMatchForm({
  serverId,
  match,
}: {
  serverId: string;
  match: MatchesWithMapAndRecords;
}) {
  const form = useForm<ExportMatchSchemaType>({
    resolver: zodResolver(ExportMatchSchema),
    defaultValues: {
      filename: `match-${match.id}.csv`,
      headers: [
        "Time",
        "Track",
        "PlayerID",
        "PlayerName",
        "Record",
        "RoundNumber",
        "Points",
        "CP",
      ],
      values: POSSIBLE_VALUES.map((pv) => pv.value),
    },
  });

  async function onSubmit(values: ExportMatchSchemaType) {
    console.log("Exporting match with values:", values);
  }

  const headerFields = form.watch("headers");

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col gap-4"
      >
        {headerFields.map((_, index) => (
          <div className="flex gap-2 w-full justify-between">
            <FormElement
              key={index}
              name={`headers.${index}`}
              rootClassName="w-full"
            />
            <FormElement
              key={`value-` + index}
              name={`values.${index}`}
              type="select"
              options={POSSIBLE_VALUES}
              rootClassName="w-full max-w-24 sm:max-w-none"
              className="w-full max-w-24 sm:max-w-none"
            />
            <Button
              type="button"
              variant="destructive"
              size={"icon"}
              onClick={() => {
                const headers = form.getValues("headers");
                const values = form.getValues("values");
                headers.splice(index, 1);
                values.splice(index, 1);
                form.setValue("headers", headers);
                form.setValue("values", values);
              }}
            >
              <IconTrash />
            </Button>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const headers = form.getValues("headers");
            const values = form.getValues("values");
            headers.push("");
            values.push(POSSIBLE_VALUES[0].value);
            form.setValue("headers", headers);
            form.setValue("values", values);
          }}
        >
          <IconPlus />
          Add Column
        </Button>

        <Button type="submit" className="self-end">
          Export Match
        </Button>
      </form>
    </Form>
  );
}
