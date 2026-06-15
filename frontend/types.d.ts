export interface AchievementData {
  /** Steam internal achievement API name */
  strID: string;
  /** Display name shown to the user */
  strName: string;
  /** Achievement description */
  strDescription: string;
  /** URL to the achievement icon (unlocked) */
  strIconURL?: string;
  /** Gamerscore-equivalent points (Steam doesn't have this natively; default 0) */
  nGamerScore?: number;
  /** Global unlock percentage (0-100) */
  flAchieved?: number;
  /** App ID of the game */
  nAppID?: number;
  /** App name */
  strAppName?: string;
  /** Whether this is a hidden achievement */
  bHidden?: boolean;
}

export interface PluginConfig {
  soundEnabled: boolean;
  theme: 'xbox360' | 'modern' | 'minimal';
  position: 'bottom-right' | 'bottom-center' | 'bottom-left';
  duration: number;
  volume: number;
  showDescription: boolean;
  showGamerScore: boolean;
}

declare global {
  interface Window {
    /**
     * Steam's internal privileged JavaScript API, injected by steamwebhelper into CEF pages.
     * NOTE: These APIs are internal and undocumented — method names may change with Steam updates.
     */
    SteamClient: {
      GameSessions: {
        /**
         * Registers a callback that fires when the current user unlocks an achievement.
         * Returns an object with an unregister() method to clean up.
         *
         * The exact payload shape varies between Steam versions. Observed fields:
         *   nAchievementID, strAchievementName, strAchievementDisplayName,
         *   strAchievementDescription, unPercentage, bCurrentUserAchieved
         */
        RegisterForAchievementNotification: (
          callback: (data: {
            nAchievementID?: number;
            strAchievementName?: string;
            strAchievementDisplayName?: string;
            strAchievementDescription?: string;
            unPercentage?: number;
            bCurrentUserAchieved?: boolean;
            nAppID?: number;
          }) => void
        ) => { unregister: () => void };
      };
      Apps: {
        /** Get all achievements for a given app */
        GetAchievementsForApp?: (nAppID: number) => Promise<any[]>;
        /** Get currently running app ID */
        GetCurrentGameID?: () => number;
      };
    };

    /** Millennium's plugin communication bridge */
    Millennium: {
      callPlugin: (method: string, args?: object) => Promise<any>;
      exposeObj: (obj: object) => void;
    };
  }
}
