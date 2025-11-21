import { Server as HttpServer } from "http";
import { Server as IOServer } from "socket.io";
import { StockRecord, NotificationRecord } from "./db";

export class NotificationHub {
  private io: IOServer;

  constructor(server: HttpServer, origin?: string) {
    this.io = new IOServer(server, {
      cors: {
        origin: origin ?? "*",
        methods: ["GET", "POST", "PATCH", "DELETE"],
      },
    });
  }

  attachLogging(): void {
    this.io.on("connection", (socket) => {
      console.log(`Client connected ${socket.id}`);
      socket.on("disconnect", () =>
        console.log(`Client disconnected ${socket.id}`)
      );
    });
  }

  broadcastStock(stock: StockRecord): void {
    this.io.emit("stock:update", stock);
  }

  broadcastStocks(stocks: StockRecord[]): void {
    this.io.emit("stock:list", stocks);
  }

  broadcastNotification(notification: NotificationRecord & {
    stock: Pick<StockRecord, "symbol" | "display_name">;
  }): void {
    this.io.emit("alarm:triggered", notification);
  }
}

