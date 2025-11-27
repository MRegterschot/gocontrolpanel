const listeners = new Set<() => void>();
export const onSubscriptionChange = (callback: () => void) => {
  listeners.add(callback);
  return () => listeners.delete(callback);
};

export const notifySubscriptionApplied = () => {
  listeners.forEach((callback) => callback());
};
export const notifySubscriptionError = () => {
  listeners.forEach((callback) => callback());
};

export const cleanupSubscriptionListener = () => {
  listeners.clear();
};
