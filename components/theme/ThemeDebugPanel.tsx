'use client';

import { debugControlsEnabled, debugTimeOptions, eventOptions, themeOptions } from '@/data/themeConfig';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

export function ThemeDebugPanel() {
  const { isDevelopment, forcedEvent, forcedTheme, forcedTime, setForcedEvent, setForcedTheme, setForcedTime } =
    useTimeTheme();

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
      </div>
    </details>
  );
}
