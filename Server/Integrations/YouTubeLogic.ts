/**
 * Override mode for YouTube polling control
 */
export type PollingOverrideMode = null | "force_on" | "force_off";

/**
 * Determines whether YouTube API polling should start based on override mode,
 * Twitch stream status, and current monitoring state.
 */
export function shouldStartPolling(
  overrideMode: PollingOverrideMode,
  isTwitchLive: boolean,
  isMonitoring: boolean
): boolean {
  if (isMonitoring) return false;

  if (overrideMode === "force_on") return true;
  if (overrideMode === "force_off") return false;

  // Auto mode - follow Twitch stream status
  return isTwitchLive;
}

/**
 * Determines whether an individual API polling call should be skipped.
 */
export function shouldSkipApiPolling(
  overrideMode: PollingOverrideMode,
  isTwitchLive: boolean,
  isMonitoring: boolean,
  hasActivePollingInterval: boolean
): boolean {
  if (isMonitoring) return true;

  if (overrideMode === "force_off") return true;
  if (overrideMode === "force_on") return false;

  // Auto mode - skip if Twitch is not live (unless initial check during setup)
  if (!isTwitchLive && hasActivePollingInterval) return true;

  return false;
}

/**
 * Determines whether the chat polling interval should be updated based on
 * the API's recommended interval vs the current setting.
 *
 * Rules:
 * - Only update if API recommends an interval
 * - Don't update if current interval is below minCustomThreshold (e.g. quiz mode)
 * - Only update if recommended differs from current by more than maxDelta ms
 */
export function shouldUpdatePollingInterval(
  recommendedInterval: number | null | undefined,
  currentInterval: number,
  minCustomThreshold: number = 5000,
  maxDelta: number = 2000
): boolean {
  if (!recommendedInterval) return false;
  if (currentInterval <= minCustomThreshold) return false;

  return (
    recommendedInterval > currentInterval + maxDelta ||
    recommendedInterval < currentInterval - maxDelta
  );
}

/**
 * Converts micros amount string to standard currency amount.
 * YouTube API returns amounts in micros (millionths of a currency unit).
 */
export function microsToAmount(micros: string): number {
  return parseFloat(micros || "0") / 1000000;
}

/**
 * Strips the leading '@' from a YouTube display name if present.
 */
export function stripAtPrefix(displayName: string): string {
  return displayName.replace(/^@/, "");
}
