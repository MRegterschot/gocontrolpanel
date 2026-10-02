"use client";
import { GroupsWithUsersWithServers } from "@/actions/database/groups";
import EditGroupForm from "@/forms/admin/group/edit-group-form";
import { IconX } from "@tabler/icons-react";
import { useSession } from "next-auth/react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function EditGroupModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<GroupsWithUsersWithServers>) {
  const { update } = useSession();

  if (!data) return null;

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
        <h1 className="text-xl font-bold">Edit {data.name}</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>
      <EditGroupForm group={data} callback={handleCallback} />
    </Card>
  );
}
