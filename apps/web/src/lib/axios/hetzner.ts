import config from "@/lib/config";
import { HetznerApiError } from "@/types/api/hetzner/error";
import axios, { AxiosError } from "axios";

export const axiosHetzner = axios.create({
  baseURL: config.HETZNER.URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosHetzner.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response && error.response.data) {
      const data =
        (error.response.data as { error?: Partial<HetznerApiError> }).error ||
        {};

      const typedError: HetznerApiError = {
        code: data.code || "server_error",
        message: data.message || "An unexpected error occurred",
        details: data.details,
      };

      return Promise.reject(typedError);
    }

    // Network or unknown error
    return Promise.reject({
      code: "unavailable",
      message: error.message || "Network error",
    } satisfies HetznerApiError);
  },
);
