/**
 * Auto-Reconnecting WebSocket Hook for OrderBlock Telemetry
 * File: frontend/src/lib/useOrderBlockSocket.ts
 *
 * Implements:
 * - Exponential backoff reconnection: min(1000 * 2^attempt, 10000) ms
 * - Stale data detector (>15s without ticks)
 * - Seamless fallback to HTTP polling
 * Adheres strictly to docs/FE_rulebook.md Section 4.2.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { BoardSnapshot, WebSocketConnectionState } from "@/lib/types";

interface UseOrderBlockSocketOptions {
  wsUrl?: string;
  fallbackPollUrl?: string;
  pollIntervalMs?: number;
}

export function useOrderBlockSocket({
  wsUrl = "ws://localhost:8000/ws/telemetry",
  fallbackPollUrl = "http://localhost:8000/api/boards",
  pollIntervalMs = 3000,
}: UseOrderBlockSocketOptions = {}) {
  const [data, setData] = useState<BoardSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>("CONNECTING");

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number | null>(null);

  // Fallback REST fetcher using promise resolution
  const fetchSnapshotViaHttp = useCallback(() => {
    fetch(fallbackPollUrl, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((snap: BoardSnapshot | null) => {
        if (snap) {
          setData(snap);
          lastMessageTimeRef.current = Date.now();
        }
      })
      .catch(() => {
        // Suppress network errors during polling
      });
  }, [fallbackPollUrl]);

  // Declare scheduleReconnectRef first
  const scheduleReconnectRef = useRef<() => void>(() => {});

  // Main connect function
  const connect = useCallback(() => {
    if (typeof window === "undefined") return;

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnectionState("LIVE");
        attemptRef.current = 0;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.data) {
            setData(parsed.data);
            setConnectionState("LIVE");
            lastMessageTimeRef.current = Date.now();
          }
        } catch {
          // Ignore parse errors on telemetry pings
        }
      };

      ws.onclose = () => {
        setConnectionState("DISCONNECTED");
        scheduleReconnectRef.current();
      };

      ws.onerror = () => {
        setConnectionState("DISCONNECTED");
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch {
      setConnectionState("DISCONNECTED");
      scheduleReconnectRef.current();
    }
  }, [wsUrl]);

  // Reconnect logic
  const scheduleReconnect = useCallback(() => {
    if (!pollIntervalRef.current) {
      fetchSnapshotViaHttp();
      pollIntervalRef.current = setInterval(fetchSnapshotViaHttp, pollIntervalMs);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 10000);
    attemptRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect, fetchSnapshotViaHttp, pollIntervalMs]);

  // Keep ref current
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // Initial connection and stale monitor
  useEffect(() => {
    fetchSnapshotViaHttp();
    const connectTimer = setTimeout(() => {
      connect();
    }, 0);

    const staleInterval = setInterval(() => {
      const last = lastMessageTimeRef.current;
      if (last && Date.now() - last > 15000) {
        setConnectionState((prev) => (prev === "LIVE" ? "STALE" : prev));
      }
    }, 5000);

    return () => {
      clearTimeout(connectTimer);
      if (wsRef.current) wsRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      clearInterval(staleInterval);
    };
  }, [connect, fetchSnapshotViaHttp]);

  return {
    data,
    connectionState,
    reconnect: connect,
  };
}
