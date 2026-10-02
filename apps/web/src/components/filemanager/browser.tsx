"use client";
import { uploadFiles } from "@/actions/filemanager";
import { getErrorMessage, pathToBreadcrumbs } from "@/lib/utils";
import { FileEntry } from "@/types/filemanager";
import { IconUpload } from "@tabler/icons-react";
import React, { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import Actions from "./actions";
import FilesBreadcrumbs from "./breadcrumbs";
import FileCard from "./file-card";
import FolderCard from "./folder-card";
import { ServerError } from "@/types/responses";

interface BrowserProps {
  data: FileEntry[];
  serverId: string;
  path: string;
}

export default function Browser({ data, serverId, path }: BrowserProps) {
  const [folders, setFolders] = useState<FileEntry[]>(
    data.filter((fileEntry: FileEntry) => fileEntry.isDir),
  );
  const [files, setFiles] = useState<FileEntry[]>(
    data.filter((fileEntry: FileEntry) => !fileEntry.isDir),
  );

  const [selectedItems, setSelectedItems] = useState<FileEntry[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(
    null,
  );

  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    setFolders(data.filter((fileEntry: FileEntry) => fileEntry.isDir));
    setFiles(data.filter((fileEntry: FileEntry) => !fileEntry.isDir));
  }, [data]);

  const uploadFilesCallback = useCallback(
    async (files: FileList | null) => {
      if (!files) return;

      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
        formData.append("paths[]", path);
      }

      try {
        const { data, error } = await uploadFiles(serverId, formData);
        if (error) {
          throw new ServerError(error, "UploadFilesError");
        }

        setFolders((prev) => [
          ...prev.filter(
            (item: FileEntry) =>
              !data.some(
                (fileEntry: FileEntry) => fileEntry.path === item.path,
              ),
          ),
          ...data.filter((fileEntry: FileEntry) => fileEntry.isDir),
        ]);

        setFiles((prev) => [
          ...prev.filter(
            (item: FileEntry) =>
              !data.some(
                (fileEntry: FileEntry) => fileEntry.path === item.path,
              ),
          ),
          ...data.filter((fileEntry: FileEntry) => !fileEntry.isDir),
        ]);

        toast.success("Files successfully uploaded");
      } catch (error) {
        toast.error("Failed to upload files", {
          description: getErrorMessage(error),
        });
      }
    },
    [serverId, path],
  );

  const handleSelect = (
    e: React.MouseEvent,
    fileEntry: FileEntry,
    index: number,
  ) => {
    if (e.shiftKey && lastSelectedIndex !== null) {
      const allItems = [...folders, ...files];
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      const newSelected = allItems.slice(start, end + 1);
      setSelectedItems(newSelected);
    } else if (e.ctrlKey || e.metaKey) {
      const isSelected = selectedItems.some(
        (item) => item.path === fileEntry.path,
      );
      if (isSelected) {
        setSelectedItems((prev) =>
          prev.filter((item) => item.path !== fileEntry.path),
        );
      } else {
        setSelectedItems((prev) => [...prev, fileEntry]);
      }
      setLastSelectedIndex(index);
    } else {
      setSelectedItems([fileEntry]);
      setLastSelectedIndex(index);
    }
  };

  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      setDragActive(false);
      e.preventDefault();
      const files = e.dataTransfer.files;

      if (files.length > 0) {
        await uploadFilesCallback(files);
      }
    },
    [uploadFilesCallback],
  );

  const handleDragOver = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLInputElement>) => {
    e.preventDefault();
    setDragActive(false);
  };

  useEffect(() => {
    setSelectedItems([]);
    setLastSelectedIndex(null);
  }, [path]);

  return (
    <div
      className="flex flex-col gap-4 h-full"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {dragActive && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 rounded-xl">
          <div className="flex flex-col items-center justify-center w-full h-full">
            <div className="flex flex-col items-center justify-center w-full h-full rounded-lg shadow-lg">
              <IconUpload size={92} />

              <h1 className="text-2xl font-bold mt-4">Drop files here</h1>
              <p className="text-lg">to upload</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between lg:items-center w-full flex-col lg:flex-row gap-4">
        <FilesBreadcrumbs
          crumbs={pathToBreadcrumbs(path).slice(1)}
          serverId={serverId}
          className="min-w-0 flex-1"
        />

        <Actions
          selectedItems={selectedItems}
          setSelectedItems={setSelectedItems}
          setFolders={setFolders}
          setFiles={setFiles}
          serverId={serverId}
          path={path}
          uploadFilesCallback={uploadFilesCallback}
        />
      </div>

      {files.length === 0 && folders.length === 0 && (
        <div className="flex items-center justify-center w-full h-full">
          <h1 className="text-2xl font-bold">No files found.</h1>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {folders.length > 0 && (
          <>
            <div className="flex w-full border-b-1">
              <h1 className="font-bold">Folders</h1>
            </div>
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-2">
              {folders.map((fileEntry: FileEntry, index) => (
                <FolderCard
                  key={fileEntry.path}
                  fileEntry={fileEntry}
                  serverId={serverId}
                  active={selectedItems.some(
                    (item) => item.path === fileEntry.path,
                  )}
                  onClick={(e) => handleSelect(e, fileEntry, index)}
                />
              ))}
            </div>
          </>
        )}

        {files.length > 0 && (
          <>
            <div className="flex w-full border-b-1">
              <h1 className="font-bold">Files</h1>
            </div>
            <div className="grid [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-2">
              {files.map((fileEntry: FileEntry, index) => {
                const fileIndex = folders.length + index;
                return (
                  <FileCard
                    key={fileEntry.path}
                    fileEntry={fileEntry}
                    serverId={serverId}
                    active={selectedItems.some(
                      (item) => item.path === fileEntry.path,
                    )}
                    onClick={(e) => handleSelect(e, fileEntry, fileIndex)}
                  />
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
