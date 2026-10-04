"use client";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import {
  Children,
  cloneElement,
  ComponentProps,
  createContext,
  Dispatch,
  isValidElement,
  PropsWithChildren,
  ReactElement,
  useContext,
  useState,
} from "react";
import { DefaultModalProps } from "./default-props";

const BackdropCloseContext = createContext(true);

export function ModalContent(props: ComponentProps<typeof DialogContent>) {
  const closeOnBackdropClick = useContext(BackdropCloseContext);

  return (
    <DialogContent
      aria-describedby={undefined}
      {...props}
      onClick={(event) => {
        props.onClick?.(event);
        event.stopPropagation();
      }}
      onPointerDownOutside={(event) => {
        props.onPointerDownOutside?.(event);
        if (!closeOnBackdropClick) event.preventDefault();
      }}
    />
  );
}

interface ModalProps {
  isOpen?: boolean;
  setIsOpen?: Dispatch<React.SetStateAction<boolean>>;
  onClose?: () => void;
  closeOnBackdropClick?: boolean;
}

export default function Modal({
  isOpen: controlledIsOpen,
  setIsOpen: controlledSetIsOpen,
  onClose,
  closeOnBackdropClick = true,
  children,
}: ModalProps & PropsWithChildren) {
  const isControlled =
    controlledIsOpen !== undefined && controlledSetIsOpen !== undefined;
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);

  const isOpen = isControlled ? controlledIsOpen : uncontrolledIsOpen;
  const setIsOpen = isControlled ? controlledSetIsOpen : setUncontrolledIsOpen;

  const childrenArray = Children.toArray(children);

  let modalElement: ReactElement<DefaultModalProps> | null = null;
  if (childrenArray.length > 0 && isValidElement(childrenArray[0])) {
    modalElement = childrenArray[0] as ReactElement<DefaultModalProps>;
  }

  let triggerElement: ReactElement<{ onClick?: () => void }> | null = null;
  if (childrenArray.length > 1 && isValidElement(childrenArray[1])) {
    triggerElement = childrenArray[1] as ReactElement<{ onClick?: () => void }>;
  }

  const closeModal = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) setIsOpen(true);
        else closeModal();
      }}
    >
      {triggerElement && (
        <DialogTrigger asChild>{triggerElement}</DialogTrigger>
      )}
      <BackdropCloseContext.Provider value={closeOnBackdropClick}>
        {isOpen && modalElement && cloneElement(modalElement, { closeModal })}
      </BackdropCloseContext.Provider>
    </Dialog>
  );
}
