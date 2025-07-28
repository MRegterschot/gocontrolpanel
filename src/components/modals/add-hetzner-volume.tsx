"use client";
import AddHetznerVolumeForm from "@/forms/admin/hetzner/volume/add-hetzner-volume-form";
import { IconX } from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/card";
import { DefaultModalProps } from "./default-props";

export default function AddHetznerVolumeModal({
  closeModal,
  data,
}: DefaultModalProps<string>) {
  const router = useRouter();

  if (!data) return null;

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleSubmit = async () => {
    closeModal?.();
    router.refresh();
  };

  return (
    <Card
      onClick={stopPropagation}
      className="p-6 gap-6 sm:min-w-[400px] max-sm:w-full max-h-[90vh] overflow-y-auto"
    >
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Add Volume</h1>
        <IconX
          className="h-6 w-6 cursor-pointer text-muted-foreground"
          onClick={closeModal}
        />
      </div>

      <AddHetznerVolumeForm projectId={data} callback={handleSubmit} />
    </Card>
  );
}
