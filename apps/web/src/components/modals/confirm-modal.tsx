"use client";

import { IconCancel, IconCheck } from "@tabler/icons-react";
import { useEffect } from "react";
import { Button } from "../ui/button";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  cancelText: string;
  variant?:
    | "destructive"
    | "default"
    | "link"
    | "outline"
    | "secondary"
    | "ghost";
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  variant = "destructive",
}: ConfirmModalProps) {
  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1 text-wrap">
          {description}
        </p>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            <IconCancel />
            {cancelText}
          </Button>
          <Button
            variant={variant}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            <IconCheck />
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}
