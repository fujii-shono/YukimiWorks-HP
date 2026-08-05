'use client';

/* eslint-disable @next/next/no-img-element -- This static layered artwork intentionally avoids next/image overhead. */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PortfolioMediaVariant } from '@/data/portfolio';
import { cn } from '@/lib/format';

const FIGURE_WIDTH = 681;
const FIGURE_HEIGHT = 1000;
const SHOW_HANABI_STARRY_BACKGROUND = true;
const STARRY_BACKGROUND_COUNT = 180;
const STARRY_BACKGROUND_TOP_RATIO = 0.4;
const STARRY_BACKGROUND_SEED = 20260805;
const HANABI_AMBIENT_AUDIO_SRC = '/portfolio/hanabi/suzumushi.mp3';
const HANABI_AMBIENT_AUDIO_VOLUME = 0.05;
const HANABI_FIREWORK_BURST_AUDIO_SRC = '/portfolio/hanabi/hanabi2.mp3';
const HANABI_FIREWORK_BURST_AUDIO_VOLUME = 0.28;
const FIREWORK_ROCKET_DURATION_SECONDS = 1.6;
const FIREWORKS_PER_LAUNCH = 2;
const FIREWORK_LAUNCH_DELAY_SECONDS = 0.42;
const HANABI_PROGRAM_PHASE_DURATION = 30000;
const HANABI_PROGRAM_WAIT_DURATION = 10000;

const HANABI_FIREWORK_AUDIO = {
  burst: { src: HANABI_FIREWORK_BURST_AUDIO_SRC, volume: HANABI_FIREWORK_BURST_AUDIO_VOLUME },
} as const;

type HanabiMode = 'normal' | 'fireworks';
type FireworkSoundId = keyof typeof HANABI_FIREWORK_AUDIO;
type FireworkColor = { r: number; g: number; b: number };
type FireworkPalette = { outer: FireworkColor; core: FireworkColor };
type FireworkSide = 'left' | 'right';
type FireworkSpecialPattern = 'normal' | 'shape' | 'cascade' | 'rainbow' | 'rapid' | 'finale' | 'program';
type FireworkPattern = 'normal' | 'shape' | 'small' | 'cascade-main' | 'rainbow-small' | 'rapid-small' | 'giant-rainbow';
type FireworkShape = 'cat' | 'rabbit' | 'heart' | 'star';
type HanabiProgramRunPattern = 'normal' | 'shape' | 'rapid' | 'rainbow' | 'cascade';
type FireworkTrailPoint = { x: number; y: number; age: number };
type FireworkTarget = { x: number; y: number; side: FireworkSide };
type DirectFireworkSchedule = {
  time: number;
  x: number;
  y: number;
  pattern: FireworkPattern;
  palette: FireworkPalette;
  burstScale: number;
  shape?: FireworkShape;
};
type FireworkRocket = {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  elapsed: number;
  duration: number;
  launchDelay: number;
  delayElapsed: number;
  fadeElapsed: number;
  fadeDuration: number;
  color: FireworkColor;
  coreColor: FireworkColor;
  pattern: FireworkPattern;
  burstScale: number;
  shape?: FireworkShape;
};
type FireworkBurst = {
  x: number;
  y: number;
  age: number;
  life: number;
  color: FireworkColor;
};
type FireworkParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  age: number;
  life: number;
  size: number;
  color: FireworkColor;
  sparklePhase: number;
  sparkleSpeed: number;
  sparkleEnabled: boolean;
  burstId?: number;
  trail?: FireworkTrailPoint[];
  trailDuration?: number;
  trailInterval?: number;
  trailElapsed?: number;
};

const FIREWORK_PALETTES: FireworkPalette[] = [
  { outer: { r: 255, g: 142, b: 42 }, core: { r: 255, g: 204, b: 58 } },
];
const CASCADE_FIREWORK_PALETTE: FireworkPalette = {
  outer: { r: 246, g: 250, b: 255 },
  core: { r: 255, g: 244, b: 218 },
};
const WHITE_FIREWORK_PALETTE: FireworkPalette = {
  outer: { r: 250, g: 252, b: 255 },
  core: { r: 255, g: 246, b: 224 },
};
const RAINBOW_FIREWORK_PALETTES: FireworkPalette[] = [
  { outer: { r: 255, g: 56, b: 50 }, core: { r: 255, g: 128, b: 72 } },
  { outer: { r: 255, g: 226, b: 70 }, core: { r: 255, g: 246, b: 150 } },
  { outer: { r: 255, g: 142, b: 42 }, core: { r: 255, g: 204, b: 58 } },
  { outer: { r: 255, g: 82, b: 170 }, core: { r: 255, g: 162, b: 216 } },
  { outer: { r: 174, g: 106, b: 255 }, core: { r: 224, g: 190, b: 255 } },
  { outer: { r: 80, g: 166, b: 255 }, core: { r: 176, g: 224, b: 255 } },
];
const GIANT_RAINBOW_FIREWORK_PALETTE: FireworkPalette = {
  outer: { r: 255, g: 96, b: 180 },
  core: { r: 140, g: 210, b: 255 },
};
const FIREWORK_SHAPES: FireworkShape[] = ['cat', 'rabbit', 'heart', 'star'];

const HANABI_LAYERS = [
  { src: '/portfolio/hanabi/base.png', alt: '花火のイラスト', className: 'hanabi-layer-base' },
  { src: '/portfolio/hanabi/highlight-1.png', alt: '', className: 'hanabi-layer-highlight' },
  { src: '/portfolio/hanabi/hair-highlight-1.png', alt: '', className: 'hanabi-layer-hair-highlight' },
];

const HANABI_FIREWORK_LAYERS = [
  { src: '/portfolio/hanabi/hair-highlight-2.png', className: 'hanabi-layer-firework-hair-highlight' },
  { src: '/portfolio/hanabi/apple-highlight.png', className: 'hanabi-layer-firework-apple-highlight' },
  { src: '/portfolio/hanabi/hand-highlight.png', className: 'hanabi-layer-firework-hand-highlight' },
  { src: '/portfolio/hanabi/highlight-2.png', className: 'hanabi-layer-firework-highlight' },
];

const HANABI_LIGHT_PARTICLES = [
  { x: 0.65, y: 0.08, size: 3.4 },
  { x: 0.15, y: 0.2, size: 1.4 },
  { x: 0.49, y: 0.25, size: 2.7 },
  { x: 0.68, y: 0.41, size: 1.4 },
  { x: 0.13, y: 0.57, size: 1.4 },
  { x: 0.61, y: 0.65, size: 1.4 },
  { x: 0.90, y: 0.76, size: 2.6 },
  { x: 0.11, y: 0.87, size: 2.6 },
];

function createSeededRandom(seed: number) {
  let value = seed;

  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function createStarryBackground() {
  const random = createSeededRandom(STARRY_BACKGROUND_SEED);

  return Array.from({ length: STARRY_BACKGROUND_COUNT }, () => ({
    x: random(),
    y: 0.02 + random() * STARRY_BACKGROUND_TOP_RATIO,
    size: 0.65 + random() * 1.15,
    opacity: 0.34 + random() * 0.58,
  }));
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randomInt(min: number, max: number) {
  return Math.floor(randomBetween(min, max + 1));
}

function randomItem<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

function toRgba(color: FireworkColor, alpha: number) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${Math.max(0, Math.min(alpha, 1))})`;
}

function toRgb(color: FireworkColor) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

function particleVisibleUntilEnd(age: number, life: number) {
  return age / life < 0.96;
}

function createAudioContext() {
  const AudioContextConstructor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  return AudioContextConstructor ? new AudioContextConstructor() : null;
}

function createFireworkRocket(
  width: number,
  height: number,
  pattern: FireworkPattern,
  targetX: number,
  launchDelay: number,
  paletteOverride?: FireworkPalette,
): FireworkRocket {
  const targetY = randomBetween(height * 0.04, height * 0.22);
  const startY = height * 0.5;
  const palette =
    paletteOverride ??
    (pattern === 'shape'
      ? randomItem(RAINBOW_FIREWORK_PALETTES)
      : pattern === 'cascade-main'
        ? CASCADE_FIREWORK_PALETTE
        : pattern === 'rainbow-small' || pattern === 'rapid-small'
          ? randomItem(RAINBOW_FIREWORK_PALETTES)
          : randomItem(FIREWORK_PALETTES));

  return {
    x: targetX,
    y: startY,
    startX: targetX,
    startY,
    targetX,
    targetY,
    elapsed: 0,
    duration: FIREWORK_ROCKET_DURATION_SECONDS,
    launchDelay,
    delayElapsed: 0,
    fadeElapsed: 0,
    fadeDuration: randomBetween(0.42, 0.62),
    color: palette.outer,
    coreColor: palette.core,
    pattern,
    burstScale: pattern === 'small' || pattern === 'rainbow-small' ? 0.54 : 1,
    shape: pattern === 'shape' ? randomItem(FIREWORK_SHAPES) : undefined,
  };
}

function createFireworkRocketAt(
  width: number,
  height: number,
  pattern: FireworkPattern,
  targetX: number,
  targetY: number,
  launchDelay: number,
  paletteOverride?: FireworkPalette,
): FireworkRocket {
  const rocket = createFireworkRocket(width, height, pattern, targetX, launchDelay, paletteOverride);
  rocket.targetY = targetY;
  rocket.burstScale = pattern === 'small' || pattern === 'rainbow-small' ? 0.46 : pattern === 'cascade-main' ? 1.34 : rocket.burstScale;

  return rocket;
}

function createSeparatedFireworkTargets(width: number, height: number, upperSide: FireworkSide): FireworkTarget[] {
  const left = randomBetween(width * 0.16, width * 0.34);
  const right = randomBetween(width * 0.66, width * 0.84);
  const targets = [
    { side: 'left' as const, x: left, y: upperSide === 'left' ? randomBetween(height * 0.04, height * 0.12) : randomBetween(height * 0.16, height * 0.26) },
    { side: 'right' as const, x: right, y: upperSide === 'right' ? randomBetween(height * 0.04, height * 0.12) : randomBetween(height * 0.16, height * 0.26) },
  ];

  return targets;
}

function createFireworkParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  gravity: number,
  drag: number,
  life: number,
  size: number,
  color: FireworkColor,
  trailDuration?: number,
  sparkleEnabled = true,
  burstId?: number,
): FireworkParticle {
  return {
    x,
    y,
    vx,
    vy,
    gravity,
    drag,
    age: 0,
    life,
    color,
    size,
    sparklePhase: randomBetween(0, Math.PI * 2),
    sparkleSpeed: randomBetween(18, 32),
    sparkleEnabled,
    burstId,
    trail: trailDuration ? [] : undefined,
    trailDuration,
    trailInterval: trailDuration ? randomBetween(0.018, 0.034) : undefined,
    trailElapsed: 0,
  };
}

function createShapePoints(shape: FireworkShape, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const t = index / count;
    const angle = t * Math.PI * 2;

    if (shape === 'heart') {
      const x = (16 * Math.sin(angle) ** 3) / 18;
      const y = (13 * Math.cos(angle) - 5 * Math.cos(2 * angle) - 2 * Math.cos(3 * angle) - Math.cos(4 * angle)) / 18;
      return { x, y: y - 0.08 };
    }

    if (shape === 'star') {
      const point = Math.floor(t * 10);
      const local = t * 10 - point;
      const currentRadius = point % 2 === 0 ? 1 : 0.45;
      const nextRadius = point % 2 === 0 ? 0.45 : 1;
      const radius = currentRadius + (nextRadius - currentRadius) * local;
      const starAngle = angle - Math.PI / 2;
      return { x: Math.cos(starAngle) * radius, y: -Math.sin(starAngle) * radius };
    }

    if (shape === 'cat') {
      if (t < 0.16) {
        const earT = t / 0.16;
        return { x: -0.62 + earT * 0.4, y: 0.48 + Math.sin(earT * Math.PI) * 0.52 };
      }
      if (t < 0.32) {
        const earT = (t - 0.16) / 0.16;
        return { x: 0.22 + earT * 0.4, y: 0.48 + Math.sin(earT * Math.PI) * 0.52 };
      }
      const faceAngle = ((t - 0.32) / 0.68) * Math.PI * 2;
      return { x: Math.cos(faceAngle) * 0.82, y: Math.sin(faceAngle) * 0.62 };
    }

    if (t < 0.28) {
      const earAngle = -Math.PI / 2 + (t / 0.28) * Math.PI * 2;
      return { x: -0.34 + Math.cos(earAngle) * 0.22, y: 0.62 + Math.sin(earAngle) * 0.58 };
    }
    if (t < 0.56) {
      const earAngle = -Math.PI / 2 + ((t - 0.28) / 0.28) * Math.PI * 2;
      return { x: 0.34 + Math.cos(earAngle) * 0.22, y: 0.62 + Math.sin(earAngle) * 0.58 };
    }
    const faceAngle = ((t - 0.56) / 0.44) * Math.PI * 2;
    return { x: Math.cos(faceAngle) * 0.7, y: Math.sin(faceAngle) * 0.5 - 0.08 };
  });
}

function createShapedFireworkParticles(
  x: number,
  y: number,
  color: FireworkColor,
  coreColor: FireworkColor,
  shape: FireworkShape,
  width: number,
  height: number,
) {
  const particles: FireworkParticle[] = [];
  const shapePoints = createShapePoints(shape, 320);
  const baseSpeed = randomBetween(width * 0.3, width * 0.42);
  const scaleX = shape === 'heart' ? 1.08 : 1;
  const scaleY = shape === 'rabbit' ? 1.06 : 0.92;

  shapePoints.forEach((point) => {
    const jitterX = randomBetween(-0.028, 0.028);
    const jitterY = randomBetween(-0.028, 0.028);
    const vx = (point.x * scaleX + jitterX) * baseSpeed;
    const vy = -(point.y * scaleY + jitterY) * baseSpeed;
    const particleColor = Math.random() < 0.32 ? coreColor : color;

    particles.push(
      createFireworkParticle(
        x,
        y,
        vx,
        vy,
        randomBetween(height * 0.004, height * 0.01),
        randomBetween(0.978, 0.988),
        randomBetween(3.0, 4.2),
        randomBetween(0.9, 1.7),
        particleColor,
      ),
    );
  });

  for (let i = 0; i < 120; i += 1) {
    const point = randomItem(shapePoints);
    const jitterX = randomBetween(-0.04, 0.04);
    const jitterY = randomBetween(-0.04, 0.04);
    const speedScale = randomBetween(0.88, 1.04);

    particles.push(
      createFireworkParticle(
        x,
        y,
        (point.x * scaleX + jitterX) * baseSpeed * speedScale,
        -(point.y * scaleY + jitterY) * baseSpeed * speedScale,
        randomBetween(height * 0.004, height * 0.01),
        randomBetween(0.978, 0.988),
        randomBetween(2.8, 3.8),
        randomBetween(0.75, 1.45),
        coreColor,
      ),
    );
  }

  return particles;
}

function createCascadeMainFireworkParticles(x: number, y: number, color: FireworkColor, coreColor: FireworkColor, width: number, height: number) {
  const particles: FireworkParticle[] = [];
  const baseSpeed = randomBetween(width * 0.44, width * 0.62);

  for (let i = 0; i < 460; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = baseSpeed * randomBetween(0.18, 0.82);
    const fallBias = height * randomBetween(0.04, 0.14);
    const particleColor = Math.random() < 0.36 ? coreColor : color;

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed * 0.62 + fallBias,
        randomBetween(height * 0.018, height * 0.032),
        randomBetween(0.986, 0.993),
        randomBetween(4.2, 5.8),
        randomBetween(1.0, 2.1),
        particleColor,
        randomBetween(1.15, 1.7),
        false,
      ),
    );
  }

  return particles;
}

function createGiantRainbowFireworkParticles(x: number, y: number, width: number, height: number) {
  const particles: FireworkParticle[] = [];
  const particleCount = 280;
  const middleCount = 150;
  const innerCount = 72;
  const whiteCoreCount = 210;
  const whiteTrailCount = 64;
  const baseSpeed = randomBetween(width * 0.58, width * 0.74);
  const whiteTrail = { r: 250, g: 252, b: 255 };

  for (let i = 0; i < particleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / particleCount + randomBetween(-0.014, 0.014);
    const speed = baseSpeed * randomBetween(0.76, 1.08);
    const palette = RAINBOW_FIREWORK_PALETTES[i % RAINBOW_FIREWORK_PALETTES.length];

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.01, height * 0.016),
        randomBetween(0.974, 0.984),
        randomBetween(4.8, 6.6),
        randomBetween(0.9, 1.8),
        palette.outer,
      ),
    );
  }

  for (let i = 0; i < middleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / middleCount + randomBetween(-0.03, 0.03);
    const speed = baseSpeed * randomBetween(0.42, 0.68);
    const palette = RAINBOW_FIREWORK_PALETTES[(i + 2) % RAINBOW_FIREWORK_PALETTES.length];

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.008, height * 0.014),
        randomBetween(0.976, 0.986),
        randomBetween(4.4, 6.0),
        randomBetween(0.85, 1.6),
        palette.outer,
      ),
    );
  }

  for (let i = 0; i < innerCount; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = baseSpeed * randomBetween(0.1, 0.24);
    const palette = RAINBOW_FIREWORK_PALETTES[(i + 4) % RAINBOW_FIREWORK_PALETTES.length];

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.006, height * 0.012),
        randomBetween(0.978, 0.988),
        randomBetween(3.8, 5.4),
        randomBetween(0.8, 1.4),
        palette.core,
      ),
    );
  }

  for (let i = 0; i < whiteCoreCount; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = baseSpeed * randomBetween(0.08, 0.5);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.004, height * 0.01),
        randomBetween(0.976, 0.988),
        randomBetween(4.2, 6.0),
        randomBetween(0.75, 1.45),
        WHITE_FIREWORK_PALETTE.core,
      ),
    );
  }

  for (let i = 0; i < whiteTrailCount; i += 1) {
    const angle = (Math.PI * 2 * i) / whiteTrailCount + randomBetween(-0.025, 0.025);
    const speed = baseSpeed * randomBetween(0.9, 1.16);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        height * randomBetween(0.001, 0.004),
        randomBetween(0.992, 0.996),
        randomBetween(4.8, 6.6),
        randomBetween(1.0, 1.55),
        whiteTrail,
        randomBetween(1.6, 2.2),
        false,
      ),
    );
  }

  return particles;
}

function createStraightTrailParticles(x: number, y: number, width: number, height: number) {
  const particles: FireworkParticle[] = [];
  const baseSpeed = randomBetween(width * 0.24, width * 0.32);
  const white = { r: 248, g: 252, b: 255 };

  for (let i = 0; i < 44; i += 1) {
    const angle = (Math.PI * 2 * i) / 44 + randomBetween(-0.03, 0.03);
    const speed = baseSpeed * randomBetween(0.86, 1.12);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        height * randomBetween(0.001, 0.004),
        randomBetween(0.992, 0.996),
        randomBetween(3.0, 4.2),
        randomBetween(0.9, 1.4),
        white,
        randomBetween(1.0, 1.45),
        false,
      ),
    );
  }

  return particles;
}

function explodeFirework(
  x: number,
  y: number,
  color: FireworkColor,
  coreColor: FireworkColor,
  width: number,
  height: number,
  pattern: FireworkPattern,
  burstScale: number,
  shape?: FireworkShape,
) {
  const burst: FireworkBurst = {
    x,
    y,
    color,
    age: 0,
    life: randomBetween(2.1, 2.8),
  };
  const particles: FireworkParticle[] = [];

  if (pattern === 'shape' && shape) {
    return { burst, particles: createShapedFireworkParticles(x, y, color, coreColor, shape, width, height) };
  }

  if (pattern === 'cascade-main') {
    return { burst, particles: createCascadeMainFireworkParticles(x, y, color, coreColor, width, height) };
  }

  if (pattern === 'giant-rainbow') {
    burst.life = randomBetween(4.8, 6.2);
    const giantParticles = createGiantRainbowFireworkParticles(x, y, width, height);
    const cascadeParticles = createCascadeMainFireworkParticles(
      x,
      y,
      CASCADE_FIREWORK_PALETTE.outer,
      CASCADE_FIREWORK_PALETTE.core,
      width,
      height,
    );
    cascadeParticles.forEach((particle) => {
      particle.life *= 1.18;
    });

    return { burst, particles: [...giantParticles, ...cascadeParticles] };
  }

  const particleCount = Math.round(randomInt(150, 200) * burstScale);
  const middleCount = Math.round(randomInt(70, 96) * burstScale);
  const innerCount = Math.round(randomInt(28, 44) * burstScale);
  const whiteCoreCount = Math.round(randomInt(130, 170) * burstScale);
  const baseSpeed = randomBetween(width * 0.36, width * 0.54) * burstScale;

  for (let i = 0; i < particleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / particleCount + randomBetween(-0.018, 0.018);
    const speed = baseSpeed * randomBetween(0.76, 1.1);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.01, height * 0.016),
        randomBetween(0.974, 0.984),
        randomBetween(3.4, 4.8),
        randomBetween(0.9, 1.8),
        color,
      ),
    );
  }

  for (let i = 0; i < middleCount; i += 1) {
    const angle = (Math.PI * 2 * i) / middleCount + randomBetween(-0.04, 0.04);
    const speed = baseSpeed * randomBetween(0.42, 0.68);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.008, height * 0.014),
        randomBetween(0.976, 0.986),
        randomBetween(2.8, 4.0),
        randomBetween(0.85, 1.6),
        color,
      ),
    );
  }

  for (let i = 0; i < innerCount; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = baseSpeed * randomBetween(0.1, 0.24);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.006, height * 0.012),
        randomBetween(0.978, 0.988),
        randomBetween(2.1, 3.2),
        randomBetween(0.8, 1.4),
        color,
      ),
    );
  }

  for (let i = 0; i < whiteCoreCount; i += 1) {
    const angle = randomBetween(0, Math.PI * 2);
    const speed = baseSpeed * randomBetween(0.08, 0.5);

    particles.push(
      createFireworkParticle(
        x,
        y,
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        randomBetween(height * 0.004, height * 0.01),
        randomBetween(0.976, 0.988),
        randomBetween(2.2, 3.6),
        randomBetween(0.75, 1.45),
        coreColor,
      ),
    );
  }

  if (pattern === 'rainbow-small') {
    particles.push(...createStraightTrailParticles(x, y, width, height));
  }

  return { burst, particles };
}

function drawFireworkRocket(context: CanvasRenderingContext2D, rocket: FireworkRocket, dt: number) {
  if (rocket.delayElapsed < rocket.launchDelay) {
    rocket.delayElapsed += dt;
    return false;
  }

  rocket.elapsed += dt;
  const t = Math.min(rocket.elapsed / rocket.duration, 1);
  const easedProgress = 1 - (1 - t) ** 2.4;
  const reachedTarget = t >= 1;

  rocket.x = rocket.startX;
  rocket.y = rocket.startY + (rocket.targetY - rocket.startY) * easedProgress;
  if (reachedTarget) {
    rocket.fadeElapsed += dt;
  }

  const fadeProgress = reachedTarget ? Math.min(rocket.fadeElapsed / rocket.fadeDuration, 1) : 0;
  const fadeInProgress = Math.min(t / 0.26, 1);
  const alphaScale = fadeInProgress * (1 - fadeProgress);

  context.save();
  context.beginPath();
  context.fillStyle = toRgba(rocket.color, 0.96 * alphaScale);
  context.arc(Math.round(rocket.x), Math.round(rocket.y), 3, 0, Math.PI * 2);
  context.fill();
  context.restore();

  return reachedTarget && fadeProgress >= 1;
}

function drawFireworkBurst(context: CanvasRenderingContext2D, burst: FireworkBurst, dt: number) {
  burst.age += dt;

  return burst.age >= burst.life;
}

function drawFireworkParticle(context: CanvasRenderingContext2D, particle: FireworkParticle, dt: number) {
  const progress = Math.min(particle.age / particle.life, 1);
  const hasTrail = Boolean(particle.trailDuration);
  const settleDrag = hasTrail ? (progress > 0.42 ? 0.972 : particle.drag) : progress > 0.48 ? 0.91 : particle.drag;
  const gravityScale = hasTrail ? (progress > 0.38 ? 0.82 : 1) : progress > 0.52 ? 0.24 : 1;
  const trailDuration = particle.trailDuration;

  if (particle.trail && trailDuration && particle.trailInterval) {
    particle.trailElapsed = (particle.trailElapsed ?? 0) + dt;
    if (particle.trailElapsed >= particle.trailInterval) {
      particle.trail.push({ x: particle.x, y: particle.y, age: 0 });
      particle.trailElapsed = 0;
    }
    particle.trail.forEach((point) => {
      point.age += dt;
    });
    particle.trail = particle.trail.filter((point) => point.age < trailDuration);
  }

  particle.vx *= Math.pow(settleDrag, dt * 60);
  particle.vy *= Math.pow(settleDrag, dt * 60);
  particle.vy += particle.gravity * gravityScale * dt;
  particle.x += particle.vx * dt;
  particle.y += particle.vy * dt;
  particle.age += dt;

  if (!particleVisibleUntilEnd(particle.age, particle.life)) return true;
  if (particle.sparkleEnabled && progress > 0.72 && Math.sin(particle.age * particle.sparkleSpeed + particle.sparklePhase) < -0.18) return false;

  context.save();
  context.globalCompositeOperation = 'lighter';

  if (particle.trail && trailDuration) {
    particle.trail.forEach((point) => {
      const trailProgress = point.age / trailDuration;
      context.beginPath();
      context.fillStyle = toRgba(particle.color, 0.22 * (1 - trailProgress));
      context.arc(Math.round(point.x), Math.round(point.y), Math.max(1, Math.round(particle.size)), 0, Math.PI * 2);
      context.fill();
    });
  }

  context.beginPath();
  context.fillStyle = toRgba(particle.color, 0.16);
  context.arc(Math.round(particle.x), Math.round(particle.y), Math.max(2.4, particle.size * 3.2), 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.fillStyle = toRgb(particle.color);
  context.arc(Math.round(particle.x), Math.round(particle.y), Math.max(1, Math.round(particle.size)), 0, Math.PI * 2);
  context.fill();
  context.restore();

  return particle.age >= particle.life;
}

export function HanabiScene({ variant }: { variant: PortfolioMediaVariant }) {
  const starryCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fireworkCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientAudioPlayingRef = useRef(false);
  const fireworkAudioContextRef = useRef<AudioContext | null>(null);
  const fireworkAudioBuffersRef = useRef<Partial<Record<FireworkSoundId, AudioBuffer>>>({});
  const fireworkAudioLoadPromiseRef = useRef<Promise<void> | null>(null);
  const fireworkActiveRef = useRef(false);
  const fireworkExplosionActiveRef = useRef(false);
  const specialPatternRef = useRef<FireworkSpecialPattern>('normal');
  const patternVersionRef = useRef(0);
  const [canvasSize, setCanvasSize] = useState({ width: FIGURE_WIDTH, height: FIGURE_HEIGHT, dpr: 1 });
  const [ambientAudioPlaying, setAmbientAudioPlaying] = useState(false);
  const [hanabiMode, setHanabiMode] = useState<HanabiMode>('normal');
  const [specialPattern, setSpecialPattern] = useState<FireworkSpecialPattern>('normal');
  const [fireworkHighlightActive, setFireworkHighlightActive] = useState(false);
  const [fireworkExplosionActive, setFireworkExplosionActive] = useState(false);
  const starryBackground = useMemo(() => createStarryBackground(), []);
  const particleMotion = useMemo(
    () =>
      HANABI_LIGHT_PARTICLES.map(() => ({
        phaseX: Math.random() * Math.PI * 2,
        phaseY: Math.random() * Math.PI * 2,
        speedX: 0.45 + Math.random() * 0.35,
        speedY: 0.35 + Math.random() * 0.45,
        driftX: 4 + Math.random() * 7,
        driftY: 5 + Math.random() * 8,
        opacityPhase: Math.random() * Math.PI * 2,
      })),
    [],
  );

  const ensureFireworkAudio = useCallback(() => {
    if (!fireworkAudioContextRef.current) {
      fireworkAudioContextRef.current = createAudioContext();
    }

    const audioContext = fireworkAudioContextRef.current;
    if (!audioContext) return Promise.resolve();

    const resumePromise = audioContext.state === 'suspended' ? audioContext.resume().catch(() => undefined) : Promise.resolve();
    if (!fireworkAudioLoadPromiseRef.current) {
      fireworkAudioLoadPromiseRef.current = Promise.all(
        (Object.entries(HANABI_FIREWORK_AUDIO) as [FireworkSoundId, (typeof HANABI_FIREWORK_AUDIO)[FireworkSoundId]][]).map(async ([id, sound]) => {
          if (fireworkAudioBuffersRef.current[id]) return;

          const response = await fetch(sound.src);
          const arrayBuffer = await response.arrayBuffer();
          fireworkAudioBuffersRef.current[id] = await audioContext.decodeAudioData(arrayBuffer);
        }),
      )
        .then(() => undefined)
        .catch(() => {
          fireworkAudioLoadPromiseRef.current = null;
        });
    }

    return resumePromise.then(() => fireworkAudioLoadPromiseRef.current ?? undefined);
  }, []);

  const playAmbientAudio = useCallback((audio: HTMLAudioElement, options?: { reload?: boolean }) => {
    audio.volume = HANABI_AMBIENT_AUDIO_VOLUME;
    audio.muted = false;

    if (options?.reload) {
      audio.load();
    }

    try {
      void audio
        .play()
        .then(() => {
          ambientAudioPlayingRef.current = true;
          setAmbientAudioPlaying(true);
          void ensureFireworkAudio();
        })
        .catch(() => {
          audio.pause();
          ambientAudioPlayingRef.current = false;
          setAmbientAudioPlaying(false);
        });
    } catch {
      audio.pause();
      ambientAudioPlayingRef.current = false;
      setAmbientAudioPlaying(false);
    }
  }, [ensureFireworkAudio]);

  const playFireworkSound = useCallback((id: FireworkSoundId) => {
    if (!ambientAudioPlayingRef.current) return;

    const audioContext = fireworkAudioContextRef.current;
    const buffer = fireworkAudioBuffersRef.current[id];
    if (!audioContext || !buffer) {
      void ensureFireworkAudio();
      return;
    }

    const playBuffer = () => {
      const source = audioContext.createBufferSource();
      const gain = audioContext.createGain();
      source.buffer = buffer;
      gain.gain.value = HANABI_FIREWORK_AUDIO[id].volume;
      source.connect(gain);
      gain.connect(audioContext.destination);
      source.start();
    };

    if (audioContext.state === 'suspended') {
      void audioContext.resume().then(playBuffer).catch(() => undefined);
      return;
    }

    playBuffer();
  }, [ensureFireworkAudio]);

  useEffect(() => {
    if (variant !== 'modal') return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = HANABI_AMBIENT_AUDIO_VOLUME;

    const handlePlay = () => {
      ambientAudioPlayingRef.current = true;
      setAmbientAudioPlaying(true);
    };
    const handlePause = () => {
      ambientAudioPlayingRef.current = false;
      setAmbientAudioPlaying(false);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.pause();
      audio.currentTime = 0;
      ambientAudioPlayingRef.current = false;
      if (fireworkAudioContextRef.current && fireworkAudioContextRef.current.state !== 'closed') {
        void fireworkAudioContextRef.current.close().catch(() => undefined);
      }
      fireworkAudioContextRef.current = null;
      fireworkAudioBuffersRef.current = {};
      fireworkAudioLoadPromiseRef.current = null;
      setAmbientAudioPlaying(false);
    };
  }, [variant]);

  const handleAmbientAudioToggle = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (ambientAudioPlaying) {
      audio.pause();
      ambientAudioPlayingRef.current = false;
      setAmbientAudioPlaying(false);
      return;
    }

    void ensureFireworkAudio();
    playAmbientAudio(audio, { reload: audio.readyState === HTMLMediaElement.HAVE_NOTHING });
  };

  const toggleSpecialPattern = useCallback((pattern: Exclude<FireworkSpecialPattern, 'normal'>) => {
    setSpecialPattern((current) => {
      const next = current === pattern ? 'normal' : pattern;
      specialPatternRef.current = next;
      patternVersionRef.current += 1;
      return next;
    });
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    const updateCanvasSize = () => {
      const rect = frame.getBoundingClientRect();
      setCanvasSize({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
        dpr: Math.min(window.devicePixelRatio || 1, 2),
      });
    };

    updateCanvasSize();

    const resizeObserver = new ResizeObserver(updateCanvasSize);
    resizeObserver.observe(frame);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    const canvas = starryCanvasRef.current;
    if (!canvas) return;

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    context.clearRect(0, 0, pixelWidth, pixelHeight);
    if (!SHOW_HANABI_STARRY_BACKGROUND) return;

    context.save();
    context.scale(canvasSize.dpr, canvasSize.dpr);

    const scale = canvasSize.width / FIGURE_WIDTH;

    starryBackground.forEach((star) => {
      context.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
      context.beginPath();
      context.arc(
        Math.round(star.x * canvasSize.width),
        Math.round(star.y * canvasSize.height),
        Math.max(0.8, Math.round(star.size * scale * 2) / 2),
        0,
        Math.PI * 2,
      );
      context.fill();
    });

    context.restore();
  }, [canvasSize.dpr, canvasSize.height, canvasSize.width, starryBackground]);

  useEffect(() => {
    const canvas = fireworkCanvasRef.current;
    if (!canvas) return;

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    const setFireworkActive = (active: boolean) => {
      if (fireworkActiveRef.current === active) return;
      fireworkActiveRef.current = active;
      setFireworkHighlightActive(active);
    };
    const setFireworkExplosion = (active: boolean) => {
      if (fireworkExplosionActiveRef.current === active) return;
      fireworkExplosionActiveRef.current = active;
      setFireworkExplosionActive(active);
    };

    context.clearRect(0, 0, pixelWidth, pixelHeight);

    if (hanabiMode !== 'fireworks') {
      setFireworkActive(false);
      setFireworkExplosion(false);
      return;
    }

    const rockets: FireworkRocket[] = [];
    const bursts: FireworkBurst[] = [];
    const particles: FireworkParticle[] = [];
    const directFireworkQueue: DirectFireworkSchedule[] = [];
    let animationFrameId = 0;
    let previousTime = performance.now();
    let nextLaunchTime = previousTime;
    let nextRapidBatchTime = previousTime;
    let finaleStepStartTime = previousTime;
    let finaleWaitUntil = 0;
    let finalePhase = -1;
    let finalePhaseScheduled = false;
    let finaleComplete = false;
    let nextBurstId = 1;
    let upperSide: FireworkSide = 'left';
    let orangeSide: FireworkSide = 'left';
    let seenPatternVersion = patternVersionRef.current;
    let programStepIndex = 0;
    let programStepStartTime = previousTime;

    const launchDefaultFireworks = (pattern: Extract<FireworkPattern, 'normal' | 'shape'>) => {
      const targets = createSeparatedFireworkTargets(canvasSize.width, canvasSize.height, upperSide);

      targets.slice(0, FIREWORKS_PER_LAUNCH).forEach((target, index) => {
        const launchDelay = index === 0 ? 0 : randomBetween(0.12, FIREWORK_LAUNCH_DELAY_SECONDS);
        const palette =
          pattern === 'shape' ? randomItem(RAINBOW_FIREWORK_PALETTES) : target.side === orangeSide ? FIREWORK_PALETTES[0] : randomItem(RAINBOW_FIREWORK_PALETTES);
        const rocket = createFireworkRocketAt(canvasSize.width, canvasSize.height, pattern, target.x, target.y, launchDelay, palette);
        rockets.push(rocket);
      });

      upperSide = upperSide === 'left' ? 'right' : 'left';
      if (pattern === 'normal') {
        orangeSide = orangeSide === 'left' ? 'right' : 'left';
      }
    };

    const launchCascadeFireworks = () => {
      const cascadeRockets = [
        createFireworkRocketAt(
          canvasSize.width,
          canvasSize.height,
          'small',
          randomBetween(canvasSize.width * 0.08, canvasSize.width * 0.22),
          randomBetween(canvasSize.height * 0.35, canvasSize.height * 0.45),
          0,
        ),
        createFireworkRocketAt(
          canvasSize.width,
          canvasSize.height,
          'small',
          randomBetween(canvasSize.width * 0.78, canvasSize.width * 0.92),
          randomBetween(canvasSize.height * 0.38, canvasSize.height * 0.48),
          0,
        ),
        createFireworkRocketAt(
          canvasSize.width,
          canvasSize.height,
          'cascade-main',
          randomBetween(canvasSize.width * 0.42, canvasSize.width * 0.58),
          randomBetween(canvasSize.height * 0.025, canvasSize.height * 0.055),
          0,
        ),
      ];
      cascadeRockets.forEach((rocket) => {
        rockets.push(rocket);
      });
    };

    const launchRainbowFireworks = () => {
      const targets = [
        {
          x: randomBetween(canvasSize.width * 0.42, canvasSize.width * 0.58),
          y: randomBetween(canvasSize.height * 0.07, canvasSize.height * 0.14),
          delay: 0,
        },
        {
          x: randomBetween(canvasSize.width * 0.08, canvasSize.width * 0.22),
          y: randomBetween(canvasSize.height * 0.24, canvasSize.height * 0.38),
          delay: randomBetween(0.28, 0.58),
        },
        {
          x: randomBetween(canvasSize.width * 0.78, canvasSize.width * 0.92),
          y: randomBetween(canvasSize.height * 0.26, canvasSize.height * 0.4),
          delay: randomBetween(0.62, 0.98),
        },
      ];

      targets.forEach((target) => {
        const rocket = createFireworkRocketAt(canvasSize.width, canvasSize.height, 'rainbow-small', target.x, target.y, target.delay);
        rockets.push(rocket);
      });
    };

    const explodeDirectFirework = (schedule: DirectFireworkSchedule) => {
      const { burst, particles: newParticles } = explodeFirework(
        schedule.x,
        schedule.y,
        schedule.palette.outer,
        schedule.palette.core,
        canvasSize.width,
        canvasSize.height,
        schedule.pattern,
        schedule.burstScale,
        schedule.shape,
      );
      const burstId = nextBurstId;
      nextBurstId += 1;
      newParticles.forEach((particle) => {
        particle.burstId = burstId;
      });
      playFireworkSound('burst');
      bursts.push(burst);
      particles.push(...newParticles);
    };

    const scheduleRapidFireworkBatch = (
      timestamp: number,
      overrideSchedule?: (index: number, schedule: DirectFireworkSchedule) => Partial<DirectFireworkSchedule>,
    ) => {
      const baseDelay = randomBetween(90, 180);

      for (let i = 0; i < 3; i += 1) {
        const schedule: DirectFireworkSchedule = {
          time: timestamp + i * baseDelay + randomBetween(0, 120),
          x: randomBetween(canvasSize.width * 0.12, canvasSize.width * 0.88),
          y: randomBetween(canvasSize.height * 0.08, canvasSize.height * 0.36),
          pattern: 'rapid-small',
          palette: randomItem(RAINBOW_FIREWORK_PALETTES),
          burstScale: 1,
        };

        directFireworkQueue.push({ ...schedule, ...overrideSchedule?.(i, schedule) });
      }

      nextRapidBatchTime = timestamp + randomBetween(1900, 2500);
    };

    const scheduleWhiteRapidFireworkBatch = (timestamp: number) => {
      const baseDelay = randomBetween(160, 260);
      const orangeIndex = randomInt(0, 3);

      for (let i = 0; i < 4; i += 1) {
        const useOrange = i === orangeIndex || Math.random() < 0.28;
        directFireworkQueue.push({
          time: timestamp + i * baseDelay + randomBetween(0, 90),
          x: randomBetween(canvasSize.width * 0.12, canvasSize.width * 0.88),
          y: randomBetween(canvasSize.height * 0.08, canvasSize.height * 0.34),
          pattern: 'rapid-small',
          palette: useOrange ? FIREWORK_PALETTES[0] : WHITE_FIREWORK_PALETTE,
          burstScale: 1,
        });
      }

      nextRapidBatchTime = timestamp + randomBetween(980, 1320);
    };

    const processDirectFireworkQueue = (timestamp: number) => {
      for (let i = directFireworkQueue.length - 1; i >= 0; i -= 1) {
        if (directFireworkQueue[i].time <= timestamp) {
          explodeDirectFirework(directFireworkQueue[i]);
          directFireworkQueue.splice(i, 1);
        }
      }
    };

    const processRapidFireworks = (timestamp: number) => {
      if (timestamp >= nextRapidBatchTime) {
        scheduleRapidFireworkBatch(timestamp);
      }

      processDirectFireworkQueue(timestamp);
    };

    const scheduleFinalePhase = (timestamp: number, phase: number) => {
      if (phase === 0) {
        const rainbowIndex = randomInt(0, 2);
        scheduleRapidFireworkBatch(timestamp, (index) =>
          index === rainbowIndex
            ? {
                pattern: 'rainbow-small',
                palette: randomItem(RAINBOW_FIREWORK_PALETTES),
                burstScale: 0.46,
              }
            : {},
        );
      } else if (phase === 1) {
        scheduleRapidFireworkBatch(timestamp, (index) =>
          index === 1
            ? {
                x: randomBetween(canvasSize.width * 0.42, canvasSize.width * 0.58),
                y: randomBetween(canvasSize.height * 0.08, canvasSize.height * 0.18),
                pattern: 'shape',
                palette: randomItem(RAINBOW_FIREWORK_PALETTES),
                burstScale: 1,
                shape: randomItem(FIREWORK_SHAPES),
              }
            : {},
        );
      } else if (phase === 2) {
        scheduleRapidFireworkBatch(timestamp);
      } else if (phase === 3) {
        launchCascadeFireworks();
      } else if (phase === 4) {
        scheduleWhiteRapidFireworkBatch(timestamp);
      } else if (phase === 5) {
        directFireworkQueue.push({
          time: timestamp,
          x: randomBetween(canvasSize.width * 0.44, canvasSize.width * 0.56),
          y: randomBetween(canvasSize.height * 0.03, canvasSize.height * 0.07),
          pattern: 'giant-rainbow',
          palette: GIANT_RAINBOW_FIREWORK_PALETTE,
          burstScale: 1,
        });
      }
    };

    const processFinaleFireworks = (timestamp: number) => {
      if (finaleComplete) {
        processDirectFireworkQueue(timestamp);
        return;
      }

      processDirectFireworkQueue(timestamp);

      const fireworksVisible = rockets.length > 0 || bursts.length > 0 || particles.length > 0 || directFireworkQueue.length > 0;

      if (finaleWaitUntil > 0) {
        if (!fireworksVisible && timestamp >= finaleWaitUntil) {
          finaleWaitUntil = 0;
          finalePhase += 1;
          finalePhaseScheduled = false;
          finaleStepStartTime = timestamp;
          nextRapidBatchTime = timestamp;
        }
        return;
      }

      if (finalePhase < 0) {
        finalePhase = 0;
        finaleStepStartTime = timestamp;
        finalePhaseScheduled = false;
        nextRapidBatchTime = timestamp;
      }

      if (finalePhase >= 6) {
        if (!fireworksVisible) {
          finaleComplete = true;
          directFireworkQueue.length = 0;
        }
        return;
      }

      const elapsed = timestamp - finaleStepStartTime;
      const duration = finalePhase === 0 || finalePhase === 1 ? 15000 : finalePhase === 2 || finalePhase === 4 ? 10000 : 0;
      const isTimedPhase = duration > 0;

      if (isTimedPhase && elapsed < duration) {
        if (timestamp >= nextRapidBatchTime) {
          scheduleFinalePhase(timestamp, finalePhase);
        }
        return;
      }

      if (finalePhase === 2 && directFireworkQueue.length === 0) {
        finalePhase = 3;
        finalePhaseScheduled = true;
        finaleStepStartTime = timestamp;
        nextRapidBatchTime = timestamp;
        scheduleFinalePhase(timestamp, finalePhase);
        return;
      }

      if (finalePhase === 4 && directFireworkQueue.length === 0 && rockets.length === 0) {
        const particlesNearEnd = particles.length === 0 || particles.every((particle) => particle.age / particle.life > 0.78);
        if (particlesNearEnd) {
          finalePhase = 5;
          finalePhaseScheduled = true;
          finaleStepStartTime = timestamp;
          nextRapidBatchTime = timestamp;
          scheduleFinalePhase(timestamp, finalePhase);
          return;
        }
      }

      if (!isTimedPhase && !finalePhaseScheduled) {
        scheduleFinalePhase(timestamp, finalePhase);
        finalePhaseScheduled = true;
        return;
      }

      if (!fireworksVisible) {
        if (finalePhase === 5) {
          finaleComplete = true;
          return;
        }

        const waitDuration = finalePhase === 2 || finalePhase === 4 ? 0 : finalePhase === 3 ? 1800 : 1400;
        finaleWaitUntil = timestamp + waitDuration;
      }
    };

    const runProgramPattern = (pattern: HanabiProgramRunPattern, timestamp: number, empty: boolean) => {
      if (pattern === 'rapid') {
        processRapidFireworks(timestamp);
        return;
      }

      if (empty && timestamp >= nextLaunchTime) {
        if (pattern === 'cascade') {
          launchCascadeFireworks();
        } else if (pattern === 'rainbow') {
          launchRainbowFireworks();
        } else {
          launchDefaultFireworks(pattern);
        }
        nextLaunchTime = timestamp + randomBetween(780, 1180);
      }
    };

    const processProgramFireworks = (timestamp: number, empty: boolean) => {
      const steps: Array<{ pattern: HanabiProgramRunPattern | 'finale' | 'wait'; duration: number }> = [
        { pattern: 'normal', duration: HANABI_PROGRAM_PHASE_DURATION },
        { pattern: 'wait', duration: HANABI_PROGRAM_WAIT_DURATION },
        { pattern: 'shape', duration: HANABI_PROGRAM_PHASE_DURATION },
        { pattern: 'wait', duration: HANABI_PROGRAM_WAIT_DURATION },
        { pattern: 'rapid', duration: HANABI_PROGRAM_PHASE_DURATION },
        { pattern: 'wait', duration: HANABI_PROGRAM_WAIT_DURATION },
        { pattern: 'rainbow', duration: HANABI_PROGRAM_PHASE_DURATION },
        { pattern: 'wait', duration: HANABI_PROGRAM_WAIT_DURATION },
        { pattern: 'cascade', duration: HANABI_PROGRAM_PHASE_DURATION },
        { pattern: 'wait', duration: HANABI_PROGRAM_WAIT_DURATION },
        { pattern: 'finale', duration: Number.POSITIVE_INFINITY },
      ];
      const step = steps[programStepIndex] ?? steps[steps.length - 1];
      const elapsed = timestamp - programStepStartTime;

      if (elapsed >= step.duration) {
        programStepIndex = Math.min(programStepIndex + 1, steps.length - 1);
        programStepStartTime = timestamp;
        nextRapidBatchTime = timestamp;
        nextLaunchTime = timestamp;
        directFireworkQueue.length = 0;
        finaleStepStartTime = timestamp;
        finaleWaitUntil = 0;
        finalePhase = -1;
        finalePhaseScheduled = false;
        finaleComplete = false;
        return;
      }

      if (step.pattern === 'wait') return;
      if (step.pattern === 'finale') {
        processFinaleFireworks(timestamp);
        return;
      }

      runProgramPattern(step.pattern, timestamp, empty);
    };

    const launchFireworks = () => {
      if (specialPatternRef.current === 'cascade') {
        launchCascadeFireworks();
      } else if (specialPatternRef.current === 'rainbow') {
        launchRainbowFireworks();
      } else {
        launchDefaultFireworks(specialPatternRef.current === 'shape' ? 'shape' : 'normal');
      }
      nextLaunchTime = performance.now() + randomBetween(780, 1180);
    };

    const draw = (timestamp: number) => {
      const dt = Math.min((timestamp - previousTime) / 1000, 0.033);
      previousTime = timestamp;

      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.save();
      context.scale(canvasSize.dpr, canvasSize.dpr);

      if (seenPatternVersion !== patternVersionRef.current) {
        seenPatternVersion = patternVersionRef.current;
        directFireworkQueue.length = 0;
        nextRapidBatchTime = timestamp;
        finaleStepStartTime = timestamp;
        finaleWaitUntil = 0;
        finalePhase = -1;
        finalePhaseScheduled = false;
        finaleComplete = false;
        programStepIndex = 0;
        programStepStartTime = timestamp;
      }

      const empty = rockets.length === 0 && bursts.length === 0 && particles.length === 0;
      if (specialPatternRef.current === 'rapid') {
        processRapidFireworks(timestamp);
      } else if (specialPatternRef.current === 'program') {
        processProgramFireworks(timestamp, empty);
      } else if (specialPatternRef.current === 'finale') {
        processFinaleFireworks(timestamp);
      } else if (empty && timestamp >= nextLaunchTime) {
        directFireworkQueue.length = 0;
        finaleStepStartTime = timestamp;
        finaleWaitUntil = 0;
        finalePhase = -1;
        finalePhaseScheduled = false;
        finaleComplete = false;
        programStepIndex = 0;
        programStepStartTime = timestamp;
        launchFireworks();
      }

      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        if (drawFireworkBurst(context, bursts[i], dt)) bursts.splice(i, 1);
      }

      for (let i = rockets.length - 1; i >= 0; i -= 1) {
        const rocket = rockets[i];
        if (drawFireworkRocket(context, rocket, dt)) {
          const { burst, particles: newParticles } = explodeFirework(
            rocket.targetX,
            rocket.targetY,
            rocket.color,
            rocket.coreColor,
            canvasSize.width,
            canvasSize.height,
            rocket.pattern,
            rocket.burstScale,
            rocket.shape,
          );
          const burstId = nextBurstId;
          nextBurstId += 1;
          newParticles.forEach((particle) => {
            particle.burstId = burstId;
          });
          playFireworkSound('burst');
          bursts.push(burst);
          particles.push(...newParticles);
          rockets.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i -= 1) {
        if (drawFireworkParticle(context, particles[i], dt)) particles.splice(i, 1);
      }

      context.restore();
      const explosionActive = bursts.length > 0 || particles.length > 0;
      const highlightActive =
        bursts.some((burst) => burst.age / burst.life < 0.8) || particles.some((particle) => particle.age / particle.life < 0.84);
      setFireworkExplosion(explosionActive);
      setFireworkActive(highlightActive);
      animationFrameId = window.requestAnimationFrame(draw);
    };

    animationFrameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      setFireworkActive(false);
      setFireworkExplosion(false);
    };
  }, [canvasSize.dpr, canvasSize.height, canvasSize.width, hanabiMode, playFireworkSound]);

  useEffect(() => {
    const canvas = lightCanvasRef.current;
    if (!canvas) return;

    const pixelWidth = Math.max(1, Math.round(canvasSize.width * canvasSize.dpr));
    const pixelHeight = Math.max(1, Math.round(canvasSize.height * canvasSize.dpr));
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
    canvas.style.width = `${canvasSize.width}px`;
    canvas.style.height = `${canvasSize.height}px`;

    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrameId = 0;

    const draw = (timestamp: number) => {
      const timeSeconds = timestamp / 1000;
      context.clearRect(0, 0, pixelWidth, pixelHeight);
      context.save();
      context.scale(canvasSize.dpr, canvasSize.dpr);
      context.globalCompositeOperation = 'lighter';

      HANABI_LIGHT_PARTICLES.forEach((particle, index) => {
        const motion = particleMotion[index];
        const scale = canvasSize.width / FIGURE_WIDTH;
        const x = particle.x * canvasSize.width + Math.sin(timeSeconds * motion.speedX + motion.phaseX) * motion.driftX * scale;
        const y = particle.y * canvasSize.height + Math.cos(timeSeconds * motion.speedY + motion.phaseY) * motion.driftY * scale;
        const radius = particle.size * scale;
        const opacity = 0.46 + Math.sin(timeSeconds * 1.4 + motion.opacityPhase) * 0.2;
        const glow = context.createRadialGradient(x, y, 0, x, y, radius * 4.5);

        glow.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
        glow.addColorStop(0.42, `rgba(255, 255, 255, ${opacity * 0.4})`);
        glow.addColorStop(1, 'rgba(255, 255, 255, 0)');

        context.fillStyle = glow;
        context.beginPath();
        context.arc(x, y, radius * 4.5, 0, Math.PI * 2);
        context.fill();

        context.fillStyle = `rgba(255, 255, 255, ${Math.min(0.92, opacity + 0.2)})`;
        context.beginPath();
        context.arc(x, y, Math.max(0.8, radius), 0, Math.PI * 2);
        context.fill();
      });

      context.restore();
      animationFrameId = window.requestAnimationFrame(draw);
    };

    animationFrameId = window.requestAnimationFrame(draw);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [canvasSize.dpr, canvasSize.height, canvasSize.width, particleMotion]);

  return (
    <div className={cn('hanabi-scene', `hanabi-scene-${variant}`)}>
      <div className="hanabi-asset-stage">
        <div ref={frameRef} className="hanabi-asset-frame">
          <canvas ref={starryCanvasRef} className={cn('hanabi-starry-canvas', fireworkExplosionActive && 'is-hidden')} aria-hidden="true" />
          <canvas ref={fireworkCanvasRef} className="hanabi-firework-canvas" aria-hidden="true" />
          <canvas ref={lightCanvasRef} className="hanabi-light-canvas" aria-hidden="true" />
          {HANABI_LAYERS.map((layer, index) => (
            <img
              key={layer.src}
              src={layer.src}
              alt={layer.alt}
              aria-hidden={index === 0 ? undefined : true}
              className={cn('hanabi-layer', layer.className, index > 0 && 'is-hidden-in-fireworks')}
              draggable={false}
              loading={index === 0 ? 'eager' : 'lazy'}
            />
          ))}
          {HANABI_FIREWORK_LAYERS.map((layer) => (
            <img
              key={layer.src}
              src={layer.src}
              alt=""
              aria-hidden="true"
              className={cn('hanabi-layer hanabi-firework-layer', layer.className, fireworkHighlightActive && 'is-active')}
              draggable={false}
              loading="lazy"
            />
          ))}
          {variant === 'modal' ? (
            <>
              <audio ref={audioRef} src={HANABI_AMBIENT_AUDIO_SRC} loop preload="auto" aria-hidden="true" />
              <button
                type="button"
                className="hanabi-audio-button"
                onClick={handleAmbientAudioToggle}
                aria-label={ambientAudioPlaying ? '虫の音を消音' : '虫の音を再生'}
              >
                <SpeakerIcon muted={!ambientAudioPlaying} />
              </button>
              <button
                type="button"
                className={cn('hanabi-mode-button', hanabiMode === 'fireworks' && 'is-active')}
                onClick={() => setHanabiMode((current) => (current === 'fireworks' ? 'normal' : 'fireworks'))}
                aria-pressed={hanabiMode === 'fireworks'}
              >
                {hanabiMode === 'fireworks' ? '花火モード' : '通常モード'}
              </button>
              <div className="hanabi-pattern-controls" aria-label="花火パターン">
                <button
                  type="button"
                  className={cn('hanabi-pattern-button', specialPattern === 'cascade' && 'is-active')}
                  onClick={() => toggleSpecialPattern('cascade')}
                  aria-pressed={specialPattern === 'cascade'}
                >
                  残像花火
                </button>
                <button
                  type="button"
                  className={cn('hanabi-pattern-button', specialPattern === 'rainbow' && 'is-active')}
                  onClick={() => toggleSpecialPattern('rainbow')}
                  aria-pressed={specialPattern === 'rainbow'}
                >
                  多色花火
                </button>
                <button
                  type="button"
                  className={cn('hanabi-pattern-button', specialPattern === 'shape' && 'is-active')}
                  onClick={() => toggleSpecialPattern('shape')}
                  aria-pressed={specialPattern === 'shape'}
                >
                  形花火
                </button>
                <button
                  type="button"
                  className={cn('hanabi-pattern-button', specialPattern === 'rapid' && 'is-active')}
                  onClick={() => toggleSpecialPattern('rapid')}
                  aria-pressed={specialPattern === 'rapid'}
                >
                  連発花火
                </button>
                <button
                  type="button"
                  className={cn('hanabi-pattern-button', specialPattern === 'finale' && 'is-active')}
                  onClick={() => toggleSpecialPattern('finale')}
                  aria-pressed={specialPattern === 'finale'}
                >
                  終幕
                </button>
                <button
                  type="button"
                  className={cn('hanabi-pattern-button', specialPattern === 'program' && 'is-active')}
                  onClick={() => toggleSpecialPattern('program')}
                  aria-pressed={specialPattern === 'program'}
                >
                  プログラム
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="hanabi-audio-icon">
      <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
      {muted ? (
        <>
          <path d="m17 9 4 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <path d="m21 9-4 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      ) : (
        <>
          <path d="M16 9.5c.7.7 1 1.5 1 2.5s-.3 1.8-1 2.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          <path d="M18.5 7c1.3 1.3 2 3 2 5s-.7 3.7-2 5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
        </>
      )}
    </svg>
  );
}
