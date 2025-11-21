export type Stock = {
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

export type NotificationItem = {
  id: number;
  stock_id: number;
  message: string;
  trigger_price: number;
  triggered_at: string;
  stock?: {
    symbol: string;
    display_name: string;
  };
};

