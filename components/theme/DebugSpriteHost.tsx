'use client';

import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import { DebugSprite } from '@/components/ui/DebugSprite';

export function DebugSpriteHost() {
  const { debugSpriteRunId } = useTimeTheme();

  return <DebugSprite runId={debugSpriteRunId} />;
}
