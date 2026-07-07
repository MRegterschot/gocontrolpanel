"use client";
import { deleteEntry } from "@/actions/filemanager";
import { getErrorMessage, removePrefix } from "@/lib/utils";
import { FileEntry } from "@/types/filemanager";
import {
  IconFilePlus,
  IconFolderPlus,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { toast } from "sonner";
import ConfirmModal from "../modals/confirm-modal";
import CreateFileEntryModal from "../modals/files/create-file-entry";
import Modal from "../modals/modal";
import { Button } from "../ui/button";

interface ActionsProps {
  selectedItems: FileEntry[];
  setSelectedItems: Dispatch<SetStateAction<FileEntry[]>>;
  setFolders: Dispatch<SetStateAction<FileEntry[]>>;
  setFiles: Dispatch<SetStateAction<FileEntry[]>>;
  serverId: string;
  path: string;
  uploadFilesCallback: (files: FileList | null) => void;
}

export default function Actions({
  selectedItems,
  setSelectedItems,
  setFolders,
  setFiles,
  serverId,
  path,
  uploadFilesCallback,
}: ActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    uploadFilesCallback(files);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleDelete = async () => {
    if (selectedItems.length === 0) return;

    try {
      const pathsToDelete = selectedItems.map((item) => item.path);
      const { error } = await deleteEntry(serverId, pathsToDelete);

      if (error) {
        throw new Error(error);
      }

      setFolders((prev) =>
        prev.filter((folder) => !pathsToDelete.includes(folder.path)),
      );

      setFiles((prev) =>
        prev.filter((file) => !pathsToDelete.includes(file.path)),
      );

      toast.success("Items deleted", {
        description: `${selectedItems.length} item(s) successfully deleted.`,
      });

      setSelectedItems([]);
    } catch (error) {
      toast.error("Failed to delete items", {
        description: getErrorMessage(error),
      });
    }
  };

  return (
    <div className="flex items-center gap-2 justify-end">
      {selectedItems.length > 0 && (
        <>
          <Button
            variant="destructive"
            collapse="sm"
            onClick={() => setIsDeleting(true)}
          >
            <IconTrash />
            Delete
          </Button>

          <ConfirmModal
            isOpen={isDeleting}
            onConfirm={handleDelete}
            onClose={() => setIsDeleting(false)}
            title="Delete items"
            description={`Are you sure you want to delete ${selectedItems.length} item(s)?`}
            confirmText="Delete"
            cancelText="Cancel"
          />
        </>
      )}

      <Modal closeOnBackdropClick={false}>
        <CreateFileEntryModal
          path={removePrefix(path, "/UserData")}
          serverId={serverId}
          isDir={true}
          onSubmit={(fileEntry?: FileEntry) => {
            if (!fileEntry) return;
            setFolders((prev) => [...prev, fileEntry]);
          }}
        />
        <Button variant={"outline"} collapse="sm">
          <IconFolderPlus />
          Create Folder
        </Button>
      </Modal>

      <Modal closeOnBackdropClick={false}>
        <CreateFileEntryModal
          path={removePrefix(path, "/UserData")}
          serverId={serverId}
          isDir={false}
          onSubmit={(fileEntry?: FileEntry) => {
            if (!fileEntry) return;
            setFiles((prev) => [...prev, fileEntry]);
          }}
        />
        <Button variant={"outline"} collapse="sm">
          <IconFilePlus />
          Create File
        </Button>
      </Modal>

      <Button onClick={triggerUpload} collapse="sm">
        <IconUpload />
        Upload
      </Button>

      <input
        ref={fileInputRef}
        multiple
        type="file"
        onChange={handleUpload}
        className="hidden"
      />
    </div>
  );
}
