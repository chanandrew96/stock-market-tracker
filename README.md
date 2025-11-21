# Stock Market Tracker

全端應用程式，可在網頁上管理股票追蹤清單、設定價格警報，並即時收到觸發通知。

## 特色

- 以 Yahoo Finance 即時報價為基礎的背景輪詢機制
- 可設定「高於」或「低於」目標價的提醒條件
- 內建 SQLite 永久儲存股票與提醒記錄
- Socket.IO 即時推播，前端會即時更新及顯示提醒橫幅

## 系統架構

| 模組 | 技術 | 說明 |
| --- | --- | --- |
| 前端 | React + Vite + TypeScript | 負責 UI、表單驗證、即時列表與提醒顯示 |
| 後端 | Express + Socket.IO + TypeScript | 提供 REST API、管理資料庫、推播通知 |
| 資料庫 | SQLite (better-sqlite3) | 儲存股票追蹤清單及提醒紀錄 |
| 報價來源 | yahoo-finance2 | 從 Yahoo Finance 擷取最新價格 |

## 開發環境需求

- Node.js 18+
- npm 10+

## 環境設定

1. 複製範例設定檔：
   ```bash
   cd server && copy env.example .env   # Windows PowerShell
   cd ../client && copy env.example .env
   ```
2. 若需修改：
   - `server/.env`
     - `PORT`: API 埠號（預設 4000）
     - `CLIENT_ORIGIN`: 允許的前端網址
     - `POLL_INTERVAL_MS`: 報價檢查間隔（毫秒）
     - `DATABASE_PATH`: SQLite 檔案路徑
   - `client/.env`
     - `VITE_API_BASE_URL`: 後端 API，例如 `http://localhost:4000/api`

## 安裝與啟動

```bash
# 安裝依賴
cd server && npm install
cd ../client && npm install

# 啟動後端
cd ../server
npm run dev

# 另開終端啟動前端
cd ../client
npm run dev
```

前端預設開在 `http://localhost:5173`，後端 API 在 `http://localhost:4000/api`。

## Build

```bash
cd server && npm run build
cd ../client && npm run build
```

## API 摘要

- `GET /api/stocks`：列出全部追蹤股票
- `POST /api/stocks`：新增追蹤（body: `symbol`, `alarmPrice`, `direction`）
- `PATCH /api/stocks/:id`：更新提醒設定
- `DELETE /api/stocks/:id`：移除追蹤
- `GET /api/stocks/notifications/recent`：最近提醒
- `GET /api/health`：健康檢查

通知會另外透過 Socket.IO 事件：
- `stock:update`：單一股票更新
- `stock:list`：清單同步
- `alarm:triggered`：價格觸發提醒

## 後續可加強

- 加入使用者登入與多帳號追蹤
- 自訂提醒冷卻時間或多條提醒線
- 寄送 Email / SMS 等外部通知