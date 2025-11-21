import { io, Socket } from "socket.io-client";
import type { NotificationItem, Stock } from "./types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:4000/api";

export async function fetchStocks(): Promise<Stock[]> {
  const res = await fetch(`${API_BASE}/stocks`);
  if (!res.ok) throw new Error("Failed to fetch stocks");
  return res.json();
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const res = await fetch(`${API_BASE}/stocks/notifications/recent`);
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

export async function createStock(payload: {
  symbol: string;
  alarmPrice: number;
  direction: "above" | "below";
}): Promise<Stock> {
  const res = await fetch(`${API_BASE}/stocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? "Failed to create stock");
  }
  return res.json();
}

export async function updateStock(
  id: number,
  payload: Partial<{
    alarmPrice: number;
    direction: "above" | "below";
  }>
): Promise<Stock> {
  const res = await fetch(`${API_BASE}/stocks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? "Failed to update stock");
  }

  return res.json();
}

export async function deleteStock(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/stocks/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message ?? "Failed to delete stock");
  }
}

export type SocketEvents = {
  "stock:update": Stock;
  "stock:list": Stock[];
  "alarm:triggered": NotificationItem;
};

type Listener<K extends keyof SocketEvents> = (payload: SocketEvents[K]) => void;

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (!socket) {
    const baseUrl = new URL(API_BASE);
    socket = io(`${baseUrl.protocol}//${baseUrl.host}`, {
      path: "/socket.io",
    });
  }
  return socket;
}

export function listenToSocket<K extends keyof SocketEvents>(
  event: K,
  callback: Listener<K>
): () => void {
  const io = connectSocket();
  const handler = callback as (...args: unknown[]) => void;
  io.on(event as string, handler);
  return () => {
    io.off(event as string, handler);
  };
}

