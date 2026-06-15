import React, { useEffect, useRef, useState } from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  Millennium,
  IconsModule,
  definePlugin,
  Field,
  DialogButton,
  usePluginConfig,
} from '@steambrew/client';
import { NotificationManager, AchievementNotification, injectStyles } from './Notification';
import { setupAchievementListener } from './useAchievements';
import { playTestSound, makeMockAchievement } from './sounds';
import { AchievementData, PluginConfig } from './types';

// ─── Settings panel (shown in Steam's Quick Access sidebar) ────────────────────

const SettingsContent: React.FC = () => {
  const [soundEnabled, setSoundEnabled]       = usePluginConfig<boolean>('soundEnabled');
  const [theme, setTheme]                     = usePluginConfig<string>('theme');
  const [position, setPosition]               = usePluginConfig<string>('position');
  const [duration, setDuration]               = usePluginConfig<number>('duration');
  const [volume, setVolume]                   = usePluginConfig<number>('volume');
  const [showDescription, setShowDescription] = usePluginConfig<boolean>('showDescription');
  const [showGamerScore, setShowGamerScore]   = usePluginConfig<boolean>('showGamerScore');

  const [previewing, setPreviewing] = useState(false);

  const firePreview = () => {
    if (previewing) return;
    setPreviewing(true);
    const mock = makeMockAchievement();
    if (soundEnabled) playTestSound(volume ?? 0.7);
    (window as any).__xba_enqueue?.(mock);
    setTimeout(() => setPreviewing(false), 2000);
  };

  const cycleTheme = () => {
    const themes = ['xbox360', 'modern', 'minimal'];
    const next = themes[(themes.indexOf(theme ?? 'xbox360') + 1) % themes.length];
    setTheme(next);
  };

  const cyclePosition = () => {
    const positions = ['bottom-right', 'bottom-center', 'bottom-left'];
    const next = positions[(positions.indexOf(position ?? 'bottom-right') + 1) % positions.length];
    setPosition(next);
  };

  const cycleDuration = () => {
    const durations = [3000, 4000, 5000, 7000, 10000];
    const next = durations[(durations.indexOf(duration ?? 5000) + 1) % durations.length];
    setDuration(next);
  };

  const cycleVolume = () => {
    const volumes = [0.3, 0.5, 0.7, 1.0];
    const next = volumes[(volumes.indexOf(volume ?? 0.7) + 1) % volumes.length];
    setVolume(next);
  };

  const themeLabel: Record<string, string> = {
    xbox360: 'Xbox 360 (green)',
    modern:  'Modern (blue)',
    minimal: 'Minimal (dark)',
  };

  const durationLabel = (ms: number) => `${(ms / 1000).toFixed(0)}s`;
  const volumeLabel   = (v: number)  => `${Math.round(v * 100)}%`;

  return (
    <>
      <Field
        label="Preview Notification"
        description="Fire a test achievement popup with current settings."
        icon={<IconsModule.Settings />}
        bottomSeparator="standard"
        focusable
      >
        <DialogButton onClick={firePreview} disabled={previewing}>
          {previewing ? 'Playing…' : 'Preview'}
        </DialogButton>
      </Field>

      <Field
        label="Theme"
        description={`Current: ${themeLabel[theme ?? 'xbox360'] ?? theme}`}
        icon={<IconsModule.Settings />}
        bottomSeparator="standard"
        focusable
      >
        <DialogButton onClick={cycleTheme}>
          {themeLabel[theme ?? 'xbox360'] ?? theme}
        </DialogButton>
      </Field>

      <Field
        label="Position"
        description="Where the notification appears on screen."
        icon={<IconsModule.Settings />}
        bottomSeparator="standard"
        focusable
      >
        <DialogButton onClick={cyclePosition}>
          {(position ?? 'bottom-right').replace('-', ' ')}
        </DialogButton>
      </Field>

      <Field
        label="Display Duration"
        description="How long the notification stays on screen."
        icon={<IconsModule.Settings />}
        bottomSeparator="standard"
        focusable
      >
        <DialogButton onClick={cycleDuration}>
          {durationLabel(duration ?? 5000)}
        </DialogButton>
      </Field>

      <Field
        label="Sound"
        description="Play a sound when an achievement unlocks."
        icon={<IconsModule.Settings />}
        bottomSeparator="standard"
        focusable
      >
        <DialogButton onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? 'Enabled' : 'Disabled'}
        </DialogButton>
      </Field>

      {soundEnabled && (
        <Field
          label="Volume"
          description="Notification sound volume."
          icon={<IconsModule.Settings />}
          bottomSeparator="standard"
          focusable
        >
          <DialogButton onClick={cycleVolume}>
            {volumeLabel(volume ?? 0.7)}
          </DialogButton>
        </Field>
      )}

      <Field
        label="Show Description"
        description="Display the achievement description in the popup."
        icon={<IconsModule.Settings />}
        bottomSeparator="standard"
        focusable
      >
        <DialogButton onClick={() => setShowDescription(!showDescription)}>
          {showDescription ? 'Visible' : 'Hidden'}
        </DialogButton>
      </Field>

      <Field
        label="Show GamerScore"
        description="Display a GamerScore badge on the popup."
        icon={<IconsModule.Settings />}
        bottomSeparator="none"
        focusable
      >
        <DialogButton onClick={() => setShowGamerScore(!showGamerScore)}>
          {showGamerScore ? 'Visible' : 'Hidden'}
        </DialogButton>
      </Field>
    </>
  );
};

// ─── Plugin entry point ────────────────────────────────────────────────────────

export default definePlugin(() => {
  injectStyles();

  // Mount the floating notification manager into Steam's DOM root.
  // We create our own container div so we never conflict with Steam's React tree.
  const container = document.createElement('div');
  container.id = 'xba-root';
  container.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;z-index:99998;';
  document.body.appendChild(container);

  // Read current config synchronously for the manager
  const getConfig = (): PluginConfig => ({
    soundEnabled:    (window as any).__xba_cfg?.soundEnabled    ?? true,
    theme:           (window as any).__xba_cfg?.theme           ?? 'xbox360',
    position:        (window as any).__xba_cfg?.position        ?? 'bottom-right',
    duration:        (window as any).__xba_cfg?.duration        ?? 5000,
    volume:          (window as any).__xba_cfg?.volume          ?? 0.7,
    showDescription: (window as any).__xba_cfg?.showDescription ?? true,
    showGamerScore:  (window as any).__xba_cfg?.showGamerScore  ?? true,
  });

  let root: Root | null = null;

  // Defer mount slightly to ensure DOM is ready
  const mountTimer = setTimeout(() => {
    root = createRoot(container);
    root.render(<NotificationManagerBridge getConfig={getConfig} />);
  }, 500);

  // Register Steam achievement listener
  const unsubscribe = setupAchievementListener((achievement: AchievementData) => {
    const cfg = getConfig();
    if (cfg.soundEnabled) playTestSound(cfg.volume);
    (window as any).__xba_enqueue?.(achievement);
  });

  return {
    title: 'Xbox 360 Achievements',
    icon: <IconsModule.Settings />,
    content: <SettingsContent />,

    onDismount() {
      clearTimeout(mountTimer);
      unsubscribe();
      root?.unmount();
      container.remove();
      const style = document.getElementById('xbox360-achievements-styles');
      style?.remove();
    },
  };
});

// ─── Bridge: syncs Millennium config into the floating manager ─────────────────

const NotificationManagerBridge: React.FC<{ getConfig: () => PluginConfig }> = ({ getConfig }) => {
  const [cfg, setCfg] = useState<PluginConfig>(getConfig());

  // Poll config every 2s so settings changes are reflected without a reload
  useEffect(() => {
    const id = setInterval(() => setCfg(getConfig()), 2000);
    return () => clearInterval(id);
  }, []);

  return <NotificationManager config={cfg} />;
};
