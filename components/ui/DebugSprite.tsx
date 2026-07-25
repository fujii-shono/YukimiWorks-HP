'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

type DebugSpriteProps = {
  runId: number;
};

export function DebugSprite({ runId }: DebugSpriteProps) {
  const [visibleRunId, setVisibleRunId] = useState(0);

  useEffect(() => {
    if (runId === 0) return;

    setVisibleRunId(runId);
    const timeoutId = window.setTimeout(() => {
      setVisibleRunId((currentRunId) => (currentRunId === runId ? 0 : currentRunId));
    }, 3300);

    return () => window.clearTimeout(timeoutId);
  }, [runId]);

  if (visibleRunId === 0) return null;

  return (
    <Image
      key={visibleRunId}
      src="/character/debug.png"
      alt=""
      aria-hidden="true"
      width={192}
      height={192}
      unoptimized
      className="debug-sprite"
    />
  );
}
