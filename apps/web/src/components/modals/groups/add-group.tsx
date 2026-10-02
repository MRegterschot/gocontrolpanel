"use client";
import AddGroupForm from "@/forms/admin/group/add-group-form";
import { IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function AddGroupModal({
  closeModal,
  onSubmit,
}: DefaultModalProps) {
  const { update } = useSession();

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
    update();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add Group</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>
      <AddGroupForm callback={handleCallback} />
    </Card>
  );
}
