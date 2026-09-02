import { deflateSync } from 'node:zlib';
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import {
  DEFAULT_ACRYLIC_GENERATION_OPTIONS,
  resolveAcrylicGenerationOptions,
  type AcrylicGenerationOptions,
} from '@/lib/acrylicGenerationOptions';

export const runtime = 'nodejs';

type ProductMode = 'keychain' | 'stand';
type HoleMode = 'with-hole' | 'without-hole';
type StandMode = 'simple' | 'stable';
type ShapeMode = HoleMode | StandMode;

type AcrylicPreviewRequest = {
  fileName?: unknown;
  imageDataUrl?: unknown;
  productMode?: unknown;
  shapeMode?: unknown;
  generationOptions?: unknown;
};

type StandBaseFrame = {
  x: number;
  y: number;
  contactY: number;
  width: number;
  height: number;
  depthOffset: number;
};

type StandShapeGuide = {
  src: string;
} | null;

type StandClawFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
} | null;

type RgbaImage = {
  width: number;
  height: number;
  rgba: Uint8Array;
};

type StandContactLine = {
  leftX: number;
  rightX: number;
  y: number;
} | null;

type StandShapeOptions = AcrylicGenerationOptions['stand'];

type AcrylicMetrics = {
  clearRadius: number;
  fixedHoleClearRadius: number;
  highlightRadius: number;
  internalGapCloseRadius: number;
  holeOuterRadius: number;
  holeInnerRadius: number;
  holeGap: number;
  paddingSpace: number;
  edgeShadowWidth: number;
  innerShineWidth: number;
};

const MAX_IMAGE_SIZE = 820;
const MAX_PNG_BYTES = 12 * 1024 * 1024;
const MAX_MASK_PIXELS = 2_400_000;
const REFERENCE_ARTWORK_SIZE = 500;
const BASE_HIGHLIGHT_RADIUS = 1;
const BASE_INTERNAL_GAP_CLOSE_RADIUS = 14;
const HTML_PREVIEW_GAP_CLOSE_RADIUS_MULTIPLIER = 1.18;
const ARTWORK_MULTIPLY = 242 / 255;
const BACK_FACE_MULTIPLY_COLOR: [number, number, number, number] = [242, 241, 241, 255];
const ACRYLIC_SIDE_FACE_COLOR: [number, number, number, number] = [116, 122, 138, 33];
const ACRYLIC_DARK_EDGE_COLOR: [number, number, number, number] = [108, 112, 124, 58];
const ACRYLIC_EDGE_SHADOW_COLOR: [number, number, number, number] = [88, 96, 112, 34];
const ACRYLIC_WHITE_HIGHLIGHT_COLOR: [number, number, number, number] = [255, 255, 255, 230];
const STAND_CLAW_FILL_COLOR: [number, number, number, number] = [116, 122, 138, 41];
const STAND_SHAPE_GUIDE_COLOR: [number, number, number, number] = [86, 103, 131, 230];
const ACRYLIC_DARK_EDGE_OFFSET = { x: 1, y: -1 };
const ACRYLIC_WHITE_HIGHLIGHT_OFFSET = { x: -1, y: -1 };
const BASE_EDGE_SHADOW_WIDTH = 4;
const BASE_INNER_SHINE_WIDTH = 2;
const BASE_STAND_BOTTOM_NEAR_HEIGHT_DELTA = 40;
const BASE_STAND_STABLE_START_WIDTH_RATIO = 0.6;
const BASE_STAND_STABLE_DIAGONAL_DISTANCE = 28;
const BASE_STAND_CLAW_EDGE_GAP = 16;
const BASE_STAND_CLAW_CONTACT_LINE_WIDTH = 3;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function scaleArtworkMetric(value: number, artworkWidth: number, artworkHeight: number) {
  return value * (Math.max(artworkWidth, artworkHeight) / REFERENCE_ARTWORK_SIZE);
}

function getAcrylicMetrics(
  artworkWidth: number,
  artworkHeight: number,
  keychainOptions: AcrylicGenerationOptions['keychain'],
): AcrylicMetrics {
  return {
    clearRadius: scaleArtworkMetric(keychainOptions.clearRadius, artworkWidth, artworkHeight),
    fixedHoleClearRadius: scaleArtworkMetric(DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.clearRadius, artworkWidth, artworkHeight),
    highlightRadius: scaleArtworkMetric(BASE_HIGHLIGHT_RADIUS, artworkWidth, artworkHeight),
    internalGapCloseRadius: scaleArtworkMetric(BASE_INTERNAL_GAP_CLOSE_RADIUS, artworkWidth, artworkHeight),
    holeOuterRadius: scaleArtworkMetric(keychainOptions.holeOuterRadius, artworkWidth, artworkHeight),
    holeInnerRadius: scaleArtworkMetric(keychainOptions.holeInnerRadius, artworkWidth, artworkHeight),
    holeGap: scaleArtworkMetric(keychainOptions.holeGap, artworkWidth, artworkHeight),
    paddingSpace: scaleArtworkMetric(keychainOptions.paddingSpace, artworkWidth, artworkHeight),
    edgeShadowWidth: scaleArtworkMetric(BASE_EDGE_SHADOW_WIDTH, artworkWidth, artworkHeight),
    innerShineWidth: scaleArtworkMetric(BASE_INNER_SHINE_WIDTH, artworkWidth, artworkHeight),
  };
}

function parsePngDataUrl(value: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error('PNGデータが不正です');
  const png = Buffer.from(match[1], 'base64');
  if (png.length === 0 || png.length > MAX_PNG_BYTES) throw new Error('PNGデータのサイズが不正です');
  return png;
}

async function decodePng(buffer: Buffer): Promise<RgbaImage> {
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('PNGを解析できませんでした');
  }

  const { data, info } = await sharp(buffer, { limitInputPixels: false })
    .rotate()
    .resize({
      width: MAX_IMAGE_SIZE,
      height: MAX_IMAGE_SIZE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.width <= 0 || info.height <= 0 || info.width * info.height > MAX_MASK_PIXELS) {
    throw new Error('PNGサイズが大きすぎます');
  }

  return {
    width: info.width,
    height: info.height,
    rgba: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  };
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function encodePng(image: RgbaImage) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(image.width, 0);
  ihdr.writeUInt32BE(image.height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const rows = Buffer.alloc((image.width * 4 + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    const rowStart = y * (image.width * 4 + 1);
    rows[rowStart] = 0;
    Buffer.from(image.rgba.buffer, image.rgba.byteOffset + y * image.width * 4, image.width * 4).copy(rows, rowStart + 1);
  }
  return Buffer.concat([PNG_SIGNATURE, pngChunk('IHDR', ihdr), pngChunk('IDAT', deflateSync(rows)), pngChunk('IEND', Buffer.alloc(0))]);
}

function toDataUrl(image: RgbaImage) {
  return `data:image/png;base64,${encodePng(image).toString('base64')}`;
}

function resizeNearest(image: RgbaImage, width: number, height: number): RgbaImage {
  if (image.width === width && image.height === height) return image;
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor((y / height) * image.height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor((x / width) * image.width));
      const source = (sourceY * image.width + sourceX) * 4;
      const target = (y * width + x) * 4;
      rgba[target] = image.rgba[source];
      rgba[target + 1] = image.rgba[source + 1];
      rgba[target + 2] = image.rgba[source + 2];
      rgba[target + 3] = image.rgba[source + 3];
    }
  }
  return { width, height, rgba };
}

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

function dilateMask(mask: Uint8Array, width: number, height: number, radius: number) {
  const output = new Uint8Array(width * height);
  const offsets = createCircleOffsets(radius);
  for (let index = 0; index < width * height; index += 1) {
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

function fillEnclosedMaskHoles(mask: Uint8Array, width: number, height: number) {
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

function fillNarrowTransparentGaps(mask: Uint8Array, width: number, height: number, radius: number) {
  if (radius <= 0) return mask.slice();
  const expandedMask = dilateMask(mask, width, height, radius);
  const closedMask = fillEnclosedMaskHoles(expandedMask, width, height);
  const closedTransparentAreas = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    if (closedMask[index] && !expandedMask[index]) closedTransparentAreas[index] = 1;
  }
  const patchMask = dilateMask(closedTransparentAreas, width, height, radius);
  const output = mask.slice();
  for (let index = 0; index < width * height; index += 1) {
    if (patchMask[index] && closedMask[index]) output[index] = 1;
  }
  return output;
}

function paintCircleOnMask(mask: Uint8Array, width: number, height: number, centerX: number, centerY: number, radius: number, value: 0 | 1) {
  const squaredRadius = radius * radius;
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    if (y < 0 || y >= height) continue;
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (x < 0 || x >= width) continue;
      const offsetX = x - centerX;
      const offsetY = y - centerY;
      if (offsetX * offsetX + offsetY * offsetY <= squaredRadius) mask[y * width + x] = value;
    }
  }
}

function paintLineOnMask(mask: Uint8Array, width: number, height: number, startX: number, startY: number, endX: number, endY: number) {
  const steps = Math.max(Math.abs(endX - startX), Math.abs(endY - startY), 1);
  for (let step = 0; step <= steps; step += 1) {
    const progress = step / steps;
    const x = Math.round(startX + (endX - startX) * progress);
    const y = Math.round(startY + (endY - startY) * progress);
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    mask[y * width + x] = 1;
  }
}

type MaskPoint = { x: number; y: number };

function paintPolygonOnMask(mask: Uint8Array, width: number, height: number, points: MaskPoint[]) {
  if (points.length < 3) return;
  let minX = width - 1;
  let maxX = 0;
  let minY = height - 1;
  let maxY = 0;
  for (const point of points) {
    minX = Math.max(0, Math.min(minX, point.x));
    maxX = Math.min(width - 1, Math.max(maxX, point.x));
    minY = Math.max(0, Math.min(minY, point.y));
    maxY = Math.min(height - 1, Math.max(maxY, point.y));
  }

  for (let y = minY; y <= maxY; y += 1) {
    const intersections: number[] = [];
    for (let index = 0; index < points.length; index += 1) {
      const current = points[index];
      const next = points[(index + 1) % points.length];
      if ((current.y > y) === (next.y > y)) continue;
      const x = current.x + ((y - current.y) * (next.x - current.x)) / (next.y - current.y);
      intersections.push(x);
    }
    intersections.sort((a, b) => a - b);
    for (let index = 0; index < intersections.length; index += 2) {
      const startX = Math.max(minX, Math.ceil(intersections[index]));
      const endX = Math.min(maxX, Math.floor(intersections[index + 1] ?? intersections[index]));
      for (let x = startX; x <= endX; x += 1) mask[y * width + x] = 1;
    }
  }

  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    paintLineOnMask(mask, width, height, current.x, current.y, next.x, next.y);
  }
}

function traceSegmentUntilMask(mask: Uint8Array, width: number, height: number, start: MaskPoint, end: MaskPoint) {
  const steps = Math.max(Math.abs(end.x - start.x), Math.abs(end.y - start.y), 1);
  let point = start;
  let leftSourceMask = !mask[start.y * width + start.x];
  for (let step = 1; step <= steps; step += 1) {
    const progress = step / steps;
    const x = Math.max(0, Math.min(width - 1, Math.round(start.x + (end.x - start.x) * progress)));
    const y = Math.max(0, Math.min(height - 1, Math.round(start.y + (end.y - start.y) * progress)));
    const nextPoint = { x, y };
    const isMask = mask[y * width + x] === 1;
    if (!leftSourceMask) {
      if (!isMask) leftSourceMask = true;
      point = nextPoint;
      continue;
    }
    if (isMask) return { point: nextPoint, hit: true };
    point = nextPoint;
  }
  return { point, hit: false };
}

function appendDistinctPoint(points: MaskPoint[], point: MaskPoint) {
  const lastPoint = points[points.length - 1];
  if (lastPoint && lastPoint.x === point.x && lastPoint.y === point.y) return;
  points.push(point);
}

function paintSplitBottomConnectorOnMask(mask: Uint8Array, width: number, height: number, left: number, right: number, top: number, leftBottom: number, rightBottom: number) {
  const minX = Math.max(0, Math.min(left, right));
  const maxX = Math.min(width - 1, Math.max(left, right));
  const topY = Math.max(0, top);
  const span = Math.max(1, maxX - minX);
  for (let x = minX; x <= maxX; x += 1) {
    const progress = (x - minX) / span;
    const bottomY = Math.min(height - 1, Math.round(leftBottom + (rightBottom - leftBottom) * progress));
    for (let y = topY; y <= bottomY; y += 1) mask[y * width + x] = 1;
  }
}

function findTopMaskYNearX(mask: Uint8Array, width: number, height: number, centerX: number, halfWidth: number) {
  for (let y = 0; y < height; y += 1) {
    for (let x = Math.max(0, centerX - halfWidth); x <= Math.min(width - 1, centerX + halfWidth); x += 1) {
      if (mask[y * width + x]) return y;
    }
  }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x]) return y;
    }
  }
  return 0;
}

function findConnectorEdgeContactY(mask: Uint8Array, width: number, height: number, x: number, radius: number, startY: number) {
  for (let y = Math.max(0, startY); y < height; y += 1) {
    for (let probeX = Math.max(0, x - radius); probeX <= Math.min(width - 1, x + radius); probeX += 1) {
      if (mask[y * width + probeX]) return y;
    }
  }
  return null;
}

function addKeychainHoleToMask(
  mask: Uint8Array,
  width: number,
  height: number,
  artworkCenterX: number,
  artworkWidth: number,
  artworkHeight: number,
  metrics: AcrylicMetrics,
  keychainOptions: AcrylicGenerationOptions['keychain'],
) {
  const loopMask = mask.slice();
  const centerX = Math.round(artworkCenterX);
  const centerBandHalfWidth = Math.max(3, Math.round(artworkWidth * 0.16));
  const artworkTopY = findTopMaskYNearX(loopMask, width, height, centerX, centerBandHalfWidth);
  const outerRadius = Math.max(1, Math.round(metrics.holeOuterRadius));
  const innerRadius = Math.max(1, Math.round(metrics.holeInnerRadius));
  const clearRadius = Math.max(1, Math.round(metrics.clearRadius));
  const gap = Math.round(metrics.holeGap);
  const clearTopY = Math.max(0, artworkTopY - clearRadius);
  const centerY =
    keychainOptions.holeCenterYRatio === null
      ? Math.max(outerRadius + 1, clearTopY - innerRadius - gap)
      : Math.max(outerRadius + 1, Math.round(artworkTopY + artworkHeight * keychainOptions.holeCenterYRatio));
  const connectorLeft = centerX - outerRadius;
  const connectorRight = centerX + outerRadius;
  const edgeProbeRadius = Math.max(1, Math.round(clearRadius * 0.35));
  const probeStartY = centerY + outerRadius + 1;
  const leftContactY = findConnectorEdgeContactY(loopMask, width, height, connectorLeft, edgeProbeRadius, probeStartY) ?? artworkTopY;
  const rightContactY = findConnectorEdgeContactY(loopMask, width, height, connectorRight, edgeProbeRadius, probeStartY) ?? artworkTopY;
  paintCircleOnMask(loopMask, width, height, centerX, centerY, outerRadius, 1);
  paintSplitBottomConnectorOnMask(loopMask, width, height, connectorLeft, connectorRight, centerY, Math.min(height - 1, leftContactY + clearRadius), Math.min(height - 1, rightContactY + clearRadius));
  paintCircleOnMask(loopMask, width, height, centerX, centerY, innerRadius, 0);
  return { mask: loopMask, hole: { centerX, centerY, radius: innerRadius } };
}

function findBottomMaskPoint(mask: Uint8Array, width: number, height: number) {
  for (let y = height - 1; y >= 0; y -= 1) {
    let minX = width;
    let maxX = -1;
    for (let x = 0; x < width; x += 1) {
      if (!mask[y * width + x]) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
    }
    if (maxX >= 0) return { x: Math.round((minX + maxX) / 2), y, minX, maxX };
  }
  return null;
}

type BottomMaskPoint = NonNullable<ReturnType<typeof findBottomMaskPoint>>;

function findNearBottomSidePoint(mask: Uint8Array, width: number, bottomPoint: BottomMaskPoint, direction: 'left' | 'right', deltaY: number) {
  const stepX = direction === 'left' ? -1 : 1;
  const startX = direction === 'left' ? bottomPoint.minX - 1 : bottomPoint.maxX + 1;
  let farthestPoint: { x: number; y: number } | null = null;
  for (let x = startX; x >= 0 && x < width; x += stepX) {
    for (let y = bottomPoint.y; y >= Math.max(0, bottomPoint.y - deltaY); y -= 1) {
      if (!mask[y * width + x]) continue;
      farthestPoint = { x, y };
      break;
    }
  }
  return farthestPoint;
}

function paintBottomRoundedRectOnMask(
  mask: Uint8Array,
  width: number,
  height: number,
  x: number,
  y: number,
  rectWidth: number,
  rectHeight: number,
  radius: number,
) {
  const left = Math.max(0, Math.round(x));
  const top = Math.max(0, Math.round(y));
  const right = Math.min(width - 1, Math.round(x + rectWidth - 1));
  const bottom = Math.min(height - 1, Math.round(y + rectHeight - 1));
  if (right < left || bottom < top) return;

  const cornerRadius = Math.max(0, Math.min(Math.round(radius), Math.floor((right - left + 1) / 2), Math.floor((bottom - top + 1) / 2)));
  const radiusSquared = cornerRadius * cornerRadius;
  for (let pointY = top; pointY <= bottom; pointY += 1) {
    for (let pointX = left; pointX <= right; pointX += 1) {
      if (cornerRadius > 0 && pointY > bottom - cornerRadius) {
        const cornerCenterX = pointX < left + cornerRadius ? left + cornerRadius : pointX > right - cornerRadius ? right - cornerRadius : pointX;
        const cornerCenterY = bottom - cornerRadius;
        const deltaX = pointX - cornerCenterX;
        const deltaY = pointY - cornerCenterY;
        if (deltaX * deltaX + deltaY * deltaY > radiusSquared) continue;
      }
      mask[pointY * width + pointX] = 1;
    }
  }
}

function addStandClawsToMask(
  mask: Uint8Array,
  width: number,
  height: number,
  contactLeftX: number,
  contactRightX: number,
  contactY: number,
  artworkCenterX: number,
  artworkWidth: number,
  artworkHeight: number,
  standClawLength: number,
  standClawStartOffset: number,
  standOptions: StandShapeOptions,
): StandClawFrame {
  const centerX = Math.round(artworkCenterX + (standOptions.clawCenterXRatio - 0.5) * artworkWidth);
  const edgeGap = Math.max(0, Math.round(scaleArtworkMetric(BASE_STAND_CLAW_EDGE_GAP, artworkWidth, artworkHeight)));
  const autoSafeLeftX = Math.min(contactRightX, contactLeftX + edgeGap);
  const autoSafeRightX = Math.max(contactLeftX, contactRightX - edgeGap);
  const usesFixedPixelWidth = standOptions.clawWidthPx !== null;
  const leftBound = usesFixedPixelWidth ? 0 : autoSafeLeftX;
  const rightBound = usesFixedPixelWidth ? width - 1 : autoSafeRightX;
  const leftSpan = Math.max(0, centerX - autoSafeLeftX);
  const rightSpan = Math.max(0, autoSafeRightX - centerX);
  const autoHalfSpan = Math.floor(Math.min(leftSpan, rightSpan));
  const autoWidth = autoHalfSpan * 2 + 1;
  const requestedWidth =
    standOptions.clawWidthPx !== null
      ? Math.round(standOptions.clawWidthPx)
      : standOptions.clawWidthRatio === null
        ? autoWidth
        : Math.round(artworkWidth * standOptions.clawWidthRatio);
  const maxWidth = Math.max(0, rightBound - leftBound + 1);
  const clawWidth = Math.min(maxWidth, Math.max(1, requestedWidth));
  if (clawWidth <= 0) return null;

  const clawLeftX = Math.max(leftBound, Math.min(rightBound - clawWidth + 1, Math.round(centerX - clawWidth / 2)));
  const clawRightX = clawLeftX + clawWidth - 1;
  const clawTopY = Math.min(height - 1, Math.round(contactY + standClawStartOffset));
  const requestedLength =
    standOptions.clawLengthPx !== null
      ? Math.max(1, Math.round(standOptions.clawLengthPx))
      : standOptions.clawLengthRatio === null
        ? Math.max(1, Math.round(standClawLength))
        : Math.max(1, Math.round(artworkHeight * standOptions.clawLengthRatio));
  const clawBottomY = Math.min(height - 1, clawTopY + requestedLength - 1);
  if (clawBottomY <= clawTopY) return null;

  paintBottomRoundedRectOnMask(
    mask,
    width,
    height,
    clawLeftX,
    clawTopY,
    clawRightX - clawLeftX + 1,
    clawBottomY - clawTopY + 1,
    scaleArtworkMetric(standOptions.clawCornerRadius, artworkWidth, artworkHeight),
  );

  return {
    x: clawLeftX,
    y: clawTopY,
    width: Math.max(1, clawRightX - clawLeftX + 1),
    height: Math.max(1, clawBottomY - clawTopY + 1),
  };
}

function addStableStandBaseAreaToMask(
  standMask: Uint8Array,
  sourceMask: Uint8Array,
  width: number,
  height: number,
  contactY: number,
  artworkCenterX: number,
  artworkWidth: number,
  artworkHeight: number,
) {
  const centerX = Math.round(artworkCenterX);
  const sourceBounds = maskBounds(sourceMask, width, height);
  const halfStartWidth = Math.max(1, Math.round((artworkWidth * BASE_STAND_STABLE_START_WIDTH_RATIO) / 2));
  const diagonalDistance = Math.max(1, Math.round(scaleArtworkMetric(BASE_STAND_STABLE_DIAGONAL_DISTANCE, artworkWidth, artworkHeight)));
  const leftStart = { x: Math.max(0, centerX - halfStartWidth), y: contactY };
  const rightStart = { x: Math.min(width - 1, centerX + halfStartWidth), y: contactY };
  const leftDiagonalEnd = {
    x: Math.min(width - 1, leftStart.x + diagonalDistance),
    y: Math.max(0, contactY - diagonalDistance),
  };
  const rightDiagonalEnd = {
    x: Math.max(0, rightStart.x - diagonalDistance),
    y: Math.max(0, contactY - diagonalDistance),
  };

  const traceSidePath = (start: MaskPoint, diagonalEnd: MaskPoint) => {
    const points = [start];
    const diagonal = traceSegmentUntilMask(sourceMask, width, height, start, diagonalEnd);
    appendDistinctPoint(points, diagonal.point);
    if (diagonal.hit) return points;

    const vertical = traceSegmentUntilMask(sourceMask, width, height, diagonal.point, {
      x: diagonal.point.x,
      y: sourceBounds.minY,
    });
    appendDistinctPoint(points, vertical.point);
    if (vertical.hit) return points;

    const horizontal = traceSegmentUntilMask(sourceMask, width, height, vertical.point, {
      x: centerX,
      y: vertical.point.y,
    });
    appendDistinctPoint(points, horizontal.point);
    return points;
  };

  const leftPath = traceSidePath(leftStart, leftDiagonalEnd);
  const rightPath = traceSidePath(rightStart, rightDiagonalEnd);
  paintPolygonOnMask(standMask, width, height, [leftStart, rightStart, ...rightPath.slice(1), ...leftPath.slice(1).reverse()]);
  return {
    contactLeftX: leftStart.x,
    contactRightX: rightStart.x,
    contactY,
  };
}

function addStandBottomOutlineToMask(
  mask: Uint8Array,
  width: number,
  height: number,
  artworkCenterX: number,
  artworkWidth: number,
  artworkHeight: number,
  standClawLength: number,
  standClawStartOffset: number,
  standMode: StandMode,
  standOptions: StandShapeOptions,
) {
  const standMask = mask.slice();
  const bottomPoint = findBottomMaskPoint(mask, width, height);
  let contactLine: StandContactLine = null;
  let clawFrame: StandClawFrame = null;
  if (!bottomPoint) return { mask: standMask, maskWithoutClaws: standMask.slice(), contactY: null, contactLine, clawFrame };
  paintLineOnMask(standMask, width, height, bottomPoint.minX, bottomPoint.y, bottomPoint.maxX, bottomPoint.y);
  const nearHeightDelta = Math.max(1, Math.round(scaleArtworkMetric(BASE_STAND_BOTTOM_NEAR_HEIGHT_DELTA, artworkWidth, artworkHeight)));
  const leftPoint = findNearBottomSidePoint(mask, width, bottomPoint, 'left', nearHeightDelta);
  const rightPoint = findNearBottomSidePoint(mask, width, bottomPoint, 'right', nearHeightDelta);
  let contactLeftX = bottomPoint.minX;
  let contactRightX = bottomPoint.maxX;
  let clawContactY = bottomPoint.y;
  if (leftPoint) {
    paintLineOnMask(standMask, width, height, bottomPoint.minX, bottomPoint.y, leftPoint.x, bottomPoint.y);
    paintLineOnMask(standMask, width, height, leftPoint.x, bottomPoint.y, leftPoint.x, leftPoint.y);
    contactLeftX = Math.min(contactLeftX, leftPoint.x);
  }
  if (rightPoint) {
    paintLineOnMask(standMask, width, height, bottomPoint.maxX, bottomPoint.y, rightPoint.x, bottomPoint.y);
    paintLineOnMask(standMask, width, height, rightPoint.x, bottomPoint.y, rightPoint.x, rightPoint.y);
    contactRightX = Math.max(contactRightX, rightPoint.x);
  }
  if (standMode === 'stable') {
    const stableContact = addStableStandBaseAreaToMask(standMask, mask, width, height, bottomPoint.y, artworkCenterX, artworkWidth, artworkHeight);
    contactLeftX = Math.min(contactLeftX, stableContact.contactLeftX);
    contactRightX = Math.max(contactRightX, stableContact.contactRightX);
    clawContactY = stableContact.contactY;
  }
  const maskWithoutClaws = standMask.slice();
  if (standMode === 'simple' || standMode === 'stable') {
    clawFrame = addStandClawsToMask(
      standMask,
      width,
      height,
      contactLeftX,
      contactRightX,
      clawContactY,
      artworkCenterX,
      artworkWidth,
      artworkHeight,
      standClawLength,
      standClawStartOffset,
      standOptions,
    );
    contactLine = { leftX: contactLeftX, rightX: contactRightX, y: clawContactY };
  }
  return { mask: standMask, maskWithoutClaws, contactY: bottomPoint.y, contactLine, clawFrame };
}

function maskBounds(mask: Uint8Array, width: number, height: number) {
  let minX = width;
  let maxX = 0;
  let minY = height;
  let maxY = 0;
  for (let index = 0; index < width * height; index += 1) {
    if (!mask[index]) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  if (minX > maxX || minY > maxY) throw new Error('透明ではない部分が見つかりませんでした');
  return { minX, maxX, minY, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function layerFromMask(width: number, height: number, mask: Uint8Array, color: [number, number, number, number]) {
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    if (!mask[index]) continue;
    const target = index * 4;
    rgba[target] = color[0];
    rgba[target + 1] = color[1];
    rgba[target + 2] = color[2];
    rgba[target + 3] = color[3];
  }
  return { width, height, rgba };
}

function outlineLayerFromMask(width: number, height: number, mask: Uint8Array, color: [number, number, number, number]) {
  const rgba = new Uint8Array(width * height * 4);
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
      rgba[target] = color[0];
      rgba[target + 1] = color[1];
      rgba[target + 2] = color[2];
      rgba[target + 3] = color[3];
    }
  }
  return { width, height, rgba };
}

function subtractMask(outerMask: Uint8Array, innerMask: Uint8Array, width: number, height: number) {
  const output = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    if (outerMask[index] && !innerMask[index]) output[index] = 1;
  }
  return output;
}

function buildStandClawLayerMask(
  frame: StandClawFrame,
  width: number,
  height: number,
  radius: number,
  grow: number,
) {
  if (!frame) return null;
  const mask = new Uint8Array(width * height);
  const rectWidth = Math.max(1, frame.width + grow * 2);
  const rectHeight = Math.max(1, frame.height + grow * 2);
  paintBottomRoundedRectOnMask(mask, width, height, frame.x - grow, frame.y - grow, rectWidth, rectHeight, radius + Math.max(0, grow));
  return mask;
}

function unionMask(leftMask: Uint8Array, rightMask: Uint8Array, width: number, height: number) {
  const output = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    output[index] = leftMask[index] || rightMask[index] ? 1 : 0;
  }
  return output;
}

function buildKeychainLayerMask(
  baseMask: Uint8Array,
  keychainShapeMask: Uint8Array,
  width: number,
  height: number,
  bodyRadius: number,
  holeRadius: number,
) {
  const bodyMask = fillEnclosedMaskHoles(dilateMask(baseMask, width, height, Math.max(0, Math.round(bodyRadius))), width, height);
  const holeMask = fillEnclosedMaskHoles(dilateMask(keychainShapeMask, width, height, Math.max(0, Math.round(holeRadius))), width, height);
  const fixedBodyMask = fillEnclosedMaskHoles(dilateMask(baseMask, width, height, Math.max(0, Math.round(holeRadius))), width, height);
  return fillEnclosedMaskHoles(unionMask(bodyMask, subtractMask(holeMask, fixedBodyMask, width, height), width, height), width, height);
}

function conditionalLayer(width: number, height: number, paint: (index: number) => [number, number, number, number] | null) {
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    const color = paint(index);
    if (!color) continue;
    const target = index * 4;
    rgba[target] = color[0];
    rgba[target + 1] = color[1];
    rgba[target + 2] = color[2];
    rgba[target + 3] = color[3];
  }
  return { width, height, rgba };
}

function compositePixel(image: RgbaImage, x: number, y: number, color: [number, number, number, number]) {
  if (x < 0 || x >= image.width || y < 0 || y >= image.height || color[3] <= 0) return;
  const target = (y * image.width + x) * 4;
  const sourceAlpha = color[3] / 255;
  const destAlpha = image.rgba[target + 3] / 255;
  const outputAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);
  if (outputAlpha <= 0) {
    image.rgba[target] = 0;
    image.rgba[target + 1] = 0;
    image.rgba[target + 2] = 0;
    image.rgba[target + 3] = 0;
    return;
  }
  image.rgba[target] = Math.round((color[0] * sourceAlpha + image.rgba[target] * destAlpha * (1 - sourceAlpha)) / outputAlpha);
  image.rgba[target + 1] = Math.round((color[1] * sourceAlpha + image.rgba[target + 1] * destAlpha * (1 - sourceAlpha)) / outputAlpha);
  image.rgba[target + 2] = Math.round((color[2] * sourceAlpha + image.rgba[target + 2] * destAlpha * (1 - sourceAlpha)) / outputAlpha);
  image.rgba[target + 3] = Math.round(outputAlpha * 255);
}

function compositeMaskLayer(
  image: RgbaImage,
  mask: Uint8Array,
  color: [number, number, number, number],
  offset = { x: 0, y: 0 },
  onlyWhere?: (index: number) => boolean,
) {
  const offsetX = Math.round(offset.x);
  const offsetY = Math.round(offset.y);
  for (let index = 0; index < image.width * image.height; index += 1) {
    if (!mask[index] || (onlyWhere && !onlyWhere(index))) continue;
    const x = (index % image.width) + offsetX;
    const y = Math.floor(index / image.width) + offsetY;
    compositePixel(image, x, y, color);
  }
}

function destinationOutMask(image: RgbaImage, mask: Uint8Array) {
  for (let index = 0; index < image.width * image.height; index += 1) {
    if (!mask[index]) continue;
    const target = index * 4;
    image.rgba[target] = 0;
    image.rgba[target + 1] = 0;
    image.rgba[target + 2] = 0;
    image.rgba[target + 3] = 0;
  }
}

function compositeLinearGradientOnExistingAlpha(
  image: RgbaImage,
  stops: Array<{ at: number; color: [number, number, number, number] }>,
) {
  const lastStopIndex = stops.length - 1;
  const interpolateColor = (progress: number): [number, number, number, number] => {
    for (let index = 0; index < lastStopIndex; index += 1) {
      const start = stops[index];
      const end = stops[index + 1];
      if (progress < start.at || progress > end.at) continue;
      const span = Math.max(0.0001, end.at - start.at);
      const localProgress = (progress - start.at) / span;
      return [
        Math.round(start.color[0] + (end.color[0] - start.color[0]) * localProgress),
        Math.round(start.color[1] + (end.color[1] - start.color[1]) * localProgress),
        Math.round(start.color[2] + (end.color[2] - start.color[2]) * localProgress),
        Math.round(start.color[3] + (end.color[3] - start.color[3]) * localProgress),
      ];
    }
    return progress <= stops[0].at ? stops[0].color : stops[lastStopIndex].color;
  };

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const target = (y * image.width + x) * 4;
      if (image.rgba[target + 3] === 0) continue;
      const progress = (x + y) / Math.max(1, image.width + image.height - 2);
      compositePixel(image, x, y, interpolateColor(progress));
    }
  }
}

function buildAcrylicLayer(width: number, height: number, clearMask: Uint8Array, highlightMask: Uint8Array, innerShineMask: Uint8Array) {
  const acrylic: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  compositeMaskLayer(acrylic, highlightMask, [255, 255, 255, 58]);
  destinationOutMask(acrylic, clearMask);
  compositeMaskLayer(
    acrylic,
    highlightMask,
    ACRYLIC_WHITE_HIGHLIGHT_COLOR,
    ACRYLIC_WHITE_HIGHLIGHT_OFFSET,
    (index) => !innerShineMask[index],
  );
  compositeLinearGradientOnExistingAlpha(acrylic, [
    { at: 0, color: [255, 255, 255, 184] },
    { at: 0.28, color: [255, 255, 255, 92] },
    { at: 0.5, color: [255, 255, 255, 10] },
    { at: 1, color: [142, 146, 158, 56] },
  ]);
  compositeLinearGradientOnExistingAlpha(acrylic, [
    { at: 0, color: [255, 255, 255, 0] },
    { at: 0.35, color: [255, 255, 255, 46] },
    { at: 0.48, color: [255, 255, 255, 5] },
    { at: 1, color: [255, 255, 255, 0] },
  ]);
  return acrylic;
}

function compositeStandContactLine(
  image: RgbaImage,
  contactLine: StandContactLine,
  artworkWidth: number,
  artworkHeight: number,
  clearRadius: number,
) {
  if (!contactLine) return;
  const lineMask = new Uint8Array(image.width * image.height);
  const lineY = Math.min(image.height - 1, Math.round(contactLine.y + clearRadius));
  paintLineOnMask(lineMask, image.width, image.height, contactLine.leftX, lineY, contactLine.rightX, lineY);
  const lineRadius = Math.max(1, Math.round(scaleArtworkMetric(BASE_STAND_CLAW_CONTACT_LINE_WIDTH, artworkWidth, artworkHeight) / 2));
  compositeMaskLayer(image, dilateMask(lineMask, image.width, image.height, lineRadius), [255, 255, 255, 245]);
}

function compositeStandClawFill(image: RgbaImage, clawFillMask: Uint8Array | null) {
  if (!clawFillMask) return;
  for (let index = 0; index < image.width * image.height; index += 1) {
    if (!clawFillMask[index]) continue;
    const x = index % image.width;
    const y = Math.floor(index / image.width);
    compositePixel(image, x, y, STAND_CLAW_FILL_COLOR);
  }
}

function buildStandClawFillMask(clearMask: Uint8Array, clearMaskWithoutClaws: Uint8Array, width: number, height: number) {
  const fillMask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    if (clearMask[index] && !clearMaskWithoutClaws[index]) {
      fillMask[index] = 1;
    }
  }
  return fillMask;
}

function buildEdgeLayer(width: number, height: number, clearMask: Uint8Array, edgeMask: Uint8Array) {
  const edge: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  compositeMaskLayer(edge, edgeMask, ACRYLIC_EDGE_SHADOW_COLOR);
  destinationOutMask(edge, clearMask);
  compositeMaskLayer(edge, edgeMask, ACRYLIC_DARK_EDGE_COLOR, ACRYLIC_DARK_EDGE_OFFSET, (index) => !clearMask[index]);
  return edge;
}

function placeImage(target: RgbaImage, source: RgbaImage, offsetX: number, offsetY: number, tint = false) {
  for (let y = 0; y < source.height; y += 1) {
    const targetY = y + offsetY;
    if (targetY < 0 || targetY >= target.height) continue;
    for (let x = 0; x < source.width; x += 1) {
      const targetX = x + offsetX;
      if (targetX < 0 || targetX >= target.width) continue;
      const sourceOffset = (y * source.width + x) * 4;
      const targetOffset = (targetY * target.width + targetX) * 4;
      const red = source.rgba[sourceOffset];
      const green = source.rgba[sourceOffset + 1];
      const blue = source.rgba[sourceOffset + 2];
      target.rgba[targetOffset] = tint ? Math.round(red * ARTWORK_MULTIPLY) : red;
      target.rgba[targetOffset + 1] = tint ? Math.round(green * ARTWORK_MULTIPLY) : green;
      target.rgba[targetOffset + 2] = tint ? Math.round(blue * ARTWORK_MULTIPLY) : blue;
      target.rgba[targetOffset + 3] = source.rgba[sourceOffset + 3];
    }
  }
}

function buildPreviewLayers(
  sourceImage: RgbaImage,
  fileName: string,
  productMode: ProductMode,
  shapeMode: ShapeMode,
  generationOptions: AcrylicGenerationOptions,
) {
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(sourceImage.width, sourceImage.height));
  const image = resizeNearest(sourceImage, Math.max(1, Math.round(sourceImage.width * scale)), Math.max(1, Math.round(sourceImage.height * scale)));
  const alphaMask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < image.width * image.height; index += 1) {
    if (image.rgba[index * 4 + 3] > 8) alphaMask[index] = 1;
  }
  const bounds = maskBounds(alphaMask, image.width, image.height);
  const metrics = getAcrylicMetrics(bounds.width, bounds.height, generationOptions.keychain);
  const padding = Math.ceil(metrics.clearRadius + metrics.highlightRadius + metrics.paddingSpace);
  const topLoopSpace = productMode === 'keychain' && shapeMode === 'with-hole' ? Math.ceil(metrics.holeOuterRadius * 2 + metrics.holeGap * 2) : 0;
  const standBaseWidth =
    productMode === 'stand'
      ? Math.max(
          1,
          Math.round(
            generationOptions.stand.baseWidthPx ??
              bounds.width * (generationOptions.stand.baseWidthRatioPercent / 100),
          ),
        )
      : 0;
  const standBaseHeight =
    productMode === 'stand'
      ? Math.max(generationOptions.stand.baseMinHeight, Math.round(bounds.width * (generationOptions.stand.baseHeightRatioPercent / 100)))
      : 0;
  const standBaseDepthOffset = productMode === 'stand' ? Math.max(1, Math.round(standBaseHeight * generationOptions.stand.baseDepthOffsetRatio)) : 0;
  const contentWidth = Math.max(bounds.width, standBaseWidth);
  const width = contentWidth + padding * 2;
  const imageX = padding + Math.round((contentWidth - bounds.width) / 2) - bounds.minX;
  const imageY = padding + topLoopSpace - bounds.minY;
  const standBaseX = padding + Math.round((contentWidth - standBaseWidth) / 2);
  const standBaseContactY = padding + topLoopSpace + bounds.height + Math.ceil(metrics.clearRadius);
  const estimatedStandBaseY =
    productMode === 'stand'
      ? Math.round(standBaseContactY - standBaseHeight / 2)
      : 0;
  const standBaseBottomY = estimatedStandBaseY + standBaseHeight + standBaseDepthOffset;
  const standShapeExtraBottomY =
    productMode === 'stand'
      ? padding + topLoopSpace + bounds.height + Math.ceil(metrics.clearRadius) + standBaseDepthOffset
      : 0;
  const height =
    productMode === 'stand'
      ? Math.max(bounds.height + padding * 2 + topLoopSpace, standBaseBottomY + padding, standShapeExtraBottomY + padding)
      : bounds.height + padding * 2 + topLoopSpace;
  if (width * height > MAX_MASK_PIXELS) throw new Error('PNGサイズが大きすぎます');

  const baseMask = new Uint8Array(width * height);
  for (let y = 0; y < image.height; y += 1) {
    const targetY = y + imageY;
    if (targetY < 0 || targetY >= height) continue;
    for (let x = 0; x < image.width; x += 1) {
      if (!alphaMask[y * image.width + x]) continue;
      const targetX = x + imageX;
      if (targetX < 0 || targetX >= width) continue;
      baseMask[targetY * width + targetX] = 1;
    }
  }

  const filledBaseMask = fillEnclosedMaskHoles(baseMask, width, height);
  const gapClosedBaseMask = fillNarrowTransparentGaps(
    filledBaseMask,
    width,
    height,
    Math.max(1, Math.round(metrics.internalGapCloseRadius * HTML_PREVIEW_GAP_CLOSE_RADIUS_MULTIPLIER)),
  );
  const keychainShape =
    productMode === 'keychain' && shapeMode === 'with-hole'
      ? addKeychainHoleToMask(
          gapClosedBaseMask,
          width,
          height,
          padding + bounds.width * generationOptions.keychain.holeCenterXRatio,
          bounds.width,
          bounds.height,
          { ...metrics, clearRadius: metrics.fixedHoleClearRadius },
          generationOptions.keychain,
        )
      : null;
  const standShape =
    productMode === 'stand'
      ? addStandBottomOutlineToMask(
          gapClosedBaseMask,
          width,
          height,
          imageX + bounds.minX + bounds.width / 2,
          bounds.width,
          bounds.height,
          standBaseDepthOffset,
          metrics.clearRadius,
          shapeMode as StandMode,
          generationOptions.stand,
        )
      : null;
  const standShapeMask = standShape ? fillEnclosedMaskHoles(standShape.mask, width, height) : null;
  const standShapeMaskWithoutClaws = standShape ? fillEnclosedMaskHoles(standShape.maskWithoutClaws, width, height) : null;
  const shapeMask = keychainShape?.mask ?? standShapeMaskWithoutClaws ?? standShapeMask ?? gapClosedBaseMask;
  const standClawCornerRadius = scaleArtworkMetric(generationOptions.stand.clawCornerRadius, bounds.width, bounds.height);
  const standClawClearMask =
    productMode === 'stand' ? buildStandClawLayerMask(standShape?.clawFrame ?? null, width, height, standClawCornerRadius, 0) : null;
  const standClawEdgeMask =
    productMode === 'stand'
      ? buildStandClawLayerMask(standShape?.clawFrame ?? null, width, height, standClawCornerRadius, Math.max(1, Math.round(metrics.edgeShadowWidth)))
      : null;
  const standClawHighlightMask =
    productMode === 'stand'
      ? buildStandClawLayerMask(standShape?.clawFrame ?? null, width, height, standClawCornerRadius, Math.max(1, Math.round(metrics.highlightRadius)))
      : null;
  const standClawInnerShineMask =
    productMode === 'stand'
      ? buildStandClawLayerMask(standShape?.clawFrame ?? null, width, height, standClawCornerRadius, -Math.max(0, Math.round(metrics.innerShineWidth)))
      : null;
  const standBodyClearMask =
    productMode === 'stand'
      ? fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius))), width, height)
      : null;
  const clearMask = keychainShape
    ? buildKeychainLayerMask(
        gapClosedBaseMask,
        keychainShape.mask,
        width,
        height,
        metrics.clearRadius,
        metrics.fixedHoleClearRadius,
      )
    : standBodyClearMask && standClawClearMask
      ? fillEnclosedMaskHoles(unionMask(standBodyClearMask, standClawClearMask, width, height), width, height)
      : fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius))), width, height);
  const clearMaskWithoutClaws =
    productMode === 'stand' && (shapeMode === 'simple' || shapeMode === 'stable') && standBodyClearMask
      ? standBodyClearMask
      : null;
  const standClawFillMask = clearMaskWithoutClaws ? buildStandClawFillMask(clearMask, clearMaskWithoutClaws, width, height) : null;
  const edgeMask = keychainShape
    ? buildKeychainLayerMask(
        gapClosedBaseMask,
        keychainShape.mask,
        width,
        height,
        metrics.clearRadius + metrics.edgeShadowWidth,
        metrics.fixedHoleClearRadius + metrics.edgeShadowWidth,
      )
    : standClawEdgeMask
      ? fillEnclosedMaskHoles(
          unionMask(
            fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius + metrics.edgeShadowWidth))), width, height),
            standClawEdgeMask,
            width,
            height,
          ),
          width,
          height,
        )
      : fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius + metrics.edgeShadowWidth))), width, height);
  const highlightMask = keychainShape
    ? buildKeychainLayerMask(
        gapClosedBaseMask,
        keychainShape.mask,
        width,
        height,
        metrics.clearRadius + metrics.highlightRadius,
        metrics.fixedHoleClearRadius + metrics.highlightRadius,
      )
    : standClawHighlightMask
      ? fillEnclosedMaskHoles(
          unionMask(
            fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius + metrics.highlightRadius))), width, height),
            standClawHighlightMask,
            width,
            height,
          ),
          width,
          height,
        )
      : fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius + metrics.highlightRadius))), width, height);
  const innerShineMask = keychainShape
    ? buildKeychainLayerMask(
        gapClosedBaseMask,
        keychainShape.mask,
        width,
        height,
        metrics.clearRadius - metrics.innerShineWidth,
        metrics.fixedHoleClearRadius - metrics.innerShineWidth,
      )
    : standClawInnerShineMask
      ? fillEnclosedMaskHoles(
          unionMask(
            fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(0, Math.round(metrics.clearRadius - metrics.innerShineWidth))), width, height),
            standClawInnerShineMask,
            width,
            height,
          ),
          width,
          height,
        )
      : fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(0, Math.round(metrics.clearRadius - metrics.innerShineWidth))), width, height);
  if (keychainShape) {
    const holeTransparentRadius = Math.max(1, keychainShape.hole.radius);
    const holeLineWidth = Math.max(1, Math.round(metrics.edgeShadowWidth));
    const holeLineInnerRadius = Math.max(1, holeTransparentRadius - holeLineWidth);
    paintCircleOnMask(clearMask, width, height, keychainShape.hole.centerX, keychainShape.hole.centerY, holeTransparentRadius, 0);
    paintCircleOnMask(edgeMask, width, height, keychainShape.hole.centerX, keychainShape.hole.centerY, holeLineInnerRadius, 0);
    paintCircleOnMask(highlightMask, width, height, keychainShape.hole.centerX, keychainShape.hole.centerY, holeLineInnerRadius, 0);
    paintCircleOnMask(innerShineMask, width, height, keychainShape.hole.centerX, keychainShape.hole.centerY, holeTransparentRadius, 0);
  }

  const acrylic = buildAcrylicLayer(width, height, clearMask, highlightMask, innerShineMask);
  compositeStandContactLine(acrylic, standShape?.contactLine ?? null, bounds.width, bounds.height, metrics.clearRadius);
  const edge = buildEdgeLayer(width, height, clearMask, edgeMask);
  compositeStandClawFill(edge, standClawFillMask);
  const side = layerFromMask(width, height, subtractMask(clearMask, innerShineMask, width, height), ACRYLIC_SIDE_FACE_COLOR);
  const back = layerFromMask(width, height, gapClosedBaseMask, BACK_FACE_MULTIPLY_COLOR);
  const originalArtwork: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  const artwork: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  placeImage(originalArtwork, image, imageX, imageY);
  placeImage(artwork, image, imageX, imageY, true);
  const highlight = conditionalLayer(width, height, (index) => (innerShineMask[index] ? [255, 255, 255, 252] : null));
  const standBase: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  const standShapeGuide: StandShapeGuide =
    productMode === 'stand'
      ? {
          src: toDataUrl(outlineLayerFromMask(width, height, clearMask, STAND_SHAPE_GUIDE_COLOR)),
        }
      : null;
  const clearBounds = productMode === 'stand' ? maskBounds(clearMask, width, height) : null;
  const standContactY =
    productMode === 'stand' && standShape && standShape.contactY !== null
      ? Math.min(height - 1, Math.round(standShape.contactY + metrics.clearRadius))
      : clearBounds?.maxY ?? standBaseContactY;
  const standBaseFrame: StandBaseFrame | null =
    productMode === 'stand'
      ? {
          x: standBaseX,
          y: Math.round(standContactY - standBaseHeight / 2),
          contactY: standContactY,
          width: standBaseWidth,
          height: standBaseHeight,
          depthOffset: standBaseDepthOffset,
        }
      : null;

  return {
    acrylicSrc: toDataUrl(acrylic),
    edgeSrc: toDataUrl(edge),
    sideSrc: toDataUrl(side),
    artworkSrc: toDataUrl(artwork),
    originalArtworkSrc: toDataUrl(originalArtwork),
    backSrc: toDataUrl(back),
    highlightSrc: toDataUrl(highlight),
    standBaseSrc: toDataUrl(standBase),
    standBaseFrame,
    standShapeGuide,
    standContactLine: standShape?.contactLine ?? null,
    standClawFrame: standShape?.clawFrame ?? null,
    width,
    height,
    fileName,
    productMode,
  };
}

export async function POST(request: Request) {
  let body: AcrylicPreviewRequest;
  try {
    body = (await request.json()) as AcrylicPreviewRequest;
  } catch {
    return jsonError('リクエストを読み込めませんでした');
  }

  if (typeof body.fileName !== 'string') return jsonError('ファイル名が不正です');
  if (typeof body.imageDataUrl !== 'string') return jsonError('PNGデータが不正です');
  if (body.productMode !== 'keychain' && body.productMode !== 'stand') return jsonError('作成タイプが不正です');
  if (
    (body.productMode === 'keychain' && body.shapeMode !== 'with-hole' && body.shapeMode !== 'without-hole') ||
    (body.productMode === 'stand' && body.shapeMode !== 'simple' && body.shapeMode !== 'stable')
  ) {
    return jsonError('形状モードが不正です');
  }

  try {
    const png = parsePngDataUrl(body.imageDataUrl);
    const image = await decodePng(png);
    const preview = buildPreviewLayers(
      image,
      body.fileName,
      body.productMode,
      body.shapeMode as ShapeMode,
      resolveAcrylicGenerationOptions(body.generationOptions),
    );
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'プレビューを作成できませんでした');
  }
}
