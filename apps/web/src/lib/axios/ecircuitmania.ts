import config from "@/lib/config";
import axios from "axios";

export const axiosECM = axios.create({
  baseURL: config.ECM.URL,
  headers: {
    "Content-Type": "application/json",
  },
});
