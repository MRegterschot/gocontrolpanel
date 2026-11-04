import { Counter } from "./util.js";

// Shared by all fake servers in the process
export class ServerStats {
  controllers = 0;
  requests = new Counter();
  unknown = new Counter();
  callbacks = 0;
  chatMessages = 0;
  chatBytes = 0;
  manialinkPages = 0;
  manialinkBytes = 0;
  totalRequests = 0;
  totalCallbacks = 0;
}
