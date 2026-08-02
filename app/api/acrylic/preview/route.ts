import { deflateSync } from 'node:zlib';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

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
};

type StandBaseFrame = {
  x: number;
  y: number;
  contactY: number;
  width: number;
  height: number;
  depthOffset: number;
};

type RgbaImage = {
  width: number;
  height: number;
  rgba: Uint8Array;
};

type AcrylicMetrics = {
  clearRadius: number;
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
const BASE_CLEAR_RADIUS = 10;
const BASE_HIGHLIGHT_RADIUS = 1;
const BASE_INTERNAL_GAP_CLOSE_RADIUS = 14;
const HTML_PREVIEW_GAP_CLOSE_RADIUS_MULTIPLIER = 1.18;
const BASE_KEYCHAIN_HOLE_OUTER_RADIUS = 24;
const BASE_KEYCHAIN_HOLE_INNER_RADIUS = 11;
const BASE_KEYCHAIN_HOLE_GAP = 2;
const BASE_PADDING_SPACE = 20;
const ARTWORK_MULTIPLY = 242 / 255;
const BACK_FACE_MULTIPLY_COLOR: [number, number, number, number] = [242, 241, 241, 255];
const ACRYLIC_DARK_EDGE_COLOR: [number, number, number, number] = [108, 112, 124, 58];
const ACRYLIC_EDGE_SHADOW_COLOR: [number, number, number, number] = [88, 96, 112, 34];
const ACRYLIC_WHITE_HIGHLIGHT_COLOR: [number, number, number, number] = [255, 255, 255, 230];
const ACRYLIC_DARK_EDGE_OFFSET = { x: 1, y: -1 };
const ACRYLIC_WHITE_HIGHLIGHT_OFFSET = { x: -1, y: -1 };
const BASE_EDGE_SHADOW_WIDTH = 4;
const BASE_INNER_SHINE_WIDTH = 2;
const BASE_STAND_BOTTOM_NEAR_HEIGHT_DELTA = 40;
const BASE_STAND_BASE_WIDTH_RATIO_PERCENT = 100;
const BASE_STAND_BASE_HEIGHT_RATIO_PERCENT = 22;
const BASE_STAND_BASE_MIN_HEIGHT = 18;
const BASE_STAND_BASE_DEPTH_OFFSET_RATIO = 0.18;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function scaleArtworkMetric(value: number, artworkWidth: number, artworkHeight: number) {
  return value * (Math.max(artworkWidth, artworkHeight) / REFERENCE_ARTWORK_SIZE);
}

function getAcrylicMetrics(artworkWidth: number, artworkHeight: number): AcrylicMetrics {
  return {
    clearRadius: scaleArtworkMetric(BASE_CLEAR_RADIUS, artworkWidth, artworkHeight),
    highlightRadius: scaleArtworkMetric(BASE_HIGHLIGHT_RADIUS, artworkWidth, artworkHeight),
    internalGapCloseRadius: scaleArtworkMetric(BASE_INTERNAL_GAP_CLOSE_RADIUS, artworkWidth, artworkHeight),
    holeOuterRadius: scaleArtworkMetric(BASE_KEYCHAIN_HOLE_OUTER_RADIUS, artworkWidth, artworkHeight),
    holeInnerRadius: scaleArtworkMetric(BASE_KEYCHAIN_HOLE_INNER_RADIUS, artworkWidth, artworkHeight),
    holeGap: scaleArtworkMetric(BASE_KEYCHAIN_HOLE_GAP, artworkWidth, artworkHeight),
    paddingSpace: scaleArtworkMetric(BASE_PADDING_SPACE, artworkWidth, artworkHeight),
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

function addKeychainHoleToMask(mask: Uint8Array, width: number, height: number, artworkCenterX: number, artworkWidth: number, metrics: AcrylicMetrics) {
  const loopMask = mask.slice();
  const centerX = Math.round(artworkCenterX);
  const centerBandHalfWidth = Math.max(3, Math.round(artworkWidth * 0.16));
  const artworkTopY = findTopMaskYNearX(loopMask, width, height, centerX, centerBandHalfWidth);
  const outerRadius = Math.max(1, Math.round(metrics.holeOuterRadius));
  const innerRadius = Math.max(1, Math.round(metrics.holeInnerRadius));
  const clearRadius = Math.max(1, Math.round(metrics.clearRadius));
  const gap = Math.round(metrics.holeGap);
  const clearTopY = Math.max(0, artworkTopY - clearRadius);
  const centerY = Math.max(outerRadius + 1, clearTopY - innerRadius - gap);
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

function addStandBottomOutlineToMask(mask: Uint8Array, width: number, height: number, artworkWidth: number, artworkHeight: number) {
  const standMask = mask.slice();
  const bottomPoint = findBottomMaskPoint(mask, width, height);
  if (!bottomPoint) return standMask;
  paintLineOnMask(standMask, width, height, bottomPoint.minX, bottomPoint.y, bottomPoint.maxX, bottomPoint.y);
  const nearHeightDelta = Math.max(1, Math.round(scaleArtworkMetric(BASE_STAND_BOTTOM_NEAR_HEIGHT_DELTA, artworkWidth, artworkHeight)));
  const leftPoint = findNearBottomSidePoint(mask, width, bottomPoint, 'left', nearHeightDelta);
  const rightPoint = findNearBottomSidePoint(mask, width, bottomPoint, 'right', nearHeightDelta);
  if (leftPoint) {
    paintLineOnMask(standMask, width, height, bottomPoint.minX, bottomPoint.y, leftPoint.x, bottomPoint.y);
    paintLineOnMask(standMask, width, height, leftPoint.x, bottomPoint.y, leftPoint.x, leftPoint.y);
  }
  if (rightPoint) {
    paintLineOnMask(standMask, width, height, bottomPoint.maxX, bottomPoint.y, rightPoint.x, bottomPoint.y);
    paintLineOnMask(standMask, width, height, rightPoint.x, bottomPoint.y, rightPoint.x, rightPoint.y);
  }
  return standMask;
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

function buildPreviewLayers(sourceImage: RgbaImage, fileName: string, productMode: ProductMode, shapeMode: ShapeMode) {
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(sourceImage.width, sourceImage.height));
  const image = resizeNearest(sourceImage, Math.max(1, Math.round(sourceImage.width * scale)), Math.max(1, Math.round(sourceImage.height * scale)));
  const alphaMask = new Uint8Array(image.width * image.height);
  for (let index = 0; index < image.width * image.height; index += 1) {
    if (image.rgba[index * 4 + 3] > 8) alphaMask[index] = 1;
  }
  const bounds = maskBounds(alphaMask, image.width, image.height);
  const metrics = getAcrylicMetrics(bounds.width, bounds.height);
  const padding = Math.ceil(metrics.clearRadius + metrics.highlightRadius + metrics.paddingSpace);
  const topLoopSpace = productMode === 'keychain' && shapeMode === 'with-hole' ? Math.ceil(metrics.holeOuterRadius * 2 + metrics.holeGap * 2) : 0;
  const standBaseWidth =
    productMode === 'stand'
      ? Math.max(1, Math.round(bounds.width * (BASE_STAND_BASE_WIDTH_RATIO_PERCENT / 100)))
      : 0;
  const standBaseHeight =
    productMode === 'stand'
      ? Math.max(BASE_STAND_BASE_MIN_HEIGHT, Math.round(standBaseWidth * (BASE_STAND_BASE_HEIGHT_RATIO_PERCENT / 100)))
      : 0;
  const standBaseDepthOffset = productMode === 'stand' ? Math.max(1, Math.round(standBaseHeight * BASE_STAND_BASE_DEPTH_OFFSET_RATIO)) : 0;
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
  const height =
    productMode === 'stand'
      ? Math.max(bounds.height + padding * 2 + topLoopSpace, standBaseBottomY + padding)
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
      ? addKeychainHoleToMask(gapClosedBaseMask, width, height, padding + bounds.width / 2, bounds.width, metrics)
      : null;
  const standShapeMask =
    productMode === 'stand' ? fillEnclosedMaskHoles(addStandBottomOutlineToMask(gapClosedBaseMask, width, height, bounds.width, bounds.height), width, height) : null;
  const shapeMask = keychainShape?.mask ?? standShapeMask ?? gapClosedBaseMask;
  const clearMask = fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius))), width, height);
  const edgeMask = fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius + metrics.edgeShadowWidth))), width, height);
  const highlightMask = fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(1, Math.round(metrics.clearRadius + metrics.highlightRadius))), width, height);
  const innerShineMask = fillEnclosedMaskHoles(dilateMask(shapeMask, width, height, Math.max(0, Math.round(metrics.clearRadius - metrics.innerShineWidth))), width, height);
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
  const edge = buildEdgeLayer(width, height, clearMask, edgeMask);
  const back = layerFromMask(width, height, gapClosedBaseMask, BACK_FACE_MULTIPLY_COLOR);
  const originalArtwork: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  const artwork: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  placeImage(originalArtwork, image, imageX, imageY);
  placeImage(artwork, image, imageX, imageY, true);
  const highlight = conditionalLayer(width, height, (index) => (innerShineMask[index] ? [255, 255, 255, 252] : null));
  const standBase: RgbaImage = { width, height, rgba: new Uint8Array(width * height * 4) };
  const clearBounds = productMode === 'stand' ? maskBounds(clearMask, width, height) : null;
  const standBaseFrame: StandBaseFrame | null =
    productMode === 'stand'
      ? {
          x: standBaseX,
          y: Math.round((clearBounds?.maxY ?? standBaseContactY) - standBaseHeight / 2),
          contactY: clearBounds?.maxY ?? standBaseContactY,
          width: standBaseWidth,
          height: standBaseHeight,
          depthOffset: standBaseDepthOffset,
        }
      : null;

  return {
    acrylicSrc: toDataUrl(acrylic),
    edgeSrc: toDataUrl(edge),
    artworkSrc: toDataUrl(artwork),
    originalArtworkSrc: toDataUrl(originalArtwork),
    backSrc: toDataUrl(back),
    highlightSrc: toDataUrl(highlight),
    standBaseSrc: toDataUrl(standBase),
    standBaseFrame,
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
    const preview = buildPreviewLayers(image, body.fileName, body.productMode, body.shapeMode as ShapeMode);
    return NextResponse.json(preview, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'プレビューを作成できませんでした');
  }
}
