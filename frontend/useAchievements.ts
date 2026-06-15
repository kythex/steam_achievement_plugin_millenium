import { AchievementData } from './types';

type AchievementCallback = (achievement: AchievementData) => void;

/**
 * Registers a listener for Steam achievement unlock events.
 *
 * Steam exposes SteamClient.GameSessions.RegisterForAchievementNotification on its CEF pages.
 * If this API is unavailable (Steam updated the name), a warning is logged and the function
 * returns a no-op cleanup. The exact field names in the callback payload are internal to Valve
 * and may need adjustment — check the Steam CEF console with `SteamClient.GameSessions` to inspect.
 *
 * Returns a cleanup function to unregister the listener.
 */
export function setupAchievementListener(onUnlock: AchievementCallback): () => void {
  const client = window.SteamClient;

  if (!client?.GameSessions?.RegisterForAchievementNotification) {
    console.warn(
      '[xbox360-achievements] SteamClient.GameSessions.RegisterForAchievementNotification not found. ' +
      'The achievement listener will not work. Check the Steam CEF console to find the correct API name.'
    );
    return () => {};
  }

  const registration = client.GameSessions.RegisterForAchievementNotification((raw) => {
    // Normalize the raw Steam payload into our AchievementData shape.
    // Field names observed in various Steam versions — add more mappings if needed.
    const achievement: AchievementData = {
      strID: raw.strAchievementName ?? 'unknown',
      strName: raw.strAchievementDisplayName ?? raw.strAchievementName ?? 'Achievement Unlocked',
      strDescription: raw.strAchievementDescription ?? '',
      flAchieved: raw.unPercentage ?? 0,
      nAppID: raw.nAppID,
      // Icon URL: Steam serves achievement images from their CDN.
      // If the raw payload doesn't include it, we'll show the default trophy icon.
      strIconURL: raw.nAppID
        ? `https://steamcdn-a.akamaihd.net/steamcommunity/public/images/apps/${raw.nAppID}/${raw.strAchievementName}.jpg`
        : undefined,
    };

    // Only fire for the current user actually earning the achievement
    if (raw.bCurrentUserAchieved === false) return;

    onUnlock(achievement);
  });

  console.info('[xbox360-achievements] Achievement listener registered.');

  return () => {
    try {
      registration.unregister();
      console.info('[xbox360-achievements] Achievement listener unregistered.');
    } catch (e) {
      console.warn('[xbox360-achievements] Failed to unregister listener:', e);
    }
  };
}
