'use client';

import { type CSSProperties, type PointerEvent, useEffect, useRef, useState } from 'react';
import { DEFAULT_ACRYLIC_GENERATION_OPTIONS } from '@/lib/acrylicGenerationOptions';
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
  standBaseFrame: {
    x: number;
    y: number;
    contactY: number;
    width: number;
    height: number;
    depthOffset: number;
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

type PreviewCacheKey = `${ProductMode}:${ShapeMode}`;

type PreviewCache = Partial<Record<PreviewCacheKey, PreviewState>>;

type PreviewStageSize = {
  width: number;
  height: number;
};

type StandPreviewStyles = {
  base: CSSProperties;
  circle: CSSProperties;
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
const EXPORT_DEBUG_SVG = false;
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
const SHOW_STAND_BASE_SVG = false;
const STAND_BASE_SVG_VIEW_WIDTH = 1000;
const STAND_BASE_SVG_VIEW_HEIGHT = 300;
const STAND_BASE_SVG_VIEW_BOX = `0 0 ${STAND_BASE_SVG_VIEW_WIDTH} ${STAND_BASE_SVG_VIEW_HEIGHT}`;
const STAND_BASE_SVG_LEFT = 34;
const STAND_BASE_SVG_RIGHT = 966;
const STAND_BASE_SVG_TOP_CENTER_Y = 118;
const STAND_BASE_SVG_TOP_HEIGHT = 130;
const STAND_BASE_SVG_SAMPLE_COUNT = 48;
const STAND_BASE_SVG_TILT_DEGREES = 78;
const STAND_BASE_SVG_PERSPECTIVE = 2200;
const STAND_BASE_SVG_THICKNESS_Y = 26;
const STAND_BASE_SIDE_HIGHLIGHT_X = 34;
const STAND_BASE_SIDE_HIGHLIGHT_WIDTH = 40;

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

function createStandBaseSvgGeometry() {
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
  const topY = centerY - STAND_BASE_SVG_TOP_HEIGHT / 2;
  const widthScale = (STAND_BASE_SVG_RIGHT - STAND_BASE_SVG_LEFT) / (maxX - minX);
  const heightScale = STAND_BASE_SVG_TOP_HEIGHT / (maxY - minY);

  const topPoints = projectedPoints.map((point) => ({
    x: STAND_BASE_SVG_LEFT + (point.x - minX) * widthScale,
    y: topY + (point.y - minY) * heightScale,
  }));
  const bottomPoints = offsetSvgPoints(topPoints, STAND_BASE_SVG_THICKNESS_Y);
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

const STAND_BASE_SVG_GEOMETRY = createStandBaseSvgGeometry();

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

function findCanvasAlphaBounds(context: CanvasRenderingContext2D, width: number, height: number) {
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

  return maxX >= 0 ? { minX, maxX, minY, maxY } : null;
}

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
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

function getPreviewCacheKey(productMode: ProductMode, shapeMode: ShapeMode): PreviewCacheKey {
  return `${productMode}:${shapeMode}`;
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

function createStandPreviewStyles(preview: PreviewState, stage: PreviewStageSize, contactYOverride?: number): StandPreviewStyles | null {
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
  const contactY = contactYOverride ?? drawY + frame.contactY * scale;
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

async function buildPreview(file: File, productMode: ProductMode, shapeMode: ShapeMode): Promise<PreviewState> {
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
      generationOptions: DEFAULT_ACRYLIC_GENERATION_OPTIONS,
    }),
  });

  const data = (await response.json().catch(() => null)) as (PreviewState & { error?: string }) | null;
  if (!response.ok || !data) {
    throw new Error(data?.error ?? 'プレビューを作成できませんでした');
  }

  return data;
}

export function AcrylicKeychainTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const isRotatingRef = useRef(false);
  const inertiaFrameRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0, time: 0 });
  const rotationVelocityRef = useRef<RotationVelocity>({ y: 0 });
  const rotationStartPointerRef = useRef({ x: 0, y: 0 });
  const rotationStartValueRef = useRef<PreviewRotation>({ y: 0 });
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewCache, setPreviewCache] = useState<PreviewCache>({});
  const [productMode, setProductMode] = useState<ProductMode>('keychain');
  const [holeMode, setHoleMode] = useState<HoleMode>('with-hole');
  const [standMode, setStandMode] = useState<StandMode>('simple');
  const [renderedAcrylicSrc, setRenderedAcrylicSrc] = useState('');
  const [renderedEdgeSrc, setRenderedEdgeSrc] = useState('');
  const [renderedSideSrc, setRenderedSideSrc] = useState('');
  const [renderedArtworkSrc, setRenderedArtworkSrc] = useState('');
  const [renderedBackArtworkSrc, setRenderedBackArtworkSrc] = useState('');
  const [renderedHighlightSrc, setRenderedHighlightSrc] = useState('');
  const [standBaseStyle, setStandBaseStyle] = useState<CSSProperties | null>(null);
  const [standCircleStyle, setStandCircleStyle] = useState<CSSProperties | null>(null);
  const [rotation, setRotation] = useState<PreviewRotation>({ y: 0 });
  const [isRotating, setIsRotating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [processingDotCount, setProcessingDotCount] = useState(1);
  const [previewLayoutKey, setPreviewLayoutKey] = useState(0);
  const [status, setStatus] = useState('PNGを選択してください');
  const immediateStandPreviewStyles =
    preview && preview.productMode === 'stand' && preview.standBaseFrame ? createStandPreviewStyles(preview, getPreviewStageSize()) : null;
  const visibleStandBaseStyle = preview?.productMode === 'stand' ? (immediateStandPreviewStyles?.base ?? standBaseStyle ?? null) : null;
  const visibleStandCircleStyle = preview?.productMode === 'stand' ? (immediateStandPreviewStyles?.circle ?? standCircleStyle ?? null) : null;

  useEffect(() => {
    if (!preview) {
      setRenderedAcrylicSrc('');
      setRenderedEdgeSrc('');
      setRenderedSideSrc('');
      setRenderedArtworkSrc('');
      setRenderedBackArtworkSrc('');
      setRenderedHighlightSrc('');
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

    const setStandPreviewStyles = (contactYOverride?: number) => {
      const nextStyles = createStandPreviewStyles(preview, stage, contactYOverride);
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
        if (preview.productMode === 'stand' && preview.standBaseFrame) {
          const acrylicBounds = findCanvasAlphaBounds(acrylicContext, stage.width, stage.height);
          setStandPreviewStyles(acrylicBounds?.maxY);
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

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    const startedAt = Date.now();
    const nextProductMode = productMode;
    const nextShapeMode = nextProductMode === 'keychain' ? holeMode : standMode;
    const nextCacheKey = getPreviewCacheKey(nextProductMode, nextShapeMode);
    setIsProcessing(true);
    setStatus('プレビューを作成中です');
    setSelectedFile(file);
    setPreviewCache({});
    try {
      await waitForNextFrame();
      await waitForNextFrame();
      const nextPreview = await buildPreview(file, nextProductMode, nextShapeMode);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await wait(900 - elapsed);
      setPreviewCache({ [nextCacheKey]: nextPreview });
      setPreview(nextPreview);
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

    const nextCacheKey = getPreviewCacheKey(nextProductMode, nextShapeMode);
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
      const nextPreview = await buildPreview(selectedFile, nextProductMode, nextShapeMode);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await wait(900 - elapsed);
      setPreviewCache((current) => ({ ...current, [nextCacheKey]: nextPreview }));
      setPreview(nextPreview);
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

  const exportOrderFiles = async () => {
    if (!preview || isExporting || productMode !== 'keychain') return;
    setIsExporting(true);
    setStatus('SVGを作成中です');
    try {
      const fileBaseName = getExportFileBaseName(preview.fileName);
      const response = await fetch('/api/acrylic/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: fileBaseName,
          width: preview.width,
          height: preview.height,
          artworkDataUrl: preview.originalArtworkSrc,
          holeMode,
          debug: EXPORT_DEBUG_SVG,
          generationOptions: DEFAULT_ACRYLIC_GENERATION_OPTIONS,
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? 'SVGを作成できませんでした');
      }

      const blob = await response.blob();
      downloadBlob(blob, `${fileBaseName}${EXPORT_DEBUG_SVG ? '.svg' : '.zip'}`);
      setStatus(EXPORT_DEBUG_SVG ? 'デバッグ用SVGを書き出しました' : '発注用SVGと元画像をZIPで書き出しました');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'SVGを作成できませんでした');
    } finally {
      setIsExporting(false);
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

  return (
    <div className="acrylic-tool">
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
        role={preview ? undefined : 'button'}
        tabIndex={preview ? undefined : 0}
        aria-live="polite"
        onClick={preview ? undefined : () => inputRef.current?.click()}
        onKeyDown={
          preview
            ? undefined
            : (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }
        }
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          void loadFile(event.dataTransfer.files[0]);
        }}
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
            {preview.productMode === 'stand' && visibleStandCircleStyle ? (
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
                {SHOW_STAND_BASE_SVG && preview.productMode === 'stand' && visibleStandBaseStyle ? (
                  <div className="acrylic-preview-stand-base" style={visibleStandBaseStyle} aria-hidden="true">
                    <svg className="acrylic-preview-stand-base-svg" viewBox={STAND_BASE_SVG_VIEW_BOX} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="acrylicStandBaseSideHighlight" x1="0" x2="1" y1="0" y2="0">
                          <stop offset="0" stopColor="#ffffff" stopOpacity="0.62" />
                          <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.22" />
                          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
                        </linearGradient>
                        <clipPath id="acrylicStandBaseSideClip">
                          <path d={STAND_BASE_SVG_GEOMETRY.sideFillPath} />
                        </clipPath>
                      </defs>
                      <path className="acrylic-preview-stand-base-side-fill" d={STAND_BASE_SVG_GEOMETRY.sideFillPath} />
                      <rect
                        className="acrylic-preview-stand-base-side-highlight"
                        x={STAND_BASE_SIDE_HIGHLIGHT_X}
                        y="0"
                        width={STAND_BASE_SIDE_HIGHLIGHT_WIDTH}
                        height={STAND_BASE_SVG_VIEW_HEIGHT}
                        clipPath="url(#acrylicStandBaseSideClip)"
                      />
                      <path className="acrylic-preview-stand-base-bottom" d={STAND_BASE_SVG_GEOMETRY.bottomPath} />
                      <path className="acrylic-preview-stand-base-side-left" d={STAND_BASE_SVG_GEOMETRY.sideLeftPath} />
                      <path className="acrylic-preview-stand-base-side-right" d={STAND_BASE_SVG_GEOMETRY.sideRightPath} />
                      <path className="acrylic-preview-stand-base-top" d={STAND_BASE_SVG_GEOMETRY.topPath} />
                    </svg>
                  </div>
                ) : null}
                <div
                  className="acrylic-preview-object"
                  style={{
                    transform: `rotateY(${rotation.y}deg)`,
                  } as CSSProperties}
                >
                  {ACRYLIC_SIDE_LAYERS.map((zPosition) => (
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
                  ))}
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
            {preview.productMode === 'stand' && visibleStandCircleStyle ? (
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
            <span>PNGを選択してください</span>
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
        <button type="button" className="acrylic-file-button" onClick={() => inputRef.current?.click()}>
          {preview ? '新しいPNGを選択' : 'PNGを選択'}
        </button>
        {preview && productMode === 'keychain' ? (
          <button type="button" className="acrylic-file-button" disabled={isProcessing || isExporting} onClick={() => void exportOrderFiles()}>
            {isExporting ? '作成中' : 'SVGを書き出す'}
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
    </div>
  );
}
