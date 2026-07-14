'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTimeTheme } from '@/components/theme/TimeThemeProvider';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

type HikageSceneProps = {
  variant: PortfolioMediaVariant;
};

type SceneMode = 'night' | 'day';
type SceneLayer = 'background' | 'front';
type ParticleShape = 'square' | 'cross';

type ParticleDefinition = {
  id: string;
  x: number;
  y: number;
  size: number;
  start: number;
  duration: number;
  maxOpacity: number;
  minOpacity?: number;
  fadeIn?: number;
  hold?: number;
  fadeOut?: number;
  shape: ParticleShape;
  color: string;
};

type MoonDefinition = {
  x: number;
  y: number;
  size: number;
  color: string;
  cutoutOffsetX: number;
  cutoutScale: number;
};

const FIGURE_WIDTH = 719;
const FIGURE_HEIGHT = 1200;
const FIGURE_IMAGE_SRC = '/portfolio/hikage.png';

function particle(definition: ParticleDefinition) {
  return definition;
}

const NIGHT_BACKGROUND_PARTICLES = [
  particle({ id: 'nb-01', x: 0.12, y: 0.08, size: 7, start: 0.1, duration: 3.2, maxOpacity: 0.84, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-02', x: 0.24, y: 0.12, size: 6, start: 1.3, duration: 4.8, maxOpacity: 0.72, shape: 'square', color: '#f6f8ff' }),
  particle({ id: 'nb-03', x: 0.38, y: 0.09, size: 7, start: 0.6, duration: 3.9, maxOpacity: 0.82, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-04', x: 0.51, y: 0.14, size: 6, start: 2.2, duration: 4.5, maxOpacity: 0.68, shape: 'square', color: '#f2f6ff' }),
  particle({ id: 'nb-05', x: 0.67, y: 0.08, size: 7, start: 0.9, duration: 3.6, maxOpacity: 0.8, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-06', x: 0.81, y: 0.14, size: 6, start: 1.9, duration: 4.1, maxOpacity: 0.74, shape: 'square', color: '#f6f8ff' }),
  particle({ id: 'nb-07', x: 0.18, y: 0.23, size: 8, start: 0.3, duration: 4.2, maxOpacity: 0.88, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-08', x: 0.31, y: 0.27, size: 6, start: 1.1, duration: 3.7, maxOpacity: 0.66, shape: 'square', color: '#eef3ff' }),
  particle({ id: 'nb-09', x: 0.46, y: 0.24, size: 7, start: 2.6, duration: 5.1, maxOpacity: 0.76, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-10', x: 0.61, y: 0.3, size: 7, start: 0.8, duration: 4.3, maxOpacity: 0.8, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-11', x: 0.76, y: 0.25, size: 6, start: 1.6, duration: 3.5, maxOpacity: 0.7, shape: 'square', color: '#f6f8ff' }),
  particle({ id: 'nb-12', x: 0.88, y: 0.2, size: 6, start: 0.5, duration: 4.6, maxOpacity: 0.72, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-13', x: 0.13, y: 0.38, size: 7, start: 2.1, duration: 4, maxOpacity: 0.76, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-14', x: 0.27, y: 0.43, size: 6, start: 0.2, duration: 3.4, maxOpacity: 0.68, shape: 'square', color: '#f6f8ff' }),
  particle({ id: 'nb-15', x: 0.42, y: 0.39, size: 8, start: 1.4, duration: 4.9, maxOpacity: 0.84, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-16', x: 0.58, y: 0.47, size: 6, start: 2.9, duration: 4.2, maxOpacity: 0.7, shape: 'square', color: '#eef3ff' }),
  particle({ id: 'nb-17', x: 0.72, y: 0.41, size: 7, start: 0.7, duration: 3.8, maxOpacity: 0.8, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-18', x: 0.86, y: 0.37, size: 6, start: 1.8, duration: 4.7, maxOpacity: 0.72, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-19', x: 0.12, y: 0.56, size: 8, start: 0.4, duration: 5, maxOpacity: 0.8, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-20', x: 0.24, y: 0.63, size: 7, start: 1.2, duration: 4.1, maxOpacity: 0.74, shape: 'square', color: '#f6f8ff' }),
  particle({ id: 'nb-21', x: 0.39, y: 0.58, size: 6, start: 2.4, duration: 3.9, maxOpacity: 0.66, shape: 'square', color: '#eef3ff' }),
  particle({ id: 'nb-22', x: 0.53, y: 0.67, size: 7, start: 0.9, duration: 4.6, maxOpacity: 0.76, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-23', x: 0.68, y: 0.61, size: 8, start: 1.7, duration: 5.2, maxOpacity: 0.86, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-24', x: 0.83, y: 0.56, size: 6, start: 0.1, duration: 3.7, maxOpacity: 0.7, shape: 'square', color: '#f4f7ff' }),
  particle({ id: 'nb-25', x: 0.16, y: 0.74, size: 7, start: 2.2, duration: 4.4, maxOpacity: 0.78, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-26', x: 0.3, y: 0.79, size: 6, start: 0.6, duration: 3.8, maxOpacity: 0.68, shape: 'square', color: '#f6f8ff' }),
  particle({ id: 'nb-27', x: 0.45, y: 0.73, size: 8, start: 1.5, duration: 4.9, maxOpacity: 0.84, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-28', x: 0.59, y: 0.82, size: 7, start: 0.8, duration: 4.2, maxOpacity: 0.76, shape: 'square', color: '#eef3ff' }),
  particle({ id: 'nb-29', x: 0.73, y: 0.77, size: 6, start: 1.9, duration: 3.6, maxOpacity: 0.7, shape: 'square', color: '#ffffff' }),
  particle({ id: 'nb-30', x: 0.87, y: 0.72, size: 7, start: 0.3, duration: 4.7, maxOpacity: 0.8, shape: 'square', color: '#ffffff' }),
];

const NIGHT_FRONT_PARTICLES = [
  particle({ id: 'nf-01', x: 0.28, y: 0.1, size: 30, start: 0.5, duration: 4.8, maxOpacity: 0.58, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'nf-02', x: 0.56, y: 0.16, size: 30, start: 1.9, duration: 5.4, maxOpacity: 0.5, shape: 'cross', color: '#f7f9ff' }),
  particle({ id: 'nf-03', x: 0.78, y: 0.22, size: 30, start: 0.1, duration: 4.2, maxOpacity: 0.54, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'nf-04', x: 0.19, y: 0.36, size: 30, start: 2.4, duration: 5, maxOpacity: 0.46, shape: 'cross', color: '#f7f9ff' }),
  particle({ id: 'nf-05', x: 0.65, y: 0.33, size: 30, start: 1.2, duration: 4.6, maxOpacity: 0.54, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'nf-06', x: 0.84, y: 0.45, size: 30, start: 0.7, duration: 4.9, maxOpacity: 0.48, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'nf-07', x: 0.37, y: 0.58, size: 30, start: 2.7, duration: 5.2, maxOpacity: 0.56, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'nf-08', x: 0.72, y: 0.65, size: 30, start: 1.5, duration: 4.4, maxOpacity: 0.46, shape: 'cross', color: '#f7f9ff' }),
  particle({ id: 'nf-09', x: 0.24, y: 0.76, size: 30, start: 0.9, duration: 5.1, maxOpacity: 0.58, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'nf-10', x: 0.58, y: 0.82, size: 30, start: 2.1, duration: 4.7, maxOpacity: 0.5, shape: 'cross', color: '#ffffff' }),
];

const DAY_BACKGROUND_PARTICLES = [
  particle({ id: 'db-01', x: 0.11, y: 0.14, size: 25, start: 0.2, duration: 4.6, maxOpacity: 0.44, shape: 'cross', color: '#7fa9ed' }),
  particle({ id: 'db-02', x: 0.1, y: 0.40, size: 25, start: 1.1, duration: 5, maxOpacity: 0.38, shape: 'cross', color: '#8fb6f1' }),
  particle({ id: 'db-03', x: 0.8, y: 0.12, size: 25, start: 0.8, duration: 4.2, maxOpacity: 0.48, shape: 'cross', color: '#7fa9ed' }),
  particle({ id: 'db-04', x: 0.9, y: 0.35, size: 25, start: 1.9, duration: 5.6, maxOpacity: 0.4, shape: 'cross', color: '#90b7f3' }),
  particle({ id: 'db-05', x: 0.10, y: 0.42, size: 25, start: 0.4, duration: 4.5, maxOpacity: 0.46, shape: 'cross', color: '#7fa9ed' }),
  particle({ id: 'db-06', x: 0.12, y: 0.19, size: 25, start: 2.2, duration: 5.2, maxOpacity: 0.36, shape: 'cross', color: '#9cc0f6' }),
  particle({ id: 'db-07', x: 0.18, y: 0.31, size: 25, start: 0.7, duration: 4.8, maxOpacity: 0.42, shape: 'cross', color: '#86b0f1' }),
  particle({ id: 'db-08', x: 0.5, y: 0.36, size: 25, start: 1.6, duration: 5.4, maxOpacity: 0.38, shape: 'cross', color: '#8fb6f1' }),
  particle({ id: 'db-09', x: 0.72, y: 0.29, size: 25, start: 0.1, duration: 4, maxOpacity: 0.5, shape: 'cross', color: '#7fa9ed' }),
  particle({ id: 'db-10', x: 0.78, y: 0.37, size: 25, start: 2.5, duration: 5.8, maxOpacity: 0.4, shape: 'cross', color: '#90b7f3' }),
  particle({ id: 'db-11', x: 0.75, y: 0.32, size: 25, start: 1.3, duration: 4.7, maxOpacity: 0.44, shape: 'cross', color: '#86b0f1' }),
  particle({ id: 'db-12', x: 0.88, y: 0.28, size: 25, start: 0.9, duration: 5.1, maxOpacity: 0.34, shape: 'cross', color: '#9cc0f6' }),
  particle({ id: 'db-13', x: 0.80, y: 0.40, size: 25, start: 1.8, duration: 4.9, maxOpacity: 0.42, shape: 'cross', color: '#86b0f1' }),
  particle({ id: 'db-14', x: 0.84, y: 0.25, size: 25, start: 0.5, duration: 5.3, maxOpacity: 0.36, shape: 'cross', color: '#90b7f3' }),
  particle({ id: 'db-15', x: 0.92, y: 0.20, size: 25, start: 2.4, duration: 4.3, maxOpacity: 0.48, shape: 'cross', color: '#7fa9ed' }),
  particle({ id: 'db-16', x: 0.90, y: 0.41, size: 25, start: 1.4, duration: 5.7, maxOpacity: 0.38, shape: 'cross', color: '#8fb6f1' }),
  particle({ id: 'db-17', x: 0.72, y: 0.36, size: 25, start: 0.2, duration: 4.6, maxOpacity: 0.44, shape: 'cross', color: '#86b0f1' }),
  particle({ id: 'db-18', x: 0.85, y: 0.34, size: 25, start: 1.1, duration: 5.2, maxOpacity: 0.34, shape: 'cross', color: '#9cc0f6' }),
];

const DAY_FRONT_PARTICLES = [
  particle({ id: 'df-01', x: 0.2, y: 0.69, size: 30, start: 0.6, duration: 4.8, maxOpacity: 0.56, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-02', x: 0.34, y: 0.75, size: 30, start: 2, duration: 5.2, maxOpacity: 0.48, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-03', x: 0.49, y: 0.7, size: 30, start: 1.2, duration: 4.4, maxOpacity: 0.58, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-04', x: 0.64, y: 0.79, size: 30, start: 0.1, duration: 5, maxOpacity: 0.46, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-05', x: 0.8, y: 0.72, size: 30, start: 1.7, duration: 4.6, maxOpacity: 0.54, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-06', x: 0.26, y: 0.88, size: 30, start: 2.6, duration: 5.4, maxOpacity: 0.44, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-07', x: 0.53, y: 0.9, size: 30, start: 0.8, duration: 4.7, maxOpacity: 0.58, shape: 'cross', color: '#ffffff' }),
  particle({ id: 'df-08', x: 0.74, y: 0.87, size: 30, start: 1.4, duration: 5.1, maxOpacity: 0.46, shape: 'cross', color: '#ffffff' }),
];

const NIGHT_MOON: MoonDefinition = {
  x: 0.105,
  y: 0.08,
  size: 90,
  color: '#ffffff',
  cutoutOffsetX: 0.34,
  cutoutScale: 0.82,
};

const PARTICLE_LIMITS: Record<PortfolioMediaVariant, Record<SceneMode, Record<SceneLayer, number>>> = {
  preview: {
    night: { background: 14, front: 4 },
    day: { background: 10, front: 4 },
  },
  card: {
    night: { background: 20, front: 6 },
    day: { background: 14, front: 5 },
  },
  modal: {
    night: { background: 30, front: 10 },
    day: { background: 18, front: 8 },
  },
};

const SKY_COLORS: Record<SceneMode, string> = {
  night: '#081225',
  day: '#ffffff',
};

function getLayerParticles(mode: SceneMode, layer: SceneLayer, variant: PortfolioMediaVariant) {
  const definitions =
    mode === 'night'
      ? layer === 'background'
        ? NIGHT_BACKGROUND_PARTICLES
        : NIGHT_FRONT_PARTICLES
      : layer === 'background'
        ? DAY_BACKGROUND_PARTICLES
        : DAY_FRONT_PARTICLES;

  return definitions.slice(0, PARTICLE_LIMITS[variant][mode][layer]);
}

function getParticleOpacity(particleDefinition: ParticleDefinition, timeSeconds: number) {
  const fadeIn = particleDefinition.fadeIn ?? 0.16;
  const hold = particleDefinition.hold ?? 0.22;
  const fadeOut = particleDefinition.fadeOut ?? 0.18;
  const hidden = Math.max(0, 1 - fadeIn - hold - fadeOut);
  const progress = ((timeSeconds + particleDefinition.start) % particleDefinition.duration) / particleDefinition.duration;
  const minOpacity = particleDefinition.minOpacity ?? 0;

  if (progress < hidden) {
    return 0;
  }

  const visibleProgress = progress - hidden;

  if (visibleProgress < fadeIn) {
    return particleDefinition.maxOpacity * (visibleProgress / fadeIn);
  }

  if (visibleProgress < fadeIn + hold) {
    return particleDefinition.maxOpacity;
  }

  const fadeOutProgress = (visibleProgress - fadeIn - hold) / fadeOut;
  return minOpacity + (particleDefinition.maxOpacity - minOpacity) * (1 - fadeOutProgress);
}

function drawCross(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const thickness = Math.max(1, Math.round(size / 4));
  const half = size / 2;
  ctx.fillRect(Math.round(x - half), Math.round(y - thickness / 2), Math.round(size), thickness);
  ctx.fillRect(Math.round(x - thickness / 2), Math.round(y - half), thickness, Math.round(size));
}

function drawSquare(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const alignedSize = Math.max(2, Math.round(size));
  const half = alignedSize / 2;
  ctx.fillRect(Math.round(x - half), Math.round(y - half), alignedSize, alignedSize);
}

function drawParticle(ctx: CanvasRenderingContext2D, particleDefinition: ParticleDefinition, width: number, height: number, scale: number, timeSeconds: number) {
  const opacity = getParticleOpacity(particleDefinition, timeSeconds);

  if (opacity <= 0.01) {
    return;
  }

  const x = particleDefinition.x * width;
  const y = particleDefinition.y * height;
  const size = particleDefinition.size * scale;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = particleDefinition.color;

  if (particleDefinition.shape === 'cross') {
    drawCross(ctx, x, y, size);
  } else {
    drawSquare(ctx, x, y, size);
  }

  ctx.restore();
}

function drawMoon(ctx: CanvasRenderingContext2D, moonDefinition: MoonDefinition, width: number, height: number, scale: number, skyColor: string) {
  const x = moonDefinition.x * width;
  const y = moonDefinition.y * height;
  const radius = (moonDefinition.size * scale) / 2;

  ctx.save();
  ctx.fillStyle = moonDefinition.color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = skyColor;
  ctx.beginPath();
  ctx.arc(x + radius * moonDefinition.cutoutOffsetX, y, radius * moonDefinition.cutoutScale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function HikageScene({ variant }: HikageSceneProps) {
  const { hour } = useTimeTheme();
  const mode: SceneMode = hour < 5 || hour >= 19 ? 'night' : 'day';
  const sceneClasses = cn('hikage-scene', `hikage-scene-${variant}`, mode === 'night' ? 'hikage-scene-night' : 'hikage-scene-day');
  const frameRef = useRef<HTMLDivElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const frontCanvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: FIGURE_WIDTH, height: FIGURE_HEIGHT, dpr: 1 });

  const backgroundParticles = useMemo(() => getLayerParticles(mode, 'background', variant), [mode, variant]);
  const frontParticles = useMemo(() => getLayerParticles(mode, 'front', variant), [mode, variant]);

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
    const backgroundCanvas = backgroundCanvasRef.current;
    const frontCanvas = frontCanvasRef.current;

    if (!backgroundCanvas || !frontCanvas) {
      return;
    }

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));

    backgroundCanvas.width = pixelWidth;
    backgroundCanvas.height = pixelHeight;
    frontCanvas.width = pixelWidth;
    frontCanvas.height = pixelHeight;

    const backgroundContext = backgroundCanvas.getContext('2d');
    const frontContext = frontCanvas.getContext('2d');

    if (!backgroundContext || !frontContext) {
      return;
    }

    const scale = canvasSize.width / FIGURE_WIDTH;
    let animationFrameId = 0;

    const render = (timestamp: number) => {
      const timeSeconds = timestamp / 1000;
      const drawWidth = backgroundCanvas.width;
      const drawHeight = backgroundCanvas.height;

      backgroundContext.clearRect(0, 0, drawWidth, drawHeight);
      frontContext.clearRect(0, 0, drawWidth, drawHeight);

      if (mode === 'night') {
        drawMoon(backgroundContext, NIGHT_MOON, drawWidth, drawHeight, scale * canvasSize.dpr, SKY_COLORS[mode]);
      }

      backgroundParticles.forEach((particleDefinition) => {
        drawParticle(backgroundContext, particleDefinition, drawWidth, drawHeight, scale * canvasSize.dpr, timeSeconds);
      });

      frontParticles.forEach((particleDefinition) => {
        drawParticle(frontContext, particleDefinition, drawWidth, drawHeight, scale * canvasSize.dpr, timeSeconds);
      });

      animationFrameId = window.requestAnimationFrame(render);
    };

    animationFrameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [backgroundParticles, canvasSize.dpr, canvasSize.height, canvasSize.width, frontParticles, mode]);

  return (
    <div className={sceneClasses} aria-hidden="true">
      <div className="hikage-backdrop" />

      <div className="hikage-asset-stage">
        <div ref={frameRef} className="hikage-asset-frame">
          <canvas ref={backgroundCanvasRef} className="hikage-canvas-layer hikage-canvas-layer-background" />

          <Image
            src={FIGURE_IMAGE_SRC}
            alt=""
            width={FIGURE_WIDTH}
            height={FIGURE_HEIGHT}
            priority={variant !== 'preview'}
            sizes="(max-width: 580px) 60vw, (max-width: 1024px) 44vw, 384px"
            className="hikage-figure pixel-image"
          />

          <canvas ref={frontCanvasRef} className="hikage-canvas-layer hikage-canvas-layer-front" />
        </div>
      </div>
    </div>
  );
}
