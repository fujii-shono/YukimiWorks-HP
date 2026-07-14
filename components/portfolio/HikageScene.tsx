'use client';

import Image from 'next/image';
import { type CSSProperties, useMemo } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

type HikageSceneProps = {
  variant: PortfolioMediaVariant;
};

type ParticleKind = 'dot' | 'cross';

type Particle = {
  id: string;
  kind: ParticleKind;
  style: CSSProperties & {
    '--drift-x'?: string;
    '--drift-y'?: string;
    '--twinkle-min'?: string;
    '--twinkle-max'?: string;
  };
};

type ParticleConfig = {
  count: number;
  minSize: number;
  maxSize: number;
  fixedSize?: number;
  minTop: number;
  maxTop: number;
  minLeft: number;
  maxLeft: number;
  minOpacity: number;
  maxOpacity: number;
  minDuration: number;
  maxDuration: number;
  minDelay: number;
  maxDelay: number;
  minDriftX?: number;
  maxDriftX?: number;
  minDriftY?: number;
  maxDriftY?: number;
  twinkleMin?: number;
  twinkleMax?: number;
  avoidZones?: Array<{
    left: number;
    right: number;
    top: number;
    bottom: number;
  }>;
};

function hashString(value: string) {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed: string) {
  let state = hashString(seed) || 1;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRange(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function isInsideZone(left: number, top: number, zone: { left: number; right: number; top: number; bottom: number }) {
  return left >= zone.left && left <= zone.right && top >= zone.top && top <= zone.bottom;
}

function shuffleIndices(random: () => number, values: number[]) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}

function createParticleStyle(
  random: () => number,
  config: ParticleConfig,
  left: number,
  top: number,
) {
  return {
    left: `${left.toFixed(2)}%`,
    top: `${top.toFixed(2)}%`,
    width: `${(config.fixedSize ?? pickRange(random, config.minSize, config.maxSize)).toFixed(2)}px`,
    height: `${(config.fixedSize ?? pickRange(random, config.minSize, config.maxSize)).toFixed(2)}px`,
    opacity: pickRange(random, config.minOpacity, config.maxOpacity),
    animationDuration: `${pickRange(random, config.minDuration, config.maxDuration).toFixed(2)}s`,
    animationDelay: `${pickRange(random, config.minDelay, config.maxDelay).toFixed(2)}s`,
    ...(config.minDriftX !== undefined &&
    config.maxDriftX !== undefined &&
    config.minDriftY !== undefined &&
    config.maxDriftY !== undefined
      ? {
          '--drift-x': `${pickRange(random, config.minDriftX, config.maxDriftX).toFixed(2)}px`,
          '--drift-y': `${pickRange(random, config.minDriftY, config.maxDriftY).toFixed(2)}px`,
        }
      : {}),
    ...(config.twinkleMin !== undefined ? { '--twinkle-min': String(config.twinkleMin) } : {}),
    ...(config.twinkleMax !== undefined ? { '--twinkle-max': String(config.twinkleMax) } : {}),
  } as Particle['style'];
}

function buildParticles(seed: string, config: ParticleConfig, kind: ParticleKind) {
  const random = createRandom(seed);
  return Array.from({ length: config.count }, (_, index) => ({
    id: `${kind}-${index}`,
    kind,
    style: (() => {
      let left = pickRange(random, config.minLeft, config.maxLeft);
      let top = pickRange(random, config.minTop, config.maxTop);

      if (config.avoidZones) {
        for (let attempt = 0; attempt < 8 && config.avoidZones.some((zone) => isInsideZone(left, top, zone)); attempt += 1) {
          const zone = config.avoidZones[attempt % config.avoidZones.length];
          left = zone.right + pickRange(random, 2, 10);
          top = zone.top + pickRange(random, 2, 10);
          if (left > config.maxLeft) left = config.minLeft + pickRange(random, 0, 6);
          if (top > config.maxTop) top = config.minTop + pickRange(random, 0, 6);
        }
      }

      return createParticleStyle(random, config, left, top);
    })(),
  }));
}

function buildGridParticles(seed: string, config: ParticleConfig, kind: ParticleKind) {
  const random = createRandom(seed);
  const spanX = config.maxLeft - config.minLeft;
  const spanY = config.maxTop - config.minTop;
  const gridRatio = spanX / Math.max(spanY, 1);
  const columnCount = Math.max(2, Math.ceil(Math.sqrt(config.count * gridRatio)));
  const rowCount = Math.max(2, Math.ceil(config.count / columnCount));
  const cellWidth = spanX / columnCount;
  const cellHeight = spanY / rowCount;
  const candidateCells = Array.from({ length: columnCount * rowCount }, (_, index) => {
    const column = index % columnCount;
    const row = Math.floor(index / columnCount);
    const centerLeft = config.minLeft + cellWidth * (column + 0.5);
    const centerTop = config.minTop + cellHeight * (row + 0.5);

    return {
      index,
      column,
      row,
      centerLeft,
      centerTop,
    };
  }).filter((cell) => !config.avoidZones?.some((zone) => isInsideZone(cell.centerLeft, cell.centerTop, zone)));
  const cellIndexes = shuffleIndices(
    random,
    (candidateCells.length >= config.count ? candidateCells : Array.from({ length: columnCount * rowCount }, (_, index) => ({
      index,
      column: index % columnCount,
      row: Math.floor(index / columnCount),
      centerLeft: config.minLeft + cellWidth * ((index % columnCount) + 0.5),
      centerTop: config.minTop + cellHeight * (Math.floor(index / columnCount) + 0.5),
    }))).map((cell) => cell.index),
  );

  return cellIndexes.slice(0, config.count).map((cellIndex, index) => {
    const column = cellIndex % columnCount;
    const row = Math.floor(cellIndex / columnCount);
    const centerLeft = config.minLeft + cellWidth * (column + 0.5);
    const centerTop = config.minTop + cellHeight * (row + 0.5);
    const jitterX = cellWidth * 0.26;
    const jitterY = cellHeight * 0.3;
    let left = Math.max(config.minLeft, Math.min(config.maxLeft, centerLeft + pickRange(random, -jitterX, jitterX)));
    let top = Math.max(config.minTop, Math.min(config.maxTop, centerTop + pickRange(random, -jitterY, jitterY)));

    if (config.avoidZones) {
      for (let attempt = 0; attempt < 8 && config.avoidZones.some((zone) => isInsideZone(left, top, zone)); attempt += 1) {
        left = Math.max(config.minLeft, Math.min(config.maxLeft, centerLeft + pickRange(random, -jitterX, jitterX)));
        top = Math.max(config.minTop, Math.min(config.maxTop, centerTop + pickRange(random, -jitterY, jitterY)));
      }
    }

    return {
      id: `${kind}-${index}`,
      kind,
      style: createParticleStyle(random, config, left, top),
    };
  });
}

export function HikageScene({ variant }: HikageSceneProps) {
  const { hour, minute } = useTimeTheme();
  const isNight = hour < 5 || hour >= 19;
  const mode = isNight ? 'night' : 'day';
  const seed = `${variant}:${mode}`;

  const sceneClasses = cn('hikage-scene', `hikage-scene-${variant}`, isNight ? 'hikage-scene-night' : 'hikage-scene-day');

  const particles = useMemo(() => {
    const density = variant === 'preview' ? 1 : variant === 'modal' ? 1.3 : 1.1;
    if (isNight) {
      const background = buildParticles(
        `${seed}:background`,
        {
          count: Math.max(120, Math.round((variant === 'preview' ? 92 : variant === 'modal' ? 180 : 140) * density)),
          fixedSize: variant === 'preview' ? 6.5 : 9.5,
          minSize: variant === 'preview' ? 6.5 : 9.5,
          maxSize: variant === 'preview' ? 6.5 : 9.5,
          minTop: 4,
          maxTop: 92,
          minLeft: 4,
          maxLeft: 96,
          minOpacity: 0.45,
          maxOpacity: 0.98,
          minDuration: 2.6,
          maxDuration: 5.2,
          minDelay: 0,
          maxDelay: 4.6,
          twinkleMin: 0.25,
          twinkleMax: 1,
        },
        'dot',
      );

      const frontCross = buildParticles(
        `${seed}:front-cross`,
        {
          count: Math.max(16, Math.round((variant === 'preview' ? 18 : variant === 'modal' ? 28 : 22) * density)),
          minSize: variant === 'preview' ? 5 : 6,
          maxSize: variant === 'preview' ? 8 : 10,
          minTop: 6,
          maxTop: 46,
          minLeft: 6,
          maxLeft: 94,
          minOpacity: 0.25,
          maxOpacity: 0.72,
          minDuration: 5.4,
          maxDuration: 9.6,
          minDelay: 0,
          maxDelay: 5.6,
          twinkleMin: 0.2,
          twinkleMax: 0.72,
        },
        'cross',
      );

      return { background, frontCross, frontStars: [] as Particle[], frontDayCross: [] as Particle[], cross: [] as Particle[] };
    }

    const cross = buildGridParticles(
      `${seed}:cross-background`,
      {
        count: Math.max(28, Math.round((variant === 'preview' ? 24 : variant === 'modal' ? 36 : 28) * density)),
        minSize: variant === 'preview' ? 5.5 : 6.5,
        maxSize: variant === 'preview' ? 9 : 11,
        minTop: 6,
        maxTop: 48,
        minLeft: 4,
        maxLeft: 96,
        minOpacity: 0.22,
        maxOpacity: 0.58,
        minDuration: 5.4,
        maxDuration: 9.6,
        minDelay: 0,
        maxDelay: 5.6,
        twinkleMin: 0.2,
        twinkleMax: 0.72,
      },
      'cross',
    );

    const frontStars = buildGridParticles(
      `${seed}:front-stars`,
      {
        count: Math.max(12, Math.round((variant === 'preview' ? 14 : variant === 'modal' ? 24 : 18) * density)),
        fixedSize: variant === 'preview' ? 7 : 10,
        minSize: variant === 'preview' ? 7 : 10,
        maxSize: variant === 'preview' ? 7 : 10,
        minTop: 6,
        maxTop: 94,
        minLeft: 6,
        maxLeft: 94,
        minOpacity: 0.24,
        maxOpacity: 0.7,
        minDuration: 6.4,
        maxDuration: 10.2,
        minDelay: 0,
        maxDelay: 5.2,
        twinkleMin: 0.22,
        twinkleMax: 0.78,
        avoidZones: [
          { left: 20, right: 80, top: 6, bottom: 52 },
          { left: 26, right: 74, top: 12, bottom: 64 },
          { left: 34, right: 66, top: 18, bottom: 72 },
        ],
      },
      'dot',
    );

    const frontDayCross = buildParticles(
      `${seed}:front-day-cross`,
      {
        count: Math.max(10, Math.round((variant === 'preview' ? 12 : variant === 'modal' ? 18 : 14) * density)),
        minSize: variant === 'preview' ? 5 : 6,
        maxSize: variant === 'preview' ? 8 : 10,
        minTop: 66,
        maxTop: 95,
        minLeft: 6,
        maxLeft: 94,
        minOpacity: 0.3,
        maxOpacity: 0.72,
        minDuration: 6.2,
        maxDuration: 10.4,
        minDelay: 0,
        maxDelay: 5.2,
        twinkleMin: 0.22,
        twinkleMax: 0.8,
      },
      'cross',
    );

    return { background: [] as Particle[], frontCross: [] as Particle[], frontStars, frontDayCross, cross };
  }, [isNight, seed, variant]);

  return (
    <div className={sceneClasses} aria-hidden="true">
      <div className="hikage-backdrop" />

      <div className="hikage-asset-stage">
        <div className="hikage-asset-frame">
          <div className="hikage-mask-layer hikage-mask-layer-background">
            {isNight ? (
              <>
                <span className="hikage-moon" />
                <div className="hikage-particle-layer hikage-particle-layer-background">
                  {particles.background.map((particle) => (
                    <Image
                      key={particle.id}
                      src="/effects/back_star.png"
                      alt=""
                      width={16}
                      height={16}
                      aria-hidden="true"
                      className="hikage-particle hikage-particle-back-star hikage-particle-back-star-background"
                      style={particle.style}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="hikage-particle-layer hikage-particle-layer-day">
                {particles.cross.map((particle) => (
                  <span
                    key={particle.id}
                    className="hikage-particle hikage-particle-cross hikage-particle-cross-day-back"
                    style={particle.style}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 前面画像と両マスク層を同じ実寸フレームで共有し、位置ずれを防ぐ。 */}
          <Image
            src="/portfolio/hikage.png"
            alt=""
            width={719}
            height={1200}
            priority={variant !== 'preview'}
            sizes="(max-width: 580px) 60vw, (max-width: 1024px) 44vw, 384px"
            className="hikage-figure pixel-image"
          />

          <div className="hikage-mask-layer hikage-mask-layer-front">
            <div className="hikage-particle-layer hikage-particle-layer-front">
              {isNight
                ? particles.frontCross.map((particle) => (
                    <span key={particle.id} className="hikage-particle hikage-particle-cross" style={particle.style} />
                  ))
                : (
                  <>
                    {particles.frontStars.map((particle) => (
                      <Image
                        key={particle.id}
                        src="/effects/back_star.png"
                        alt=""
                        width={16}
                        height={16}
                        aria-hidden="true"
                        className="hikage-particle hikage-particle-back-star hikage-particle-back-star-day"
                        style={particle.style}
                      />
                    ))}
                    {particles.frontDayCross.map((particle) => (
                      <span
                        key={particle.id}
                        className="hikage-particle hikage-particle-cross hikage-particle-cross-day-front"
                        style={particle.style}
                      />
                    ))}
                  </>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
