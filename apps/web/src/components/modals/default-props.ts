export interface DefaultModalProps<T = void, TRes = void> {
  serverId?: string;
  closeModal?: () => void;
  onSubmit?: (data?: TRes) => void;
  data?: T;
}
