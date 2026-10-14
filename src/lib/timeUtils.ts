/**
 * Market Timestamp & Elapsed Time Utilities
 * File: frontend/src/lib/timeUtils.ts
 *
 * Formats timestamps in Indian Standard Time (IST - Asia/Kolkata)
 * and calculates relative elapsed age for Order Block generation.
 */

export function formatMarketTime(isoString?: string | null): string {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return "--:--";
  }
}

export function formatMarketTimeWithSeconds(isoString?: string | null): string {
  if (!isoString) return "--:--:--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--:--";

    return new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(d) + " IST";
  } catch {
    return "--:--:--";
  }
}

export function formatTimeAgo(isoString?: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "";

    const now = Date.now();
    const diffMs = Math.max(0, now - d.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const hours = Math.floor(diffMinutes / 60);
    const remMins = diffMinutes % 60;
    if (hours < 24) {
      return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
    }
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}
