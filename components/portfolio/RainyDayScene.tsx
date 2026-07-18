'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

type RainyDaySceneProps = {
  variant: PortfolioMediaVariant;
};

const FIGURE_WIDTH = 1623;
const FIGURE_HEIGHT = 1200;
const FIGURE_IMAGE_SRC = '/portfolio/rainy-day/rainy-day1.png';
const FIGURE_BACKGROUND_SRC = '/portfolio/rainy-day/bg.png';
const FIGURE_SNAIL_SRC = '/portfolio/rainy-day/snail.png';
const FIGURE_FROG_ONE_SRC = '/portfolio/rainy-day/frog1.png';
const FIGURE_FROG_TWO_SRC = '/portfolio/rainy-day/frog2.png';
const FIGURE_MOUTH_ONE_SRC = '/portfolio/rainy-day/mouth1.png';
const FIGURE_MOUTH_TWO_SRC = '/portfolio/rainy-day/mouth2.png';
const FIGURE_NOTE_ONE_SRC = '/portfolio/rainy-day/note1.png';
const FIGURE_NOTE_TWO_SRC = '/portfolio/rainy-day/note2.png';
const FIGURE_ZZZ_SRC = '/portfolio/rainy-day/zzz.png';
const RAIN_COLOR = 'rgb(207, 197, 238)';
const LIGHT_RAIN_COLOR = 'rgba(207, 197, 238, 0.5)';

const SNAIL_POSITION = {
  left: 0.93,
  top: 0.46,
  width: 0.12,
};

const SNAIL_TARGET_POSITION = {
  left: 0.88,
  top: 0.485,
};

const NOTE_ONE_POSITION = {
  left: 0.50,
  top: 0.49,
  width: 0.1,
};

const NOTE_TWO_POSITION = {
  left: 0.58,
  top: 0.42,
  width: 0.1,
};

const MOUTH_ONE_POSITION = {
  left: 0.316,
  top: 0.452,
  width: 0.018,
};

const MOUTH_TWO_POSITION = {
  left: 0.315,
  top: 0.454,
  width: 0.011,
};

const FROG_POSITION = {
  left: 0.16,
  top: 0.86,
  width: 0.19,
};

const ZZZ_POSITION = {
  left: 0.06,
  top: 0.69,
  width: 0.12,
};

const FROG_PERMANENT_SLEEP_DELAY_MS = 45_000;
const FROG_FLASH_DURATION_MS = 170;
const FROG_FLASH_INTERVAL_MIN_MS = 2_600;
const FROG_FLASH_INTERVAL_MAX_MS = 5_200;

type RainLineDefinition = {
  id: string;
  x: number;
  delay: number;
};

function rainLine(definition: RainLineDefinition) {
  return definition;
}

type RainLineRuntime = {
  cycleStartedAt: number;
  duration: number;
  length: number;
  x: number;
};

type RainLineOptions = {
  color: string;
  baseDuration: number;
  durationJitter: number;
  delayJitter: number;
  maxOpacity: number;
  lineWidth: number;
  baseLength: number;
  lengthJitter: number;
  xJitter: number;
  xMin?: number;
  xMax?: number;
};

type FrogState = 'awake' | 'flash' | 'sleep';

const MAIN_RAIN_WIDTH = 2.2;
const MAIN_RAIN_LENGTH = 0.22;
const MAIN_RAIN_DURATION = 0.3;
const MAIN_RAIN_MAX_OPACITY = 0.92;

const LIGHT_RAIN_WIDTH = 1.8;
const LIGHT_RAIN_LENGTH = 0.15;
const LIGHT_RAIN_DURATION = 0.4;
const LIGHT_RAIN_MAX_OPACITY = 0.80;

// 位置を手で詰めやすいよう、x は横位置、start は流れ始めの位相オフセットとして持つ。
const MAIN_RAIN_LINES = [
  rainLine({ id: 'r-01', x: 0.68, delay: 0.05 }),
  rainLine({ id: 'r-02', x: 0.73, delay: 0.28 }),
  rainLine({ id: 'r-03', x: 0.79, delay: 0.56 }),
  rainLine({ id: 'r-04', x: 0.83, delay: 0.82 }),
  rainLine({ id: 'r-05', x: 0.88, delay: 1.08 }),
  rainLine({ id: 'r-06', x: 0.92, delay: 1.24 }),
  rainLine({ id: 'r-07', x: 0.3, delay: 0.3 }),
  rainLine({ id: 'r-08', x: 0.32, delay: 0.85 }),
  rainLine({ id: 'r-09', x: 0.2, delay: 1.4 }),
  rainLine({ id: 'r-10', x: 0.14, delay: 0.4 }),
  rainLine({ id: 'r-11', x: 0.95, delay: 0.3 }),
  rainLine({ id: 'r-12', x: 0.62, delay: 0.18 }),
  rainLine({ id: 'r-13', x: 0.7, delay: 0.42 }),
  rainLine({ id: 'r-14', x: 0.76, delay: 0.64 }),
  rainLine({ id: 'r-15', x: 0.81, delay: 0.94 }),
  rainLine({ id: 'r-16', x: 0.86, delay: 1.18 }),
  rainLine({ id: 'r-17', x: 0.9, delay: 1.36 }),
  rainLine({ id: 'r-18', x: 0.27, delay: 0.14 }),
  rainLine({ id: 'r-19', x: 0.24, delay: 0.62 }),
  rainLine({ id: 'r-20', x: 0.17, delay: 0.96 }),
  rainLine({ id: 'r-21', x: 0.11, delay: 1.22 }),
  rainLine({ id: 'r-22', x: 0.66, delay: 0.09 }),
  rainLine({ id: 'r-23', x: 0.71, delay: 0.22 }),
  rainLine({ id: 'r-24', x: 0.75, delay: 0.34 }),
  rainLine({ id: 'r-25', x: 0.8, delay: 0.5 }),
  rainLine({ id: 'r-26', x: 0.84, delay: 0.73 }),
  rainLine({ id: 'r-27', x: 0.89, delay: 0.98 }),
  rainLine({ id: 'r-28', x: 0.93, delay: 1.12 }),
  rainLine({ id: 'r-29', x: 0.97, delay: 1.3 }),
  rainLine({ id: 'r-30', x: 0.29, delay: 0.24 }),
  rainLine({ id: 'r-31', x: 0.25, delay: 0.54 }),
  rainLine({ id: 'r-32', x: 0.19, delay: 0.88 }),
  rainLine({ id: 'r-33', x: 0.15, delay: 1.1 }),
];

const LIGHT_RAIN_LINES = [
  rainLine({ id: 'lr-01', x: 0.64, delay: 0.04 }),
  rainLine({ id: 'lr-02', x: 0.67, delay: 0.12 }),
  rainLine({ id: 'lr-03', x: 0.7, delay: 0.2 }),
  rainLine({ id: 'lr-04', x: 0.72, delay: 0.28 }),
  rainLine({ id: 'lr-05', x: 0.75, delay: 0.36 }),
  rainLine({ id: 'lr-06', x: 0.77, delay: 0.44 }),
  rainLine({ id: 'lr-07', x: 0.8, delay: 0.52 }),
  rainLine({ id: 'lr-08', x: 0.82, delay: 0.6 }),
  rainLine({ id: 'lr-09', x: 0.84, delay: 0.68 }),
  rainLine({ id: 'lr-10', x: 0.86, delay: 0.76 }),
  rainLine({ id: 'lr-11', x: 0.88, delay: 0.84 }),
  rainLine({ id: 'lr-12', x: 0.9, delay: 0.92 }),
  rainLine({ id: 'lr-13', x: 0.92, delay: 1.0 }),
  rainLine({ id: 'lr-14', x: 0.94, delay: 1.08 }),
  rainLine({ id: 'lr-15', x: 0.96, delay: 1.16 }),
  rainLine({ id: 'lr-16', x: 0.35, delay: 0.74 }),
  rainLine({ id: 'lr-17', x: 0.26, delay: 1.5 }),
  rainLine({ id: 'lr-18', x: 0.12, delay: 0.9 }),
  rainLine({ id: 'lr-19', x: 0.32, delay: 0.54 }),
  rainLine({ id: 'lr-20', x: 0.6, delay: 0.08 }),
  rainLine({ id: 'lr-21', x: 0.63, delay: 0.18 }),
  rainLine({ id: 'lr-22', x: 0.69, delay: 0.32 }),
  rainLine({ id: 'lr-23', x: 0.74, delay: 0.46 }),
  rainLine({ id: 'lr-24', x: 0.79, delay: 0.58 }),
  rainLine({ id: 'lr-25', x: 0.83, delay: 0.7 }),
  rainLine({ id: 'lr-26', x: 0.87, delay: 0.82 }),
  rainLine({ id: 'lr-27', x: 0.91, delay: 0.96 }),
  rainLine({ id: 'lr-28', x: 0.93, delay: 1.08 }),
  rainLine({ id: 'lr-29', x: 0.98, delay: 1.24 }),
  rainLine({ id: 'lr-30', x: 0.61, delay: 0.1 }),
  rainLine({ id: 'lr-31', x: 0.65, delay: 0.16 }),
  rainLine({ id: 'lr-32', x: 0.68, delay: 0.24 }),
  rainLine({ id: 'lr-33', x: 0.71, delay: 0.3 }),
  rainLine({ id: 'lr-34', x: 0.73, delay: 0.39 }),
  rainLine({ id: 'lr-35', x: 0.76, delay: 0.5 }),
  rainLine({ id: 'lr-36', x: 0.78, delay: 0.56 }),
  rainLine({ id: 'lr-37', x: 0.81, delay: 0.64 }),
  rainLine({ id: 'lr-38', x: 0.85, delay: 0.74 }),
  rainLine({ id: 'lr-39', x: 0.89, delay: 0.88 }),
  rainLine({ id: 'lr-40', x: 0.9, delay: 0.98 }),
  rainLine({ id: 'lr-41', x: 0.94, delay: 1.04 }),
  rainLine({ id: 'lr-42', x: 0.97, delay: 1.19 }),
  rainLine({ id: 'lr-43', x: 0.33, delay: 0.68 }),
  rainLine({ id: 'lr-44', x: 0.28, delay: 1.42 }),
  rainLine({ id: 'lr-45', x: 0.58, delay: 0.06 }),
  rainLine({ id: 'lr-46', x: 0.62, delay: 0.14 }),
  rainLine({ id: 'lr-47', x: 0.66, delay: 0.22 }),
  rainLine({ id: 'lr-48', x: 0.72, delay: 0.34 }),
  rainLine({ id: 'lr-49', x: 0.76, delay: 0.48 }),
  rainLine({ id: 'lr-50', x: 0.82, delay: 0.62 }),
  rainLine({ id: 'lr-51', x: 0.87, delay: 0.79 }),
  rainLine({ id: 'lr-52', x: 0.92, delay: 0.95 }),
  rainLine({ id: 'lr-53', x: 0.95, delay: 1.11 }),
  rainLine({ id: 'lr-54', x: 0.24, delay: 1.28 }),
];

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

function createRuntimeLine(
  line: RainLineDefinition,
  options: RainLineOptions,
  random: () => number,
  cycleStartedAt: number,
): RainLineRuntime {
  const duration = Math.max(0.18, options.baseDuration + randomInRange(random, -options.durationJitter, options.durationJitter));
  const length = Math.max(0.04, options.baseLength + randomInRange(random, -options.lengthJitter, options.lengthJitter));
  const x = Math.min(
    options.xMax ?? 1,
    Math.max(options.xMin ?? 0, line.x + randomInRange(random, -options.xJitter, options.xJitter)),
  );

  return { cycleStartedAt, duration, length, x };
}

function ensureRuntimeLines(
  definitions: RainLineDefinition[],
  runtimeRef: React.MutableRefObject<Record<string, RainLineRuntime>>,
  randomRef: React.MutableRefObject<Record<string, () => number>>,
  options: RainLineOptions,
) {
  definitions.forEach((line) => {
    if (randomRef.current[line.id]) {
      return;
    }

    const random = createSeededRandom(line.id);
    randomRef.current[line.id] = random;
    runtimeRef.current[line.id] = createRuntimeLine(line, options, random, -line.delay);
  });
}

function drawRainLine(
  ctx: CanvasRenderingContext2D,
  line: RainLineDefinition,
  width: number,
  height: number,
  scale: number,
  timeSeconds: number,
  runtimeLine: RainLineRuntime,
  options: RainLineOptions,
) {
  const elapsed = timeSeconds - runtimeLine.cycleStartedAt;
  const progress = elapsed / runtimeLine.duration;
  const travel = 1 + runtimeLine.length;
  const lineTopRatio = progress * travel - runtimeLine.length;
  const lineBottomRatio = lineTopRatio + runtimeLine.length;

  if (lineBottomRatio <= 0 || lineTopRatio >= 1) {
    return;
  }

  const visibleTopRatio = Math.max(0, lineTopRatio);
  const visibleBottomRatio = Math.min(1, lineBottomRatio);
  const headFade = progress < 0.14 ? progress / 0.14 : 1;
  const tailFade = progress > 0.86 ? Math.max(0, 1 - (progress - 0.86) / 0.14) : 1;
  const opacity = options.maxOpacity * Math.min(headFade, tailFade);

  const x = runtimeLine.x * width;
  const yStart = visibleTopRatio * height;
  const yEnd = visibleBottomRatio * height;
  const lineWidth = Math.max(0.25, options.lineWidth * scale);

  if (opacity <= 0.01 || yEnd - yStart <= 1) {
    return;
  }

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = options.color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(Math.round(x), Math.round(yStart));
  ctx.lineTo(Math.round(x), Math.round(yEnd));
  ctx.stroke();
  ctx.restore();
}

export function RainyDayScene({ variant }: RainyDaySceneProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const rainCanvasRef = useRef<HTMLCanvasElement>(null);
  const mainRuntimeRef = useRef<Record<string, RainLineRuntime>>({});
  const lightRuntimeRef = useRef<Record<string, RainLineRuntime>>({});
  const mainRandomRef = useRef<Record<string, () => number>>({});
  const lightRandomRef = useRef<Record<string, () => number>>({});
  const [mouthImageSrc, setMouthImageSrc] = useState(FIGURE_MOUTH_ONE_SRC);
  const [snailReachedTarget, setSnailReachedTarget] = useState(false);
  const [frogState, setFrogState] = useState<FrogState>('awake');
  const [canvasSize, setCanvasSize] = useState({ width: FIGURE_WIDTH, height: FIGURE_HEIGHT, dpr: 1 });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setMouthImageSrc(FIGURE_MOUTH_TWO_SRC);
    }, 60_000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setSnailReachedTarget(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let flashTimeoutId = 0;
    let flashResetTimeoutId = 0;
    let permanentSleepTimeoutId = 0;

    const scheduleFlash = () => {
      if (disposed) {
        return;
      }

      const nextDelay = randomInRange(Math.random, FROG_FLASH_INTERVAL_MIN_MS, FROG_FLASH_INTERVAL_MAX_MS);

      flashTimeoutId = window.setTimeout(() => {
        if (disposed) {
          return;
        }

        setFrogState('flash');

        flashResetTimeoutId = window.setTimeout(() => {
          if (disposed) {
            return;
          }

          setFrogState('awake');
          scheduleFlash();
        }, FROG_FLASH_DURATION_MS);
      }, nextDelay);
    };

    scheduleFlash();

    permanentSleepTimeoutId = window.setTimeout(() => {
      if (disposed) {
        return;
      }

      window.clearTimeout(flashTimeoutId);
      window.clearTimeout(flashResetTimeoutId);
      setFrogState('sleep');
    }, FROG_PERMANENT_SLEEP_DELAY_MS);

    return () => {
      disposed = true;
      window.clearTimeout(flashTimeoutId);
      window.clearTimeout(flashResetTimeoutId);
      window.clearTimeout(permanentSleepTimeoutId);
    };
  }, []);

  useEffect(() => {
    const frameElement = frameRef.current;

    if (!frameElement) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const nextWidth = entry.contentRect.width;
      const nextHeight = entry.contentRect.height;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);

      if (nextWidth <= 0 || nextHeight <= 0) {
        return;
      }

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
    const canvas = rainCanvasRef.current;

    if (!canvas) {
      return;
    }

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));

    canvas.width = pixelWidth;
    canvas.height = pixelHeight;

    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    const mainOptions: RainLineOptions = {
      color: RAIN_COLOR,
      baseDuration: MAIN_RAIN_DURATION,
      durationJitter: 0.16,
      delayJitter: 0.44,
      maxOpacity: MAIN_RAIN_MAX_OPACITY,
      lineWidth: MAIN_RAIN_WIDTH,
      baseLength: MAIN_RAIN_LENGTH,
      lengthJitter: 0.04,
      xJitter: 0.016,
    };
    const lightOptions: RainLineOptions = {
      color: LIGHT_RAIN_COLOR,
      baseDuration: LIGHT_RAIN_DURATION,
      durationJitter: 0.18,
      delayJitter: 0.48,
      maxOpacity: LIGHT_RAIN_MAX_OPACITY,
      lineWidth: LIGHT_RAIN_WIDTH,
      baseLength: LIGHT_RAIN_LENGTH,
      lengthJitter: 0.035,
      xJitter: 0.02,
      xMin: 0.58,
    };

    ensureRuntimeLines(MAIN_RAIN_LINES, mainRuntimeRef, mainRandomRef, mainOptions);
    ensureRuntimeLines(LIGHT_RAIN_LINES, lightRuntimeRef, lightRandomRef, lightOptions);

    const scale = canvasSize.width / FIGURE_WIDTH;
    let animationFrameId = 0;

    const render = (timestamp: number) => {
      const timeSeconds = timestamp / 1000;
      const drawWidth = canvas.width;
      const drawHeight = canvas.height;

      context.clearRect(0, 0, drawWidth, drawHeight);

      LIGHT_RAIN_LINES.forEach((line) => {
        const runtimeLine = lightRuntimeRef.current[line.id];
        const random = lightRandomRef.current[line.id];

        if (!runtimeLine || !random) {
          return;
        }

        if (timeSeconds - runtimeLine.cycleStartedAt >= runtimeLine.duration) {
          lightRuntimeRef.current[line.id] = createRuntimeLine(
            line,
            lightOptions,
            random,
            timeSeconds + randomInRange(random, 0.04, lightOptions.delayJitter),
          );
          return;
        }

        drawRainLine(context, line, drawWidth, drawHeight, scale * canvasSize.dpr, timeSeconds, runtimeLine, lightOptions);
      });

      MAIN_RAIN_LINES.forEach((line) => {
        const runtimeLine = mainRuntimeRef.current[line.id];
        const random = mainRandomRef.current[line.id];

        if (!runtimeLine || !random) {
          return;
        }

        if (timeSeconds - runtimeLine.cycleStartedAt >= runtimeLine.duration) {
          mainRuntimeRef.current[line.id] = createRuntimeLine(
            line,
            mainOptions,
            random,
            timeSeconds + randomInRange(random, 0.06, mainOptions.delayJitter),
          );
          return;
        }

        drawRainLine(context, line, drawWidth, drawHeight, scale * canvasSize.dpr, timeSeconds, runtimeLine, mainOptions);
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [canvasSize.dpr, canvasSize.height, canvasSize.width]);

  return (
    <div className={cn('rainy-day-scene', `rainy-day-scene-${variant}`)}>
      <div className="rainy-day-backdrop" aria-hidden="true" />
      <div className="rainy-day-asset-stage">
        <div ref={frameRef} className="rainy-day-asset-frame">
          <Image
            src={FIGURE_BACKGROUND_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-background"
            priority={variant === 'modal'}
          />
          <Image
            src={FIGURE_SNAIL_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-snail"
            style={{
              left: `${(snailReachedTarget ? SNAIL_TARGET_POSITION.left : SNAIL_POSITION.left) * 100}%`,
              top: `${(snailReachedTarget ? SNAIL_TARGET_POSITION.top : SNAIL_POSITION.top) * 100}%`,
              width: `${SNAIL_POSITION.width * 100}%`,
            }}
          />
          <canvas ref={rainCanvasRef} className="rainy-day-canvas-layer rainy-day-canvas-layer-background" />
          <Image
            src={FIGURE_IMAGE_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-figure"
            priority={variant === 'modal'}
          />
          <Image
            src={mouthImageSrc}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-mouth"
            style={{
              left: `${(mouthImageSrc === FIGURE_MOUTH_ONE_SRC ? MOUTH_ONE_POSITION.left : MOUTH_TWO_POSITION.left) * 100}%`,
              top: `${(mouthImageSrc === FIGURE_MOUTH_ONE_SRC ? MOUTH_ONE_POSITION.top : MOUTH_TWO_POSITION.top) * 100}%`,
              width: `${(mouthImageSrc === FIGURE_MOUTH_ONE_SRC ? MOUTH_ONE_POSITION.width : MOUTH_TWO_POSITION.width) * 100}%`,
            }}
          />
          <Image
            src={frogState === 'awake' ? FIGURE_FROG_ONE_SRC : FIGURE_FROG_TWO_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-frog"
            style={{
              left: `${FROG_POSITION.left * 100}%`,
              top: `${FROG_POSITION.top * 100}%`,
              width: `${FROG_POSITION.width * 100}%`,
            }}
          />
          {frogState === 'sleep' ? (
            <Image
              src={FIGURE_ZZZ_SRC}
              alt=""
              width={FIGURE_WIDTH}
              height={FIGURE_HEIGHT}
              className="rainy-day-zzz"
              style={{
                left: `${ZZZ_POSITION.left * 100}%`,
                top: `${ZZZ_POSITION.top * 100}%`,
                width: `${ZZZ_POSITION.width * 100}%`,
              }}
            />
          ) : null}
          <Image
            src={FIGURE_NOTE_ONE_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-note rainy-day-note-one"
            style={{
              left: `${NOTE_ONE_POSITION.left * 100}%`,
              top: `${NOTE_ONE_POSITION.top * 100}%`,
              width: `${NOTE_ONE_POSITION.width * 100}%`,
            }}
          />
          <Image
            src={FIGURE_NOTE_TWO_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            className="rainy-day-note rainy-day-note-two"
            style={{
              left: `${NOTE_TWO_POSITION.left * 100}%`,
              top: `${NOTE_TWO_POSITION.top * 100}%`,
              width: `${NOTE_TWO_POSITION.width * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
