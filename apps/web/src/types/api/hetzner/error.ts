export interface HetznerApiError {
  code: HetznerErrorCode;
  message: string;
  details?: Record<string, any>; // Schema varies
}

export type HetznerErrorCode =
  | "forbidden"
  | "unauthorized"
  | "invalid_input"
  | "json_error"
  | "locked"
  | "not_found"
  | "rate_limit_exceeded"
  | "resource_limit_exceeded"
  | "resource_unavailable"
  | "server_error"
  | "service_error"
  | "uniqueness_error"
  | "protected"
  | "maintenance"
  | "conflict"
  | "unsupported_error"
  | "token_readonly"
  | "unavailable"
  | "deprecated_api_endpoint"
  | "timeout";
