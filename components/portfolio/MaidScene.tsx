'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent } from 'react';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

const WIND_SRC = '/portfolio/maid/wing.png';
const STAR_SRC = '/portfolio/maid/star.png';
const BASE_SRC = '/portfolio/maid/base.png';
const EYE_HIGHLIGHT_SRC = '/portfolio/maid/eye-highlight.png';
const EYE_SRC = '/portfolio/maid/eye.png';
const EYE_HOLE_SRC = '/portfolio/maid/eye-hole.png';
const FIGURE_WIDTH = 669;
const FIGURE_HEIGHT = 1000;
const WIND_IMAGE_WIDTH = 669;
const WIND_IMAGE_HEIGHT = 775;
const STAR_IMAGE_WIDTH = 214;
const STAR_IMAGE_HEIGHT = 225;
const STAR_CURSOR_SIZE = 48;
const STAR_CURSOR_HOTSPOT = 18;

const WIND_POSITION = {
  right: 0.74,
  top: 0.49,
  width: 0.4,
} as const;

const WIND_HIT_AREA = {
  left: 0,
  top: 0.54,
  width: 0.26,
  height: 0.2,
} as const;

const STAR_ITEMS = [
  { id: 'top-right', left: 0.81, top: 0.05, width: 0.075, rotation: 18 },
  { id: 'middle-left', left: 0.04, top: 0.44, width: 0.105, rotation: -16 },
  { id: 'middle-right', left: 0.89, top: 0.35, width: 0.095, rotation: 32 },
] as const;

const WIND_DRAG_MAX_ROTATION = 10;
const WIND_DRAG_ROTATION_PER_PIXEL = 0.1;
const WIND_RELEASE_MIN_DRAG_ROTATION = 0.5;
const WIND_RELEASE_FORWARD_ROTATION = 2;
const WIND_RELEASE_BACK_ROTATION = -1.4;
const WIND_RELEASE_DURATION_MS = 1300;
const WIND_RESUME_DELAY_MS = 900;
const SHOW_WIND_HIT_AREA = false;
const DOT_COLOR = 'rgb(206, 206, 206)';
const DOT_POSITION_RATIO = 0.00747;
const DOT_RADIUS_RATIO = 0.00478;
const DOT_OFFSET_RATIO = 0.03886;
const DOT_STEP_RATIO = 0.05829;
const DOT_DRIFT_DURATION_MS = 8000;
const EYE_FOLLOW_RANGE = {
  left: -6,
  right: 6,
  top: -5,
  bottom: 10,
} as const;
const EYE_OUTSIDE_FOLLOW_RANGE = {
  top: -5,
  bottom: 2,
} as const;
const EYE_FOLLOW_RESET_DELAY_MS = 900;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function MaidScene({ variant }: { variant: PortfolioMediaVariant }) {
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 });
  const [starCursorUrl, setStarCursorUrl] = useState('');
  const [eyeOutsideActive, setEyeOutsideActive] = useState(false);
  const [windDragging, setWindDragging] = useState(false);
  const [windReleasing, setWindReleasing] = useState(false);
  const [windDragRotation, setWindDragRotation] = useState(0);
  const [windReleaseRotation, setWindReleaseRotation] = useState(0);
  const frameRef = useRef<HTMLDivElement>(null);
  const dotCanvasRef = useRef<HTMLCanvasElement>(null);
  const eyeResetTimeoutRef = useRef<number | null>(null);
  const windDraggingRef = useRef(false);
  const windDragStartYRef = useRef(0);
  const windDragRotationRef = useRef(0);
  const windReleaseTimeoutRef = useRef<number | null>(null);
  const eyeFollowLockedRef = useRef(false);
  const [canvasSize, setCanvasSize] = useState({ width: FIGURE_WIDTH, height: FIGURE_HEIGHT, dpr: 1 });

  useEffect(() => {
    const frameElement = frameRef.current;
    if (!frameElement) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const nextWidth = entry.contentRect.width;
      const nextHeight = entry.contentRect.height;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

      if (nextWidth <= 0 || nextHeight <= 0) return;

      setCanvasSize((current) => {
        if (
          Math.abs(current.width - nextWidth) < 0.5 &&
          Math.abs(current.height - nextHeight) < 0.5 &&
          current.dpr === nextDpr
        ) {
          return current;
        }

        return { width: nextWidth, height: nextHeight, dpr: nextDpr };
      });
    });

    resizeObserver.observe(frameElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (eyeResetTimeoutRef.current !== null) {
        window.clearTimeout(eyeResetTimeoutRef.current);
      }

      if (windReleaseTimeoutRef.current !== null) {
        window.clearTimeout(windReleaseTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!starCursorUrl) return;

    document.body.dataset.maidStarCursor = 'true';
    document.body.style.setProperty('--maid-star-cursor', `url("${starCursorUrl}") ${STAR_CURSOR_HOTSPOT} ${STAR_CURSOR_HOTSPOT}, auto`);

    return () => {
      delete document.body.dataset.maidStarCursor;
      document.body.style.removeProperty('--maid-star-cursor');
    };
  }, [starCursorUrl]);

  useEffect(() => {
    const canvas = dotCanvasRef.current;
    if (!canvas) return;

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    const context = canvas.getContext('2d');
    if (!context) return;

    const scale = canvasSize.width / FIGURE_WIDTH;
    const dotPosition = FIGURE_WIDTH * DOT_POSITION_RATIO * scale * canvasSize.dpr;
    const dotRadius = FIGURE_WIDTH * DOT_RADIUS_RATIO * scale * canvasSize.dpr;
    const dotOffset = FIGURE_WIDTH * DOT_OFFSET_RATIO * scale * canvasSize.dpr;
    const dotStep = FIGURE_WIDTH * DOT_STEP_RATIO * scale * canvasSize.dpr;
    let animationFrame = 0;

    const drawDot = (x: number, y: number) => {
      context.beginPath();
      context.arc(x, y, dotRadius, 0, Math.PI * 2);
      context.fill();
    };

    const render = (timestamp: number) => {
      const progress = (timestamp % DOT_DRIFT_DURATION_MS) / DOT_DRIFT_DURATION_MS;
      const drift = dotStep * progress;

      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.fillStyle = DOT_COLOR;

      for (let y = -dotStep + drift; y < pixelHeight + dotStep; y += dotStep) {
        for (let x = -dotStep + drift; x < pixelWidth + dotStep; x += dotStep) {
          drawDot(x + dotPosition, y + dotPosition);
          drawDot(x + dotOffset, y + dotOffset);
        }
      }

      animationFrame = window.requestAnimationFrame(render);
    };

    animationFrame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [canvasSize.dpr, canvasSize.height, canvasSize.width]);

  const getEyeOffset = useCallback((normalizedX: number, normalizedY: number) => {
    const nextX = normalizedX >= 0 ? normalizedX * EYE_FOLLOW_RANGE.right : normalizedX * Math.abs(EYE_FOLLOW_RANGE.left);
    const nextY = normalizedY >= 0 ? normalizedY * EYE_FOLLOW_RANGE.bottom : normalizedY * Math.abs(EYE_FOLLOW_RANGE.top);

    return { x: nextX, y: nextY };
  }, []);

  const getOutsideEyeOffset = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return { x: 0, y: 0 };

    const rect = frame.getBoundingClientRect();
    if (rect.height <= 0) return { x: 0, y: 0 };

    const viewportCenterY = window.innerHeight / 2;
    const frameCenterY = rect.top + rect.height / 2;
    const normalizedY = clamp((viewportCenterY - frameCenterY) / (rect.height / 2), -1, 1);

    const y = normalizedY >= 0
      ? normalizedY * EYE_OUTSIDE_FOLLOW_RANGE.bottom
      : normalizedY * Math.abs(EYE_OUTSIDE_FOLLOW_RANGE.top);

    return { x: 0, y };
  }, []);

  useEffect(() => {
    if (!eyeOutsideActive) return;

    const updateOutsideEyeFollow = () => {
      setEyeOffset(getOutsideEyeOffset());
    };

    updateOutsideEyeFollow();
    window.addEventListener('scroll', updateOutsideEyeFollow, { passive: true });
    window.addEventListener('resize', updateOutsideEyeFollow);

    return () => {
      window.removeEventListener('scroll', updateOutsideEyeFollow);
      window.removeEventListener('resize', updateOutsideEyeFollow);
    };
  }, [eyeOutsideActive, getOutsideEyeOffset]);

  const updateEyeFollow = (event: PointerEvent<HTMLElement>) => {
    if (eyeFollowLockedRef.current) return;

    if (eyeResetTimeoutRef.current !== null) {
      window.clearTimeout(eyeResetTimeoutRef.current);
      eyeResetTimeoutRef.current = null;
    }

    setEyeOutsideActive(false);

    const frame = frameRef.current;
    if (!frame) return;

    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const normalizedX = clamp((event.clientX - centerX) / (rect.width / 2), -1, 1);
    const normalizedY = clamp((event.clientY - centerY) / (rect.height / 2), -1, 1);

    setEyeOffset(getEyeOffset(normalizedX, normalizedY));
  };

  const scheduleEyeFollowReset = () => {
    if (eyeFollowLockedRef.current) return;

    if (eyeResetTimeoutRef.current !== null) {
      window.clearTimeout(eyeResetTimeoutRef.current);
    }

    eyeResetTimeoutRef.current = window.setTimeout(() => {
      setEyeOutsideActive(true);
      setEyeOffset(getOutsideEyeOffset());
      eyeResetTimeoutRef.current = null;
    }, EYE_FOLLOW_RESET_DELAY_MS);
  };

  const handleWindPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (eyeResetTimeoutRef.current !== null) {
      window.clearTimeout(eyeResetTimeoutRef.current);
      eyeResetTimeoutRef.current = null;
    }

    if (windReleaseTimeoutRef.current !== null) {
      window.clearTimeout(windReleaseTimeoutRef.current);
      windReleaseTimeoutRef.current = null;
    }

    windDragStartYRef.current = event.clientY;
    windDragRotationRef.current = 0;
    windDraggingRef.current = true;
    eyeFollowLockedRef.current = true;
    setWindDragging(true);
    setWindReleasing(false);
    setWindDragRotation(0);
    setWindReleaseRotation(0);
    setEyeOutsideActive(false);
    setEyeOffset((current) => ({ x: 0, y: current.y }));
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWindPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!windDraggingRef.current) return;

    const deltaY = event.clientY - windDragStartYRef.current;
    const nextRotation = clamp(deltaY * -WIND_DRAG_ROTATION_PER_PIXEL, -WIND_DRAG_MAX_ROTATION, WIND_DRAG_MAX_ROTATION);
    const frame = frameRef.current;
    const rect = frame?.getBoundingClientRect();
    const normalizedY = rect && rect.height > 0
      ? clamp((event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2), -1, 1)
      : 0;
    const nextEyeY = getEyeOffset(0, normalizedY).y;
    windDragRotationRef.current = nextRotation;
    setWindDragRotation(nextRotation);
    setEyeOutsideActive(false);
    setEyeOffset({ x: 0, y: nextEyeY });
  };

  const handleWindPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!windDraggingRef.current) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const draggedRotation = windDragRotationRef.current;
    const releaseRotation = Math.abs(draggedRotation) < WIND_RELEASE_MIN_DRAG_ROTATION
      ? 0
      : draggedRotation > 0
        ? WIND_RELEASE_BACK_ROTATION
        : WIND_RELEASE_FORWARD_ROTATION;

    windDraggingRef.current = false;
    setWindDragging(false);
    setWindReleasing(releaseRotation !== 0);
    setWindReleaseRotation(releaseRotation);

    if (releaseRotation !== 0) {
      windReleaseTimeoutRef.current = window.setTimeout(() => {
        setWindReleasing(false);
        setWindReleaseRotation(0);
        setEyeOffset({ x: 0, y: 0 });
        eyeFollowLockedRef.current = false;
        windReleaseTimeoutRef.current = null;
      }, WIND_RELEASE_DURATION_MS + WIND_RESUME_DELAY_MS);
    } else {
      windReleaseTimeoutRef.current = window.setTimeout(() => {
        setEyeOffset({ x: 0, y: 0 });
        eyeFollowLockedRef.current = false;
        windReleaseTimeoutRef.current = null;
      }, WIND_RESUME_DELAY_MS);
    }

    windDragRotationRef.current = 0;
    setWindDragRotation(0);
  };

  const handleTopRightStarClick = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const image = document.createElement('img');
    image.src = STAR_SRC;

    if (image.decode) {
      await image.decode();
    } else {
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
      });
    }

    const canvas = document.createElement('canvas');
    const aspectRatio = STAR_IMAGE_HEIGHT / STAR_IMAGE_WIDTH;
    canvas.width = STAR_CURSOR_SIZE;
    canvas.height = Math.round(STAR_CURSOR_SIZE * aspectRatio);

    const context = canvas.getContext('2d');
    if (!context) return;

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    setStarCursorUrl(canvas.toDataURL('image/png'));
  };

  const windStyle = {
    right: `${WIND_POSITION.right * 100}%`,
    top: `${WIND_POSITION.top * 100}%`,
    width: `${WIND_POSITION.width * 100}%`,
  } as CSSProperties;
  const windImageStyle = {
    '--maid-wind-drag-rotation': `${windDragRotation}deg`,
    '--maid-wind-release-rotation': `${windReleaseRotation}deg`,
    '--maid-wind-release-return-rotation': `${windReleaseRotation * -0.35}deg`,
    '--maid-wind-release-duration': `${WIND_RELEASE_DURATION_MS}ms`,
  } as CSSProperties;
  const eyeStyle = {
    '--maid-eye-follow-x': `${(eyeOffset.x / FIGURE_WIDTH) * 100}cqw`,
    '--maid-eye-follow-y': `${(eyeOffset.y / FIGURE_WIDTH) * 100}cqw`,
  } as CSSProperties;

  return (
    <div className={cn('maid-scene', `maid-scene-${variant}`)}>
      <div className="maid-asset-stage">
        <div
          ref={frameRef}
          className="maid-asset-frame"
          onPointerDown={updateEyeFollow}
          onPointerMove={updateEyeFollow}
          onPointerLeave={scheduleEyeFollowReset}
          onPointerCancel={scheduleEyeFollowReset}
        >
          <canvas ref={dotCanvasRef} className="maid-dot-canvas" aria-hidden="true" />
          <div className={cn('maid-wind-shell', (windDragging || windReleasing) && 'is-paused')} style={windStyle}>
            <Image
              className={cn('maid-wind', windReleaseRotation !== 0 && 'is-releasing')}
              src={WIND_SRC}
              alt=""
              width={WIND_IMAGE_WIDTH}
              height={WIND_IMAGE_HEIGHT}
              style={windImageStyle}
              draggable={false}
              priority={variant === 'modal'}
              aria-hidden="true"
              unoptimized
            />
          </div>
          <button
            type="button"
            className={cn('maid-wind-hit-area', SHOW_WIND_HIT_AREA && 'is-visible')}
            style={{
              left: `${WIND_HIT_AREA.left * 100}%`,
              top: `${WIND_HIT_AREA.top * 100}%`,
              width: `${WIND_HIT_AREA.width * 100}%`,
              height: `${WIND_HIT_AREA.height * 100}%`,
            }}
            onPointerDown={handleWindPointerDown}
            onPointerMove={handleWindPointerMove}
            onPointerUp={handleWindPointerEnd}
            onPointerCancel={handleWindPointerEnd}
            onLostPointerCapture={handleWindPointerEnd}
            aria-label="風のレイヤーを動かす"
          />
          {STAR_ITEMS.map((star) => (
            <div key={star.id}>
              <Image
                className="maid-star"
                src={STAR_SRC}
                alt=""
                width={STAR_IMAGE_WIDTH}
                height={STAR_IMAGE_HEIGHT}
                style={{
                  left: `${star.left * 100}%`,
                  top: `${star.top * 100}%`,
                  width: `${star.width * 100}%`,
                  '--maid-star-rotation': `${star.rotation}deg`,
                } as CSSProperties}
                draggable={false}
                aria-hidden="true"
                unoptimized
              />
              {star.id === 'top-right' && (
                <button
                  type="button"
                  className="maid-star-trigger"
                  style={{
                    left: `${star.left * 100}%`,
                    top: `${star.top * 100}%`,
                    width: `${star.width * 100}%`,
                  }}
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={handleTopRightStarClick}
                  aria-label="星のカーソルにする"
                />
              )}
            </div>
          ))}
          <Image className="maid-layer maid-eye-hole" src={EYE_HOLE_SRC} alt="" width={FIGURE_WIDTH} height={FIGURE_HEIGHT} aria-hidden="true" unoptimized />
          <Image
            className="maid-layer maid-eye"
            src={EYE_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            style={eyeStyle}
            aria-hidden="true"
            unoptimized
          />
          <Image
            className="maid-layer maid-eye-highlight"
            src={EYE_HIGHLIGHT_SRC}
            alt=""
            width={1827}
            height={2732}
            aria-hidden="true"
            unoptimized
          />
          <Image className="maid-layer maid-base" src={BASE_SRC} alt="メイドさんのHTMLアート" width={FIGURE_WIDTH} height={FIGURE_HEIGHT} unoptimized />
        </div>
      </div>
    </div>
  );
}
