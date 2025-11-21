import express from "express";
import cors from "cors";
import http from "http";
import { appConfig } from "./config";
import { createStocksRouter } from "./routes/stocks";
import { NotificationHub } from "./notifier";
import { PriceMonitor } from "./priceMonitor";

const app = express();
app.use(
  cors({
    origin: appConfig.CLIENT_ORIGIN ?? "*",
  })
);
app.use(express.json());

const server = http.createServer(app);
const hub = new NotificationHub(server, appConfig.CLIENT_ORIGIN);
hub.attachLogging();

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

app.use("/api/stocks", createStocksRouter(hub));

app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error(err);
    res.status(500).json({ message: err instanceof Error ? err.message : err });
  }
);

const monitor = new PriceMonitor(hub, appConfig.POLL_INTERVAL_MS);
monitor.start();

server.listen(appConfig.PORT, () => {
  console.log(`API listening on http://localhost:${appConfig.PORT}`);
});

