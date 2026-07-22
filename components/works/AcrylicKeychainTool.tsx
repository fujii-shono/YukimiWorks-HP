'use client';

import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/format';

type PreviewState = {
  acrylicSrc: string;
  artworkSrc: string;
  width: number;
  height: number;
  fileName: string;
};

const MAX_IMAGE_SIZE = 820;
const MAX_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const PREVIEW_STAGE_WIDTH = 960;
const PREVIEW_STAGE_HEIGHT = 620;
const MOBILE_PREVIEW_STAGE_WIDTH = 720;
const MOBILE_PREVIEW_STAGE_HEIGHT = 720;
const PREVIEW_ARTWORK_MAX_WIDTH_RATIO = 0.98;
const PREVIEW_ARTWORK_MAX_HEIGHT_RATIO = 0.98;
const MOBILE_PREVIEW_ARTWORK_MAX_WIDTH_RATIO = 0.98;
const MOBILE_PREVIEW_ARTWORK_MAX_HEIGHT_RATIO = 0.98;
const MASK_RENDER_SCALE = 0.5;
const CLEAR_RADIUS = 10;
const HIGHLIGHT_RADIUS = 1;
const TOP_LOOP_SPACE = 0;
const ARTWORK_MULTIPLY_COLOR = 'rgb(242, 241, 241)';
const EDGE_SHADOW_WIDTH = 4;
const INNER_SHINE_WIDTH = 2;
const SURFACE_GLOSS_OPACITY = 0.46;
const ACRYLIC_DARK_EDGE_COLOR: [number, number, number, number] = [108, 112, 124, 58];
const ACRYLIC_DARK_EDGE_OFFSET = { x: 1, y: -1 };
const ACRYLIC_WHITE_HIGHLIGHT_COLOR: [number, number, number, number] = [255, 255, 255, 230];
const ACRYLIC_WHITE_HIGHLIGHT_OFFSET = { x: -1, y: -1 };

function createCircleOffsets(radius: number) {
  const offsets: Array<[number, number]> = [];
  const squaredRadius = radius * radius;
  for (let y = -radius; y <= radius; y += 1) {
    for (let x = -radius; x <= radius; x += 1) {
      if (x * x + y * y <= squaredRadius) offsets.push([x, y]);
    }
  }
  return offsets;
}

async function dilateMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const output = new Uint8Array(width * height);
  const offsets = createCircleOffsets(radius);

  for (let index = 0; index < width * height; index += 1) {
    if (index > 0 && index % 12000 === 0) await waitForNextFrame();
    if (!mask[index]) continue;
    const sourceX = index % width;
    const sourceY = Math.floor(index / width);
    for (const [offsetX, offsetY] of offsets) {
      const x = sourceX + offsetX;
      const y = sourceY + offsetY;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      output[y * width + x] = 1;
    }
  }

  return output;
}

function drawMaskLayer(
  context: CanvasRenderingContext2D,
  mask: Uint8Array,
  width: number,
  height: number,
  color: [number, number, number, number],
  filter = 'none',
  offset = { x: 0, y: 0 },
) {
  const { canvas } = makeLayerFromMask(width, height, (index) => (mask[index] ? color : null));
  context.save();
  context.filter = filter;
  context.drawImage(canvas, offset.x, offset.y);
  context.restore();
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

function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
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

function scaleMaskRadius(radius: number) {
  return Math.max(1, Math.round(radius * MASK_RENDER_SCALE));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function makeLayerFromMask(
  width: number,
  height: number,
  paint: (index: number) => [number, number, number, number] | null,
) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvasを初期化できませんでした');

  const imageData = context.createImageData(width, height);
  for (let index = 0; index < width * height; index += 1) {
    const color = paint(index);
    if (!color) continue;
    const offset = index * 4;
    imageData.data[offset] = color[0];
    imageData.data[offset + 1] = color[1];
    imageData.data[offset + 2] = color[2];
    imageData.data[offset + 3] = color[3];
  }
  context.putImageData(imageData, 0, 0);
  return { canvas, context };
}

async function fileToImage(file: File) {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('PNGを読み込めませんでした'));
    reader.readAsDataURL(file);
  });
  const image = new Image();
  image.decoding = 'async';
  image.src = dataUrl;
  await image.decode();
  return image;
}

async function buildPreview(file: File): Promise<PreviewState> {
  if (file.type !== 'image/png') {
    throw new Error('PNGファイルを選択してください');
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error('3MB以下のPNGファイルを選択してください');
  }

  const image = await fileToImage(file);
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const imageWidth = Math.max(1, Math.round(image.naturalWidth * scale));
  const imageHeight = Math.max(1, Math.round(image.naturalHeight * scale));
  const padding = CLEAR_RADIUS + HIGHLIGHT_RADIUS + 20;

  const sourceCanvas = document.createElement('canvas');
  sourceCanvas.width = imageWidth;
  sourceCanvas.height = imageHeight;
  const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
  if (!sourceContext) throw new Error('PNGを解析できませんでした');
  sourceContext.drawImage(image, 0, 0, imageWidth, imageHeight);

  const sourcePixels = sourceContext.getImageData(0, 0, imageWidth, imageHeight).data;
  let sourceMinX = imageWidth;
  let sourceMaxX = 0;
  let sourceMinY = imageHeight;
  let sourceMaxY = 0;

  for (let index = 0; index < imageWidth * imageHeight; index += 1) {
    if (index > 0 && index % 12000 === 0) await waitForNextFrame();
    if (sourcePixels[index * 4 + 3] <= 8) continue;
    const x = index % imageWidth;
    const y = Math.floor(index / imageWidth);
    sourceMinX = Math.min(sourceMinX, x);
    sourceMaxX = Math.max(sourceMaxX, x);
    sourceMinY = Math.min(sourceMinY, y);
    sourceMaxY = Math.max(sourceMaxY, y);
  }

  if (sourceMinX > sourceMaxX || sourceMinY > sourceMaxY) {
    throw new Error('透明ではない部分が見つかりませんでした');
  }

  const cropWidth = sourceMaxX - sourceMinX + 1;
  const cropHeight = sourceMaxY - sourceMinY + 1;
  const width = cropWidth + padding * 2;
  const height = cropHeight + padding * 2 + TOP_LOOP_SPACE;
  const imageX = padding - sourceMinX;
  const imageY = padding + TOP_LOOP_SPACE - sourceMinY;

  const maskWidth = Math.max(1, Math.ceil(width * MASK_RENDER_SCALE));
  const maskHeight = Math.max(1, Math.ceil(height * MASK_RENDER_SCALE));
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskContext = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskContext) throw new Error('PNGを解析できませんでした');

  maskContext.drawImage(
    image,
    imageX * MASK_RENDER_SCALE,
    imageY * MASK_RENDER_SCALE,
    imageWidth * MASK_RENDER_SCALE,
    imageHeight * MASK_RENDER_SCALE,
  );
  const pixels = maskContext.getImageData(0, 0, maskWidth, maskHeight).data;
  const baseMask = new Uint8Array(maskWidth * maskHeight);

  for (let index = 0; index < maskWidth * maskHeight; index += 1) {
    if (index > 0 && index % 12000 === 0) await waitForNextFrame();
    if (pixels[index * 4 + 3] <= 8) continue;
    baseMask[index] = 1;
  }

  const clearRadius = scaleMaskRadius(CLEAR_RADIUS);
  const edgeRadius = scaleMaskRadius(CLEAR_RADIUS + EDGE_SHADOW_WIDTH);
  const highlightRadius = scaleMaskRadius(CLEAR_RADIUS + HIGHLIGHT_RADIUS);
  const innerShineRadius = Math.max(0, Math.round((CLEAR_RADIUS - INNER_SHINE_WIDTH) * MASK_RENDER_SCALE));
  const clearMask = await dilateMask(baseMask, maskWidth, maskHeight, clearRadius);
  const edgeMask = await dilateMask(baseMask, maskWidth, maskHeight, edgeRadius);
  const highlightMask = await dilateMask(baseMask, maskWidth, maskHeight, highlightRadius);
  const innerShineMask = await dilateMask(baseMask, maskWidth, maskHeight, innerShineRadius);
  const acrylicLow = makeLayerFromMask(maskWidth, maskHeight, () => null);

  drawMaskLayer(acrylicLow.context, edgeMask, maskWidth, maskHeight, [88, 96, 112, 34], 'blur(0.7px)');
  drawMaskLayer(acrylicLow.context, highlightMask, maskWidth, maskHeight, [255, 255, 255, 58]);

  acrylicLow.context.save();
  acrylicLow.context.globalCompositeOperation = 'destination-out';
  drawMaskLayer(acrylicLow.context, clearMask, maskWidth, maskHeight, [0, 0, 0, 255]);
  acrylicLow.context.restore();

  const darkEdgeLine = makeLayerFromMask(maskWidth, maskHeight, (index) =>
    edgeMask[index] && !clearMask[index] ? ACRYLIC_DARK_EDGE_COLOR : null,
  );
  const whiteHighlightLine = makeLayerFromMask(maskWidth, maskHeight, (index) =>
    highlightMask[index] && !innerShineMask[index] ? ACRYLIC_WHITE_HIGHLIGHT_COLOR : null,
  );
  acrylicLow.context.drawImage(
    darkEdgeLine.canvas,
    ACRYLIC_DARK_EDGE_OFFSET.x * MASK_RENDER_SCALE,
    ACRYLIC_DARK_EDGE_OFFSET.y * MASK_RENDER_SCALE,
  );
  acrylicLow.context.drawImage(
    whiteHighlightLine.canvas,
    ACRYLIC_WHITE_HIGHLIGHT_OFFSET.x * MASK_RENDER_SCALE,
    ACRYLIC_WHITE_HIGHLIGHT_OFFSET.y * MASK_RENDER_SCALE,
  );

  acrylicLow.context.save();
  acrylicLow.context.globalCompositeOperation = 'source-atop';
  const edgeGloss = acrylicLow.context.createLinearGradient(0, 0, maskWidth, maskHeight);
  edgeGloss.addColorStop(0, 'rgba(255,255,255,0.72)');
  edgeGloss.addColorStop(0.28, 'rgba(255,255,255,0.36)');
  edgeGloss.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  edgeGloss.addColorStop(1, 'rgba(142,146,158,0.22)');
  acrylicLow.context.fillStyle = edgeGloss;
  acrylicLow.context.fillRect(0, 0, maskWidth, maskHeight);
  acrylicLow.context.restore();

  acrylicLow.context.save();
  acrylicLow.context.globalCompositeOperation = 'source-atop';
  const shine = acrylicLow.context.createLinearGradient(0, 0, maskWidth, maskHeight);
  shine.addColorStop(0, 'rgba(255,255,255,0)');
  shine.addColorStop(0.35, 'rgba(255,255,255,0.18)');
  shine.addColorStop(0.48, 'rgba(255,255,255,0.02)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  acrylicLow.context.fillStyle = shine;
  acrylicLow.context.fillRect(0, 0, maskWidth, maskHeight);
  acrylicLow.context.restore();

  const acrylic = makeLayerFromMask(width, height, () => null);
  acrylic.context.imageSmoothingEnabled = true;
  acrylic.context.imageSmoothingQuality = 'high';
  acrylic.context.drawImage(acrylicLow.canvas, 0, 0, width, height);

  const artworkCanvas = document.createElement('canvas');
  artworkCanvas.width = width;
  artworkCanvas.height = height;
  const artworkContext = artworkCanvas.getContext('2d');
  if (!artworkContext) throw new Error('プレビューを作成できませんでした');
  artworkContext.drawImage(image, imageX, imageY, imageWidth, imageHeight);

  const tintCanvas = document.createElement('canvas');
  tintCanvas.width = width;
  tintCanvas.height = height;
  const tintContext = tintCanvas.getContext('2d');
  if (!tintContext) throw new Error('乗算色を作成できませんでした');
  tintContext.fillStyle = ARTWORK_MULTIPLY_COLOR;
  tintContext.fillRect(0, 0, width, height);
  tintContext.globalCompositeOperation = 'destination-in';
  tintContext.drawImage(artworkCanvas, 0, 0);

  artworkContext.globalCompositeOperation = 'multiply';
  artworkContext.drawImage(tintCanvas, 0, 0);
  artworkContext.globalCompositeOperation = 'source-over';

  return {
    acrylicSrc: acrylic.canvas.toDataURL('image/png'),
    artworkSrc: artworkCanvas.toDataURL('image/png'),
    width,
    height,
    fileName: file.name,
  };
}

export function AcrylicKeychainTool() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [renderedPreviewSrc, setRenderedPreviewSrc] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingDotCount, setProcessingDotCount] = useState(1);
  const [previewLayoutKey, setPreviewLayoutKey] = useState(0);
  const [status, setStatus] = useState('PNGをドラッグしてください');

  useEffect(() => {
    if (!preview) {
      setRenderedPreviewSrc('');
      return;
    }
    let cancelled = false;
    const canvas = document.createElement('canvas');
    const stage = getPreviewStageSize();
    canvas.width = stage.width;
    canvas.height = stage.height;
    const context = canvas.getContext('2d');
    if (!context) return;

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

      context.clearRect(0, 0, stage.width, stage.height);
      context.save();
      try {
        context.translate(drawX, drawY);
        context.scale(scale, scale);
        await drawImageSource(context, preview.acrylicSrc);
        await drawImageSource(context, preview.artworkSrc);
        if (cancelled) return;
        context.globalAlpha = SURFACE_GLOSS_OPACITY;
        context.globalCompositeOperation = 'screen';
        await drawImageSource(context, preview.acrylicSrc);
        if (!cancelled) setRenderedPreviewSrc(canvas.toDataURL('image/png'));
      } finally {
        context.restore();
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

  const loadFile = async (file: File | undefined) => {
    if (!file) return;
    const startedAt = Date.now();
    setIsProcessing(true);
    setStatus('プレビューを作成中です');
    try {
      await waitForNextFrame();
      await waitForNextFrame();
      const nextPreview = await buildPreview(file);
      const elapsed = Date.now() - startedAt;
      if (elapsed < 900) await wait(900 - elapsed);
      setPreview(nextPreview);
      setStatus(`${file.name} を読み込みました`);
    } catch (error) {
      setPreview(null);
      setStatus(error instanceof Error ? error.message : 'PNGを読み込めませんでした');
    } finally {
      setIsProcessing(false);
    }
  };

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
      <div
        className={cn('acrylic-preview-wrap', preview && 'has-preview', isDragging && 'is-dragging')}
        role="button"
        tabIndex={0}
        aria-live="polite"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
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
          <div className="acrylic-preview">
            {renderedPreviewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img className="acrylic-preview-image" src={renderedPreviewSrc} alt={`${preview.fileName}のアクキー完成予想`} />
            ) : null}
          </div>
        ) : (
          <div className="acrylic-preview-empty">
            <span>PNGをドラッグしてください</span>
          </div>
        )}
      </div>
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
