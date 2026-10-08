"use client";
import { DefaultModalProps } from "@/components/modals/default-props";
import { ModalContent } from "@/components/modals/modal";
import { Badge } from "@/components/ui/badge";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CodriverRequestRow } from "@/types/codriver";
import type { ReactNode } from "react";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase text-muted-foreground">
        {label}
      </p>
      <div className="text-sm break-words whitespace-pre-wrap">{children}</div>
    </div>
  );
}

const dash = <span className="text-muted-foreground">-</span>;

export default function RequestDetailsModal({
  data: row,
}: DefaultModalProps<CodriverRequestRow>) {
  if (!row) return null;
  const calls = Array.isArray(row.toolCalls) ? row.toolCalls : [];

  return (
    <ModalContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
      <DialogHeader className="pr-6">
        <DialogTitle>Request details</DialogTitle>
      </DialogHeader>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Time">{new Date(row.createdAt).toLocaleString()}</Field>
          <Field label="Player">{row.userName ?? row.login}</Field>
          <Field label="Source">{row.source}</Field>
          <Field label="Server">{row.serverName}</Field>
          <Field label="Status">
            <Badge variant="outline">{row.status}</Badge>
          </Field>
          <Field label="Duration">{row.latencyMs} ms</Field>
        </div>
        <Field label="Request">{row.text}</Field>
        <Field label="Reply">{row.reply ?? dash}</Field>
        <Field label="Feedback">
          {row.feedback ? (
            <>
              {row.feedback}
              {row.feedbackAt && (
                <span className="block text-xs text-muted-foreground">
                  {new Date(row.feedbackAt).toLocaleString()}
                </span>
              )}
            </>
          ) : (
            dash
          )}
        </Field>
        <Field label="Tool calls">
          {calls.length > 0 ? (
            <pre className="max-h-48 overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap">
              {JSON.stringify(calls, null, 2)}
            </pre>
          ) : (
            dash
          )}
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Key">{row.keySource}</Field>
          <Field label="Model">{row.model ?? dash}</Field>
          <Field label="Model calls">{row.modelCalls ?? dash}</Field>
          <Field label="Tokens in / out">
            {row.inputTokens} / {row.outputTokens}
          </Field>
          <Field label="Cache read">{row.cacheReadTokens}</Field>
          <Field label="Cost">${(row.costMicros / 1_000_000).toFixed(4)}</Field>
        </div>
      </div>
    </ModalContent>
  );
}
