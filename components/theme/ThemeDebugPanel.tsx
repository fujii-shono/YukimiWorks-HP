'use client';

import { debugControlsEnabled, debugTimeOptions, eventOptions, themeOptions } from '@/data/themeConfig';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

type DebugCounterMilestone = {
  count: number;
  message: string;
  effect?: 'cracker';
};

function triggerDebugCounterMilestone(milestone: DebugCounterMilestone) {
  window.dispatchEvent(
    new CustomEvent('yukimi-counter-debug-milestone', {
      detail: milestone,
    }),
  );
}

export function ThemeDebugPanel() {
  const {
    isDevelopment,
    forcedEvent,
    forcedTheme,
    forcedTime,
    setForcedEvent,
    setForcedTheme,
    setForcedTime,
    triggerDebugSprite,
  } = useTimeTheme();

  if (!isDevelopment || !debugControlsEnabled) return null;

  return (
    <details className="debug-panel">
      <summary>Theme Debug</summary>
      <div className="debug-grid">
        <label>
          時間帯プリセット
          <select
            value={forcedTime}
            onChange={(event) => {
              const nextValue = event.target.value as typeof forcedTime;
              setForcedTime(nextValue);
              if (nextValue !== 'auto') {
                setForcedTheme('auto');
                setForcedEvent('auto');
              }
            }}
          >
            {debugTimeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          テーマ手動上書き
          <select value={forcedTheme} onChange={(event) => setForcedTheme(event.target.value as typeof forcedTheme)}>
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          イベント手動上書き
          <select value={forcedEvent} onChange={(event) => setForcedEvent(event.target.value as typeof forcedEvent)}>
            {eventOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="debug-action-button" onClick={triggerDebugSprite}>
          debug.pngを流す
        </button>
        <button
          type="button"
          className="debug-action-button"
          onClick={() =>
            triggerDebugCounterMilestone({
              count: 10000,
              message: '記念すべき10000番目！めっちゃめでたい！',
              effect: 'cracker',
            })
          }
        >
          キリ番 10000ごと
        </button>
        <button
          type="button"
          className="debug-action-button"
          onClick={() =>
            triggerDebugCounterMilestone({
              count: 1000,
              message: 'あなたは1000番目の訪問者です！おめでとう！',
            })
          }
        >
          キリ番 1000ごと
        </button>
        <button
          type="button"
          className="debug-action-button"
          onClick={() =>
            triggerDebugCounterMilestone({
              count: 1111,
              message: 'なんとゾロ目！すごいね！',
            })
          }
        >
          キリ番 ゾロ目
        </button>
      </div>
    </details>
  );
}
