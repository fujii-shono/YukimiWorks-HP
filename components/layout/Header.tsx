'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';

export function Header() {
  const { event, tagline, absent, canPeek, peekActive, triggerPeek, peekImageSrc, showPeekBubble } = useTimeTheme();
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef<number | null>(null);
  const visibleCharacterWidth = dragOffset * 3;
  const DRAG_LIMIT = 100;
  const TRIGGER_THRESHOLD = 50;
  const siteTitle = event === 'sleep-warning' ? 'はやく　寝ろ' : 'YukimiWorks';
  const headerDecorationIcon =
    event === 'lunch' ? '/icons/food/contents.png' : event === 'snack' ? '/icons/sweets/apps.png' : null;

  const resetDrag = () => {
    startXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
  };

  const onDragStart = (event: React.PointerEvent<HTMLButtonElement>) => {
    startXRef.current = event.clientX;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onDragMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (startXRef.current === null) return;
    const distance = Math.max(0, Math.min(DRAG_LIMIT, event.clientX - startXRef.current));
    setDragOffset(distance);
  };

  const onDragEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (startXRef.current !== null && dragOffset >= TRIGGER_THRESHOLD) {
      triggerPeek();
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    resetDrag();
  };

  return (
    <div className="hero-banner-shell">
      {absent && canPeek ? (
        <div className="header-peek-character" aria-hidden="true" style={{ width: `${visibleCharacterWidth}px` }}>
          <Image src={peekImageSrc} alt="" width={111} height={135} className="pixel-image" draggable={false} unoptimized />
        </div>
      ) : null}
      {absent && canPeek ? (
        <button
          type="button"
          className="header-peek-trigger"
          aria-label="左側を引っ張る"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          onPointerCancel={onDragEnd}
          style={{ left: `${dragOffset}px` }}
        >
          <span className="header-peek-grip" aria-hidden="true" />
          {peekActive && showPeekBubble ? (
            <span className="header-peek-bubble" aria-live="polite">
              お取り込み中です！
            </span>
          ) : null}
        </button>
      ) : null}
      <header
        className="hero-banner-frame"
        aria-labelledby="site-title"
        style={{
          marginLeft: `${dragOffset}px`,
          width: `calc(100% - ${dragOffset}px)`,
          gridTemplateColumns: `var(--hero-banner-columns, 118px minmax(0, 1fr) 118px)`,
          transitionDuration: isDragging ? '0ms' : '120ms',
        }}
      >
        <div className="hero-banner-panel hero-banner-panel-left">
          {headerDecorationIcon ? (
            <Image
              src={headerDecorationIcon}
              alt=""
              width={58}
              height={58}
              className="header-snow-icon header-snow-icon-left pixel-image"
              aria-hidden="true"
              draggable={false}
              unoptimized
            />
          ) : (
            <>
              <span className="header-snow header-snow-large header-snow-left" aria-hidden="true">
                ❄
              </span>
              <span className="header-snow header-snow-small header-snow-left-small" aria-hidden="true">
                ❄
              </span>
            </>
          )}
        </div>
        <div className="hero-banner-panel hero-banner-panel-center">
          <Link href="/" className="hero-link" aria-label="YukimiWorks トップページへ移動">
            <h1 id="site-title">{siteTitle}</h1>
            <p className="tagline">{tagline}</p>
          </Link>
          <div className="dotted-rule" aria-hidden="true" />
        </div>
        <div className="hero-banner-panel hero-banner-panel-right">
          {headerDecorationIcon ? (
            <Image
              src={headerDecorationIcon}
              alt=""
              width={58}
              height={58}
              className="header-snow-icon header-snow-icon-right pixel-image"
              aria-hidden="true"
              draggable={false}
              unoptimized
            />
          ) : (
            <>
              <span className="header-snow header-snow-large header-snow-right" aria-hidden="true">
                ❄
              </span>
              <span className="header-snow header-snow-small header-snow-right-small" aria-hidden="true">
                ❄
              </span>
            </>
          )}
        </div>
      </header>
    </div>
  );
}
