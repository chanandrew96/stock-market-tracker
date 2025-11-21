import { Router } from "express";
import { z } from "zod";
import { NotificationHub } from "../notifier";
import { StockRepository, NotificationRepository } from "../db";
import { fetchQuote } from "../priceService";

const createStockSchema = z.object({
  symbol: z.string().min(1),
  alarmPrice: z.coerce.number().positive(),
  direction: z.enum(["above", "below"]).default("above"),
});

const updateStockSchema = z
  .object({
    alarmPrice: z.coerce.number().positive().optional(),
    direction: z.enum(["above", "below"]).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "必須提供要更新的欄位",
  });

export function createStocksRouter(hub: NotificationHub): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json(StockRepository.list());
  });

  router.post("/", async (req, res, next) => {
    try {
      const payload = createStockSchema.parse(req.body);
      const symbol = payload.symbol.trim().toUpperCase();

      if (StockRepository.findBySymbol(symbol)) {
        return res.status(409).json({ message: "代號已存在" });
      }

      const quote = await fetchQuote(symbol);
      const created = StockRepository.create({
        symbol,
        displayName: quote.shortName,
        alarmPrice: payload.alarmPrice,
        direction: payload.direction,
        lastPrice: quote.regularMarketPrice,
      });

      hub.broadcastStock(created);

      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:id", (req, res, next) => {
    try {
      const payload = updateStockSchema.parse(req.body);
      const id = Number(req.params.id);
      const updateData: { alarmPrice?: number; direction?: "above" | "below" } =
        {};
      if (typeof payload.alarmPrice === "number") {
        updateData.alarmPrice = payload.alarmPrice;
      }
      if (payload.direction) {
        updateData.direction = payload.direction;
      }

      const updated = StockRepository.update(id, updateData);

      if (!updated) {
        return res.status(404).json({ message: "找不到股票" });
      }

      hub.broadcastStock(updated);
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", (req, res) => {
    const id = Number(req.params.id);
    const existing = StockRepository.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "找不到股票" });
    }

    StockRepository.delete(id);
    hub.broadcastStocks(StockRepository.list());
    res.status(204).send();
  });

  router.get("/notifications/recent", (_req, res) => {
    res.json(NotificationRepository.list());
  });

  return router;
}

