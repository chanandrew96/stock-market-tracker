import { useEffect, useMemo, useState } from "react";
import "./App.css";
import type { NotificationItem, Stock } from "./types";
import {
  createStock,
  deleteStock,
  fetchNotifications,
  fetchStocks,
  listenToSocket,
  updateStock,
} from "./api";

type FormState = {
  symbol: string;
  alarmPrice: string;
  direction: "above" | "below";
};

const initialForm: FormState = {
  symbol: "",
  alarmPrice: "",
  direction: "above",
};

function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [stockList, notificationList] = await Promise.all([
          fetchStocks(),
          fetchNotifications(),
        ]);
        setStocks(stockList);
        setNotifications(notificationList);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "載入失敗");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const unsubs = [
      listenToSocket("stock:update", (stock) => {
        setStocks((prev) => {
          const exists = prev.findIndex((item) => item.id === stock.id);
          if (exists >= 0) {
            const copy = [...prev];
            copy[exists] = stock;
            return copy;
          }
          return [...prev, stock];
        });
      }),
      listenToSocket("stock:list", (list) => {
        setStocks(list);
      }),
      listenToSocket("alarm:triggered", (notification) => {
        setNotifications((prev) => [notification, ...prev].slice(0, 50));
        setMessage(notification.message);
      }),
    ];
    return () => {
      unsubs.forEach((fn) => fn());
    };
  }, []);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.symbol || !form.alarmPrice) return;
    try {
      const created = await createStock({
        symbol: form.symbol,
        alarmPrice: Number(form.alarmPrice),
        direction: form.direction,
      });
      setStocks((prev) => [...prev, created]);
      setForm(initialForm);
      setMessage("已新增股票並開始監控");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "新增失敗");
    }
  };

  const handleUpdate = async (
    id: number,
    payload: { alarmPrice: number; direction: "above" | "below" }
  ) => {
    try {
      const updated = await updateStock(id, payload);
      setStocks((prev) =>
        prev.map((stock) => (stock.id === id ? updated : stock))
      );
      setMessage(`${updated.symbol} 已更新預警設定`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "更新失敗");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("確定要刪除此股票嗎？")) return;
    try {
      await deleteStock(id);
      setStocks((prev) => prev.filter((stock) => stock.id !== id));
      setMessage("已移除股票");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "刪除失敗");
    }
  };

  const latestNotifications = useMemo(
    () => notifications.slice(0, 5),
    [notifications]
  );

  return (
    <div className="app-shell">
      <header>
        <div>
          <p className="eyebrow">Stock Market Tracker</p>
          <h1>股票監控與報價提醒</h1>
          <p className="subtitle">
            新增想追蹤的股票，設定目標價格，系統會即時提醒。
          </p>
        </div>
      </header>

      {message && (
        <div className="banner" role="status">
          <span>{message}</span>
          <button onClick={() => setMessage(null)}>✕</button>
        </div>
      )}

      <main>
        <section className="card">
          <h2>新增追蹤股票</h2>
          <form className="stock-form" onSubmit={handleCreate}>
            <div>
              <label htmlFor="symbol">股票代號</label>
              <input
                id="symbol"
                placeholder="例如 AAPL"
                value={form.symbol}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    symbol: e.target.value.toUpperCase(),
                  }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="alarmPrice">目標價格</label>
              <input
                id="alarmPrice"
                type="number"
                step="0.01"
                placeholder="150.00"
                value={form.alarmPrice}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    alarmPrice: e.target.value,
                  }))
                }
                required
              />
            </div>
            <div>
              <label htmlFor="direction">提醒條件</label>
              <select
                id="direction"
                value={form.direction}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    direction: e.target.value as "above" | "below",
                  }))
                }
              >
                <option value="above">價格高於目標</option>
                <option value="below">價格低於目標</option>
              </select>
            </div>
            <button type="submit">開始追蹤</button>
          </form>
        </section>

        <section className="card">
          <div className="section-head">
            <div>
              <h2>追蹤清單</h2>
              <p className="subtitle">
                {loading ? "載入中…" : `共 ${stocks.length} 檔股票`}
              </p>
            </div>
            <div className="legend">
              <span className="pill above">向上突破</span>
              <span className="pill below">向下跌破</span>
            </div>
          </div>

          {stocks.length === 0 ? (
            <p className="empty">目前尚未新增任何股票</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>股票</th>
                    <th>最新價</th>
                    <th>目標價</th>
                    <th>條件</th>
                    <th>更新</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock) => (
                    <StockRow
                      key={stock.id}
                      stock={stock}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="card">
          <h2>最新提醒</h2>
          {latestNotifications.length === 0 ? (
            <p className="empty">暫無提醒紀錄</p>
          ) : (
            <ul className="notification-list">
              {latestNotifications.map((item) => (
                <li key={item.id}>
                  <div>
                    <strong>{item.stock?.symbol ?? item.stock_id}</strong>
                    <span>{formatDate(item.triggered_at)}</span>
                  </div>
                  <p>{item.message}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

type RowProps = {
  stock: Stock;
  onUpdate: (
    id: number,
    payload: { alarmPrice: number; direction: "above" | "below" }
  ) => Promise<void> | void;
  onDelete: (id: number) => Promise<void> | void;
};

function StockRow({ stock, onUpdate, onDelete }: RowProps) {
  const [price, setPrice] = useState(stock.alarm_price.toString());
  const [direction, setDirection] = useState(stock.alarm_direction);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setPrice(stock.alarm_price.toString());
  }, [stock.alarm_price]);

  useEffect(() => {
    setDirection(stock.alarm_direction);
  }, [stock.alarm_direction]);

  const handleSave = async () => {
    const alarmPrice = Number(price);
    if (!alarmPrice || Number.isNaN(alarmPrice)) return;
    setSaving(true);
    await onUpdate(stock.id, { alarmPrice, direction });
    setSaving(false);
  };

  return (
    <tr>
      <td>
        <div className="stock-name">
          <strong>{stock.symbol}</strong>
          <span>{stock.display_name}</span>
        </div>
      </td>
      <td>
        {stock.last_price !== null && stock.last_price !== undefined ? (
          <strong>${stock.last_price.toFixed(2)}</strong>
        ) : (
          "-"
        )}
      </td>
      <td>
        <input
          type="number"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </td>
      <td>
        <select
          value={direction}
          onChange={(e) =>
            setDirection(e.target.value as "above" | "below")
          }
          className={`pill ${direction === "above" ? "above" : "below"}`}
        >
          <option value="above">高於</option>
          <option value="below">低於</option>
        </select>
      </td>
      <td className="row-actions">
        <button onClick={handleSave} disabled={saving}>
          {saving ? "儲存中…" : "儲存"}
        </button>
        <button className="ghost" onClick={() => onDelete(stock.id)}>
          移除
        </button>
      </td>
    </tr>
  );
}

function formatDate(input: string): string {
  const date = new Date(input);
  return date.toLocaleString();
}

export default App;
