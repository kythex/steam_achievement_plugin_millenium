import React, { useEffect, useRef, useState } from 'react';
import { AchievementData, PluginConfig } from './types';

// ─── CSS keyframes injected once into the document head ────────────────────────

const STYLE_ID = 'xbox360-achievements-styles';

function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @keyframes xba-slide-in {
      from { transform: translateX(calc(100% + 32px)); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    @keyframes xba-slide-out {
      from { transform: translateX(0); opacity: 1; }
      to   { transform: translateX(calc(100% + 32px)); opacity: 0; }
    }
    @keyframes xba-slide-in-center {
      from { transform: translateX(-50%) translateY(120px); opacity: 0; }
      to   { transform: translateX(-50%) translateY(0); opacity: 1; }
    }
    @keyframes xba-slide-out-center {
      from { transform: translateX(-50%) translateY(0); opacity: 1; }
      to   { transform: translateX(-50%) translateY(120px); opacity: 0; }
    }
    @keyframes xba-slide-in-left {
      from { transform: translateX(calc(-100% - 32px)); opacity: 0; }
      to   { transform: translateX(0); opacity: 1; }
    }
    @keyframes xba-slide-out-left {
      from { transform: translateX(0); opacity: 1; }
      to   { transform: translateX(calc(-100% - 32px)); opacity: 0; }
    }
    @keyframes xba-glow-pulse {
      0%, 100% { box-shadow: 0 0 12px 2px rgba(82, 176, 67, 0.4), 0 4px 24px rgba(0,0,0,0.6); }
      50%       { box-shadow: 0 0 24px 6px rgba(82, 176, 67, 0.7), 0 4px 24px rgba(0,0,0,0.6); }
    }
    @keyframes xba-icon-bounce {
      0%   { transform: scale(0.5) rotate(-15deg); opacity: 0; }
      60%  { transform: scale(1.1) rotate(4deg); opacity: 1; }
      80%  { transform: scale(0.95) rotate(-2deg); }
      100% { transform: scale(1) rotate(0deg); opacity: 1; }
    }
    @keyframes xba-progress {
      from { width: 100%; }
      to   { width: 0%; }
    }
    @keyframes xba-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }

    /* Modern theme overrides */
    .xba-theme-modern .xba-header { background: linear-gradient(90deg, #1a73e8, #0d47a1); }
    .xba-theme-modern .xba-border { border-color: #1a73e8; box-shadow: 0 0 16px rgba(26,115,232,0.5); }
    .xba-theme-modern .xba-label  { color: #82b4ff; }
    .xba-theme-modern .xba-score  { background: #1a73e8; }
    .xba-theme-modern .xba-progress-bar { background: #1a73e8; }

    /* Minimal theme overrides */
    .xba-theme-minimal .xba-header { background: rgba(30,30,30,0.95); border-bottom: 1px solid #444; }
    .xba-theme-minimal .xba-border { border-color: #555; box-shadow: 0 2px 12px rgba(0,0,0,0.8); }
    .xba-theme-minimal .xba-label  { color: #aaa; }
    .xba-theme-minimal .xba-score  { background: #444; }
    .xba-theme-minimal .xba-progress-bar { background: #666; }
  `;
  document.head.appendChild(style);
}

// ─── Position helpers ──────────────────────────────────────────────────────────

function getPositionStyle(
  position: PluginConfig['position'],
  exiting: boolean
): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'fixed',
    zIndex: 99999,
    bottom: '24px',
    pointerEvents: 'auto',
  };

  const animIn = {
    'bottom-right':  'xba-slide-in',
    'bottom-center': 'xba-slide-in-center',
    'bottom-left':   'xba-slide-in-left',
  }[position];

  const animOut = {
    'bottom-right':  'xba-slide-out',
    'bottom-center': 'xba-slide-out-center',
    'bottom-left':   'xba-slide-out-left',
  }[position];

  const animation = `${exiting ? animOut : animIn} 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards`;

  if (position === 'bottom-right') return { ...base, right: '24px', animation };
  if (position === 'bottom-left')  return { ...base, left: '24px', animation };
  return { ...base, left: '50%', transform: 'translateX(-50%)', animation };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const TrophyIcon: React.FC<{ size?: number }> = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ flexShrink: 0 }}
  >
    <path
      d="M12 2C8.13 2 5 5.13 5 9c0 2.61 1.34 4.91 3.36 6.24L8 17h8l-.36-1.76C17.66 13.91 19 11.61 19 9c0-3.87-3.13-7-7-7z"
      fill="#FFD700"
    />
    <path d="M8 2H5v5c0 1.66 1.34 3 3 3V2z" fill="#FFD700" opacity="0.6" />
    <path d="M16 2h3v5c0 1.66-1.34 3-3 3V2z" fill="#FFD700" opacity="0.6" />
    <path d="M9 17v2h6v-2H9z" fill="#B8860B" />
    <path d="M7 19h10v2H7v-2z" fill="#B8860B" />
  </svg>
);

// ─── Main notification component ───────────────────────────────────────────────

interface NotificationProps {
  achievement: AchievementData;
  config: PluginConfig;
  onDismiss: () => void;
}

export const AchievementNotification: React.FC<NotificationProps> = ({
  achievement,
  config,
  onDismiss,
}) => {
  const [exiting, setExiting] = useState(false);
  const [iconError, setIconError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onDismiss, 450);
  };

  useEffect(() => {
    timerRef.current = setTimeout(dismiss, config.duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [config.duration]);

  const themeClass = `xba-theme-${config.theme}`;

  return (
    <div
      className={themeClass}
      style={getPositionStyle(config.position, exiting)}
      onClick={dismiss}
    >
      {/* Outer border glow container */}
      <div
        className="xba-border"
        style={{
          width: '340px',
          borderRadius: '6px',
          border: '1px solid #52b043',
          boxShadow: '0 0 14px 3px rgba(82,176,67,0.45), 0 6px 32px rgba(0,0,0,0.75)',
          overflow: 'hidden',
          cursor: 'pointer',
          userSelect: 'none',
          animation: !exiting ? 'xba-glow-pulse 2s ease-in-out 0.5s infinite' : 'none',
          background: 'rgba(10,10,10,0.96)',
        }}
      >
        {/* Header bar */}
        <div
          className="xba-header"
          style={{
            background: 'linear-gradient(90deg, #107C10 0%, #1a9f1a 60%, #0d5e0d 100%)',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          {/* Xbox-style circle logo */}
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)',
              border: '1.5px solid rgba(255,255,255,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="10" height="10" viewBox="0 0 10 10">
              <circle cx="5" cy="5" r="4" fill="none" stroke="white" strokeWidth="1.5" />
              <circle cx="5" cy="5" r="1.5" fill="white" />
            </svg>
          </div>
          <span
            className="xba-label"
            style={{
              color: '#b9f0b2',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontFamily: 'sans-serif',
            }}
          >
            Achievement Unlocked
          </span>
        </div>

        {/* Body */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            padding: '12px 14px',
          }}
        >
          {/* Achievement icon */}
          <div
            style={{
              width: '56px',
              height: '56px',
              flexShrink: 0,
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1.5px solid rgba(82,176,67,0.5)',
              animation: 'xba-icon-bounce 0.6s cubic-bezier(0.22,1,0.36,1) 0.3s both',
              background: 'rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {achievement.strIconURL && !iconError ? (
              <img
                src={achievement.strIconURL}
                alt=""
                width={56}
                height={56}
                style={{ objectFit: 'cover', display: 'block' }}
                onError={() => setIconError(true)}
              />
            ) : (
              <TrophyIcon size={40} />
            )}
          </div>

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 700,
                lineHeight: 1.3,
                fontFamily: 'sans-serif',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {achievement.strName}
            </div>
            {config.showDescription && achievement.strDescription && (
              <div
                style={{
                  color: '#9e9e9e',
                  fontSize: '11px',
                  marginTop: '3px',
                  lineHeight: 1.4,
                  fontFamily: 'sans-serif',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {achievement.strDescription}
              </div>
            )}
            {achievement.flAchieved !== undefined && achievement.flAchieved > 0 && (
              <div
                style={{
                  color: '#5c9e58',
                  fontSize: '10px',
                  marginTop: '4px',
                  fontFamily: 'sans-serif',
                }}
              >
                {achievement.flAchieved.toFixed(1)}% of players unlocked this
              </div>
            )}
          </div>

          {/* Gamerscore badge */}
          {config.showGamerScore && achievement.nGamerScore !== undefined && achievement.nGamerScore > 0 && (
            <div
              className="xba-score"
              style={{
                background: '#107C10',
                borderRadius: '4px',
                padding: '5px 8px',
                textAlign: 'center',
                flexShrink: 0,
                minWidth: '40px',
              }}
            >
              <div style={{ color: '#FFD700', fontSize: '13px', fontWeight: 700, fontFamily: 'sans-serif' }}>
                {achievement.nGamerScore}
              </div>
              <div style={{ color: '#b9f0b2', fontSize: '9px', fontWeight: 600, fontFamily: 'sans-serif' }}>
                GS
              </div>
            </div>
          )}
        </div>

        {/* Auto-dismiss progress bar */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="xba-progress-bar"
            style={{
              height: '100%',
              background: '#52b043',
              animation: !exiting
                ? `xba-progress ${config.duration}ms linear forwards`
                : 'none',
              width: exiting ? '0%' : undefined,
            }}
          />
        </div>
      </div>
    </div>
  );
};

// ─── Notification queue manager ────────────────────────────────────────────────

interface QueuedAchievement {
  id: string;
  data: AchievementData;
}

interface NotificationManagerProps {
  config: PluginConfig;
}

export const NotificationManager: React.FC<NotificationManagerProps> = ({ config }) => {
  const [queue, setQueue] = useState<QueuedAchievement[]>([]);

  // Expose a method so the plugin entry point can enqueue achievements
  useEffect(() => {
    (window as any).__xba_enqueue = (achievement: AchievementData) => {
      setQueue((prev) => [
        ...prev,
        { id: `${Date.now()}-${Math.random()}`, data: achievement },
      ]);
    };
    return () => { delete (window as any).__xba_enqueue; };
  }, []);

  const dismiss = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  // Show up to 3 notifications stacked, newest on top
  return (
    <>
      {queue.slice(-3).map((item, i) => (
        <div
          key={item.id}
          style={{
            position: 'fixed',
            bottom: `${24 + i * 110}px`,
            right: config.position === 'bottom-right' ? '24px' : undefined,
            left:
              config.position === 'bottom-left'
                ? '24px'
                : config.position === 'bottom-center'
                ? '50%'
                : undefined,
            transform: config.position === 'bottom-center' ? 'translateX(-50%)' : undefined,
            zIndex: 99999 + i,
            pointerEvents: 'auto',
          }}
        >
          <AchievementNotification
            achievement={item.data}
            config={config}
            onDismiss={() => dismiss(item.id)}
          />
        </div>
      ))}
    </>
  );
};

export { injectStyles };
