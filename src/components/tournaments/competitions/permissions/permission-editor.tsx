"use client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { describePermissions, hasPermission, OWNER, PERMISSION_GROUPS } from "@/lib/competition-permissions";
import { IconDeviceFloppy } from "@tabler/icons-react";
import { useState } from "react";

// The server only lets you grant or revoke bits you hold yourself, so the others are disabled.
export default function PermissionEditor({ title, value, mine, canEdit, onSave }: {
  title: string;
  value: bigint;
  mine: bigint;
  canEdit: boolean;
  onSave: (permissions: bigint) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const owner = (draft & OWNER) !== 0n;

  const toggle = (bit: bigint, checked: boolean) => setDraft((d) => (checked ? d | bit : d & ~bit));
  const editable = (bit: bigint) => canEdit && hasPermission(mine, bit);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (o) setDraft(value); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">{describePermissions(value)}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Permissions apply to this competition and every stage below it.</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Checkbox id="perm-owner" checked={owner} disabled={!editable(OWNER)} onCheckedChange={(c) => toggle(OWNER, c === true)} />
          <Label htmlFor="perm-owner">Owner, has every permission</Label>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {PERMISSION_GROUPS.map((group) => (
            <div key={group.name} className="flex flex-col gap-1">
              <h4 className="text-sm font-semibold">{group.name}</h4>
              {group.permissions.map(({ label, bit }) => (
                <div key={label} className="flex items-center gap-2">
                  <Checkbox
                    id={`perm-${bit}`}
                    checked={owner || (draft & bit) !== 0n}
                    disabled={owner || !editable(bit)}
                    onCheckedChange={(c) => toggle(bit, c === true)}
                  />
                  <Label htmlFor={`perm-${bit}`} className="font-normal">{label}</Label>
                </div>
              ))}
            </div>
          ))}
        </div>

        <Button className="self-end" disabled={!canEdit || draft === value} onClick={async () => (await onSave(draft)) && setOpen(false)}>
          <IconDeviceFloppy />
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
