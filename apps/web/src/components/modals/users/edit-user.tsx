"use client";
import EditUserForm from "@/forms/admin/user/edit-user-form";
import { Users } from "@gcp/db";
import { IconX } from "@tabler/icons-react";
import { Card } from "../../ui/card";
import { DefaultModalProps } from "../default-props";

export default function EditUserModal({
  closeModal,
  onSubmit,
  data,
}: DefaultModalProps<Users>) {
  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleCallback = () => {
    onSubmit?.();
    closeModal?.();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Edit {data.nickName}</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>
      <EditUserForm user={data} callback={handleCallback} />
    </Card>
  );
}
