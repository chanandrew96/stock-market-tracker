import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { appConfig } from "./config";

const dbFile = path.resolve(appConfig.DATABASE_PATH);

const dbDir = path.dirname(dbFile);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbFile);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS stocks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    alarm_price REAL NOT NULL,
    alarm_direction TEXT NOT NULL CHECK(alarm_direction IN ('above','below')),
    last_price REAL,
    last_alert_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    trigger_price REAL NOT NULL,
    triggered_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(stock_id) REFERENCES stocks(id) ON DELETE CASCADE
  );
`);

export type StockRecord = {
  id: number;
  symbol: string;
  display_name: string;
  alarm_price: number;
  alarm_direction: "above" | "below";
  last_price: number | null;
  last_alert_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationRecord = {
  id: number;
  stock_id: number;
  message: string;
  trigger_price: number;
  triggered_at: string;
};

export const StockRepository = {
  list(): StockRecord[] {
    return db
      .prepare(
        `SELECT id, symbol, display_name, alarm_price, alarm_direction, last_price, last_alert_at, created_at, updated_at
         FROM stocks ORDER BY symbol ASC`
      )
      .all() as StockRecord[];
  },

  findBySymbol(symbol: string): StockRecord | undefined {
    return db
      .prepare(
        `SELECT id, symbol, display_name, alarm_price, alarm_direction, last_price, last_alert_at, created_at, updated_at
         FROM stocks WHERE symbol = ?`
      )
      .get(symbol) as StockRecord | undefined;
  },

  create(data: {
    symbol: string;
    displayName: string;
    alarmPrice: number;
    direction: "above" | "below";
    lastPrice: number | null;
  }): StockRecord {
    const result = db
      .prepare(
        `INSERT INTO stocks(symbol, display_name, alarm_price, alarm_direction, last_price)
         VALUES(@symbol, @displayName, @alarmPrice, @direction, @lastPrice)`
      )
      .run(data);

    return this.findById(result.lastInsertRowid as number)!;
  },

  findById(id: number): StockRecord | undefined {
    return db
      .prepare(
        `SELECT id, symbol, display_name, alarm_price, alarm_direction, last_price, last_alert_at, created_at, updated_at
         FROM stocks WHERE id = ?`
      )
      .get(id) as StockRecord | undefined;
  },

  update(
    id: number,
    data: { alarmPrice?: number; direction?: "above" | "below" }
  ): StockRecord | undefined {
    const fields: string[] = [];
    const params: Record<string, unknown> = { id };

    if (typeof data.alarmPrice === "number") {
      fields.push("alarm_price = @alarmPrice");
      params.alarmPrice = data.alarmPrice;
    }

    if (data.direction) {
      fields.push("alarm_direction = @direction");
      params.direction = data.direction;
    }

    if (!fields.length) {
      return this.findById(id);
    }

    db.prepare(
      `UPDATE stocks SET ${fields.join(
        ", "
      )}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`
    ).run(params);

    return this.findById(id);
  },

  updateLastPrice(id: number, lastPrice: number): void {
    db.prepare(
      `UPDATE stocks SET last_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(lastPrice, id);
  },

  updateLastAlert(id: number): void {
    db.prepare(
      `UPDATE stocks SET last_alert_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(id);
  },

  delete(id: number): void {
    db.prepare(`DELETE FROM stocks WHERE id = ?`).run(id);
  },
};

export const NotificationRepository = {
  record(
    stockId: number,
    message: string,
    triggerPrice: number
  ): NotificationRecord {
    const result = db
      .prepare(
        `INSERT INTO notifications(stock_id, message, trigger_price)
         VALUES(?, ?, ?)`
      )
      .run(stockId, message, triggerPrice);

    return db
      .prepare(
        `SELECT id, stock_id, message, trigger_price, triggered_at
         FROM notifications WHERE id = ?`
      )
      .get(result.lastInsertRowid) as NotificationRecord;
  },

  list(limit = 50): NotificationRecord[] {
    return db
      .prepare(
        `SELECT id, stock_id, message, trigger_price, triggered_at
         FROM notifications ORDER BY triggered_at DESC LIMIT ?`
      )
      .all(limit) as NotificationRecord[];
  },
};

