'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

type KokoroSceneProps = {
  variant: PortfolioMediaVariant;
};

const FIGURE_WIDTH = 629;
const FIGURE_HEIGHT = 1000;
const BACKGROUND_SRC = '/portfolio/kokoro/bg.png';
const WING_SRC = '/portfolio/kokoro/wing.png';
const BASE_SRC = '/portfolio/kokoro/base.png';
const EYE_DEFAULT_SRC = '/portfolio/kokoro/eye1.png';
const EYE_ACTIVE_SRC = '/portfolio/kokoro/eye2.png';
const MOUTH_DEFAULT_SRC = '/portfolio/kokoro/mouth1.png';
const MOUTH_ACTIVE_SRC = '/portfolio/kokoro/mouth2.png';
const STAR_COLOR = 'rgb(174, 188, 244)';
const DOT_COLOR = '#ffffff';
const EYE_INITIAL_HOLD_MS = 900;
const EYE_BLINK_INTERVAL_MS = 100;
const EYE_FINAL_HOLD_MS = 2000;
const MOUTH_ACTIVE_MS = 8000;
const WING_EYE_REACTION_MS = 2000;
const WING_EYE_REACTION_UNLOCK_COUNT = 3;
const WING_EYE_REACTION_RANDOM_RATE = 0.3;
const FACE_DRAG_MOUTH_REQUIRED_MS = 900;
const FACE_DRAG_MOUTH_RESET_DELAY_MS = 2000;

const WING_POSITION = {
  left: 0.75,
  top: 0.16,
  width: 0.23,
} as const;

const WING_IMAGE_WIDTH = 368;
const WING_IMAGE_HEIGHT = 639;
const WING_HIT_AREA_HEIGHT = (WING_POSITION.width * FIGURE_WIDTH * WING_IMAGE_HEIGHT) / WING_IMAGE_WIDTH / FIGURE_HEIGHT;
const WING_DRAG_MAX_ROTATION = 12;
const WING_DRAG_ROTATION_PER_PIXEL = 0.12;
const WING_RELEASE_MIN_DRAG_ROTATION = 0.5;
const WING_RELEASE_FORWARD_ROTATION = 2.5;
const WING_RELEASE_BACK_ROTATION = -1.6;
const WING_RELEASE_DURATION_MS = 1300;
const WING_RESUME_DELAY_MS = 1500;

const FACE_HIT_AREA = {
  left: 0.14,
  top: 0.17,
  width: 0.5,
  height: 0.25,
} as const;

const SHOW_FACE_HIT_AREA = false;

type TwinkleShape = 'cross' | 'dot';

type TwinkleDefinition = {
  id: string;
  x: number;
  y: number;
  size: number;
  start: number;
  duration: number;
  durationJitter: number;
  maxOpacity: number;
  shape: TwinkleShape;
};

type TwinkleRuntime = TwinkleDefinition & {
  runtimeDuration: number;
};

const DOT_DRIFT_DISTANCE_X = -0.06;
const DOT_DRIFT_DISTANCE_Y = 0.035;
const DOT_DRIFT_SPEED = 0.015;
const DOT_WRAP_MARGIN = 0.08;
const CLICK_SPARKLE_COLOR = '#ffffff';
const CLICK_SPARKLE_MAX_COUNT = 42;
const CLICK_SPARKLE_MIN_BURST = 2;
const CLICK_SPARKLE_MAX_BURST = 4;
const CLICK_SPARKLE_HOLD_INTERVAL_MS = 120;
const CLICK_SPARKLE_TRAIL_STEP = 0.045;
const CLICK_SPARKLE_TRAIL_MAX_POINTS = 5;
const CLICK_SPARKLE_TOUCH_SIZE_MULTIPLIER = 1.55;

type ClickSparkle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  bornAt: number;
  lifespan: number;
};

type SparklePointer = {
  x: number;
  y: number;
  sizeMultiplier: number;
};

function twinkle(definition: TwinkleDefinition) {
  return definition;
}

const KOKORO_TWINKLES = [
  twinkle({ id: 'kokoro-star-01', x: 0.1, y: 0.08, size: 40, start: 0.2, duration: 4, durationJitter: 0.28, maxOpacity: 0.92, shape: 'cross' }),
  twinkle({ id: 'kokoro-star-02', x: 0.75, y: 0.12, size: 26, start: 1.6, duration: 4, durationJitter: 0.28, maxOpacity: 0.84, shape: 'cross' }),
  twinkle({ id: 'kokoro-star-03', x: 0.66, y: 0.16, size: 29, start: 1.3, duration: 4, durationJitter: 0.28, maxOpacity: 0.84, shape: 'cross' }),
  twinkle({ id: 'kokoro-star-04', x: 0.16, y: 0.92, size: 32, start: 0.9, duration: 4, durationJitter: 0.28, maxOpacity: 0.88, shape: 'cross' }),
  twinkle({ id: 'kokoro-dot-01', x: 0.16, y: 0.11, size: 1, start: 0.5, duration: 6.2, durationJitter: 0.55, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-02', x: 0.23, y: 0.08, size: 1, start: 1.1, duration: 6.8, durationJitter: 0.5, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-03', x: 0.37, y: 0.14, size: 1, start: 0.3, duration: 6.5, durationJitter: 0.48, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-04', x: 0.48, y: 0.09, size: 1, start: 1.7, duration: 7.1, durationJitter: 0.52, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-05', x: 0.62, y: 0.07, size: 1, start: 0.8, duration: 6.4, durationJitter: 0.46, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-06', x: 0.79, y: 0.16, size: 1, start: 1.4, duration: 6.9, durationJitter: 0.5, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-07', x: 0.87, y: 0.24, size: 1, start: 0.1, duration: 6.7, durationJitter: 0.42, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-08', x: 0.12, y: 0.56, size: 1, start: 1.9, duration: 7.3, durationJitter: 0.56, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-09', x: 0.24, y: 0.69, size: 1, start: 0.7, duration: 6.6, durationJitter: 0.47, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-10', x: 0.68, y: 0.79, size: 1, start: 1.2, duration: 7, durationJitter: 0.53, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-11', x: 0.81, y: 0.88, size: 1, start: 0.4, duration: 6.3, durationJitter: 0.44, maxOpacity: 1, shape: 'dot' }),
  twinkle({ id: 'kokoro-dot-12', x: 0.56, y: 0.93, size: 1, start: 1.6, duration: 7.2, durationJitter: 0.58, maxOpacity: 1, shape: 'dot' }),
] as const;

function createSeededRandom(seedSource: string) {
  let seed = 2166136261;

  for (let index = 0; index < seedSource.length; index += 1) {
    seed ^= seedSource.charCodeAt(index);
    seed = Math.imul(seed, 16777619);
  }

  return () => {
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507);
    seed = Math.imul(seed ^ (seed >>> 13), 3266489909);
    seed ^= seed >>> 16;
    return (seed >>> 0) / 4294967295;
  };
}

function randomInRange(random: () => number, min: number, max: number) {
  return min + (max - min) * random();
}

function withRuntimeDuration(twinkleDefinition: TwinkleDefinition): TwinkleRuntime {
  const random = createSeededRandom(twinkleDefinition.id);
  const runtimeDuration = Math.max(0.6, twinkleDefinition.duration + randomInRange(random, -twinkleDefinition.durationJitter, twinkleDefinition.durationJitter));

  return {
    ...twinkleDefinition,
    runtimeDuration,
  };
}

function getTwinkleOpacity(twinkleDefinition: TwinkleRuntime, timeSeconds: number) {
  const fadeIn = 0.16;
  const hold = 0.22;
  const fadeOut = 0.18;
  const hidden = Math.max(0, 1 - fadeIn - hold - fadeOut);
  const progress = ((timeSeconds + twinkleDefinition.start) % twinkleDefinition.runtimeDuration) / twinkleDefinition.runtimeDuration;

  if (progress < hidden) {
    return 0;
  }

  const visibleProgress = progress - hidden;

  if (visibleProgress < fadeIn) {
    return twinkleDefinition.maxOpacity * (visibleProgress / fadeIn);
  }

  if (visibleProgress < fadeIn + hold) {
    return twinkleDefinition.maxOpacity;
  }

  const fadeOutProgress = (visibleProgress - fadeIn - hold) / fadeOut;
  return twinkleDefinition.maxOpacity * (1 - fadeOutProgress);
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const thickness = Math.max(1, Math.round(size / 4));
  const half = size / 2;
  ctx.fillRect(Math.round(x - half), Math.round(y - thickness / 2), Math.round(size), thickness);
  ctx.fillRect(Math.round(x - thickness / 2), Math.round(y - half), thickness, Math.round(size));
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const radius = Math.max(1.5, size / 2);
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function wrapUnit(value: number) {
  const span = 1 + DOT_WRAP_MARGIN * 2;
  let wrapped = (value + DOT_WRAP_MARGIN) % span;

  if (wrapped < 0) {
    wrapped += span;
  }

  return wrapped - DOT_WRAP_MARGIN;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function randomInt(min: number, max: number) {
  return Math.floor(randomInRange(Math.random, min, max + 1));
}

function isInFaceHitArea(pointer: SparklePointer) {
  return (
    pointer.x >= FACE_HIT_AREA.left &&
    pointer.x <= FACE_HIT_AREA.left + FACE_HIT_AREA.width &&
    pointer.y >= FACE_HIT_AREA.top &&
    pointer.y <= FACE_HIT_AREA.top + FACE_HIT_AREA.height
  );
}

export function KokoroScene({ variant }: KokoroSceneProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const starCanvasRef = useRef<HTMLCanvasElement>(null);
  const clickSparklesRef = useRef<ClickSparkle[]>([]);
  const clickSparkleIdRef = useRef(0);
  const sparklePointerRef = useRef<SparklePointer | null>(null);
  const activeSparklePointerIdRef = useRef<number | null>(null);
  const sparkleNextBurstAtRef = useRef(0);
  const sparkleTrailLastPointRef = useRef<SparklePointer | null>(null);
  const sparkleWasInFaceAreaRef = useRef(false);
  const faceDragMouthAccumulatedMsRef = useRef(0);
  const faceDragMouthLastMoveAtRef = useRef<number | null>(null);
  const faceDragMouthResetTimeoutRef = useRef<number | null>(null);
  const eyeAnimationTimeoutsRef = useRef<number[]>([]);
  const mouthAnimationTimeoutRef = useRef<number | null>(null);
  const wingInteractionCountRef = useRef(0);
  const wingEyeReactionUnlockedRef = useRef(false);
  const wingDragStartYRef = useRef(0);
  const wingDragRotationRef = useRef(0);
  const wingDraggingRef = useRef(false);
  const wingReleaseTimeoutRef = useRef<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: FIGURE_WIDTH, height: FIGURE_HEIGHT, dpr: 1 });
  const [eyeOpen, setEyeOpen] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [wingDragRotation, setWingDragRotation] = useState(0);
  const [wingDragging, setWingDragging] = useState(false);
  const [wingReleasing, setWingReleasing] = useState(false);
  const [wingReleaseRotation, setWingReleaseRotation] = useState(0);
  const sceneClasses = cn('kokoro-scene', `kokoro-scene-${variant}`);

  const twinkles = useMemo(() => KOKORO_TWINKLES.map(withRuntimeDuration), []);

  const emitClickSparkles = (
    x: number,
    y: number,
    now: number,
    minBurst = CLICK_SPARKLE_MIN_BURST,
    maxBurst = CLICK_SPARKLE_MAX_BURST,
    sizeMultiplier = 1,
  ) => {
    const burstCount = randomInt(minBurst, maxBurst);
    const nextSparkles = [...clickSparklesRef.current];

    for (let index = 0; index < burstCount; index += 1) {
      const angle = randomInRange(Math.random, 0, Math.PI * 2);
      const speed = randomInRange(Math.random, 8, 22);

      nextSparkles.push({
        id: clickSparkleIdRef.current,
        x,
        y,
        vx: (Math.cos(angle) * speed) / FIGURE_WIDTH,
        vy: (Math.sin(angle) * speed) / FIGURE_HEIGHT,
        size: randomInRange(Math.random, 14, 22) * sizeMultiplier,
        bornAt: now,
        lifespan: randomInRange(Math.random, 620, 980),
      });
      clickSparkleIdRef.current += 1;
    }

    clickSparklesRef.current = nextSparkles.slice(-CLICK_SPARKLE_MAX_COUNT);
  };

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateCanvasSize = () => {
      const rect = frame.getBoundingClientRect();
      const nextWidth = Math.max(1, rect.width || FIGURE_WIDTH);
      const nextHeight = Math.max(1, rect.height || (nextWidth * FIGURE_HEIGHT) / FIGURE_WIDTH);
      const nextDpr = window.devicePixelRatio || 1;
      setCanvasSize({ width: nextWidth, height: nextHeight, dpr: nextDpr });
    };

    updateCanvasSize();

    const observer = new ResizeObserver(() => updateCanvasSize());
    observer.observe(frame);
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    let animationFrameId = 0;
    const scale = canvasSize.width / FIGURE_WIDTH;

    const draw = (now: number) => {
      const timeSeconds = now / 1000;

      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.save();
      context.scale(canvasSize.dpr, canvasSize.dpr);

      twinkles.forEach((twinkleDefinition) => {
        const opacity = getTwinkleOpacity(twinkleDefinition, timeSeconds);
        if (opacity <= 0.01) return;

        context.save();
        context.globalAlpha = opacity;
        context.fillStyle = twinkleDefinition.shape === 'cross' ? STAR_COLOR : DOT_COLOR;

        if (twinkleDefinition.shape === 'cross') {
          drawCross(
            context,
            twinkleDefinition.x * canvasSize.width,
            twinkleDefinition.y * canvasSize.height,
            twinkleDefinition.size * scale,
          );
        } else {
          const driftProgress = ((timeSeconds * DOT_DRIFT_SPEED) + twinkleDefinition.start * 0.2) % 1;
          const driftedX = wrapUnit(twinkleDefinition.x + driftProgress * DOT_DRIFT_DISTANCE_X);
          const driftedY = wrapUnit(twinkleDefinition.y + driftProgress * DOT_DRIFT_DISTANCE_Y);

          drawDot(
            context,
            driftedX * canvasSize.width,
            driftedY * canvasSize.height,
            twinkleDefinition.size * scale,
          );
        }

        context.restore();
      });

      const sparklePointer = sparklePointerRef.current;
      if (sparklePointer && now >= sparkleNextBurstAtRef.current) {
        emitClickSparkles(sparklePointer.x, sparklePointer.y, now, CLICK_SPARKLE_MIN_BURST, CLICK_SPARKLE_MAX_BURST, sparklePointer.sizeMultiplier);
        sparkleNextBurstAtRef.current = now + CLICK_SPARKLE_HOLD_INTERVAL_MS;
      }

      clickSparklesRef.current = clickSparklesRef.current.filter((sparkle) => {
        const age = now - sparkle.bornAt;
        if (age >= sparkle.lifespan) return false;

        const progress = age / sparkle.lifespan;
        const sparkleX = (sparkle.x + sparkle.vx * (age / 1000)) * canvasSize.width;
        const sparkleY = (sparkle.y + sparkle.vy * (age / 1000)) * canvasSize.height;
        const sparkleSize = sparkle.size * scale * (1 - progress * 0.25);
        const opacity = Math.sin(progress * Math.PI) * (1 - progress * 0.35);

        context.save();
        context.globalAlpha = opacity;
        context.translate(sparkleX, sparkleY);
        context.fillStyle = CLICK_SPARKLE_COLOR;
        drawCross(context, 0, 0, sparkleSize);
        context.restore();

        return true;
      });

      context.restore();
      animationFrameId = window.requestAnimationFrame(draw);
    };

    animationFrameId = window.requestAnimationFrame(draw);
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [canvasSize.dpr, canvasSize.height, canvasSize.width, twinkles]);

  useEffect(() => {
    return () => {
      eyeAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      eyeAnimationTimeoutsRef.current = [];
      if (mouthAnimationTimeoutRef.current !== null) {
        window.clearTimeout(mouthAnimationTimeoutRef.current);
      }
      if (faceDragMouthResetTimeoutRef.current !== null) {
        window.clearTimeout(faceDragMouthResetTimeoutRef.current);
      }
      if (wingReleaseTimeoutRef.current !== null) {
        window.clearTimeout(wingReleaseTimeoutRef.current);
      }
    };
  }, []);

  const handleFaceClick = () => {
    setEyeOpen(true);
    eyeAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    eyeAnimationTimeoutsRef.current = [];

    eyeAnimationTimeoutsRef.current.push(
      window.setTimeout(() => setEyeOpen(false), EYE_INITIAL_HOLD_MS),
      window.setTimeout(() => setEyeOpen(true), EYE_INITIAL_HOLD_MS + EYE_BLINK_INTERVAL_MS),
      window.setTimeout(() => setEyeOpen(false), EYE_INITIAL_HOLD_MS + EYE_BLINK_INTERVAL_MS * 2),
      window.setTimeout(() => setEyeOpen(true), EYE_INITIAL_HOLD_MS + EYE_BLINK_INTERVAL_MS * 3),
      window.setTimeout(() => {
        setEyeOpen(false);
        eyeAnimationTimeoutsRef.current = [];
      }, EYE_INITIAL_HOLD_MS + EYE_BLINK_INTERVAL_MS * 3 + EYE_FINAL_HOLD_MS),
    );
  };

  const triggerWingEyeReaction = () => {
    eyeAnimationTimeoutsRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
    eyeAnimationTimeoutsRef.current = [];
    setEyeOpen(true);

    eyeAnimationTimeoutsRef.current.push(
      window.setTimeout(() => {
        setEyeOpen(false);
        eyeAnimationTimeoutsRef.current = [];
      }, WING_EYE_REACTION_MS),
    );
  };

  const triggerMouthReaction = () => {
    if (mouthAnimationTimeoutRef.current !== null) {
      window.clearTimeout(mouthAnimationTimeoutRef.current);
    }

    setMouthOpen(true);
    mouthAnimationTimeoutRef.current = window.setTimeout(() => {
      setMouthOpen(false);
      mouthAnimationTimeoutRef.current = null;
    }, MOUTH_ACTIVE_MS);
  };

  const resetFaceDragMouthTimer = () => {
    faceDragMouthAccumulatedMsRef.current = 0;
    faceDragMouthLastMoveAtRef.current = null;
    faceDragMouthResetTimeoutRef.current = null;
  };

  const keepFaceDragMouthTimer = (now: number) => {
    if (faceDragMouthResetTimeoutRef.current !== null) {
      window.clearTimeout(faceDragMouthResetTimeoutRef.current);
      faceDragMouthResetTimeoutRef.current = null;
    }

    const lastMoveAt = faceDragMouthLastMoveAtRef.current;
    if (lastMoveAt !== null) {
      faceDragMouthAccumulatedMsRef.current += Math.min(120, now - lastMoveAt);
    }
    faceDragMouthLastMoveAtRef.current = now;

    if (faceDragMouthAccumulatedMsRef.current >= FACE_DRAG_MOUTH_REQUIRED_MS) {
      triggerMouthReaction();
      faceDragMouthAccumulatedMsRef.current = 0;
    }
  };

  const pauseFaceDragMouthTimer = () => {
    faceDragMouthLastMoveAtRef.current = null;
    if (faceDragMouthResetTimeoutRef.current !== null) return;

    faceDragMouthResetTimeoutRef.current = window.setTimeout(resetFaceDragMouthTimer, FACE_DRAG_MOUTH_RESET_DELAY_MS);
  };

  const updateSparklePointer = (event: PointerEvent<HTMLElement>) => {
    const frame = frameRef.current;
    if (!frame) return null;

    const rect = frame.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    const nextPointer = {
      x,
      y,
      sizeMultiplier: event.pointerType === 'touch' ? CLICK_SPARKLE_TOUCH_SIZE_MULTIPLIER : 1,
    };
    sparklePointerRef.current = nextPointer;

    return nextPointer;
  };

  const handleScenePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (activeSparklePointerIdRef.current !== null) return;

    activeSparklePointerIdRef.current = event.pointerId;
    const pointer = updateSparklePointer(event);
    if (!pointer) {
      activeSparklePointerIdRef.current = null;
      return;
    }

    const now = performance.now();
    sparkleTrailLastPointRef.current = pointer;
    sparkleWasInFaceAreaRef.current = isInFaceHitArea(pointer);
    if (!sparkleWasInFaceAreaRef.current) {
      pauseFaceDragMouthTimer();
    }
    emitClickSparkles(pointer.x, pointer.y, now, CLICK_SPARKLE_MIN_BURST, CLICK_SPARKLE_MAX_BURST, pointer.sizeMultiplier);
    sparkleNextBurstAtRef.current = now + CLICK_SPARKLE_HOLD_INTERVAL_MS;
  };

  const handleScenePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activeSparklePointerIdRef.current !== event.pointerId) return;
    if (!sparklePointerRef.current) return;

    const previousPointer = sparkleTrailLastPointRef.current;
    const nextPointer = updateSparklePointer(event);
    if (!previousPointer || !nextPointer) return;

    const deltaX = nextPointer.x - previousPointer.x;
    const deltaY = nextPointer.y - previousPointer.y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < CLICK_SPARKLE_TRAIL_STEP) return;

    const trailPoints = Math.min(CLICK_SPARKLE_TRAIL_MAX_POINTS, Math.floor(distance / CLICK_SPARKLE_TRAIL_STEP));
    const now = performance.now();
    const isInFaceArea = isInFaceHitArea(nextPointer);
    if (isInFaceArea) {
      keepFaceDragMouthTimer(now);
    } else {
      pauseFaceDragMouthTimer();
    }
    sparkleWasInFaceAreaRef.current = isInFaceArea;

    for (let index = 1; index <= trailPoints; index += 1) {
      const progress = index / trailPoints;
      emitClickSparkles(
        previousPointer.x + deltaX * progress,
        previousPointer.y + deltaY * progress,
        now,
        1,
        2,
        nextPointer.sizeMultiplier,
      );
    }

    sparkleTrailLastPointRef.current = nextPointer;
  };

  const handleScenePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activeSparklePointerIdRef.current !== event.pointerId) return;

    activeSparklePointerIdRef.current = null;
    sparklePointerRef.current = null;
    sparkleTrailLastPointRef.current = null;
    sparkleWasInFaceAreaRef.current = false;
    pauseFaceDragMouthTimer();
  };

  const handleWingPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (wingReleaseTimeoutRef.current !== null) {
      window.clearTimeout(wingReleaseTimeoutRef.current);
      wingReleaseTimeoutRef.current = null;
    }

    wingDragStartYRef.current = event.clientY;
    wingDragRotationRef.current = 0;
    wingDraggingRef.current = true;
    setWingDragging(true);
    setWingReleasing(false);
    setWingDragRotation(0);
    setWingReleaseRotation(0);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleWingPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!wingDraggingRef.current) return;

    const deltaY = event.clientY - wingDragStartYRef.current;
    const nextRotation = clamp(deltaY * WING_DRAG_ROTATION_PER_PIXEL, -WING_DRAG_MAX_ROTATION, WING_DRAG_MAX_ROTATION);
    wingDragRotationRef.current = nextRotation;
    setWingDragRotation(nextRotation);
  };

  const handleWingPointerEnd = (event: PointerEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const draggedRotation = wingDragRotationRef.current;
    const releaseRotation = Math.abs(draggedRotation) < WING_RELEASE_MIN_DRAG_ROTATION
      ? 0
      : draggedRotation > 0
        ? WING_RELEASE_BACK_ROTATION
        : WING_RELEASE_FORWARD_ROTATION;

    wingDraggingRef.current = false;
    setWingDragging(false);
    setWingReleasing(releaseRotation !== 0);
    setWingReleaseRotation(releaseRotation);

    if (releaseRotation !== 0) {
      wingReleaseTimeoutRef.current = window.setTimeout(() => {
        setWingReleasing(false);
        setWingReleaseRotation(0);
        wingReleaseTimeoutRef.current = null;
      }, WING_RELEASE_DURATION_MS + WING_RESUME_DELAY_MS);
    }

    wingInteractionCountRef.current += 1;
    if (!wingEyeReactionUnlockedRef.current && wingInteractionCountRef.current >= WING_EYE_REACTION_UNLOCK_COUNT) {
      wingEyeReactionUnlockedRef.current = true;
      triggerWingEyeReaction();
    } else if (wingEyeReactionUnlockedRef.current && Math.random() < WING_EYE_REACTION_RANDOM_RATE) {
      triggerWingEyeReaction();
    }

    wingDragRotationRef.current = 0;
    setWingDragRotation(0);
  };

  const wingStyle = {
    left: `${WING_POSITION.left * 100}%`,
    top: `${WING_POSITION.top * 100}%`,
    width: `${WING_POSITION.width * 100}%`,
  } as CSSProperties;
  const wingImageStyle = {
    '--kokoro-wing-drag-rotation': `${wingDragRotation}deg`,
    '--kokoro-wing-release-rotation': `${wingReleaseRotation}deg`,
    '--kokoro-wing-release-return-rotation': `${wingReleaseRotation * -0.35}deg`,
    '--kokoro-wing-release-duration': `${WING_RELEASE_DURATION_MS}ms`,
  } as CSSProperties;

  return (
    <div className={sceneClasses}>
      <div className="kokoro-asset-stage">
        <div
          ref={frameRef}
          className="kokoro-asset-frame"
          onPointerDown={handleScenePointerDown}
          onPointerMove={handleScenePointerMove}
          onPointerUp={handleScenePointerEnd}
          onPointerCancel={handleScenePointerEnd}
          onPointerLeave={handleScenePointerEnd}
        >
          <div className="kokoro-backdrop" aria-hidden="true" />
          <Image
            src={BACKGROUND_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="kokoro-layer kokoro-background"
            draggable={false}
            priority={variant === 'modal'}
          />
          <canvas ref={starCanvasRef} className="kokoro-canvas-layer kokoro-canvas-layer-stars" />
          <button
            type="button"
            className={cn('kokoro-face-hit-area', SHOW_FACE_HIT_AREA && 'is-visible')}
            style={{
              left: `${FACE_HIT_AREA.left * 100}%`,
              top: `${FACE_HIT_AREA.top * 100}%`,
              width: `${FACE_HIT_AREA.width * 100}%`,
              height: `${FACE_HIT_AREA.height * 100}%`,
            }}
            onClick={handleFaceClick}
            aria-label="こころの表情を切り替える"
          />
          <div className={cn('kokoro-wing-shell', (wingDragging || wingReleasing) && 'is-paused')} style={wingStyle}>
            <Image
              src={WING_SRC}
              alt=""
              width={WING_IMAGE_WIDTH}
              height={WING_IMAGE_HEIGHT}
              className={cn('kokoro-wing', wingReleaseRotation !== 0 && 'is-releasing')}
              style={wingImageStyle}
              draggable={false}
              priority={variant === 'modal'}
            />
          </div>
          <button
            type="button"
            className="kokoro-wing-hit-area"
            style={{
              left: `${WING_POSITION.left * 100}%`,
              top: `${WING_POSITION.top * 100}%`,
              width: `${WING_POSITION.width * 100}%`,
              height: `${WING_HIT_AREA_HEIGHT * 100}%`,
            }}
            onPointerDown={handleWingPointerDown}
            onPointerMove={handleWingPointerMove}
            onPointerUp={handleWingPointerEnd}
            onPointerCancel={handleWingPointerEnd}
            aria-label="こころの羽を動かす"
          />
          <Image
            src={BASE_SRC}
            alt="こころのHTMLアート"
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="kokoro-layer kokoro-base"
            draggable={false}
            priority={variant === 'modal'}
          />
          <Image
            src={MOUTH_DEFAULT_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className={cn('kokoro-layer kokoro-mouth', mouthOpen && 'is-hidden')}
            draggable={false}
            priority={variant === 'modal'}
          />
          <Image
            src={MOUTH_ACTIVE_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className={cn('kokoro-layer kokoro-mouth', !mouthOpen && 'is-hidden')}
            draggable={false}
            priority={variant === 'modal'}
          />
          <Image
            src={eyeOpen ? EYE_ACTIVE_SRC : EYE_DEFAULT_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="kokoro-layer kokoro-eye"
            draggable={false}
            priority={variant === 'modal'}
          />
        </div>
      </div>
    </div>
  );
}
