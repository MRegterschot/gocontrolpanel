"use client";
import { DefaultModalProps } from "@/components/modals/default-props";
import { ModalContent } from "@/components/modals/modal";
import { DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PanelRuleForm from "@/forms/codriver/panel-rule-form";
import type { CodriverRuleRow } from "@/types/codriver";

export default function PanelRuleModal({
  closeModal,
  data,
}: DefaultModalProps<CodriverRuleRow | undefined>) {
  return (
    <ModalContent>
      <DialogHeader className="pr-6">
        <DialogTitle>{data ? "Edit rule" : "Add rule"}</DialogTitle>
      </DialogHeader>
      <PanelRuleForm rule={data} callback={closeModal} />
    </ModalContent>
  );
}
