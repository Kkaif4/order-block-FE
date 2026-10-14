/**
 * Auto-Reconnecting WebSocket Hook for OrderBlock Telemetry
 * File: frontend/src/lib/useOrderBlockSocket.ts
 *
 * Implements:
 * - Exponential backoff reconnection: min(1000 * 2^attempt, 10000) ms
 * - Stale data detector (>15s without ticks)
 * - Seamless fallback to HTTP polling (only when WS is disconnected)
 * - Duplicate request suppression during Strict Mode & component transitions
 * Adheres strictly to docs/FE_rulebook.md Section 4.2.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { BoardSnapshot, WebSocketConnectionState } from "@/lib/types";
import { WS_BASE_URL, api } from "@/lib/api";

interface UseOrderBlockSocketOptions {
  wsUrl?: string;
  pollIntervalMs?: number;
}

export function useOrderBlockSocket({
  wsUrl = WS_BASE_URL,
  pollIntervalMs = 3000,
}: UseOrderBlockSocketOptions = {}) {
  const [data, setData] = useState<BoardSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<WebSocketConnectionState>("CONNECTING");

  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const hasReceivedDataRef = useRef<boolean>(false);

  // Stop active HTTP polling interval
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Fallback REST fetcher using centralized API client
  const fetchSnapshotViaHttp = useCallback(() => {
    if (!isMountedRef.current) return;
    api.getBoards()
      .then((snap: BoardSnapshot) => {
        if (snap && isMountedRef.current) {
          setData(snap);
          hasReceivedDataRef.current = true;
          lastMessageTimeRef.current = Date.now();
        }
      })
      .catch(() => {
        // Suppress network errors during polling
      });
  }, []);

  // Declare scheduleReconnectRef first
  const scheduleReconnectRef = useRef<() => void>(() => {});

  // Main connect function
  const connect = useCallback(() => {
    if (typeof window === "undefined" || !isMountedRef.current) return;

    // Gracefully clean up existing socket without triggering onclose reconnect logic
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMountedRef.current) {
          ws.close();
          return;
        }
        setConnectionState("LIVE");
        attemptRef.current = 0;
        stopPolling();
      };

      ws.onmessage = (event) => {
        if (!isMountedRef.current) return;
        try {
          const parsed = JSON.parse(event.data);
          if (parsed?.data) {
            setData(parsed.data);
            hasReceivedDataRef.current = true;
            setConnectionState("LIVE");
            lastMessageTimeRef.current = Date.now();
            // Data successfully received via WS, ensure polling is off
            stopPolling();
          }
        } catch {
          // Ignore parse errors on telemetry pings
        }
      };

      ws.onclose = () => {
        if (!isMountedRef.current) return;
        setConnectionState("DISCONNECTED");
        scheduleReconnectRef.current();
      };

      ws.onerror = () => {
        if (!isMountedRef.current) return;
        setConnectionState("DISCONNECTED");
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch {
      if (isMountedRef.current) {
        setConnectionState("DISCONNECTED");
        scheduleReconnectRef.current();
      }
    }
  }, [wsUrl, stopPolling]);

  // Reconnect logic
  const scheduleReconnect = useCallback(() => {
    if (!isMountedRef.current) return;

    if (!pollIntervalRef.current) {
      fetchSnapshotViaHttp();
      pollIntervalRef.current = setInterval(() => {
        if (isMountedRef.current) {
          fetchSnapshotViaHttp();
        }
      }, pollIntervalMs);
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.min(1000 * Math.pow(2, attemptRef.current), 10000);
    attemptRef.current += 1;

    reconnectTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, delay);
  }, [connect, fetchSnapshotViaHttp, pollIntervalMs]);

  // Keep ref current
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // Initial connection and stale monitor
  useEffect(() => {
    isMountedRef.current = true;

    // Fetch initial board snapshot via HTTP to hydrate immediately
    fetchSnapshotViaHttp();

    // Connect WebSocket
    const connectTimer = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 0);

    const staleInterval = setInterval(() => {
      const last = lastMessageTimeRef.current;
      if (last && Date.now() - last > 15000) {
        setConnectionState((prev) => (prev === "LIVE" ? "STALE" : prev));
      }
    }, 5000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(connectTimer);
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onmessage = null;
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      clearInterval(staleInterval);
    };
  }, [connect, fetchSnapshotViaHttp]);

  const handleReconnect = useCallback(() => {
    stopPolling();
    fetchSnapshotViaHttp();
    connect();
  }, [connect, fetchSnapshotViaHttp, stopPolling]);

  return {
    data,
    connectionState,
    reconnect: handleReconnect,
  };
}
