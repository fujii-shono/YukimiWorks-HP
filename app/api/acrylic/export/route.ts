import { inflateSync } from 'node:zlib';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

type AcrylicExportRequest = {
  fileName?: unknown;
  width?: unknown;
  height?: unknown;
  artworkDataUrl?: unknown;
  holeMode?: unknown;
};

type Point = {
  x: number;
  y: number;
};

type Circle = {
  centerX: number;
  centerY: number;
  radius: number;
};

type AcrylicMetrics = {
  clearRadius: number;
  internalGapCloseRadius: number;
  holeOuterRadius: number;
  holeInnerRadius: number;
  holeGap: number;
};

type PngImage = {
  width: number;
  height: number;
  alpha: Uint8Array;
};

type SvgPathResult = {
  path: string;
  controlPoints: Point[];
};

const MAX_EXPORT_SIZE = 2400;
const MAX_PNG_BYTES = 12 * 1024 * 1024;
const MAX_MASK_PIXELS = 2_400_000;
const REFERENCE_ARTWORK_SIZE = 500;
const BASE_CLEAR_RADIUS = 10;
const BASE_INTERNAL_GAP_CLOSE_RADIUS = 14;
const BASE_KEYCHAIN_HOLE_OUTER_RADIUS = 24;
const BASE_KEYCHAIN_HOLE_INNER_RADIUS = 11;
const BASE_KEYCHAIN_HOLE_GAP = 2;
const OUTER_CORNER_ROUND_MIN_ANGLE = 1;
const OUTER_CORNER_ROUND_MAX_ANGLE = 179;
const OUTER_CORNER_ROUND_MAX_TRIM = 18;
const OUTER_CORNER_ROUND_MIN_TRIM = 0.2;
const INNER_SHARP_CORNER_MAX_ANGLE = 90;
const CONTROL_POINT_RADIUS = 0.9;
const CONTROL_POINT_STROKE_WIDTH = 0.2;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function sanitizeFileName(value: string) {
  return value.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'acrylic-keychain';
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatSvgNumber(value: number) {
  return Number(value.toFixed(3)).toString();
}

function parsePngDataUrl(value: string) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) throw new Error('PNGデータが不正です');
  const png = Buffer.from(match[1], 'base64');
  if (png.length === 0 || png.length > MAX_PNG_BYTES) throw new Error('PNGデータのサイズが不正です');
  return png;
}

function readUInt32(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset);
}

function decodePngAlpha(buffer: Buffer): PngImage {
  if (buffer.length < 33 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error('PNGを解析できませんでした');

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatParts: Buffer[] = [];

  while (offset + 12 <= buffer.length) {
    const length = readUInt32(buffer, offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error('PNGを解析できませんでした');

    if (type === 'IHDR') {
      width = readUInt32(buffer, dataStart);
      height = readUInt32(buffer, dataStart + 4);
      bitDepth = buffer[dataStart + 8];
      colorType = buffer[dataStart + 9];
      interlace = buffer[dataStart + 12];
    } else if (type === 'IDAT') {
      idatParts.push(buffer.subarray(dataStart, dataEnd));
    } else if (type === 'IEND') {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || interlace !== 0) throw new Error('8bitの通常PNGを選択してください');
  if (width * height > MAX_MASK_PIXELS) throw new Error('PNGのサイズが大きすぎます');

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!bytesPerPixel) throw new Error('RGBAまたはグレースケールPNGを選択してください');

  const inflated = inflateSync(Buffer.concat(idatParts));
  const stride = width * bytesPerPixel;
  const previous = Buffer.alloc(stride);
  const current = Buffer.alloc(stride);
  const alpha = new Uint8Array(width * height);
  let sourceOffset = 0;

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    inflated.copy(current, 0, sourceOffset, sourceOffset + stride);
    sourceOffset += stride;

    for (let x = 0; x < stride; x += 1) {
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const up = previous[x];
      const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] : 0;
      if (filter === 1) current[x] = (current[x] + left) & 0xff;
      else if (filter === 2) current[x] = (current[x] + up) & 0xff;
      else if (filter === 3) current[x] = (current[x] + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) {
        const pa = Math.abs(up - upLeft);
        const pb = Math.abs(left - upLeft);
        const pc = Math.abs(left + up - upLeft * 2);
        const predictor = pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft;
        current[x] = (current[x] + predictor) & 0xff;
      } else if (filter !== 0) {
        throw new Error('PNGを解析できませんでした');
      }
    }

    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = colorType === 6 ? current[x * bytesPerPixel + 3] : colorType === 4 ? current[x * bytesPerPixel + 1] : 255;
    }
    current.copy(previous);
  }

  return { width, height, alpha };
}

function scaleArtworkMetric(value: number, artworkWidth: number, artworkHeight: number) {
  return value * (Math.max(artworkWidth, artworkHeight) / REFERENCE_ARTWORK_SIZE);
}

function getAcrylicMetrics(artworkWidth: number, artworkHeight: number): AcrylicMetrics {
  return {
    clearRadius: scaleArtworkMetric(BASE_CLEAR_RADIUS, artworkWidth, artworkHeight),
    internalGapCloseRadius: scaleArtworkMetric(BASE_INTERNAL_GAP_CLOSE_RADIUS, artworkWidth, artworkHeight),
    holeOuterRadius: scaleArtworkMetric(BASE_KEYCHAIN_HOLE_OUTER_RADIUS, artworkWidth, artworkHeight),
    holeInnerRadius: scaleArtworkMetric(BASE_KEYCHAIN_HOLE_INNER_RADIUS, artworkWidth, artworkHeight),
    holeGap: scaleArtworkMetric(BASE_KEYCHAIN_HOLE_GAP, artworkWidth, artworkHeight),
  };
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

  return { mask: loopMask, hole: { centerX, centerY, radius: innerRadius }, outerCircle: { centerX, centerY, radius: outerRadius + clearRadius } };
}

function findMaskBounds(mask: Uint8Array, width: number, height: number) {
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

function pointKey(point: Point) {
  return `${point.x},${point.y}`;
}

function popBoundaryEdge(edgesByStart: Map<string, Array<{ from: Point; to: Point }>>, from: Point) {
  const key = pointKey(from);
  const edges = edgesByStart.get(key);
  if (!edges?.length) return null;
  const edge = edges.pop() ?? null;
  if (edges.length === 0) edgesByStart.delete(key);
  return edge;
}

function removeCollinear(points: Point[]) {
  if (points.length <= 3) return points;
  return points.filter((point, index) => {
    const previous = points[(index - 1 + points.length) % points.length];
    const next = points[(index + 1) % points.length];
    return !((previous.x === point.x && point.x === next.x) || (previous.y === point.y && point.y === next.y));
  });
}

function maskToBoundaryLoops(mask: Uint8Array, width: number, height: number) {
  const edgesByStart = new Map<string, Array<{ from: Point; to: Point }>>();
  const isFilled = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] === 1;
  const addEdge = (from: Point, to: Point) => {
    const key = pointKey(from);
    const edges = edgesByStart.get(key) ?? [];
    edges.push({ from, to });
    edgesByStart.set(key, edges);
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!isFilled(x, y)) continue;
      if (!isFilled(x, y - 1)) addEdge({ x, y }, { x: x + 1, y });
      if (!isFilled(x + 1, y)) addEdge({ x: x + 1, y }, { x: x + 1, y: y + 1 });
      if (!isFilled(x, y + 1)) addEdge({ x: x + 1, y: y + 1 }, { x, y: y + 1 });
      if (!isFilled(x - 1, y)) addEdge({ x, y: y + 1 }, { x, y });
    }
  }

  const loops: Point[][] = [];
  while (edgesByStart.size > 0) {
    const firstEdges = edgesByStart.values().next().value as Array<{ from: Point; to: Point }> | undefined;
    if (!firstEdges) continue;
    const firstEdge = firstEdges.pop();
    if (!firstEdge) continue;
    if (firstEdges.length === 0) edgesByStart.delete(pointKey(firstEdge.from));

    const start = firstEdge.from;
    const points = [start, firstEdge.to];
    let current = firstEdge.to;
    let guard = width * height * 4;
    while (pointKey(current) !== pointKey(start) && guard > 0) {
      guard -= 1;
      const nextEdge = popBoundaryEdge(edgesByStart, current);
      if (!nextEdge) break;
      points.push(nextEdge.to);
      current = nextEdge.to;
    }
    if (points.length < 4 || pointKey(points[points.length - 1]) !== pointKey(start)) continue;
    const loop = removeCollinear(points.slice(0, -1));
    if (loop.length >= 3) loops.push(loop);
  }
  return loops;
}

function distance(left: Point, right: Point) {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point) {
  const lineLength = distance(lineStart, lineEnd);
  if (lineLength === 0) return distance(point, lineStart);
  return Math.abs((lineEnd.x - lineStart.x) * (lineStart.y - point.y) - (lineStart.x - point.x) * (lineEnd.y - lineStart.y)) / lineLength;
}

function signedArea(points: Point[]) {
  let area = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function angleDegrees(previous: Point, current: Point, next: Point) {
  const left = { x: previous.x - current.x, y: previous.y - current.y };
  const right = { x: next.x - current.x, y: next.y - current.y };
  const leftLength = Math.hypot(left.x, left.y);
  const rightLength = Math.hypot(right.x, right.y);
  if (leftLength === 0 || rightLength === 0) return 180;
  const dot = left.x * right.x + left.y * right.y;
  return (Math.acos(Math.max(-1, Math.min(1, dot / (leftLength * rightLength)))) * 180) / Math.PI;
}

function cornerCross(previous: Point, current: Point, next: Point) {
  return (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
}

function isHoleLoop(loop: Point[], hole: Circle) {
  const bounds = loop.reduce(
    (current, point) => ({
      minX: Math.min(current.minX, point.x),
      maxX: Math.max(current.maxX, point.x),
      minY: Math.min(current.minY, point.y),
      maxY: Math.max(current.maxY, point.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
  );
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const radiusX = (bounds.maxX - bounds.minX) / 2;
  const radiusY = (bounds.maxY - bounds.minY) / 2;
  const tolerance = Math.max(4, hole.radius * 0.45);
  return Math.abs(centerX - hole.centerX) <= tolerance && Math.abs(centerY - hole.centerY) <= tolerance && Math.abs(radiusX - hole.radius) <= tolerance && Math.abs(radiusY - hole.radius) <= tolerance;
}

function isUpperCirclePoint(point: Point, circle: Circle) {
  const radiusDelta = Math.abs(distance(point, { x: circle.centerX, y: circle.centerY }) - circle.radius);
  return point.y <= circle.centerY + circle.radius * 0.12 && radiusDelta <= Math.max(3, circle.radius * 0.24);
}

function findUpperCircleRun(points: Point[], circle: Circle) {
  const doubled = [...points, ...points];
  let bestStart = -1;
  let bestLength = 0;
  let currentStart = -1;
  let currentLength = 0;

  for (let index = 0; index < doubled.length; index += 1) {
    if (isUpperCirclePoint(doubled[index], circle)) {
      if (currentStart < 0) currentStart = index;
      currentLength += 1;
      if (currentLength > bestLength && currentLength <= points.length) {
        bestStart = currentStart;
        bestLength = currentLength;
      }
    } else {
      currentStart = -1;
      currentLength = 0;
    }
  }

  if (bestStart < 0 || bestLength < 2) return null;
  return {
    start: bestStart % points.length,
    end: (bestStart + bestLength - 1) % points.length,
  };
}

function collectCyclicRange(points: Point[], start: number, end: number) {
  const output: Point[] = [];
  let index = start;
  let guard = points.length + 1;
  while (guard > 0) {
    guard -= 1;
    output.push(points[index]);
    if (index === end) break;
    index = (index + 1) % points.length;
  }
  return output;
}

function upperCircleArcWithVerticalConnectors(circle: Circle, fromLeftToRight: boolean, startConnectorY: number, endConnectorY: number): SvgPathResult {
  const left = { x: circle.centerX - circle.radius, y: circle.centerY };
  const top = { x: circle.centerX, y: circle.centerY - circle.radius };
  const right = { x: circle.centerX + circle.radius, y: circle.centerY };
  if (fromLeftToRight) {
    const startConnector = { x: left.x, y: startConnectorY };
    const endConnector = { x: right.x, y: endConnectorY };
    const controlPoints = [startConnector, left, top, right, endConnector];
    return {
      path: [
        `L ${formatSvgNumber(startConnector.x)} ${formatSvgNumber(startConnector.y)}`,
        `L ${formatSvgNumber(left.x)} ${formatSvgNumber(left.y)}`,
        `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
        `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(right.x)} ${formatSvgNumber(right.y)}`,
        `L ${formatSvgNumber(endConnector.x)} ${formatSvgNumber(endConnector.y)}`,
      ].join(' '),
      controlPoints,
    };
  }
  const startConnector = { x: right.x, y: startConnectorY };
  const endConnector = { x: left.x, y: endConnectorY };
  const controlPoints = [startConnector, right, top, left, endConnector];
  return {
    path: [
      `L ${formatSvgNumber(startConnector.x)} ${formatSvgNumber(startConnector.y)}`,
      `L ${formatSvgNumber(right.x)} ${formatSvgNumber(right.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 0 ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 0 ${formatSvgNumber(left.x)} ${formatSvgNumber(left.y)}`,
      `L ${formatSvgNumber(endConnector.x)} ${formatSvgNumber(endConnector.y)}`,
    ].join(' '),
    controlPoints,
  };
}

function getAdaptiveTrim(angle: number, incomingLength: number, outgoingLength: number, depth: number) {
  const shortestSide = Math.min(incomingLength, outgoingLength);
  const sharpness = Math.max(0, Math.min(1, (180 - angle) / 180));
  const depthRatio = Math.max(0, Math.min(1, depth / Math.max(1, shortestSide)));
  const ratio = 0.12 + sharpness * 0.28 + depthRatio * 0.16;
  return Math.max(
    OUTER_CORNER_ROUND_MIN_TRIM,
    Math.min(shortestSide * 0.48, shortestSide * ratio, OUTER_CORNER_ROUND_MAX_TRIM),
  );
}

function getRoundedCornerData(loop: Point[]) {
  const areaSign = Math.sign(signedArea(loop)) || 1;
  return loop.map((current, index) => {
    const previous = loop[(index - 1 + loop.length) % loop.length];
    const next = loop[(index + 1) % loop.length];
    const incomingLength = distance(previous, current);
    const outgoingLength = distance(current, next);
    const angle = angleDegrees(previous, current, next);
    const depth = perpendicularDistance(current, previous, next);
    const isOuterCorner = Math.sign(cornerCross(previous, current, next)) === areaSign;
    const isInnerSharpCorner = !isOuterCorner && angle <= INNER_SHARP_CORNER_MAX_ANGLE;
    const shouldRound =
      !isInnerSharpCorner &&
      angle >= OUTER_CORNER_ROUND_MIN_ANGLE &&
      angle <= OUTER_CORNER_ROUND_MAX_ANGLE &&
      incomingLength > OUTER_CORNER_ROUND_MIN_TRIM * 2 &&
      outgoingLength > OUTER_CORNER_ROUND_MIN_TRIM * 2;

    if (!shouldRound) {
      return {
        point: current,
        entry: current,
        exit: current,
        rounded: false,
      };
    }

    const trim = getAdaptiveTrim(angle, incomingLength, outgoingLength, depth);
    return {
      point: current,
      entry: {
        x: current.x + ((previous.x - current.x) / incomingLength) * trim,
        y: current.y + ((previous.y - current.y) / incomingLength) * trim,
      },
      exit: {
        x: current.x + ((next.x - current.x) / outgoingLength) * trim,
        y: current.y + ((next.y - current.y) / outgoingLength) * trim,
      },
      rounded: true,
    };
  });
}

function roundedLoopToPath(loop: Point[]): SvgPathResult {
  const corners = getRoundedCornerData(loop);
  const controlPoints: Point[] = [];
  const commands = [`M ${formatSvgNumber(corners[0].exit.x)} ${formatSvgNumber(corners[0].exit.y)}`];

  for (let offset = 1; offset <= corners.length; offset += 1) {
    const corner = corners[offset % corners.length];
    commands.push(`L ${formatSvgNumber(corner.entry.x)} ${formatSvgNumber(corner.entry.y)}`);
    if (corner.rounded) {
      commands.push(
        `Q ${formatSvgNumber(corner.point.x)} ${formatSvgNumber(corner.point.y)} ${formatSvgNumber(corner.exit.x)} ${formatSvgNumber(corner.exit.y)}`,
      );
      controlPoints.push(corner.point);
    } else {
      commands.push(`L ${formatSvgNumber(corner.exit.x)} ${formatSvgNumber(corner.exit.y)}`);
    }
  }

  commands.push('Z');
  return { path: commands.join(' '), controlPoints };
}

function roundedOpenPath(points: Point[]): SvgPathResult {
  if (points.length === 0) return { path: '', controlPoints: [] };
  if (points.length === 1) return { path: `M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`, controlPoints: [] };

  const controlPoints: Point[] = [];
  const commands = [`M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[Math.min(points.length - 1, index + 1)];

    if (index >= points.length - 1) {
      commands.push(`L ${formatSvgNumber(current.x)} ${formatSvgNumber(current.y)}`);
      continue;
    }

    const incomingLength = distance(previous, current);
    const outgoingLength = distance(current, next);
    const angle = angleDegrees(previous, current, next);
    const depth = perpendicularDistance(current, previous, next);

    if (
      angle < OUTER_CORNER_ROUND_MIN_ANGLE ||
      angle > OUTER_CORNER_ROUND_MAX_ANGLE ||
      incomingLength <= OUTER_CORNER_ROUND_MIN_TRIM * 2 ||
      outgoingLength <= OUTER_CORNER_ROUND_MIN_TRIM * 2
    ) {
      commands.push(`L ${formatSvgNumber(current.x)} ${formatSvgNumber(current.y)}`);
      continue;
    }

    const trim = getAdaptiveTrim(angle, incomingLength, outgoingLength, depth);
    const entry = {
      x: current.x + ((previous.x - current.x) / incomingLength) * trim,
      y: current.y + ((previous.y - current.y) / incomingLength) * trim,
    };
    const exit = {
      x: current.x + ((next.x - current.x) / outgoingLength) * trim,
      y: current.y + ((next.y - current.y) / outgoingLength) * trim,
    };
    commands.push(`L ${formatSvgNumber(entry.x)} ${formatSvgNumber(entry.y)}`);
    commands.push(`Q ${formatSvgNumber(current.x)} ${formatSvgNumber(current.y)} ${formatSvgNumber(exit.x)} ${formatSvgNumber(exit.y)}`);
    controlPoints.push(current);
  }
  return { path: commands.join(' '), controlPoints };
}

function loopToPath(points: Point[], outerCircle: Circle | null = null): SvgPathResult {
  if (outerCircle) {
    const run = findUpperCircleRun(points, outerCircle);
    if (run) {
      const beforeRun = (run.start - 1 + points.length) % points.length;
      const afterRun = (run.end + 1) % points.length;
      const rest = collectCyclicRange(points, afterRun, beforeRun);
      const restPath = roundedOpenPath(rest);
      const upperCircle = upperCircleArcWithVerticalConnectors(
        outerCircle,
        points[beforeRun].x <= points[afterRun].x,
        points[beforeRun].y,
        points[afterRun].y,
      );
      const commands = [restPath.path, upperCircle.path];
      commands.push('Z');
      return { path: commands.join(' '), controlPoints: [...restPath.controlPoints, ...upperCircle.controlPoints] };
    }
  }

  return roundedLoopToPath(points);
}

function circleToPath(circle: Circle): SvgPathResult {
  const top = { x: circle.centerX, y: circle.centerY - circle.radius };
  const right = { x: circle.centerX + circle.radius, y: circle.centerY };
  const bottom = { x: circle.centerX, y: circle.centerY + circle.radius };
  const left = { x: circle.centerX - circle.radius, y: circle.centerY };
  const controlPoints = [top, right, bottom, left];
  return {
    path: [
      `M ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(right.x)} ${formatSvgNumber(right.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(bottom.x)} ${formatSvgNumber(bottom.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(left.x)} ${formatSvgNumber(left.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
      'Z',
    ].join(' '),
    controlPoints,
  };
}

function buildServerCutPath(artwork: PngImage, holeMode: 'with-hole' | 'without-hole'): SvgPathResult {
  const baseMask = new Uint8Array(artwork.width * artwork.height);
  for (let index = 0; index < artwork.width * artwork.height; index += 1) {
    if (artwork.alpha[index] > 8) baseMask[index] = 1;
  }
  const bounds = findMaskBounds(baseMask, artwork.width, artwork.height);
  const metrics = getAcrylicMetrics(bounds.width, bounds.height);
  const filledBaseMask = fillEnclosedMaskHoles(baseMask, artwork.width, artwork.height);
  const gapClosedBaseMask = fillNarrowTransparentGaps(filledBaseMask, artwork.width, artwork.height, Math.max(1, Math.round(metrics.internalGapCloseRadius)));
  const keychainShape = holeMode === 'with-hole' ? addKeychainHoleToMask(gapClosedBaseMask, artwork.width, artwork.height, bounds.minX + bounds.width / 2, bounds.width, metrics) : null;
  const clearRadius = Math.max(1, Math.round(metrics.clearRadius));
  const clearMask = fillEnclosedMaskHoles(dilateMask(keychainShape?.mask ?? gapClosedBaseMask, artwork.width, artwork.height, clearRadius), artwork.width, artwork.height);
  const hole = keychainShape ? { ...keychainShape.hole } : null;
  if (hole) paintCircleOnMask(clearMask, artwork.width, artwork.height, hole.centerX, hole.centerY, hole.radius, 0);

  const loops = maskToBoundaryLoops(clearMask, artwork.width, artwork.height);
  const pathResults = (hole ? loops.filter((loop) => !isHoleLoop(loop, hole)) : loops).map((loop) => loopToPath(loop, keychainShape?.outerCircle ?? null));
  if (hole) pathResults.push(circleToPath(hole));
  return {
    path: pathResults.map((result) => result.path).join(' '),
    controlPoints: pathResults.flatMap((result) => result.controlPoints),
  };
}

function buildControlPointMarkers(controlPoints: Point[]) {
  return controlPoints
    .map(
      (point) =>
        `<circle cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${CONTROL_POINT_RADIUS}" fill="#ff0000" stroke="#ffffff" stroke-width="${CONTROL_POINT_STROKE_WIDTH}" vector-effect="non-scaling-stroke"/>`,
    )
    .join('\n  ');
}

function buildSvg(fileName: string, width: number, height: number, cutPath: SvgPathResult) {
  const controlPointMarkers = buildControlPointMarkers(cutPath.controlPoints);
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(fileName)} acrylic keychain cut line">
  <title>${escapeXml(fileName)} acrylic keychain cut line</title>
  <path d="${cutPath.path}" fill="rgba(179, 229, 252, 0.18)" fill-rule="evenodd" stroke="#ff2f7d" stroke-width="1" vector-effect="non-scaling-stroke"/>
  ${controlPointMarkers}
</svg>
`;
}

export async function POST(request: Request) {
  let body: AcrylicExportRequest;
  try {
    body = (await request.json()) as AcrylicExportRequest;
  } catch {
    return jsonError('リクエストを読み込めませんでした');
  }

  if (typeof body.fileName !== 'string') return jsonError('ファイル名が不正です');
  if (typeof body.width !== 'number' || typeof body.height !== 'number' || !Number.isInteger(body.width) || !Number.isInteger(body.height)) return jsonError('出力サイズが不正です');
  if (body.width <= 0 || body.height <= 0 || body.width > MAX_EXPORT_SIZE || body.height > MAX_EXPORT_SIZE) return jsonError('出力サイズが大きすぎます');
  if (typeof body.artworkDataUrl !== 'string') return jsonError('PNGデータが不正です');
  if (body.holeMode !== 'with-hole' && body.holeMode !== 'without-hole') return jsonError('穴モードが不正です');

  try {
    const fileBaseName = sanitizeFileName(body.fileName);
    const artwork = decodePngAlpha(parsePngDataUrl(body.artworkDataUrl));
    if (artwork.width !== body.width || artwork.height !== body.height) throw new Error('イラストPNGのサイズが不正です');
    const cutPath = buildServerCutPath(artwork, body.holeMode);
    const svg = buildSvg(fileBaseName, body.width, body.height, cutPath);

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileBaseName}.svg"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : '発注用ファイルを作成できませんでした', 500);
  }
}
