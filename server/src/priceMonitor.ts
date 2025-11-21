import { NotificationHub } from "./notifier";
import {
  NotificationRepository,
  StockRecord,
  StockRepository,
} from "./db";
import { fetchQuote } from "./priceService";

export class PriceMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private hub: NotificationHub,
    private intervalMs: number
  ) {}

  start(): void {
    this.stop();
    this.runCycle();
    this.timer = setInterval(() => this.runCycle(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async runCycle(): Promise<void> {
    const stocks = StockRepository.list();
    await Promise.all(
      stocks.map(async (stock) => {
        try {
          await this.processStock(stock);
        } catch (err) {
          console.error(`更新 ${stock.symbol} 失敗`, err);
        }
      })
    );
  }

  private async processStock(stock: StockRecord): Promise<void> {
    const quote = await fetchQuote(stock.symbol);
    const price = quote.regularMarketPrice;
    StockRepository.updateLastPrice(stock.id, price);

    const updated = StockRepository.findById(stock.id);
    if (!updated) return;

    this.hub.broadcastStock(updated);

    const crossed = this.hasCrossed(stock, price);
    if (!crossed) {
      return;
    }

    const directionText = stock.alarm_direction === "above" ? "高於" : "低於";
    const message = `${stock.symbol} 已${directionText}目標 ${stock.alarm_price.toFixed(
      2
    )}，最新 ${price.toFixed(2)}`;

    const record = NotificationRepository.record(stock.id, message, price);
    StockRepository.updateLastAlert(stock.id);

    const notification = {
      ...record,
      stock: {
        symbol: stock.symbol,
        display_name: stock.display_name,
      },
    };

    this.hub.broadcastNotification(notification);
  }

  private hasCrossed(stock: StockRecord, latestPrice: number): boolean {
    const prev = stock.last_price ?? latestPrice;
    if (stock.alarm_direction === "above") {
      return prev < stock.alarm_price && latestPrice >= stock.alarm_price;
    }
    return prev > stock.alarm_price && latestPrice <= stock.alarm_price;
  }
}

