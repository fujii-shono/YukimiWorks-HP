'use client';

import { eventOptions, themeOptions } from '@/data/themeConfig';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

export function ThemeDebugPanel() {
  const { isDevelopment, forcedEvent, forcedTheme, setForcedEvent, setForcedTheme } = useTimeTheme();

  if (!isDevelopment) return null;

  return (
    <details className="debug-panel">
      <summary>Theme Debug</summary>
      <div className="debug-grid">
        <label>
          時間帯テーマ
          <select value={forcedTheme} onChange={(event) => setForcedTheme(event.target.value as typeof forcedTheme)}>
            {themeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          イベント
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
