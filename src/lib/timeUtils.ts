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

export function formatPositionTime(isoString?: string | null): string {
  if (!isoString) return "--:--";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return "--:--";

    const timeStr = new Intl.DateTimeFormat("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d);

    const ago = formatTimeAgo(isoString);
    return ago ? `${timeStr} IST (${ago})` : `${timeStr} IST`;
  } catch {
    return "--:--";
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

export function formatDuration(seconds?: number | null): string {
  if (!seconds || seconds <= 0) return "< 1s";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (mins < 60) return remSec > 0 ? `${mins}m ${remSec}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours}h ${remMins}m`;
}

/**
 * Checks if current time is within Indian Stock Market operating window:
 * Monday to Friday, 08:55 AM IST to 03:35 PM IST (pre-market buffer to market close buffer)
 */
export function isIndianMarketHours(): boolean {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const weekday = parts.find((p) => p.type === "weekday")?.value;
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);

    if (weekday === "Sat" || weekday === "Sun") {
      return false;
    }

    const totalMinutes = hour * 60 + minute;
    // 08:55 AM is 8*60 + 55 = 535
    // 03:35 PM (15:35) is 15*60 + 35 = 935
    return totalMinutes >= 535 && totalMinutes <= 935;
  } catch {
    return false;
  }
}

