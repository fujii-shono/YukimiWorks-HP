'use client';

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_ACRYLIC_GENERATION_OPTIONS,
  type AcrylicGenerationOptions,
} from '@/lib/acrylicGenerationOptions';
import { cn } from '@/lib/format';

type PreviewState = {
  acrylicSrc: string;
  edgeSrc: string;
  sideSrc: string;
  artworkSrc: string;
  originalArtworkSrc: string;
  backSrc: string;
  highlightSrc: string;
  standBaseSrc: string;
  flatGuide: {
    src: string;
  };
  generationOptions: AcrylicGenerationOptions;
  standBaseFrame: {
    x: number;
    y: number;
    contactY: number;
    width: number;
    height: number;
    depthOffset: number;
  } | null;
  standShapeGuide: {
    src: string;
  } | null;
  standContactLine: {
    leftX: number;
    rightX: number;
    y: number;
  } | null;
  standClawFrame: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  width: number;
  height: number;
  fileName: string;
  productMode: ProductMode;
};

type PreviewRotation = {
  y: number;
};

type RotationVelocity = PreviewRotation;

type ProductMode = 'keychain' | 'stand';

type HoleMode = 'with-hole' | 'without-hole';

type StandMode = 'simple' | 'stable';

type ShapeMode = HoleMode | StandMode;

type PreviewCacheKey = string;

type PreviewCache = Partial<Record<PreviewCacheKey, PreviewState>>;

type PreviewStageSize = {
  width: number;
  height: number;
};

type AlphaBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
};

type StandPreviewStyles = {
  base: CSSProperties;
  circle: CSSProperties;
};

type StandFlatPreviewStyle = CSSProperties | undefined;

export type AcrylicDemoSample = {
  label: string;
  src: string;
  fileName: string;
};

type AcrylicKeychainToolProps = {
  mode?: 'default' | 'demo';
  samples?: AcrylicDemoSample[];
};

const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const PREVIEW_STAGE_WIDTH = 960;
const PREVIEW_STAGE_HEIGHT = 620;
const MOBILE_PREVIEW_STAGE_WIDTH = 720;
const MOBILE_PREVIEW_STAGE_HEIGHT = 720;
const PREVIEW_ARTWORK_MAX_WIDTH_RATIO = 0.98;
const PREVIEW_ARTWORK_MAX_HEIGHT_RATIO = 0.98;
const MOBILE_PREVIEW_ARTWORK_MAX_WIDTH_RATIO = 0.98;
const MOBILE_PREVIEW_ARTWORK_MAX_HEIGHT_RATIO = 0.98;
const ROTATION_MIN_SPEED = 0.015;
const HIGHLIGHT_VISIBLE_START = 0.78;
const BACK_SIDE_SIDE_VISIBLE_START = 0.42;
const SURFACE_GLOSS_OPACITY = 0.46;
const REFERENCE_ARTWORK_SIZE = 500;
const EXPORT_DEBUG_SVG = false;
const SHOW_AI_GENERATION_BUTTON = false;
const ACRYLIC_PREVIEW_FRONT_Z = 6;
const ACRYLIC_PREVIEW_BACK_Z = -4;
const ACRYLIC_SIDE_LAYER_COUNT = 6;
const ACRYLIC_SIDE_LAYERS = Array.from({ length: ACRYLIC_SIDE_LAYER_COUNT }, (_, index) => {
  const progress = (index + 1) / (ACRYLIC_SIDE_LAYER_COUNT + 1);
  return ACRYLIC_PREVIEW_BACK_Z + (ACRYLIC_PREVIEW_FRONT_Z - ACRYLIC_PREVIEW_BACK_Z) * progress;
});
const STAND_CIRCLE_DEPTH_PX = ACRYLIC_PREVIEW_FRONT_Z - ACRYLIC_PREVIEW_BACK_Z;
const STAND_CYLINDER_SIDE_SEGMENTS = 48;
const STAND_CYLINDER_SIDE_PANELS = Array.from({ length: STAND_CYLINDER_SIDE_SEGMENTS }, (_, index) => ({
  angle: (index / STAND_CYLINDER_SIDE_SEGMENTS) * 360,
  width: (Math.PI * 100) / STAND_CYLINDER_SIDE_SEGMENTS,
}));
const SHOW_STAND_BASE_SVG = true;
const SHOW_STAND_CSS_CIRCLE = false;
const STAND_BASE_SVG_VIEW_WIDTH = 1000;
const STAND_BASE_SVG_VIEW_HEIGHT = 300;
const STAND_BASE_SVG_VIEW_BOX = `0 0 ${STAND_BASE_SVG_VIEW_WIDTH} ${STAND_BASE_SVG_VIEW_HEIGHT}`;
const STAND_BASE_SVG_LEFT = 34;
const STAND_BASE_SVG_RIGHT = 966;
const STAND_BASE_SVG_TOP_CENTER_Y = 118;
const STAND_BASE_SVG_TOP_HEIGHT = 130;
const STAND_BASE_SVG_SAMPLE_COUNT = 48;
const STAND_BASE_SVG_TILT_DEGREES = 85;
const STAND_BASE_SVG_PERSPECTIVE = 2200;
const STAND_BASE_SVG_THICKNESS_Y = 26;
const STAND_DEFAULT_CLAW_WIDTH_PX = 48;
const STAND_DEFAULT_CLAW_LENGTH_PX = 18;
const BASE_STAND_CLAW_EDGE_GAP = 16;
const STAND_BASE_SIDE_HIGHLIGHT_X = 34;
const STAND_BASE_SIDE_HIGHLIGHT_WIDTH = 40;
const STAND_DEFAULT_BASE_WIDTH_PX = 420;

type SvgPoint = {
  x: number;
  y: number;
};

function formatSvgNumber(value: number) {
  return Number(value.toFixed(2));
}

function pointsToSvgPath(points: SvgPoint[], close = false) {
  const [firstPoint, ...restPoints] = points;
  const commands = [`M ${formatSvgNumber(firstPoint.x)} ${formatSvgNumber(firstPoint.y)}`];
  for (const point of restPoints) {
    commands.push(`L ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`);
  }
  if (close) commands.push('Z');
  return commands.join(' ');
}

function offsetSvgPoints(points: SvgPoint[], offsetY: number) {
  return points.map((point) => ({ x: point.x, y: point.y + offsetY }));
}

function getStandBaseSvgSideThicknessY(preview: PreviewState) {
  if (preview.productMode !== 'stand' || !preview.standBaseFrame) return STAND_BASE_SVG_THICKNESS_Y;

  const baseHeight = Math.max(1, preview.standBaseFrame.height);
  return Math.max(1, (preview.standBaseFrame.depthOffset / baseHeight) * STAND_BASE_SVG_TOP_HEIGHT);
}

function createStandBaseSvgGeometry(sideThicknessY = STAND_BASE_SVG_THICKNESS_Y) {
  const radius = 1;
  const tilt = (STAND_BASE_SVG_TILT_DEGREES * Math.PI) / 180;
  const projectedPoints: SvgPoint[] = [];

  for (let index = 0; index < STAND_BASE_SVG_SAMPLE_COUNT; index += 1) {
    const angle = (index / STAND_BASE_SVG_SAMPLE_COUNT) * Math.PI * 2;
    const circleX = Math.cos(angle) * radius;
    const circleY = Math.sin(angle) * radius;
    const rotatedY = circleY * Math.cos(tilt);
    const rotatedZ = circleY * Math.sin(tilt);
    const perspectiveScale = STAND_BASE_SVG_PERSPECTIVE / (STAND_BASE_SVG_PERSPECTIVE - rotatedZ);
    projectedPoints.push({
      x: circleX * perspectiveScale,
      y: rotatedY * perspectiveScale,
    });
  }

  const minX = Math.min(...projectedPoints.map((point) => point.x));
  const maxX = Math.max(...projectedPoints.map((point) => point.x));
  const minY = Math.min(...projectedPoints.map((point) => point.y));
  const maxY = Math.max(...projectedPoints.map((point) => point.y));
  const centerY = STAND_BASE_SVG_TOP_CENTER_Y;
  const widthScale = (STAND_BASE_SVG_RIGHT - STAND_BASE_SVG_LEFT) / (maxX - minX);
  const projectedHeight = (maxY - minY) * widthScale;
  const topY = centerY - projectedHeight / 2;

  const topPoints = projectedPoints.map((point) => ({
    x: STAND_BASE_SVG_LEFT + (point.x - minX) * widthScale,
    y: topY + (point.y - minY) * widthScale,
  }));
  const bottomPoints = offsetSvgPoints(topPoints, sideThicknessY);
  const lowerTopPoints = topPoints.slice(0, STAND_BASE_SVG_SAMPLE_COUNT / 2 + 1);
  const lowerBottomPoints = bottomPoints.slice(0, STAND_BASE_SVG_SAMPLE_COUNT / 2 + 1).reverse();
  const rightPoint = topPoints[0];
  const leftPoint = topPoints[STAND_BASE_SVG_SAMPLE_COUNT / 2];
  const bottomRightPoint = bottomPoints[0];
  const bottomLeftPoint = bottomPoints[STAND_BASE_SVG_SAMPLE_COUNT / 2];

  return {
    topPath: pointsToSvgPath(topPoints, true),
    bottomPath: pointsToSvgPath(bottomPoints, true),
    sideFillPath: pointsToSvgPath([...lowerTopPoints, ...lowerBottomPoints], true),
    sideLeftPath: pointsToSvgPath([leftPoint, bottomLeftPoint]),
    sideRightPath: pointsToSvgPath([rightPoint, bottomRightPoint]),
  };
}

function drawImageSource(context: CanvasRenderingContext2D, src: string) {
  return new Promise<void>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.onload = () => {
      context.drawImage(image, 0, 0);
      resolve();
    };
    image.onerror = () => reject(new Error('プレビュー画像を描画できませんでした'));
    image.src = src;
  });
}

function findCanvasAlphaBounds(context: CanvasRenderingContext2D, width: number, height: number): AlphaBounds | null {
  const pixels = context.getImageData(0, 0, width, height).data;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;

  for (let index = 0; index < width * height; index += 1) {
    if (pixels[index * 4 + 3] <= 0) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return maxX >= 0 ? { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 } : null;
}

async function findImageAlphaBounds(src: string, width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  await drawImageSource(context, src);
  return findCanvasAlphaBounds(context, width, height);
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const clientCircleRowSpanCache = new Map<number, Int16Array>();

function getClientCircleRowSpans(radius: number) {
  const roundedRadius = Math.max(0, Math.round(radius));
  const cached = clientCircleRowSpanCache.get(roundedRadius);
  if (cached) return cached;

  const spans = new Int16Array(roundedRadius * 2 + 1);
  const squaredRadius = roundedRadius * roundedRadius;
  for (let offsetY = -roundedRadius; offsetY <= roundedRadius; offsetY += 1) {
    spans[offsetY + roundedRadius] = Math.floor(Math.sqrt(squaredRadius - offsetY * offsetY));
  }
  clientCircleRowSpanCache.set(roundedRadius, spans);
  return spans;
}

function dilateClientMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const roundedRadius = Math.max(0, Math.round(radius));
  if (roundedRadius <= 0) return mask.slice();

  const output = new Uint8Array(width * height);
  const rowStride = width + 1;
  const rowDiffs = new Int32Array(rowStride * height);
  const rowSpans = getClientCircleRowSpans(roundedRadius);

  for (let sourceY = 0; sourceY < height; sourceY += 1) {
    const sourceRowStart = sourceY * width;
    let sourceX = 0;

    while (sourceX < width) {
      while (sourceX < width && mask[sourceRowStart + sourceX] === 0) sourceX += 1;
      if (sourceX >= width) break;

      const runStart = sourceX;
      while (sourceX + 1 < width && mask[sourceRowStart + sourceX + 1] === 1) sourceX += 1;
      const runEnd = sourceX;

      for (let offsetY = -roundedRadius; offsetY <= roundedRadius; offsetY += 1) {
        const targetY = sourceY + offsetY;
        if (targetY < 0 || targetY >= height) continue;
        const spanX = rowSpans[offsetY + roundedRadius];
        const startX = Math.max(0, runStart - spanX);
        const endX = Math.min(width - 1, runEnd + spanX);
        const diffRowStart = targetY * rowStride;
        rowDiffs[diffRowStart + startX] += 1;
        rowDiffs[diffRowStart + endX + 1] -= 1;
      }

      sourceX += 1;
    }
  }

  for (let y = 0; y < height; y += 1) {
    const diffRowStart = y * rowStride;
    const outputRowStart = y * width;
    let coverage = 0;
    for (let x = 0; x < width; x += 1) {
      coverage += rowDiffs[diffRowStart + x];
      if (coverage > 0) output[outputRowStart + x] = 1;
    }
  }

  return output;
}

function fillClientMaskHoles(mask: Uint8Array, width: number, height: number) {
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;

  const push = (x: number, y: number) => {
    const index = y * width + x;
    if (mask[index] || visited[index]) return;
    visited[index] = 1;
    queue[tail] = index;
    tail += 1;
  };

  for (let x = 0; x < width; x += 1) {
    push(x, 0);
    push(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    push(0, y);
    push(width - 1, y);
  }

  while (head < tail) {
    const index = queue[head];
    head += 1;
    const x = index % width;
    const y = Math.floor(index / width);
    const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
    for (const next of neighbors) {
      if (next < 0 || mask[next] || visited[next]) continue;
      visited[next] = 1;
      queue[tail] = next;
      tail += 1;
    }
  }

  const output = mask.slice();
  for (let index = 0; index < width * height; index += 1) {
    if (!output[index] && !visited[index]) output[index] = 1;
  }
  return output;
}

function outlineClientMask(mask: Uint8Array, width: number, height: number) {
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      if (!mask[index]) continue;
      const touchesOutside =
        x === 0 ||
        y === 0 ||
        x === width - 1 ||
        y === height - 1 ||
        !mask[index - 1] ||
        !mask[index + 1] ||
        !mask[index - width] ||
        !mask[index + width];
      if (!touchesOutside) continue;
      const target = index * 4;
      rgba[target] = 86;
      rgba[target + 1] = 103;
      rgba[target + 2] = 131;
      rgba[target + 3] = 230;
    }
  }
  return new ImageData(rgba, width, height);
}

async function createAlphaMarginGuide(src: string, width: number, height: number, radius: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return '';

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.decoding = 'async';
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('余白ガイドを描画できませんでした'));
    nextImage.src = src;
  });

  context.clearRect(0, 0, width, height);
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, width, height).data;
  const alphaMask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    if (pixels[index * 4 + 3] > 8) alphaMask[index] = 1;
  }

  const filledMask = fillClientMaskHoles(alphaMask, width, height);
  const guideMask = fillClientMaskHoles(dilateClientMask(filledMask, width, height, radius), width, height);
  context.clearRect(0, 0, width, height);
  context.putImageData(outlineClientMask(guideMask, width, height), 0, 0);
  return canvas.toDataURL('image/png');
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function getExportFileBaseName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'acrylic-keychain';
}

function cloneGenerationOptions(options: AcrylicGenerationOptions): AcrylicGenerationOptions {
  return {
    keychain: { ...options.keychain },
    stand: { ...options.stand },
  };
}

function createInitialGenerationOptions(isDemo: boolean): AcrylicGenerationOptions {
  const options = cloneGenerationOptions(DEFAULT_ACRYLIC_GENERATION_OPTIONS);
  if (isDemo) {
    options.stand.baseWidthPx = STAND_DEFAULT_BASE_WIDTH_PX;
  }
  return options;
}

function withFixedPreviewOptions(options: AcrylicGenerationOptions): AcrylicGenerationOptions {
  return {
    ...options,
    keychain: {
      ...options.keychain,
      holeOuterRadius: DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.holeOuterRadius,
      holeInnerRadius: DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.holeInnerRadius,
    },
    stand: {
      ...options.stand,
      baseHeightPx: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.baseHeightPx,
      baseHeightRatioPercent: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.baseHeightRatioPercent,
      baseMinHeight: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.baseMinHeight,
      baseDepthOffsetRatio: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.baseDepthOffsetRatio,
      clawCenterXRatio: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.clawCenterXRatio,
      clawLengthPx: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.clawLengthPx,
      clawLengthRatio: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.clawLengthRatio,
      clawCornerRadius: DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.clawCornerRadius,
    },
  };
}

function getPreviewCacheKey(productMode: ProductMode, shapeMode: ShapeMode, generationOptions: AcrylicGenerationOptions): PreviewCacheKey {
  return `${productMode}:${shapeMode}:${JSON.stringify(generationOptions)}`;
}

function getPreviewArtworkRatios() {
  if (window.matchMedia('(max-width: 767px)').matches) {
    return {
      width: MOBILE_PREVIEW_ARTWORK_MAX_WIDTH_RATIO,
      height: MOBILE_PREVIEW_ARTWORK_MAX_HEIGHT_RATIO,
    };
  }
  return {
    width: PREVIEW_ARTWORK_MAX_WIDTH_RATIO,
    height: PREVIEW_ARTWORK_MAX_HEIGHT_RATIO,
  };
}

function getPreviewStageSize() {
  if (window.matchMedia('(max-width: 767px)').matches) {
    return {
      width: MOBILE_PREVIEW_STAGE_WIDTH,
      height: MOBILE_PREVIEW_STAGE_HEIGHT,
    };
  }
  return {
    width: PREVIEW_STAGE_WIDTH,
    height: PREVIEW_STAGE_HEIGHT,
  };
}

function createStandPreviewStyles(preview: PreviewState, stage: PreviewStageSize): StandPreviewStyles | null {
  if (preview.productMode !== 'stand' || !preview.standBaseFrame) return null;

  const ratios = getPreviewArtworkRatios();
  const scale = Math.min(
    (stage.width * ratios.width) / preview.width,
    (stage.height * ratios.height) / preview.height,
  );
  const drawWidth = preview.width * scale;
  const drawHeight = preview.height * scale;
  const drawX = (stage.width - drawWidth) / 2;
  const drawY = (stage.height - drawHeight) / 2;
  const frame = preview.standBaseFrame;
  const contactY = drawY + frame.contactY * scale;
  const standWidth = frame.width * scale;
  const standHeight = frame.height * scale;
  const displayHeight = Math.max(1, standHeight * (STAND_BASE_SVG_VIEW_HEIGHT / STAND_BASE_SVG_TOP_HEIGHT));
  const top = (contactY - displayHeight * (STAND_BASE_SVG_TOP_CENTER_Y / STAND_BASE_SVG_VIEW_HEIGHT)) / stage.height;

  return {
    base: {
      '--stand-base-left': `${((drawX + frame.x * scale) / stage.width) * 100}%`,
      '--stand-base-top': `${top * 100}%`,
      '--stand-base-width': `${(standWidth / stage.width) * 100}%`,
      '--stand-base-height': `${(displayHeight / stage.height) * 100}%`,
    } as CSSProperties,
    circle: {
      '--stand-circle-left': `${((drawX + frame.x * scale) / stage.width) * 100}%`,
      '--stand-circle-top': `${((contactY - standWidth / 2) / stage.height) * 100}%`,
      '--stand-circle-size': `${(standWidth / stage.width) * 100}%`,
      '--stand-circle-depth': `${STAND_CIRCLE_DEPTH_PX}px`,
    } as CSSProperties,
  };
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('PNGを読み込めませんでした'));
    reader.readAsDataURL(file);
  });
}

async function buildPreview(
  file: File,
  productMode: ProductMode,
  shapeMode: ShapeMode,
  generationOptions: AcrylicGenerationOptions,
): Promise<PreviewState> {
  if (file.type !== 'image/png') {
    throw new Error('PNGファイルを選択してください');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('3MB以下のPNGファイルを選択してください');
  }

  const response = await fetch('/api/acrylic/preview', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileName: file.name,
      imageDataUrl: await fileToDataUrl(file),
      productMode,
      shapeMode,
      generationOptions,
    }),
  });

  const data = (await response.json().catch(() => null)) as (PreviewState & { error?: string }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? 'プレビューを作成できませんでした');
  }

  return data;
}

async function sampleToFile(sample: AcrylicDemoSample) {
  const response = await fetch(sample.src, { cache: 'no-store' });
  if (!response.ok) throw new Error('サンプル画像を読み込めませんでした');
  const blob = await response.blob();
  return new File([blob], sample.fileName, { type: blob.type || 'image/png' });
}

export function AcrylicKeychainTool({ mode = 'default', samples = [] }: AcrylicKeychainToolProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const holePreviewRef = useRef<HTMLDivElement>(null);
  const isDraggingHolePreviewRef = useRef(false);
  const isDemo = mode === 'demo';
  const isRotatingRef = useRef(false);
  const inertiaFrameRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0, time: 0 });
  const rotationVelocityRef = useRef<RotationVelocity>({ y: 0 });
  const rotationStartPointerRef = useRef({ x: 0, y: 0 });
  const rotationStartValueRef = useRef<PreviewRotation>({ y: 0 });
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewCache, setPreviewCache] = useState<PreviewCache>({});
  const [generationOptions, setGenerationOptions] = useState<AcrylicGenerationOptions>(() => createInitialGenerationOptions(isDemo));
  const generationOptionsRef = useRef(generationOptions);
  const [productMode, setProductMode] = useState<ProductMode>('keychain');
  const [holeMode, setHoleMode] = useState<HoleMode>('with-hole');
  const [standMode, setStandMode] = useState<StandMode>('simple');
  const [activeSampleSrc, setActiveSampleSrc] = useState('');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const [renderedAcrylicSrc, setRenderedAcrylicSrc] = useState('');
  const [renderedEdgeSrc, setRenderedEdgeSrc] = useState('');
  const [renderedSideSrc, setRenderedSideSrc] = useState('');
  const [renderedArtworkSrc, setRenderedArtworkSrc] = useState('');
  const [renderedBackArtworkSrc, setRenderedBackArtworkSrc] = useState('');
  const [renderedHighlightSrc, setRenderedHighlightSrc] = useState('');
  const [sourceArtworkBounds, setSourceArtworkBounds] = useState<AlphaBounds | null>(null);
  const [marginGuideSrc, setMarginGuideSrc] = useState('');
  const [standBaseStyle, setStandBaseStyle] = useState<CSSProperties | null>(null);
  const [standCircleStyle, setStandCircleStyle] = useState<CSSProperties | null>(null);
  const [rotation, setRotation] = useState<PreviewRotation>({ y: 0 });
  const [isRotating, setIsRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [processingDotCount, setProcessingDotCount] = useState(1);
  const [previewLayoutKey, setPreviewLayoutKey] = useState(0);
  const [status, setStatus] = useState(isDemo ? 'サンプルを選択してください' : 'PNGを選択してください');
  const immediateStandPreviewStyles =
    preview && preview.productMode === 'stand' && preview.standBaseFrame ? createStandPreviewStyles(preview, getPreviewStageSize()) : null;
  const visibleStandBaseStyle = preview?.productMode === 'stand' ? (immediateStandPreviewStyles?.base ?? standBaseStyle ?? null) : null;
  const visibleStandCircleStyle = preview?.productMode === 'stand' ? (immediateStandPreviewStyles?.circle ?? standCircleStyle ?? null) : null;
  const visibleStandBaseGeometry =
    preview?.productMode === 'stand' ? createStandBaseSvgGeometry(getStandBaseSvgSideThicknessY(preview)) : null;
  const sourceArtworkMetricScale = sourceArtworkBounds
    ? Math.max(sourceArtworkBounds.width, sourceArtworkBounds.height) / REFERENCE_ARTWORK_SIZE
    : 1;
  const rememberAutoStandClawWidth = (nextPreview: PreviewState, usedOptions: AcrylicGenerationOptions) => {
    if (!isDemo || nextPreview.productMode !== 'stand' || usedOptions.stand.clawWidthPx !== null || !nextPreview.standClawFrame) return;
    setGenerationOptions((current) => {
      const next = {
        ...current,
        stand: {
          ...current.stand,
          clawWidthPx: nextPreview.standClawFrame?.width ?? current.stand.clawWidthPx,
        },
      };
      generationOptionsRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    generationOptionsRef.current = generationOptions;
  }, [generationOptions]);

  useEffect(() => {
    if (!preview) {
      setRenderedAcrylicSrc('');
      setRenderedEdgeSrc('');
      setRenderedSideSrc('');
      setRenderedArtworkSrc('');
      setRenderedBackArtworkSrc('');
      setRenderedHighlightSrc('');
      setSourceArtworkBounds(null);
      setMarginGuideSrc('');
      setStandBaseStyle(null);
      setStandCircleStyle(null);
      return;
    }
    let cancelled = false;
    const stage = getPreviewStageSize();
    const acrylicCanvas = document.createElement('canvas');
    acrylicCanvas.width = stage.width;
    acrylicCanvas.height = stage.height;
    const acrylicContext = acrylicCanvas.getContext('2d');
    const edgeCanvas = document.createElement('canvas');
    edgeCanvas.width = stage.width;
    edgeCanvas.height = stage.height;
    const edgeContext = edgeCanvas.getContext('2d');
    const sideCanvas = document.createElement('canvas');
    sideCanvas.width = stage.width;
    sideCanvas.height = stage.height;
    const sideContext = sideCanvas.getContext('2d');
    const artworkCanvas = document.createElement('canvas');
    artworkCanvas.width = stage.width;
    artworkCanvas.height = stage.height;
    const artworkContext = artworkCanvas.getContext('2d');
    const backCanvas = document.createElement('canvas');
    backCanvas.width = stage.width;
    backCanvas.height = stage.height;
    const backContext = backCanvas.getContext('2d');
    const highlightCanvas = document.createElement('canvas');
    highlightCanvas.width = stage.width;
    highlightCanvas.height = stage.height;
    const highlightContext = highlightCanvas.getContext('2d');
    if (!acrylicContext || !edgeContext || !sideContext || !artworkContext || !backContext || !highlightContext) return;

    const setStandPreviewStyles = () => {
      const nextStyles = createStandPreviewStyles(preview, stage);
      if (!nextStyles) {
        setStandBaseStyle(null);
        setStandCircleStyle(null);
        return;
      }

      setStandBaseStyle(nextStyles.base);
      setStandCircleStyle(nextStyles.circle);
    };

    const draw = async () => {
      const ratios = getPreviewArtworkRatios();
      const scale = Math.min(
        (stage.width * ratios.width) / preview.width,
        (stage.height * ratios.height) / preview.height,
      );
      const drawWidth = preview.width * scale;
      const drawHeight = preview.height * scale;
      const drawX = (stage.width - drawWidth) / 2;
      const drawY = (stage.height - drawHeight) / 2;

      acrylicContext.clearRect(0, 0, stage.width, stage.height);
      edgeContext.clearRect(0, 0, stage.width, stage.height);
      sideContext.clearRect(0, 0, stage.width, stage.height);
      artworkContext.clearRect(0, 0, stage.width, stage.height);
      backContext.clearRect(0, 0, stage.width, stage.height);
      highlightContext.clearRect(0, 0, stage.width, stage.height);
      setStandPreviewStyles();
      acrylicContext.save();
      edgeContext.save();
      sideContext.save();
      artworkContext.save();
      backContext.save();
      highlightContext.save();
      try {
        acrylicContext.translate(drawX, drawY);
        acrylicContext.scale(scale, scale);
        await drawImageSource(acrylicContext, preview.acrylicSrc);
        if (cancelled) return;
        acrylicContext.globalAlpha = SURFACE_GLOSS_OPACITY;
        acrylicContext.globalCompositeOperation = 'screen';
        await drawImageSource(acrylicContext, preview.acrylicSrc);
        if (cancelled) return;

        edgeContext.translate(drawX, drawY);
        edgeContext.scale(scale, scale);
        await drawImageSource(edgeContext, preview.edgeSrc);
        if (cancelled) return;

        sideContext.translate(drawX, drawY);
        sideContext.scale(scale, scale);
        await drawImageSource(sideContext, preview.sideSrc);
        if (cancelled) return;

        artworkContext.translate(drawX, drawY);
        artworkContext.scale(scale, scale);
        await drawImageSource(artworkContext, preview.artworkSrc);
        if (cancelled) return;

        backContext.translate(drawX, drawY);
        backContext.scale(scale, scale);
        await drawImageSource(backContext, preview.backSrc);
        if (cancelled) return;

        highlightContext.translate(drawX, drawY);
        highlightContext.scale(scale, scale);
        await drawImageSource(highlightContext, preview.highlightSrc);
        if (cancelled) return;

        setRenderedAcrylicSrc(acrylicCanvas.toDataURL('image/png'));
        setRenderedEdgeSrc(edgeCanvas.toDataURL('image/png'));
        setRenderedSideSrc(sideCanvas.toDataURL('image/png'));
        setRenderedArtworkSrc(artworkCanvas.toDataURL('image/png'));
        setRenderedBackArtworkSrc(backCanvas.toDataURL('image/png'));
        setRenderedHighlightSrc(highlightCanvas.toDataURL('image/png'));
        const nextSourceArtworkBounds = await findImageAlphaBounds(preview.originalArtworkSrc, preview.width, preview.height);
        if (cancelled) return;
        setSourceArtworkBounds(nextSourceArtworkBounds);
        if (preview.productMode === 'stand' && preview.standBaseFrame) {
          setStandPreviewStyles();
        } else {
          setStandBaseStyle(null);
          setStandCircleStyle(null);
        }
      } finally {
        acrylicContext.restore();
        edgeContext.restore();
        sideContext.restore();
        artworkContext.restore();
        backContext.restore();
        highlightContext.restore();
      }
    };

    void draw().catch((error) => {
      if (!cancelled) setStatus(error instanceof Error ? error.message : 'プレビューを描画できませんでした');
    });

    return () => {
      cancelled = true;
    };
  }, [preview, previewLayoutKey]);

  useEffect(() => {
    if (!isDemo || !preview || !sourceArtworkBounds) {
      setMarginGuideSrc('');
      return;
    }
    const previewClearRadius = preview.generationOptions.keychain.clearRadius;
    if (previewClearRadius === generationOptions.keychain.clearRadius) {
      setMarginGuideSrc('');
      return;
    }
    let cancelled = false;
    void createAlphaMarginGuide(
      preview.originalArtworkSrc,
      preview.width,
      preview.height,
      generationOptions.keychain.clearRadius * sourceArtworkMetricScale,
    )
      .then((src) => {
        if (!cancelled) setMarginGuideSrc(src);
      })
      .catch(() => {
        if (!cancelled) setMarginGuideSrc('');
      });
    return () => {
      cancelled = true;
    };
  }, [generationOptions.keychain.clearRadius, isDemo, preview, sourceArtworkBounds, sourceArtworkMetricScale]);

  useEffect(() => {
    const handleResize = () => {
      setPreviewLayoutKey((current) => current + 1);
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (!isProcessing) {
      setProcessingDotCount(1);
      return;
    }

    const timer = window.setInterval(() => {
      setProcessingDotCount((current) => (current >= 3 ? 1 : current + 1));
    }, 360);

    return () => {
      window.clearInterval(timer);
    };
  }, [isProcessing]);

  useEffect(() => {
    if (!isProcessing) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isProcessing]);

  useEffect(() => {
    return () => {
      if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
    };
  }, []);

  const loadFile = async (file: File | undefined, options: AcrylicGenerationOptions = generationOptions) => {
    if (!file) return;
    const resolvedOptions = withFixedPreviewOptions(options);
    const startedAt = Date.now();
    const nextProductMode = productMode;
    const nextShapeMode = nextProductMode === 'keychain' ? holeMode : standMode;
    const nextCacheKey = getPreviewCacheKey(nextProductMode, nextShapeMode, resolvedOptions);
    setIsProcessing(true);
    setStatus('プレビューを作成中です');
    setSelectedFile(file);
    setPreviewCache({});
    try {
      await waitForNextFrame();
      await waitForNextFrame();
      const nextPreview = await buildPreview(file, nextProductMode, nextShapeMode, resolvedOptions);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await wait(900 - elapsed);
      setPreviewCache({ [nextCacheKey]: nextPreview });
      setPreview(nextPreview);
      rememberAutoStandClawWidth(nextPreview, resolvedOptions);
      setRotation({ y: 0 });
      rotationVelocityRef.current = { y: 0 };
      if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
      setStatus(`${file.name} を読み込みました`);
    } catch (error) {
      setPreview(null);
      setSelectedFile(null);
      setPreviewCache({});
      setStatus(error instanceof Error ? error.message : 'PNGを読み込めませんでした');
    } finally {
      setIsProcessing(false);
    }
  };

  const switchPreviewMode = async (nextProductMode: ProductMode, nextShapeMode: ShapeMode) => {
    setProductMode(nextProductMode);
    if (nextProductMode === 'keychain') {
      setHoleMode(nextShapeMode as HoleMode);
    } else {
      setStandMode(nextShapeMode as StandMode);
    }

    const resolvedOptions = withFixedPreviewOptions(generationOptions);
    const nextCacheKey = getPreviewCacheKey(nextProductMode, nextShapeMode, resolvedOptions);
    const cachedPreview = previewCache[nextCacheKey];
    if (cachedPreview) {
      setPreview(cachedPreview);
      setRotation({ y: 0 });
      rotationVelocityRef.current = { y: 0 };
      if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
      setStatus(`${cachedPreview.fileName} を読み込みました`);
      return;
    }
    if (!selectedFile) return;

    const startedAt = Date.now();
    setIsProcessing(true);
    setStatus('プレビューを作成中です');
    try {
      await waitForNextFrame();
      await waitForNextFrame();
      const nextPreview = await buildPreview(selectedFile, nextProductMode, nextShapeMode, resolvedOptions);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await wait(900 - elapsed);
      setPreviewCache((current) => ({ ...current, [nextCacheKey]: nextPreview }));
      setPreview(nextPreview);
      rememberAutoStandClawWidth(nextPreview, resolvedOptions);
      setRotation({ y: 0 });
      rotationVelocityRef.current = { y: 0 };
      if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
      setStatus(`${selectedFile.name} を読み込みました`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'プレビューを作成できませんでした');
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSample = async (sample: AcrylicDemoSample) => {
    setActiveSampleSrc(sample.src);
    const initialOptions = createInitialGenerationOptions(isDemo);
    generationOptionsRef.current = initialOptions;
    setGenerationOptions(initialOptions);
    try {
      const file = await sampleToFile(sample);
      await loadFile(file, initialOptions);
    } catch (error) {
      setPreview(null);
      setSelectedFile(null);
      setPreviewCache({});
      setStatus(error instanceof Error ? error.message : 'サンプル画像を読み込めませんでした');
    }
  };

  const regeneratePreview = async (options: AcrylicGenerationOptions = generationOptionsRef.current) => {
    if (!selectedFile) return;
    const resolvedOptions = withFixedPreviewOptions(options);
    const nextProductMode = productMode;
    const nextShapeMode = nextProductMode === 'keychain' ? holeMode : standMode;
    const nextCacheKey = getPreviewCacheKey(nextProductMode, nextShapeMode, resolvedOptions);
    const startedAt = Date.now();
    setIsProcessing(true);
    setStatus('プレビューを作成中です');
    setPreviewCache((current) => {
      const next = { ...current };
      delete next[nextCacheKey];
      return next;
    });
    try {
      await waitForNextFrame();
      await waitForNextFrame();
      const nextPreview = await buildPreview(selectedFile, nextProductMode, nextShapeMode, resolvedOptions);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await wait(900 - elapsed);
      setPreviewCache((current) => ({ ...current, [nextCacheKey]: nextPreview }));
      setPreview(nextPreview);
      rememberAutoStandClawWidth(nextPreview, resolvedOptions);
      setRotation({ y: 0 });
      rotationVelocityRef.current = { y: 0 };
      if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
      setStatus(`${selectedFile.name} を再生成しました`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'プレビューを作成できませんでした');
    } finally {
      setIsProcessing(false);
    }
  };

  const updateKeychainOption = <Key extends keyof AcrylicGenerationOptions['keychain']>(
    key: Key,
    value: AcrylicGenerationOptions['keychain'][Key],
  ) => {
    setGenerationOptions((current) => {
      const next = {
        ...current,
        keychain: {
          ...current.keychain,
          [key]: value,
        },
      };
      generationOptionsRef.current = next;
      return next;
    });
  };

  const updateStandOption = <Key extends keyof AcrylicGenerationOptions['stand']>(
    key: Key,
    value: AcrylicGenerationOptions['stand'][Key],
  ) => {
    setGenerationOptions((current) => {
      const next = {
        ...current,
        stand: {
          ...current.stand,
          [key]: value,
        },
      };
      generationOptionsRef.current = next;
      return next;
    });
  };

  const exportOrderFiles = async () => {
    if (!preview || isExporting || (!isDemo && productMode !== 'keychain')) return;
    setIsExporting(true);
    setStatus('SVGを作成中です');
    try {
      const fileBaseName = getExportFileBaseName(preview.fileName);
      const exportFileBaseName = productMode === 'stand' ? `${fileBaseName}-stand-${standMode}` : fileBaseName;
      const response = await fetch('/api/acrylic/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: exportFileBaseName,
          width: preview.width,
          height: preview.height,
          artworkDataUrl: preview.originalArtworkSrc,
          productMode,
          holeMode: productMode === 'keychain' ? holeMode : undefined,
          shapeMode: productMode === 'stand' ? standMode : undefined,
          debug: isDemo ? true : EXPORT_DEBUG_SVG,
          generationOptions: isDemo ? withFixedPreviewOptions(generationOptions) : DEFAULT_ACRYLIC_GENERATION_OPTIONS,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'SVGを作成できませんでした');
      }

      const blob = await response.blob();
      downloadBlob(blob, `${exportFileBaseName}${isDemo || EXPORT_DEBUG_SVG ? '.svg' : '.zip'}`);
      setStatus(isDemo || EXPORT_DEBUG_SVG ? 'デバッグ用SVGを書き出しました' : '発注用SVGと元画像をZIPで書き出しました');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SVGを作成できませんでした');
    } finally {
      setIsExporting(false);
    }
  };

  const requestAiGeneration = async () => {
    if (!preview || isAiGenerating) return;
    setIsAiGenerating(true);
    setStatus('AI生成APIへ送信中です');
    try {
      const response = await fetch('/api/acrylic/ai-generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: preview.fileName,
          productMode,
          shapeMode: productMode === 'keychain' ? holeMode : standMode,
          artworkDataUrl: preview.originalArtworkSrc,
          generationOptions: withFixedPreviewOptions(generationOptions),
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;
      if (response.status === 501) {
        setStatus(data?.message ?? 'AI生成は未実装です');
        return;
      }
      if (!response.ok) throw new Error(data?.error ?? 'AI生成APIへ送信できませんでした');
      setStatus(data?.message ?? 'AI生成APIへ送信しました');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'AI生成APIへ送信できませんでした');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const stopRotation = (event: PointerEvent<HTMLDivElement>) => {
    if (!isRotatingRef.current) return;
    isRotatingRef.current = false;
    setIsRotating(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const movedDistance = Math.abs(event.clientX - rotationStartPointerRef.current.x);
    if (movedDistance < 6) {
      rotationVelocityRef.current = { y: 0 };
      if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
      return;
    }
    runInertia();
  };

  const runInertia = () => {
    if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
    const tick = () => {
      const velocity = rotationVelocityRef.current;
      const speed = Math.abs(velocity.y);
      if (speed < ROTATION_MIN_SPEED) {
        inertiaFrameRef.current = null;
        return;
      }
      setRotation((current) => ({
        y: current.y + velocity.y,
      }));
      inertiaFrameRef.current = window.requestAnimationFrame(tick);
    };
    inertiaFrameRef.current = window.requestAnimationFrame(tick);
  };

  const isBackSide = Math.cos((rotation.y * Math.PI) / 180) < 0;
  const sideFacing = Math.sin((rotation.y * Math.PI) / 180);
  const visibleSideFacing = isBackSide ? -sideFacing : sideFacing;
  const leftFacingAmount = Math.max(0, -visibleSideFacing);
  const leftHighlightOpacity = (
    isBackSide ? 0 : Math.max(0, (leftFacingAmount - HIGHLIGHT_VISIBLE_START) / (1 - HIGHLIGHT_VISIBLE_START))
  ).toFixed(3);
  const rightShadeOpacity = Math.max(0, visibleSideFacing).toFixed(3);
  const sideLayerOpacity = (
    isBackSide
      ? Math.max(0, (Math.abs(sideFacing) - BACK_SIDE_SIDE_VISIBLE_START) / (1 - BACK_SIDE_SIDE_VISIBLE_START)) * 0.72
      : 1
  ).toFixed(3);
  const keychainArtworkBounds =
    preview && sourceArtworkBounds
      ? sourceArtworkBounds
      : preview
        ? {
            minX: 0,
            maxX: preview.width - 1,
            minY: 0,
            maxY: preview.height - 1,
            width: preview.width,
            height: preview.height,
          }
        : null;
  const keychainMetricScale = keychainArtworkBounds
    ? Math.max(keychainArtworkBounds.width, keychainArtworkBounds.height) / REFERENCE_ARTWORK_SIZE
    : 1;
  const keychainHoleOuterRadius = DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.holeOuterRadius * keychainMetricScale;
  const keychainHoleInnerRadius = DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.holeInnerRadius * keychainMetricScale;
  const keychainFixedHoleClearRadius = DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.clearRadius * keychainMetricScale;
  const keychainHoleCenterX = keychainArtworkBounds
    ? keychainArtworkBounds.minX + keychainArtworkBounds.width * generationOptions.keychain.holeCenterXRatio
    : 0;
  const keychainHoleCenterY = keychainArtworkBounds
    ? generationOptions.keychain.holeCenterYRatio === null
      ? Math.max(keychainHoleOuterRadius + 1, keychainArtworkBounds.minY - keychainHoleOuterRadius - generationOptions.keychain.holeGap * keychainMetricScale)
      : keychainArtworkBounds.minY + keychainArtworkBounds.height * generationOptions.keychain.holeCenterYRatio
    : 0;
  const keychainFlatPreviewStyle =
    preview && keychainArtworkBounds
      ? ({
          '--acrylic-flat-image-aspect': `${preview.width} / ${preview.height}`,
          '--acrylic-flat-hole-x': `${(keychainHoleCenterX / preview.width) * 100}%`,
          '--acrylic-flat-hole-y': `${(keychainHoleCenterY / preview.height) * 100}%`,
          '--acrylic-flat-hole-loop-width': `${(((keychainHoleOuterRadius + keychainFixedHoleClearRadius) * 2) / preview.width) * 100}%`,
          '--acrylic-flat-hole-loop-height': `${(((keychainHoleOuterRadius + keychainFixedHoleClearRadius) * 2) / preview.height) * 100}%`,
          '--acrylic-flat-hole-inner-size': `${(keychainHoleInnerRadius / Math.max(1, keychainHoleOuterRadius + keychainFixedHoleClearRadius)) * 100}%`,
        } as CSSProperties)
      : undefined;
  const activeFlatGuideSrc = marginGuideSrc || preview?.flatGuide.src || '';
  const standFlatPreviewStyle: StandFlatPreviewStyle =
    preview && preview.productMode === 'stand' && preview.standBaseFrame && keychainArtworkBounds
      ? (() => {
          const frame = preview.standBaseFrame;
          const artworkCenterX = keychainArtworkBounds.minX + keychainArtworkBounds.width / 2;
          const liveBaseWidth = generationOptions.stand.baseWidthPx ?? keychainArtworkBounds.width * (generationOptions.stand.baseWidthRatioPercent / 100);
          const liveBaseHeight = Math.max(
            DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.baseMinHeight,
            keychainArtworkBounds.width * (DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.baseHeightRatioPercent / 100),
          );
          const baseCenterX = frame.x + frame.width / 2;
          const baseLeft = baseCenterX - liveBaseWidth / 2;
          const baseTop = frame.contactY - liveBaseHeight / 2;
          const contactLine = preview.standContactLine;
          const fallbackClawFrame = preview.standClawFrame;
          const clawCenterX =
            artworkCenterX + (DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.clawCenterXRatio - 0.5) * keychainArtworkBounds.width;
          const edgeGap = Math.max(0, Math.round(BASE_STAND_CLAW_EDGE_GAP * keychainMetricScale));
          const autoSafeLeftX = contactLine ? Math.min(contactLine.rightX, contactLine.leftX + edgeGap) : fallbackClawFrame?.x;
          const autoSafeRightX = contactLine ? Math.max(contactLine.leftX, contactLine.rightX - edgeGap) : fallbackClawFrame ? fallbackClawFrame.x + fallbackClawFrame.width : undefined;
          const usesFixedPixelClawWidth = generationOptions.stand.clawWidthPx !== null;
          const leftBound = usesFixedPixelClawWidth ? 0 : autoSafeLeftX;
          const rightBound = usesFixedPixelClawWidth ? preview.width - 1 : autoSafeRightX;
          const leftSpan = autoSafeLeftX === undefined ? 0 : Math.max(0, clawCenterX - autoSafeLeftX);
          const rightSpan = autoSafeRightX === undefined ? 0 : Math.max(0, autoSafeRightX - clawCenterX);
          const autoHalfSpan = Math.floor(Math.min(leftSpan, rightSpan));
          const autoClawWidth = autoHalfSpan * 2 + 1;
          const requestedClawWidth =
            generationOptions.stand.clawWidthPx !== null
              ? Math.round(generationOptions.stand.clawWidthPx)
              : generationOptions.stand.clawWidthRatio === null
                ? autoClawWidth
                : Math.round(keychainArtworkBounds.width * generationOptions.stand.clawWidthRatio);
          const maxClawWidth = leftBound === undefined || rightBound === undefined ? 0 : Math.max(0, rightBound - leftBound + 1);
          const liveClawWidth = Math.min(maxClawWidth, Math.max(1, requestedClawWidth));
          const clawLeft =
            fallbackClawFrame && liveClawWidth <= 0
              ? fallbackClawFrame.x
              : Math.max(leftBound ?? 0, Math.min((rightBound ?? 0) - liveClawWidth + 1, Math.round(clawCenterX - liveClawWidth / 2)));
          const clawWidth = fallbackClawFrame && liveClawWidth <= 0 ? fallbackClawFrame.width : liveClawWidth;
          const clawTop = fallbackClawFrame?.y ?? frame.contactY;
          const clawHeight = Math.max(1, Math.round(generationOptions.stand.clawLengthPx ?? STAND_DEFAULT_CLAW_LENGTH_PX));
          const clawCornerRadius = DEFAULT_ACRYLIC_GENERATION_OPTIONS.stand.clawCornerRadius * keychainMetricScale;

          return {
            '--acrylic-flat-image-aspect': `${preview.width} / ${preview.height}`,
            '--acrylic-stand-flat-base-left': `${(baseLeft / preview.width) * 100}%`,
            '--acrylic-stand-flat-base-top': `${(baseTop / preview.height) * 100}%`,
            '--acrylic-stand-flat-base-width': `${(liveBaseWidth / preview.width) * 100}%`,
            '--acrylic-stand-flat-base-height': `${(liveBaseHeight / preview.height) * 100}%`,
            '--acrylic-stand-flat-claw-left': `${(clawLeft / preview.width) * 100}%`,
            '--acrylic-stand-flat-claw-top': `${(clawTop / preview.height) * 100}%`,
            '--acrylic-stand-flat-claw-width': `${(clawWidth / preview.width) * 100}%`,
            '--acrylic-stand-flat-claw-height': `${(clawHeight / preview.height) * 100}%`,
            '--acrylic-stand-flat-claw-radius': `${clawCornerRadius}px`,
          } as CSSProperties;
        })()
      : undefined;

  const updateKeychainHoleFromPointer = (event: PointerEvent<HTMLElement>) => {
    if (!preview || !keychainArtworkBounds || !holePreviewRef.current) return;
    const rect = holePreviewRef.current.getBoundingClientRect();
    const pointX = clampNumber(((event.clientX - rect.left) / rect.width) * preview.width, 0, preview.width);
    const pointY = clampNumber(((event.clientY - rect.top) / rect.height) * preview.height, 0, preview.height);

    updateKeychainOption(
      'holeCenterXRatio',
      clampNumber((pointX - keychainArtworkBounds.minX) / keychainArtworkBounds.width, 0, 1),
    );
    updateKeychainOption(
      'holeCenterYRatio',
      clampNumber((pointY - keychainArtworkBounds.minY) / keychainArtworkBounds.height, -0.5, 0.6),
    );
  };

  const startKeychainHolePreviewDrag = (event: PointerEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    isDraggingHolePreviewRef.current = true;
    updateKeychainHoleFromPointer(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveKeychainHolePreviewDrag = (event: PointerEvent<HTMLElement>) => {
    if (!isDraggingHolePreviewRef.current) return;
    event.preventDefault();
    updateKeychainHoleFromPointer(event);
  };

  const stopKeychainHolePreviewDrag = (event: PointerEvent<HTMLElement>) => {
    isDraggingHolePreviewRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div className="acrylic-tool">
      {!isDemo ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/png"
          className="visually-hidden"
          onChange={(event) => {
            void loadFile(event.target.files?.[0]);
            event.currentTarget.value = '';
          }}
        />
      ) : null}
      {isDemo ? (
        <div className="acrylic-demo-samples" aria-label="サンプル画像">
          {samples.map((sample) => (
            <button
              key={sample.src}
              type="button"
              className={cn('acrylic-demo-sample-button', activeSampleSrc === sample.src && 'is-active')}
              disabled={isProcessing}
              aria-label={`${sample.label}を選択`}
              onClick={() => {
                void loadSample(sample);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sample.src} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
      ) : null}
      <div className="acrylic-product-toggle" role="group" aria-label="作成タイプ">
        <button
          type="button"
          className={cn('acrylic-product-toggle-button', productMode === 'keychain' && 'is-active')}
          aria-pressed={productMode === 'keychain'}
          disabled={isProcessing}
          onClick={() => {
            if (productMode !== 'keychain') void switchPreviewMode('keychain', holeMode);
          }}
        >
          アクキー
        </button>
        <span className="acrylic-product-toggle-separator" aria-hidden="true">
          ｜
        </span>
        <button
          type="button"
          className={cn('acrylic-product-toggle-button', productMode === 'stand' && 'is-active')}
          aria-pressed={productMode === 'stand'}
          disabled={isProcessing}
          onClick={() => {
            if (productMode !== 'stand') void switchPreviewMode('stand', standMode);
          }}
        >
          アクスタ
        </button>
      </div>
      <div
        className={cn('acrylic-preview-wrap', preview && 'has-preview', isDragging && 'is-dragging')}
        role={!isDemo && !preview ? 'button' : undefined}
        tabIndex={!isDemo && !preview ? 0 : undefined}
        aria-live="polite"
        onClick={!isDemo && !preview ? () => inputRef.current?.click() : undefined}
        onKeyDown={
          isDemo || preview
            ? undefined
            : (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }
        }
        onDragEnter={
          isDemo
            ? undefined
            : (event) => {
                event.preventDefault();
                setIsDragging(true);
              }
        }
        onDragOver={
          isDemo
            ? undefined
            : (event) => {
                event.preventDefault();
                setIsDragging(true);
              }
        }
        onDragLeave={
          isDemo
            ? undefined
            : (event) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setIsDragging(false);
              }
        }
        onDrop={
          isDemo
            ? undefined
            : (event) => {
                event.preventDefault();
                setIsDragging(false);
                void loadFile(event.dataTransfer.files[0]);
              }
        }
      >
        {preview ? (
          <div
            className={cn('acrylic-preview', isRotating && 'is-rotating')}
            onPointerDown={(event) => {
              if (
                !renderedAcrylicSrc ||
                !renderedEdgeSrc ||
                !renderedSideSrc ||
                !renderedArtworkSrc ||
                !renderedBackArtworkSrc ||
                !renderedHighlightSrc
              ) {
                return;
              }
              event.preventDefault();
              if (inertiaFrameRef.current !== null) window.cancelAnimationFrame(inertiaFrameRef.current);
              inertiaFrameRef.current = null;
              rotationVelocityRef.current = { y: 0 };
              isRotatingRef.current = true;
              setIsRotating(true);
              rotationStartPointerRef.current = { x: event.clientX, y: event.clientY };
              lastPointerRef.current = { x: event.clientX, y: event.clientY, time: performance.now() };
              rotationStartValueRef.current = rotation;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={(event) => {
              if (!isRotatingRef.current) return;
              event.preventDefault();
              const rect = event.currentTarget.getBoundingClientRect();
              const deltaX = event.clientX - rotationStartPointerRef.current.x;
              const nextY = rotationStartValueRef.current.y + (deltaX / rect.width) * 130;
              const now = performance.now();
              const elapsed = Math.max(16, now - lastPointerRef.current.time);
              const frameScale = 16 / elapsed;
              rotationVelocityRef.current = {
                y: ((event.clientX - lastPointerRef.current.x) / rect.width) * 130 * frameScale,
              };
              lastPointerRef.current = { x: event.clientX, y: event.clientY, time: now };
              setRotation({ y: nextY });
            }}
            onPointerUp={stopRotation}
            onPointerCancel={stopRotation}
            onLostPointerCapture={() => {
              isRotatingRef.current = false;
              setIsRotating(false);
            }}
          >
            {SHOW_STAND_CSS_CIRCLE && preview.productMode === 'stand' && visibleStandCircleStyle ? (
              <div
                className="acrylic-preview-object acrylic-preview-stand-circle-object acrylic-preview-stand-circle-object-back"
                style={{
                  transform: `rotateY(${rotation.y}deg)`,
                } as CSSProperties}
              >
                <span
                  className="acrylic-preview-stand-test-circle acrylic-preview-stand-test-circle-back"
                  style={
                    {
                      ...visibleStandCircleStyle,
                      '--stand-front-arc-angle': `${rotation.y}deg`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className="acrylic-preview-stand-test-circle-bottom" />
                  {STAND_CYLINDER_SIDE_PANELS.map((panel) => (
                    <span
                      key={panel.angle}
                      className="acrylic-preview-stand-test-cylinder-side"
                      style={
                        {
                          '--stand-cylinder-side-angle': `${panel.angle}deg`,
                          '--stand-cylinder-side-width': `${panel.width}%`,
                        } as CSSProperties
                      }
                    />
                  ))}
                  <span className="acrylic-preview-stand-test-circle-back-line" />
                </span>
              </div>
            ) : null}
            {renderedAcrylicSrc && renderedEdgeSrc && renderedSideSrc && renderedArtworkSrc && renderedBackArtworkSrc && renderedHighlightSrc ? (
              <>
                {SHOW_STAND_BASE_SVG && preview.productMode === 'stand' && visibleStandBaseStyle && visibleStandBaseGeometry ? (
                  <div className="acrylic-preview-stand-base" style={visibleStandBaseStyle} aria-hidden="true">
                    <svg className="acrylic-preview-stand-base-svg" viewBox={STAND_BASE_SVG_VIEW_BOX} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="acrylicStandBaseSideHighlight" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0" stopColor="#ffffff" stopOpacity="0.62" />
                          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.22" />
                          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="acrylicStandBaseSideClip">
                          <path d={visibleStandBaseGeometry.sideFillPath} />
                        </clipPath>
                      </defs>
                      <path className="acrylic-preview-stand-base-side-fill" d={visibleStandBaseGeometry.sideFillPath} />
                      <rect
                        className="acrylic-preview-stand-base-side-highlight"
                        x={STAND_BASE_SIDE_HIGHLIGHT_X}
                        y="0"
                        width={STAND_BASE_SIDE_HIGHLIGHT_WIDTH}
                        height={STAND_BASE_SVG_VIEW_HEIGHT}
                        clipPath="url(#acrylicStandBaseSideClip)"
                      />
                      <path className="acrylic-preview-stand-base-bottom" d={visibleStandBaseGeometry.bottomPath} />
                      <path className="acrylic-preview-stand-base-side-left" d={visibleStandBaseGeometry.sideLeftPath} />
                      <path className="acrylic-preview-stand-base-side-right" d={visibleStandBaseGeometry.sideRightPath} />
                      <path className="acrylic-preview-stand-base-top" d={visibleStandBaseGeometry.topPath} />
                    </svg>
                  </div>
                ) : null}
                <div
                  className="acrylic-preview-object"
                  style={{
                    transform: `rotateY(${rotation.y}deg)`,
                  } as CSSProperties}
                >
                  {preview.productMode === 'keychain' ? ACRYLIC_SIDE_LAYERS.map((zPosition) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={zPosition}
                      className="acrylic-preview-image acrylic-preview-side-image"
                      src={renderedSideSrc}
                      alt=""
                      style={
                        {
                          '--acrylic-side-z': `${zPosition}px`,
                          '--acrylic-side-opacity': sideLayerOpacity,
                        } as CSSProperties
                      }
                      aria-hidden="true"
                    />
                  )) : null}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="acrylic-preview-image acrylic-preview-edge-image" src={renderedEdgeSrc} alt="" aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="acrylic-preview-image acrylic-preview-acrylic-image" src={renderedAcrylicSrc} alt="" aria-hidden="true" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="acrylic-preview-image acrylic-preview-artwork-image"
                    src={isBackSide ? renderedBackArtworkSrc : renderedArtworkSrc}
                    alt={`${preview.fileName}の${preview.productMode === 'stand' ? 'アクスタ' : 'アクキー'}完成予想`}
                    style={{
                      '--acrylic-right-shade': rightShadeOpacity,
                    } as CSSProperties}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    className="acrylic-preview-image acrylic-preview-light-image"
                    src={renderedHighlightSrc}
                    alt=""
                    style={{
                      '--acrylic-left-light': leftHighlightOpacity,
                    } as CSSProperties}
                    aria-hidden="true"
                  />
                </div>
              </>
            ) : null}
            {SHOW_STAND_CSS_CIRCLE && preview.productMode === 'stand' && visibleStandCircleStyle ? (
              <div
                className="acrylic-preview-object acrylic-preview-stand-circle-object acrylic-preview-stand-circle-object-front"
                style={{
                  transform: `rotateY(${rotation.y}deg)`,
                } as CSSProperties}
              >
                <span
                  className="acrylic-preview-stand-test-circle acrylic-preview-stand-test-circle-front-layer"
                  style={
                    {
                      ...visibleStandCircleStyle,
                      '--stand-front-arc-angle': `${rotation.y}deg`,
                    } as CSSProperties
                  }
                  aria-hidden="true"
                >
                  <span className="acrylic-preview-stand-test-circle-front-line" />
                  <span className="acrylic-preview-stand-test-circle-front" />
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="acrylic-preview-empty">
            <span>{isDemo ? 'サンプルを選択してください' : 'PNGを選択してください'}</span>
          </div>
        )}
      </div>
      <div className="acrylic-hole-toggle" role="group" aria-label={productMode === 'stand' ? 'アクスタ底面タイプ' : 'ボールチェーン穴'}>
        {productMode === 'keychain' ? (
          <>
            <button
              type="button"
              className={cn('acrylic-hole-toggle-button', holeMode === 'with-hole' && 'is-active')}
              aria-pressed={holeMode === 'with-hole'}
              disabled={isProcessing}
              onClick={() => {
                if (holeMode !== 'with-hole') void switchPreviewMode('keychain', 'with-hole');
              }}
            >
              穴あり
            </button>
            <span className="acrylic-hole-toggle-separator" aria-hidden="true">
              ｜
            </span>
            <button
              type="button"
              className={cn('acrylic-hole-toggle-button', holeMode === 'without-hole' && 'is-active')}
              aria-pressed={holeMode === 'without-hole'}
              disabled={isProcessing}
              onClick={() => {
                if (holeMode !== 'without-hole') void switchPreviewMode('keychain', 'without-hole');
              }}
            >
              穴なし
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className={cn('acrylic-hole-toggle-button', standMode === 'simple' && 'is-active')}
              aria-pressed={standMode === 'simple'}
              disabled={isProcessing}
              onClick={() => {
                if (standMode !== 'simple') void switchPreviewMode('stand', 'simple');
              }}
            >
              シンプル
            </button>
            <span className="acrylic-hole-toggle-separator" aria-hidden="true">
              ｜
            </span>
            <button
              type="button"
              className={cn('acrylic-hole-toggle-button', standMode === 'stable' && 'is-active')}
              aria-pressed={standMode === 'stable'}
              disabled={isProcessing}
              onClick={() => {
                if (standMode !== 'stable') void switchPreviewMode('stand', 'stable');
              }}
            >
              安定
            </button>
          </>
        )}
      </div>
      <div className="acrylic-tool-actions">
        {!isDemo ? (
          <button type="button" className="acrylic-file-button" onClick={() => inputRef.current?.click()}>
            {preview ? '新しいPNGを選択' : 'PNGを選択'}
          </button>
        ) : (
          <button type="button" className="acrylic-file-button" disabled={!preview || isProcessing} onClick={() => setIsOptionsOpen(true)}>
            {productMode === 'stand' ? '台座・ツメ変更' : '穴の位置・余白変更'}
          </button>
        )}
        {preview && (productMode === 'keychain' || isDemo) ? (
          <button type="button" className="acrylic-file-button" disabled={isProcessing || isExporting} onClick={() => void exportOrderFiles()}>
            {isExporting ? '作成中' : isDemo ? 'SVG生成' : 'SVGを書き出す'}
          </button>
        ) : null}
        {SHOW_AI_GENERATION_BUTTON && isDemo && preview ? (
          <button type="button" className="acrylic-file-button" disabled={isProcessing || isAiGenerating} onClick={() => void requestAiGeneration()}>
            {isAiGenerating ? '送信中' : 'AI生成'}
          </button>
        ) : null}
      </div>
      <p className="acrylic-tool-status" role="status" aria-live="polite">
        {status}
      </p>
      {isProcessing ? (
        <div className="acrylic-processing-modal" role="status" aria-live="assertive" aria-label="プレビューを作成中です">
          <div className="acrylic-processing-panel">
            <span>プレビューを作成中です</span>
            <span className="acrylic-processing-dots" aria-hidden="true">
              {'.'.repeat(processingDotCount)}
            </span>
          </div>
        </div>
      ) : null}
      {isDemo && isOptionsOpen ? (
        <div className="acrylic-options-modal" role="dialog" aria-modal="true" aria-label={productMode === 'stand' ? '台座・ツメ変更' : '穴の位置・余白変更'}>
          <div className="acrylic-options-panel">
            <div className="acrylic-options-fields">
              {productMode === 'keychain' ? (
                <>
                  {preview && keychainFlatPreviewStyle ? (
                    <div
                      ref={holePreviewRef}
                      className="acrylic-hole-flat-preview"
                      style={keychainFlatPreviewStyle}
                      onPointerDown={startKeychainHolePreviewDrag}
                      onPointerMove={moveKeychainHolePreviewDrag}
                      onPointerUp={stopKeychainHolePreviewDrag}
                      onPointerCancel={stopKeychainHolePreviewDrag}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview.originalArtworkSrc} alt="" aria-hidden="true" />
                      {activeFlatGuideSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="acrylic-hole-flat-margin-guide" src={activeFlatGuideSrc} alt="" aria-hidden="true" />
                      ) : null}
                      <span className="acrylic-hole-flat-loop" aria-hidden="true">
                        <span className="acrylic-hole-flat-inner" />
                      </span>
                    </div>
                  ) : null}
                  <label className="acrylic-options-field acrylic-options-field-combo">
                    <span>キャラ余白</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={generationOptions.keychain.clearRadius}
                      onChange={(event) => updateKeychainOption('clearRadius', Number(event.currentTarget.value))}
                    />
                    <input
                      type="number"
                      min="0"
                      max="240"
                      value={generationOptions.keychain.clearRadius}
                      onChange={(event) => updateKeychainOption('clearRadius', Number(event.currentTarget.value))}
                    />
                  </label>
                </>
              ) : (
                <>
                  {preview && standFlatPreviewStyle ? (
                    <div className="acrylic-stand-flat-preview" style={standFlatPreviewStyle}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={preview.originalArtworkSrc} alt="" aria-hidden="true" />
                      {activeFlatGuideSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="acrylic-stand-flat-margin-guide" src={activeFlatGuideSrc} alt="" aria-hidden="true" />
                      ) : null}
                      <span className="acrylic-stand-flat-claw" aria-hidden="true" />
                      <span className="acrylic-stand-flat-base" aria-hidden="true" />
                    </div>
                  ) : null}
                  <label className="acrylic-options-field acrylic-options-field-combo">
                    <span>キャラ余白</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={generationOptions.keychain.clearRadius}
                      onChange={(event) => updateKeychainOption('clearRadius', Number(event.currentTarget.value))}
                    />
                    <input
                      type="number"
                      min="0"
                      max="240"
                      value={generationOptions.keychain.clearRadius}
                      onChange={(event) => updateKeychainOption('clearRadius', Number(event.currentTarget.value))}
                    />
                  </label>
                  <label className="acrylic-options-field acrylic-options-field-combo">
                    <span>台座の横幅</span>
                    <input
                      type="range"
                      min="120"
                      max="900"
                      step="1"
                      value={Math.round(generationOptions.stand.baseWidthPx ?? STAND_DEFAULT_BASE_WIDTH_PX)}
                      onChange={(event) => updateStandOption('baseWidthPx', Number(event.currentTarget.value))}
                    />
                    <input
                      type="number"
                      min="1"
                      max="2000"
                      value={Math.round(generationOptions.stand.baseWidthPx ?? STAND_DEFAULT_BASE_WIDTH_PX)}
                      onChange={(event) => updateStandOption('baseWidthPx', Number(event.currentTarget.value))}
                    />
                  </label>
                  <label className="acrylic-options-field acrylic-options-field-combo">
                    <span>ツメの横幅</span>
                    <input
                      type="range"
                      min="5"
                      max="180"
                      step="1"
                      value={Math.round(generationOptions.stand.clawWidthPx ?? STAND_DEFAULT_CLAW_WIDTH_PX)}
                      onChange={(event) => updateStandOption('clawWidthPx', Number(event.currentTarget.value))}
                    />
                    <input
                      type="number"
                      min="1"
                      max="480"
                      value={Math.round(generationOptions.stand.clawWidthPx ?? STAND_DEFAULT_CLAW_WIDTH_PX)}
                      onChange={(event) => updateStandOption('clawWidthPx', Number(event.currentTarget.value))}
                    />
                  </label>
                </>
              )}
            </div>
            <div className="acrylic-options-actions">
              <button
                type="button"
                className="acrylic-file-button"
                onClick={() => {
                  const initialOptions = createInitialGenerationOptions(isDemo);
                  generationOptionsRef.current = initialOptions;
                  setGenerationOptions(initialOptions);
                }}
              >
                初期値
              </button>
              <button type="button" className="acrylic-file-button" onClick={() => setIsOptionsOpen(false)}>
                閉じる
              </button>
              <button
                type="button"
                className="acrylic-file-button"
                disabled={isProcessing}
                onClick={() => {
                  setIsOptionsOpen(false);
                  void regeneratePreview();
                }}
              >
                再生成
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
