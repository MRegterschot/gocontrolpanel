import next from "next";
import { setHttpServer, setWebSocketServer } from "next-ws/server";
import { Server } from "node:http";
import { parse } from "node:url";
import { WebSocketServer } from "ws";

const httpServer = new Server();
setHttpServer(httpServer);
const webSocketServer = new WebSocketServer({ noServer: true });
setWebSocketServer(webSocketServer);

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev, customServer: true, turbo: true });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  httpServer
    .on("request", async (req, res) => {
      const start = Date.now();

      res.on("finish", () => {
        if (req.url?.startsWith("/_next/") || req.method !== "POST") return;
        const ms = Date.now() - start;
        console.log(
          `[HTTP]`,
          req.socket.remoteAddress,
          req.method,
          req.url,
          `${ms}ms`,
        );
      });

      try {
        const parsedUrl = parse(req.url!, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error("[HTTP ERROR]", err);
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    })
    .listen(3000, () => {
      console.log("▲ Ready on http://localhost:3000");
    });
});
