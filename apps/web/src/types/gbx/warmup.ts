export interface WarmUpStatus {
  responseid: string;
  available: boolean;
  active: boolean;
}

export interface WarmUp {
  current: number;
  total: number;
}
