import { inflateSync } from 'node:zlib';
import { NextResponse } from 'next/server';
import {
  DEFAULT_ACRYLIC_GENERATION_OPTIONS,
  resolveAcrylicGenerationOptions,
  type AcrylicGenerationOptions,
} from '@/lib/acrylicGenerationOptions';

export const runtime = 'nodejs';

type AcrylicExportRequest = {
  fileName?: unknown;
  width?: unknown;
  height?: unknown;
  artworkDataUrl?: unknown;
  holeMode?: unknown;
  debug?: unknown;
  generationOptions?: unknown;
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
  fixedHoleClearRadius: number;
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

type DebugPoint = {
  point: Point;
  kind: 'normal' | 'green';
};

type Concavity = {
  startIndex: number;
  bottomIndex: number;
  endIndex: number;
  start: Point;
  bottom: Point;
  end: Point;
  depth: number;
  width: number;
  score: number;
  direction: 'left' | 'right';
};

type ConcavityDetectionOptions = {
  closed?: boolean;
  areaSign?: number;
  protectedPointKeys?: Set<string>;
};

type SvgPathResult = {
  path: string;
  controlPoints: DebugPoint[];
  longStraightLines: Array<{ start: Point; end: Point }>;
  connectedStraightLines: Array<{ start: Point; end: Point }>;
  extraPaths?: Array<{
    path: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  }>;
  pathStyle?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
};

type PathOp =
  | {
      kind: 'line';
      start: Point;
      end: Point;
    }
  | {
      kind: 'quad';
      start: Point;
      control: Point;
      end: Point;
      controlKind: DebugPoint['kind'];
    }
  | {
      kind: 'cubic';
      start: Point;
      control1: Point;
      control2: Point;
      end: Point;
    };

type StraightLineCandidate = {
  start: Point;
  end: Point;
  opIndex: number;
};

type ConnectedStraightLineGroup = {
  start: Point;
  end: Point;
  opIndices: number[];
};

type StraightPointRun = {
  startIndex: number;
  endIndex: number;
};

const MAX_EXPORT_SIZE = 2400;
const MAX_PNG_BYTES = 12 * 1024 * 1024;
const MAX_MASK_PIXELS = 2_400_000;
const REFERENCE_ARTWORK_SIZE = 500;
const BASE_INTERNAL_GAP_CLOSE_RADIUS = 14;
const CONTROL_POINT_RADIUS = 0.9;
const CONTROL_POINT_STROKE_WIDTH = 0.2;
const BASE_LONG_STRAIGHT_LINE_MIN_LENGTH = 7;
const OUTER_CORNER_ROUND_MIN_ANGLE = 1;
const OUTER_CORNER_ROUND_MAX_ANGLE = 179;
const OUTER_CORNER_ROUND_MAX_TRIM = 18;
const OUTER_CORNER_ROUND_MIN_TRIM = 0.2;
const INNER_SHARP_CORNER_MAX_ANGLE = 90;
const CONCAVITY_MAX_ANGLE = 160;
const BASE_SMOOTH_CURVE_SIMPLIFY_TOLERANCE = 1.2;
const BASE_CURVE_FIT_MAX_ERROR = 2;
const CURVE_FIT_MAX_RECURSION = 4;
const CURVE_FIT_MIN_POINTS = 4;
const CURVE_FIT_SAMPLE_STEPS = 24;
const LONG_STRAIGHT_LINE_STROKE = '#0066ff';
const CONNECTED_STRAIGHT_LINE_STROKE = '#ffd400';
const CONNECTED_STRAIGHT_LINE_MAX_GAP = 4;
const BASE_STRAIGHT_ADJACENT_CONTROL_MAX_GAP = 8;
const STRAIGHT_OFF_DIRECTION_CONTROL_MIN_ANGLE = 8;
const STRAIGHT_TO_CONCAVITY_STEEP_MIN_ANGLE = 28;
const GREEN_POINT_FILL = '#00a651';
const NORMAL_CONTROL_POINT_FILL = '#ff0000';
const PARALLEL_LINE_MAX_ANGLE_DELTA = 8;
const REMOVE_INNER_CONTROL_POINTS = true;
const ENABLE_STRAIGHT_LINE_PROCESSING = true;
const ENABLE_NARROW_EXIT_AREA_FILL = true;
const DEBUG_OUTPUT_NARROW_EXIT_AREA_MASK_PATH = false;
const DEBUG_OUTPUT_HOLE_FILL_TARGET_MASK_PATH = false;
const DEBUG_OUTPUT_RAW_BASE_MASK_PATH = false;
const DEBUG_OUTPUT_PRE_SMOOTHING_PATH = false;
const DEBUG_HOLE_FILL_TARGET_FILL = 'rgba(0, 102, 255, 0.72)';
const DEBUG_HOLE_FILL_TARGET_STROKE = '#0066ff';
const SHOW_CONTROL_POINT_MARKERS = false;
const SHOW_LONG_STRAIGHT_LINE_MARKERS = false;
const SHOW_CONNECTED_STRAIGHT_LINE_MARKERS = false;
const ZIP_LOCAL_FILE_HEADER_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE = 0x02014b50;
const ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE = 0x06054b50;

function createPathResult(
  path: string,
  controlPoints: DebugPoint[] = [],
  longStraightLines: Array<{ start: Point; end: Point }> = [],
  connectedStraightLines: Array<{ start: Point; end: Point }> = [],
  pathStyle?: SvgPathResult['pathStyle'],
  extraPaths?: SvgPathResult['extraPaths'],
): SvgPathResult {
  return { path, controlPoints, longStraightLines, connectedStraightLines, extraPaths, pathStyle };
}

function lineToCommand(point: Point) {
  return `L ${formatSvgNumber(point.x)} ${formatSvgNumber(point.y)}`;
}

function getLongStraightLineMinLength(width: number, height: number) {
  return BASE_LONG_STRAIGHT_LINE_MIN_LENGTH * (Math.max(width, height) / REFERENCE_ARTWORK_SIZE);
}

function getStraightAdjacentControlMaxGap(longStraightLineMinLength: number) {
  return BASE_STRAIGHT_ADJACENT_CONTROL_MAX_GAP * (longStraightLineMinLength / BASE_LONG_STRAIGHT_LINE_MIN_LENGTH);
}

function getSmoothCurveSimplifyTolerance(longStraightLineMinLength: number) {
  return BASE_SMOOTH_CURVE_SIMPLIFY_TOLERANCE * (longStraightLineMinLength / BASE_LONG_STRAIGHT_LINE_MIN_LENGTH);
}

function getCurveFitMaxError(longStraightLineMinLength: number) {
  return BASE_CURVE_FIT_MAX_ERROR * (longStraightLineMinLength / BASE_LONG_STRAIGHT_LINE_MIN_LENGTH);
}

function pushLineCommand(commands: string[], longStraightLines: Array<{ start: Point; end: Point }>, start: Point, end: Point, minLength: number) {
  commands.push(lineToCommand(end));
  if (distance(start, end) >= minLength) longStraightLines.push({ start, end });
}

function areEndpointsNear(left: Point, right: Point) {
  return distance(left, right) <= CONNECTED_STRAIGHT_LINE_MAX_GAP;
}

function areLinesAdjacent(left: { start: Point; end: Point }, right: { start: Point; end: Point }) {
  return (
    areEndpointsNear(left.start, right.start) ||
    areEndpointsNear(left.start, right.end) ||
    areEndpointsNear(left.end, right.start) ||
    areEndpointsNear(left.end, right.end)
  );
}

function areCandidatesConnected(left: StraightLineCandidate, right: StraightLineCandidate) {
  return areNearlyParallel(left, right) && areLinesAdjacent(left, right);
}

function buildConnectedStraightLineGroups(candidates: StraightLineCandidate[]): ConnectedStraightLineGroup[] {
  const mergedLines = candidates;
  const endpointCounts = new Map<string, number>();
  mergedLines.forEach(({ start, end }) => {
    [pointKey(start), pointKey(end)].forEach((key) => {
      endpointCounts.set(key, (endpointCounts.get(key) ?? 0) + 1);
    });
  });

  const isConnectedLine = (line: StraightLineCandidate, index: number) =>
    (endpointCounts.get(pointKey(line.start)) ?? 0) > 1 ||
    (endpointCounts.get(pointKey(line.end)) ?? 0) > 1 ||
    mergedLines.some((otherLine, otherIndex) => otherIndex !== index && areCandidatesConnected(line, otherLine));
  const connectedLineFlags = mergedLines.map(isConnectedLine);
  const visited = new Set<number>();
  const groups: ConnectedStraightLineGroup[] = [];

  mergedLines.forEach((line, index) => {
    if (visited.has(index) || !connectedLineFlags[index]) return;
    const groupIndices: number[] = [];
    const queue = [index];
    visited.add(index);
    while (queue.length > 0) {
      const currentIndex = queue.shift();
      if (currentIndex === undefined) continue;
      groupIndices.push(currentIndex);
      mergedLines.forEach((candidateLine, candidateIndex) => {
        if (visited.has(candidateIndex) || !connectedLineFlags[candidateIndex]) return;
        const currentLine = mergedLines[currentIndex];
        if (!areCandidatesConnected(currentLine, candidateLine)) return;
        visited.add(candidateIndex);
        queue.push(candidateIndex);
      });
    }

    if (groupIndices.length < 2) return;
    const sortedLines = groupIndices.map((groupIndex) => mergedLines[groupIndex]).sort((left, right) => left.opIndex - right.opIndex);
    groups.push({
      start: sortedLines[0].start,
      end: sortedLines[sortedLines.length - 1].end,
      opIndices: sortedLines.map(({ opIndex }) => opIndex),
    });
  });

  return groups;
}

function buildStraightLineCandidates(ops: PathOp[], minLength: number) {
  return ops.reduce<StraightLineCandidate[]>((candidates, op, opIndex) => {
    if (op.kind === 'line' && distance(op.start, op.end) >= minLength) candidates.push({ start: op.start, end: op.end, opIndex });
    return candidates;
  }, []);
}

function setPathOpStart(op: PathOp | undefined, start: Point) {
  if (!op) return;
  op.start = start;
}

function clonePathOp(op: PathOp): PathOp {
  if (op.kind === 'line') {
    return { kind: 'line', start: { ...op.start }, end: { ...op.end } };
  }
  if (op.kind === 'cubic') {
    return { kind: 'cubic', start: { ...op.start }, control1: { ...op.control1 }, control2: { ...op.control2 }, end: { ...op.end } };
  }
  return { kind: 'quad', start: { ...op.start }, control: { ...op.control }, end: { ...op.end }, controlKind: op.controlKind };
}

function collectStraightTargetOpIndices(candidates: StraightLineCandidate[], groups: ConnectedStraightLineGroup[]) {
  const targetOpIndices = new Set<number>();
  candidates.forEach(({ opIndex }) => targetOpIndices.add(opIndex));
  groups.forEach(({ opIndices }) => {
    opIndices.forEach((opIndex) => targetOpIndices.add(opIndex));
  });
  return targetOpIndices;
}

function collectStraightTargetLines(candidates: StraightLineCandidate[], groups: ConnectedStraightLineGroup[]) {
  return [
    ...candidates.map(({ start, end }) => ({ start, end })),
    ...groups.map(({ start, end }) => ({ start, end })),
  ];
}

function isNearStraightTargetEndpoint(point: Point, targetLines: Array<{ start: Point; end: Point }>, maxGap: number) {
  return targetLines.some(({ start, end }) => distance(point, start) <= maxGap || distance(point, end) <= maxGap);
}

function isSameStraightTargetLine(line: { start: Point; end: Point }, targetLines: Array<{ start: Point; end: Point }>, maxGap: number) {
  return targetLines.some((targetLine) => areNearlyParallel(line, targetLine) && areLinesAdjacent(line, targetLine));
}

function findTrailingStraightTargetIndex(
  ops: PathOp[],
  targetLines: Array<{ start: Point; end: Point }>,
  maxGap: number,
  longLineMinLength: number,
) {
  for (let index = ops.length - 1; index >= 0; index -= 1) {
    const op = ops[index];
    if (op.kind !== 'line') return -1;
    if (distance(op.start, op.end) >= longLineMinLength && isSameStraightTargetLine(op, targetLines, maxGap)) return index;
    if (distance(op.start, op.end) > maxGap) return -1;
  }
  return -1;
}

function canExtendStraightLineToPoint(line: { start: Point; end: Point }, point: Point, maxGap: number) {
  if (distance(line.end, point) <= 0.001) return true;
  const extension = { start: line.end, end: point };
  return areNearlyParallel(line, extension) && perpendicularDistance(point, line.start, line.end) <= maxGap;
}

function isShortOffDirectionControlAfterStraight(line: { start: Point; end: Point }, quad: Extract<PathOp, { kind: 'quad' }>, maxGap: number) {
  const controlDistance = distance(line.end, quad.control);
  const endDistance = distance(line.end, quad.end);
  if (controlDistance > maxGap || endDistance > maxGap * 2.5) return false;
  const controlAngle = lineAngle(line.end, quad.control);
  const endAngle = lineAngle(line.end, quad.end);
  const lineDirection = lineAngle(line.start, line.end);
  return (
    angleDelta(lineDirection, controlAngle) >= STRAIGHT_OFF_DIRECTION_CONTROL_MIN_ANGLE ||
    angleDelta(lineDirection, endAngle) >= STRAIGHT_OFF_DIRECTION_CONTROL_MIN_ANGLE
  );
}

function isShortOffDirectionLineAfterStraight(line: { start: Point; end: Point }, segment: Extract<PathOp, { kind: 'line' }>, maxGap: number) {
  if (distance(line.end, segment.start) > maxGap || distance(segment.start, segment.end) > maxGap) return false;
  return angleDelta(lineAngle(line.start, line.end), lineAngle(segment.start, segment.end)) >= STRAIGHT_OFF_DIRECTION_CONTROL_MIN_ANGLE;
}

function removeAdjacentQuadraticControlPointsNextToStraightLines(
  ops: PathOp[],
  targetOpIndices: Set<number>,
  targetLines: Array<{ start: Point; end: Point }>,
  longLineMinLength: number,
) {
  const clonedOps = ops.map(clonePathOp);
  const output: PathOp[] = [];
  const maxGap = getStraightAdjacentControlMaxGap(longLineMinLength);

  for (let index = 0; index < clonedOps.length; index += 1) {
    const op = clonedOps[index];
    const previous = output[output.length - 1];
    const next = clonedOps[index + 1];
    const nextNext = clonedOps[index + 2];
    const isPreviousStraightTarget = targetOpIndices.has(index - 1);
    const isControlNearStraightEndpoint = op.kind === 'quad' && isNearStraightTargetEndpoint(op.control, targetLines, maxGap);
    const trailingStraightTargetIndex = op.kind === 'quad' ? findTrailingStraightTargetIndex(output, targetLines, maxGap, longLineMinLength) : -1;
    const trailingStraightTarget = trailingStraightTargetIndex >= 0 ? output[trailingStraightTargetIndex] : undefined;
    const isControlNearTrailingStraightEndpoint =
      op.kind === 'quad' && trailingStraightTarget?.kind === 'line' && distance(op.control, trailingStraightTarget.end) <= maxGap;

    if (op.kind === 'line' && trailingStraightTarget?.kind === 'line' && isShortOffDirectionLineAfterStraight(trailingStraightTarget, op, maxGap)) {
      if (next?.kind === 'quad' && distance(trailingStraightTarget.end, next.end) <= maxGap * 2.5) {
        output.splice(trailingStraightTargetIndex + 1);
        setPathOpStart(nextNext, trailingStraightTarget.end);
        index += 1;
        continue;
      }
      output.splice(trailingStraightTargetIndex + 1);
      setPathOpStart(next, trailingStraightTarget.end);
      continue;
    }

    if (op.kind === 'quad' && trailingStraightTarget?.kind === 'line' && isShortOffDirectionControlAfterStraight(trailingStraightTarget, op, maxGap)) {
      output.splice(trailingStraightTargetIndex + 1);
      setPathOpStart(next, trailingStraightTarget.end);
      continue;
    }

    if (
      op.kind === 'line' &&
      next?.kind === 'quad' &&
      isPreviousStraightTarget &&
      previous?.kind === 'line' &&
      distance(op.start, op.end) <= maxGap &&
      canExtendStraightLineToPoint(previous, next.end, maxGap)
    ) {
      setPathOpStart(nextNext, previous.end);
      index += 1;
      continue;
    }

    if (op.kind === 'quad' && (isControlNearStraightEndpoint || isControlNearTrailingStraightEndpoint)) {
      if (trailingStraightTarget?.kind === 'line' && canExtendStraightLineToPoint(trailingStraightTarget, op.end, maxGap)) {
        output.splice(trailingStraightTargetIndex + 1);
        setPathOpStart(next, trailingStraightTarget.end);
      } else if (previous?.kind === 'line' && canExtendStraightLineToPoint(previous, op.end, maxGap)) {
        setPathOpStart(next, previous.end);
      } else {
        output.push(op);
      }
      continue;
    }

    if (op.kind === 'quad' && isPreviousStraightTarget && previous?.kind === 'line' && canExtendStraightLineToPoint(previous, op.end, maxGap)) {
      setPathOpStart(next, previous.end);
      continue;
    }

    output.push(op);
  }

  return output.filter((op) => op.kind !== 'line' || distance(op.start, op.end) > 0.001);
}

function buildPathFromOps(ops: PathOp[], start: Point, minLength: number) {
  const initialCandidates = ENABLE_STRAIGHT_LINE_PROCESSING ? buildStraightLineCandidates(ops, minLength) : [];
  const initialConnectedGroups = ENABLE_STRAIGHT_LINE_PROCESSING ? buildConnectedStraightLineGroups(initialCandidates) : [];
  const targetLines = ENABLE_STRAIGHT_LINE_PROCESSING ? collectStraightTargetLines(initialCandidates, initialConnectedGroups) : [];
  const adjustedOps = ENABLE_STRAIGHT_LINE_PROCESSING
    ? removeAdjacentQuadraticControlPointsNextToStraightLines(
        ops,
        collectStraightTargetOpIndices(initialCandidates, initialConnectedGroups),
        targetLines,
        minLength,
      )
    : ops;
  const commands = [`M ${formatSvgNumber(start.x)} ${formatSvgNumber(start.y)}`];
  const controlPoints: DebugPoint[] = [];
  const longStraightLines: Array<{ start: Point; end: Point }> = [];
  const connectedGroups = ENABLE_STRAIGHT_LINE_PROCESSING ? buildConnectedStraightLineGroups(buildStraightLineCandidates(adjustedOps, minLength)) : [];
  const connectedGroupByStartIndex = new Map<number, ConnectedStraightLineGroup>();
  const connectedStraightLines: Array<{ start: Point; end: Point }> = [];

  connectedGroups.forEach((group) => {
    const sortedIndices = group.opIndices.slice().sort((left, right) => left - right);
    const firstOpIndex = sortedIndices[0];
    const lastOpIndex = sortedIndices[sortedIndices.length - 1];
    const firstOp = adjustedOps[firstOpIndex];
    const lastOp = adjustedOps[lastOpIndex];
    if (!firstOp || !lastOp) return;
    const mergedGroup = {
      start: firstOp.start,
      end: lastOp.end,
      opIndices: sortedIndices,
    };
    connectedGroupByStartIndex.set(firstOpIndex, mergedGroup);
    connectedStraightLines.push({ start: mergedGroup.start, end: mergedGroup.end });
  });

  for (let index = 0; index < adjustedOps.length; index += 1) {
    const connectedGroup = connectedGroupByStartIndex.get(index);
    if (connectedGroup) {
      pushLineCommand(commands, longStraightLines, connectedGroup.start, connectedGroup.end, minLength);
      index = connectedGroup.opIndices[connectedGroup.opIndices.length - 1];
      continue;
    }

    const op = adjustedOps[index];
    if (op.kind === 'line') {
      pushLineCommand(commands, longStraightLines, op.start, op.end, minLength);
    } else if (op.kind === 'quad') {
      commands.push(
        `Q ${formatSvgNumber(op.control.x)} ${formatSvgNumber(op.control.y)} ${formatSvgNumber(op.end.x)} ${formatSvgNumber(op.end.y)}`,
      );
      controlPoints.push({ point: op.control, kind: op.controlKind });
    } else {
      commands.push(
        `C ${formatSvgNumber(op.control1.x)} ${formatSvgNumber(op.control1.y)} ${formatSvgNumber(op.control2.x)} ${formatSvgNumber(op.control2.y)} ${formatSvgNumber(op.end.x)} ${formatSvgNumber(op.end.y)}`,
      );
    }
  }

  return {
    commands,
    controlPoints,
    longStraightLines,
    connectedStraightLines,
  };
}

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

function encodeUtf8(value: string) {
  return Buffer.from(value, 'utf8');
}

function createCrc32Table() {
  const table = new Uint32Array(256);
  for (let index = 0; index < table.length; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC32_TABLE = createCrc32Table();

function crc32(buffer: Buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) {
    value = CRC32_TABLE[(value ^ byte) & 0xff] ^ (value >>> 8);
  }
  return (value ^ 0xffffffff) >>> 0;
}

function createZip(files: Array<{ name: string; data: Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  files.forEach(({ name, data }) => {
    const nameBuffer = encodeUtf8(name);
    const checksum = crc32(data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(ZIP_LOCAL_FILE_HEADER_SIGNATURE, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0x0800, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(data.length, 18);
    localHeader.writeUInt32LE(data.length, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28);
    localParts.push(localHeader, nameBuffer, data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(ZIP_CENTRAL_DIRECTORY_HEADER_SIGNATURE, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0x0800, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(data.length, 20);
    centralHeader.writeUInt32LE(data.length, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, nameBuffer);

    offset += localHeader.length + nameBuffer.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(ZIP_END_OF_CENTRAL_DIRECTORY_SIGNATURE, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
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

function getAcrylicMetrics(
  artworkWidth: number,
  artworkHeight: number,
  keychainOptions: AcrylicGenerationOptions['keychain'],
): AcrylicMetrics {
  return {
    clearRadius: scaleArtworkMetric(keychainOptions.clearRadius, artworkWidth, artworkHeight),
    fixedHoleClearRadius: scaleArtworkMetric(DEFAULT_ACRYLIC_GENERATION_OPTIONS.keychain.clearRadius, artworkWidth, artworkHeight),
    internalGapCloseRadius: scaleArtworkMetric(BASE_INTERNAL_GAP_CLOSE_RADIUS, artworkWidth, artworkHeight),
    holeOuterRadius: scaleArtworkMetric(keychainOptions.holeOuterRadius, artworkWidth, artworkHeight),
    holeInnerRadius: scaleArtworkMetric(keychainOptions.holeInnerRadius, artworkWidth, artworkHeight),
    holeGap: scaleArtworkMetric(keychainOptions.holeGap, artworkWidth, artworkHeight),
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

function detectNarrowExitTransparentAreas(mask: Uint8Array, width: number, height: number, radius: number) {
  const closeRadius = Math.max(1, Math.round(radius));
  const dilatedMask = dilateMask(mask, width, height, closeRadius);
  const closedDilatedMask = fillEnclosedMaskHoles(dilatedMask, width, height);
  const candidateMask = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    if (closedDilatedMask[index] && !dilatedMask[index]) candidateMask[index] = 1;
  }

  const detectedMask = new Uint8Array(width * height);
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  const component = new Int32Array(width * height);
  const minimumInteriorArea = Math.max(32, Math.round(closeRadius * closeRadius * 1.5));
  const minimumInteriorSpan = Math.max(4, Math.round(closeRadius * 1.5));

  for (let start = 0; start < width * height; start += 1) {
    if (!candidateMask[start] || visited[start]) continue;
    let head = 0;
    let tail = 0;
    let count = 0;
    let minX = width;
    let maxX = 0;
    let minY = height;
    let maxY = 0;
    let touchesEdge = false;
    visited[start] = 1;
    queue[tail] = start;
    tail += 1;

    while (head < tail) {
      const index = queue[head];
      head += 1;
      component[count] = index;
      count += 1;
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      if (x === 0 || x === width - 1 || y === 0 || y === height - 1) touchesEdge = true;
      const neighbors = [x > 0 ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y > 0 ? index - width : -1, y < height - 1 ? index + width : -1];
      for (const next of neighbors) {
        if (next < 0 || !candidateMask[next] || visited[next]) continue;
        visited[next] = 1;
        queue[tail] = next;
        tail += 1;
      }
    }

    const patchWidth = maxX - minX + 1;
    const patchHeight = maxY - minY + 1;
    const hasLargeInterior = count >= minimumInteriorArea && Math.max(patchWidth, patchHeight) >= minimumInteriorSpan;
    if (touchesEdge || !hasLargeInterior) continue;
    for (let index = 0; index < count; index += 1) {
      detectedMask[component[index]] = 1;
    }
  }

  return detectedMask;
}

function buildNarrowExitFillPatchMask(mask: Uint8Array, detectedMask: Uint8Array | null, width: number, height: number, radius: number) {
  const output = new Uint8Array(width * height);
  if (!detectedMask) return output;
  const closeRadius = Math.max(1, Math.round(radius));
  const dilatedMask = dilateMask(mask, width, height, closeRadius);
  const closedDilatedMask = fillEnclosedMaskHoles(dilatedMask, width, height);
  const patchMask = dilateMask(detectedMask, width, height, closeRadius);
  for (let index = 0; index < width * height; index += 1) {
    if (patchMask[index] && closedDilatedMask[index] && !mask[index]) output[index] = 1;
  }
  return output;
}

function fillNarrowExitTransparentAreas(mask: Uint8Array, patchMask: Uint8Array | null, width: number, height: number) {
  if (!patchMask) return mask.slice();
  const output = mask.slice();
  for (let index = 0; index < width * height; index += 1) {
    if (patchMask[index]) output[index] = 1;
  }
  return output;
}

function subtractMask(outerMask: Uint8Array, innerMask: Uint8Array, width: number, height: number) {
  const output = new Uint8Array(width * height);
  for (let index = 0; index < width * height; index += 1) {
    if (outerMask[index] && !innerMask[index]) output[index] = 1;
  }
  return output;
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

function lineAngle(start: Point, end: Point) {
  const angle = (Math.atan2(end.y - start.y, end.x - start.x) * 180) / Math.PI;
  return ((angle % 180) + 180) % 180;
}

function angleDelta(left: number, right: number) {
  const delta = Math.abs(left - right) % 180;
  return Math.min(delta, 180 - delta);
}

function areNearlyParallel(left: { start: Point; end: Point }, right: { start: Point; end: Point }) {
  return angleDelta(lineAngle(left.start, left.end), lineAngle(right.start, right.end)) <= PARALLEL_LINE_MAX_ANGLE_DELTA;
}

function mergeStraightLineMarkers(lines: Array<{ start: Point; end: Point }>) {
  return lines.reduce<Array<{ start: Point; end: Point }>>((merged, line) => {
    const previous = merged[merged.length - 1];
    if (previous && pointKey(previous.end) === pointKey(line.start) && areNearlyParallel(previous, line)) {
      previous.end = line.end;
      return merged;
    }
    merged.push({ start: line.start, end: line.end });
    return merged;
  }, []);
}

function mergeDebugPoints(controlPoints: DebugPoint[]) {
  const merged = new Map<string, DebugPoint>();
  controlPoints.forEach((controlPoint) => {
    const key = pointKey(controlPoint.point);
    const existing = merged.get(key);
    if (!existing || controlPoint.kind === 'green') merged.set(key, controlPoint);
  });
  return Array.from(merged.values());
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

function upperCircleArcWithVerticalConnectors(circle: Circle, fromLeftToRight: boolean, startConnectorY: number, endConnectorY: number, longStraightLineMinLength: number): SvgPathResult {
  const left = { x: circle.centerX - circle.radius, y: circle.centerY };
  const top = { x: circle.centerX, y: circle.centerY - circle.radius };
  const right = { x: circle.centerX + circle.radius, y: circle.centerY };
  if (fromLeftToRight) {
    const startConnector = { x: left.x, y: startConnectorY };
    const endConnector = { x: right.x, y: endConnectorY };
    const controlPoints = [startConnector, left, top, right, endConnector].map((point) => ({ point, kind: 'normal' as const }));
    const commands: string[] = [];
    const longStraightLines: Array<{ start: Point; end: Point }> = [];
    pushLineCommand(commands, longStraightLines, startConnector, left, longStraightLineMinLength);
    return createPathResult(
      [
        lineToCommand(startConnector),
        ...commands,
        `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
        `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(right.x)} ${formatSvgNumber(right.y)}`,
        lineToCommand(endConnector),
      ].join(' '),
      controlPoints,
      distance(right, endConnector) >= longStraightLineMinLength ? [...longStraightLines, { start: right, end: endConnector }] : longStraightLines,
    );
  }
  const startConnector = { x: right.x, y: startConnectorY };
  const endConnector = { x: left.x, y: endConnectorY };
  const controlPoints = [startConnector, right, top, left, endConnector].map((point) => ({ point, kind: 'normal' as const }));
  const commands: string[] = [];
  const longStraightLines: Array<{ start: Point; end: Point }> = [];
  pushLineCommand(commands, longStraightLines, startConnector, right, longStraightLineMinLength);
  return createPathResult(
    [
      lineToCommand(startConnector),
      ...commands,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 0 ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 0 ${formatSvgNumber(left.x)} ${formatSvgNumber(left.y)}`,
      lineToCommand(endConnector),
    ].join(' '),
    controlPoints,
    distance(left, endConnector) >= longStraightLineMinLength ? [...longStraightLines, { start: left, end: endConnector }] : longStraightLines,
  );
}

function cornerCross(previous: Point, current: Point, next: Point) {
  return (current.x - previous.x) * (next.y - current.y) - (current.y - previous.y) * (next.x - current.x);
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

function detectConcavities(points: Point[], options: ConcavityDetectionOptions = {}): Concavity[] {
  const { closed = true, protectedPointKeys = new Set<string>() } = options;
  if (points.length < 3) return [];

  const areaSign = options.areaSign ?? (Math.sign(signedArea(points)) || 1);
  const concavities: Concavity[] = [];
  const startIndex = closed ? 0 : 1;
  const endIndex = closed ? points.length : points.length - 1;

  for (let index = startIndex; index < endIndex; index += 1) {
    const previousIndex = (index - 1 + points.length) % points.length;
    const nextIndex = (index + 1) % points.length;
    const previous = points[previousIndex];
    const current = points[index];
    const next = points[nextIndex];
    const turn = cornerCross(previous, current, next);
    const turnSign = Math.sign(turn);
    if (turnSign === 0 || turnSign === areaSign || protectedPointKeys.has(pointKey(current))) continue;
    const angle = angleDegrees(previous, current, next);
    if (angle > CONCAVITY_MAX_ANGLE) continue;

    const depth = perpendicularDistance(current, previous, next);
    const width = distance(previous, next);
    concavities.push({
      startIndex: previousIndex,
      bottomIndex: index,
      endIndex: nextIndex,
      start: previous,
      bottom: current,
      end: next,
      depth,
      width,
      score: depth * width,
      direction: turn > 0 ? 'left' : 'right',
    });
  }

  return concavities;
}

function buildConcavityPointSet(points: Point[], concavities: Concavity[]) {
  const result = new Set<number>();

  for (const concavity of concavities) {
    const bottomIndex = Math.max(0, Math.min(points.length - 1, concavity.bottomIndex));
    result.add(bottomIndex);
  }

  return result;
}

function buildConcavityPointKeys(points: Point[], concavityPointSet: Set<number>) {
  const keys = new Set<string>();
  concavityPointSet.forEach((index) => {
    const point = points[index];
    if (point) keys.add(pointKey(point));
  });
  return keys;
}

function getControlPointKind(point: Point, concavityPointKeys: Set<string>): DebugPoint['kind'] {
  return concavityPointKeys.has(pointKey(point)) ? 'green' : 'normal';
}

function buildPathPointDebugPoints(points: Point[], concavityPointKeys: Set<string>): DebugPoint[] {
  return points.map((point) => ({ point, kind: getControlPointKind(point, concavityPointKeys) }));
}

function buildPreSmoothingDebugPath(
  points: Point[],
  concavityPointKeys: Set<string>,
  closed: boolean,
  longStraightLines: Array<{ start: Point; end: Point }> = [],
  connectedStraightLines: Array<{ start: Point; end: Point }> = [],
): SvgPathResult {
  if (points.length === 0) return createPathResult('');
  const commands = [`M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`];
  points.slice(1).forEach((point) => {
    commands.push(lineToCommand(point));
  });
  if (closed) commands.push('Z');
  return createPathResult(
    commands.join(' '),
    mergeDebugPoints(buildPathPointDebugPoints(points, concavityPointKeys)),
    longStraightLines,
    connectedStraightLines,
  );
}

function simplifyPolyline(points: Point[], tolerance: number): Point[] {
  if (points.length <= 2) return points;

  let farthestIndex = -1;
  let farthestDistance = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let index = 1; index < points.length - 1; index += 1) {
    const currentDistance = perpendicularDistance(points[index], start, end);
    if (currentDistance > farthestDistance) {
      farthestDistance = currentDistance;
      farthestIndex = index;
    }
  }

  if (farthestIndex < 0 || farthestDistance <= tolerance) return [start, end];

  const left = simplifyPolyline(points.slice(0, farthestIndex + 1), tolerance);
  const right = simplifyPolyline(points.slice(farthestIndex), tolerance);
  return [...left.slice(0, -1), ...right];
}

function isPointSequenceNearlyStraight(points: Point[], tolerance: number) {
  if (points.length <= 2) return true;
  const start = points[0];
  const end = points[points.length - 1];
  return points.slice(1, -1).every((point) => perpendicularDistance(point, start, end) <= tolerance);
}

function collectLongStraightPointRuns(points: Point[], minLength: number, tolerance: number) {
  const runs: StraightPointRun[] = [];
  if (!ENABLE_STRAIGHT_LINE_PROCESSING || points.length < 2) return runs;
  void tolerance;

  for (let startIndex = 0; startIndex < points.length - 1; startIndex += 1) {
    const endIndex = startIndex + 1;
    if (distance(points[startIndex], points[endIndex]) >= minLength) runs.push({ startIndex, endIndex });
  }

  return runs;
}

function nextIndexInDirection(index: number, step: 1 | -1, pointCount: number, closed: boolean) {
  const nextIndex = index + step;
  if (closed) return (nextIndex + pointCount) % pointCount;
  if (nextIndex < 0 || nextIndex >= pointCount) return undefined;
  return nextIndex;
}

function findNextConcavityPointIndex(
  startIndex: number,
  step: 1 | -1,
  pointCount: number,
  concavityPointSet: Set<number>,
  closed: boolean,
) {
  let index = startIndex;
  for (let guard = 0; guard < pointCount - 1; guard += 1) {
    const nextIndex = nextIndexInDirection(index, step, pointCount, closed);
    if (nextIndex === undefined) return undefined;
    if (concavityPointSet.has(nextIndex)) return nextIndex;
    index = nextIndex;
  }
  return undefined;
}

function maxAngleFromStraightToConcavity(
  points: Point[],
  endpointIndex: number,
  concavityIndex: number,
  step: 1 | -1,
  straightDirection: number,
  closed: boolean,
) {
  let maxAngle = 0;
  let previousIndex = endpointIndex;
  let currentIndex = endpointIndex;

  for (let guard = 0; guard < points.length - 1; guard += 1) {
    const nextIndex = nextIndexInDirection(currentIndex, step, points.length, closed);
    if (nextIndex === undefined) break;
    const previous = points[previousIndex];
    const next = points[nextIndex];
    if (previous && next && distance(previous, next) > 0.001) {
      maxAngle = Math.max(maxAngle, angleDelta(straightDirection, lineAngle(previous, next)));
      previousIndex = nextIndex;
    }
    currentIndex = nextIndex;
    if (currentIndex === concavityIndex) break;
  }

  const endpoint = points[endpointIndex];
  const concavity = points[concavityIndex];
  if (endpoint && concavity && distance(endpoint, concavity) > 0.001) {
    maxAngle = Math.max(maxAngle, angleDelta(straightDirection, lineAngle(endpoint, concavity)));
  }

  return maxAngle;
}

function straightRunSideAngleToConcavity(
  points: Point[],
  run: StraightPointRun,
  side: 'start' | 'end',
  concavityPointSet: Set<number>,
  closed: boolean,
) {
  const endpointIndex = side === 'start' ? run.startIndex : run.endIndex;
  const otherEndpointIndex = side === 'start' ? run.endIndex : run.startIndex;
  const step: 1 | -1 = side === 'start' ? -1 : 1;
  const concavityIndex = findNextConcavityPointIndex(endpointIndex, step, points.length, concavityPointSet, closed);
  const endpoint = points[endpointIndex];
  const otherEndpoint = points[otherEndpointIndex];
  if (concavityIndex === undefined || !endpoint || !otherEndpoint) return undefined;

  const straightDirection = lineAngle(otherEndpoint, endpoint);
  return maxAngleFromStraightToConcavity(points, endpointIndex, concavityIndex, step, straightDirection, closed);
}

function shouldKeepStraightRunByConcavityMotion(
  points: Point[],
  run: StraightPointRun,
  concavityPointSet: Set<number>,
  closed: boolean,
) {
  if (concavityPointSet.has(run.startIndex) || concavityPointSet.has(run.endIndex)) return true;

  const startSideAngle = straightRunSideAngleToConcavity(points, run, 'start', concavityPointSet, closed);
  const endSideAngle = straightRunSideAngleToConcavity(points, run, 'end', concavityPointSet, closed);
  if (startSideAngle === undefined || endSideAngle === undefined) return true;

  return (
    startSideAngle >= STRAIGHT_TO_CONCAVITY_STEEP_MIN_ANGLE &&
    endSideAngle >= STRAIGHT_TO_CONCAVITY_STEEP_MIN_ANGLE
  );
}

function filterStraightRunsByConcavityMotion(
  points: Point[],
  straightRuns: StraightPointRun[],
  concavityPointSet: Set<number>,
  closed: boolean,
) {
  return straightRuns.filter((run) => shouldKeepStraightRunByConcavityMotion(points, run, concavityPointSet, closed));
}

function buildStraightProtectedPointKeys(points: Point[], straightRuns: StraightPointRun[]) {
  const keys = new Set<string>();
  straightRuns.forEach((run) => {
    [run.startIndex, run.endIndex].forEach((index) => {
      const point = points[index];
      if (point) keys.add(pointKey(point));
    });
  });
  return keys;
}

function buildStraightAnchorPointSet(straightRuns: StraightPointRun[]) {
  const anchors = new Set<number>();
  straightRuns.forEach((run) => {
    anchors.add(run.startIndex);
    anchors.add(run.endIndex);
  });
  return anchors;
}

function areStraightRunsConsecutive(left: StraightPointRun, right: StraightPointRun, pointCount: number, closed: boolean) {
  if (left.endIndex === right.startIndex) return true;
  return closed && left.endIndex === pointCount - 1 && right.startIndex === 0;
}

function buildStraightRunMarkers(points: Point[], straightRuns: StraightPointRun[], closed: boolean) {
  const markers = {
    longStraightLines: [] as Array<{ start: Point; end: Point }>,
    connectedStraightLines: [] as Array<{ start: Point; end: Point }>,
  };
  const shouldBuildLongMarkers = SHOW_LONG_STRAIGHT_LINE_MARKERS;
  const shouldBuildConnectedMarkers = SHOW_CONNECTED_STRAIGHT_LINE_MARKERS;
  if (!shouldBuildLongMarkers && !shouldBuildConnectedMarkers) return markers;

  straightRuns.forEach((run, index) => {
    const start = points[run.startIndex];
    const end = points[run.endIndex];
    if (!start || !end) return;

    const previous = straightRuns[(index - 1 + straightRuns.length) % straightRuns.length];
    const next = straightRuns[(index + 1) % straightRuns.length];
    const isConnectedToPrevious = (index > 0 || closed) ? areStraightRunsConsecutive(previous, run, points.length, closed) : false;
    const isConnectedToNext = (index < straightRuns.length - 1 || closed) ? areStraightRunsConsecutive(run, next, points.length, closed) : false;
    if (isConnectedToPrevious || isConnectedToNext) {
      if (shouldBuildConnectedMarkers) markers.connectedStraightLines.push({ start, end });
      return;
    }

    if (shouldBuildLongMarkers) markers.longStraightLines.push({ start, end });
  });

  return markers;
}

function mergePointSets(...sets: Array<Set<number>>) {
  const merged = new Set<number>();
  sets.forEach((set) => {
    set.forEach((index) => merged.add(index));
  });
  return merged;
}

function signedPerpendicularDistance(point: Point, lineStart: Point, lineEnd: Point) {
  const lineLength = distance(lineStart, lineEnd);
  if (lineLength === 0) return 0;
  return ((lineEnd.x - lineStart.x) * (point.y - lineStart.y) - (lineEnd.y - lineStart.y) * (point.x - lineStart.x)) / lineLength;
}

function lerpPoint(start: Point, end: Point, ratio: number) {
  return {
    x: start.x + (end.x - start.x) * ratio,
    y: start.y + (end.y - start.y) * ratio,
  };
}

function segmentUnitNormal(start: Point, end: Point) {
  const lineLength = distance(start, end);
  if (lineLength === 0) return { x: 0, y: 0 };
  return {
    x: -(end.y - start.y) / lineLength,
    y: (end.x - start.x) / lineLength,
  };
}

function splitSegmentByBulgeDirection(points: Point[], tolerance: number) {
  if (points.length <= 3) return [points];

  const segments: Point[][] = [];
  let currentStart = 0;
  let currentSign = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const signedDistance = signedPerpendicularDistance(points[index], points[currentStart], points[points.length - 1]);
    if (Math.abs(signedDistance) <= tolerance) continue;
    const sign = Math.sign(signedDistance);
    if (currentSign === 0) {
      currentSign = sign;
      continue;
    }
    if (sign === currentSign) continue;

    const splitIndex = Math.max(currentStart + 1, index - 1);
    segments.push(points.slice(currentStart, splitIndex + 1));
    currentStart = splitIndex;
    currentSign = 0;
  }

  segments.push(points.slice(currentStart));
  return segments.filter((segment) => segment.length >= 2);
}

function buildSingleFlowCubicOp(segmentPoints: Point[], tolerance: number): Extract<PathOp, { kind: 'cubic' }> | null {
  if (segmentPoints.length < 2) return null;
  const start = segmentPoints[0];
  const end = segmentPoints[segmentPoints.length - 1];
  const lineLength = distance(start, end);
  if (lineLength <= 0.001) return null;

  let signedDistanceTotal = 0;
  let signedDistanceWeight = 0;
  let dominantSignedDistance = 0;
  for (const point of segmentPoints.slice(1, -1)) {
    const signedDistance = signedPerpendicularDistance(point, start, end);
    const weight = Math.abs(signedDistance);
    signedDistanceTotal += signedDistance * weight;
    signedDistanceWeight += weight;
    if (Math.abs(signedDistance) > Math.abs(dominantSignedDistance)) dominantSignedDistance = signedDistance;
  }

  const weightedSignedDistance = signedDistanceWeight > 0 ? signedDistanceTotal / signedDistanceWeight : 0;
  const sampleSignedDistance = Math.abs(weightedSignedDistance) >= tolerance ? weightedSignedDistance : dominantSignedDistance;
  const normal = segmentUnitNormal(start, end);
  const controlOffset = Math.max(-lineLength * 0.45, Math.min(lineLength * 0.45, sampleSignedDistance / 0.75));
  const firstBase = lerpPoint(start, end, 1 / 3);
  const secondBase = lerpPoint(start, end, 2 / 3);

  return {
    kind: 'cubic',
    start,
    control1: {
      x: firstBase.x + normal.x * controlOffset,
      y: firstBase.y + normal.y * controlOffset,
    },
    control2: {
      x: secondBase.x + normal.x * controlOffset,
      y: secondBase.y + normal.y * controlOffset,
    },
    end,
  };
}

function cubicPointAt(cubic: Extract<PathOp, { kind: 'cubic' }>, ratio: number) {
  const inverse = 1 - ratio;
  const inverseSquared = inverse * inverse;
  const ratioSquared = ratio * ratio;
  return {
    x:
      inverseSquared * inverse * cubic.start.x +
      3 * inverseSquared * ratio * cubic.control1.x +
      3 * inverse * ratioSquared * cubic.control2.x +
      ratioSquared * ratio * cubic.end.x,
    y:
      inverseSquared * inverse * cubic.start.y +
      3 * inverseSquared * ratio * cubic.control1.y +
      3 * inverse * ratioSquared * cubic.control2.y +
      ratioSquared * ratio * cubic.end.y,
  };
}

function distanceToCubic(point: Point, cubic: Extract<PathOp, { kind: 'cubic' }>) {
  let minimumDistance = Infinity;
  for (let step = 0; step <= CURVE_FIT_SAMPLE_STEPS; step += 1) {
    minimumDistance = Math.min(minimumDistance, distance(point, cubicPointAt(cubic, step / CURVE_FIT_SAMPLE_STEPS)));
  }
  return minimumDistance;
}

function findWorstFitPoint(points: Point[], cubic: Extract<PathOp, { kind: 'cubic' }>) {
  let index = -1;
  let error = 0;
  for (let pointIndex = 1; pointIndex < points.length - 1; pointIndex += 1) {
    const currentError = distanceToCubic(points[pointIndex], cubic);
    if (currentError > error) {
      error = currentError;
      index = pointIndex;
    }
  }
  return { index, error };
}

function smoothJoinedCubicTangents(ops: PathOp[]) {
  for (let index = 0; index < ops.length - 1; index += 1) {
    const left = ops[index];
    const right = ops[index + 1];
    if (left.kind !== 'cubic' || right.kind !== 'cubic' || distance(left.end, right.start) > 0.001) continue;

    const join = left.end;
    const leftHandleLength = distance(left.control2, join);
    const rightHandleLength = distance(join, right.control1);
    if (leftHandleLength <= 0.001 || rightHandleLength <= 0.001) continue;

    const incoming = {
      x: join.x - left.control2.x,
      y: join.y - left.control2.y,
    };
    const outgoing = {
      x: right.control1.x - join.x,
      y: right.control1.y - join.y,
    };
    const incomingLength = Math.hypot(incoming.x, incoming.y);
    const outgoingLength = Math.hypot(outgoing.x, outgoing.y);
    if (incomingLength <= 0.001 || outgoingLength <= 0.001) continue;

    let tangent = {
      x: incoming.x / incomingLength + outgoing.x / outgoingLength,
      y: incoming.y / incomingLength + outgoing.y / outgoingLength,
    };
    const tangentLength = Math.hypot(tangent.x, tangent.y);
    if (tangentLength <= 0.001) {
      tangent = {
        x: right.end.x - left.start.x,
        y: right.end.y - left.start.y,
      };
    }
    const normalizedLength = Math.hypot(tangent.x, tangent.y);
    if (normalizedLength <= 0.001) continue;

    const unit = {
      x: tangent.x / normalizedLength,
      y: tangent.y / normalizedLength,
    };
    left.control2 = {
      x: join.x - unit.x * leftHandleLength,
      y: join.y - unit.y * leftHandleLength,
    };
    right.control1 = {
      x: join.x + unit.x * rightHandleLength,
      y: join.y + unit.y * rightHandleLength,
    };
  }
}

function appendFittedSingleFlowCubicOps(ops: PathOp[], segmentPoints: Point[], tolerance: number, maxError: number, depth = 0) {
  const cubic = buildSingleFlowCubicOp(segmentPoints, tolerance);
  if (!cubic) return;

  const worst = findWorstFitPoint(segmentPoints, cubic);
  if (
    worst.error <= maxError ||
    worst.index <= 0 ||
    depth >= CURVE_FIT_MAX_RECURSION ||
    segmentPoints.length <= CURVE_FIT_MIN_POINTS
  ) {
    ops.push(cubic);
    return;
  }

  appendFittedSingleFlowCubicOps(ops, segmentPoints.slice(0, worst.index + 1), tolerance, maxError, depth + 1);
  appendFittedSingleFlowCubicOps(ops, segmentPoints.slice(worst.index), tolerance, maxError, depth + 1);
}

function appendSmoothSegmentOps(ops: PathOp[], segmentPoints: Point[], tolerance: number, maxError: number) {
  if (segmentPoints.length < 2) return;
  if (ENABLE_STRAIGHT_LINE_PROCESSING && isPointSequenceNearlyStraight(segmentPoints, tolerance)) {
    const simplifiedPoints = simplifyPolyline(segmentPoints, tolerance);
    ops.push({ kind: 'line', start: simplifiedPoints[0], end: simplifiedPoints[simplifiedPoints.length - 1] });
    return;
  }

  splitSegmentByBulgeDirection(segmentPoints, tolerance).forEach((segment) => {
    const startIndex = ops.length;
    appendFittedSingleFlowCubicOps(ops, segment, tolerance, maxError);
    smoothJoinedCubicTangents(ops.slice(startIndex));
  });
}

function collectCyclicIndexRangePoints(points: Point[], startIndex: number, endIndex: number) {
  const segment: Point[] = [];
  let index = startIndex;
  let guard = points.length + 1;
  while (guard > 0) {
    guard -= 1;
    segment.push(points[index]);
    if (index === endIndex) break;
    index = (index + 1) % points.length;
  }
  return segment;
}

function buildClosedSmoothOpsBetweenConcavities(
  points: Point[],
  concavityPointSet: Set<number>,
  tolerance: number,
  maxError: number,
) {
  const anchorIndices = Array.from(concavityPointSet).sort((left, right) => left - right);
  if (anchorIndices.length < 2) return null;

  const ops: PathOp[] = [];
  for (let index = 0; index < anchorIndices.length; index += 1) {
    const startIndex = anchorIndices[index];
    const endIndex = anchorIndices[(index + 1) % anchorIndices.length];
    appendSmoothSegmentOps(ops, collectCyclicIndexRangePoints(points, startIndex, endIndex), tolerance, maxError);
  }
  return {
    start: points[anchorIndices[0]],
    ops,
  };
}

function buildOpenSmoothOpsBetweenConcavities(
  points: Point[],
  concavityPointSet: Set<number>,
  tolerance: number,
  maxError: number,
) {
  if (concavityPointSet.size < 2) return null;
  const breakpoints = Array.from(new Set([0, ...Array.from(concavityPointSet), points.length - 1])).sort((left, right) => left - right);
  if (breakpoints.length < 2) return null;

  const ops: PathOp[] = [];
  for (let index = 0; index < breakpoints.length - 1; index += 1) {
    const startIndex = breakpoints[index];
    const endIndex = breakpoints[index + 1];
    if (startIndex === endIndex) continue;
    appendSmoothSegmentOps(ops, points.slice(startIndex, endIndex + 1), tolerance, maxError);
  }
  return {
    start: points[0],
    ops,
  };
}

function removeConcavityControlPoints(points: Point[], concavityPointSet: Set<number>, closed: boolean) {
  if (!REMOVE_INNER_CONTROL_POINTS) return points;
  if (concavityPointSet.size === 0) return points;

  const filtered = points.filter((_, index) => {
    if (!closed && (index === 0 || index === points.length - 1)) return true;
    return !concavityPointSet.has(index);
  });
  return filtered.length >= (closed ? 3 : 2) ? filtered : points;
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

function roundedClosedPath(points: Point[], longStraightLineMinLength: number): SvgPathResult {
  if (points.length < 3) return createPathResult('');
  const tolerance = getSmoothCurveSimplifyTolerance(longStraightLineMinLength);
  const maxError = getCurveFitMaxError(longStraightLineMinLength);
  const rawStraightRuns = collectLongStraightPointRuns(points, longStraightLineMinLength, tolerance);
  const rawProtectedPointKeys = buildStraightProtectedPointKeys(points, rawStraightRuns);
  const rawConcavityPointSet = buildConcavityPointSet(points, detectConcavities(points, { closed: true, protectedPointKeys: rawProtectedPointKeys }));
  const pathPoints = removeConcavityControlPoints(points, rawConcavityPointSet, true);
  const debugConcavityPointSet = buildConcavityPointSet(pathPoints, detectConcavities(pathPoints, { closed: true }));
  const straightRuns = filterStraightRunsByConcavityMotion(
    pathPoints,
    collectLongStraightPointRuns(pathPoints, longStraightLineMinLength, tolerance),
    debugConcavityPointSet,
    true,
  );
  const protectedPointKeys = buildStraightProtectedPointKeys(pathPoints, straightRuns);
  const straightAnchorPointSet = buildStraightAnchorPointSet(straightRuns);
  const concavityPointSet = buildConcavityPointSet(pathPoints, detectConcavities(pathPoints, { closed: true, protectedPointKeys }));
  const smoothAnchorPointSet = mergePointSets(concavityPointSet, straightAnchorPointSet);
  const concavityPointKeys = buildConcavityPointKeys(pathPoints, debugConcavityPointSet);
  if (DEBUG_OUTPUT_PRE_SMOOTHING_PATH) {
    const straightRunMarkers = buildStraightRunMarkers(pathPoints, straightRuns, true);
    return buildPreSmoothingDebugPath(
      pathPoints,
      concavityPointKeys,
      true,
      straightRunMarkers.longStraightLines,
      straightRunMarkers.connectedStraightLines,
    );
  }
  const smoothPath = buildClosedSmoothOpsBetweenConcavities(
    pathPoints,
    smoothAnchorPointSet,
    tolerance,
    maxError,
  );
  if (smoothPath) {
    const { commands, controlPoints, longStraightLines, connectedStraightLines } = buildPathFromOps(smoothPath.ops, smoothPath.start, longStraightLineMinLength);
    const debugPoints = buildPathPointDebugPoints(pathPoints, concavityPointKeys);
    commands.push('Z');
    return createPathResult(commands.join(' '), mergeDebugPoints([...controlPoints, ...debugPoints]), longStraightLines, connectedStraightLines);
  }

  const corners = getRoundedCornerData(pathPoints);
  const start = corners[0].exit;
  let cursor = start;
  const ops: PathOp[] = [];

  for (let offset = 1; offset <= corners.length; offset += 1) {
    const corner = corners[offset % corners.length];
    ops.push({ kind: 'line', start: cursor, end: corner.entry });
    cursor = corner.entry;
    if (corner.rounded) {
      const kind = getControlPointKind(corner.point, concavityPointKeys);
      ops.push({ kind: 'quad', start: cursor, control: corner.point, end: corner.exit, controlKind: kind });
      cursor = corner.exit;
    } else {
      ops.push({ kind: 'line', start: cursor, end: corner.exit });
      cursor = corner.exit;
    }
  }

  if (distance(cursor, start) > 0.001) ops.push({ kind: 'line', start: cursor, end: start });
  const { commands, controlPoints, longStraightLines, connectedStraightLines } = buildPathFromOps(ops, start, longStraightLineMinLength);
  const debugPoints = buildPathPointDebugPoints(pathPoints, concavityPointKeys);
  commands.push('Z');
  return createPathResult(commands.join(' '), mergeDebugPoints([...controlPoints, ...debugPoints]), longStraightLines, connectedStraightLines);
}

function roundedOpenPath(points: Point[], longStraightLineMinLength: number, areaSign: number): SvgPathResult {
  if (points.length === 0) return createPathResult('');
  if (points.length === 1) return createPathResult(`M ${formatSvgNumber(points[0].x)} ${formatSvgNumber(points[0].y)}`);

  const controlPoints: DebugPoint[] = [];
  const tolerance = getSmoothCurveSimplifyTolerance(longStraightLineMinLength);
  const maxError = getCurveFitMaxError(longStraightLineMinLength);
  const rawStraightRuns = collectLongStraightPointRuns(points, longStraightLineMinLength, tolerance);
  const rawProtectedPointKeys = buildStraightProtectedPointKeys(points, rawStraightRuns);
  const rawConcavityPointSet = buildConcavityPointSet(points, detectConcavities(points, { closed: false, areaSign, protectedPointKeys: rawProtectedPointKeys }));
  const pathPoints = removeConcavityControlPoints(points, rawConcavityPointSet, false);
  const debugConcavityPointSet = buildConcavityPointSet(pathPoints, detectConcavities(pathPoints, { closed: false, areaSign }));
  const straightRuns = filterStraightRunsByConcavityMotion(
    pathPoints,
    collectLongStraightPointRuns(pathPoints, longStraightLineMinLength, tolerance),
    debugConcavityPointSet,
    false,
  );
  const protectedPointKeys = buildStraightProtectedPointKeys(pathPoints, straightRuns);
  const straightAnchorPointSet = buildStraightAnchorPointSet(straightRuns);
  const concavityPointSet = buildConcavityPointSet(pathPoints, detectConcavities(pathPoints, { closed: false, areaSign, protectedPointKeys }));
  const smoothAnchorPointSet = mergePointSets(concavityPointSet, straightAnchorPointSet);
  const concavityPointKeys = buildConcavityPointKeys(pathPoints, debugConcavityPointSet);
  if (DEBUG_OUTPUT_PRE_SMOOTHING_PATH) {
    const straightRunMarkers = buildStraightRunMarkers(pathPoints, straightRuns, false);
    return buildPreSmoothingDebugPath(
      pathPoints,
      concavityPointKeys,
      false,
      straightRunMarkers.longStraightLines,
      straightRunMarkers.connectedStraightLines,
    );
  }
  const smoothPath = buildOpenSmoothOpsBetweenConcavities(
    pathPoints,
    smoothAnchorPointSet,
    tolerance,
    maxError,
  );
  if (smoothPath) {
    const pathData = buildPathFromOps(smoothPath.ops, smoothPath.start, longStraightLineMinLength);
    const debugPoints = buildPathPointDebugPoints(pathPoints, concavityPointKeys);
    return createPathResult(pathData.commands.join(' '), mergeDebugPoints([...pathData.controlPoints, ...debugPoints]), pathData.longStraightLines, pathData.connectedStraightLines);
  }

  let cursor = pathPoints[0];
  const ops: PathOp[] = [];

  for (let index = 1; index < pathPoints.length; index += 1) {
    const previous = pathPoints[index - 1];
    const current = pathPoints[index];
    const next = pathPoints[Math.min(pathPoints.length - 1, index + 1)];

    if (index >= pathPoints.length - 1) {
      ops.push({ kind: 'line', start: cursor, end: current });
      cursor = current;
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
      ops.push({ kind: 'line', start: cursor, end: current });
      cursor = current;
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
    ops.push({ kind: 'line', start: cursor, end: entry });
    const kind = getControlPointKind(current, concavityPointKeys);
    ops.push({ kind: 'quad', start: entry, control: current, end: exit, controlKind: kind });
    cursor = exit;
  }

  const pathData = buildPathFromOps(ops, pathPoints[0], longStraightLineMinLength);
  controlPoints.push(...pathData.controlPoints);
  const debugPoints = buildPathPointDebugPoints(pathPoints, concavityPointKeys);
  return createPathResult(pathData.commands.join(' '), mergeDebugPoints([...controlPoints, ...debugPoints]), pathData.longStraightLines, pathData.connectedStraightLines);
}

function loopToPath(points: Point[], longStraightLineMinLength: number, outerCircle: Circle | null = null): SvgPathResult {
  const areaSign = Math.sign(signedArea(points)) || 1;
  if (outerCircle) {
    const run = findUpperCircleRun(points, outerCircle);
    if (run) {
      const beforeRun = (run.start - 1 + points.length) % points.length;
      const afterRun = (run.end + 1) % points.length;
      const rest = collectCyclicRange(points, afterRun, beforeRun);
      const restPath = roundedOpenPath(rest, longStraightLineMinLength, areaSign);
      const upperCircle = upperCircleArcWithVerticalConnectors(
        outerCircle,
        points[beforeRun].x <= points[afterRun].x,
        points[beforeRun].y,
        points[afterRun].y,
        longStraightLineMinLength,
      );
      const commands = [restPath.path, upperCircle.path];
      commands.push('Z');
      return createPathResult(
        commands.join(' '),
        mergeDebugPoints([...restPath.controlPoints, ...upperCircle.controlPoints]),
        [...restPath.longStraightLines, ...upperCircle.longStraightLines],
        [...restPath.connectedStraightLines, ...upperCircle.connectedStraightLines],
      );
    }
  }

  return roundedClosedPath(points, longStraightLineMinLength);
}

function circleToPath(circle: Circle): SvgPathResult {
  const top = { x: circle.centerX, y: circle.centerY - circle.radius };
  const right = { x: circle.centerX + circle.radius, y: circle.centerY };
  const bottom = { x: circle.centerX, y: circle.centerY + circle.radius };
  const left = { x: circle.centerX - circle.radius, y: circle.centerY };
  const controlPoints = [top, right, bottom, left].map((point) => ({ point, kind: 'normal' as const }));
  return createPathResult(
    [
      `M ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(right.x)} ${formatSvgNumber(right.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(bottom.x)} ${formatSvgNumber(bottom.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(left.x)} ${formatSvgNumber(left.y)}`,
      `A ${formatSvgNumber(circle.radius)} ${formatSvgNumber(circle.radius)} 0 0 1 ${formatSvgNumber(top.x)} ${formatSvgNumber(top.y)}`,
      'Z',
    ].join(' '),
    controlPoints,
  );
}

function rawBoundaryLoopsToPath(loops: Point[][], pathStyle?: SvgPathResult['pathStyle']): SvgPathResult {
  return createPathResult(boundaryLoopsToPathData(loops), [], [], [], pathStyle);
}

function boundaryLoopsToPathData(loops: Point[][]) {
  const commands = loops.flatMap((loop) => {
    if (loop.length === 0) return [];
    return [
      `M ${formatSvgNumber(loop[0].x)} ${formatSvgNumber(loop[0].y)}`,
      ...loop.slice(1).map(lineToCommand),
      'Z',
    ];
  });
  return commands.join(' ');
}

function buildServerCutPath(
  artwork: PngImage,
  holeMode: 'with-hole' | 'without-hole',
  generationOptions: AcrylicGenerationOptions,
): SvgPathResult {
  const baseMask = new Uint8Array(artwork.width * artwork.height);
  for (let index = 0; index < artwork.width * artwork.height; index += 1) {
    if (artwork.alpha[index] > 8) baseMask[index] = 1;
  }
  const bounds = findMaskBounds(baseMask, artwork.width, artwork.height);
  const metrics = getAcrylicMetrics(bounds.width, bounds.height, generationOptions.keychain);
  const filledBaseMask = fillEnclosedMaskHoles(baseMask, artwork.width, artwork.height);
  const internalGapCloseRadius = Math.max(1, Math.round(metrics.internalGapCloseRadius));
  const shouldDetectNarrowExitAreas = DEBUG_OUTPUT_NARROW_EXIT_AREA_MASK_PATH || DEBUG_OUTPUT_HOLE_FILL_TARGET_MASK_PATH || ENABLE_NARROW_EXIT_AREA_FILL;
  const narrowExitAreaMask = shouldDetectNarrowExitAreas
    ? detectNarrowExitTransparentAreas(
        filledBaseMask,
        artwork.width,
        artwork.height,
        internalGapCloseRadius,
      )
    : null;
  const narrowExitFillPatchMask = shouldDetectNarrowExitAreas
    ? buildNarrowExitFillPatchMask(filledBaseMask, narrowExitAreaMask, artwork.width, artwork.height, internalGapCloseRadius)
    : null;
  const narrowExitDebugPath =
    DEBUG_OUTPUT_NARROW_EXIT_AREA_MASK_PATH && narrowExitAreaMask && DEBUG_OUTPUT_PRE_SMOOTHING_PATH
      ? boundaryLoopsToPathData(maskToBoundaryLoops(narrowExitAreaMask, artwork.width, artwork.height))
      : '';
  if (DEBUG_OUTPUT_NARROW_EXIT_AREA_MASK_PATH && narrowExitAreaMask && !DEBUG_OUTPUT_PRE_SMOOTHING_PATH) {
    return rawBoundaryLoopsToPath(maskToBoundaryLoops(narrowExitAreaMask, artwork.width, artwork.height), {
      fill: DEBUG_HOLE_FILL_TARGET_FILL,
      stroke: DEBUG_HOLE_FILL_TARGET_STROKE,
      strokeWidth: 0.5,
    });
  }
  if (DEBUG_OUTPUT_HOLE_FILL_TARGET_MASK_PATH && narrowExitFillPatchMask) {
    return rawBoundaryLoopsToPath(maskToBoundaryLoops(narrowExitFillPatchMask, artwork.width, artwork.height), {
      fill: DEBUG_HOLE_FILL_TARGET_FILL,
      stroke: DEBUG_HOLE_FILL_TARGET_STROKE,
      strokeWidth: 0.5,
    });
  }
  const gapClosedBaseMask = ENABLE_NARROW_EXIT_AREA_FILL
    ? fillNarrowExitTransparentAreas(filledBaseMask, narrowExitFillPatchMask, artwork.width, artwork.height)
    : filledBaseMask;
  const keychainShape =
    holeMode === 'with-hole'
      ? addKeychainHoleToMask(
          gapClosedBaseMask,
          artwork.width,
          artwork.height,
          bounds.minX + bounds.width * generationOptions.keychain.holeCenterXRatio,
          bounds.width,
          bounds.height,
          { ...metrics, clearRadius: metrics.fixedHoleClearRadius },
          generationOptions.keychain,
        )
      : null;
  const keychainMask = keychainShape?.mask ?? gapClosedBaseMask;
  if (DEBUG_OUTPUT_RAW_BASE_MASK_PATH && !DEBUG_OUTPUT_HOLE_FILL_TARGET_MASK_PATH) {
    return rawBoundaryLoopsToPath(maskToBoundaryLoops(keychainMask, artwork.width, artwork.height));
  }
  const clearMask = keychainShape
    ? buildKeychainLayerMask(
        gapClosedBaseMask,
        keychainShape.mask,
        artwork.width,
        artwork.height,
        metrics.clearRadius,
        metrics.fixedHoleClearRadius,
      )
    : fillEnclosedMaskHoles(
        dilateMask(keychainMask, artwork.width, artwork.height, Math.max(1, Math.round(metrics.clearRadius))),
        artwork.width,
        artwork.height,
      );
  const hole = keychainShape ? { ...keychainShape.hole } : null;
  if (hole) paintCircleOnMask(clearMask, artwork.width, artwork.height, hole.centerX, hole.centerY, hole.radius, 0);

  const loops = maskToBoundaryLoops(clearMask, artwork.width, artwork.height);
  const longStraightLineMinLength = getLongStraightLineMinLength(artwork.width, artwork.height);
  const pathResults = (hole ? loops.filter((loop) => !isHoleLoop(loop, hole)) : loops).map((loop) =>
    loopToPath(loop, longStraightLineMinLength, keychainShape?.outerCircle ?? null),
  );
  if (hole) pathResults.push(circleToPath(hole));
  return {
    path: pathResults.map((result) => result.path).join(' '),
    controlPoints: pathResults.flatMap((result) => result.controlPoints),
    longStraightLines: pathResults.flatMap((result) => result.longStraightLines),
    connectedStraightLines: pathResults.flatMap((result) => result.connectedStraightLines),
    extraPaths: [
      ...(narrowExitDebugPath
        ? [
            {
              path: narrowExitDebugPath,
              fill: DEBUG_HOLE_FILL_TARGET_FILL,
              stroke: DEBUG_HOLE_FILL_TARGET_STROKE,
              strokeWidth: 0.5,
            },
          ]
        : []),
      ...pathResults.flatMap((result) => result.extraPaths ?? []),
    ],
  };
}

function buildControlPointMarkers(controlPoints: DebugPoint[]) {
  return controlPoints
    .map(
      ({ point, kind }) =>
        `<circle cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${CONTROL_POINT_RADIUS}" fill="${kind === 'green' ? GREEN_POINT_FILL : NORMAL_CONTROL_POINT_FILL}" stroke="#ffffff" stroke-width="${CONTROL_POINT_STROKE_WIDTH}" vector-effect="non-scaling-stroke"/>`,
    )
    .join('\n  ');
}

function buildLongStraightLineMarkers(lines: Array<{ start: Point; end: Point }>) {
  return mergeStraightLineMarkers(lines)
    .map(
      ({ start, end }) =>
        `<line x1="${formatSvgNumber(start.x)}" y1="${formatSvgNumber(start.y)}" x2="${formatSvgNumber(end.x)}" y2="${formatSvgNumber(end.y)}" stroke="${LONG_STRAIGHT_LINE_STROKE}" stroke-width="1.4" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    )
    .join('\n  ');
}

function buildConnectedStraightLineMarkers(lines: Array<{ start: Point; end: Point }>) {
  return lines
    .map(
      ({ start, end }) =>
        `<line x1="${formatSvgNumber(start.x)}" y1="${formatSvgNumber(start.y)}" x2="${formatSvgNumber(end.x)}" y2="${formatSvgNumber(end.y)}" stroke="${CONNECTED_STRAIGHT_LINE_STROKE}" stroke-width="1.8" stroke-linecap="round" vector-effect="non-scaling-stroke"/>`,
    )
    .join('\n  ');
}

function buildSvg(fileName: string, width: number, height: number, artworkDataUrl: string, cutPath: SvgPathResult) {
  const controlPointMarkers = SHOW_CONTROL_POINT_MARKERS ? buildControlPointMarkers(cutPath.controlPoints) : '';
  const longStraightLineMarkers = SHOW_LONG_STRAIGHT_LINE_MARKERS ? buildLongStraightLineMarkers(cutPath.longStraightLines) : '';
  const connectedStraightLineMarkers = SHOW_CONNECTED_STRAIGHT_LINE_MARKERS ? buildConnectedStraightLineMarkers(cutPath.connectedStraightLines) : '';
  const extraPaths = (cutPath.extraPaths ?? [])
    .map((path) => {
      const fill = path.fill ?? 'none';
      const stroke = path.stroke ?? 'none';
      const strokeWidth = path.strokeWidth ?? 1;
      return `<path d="${path.path}" fill="${escapeXml(fill)}" fill-rule="evenodd" stroke="${escapeXml(stroke)}" stroke-width="${formatSvgNumber(strokeWidth)}" vector-effect="non-scaling-stroke"/>`;
    })
    .join('\n  ');
  const pathFill = cutPath.pathStyle?.fill ?? 'rgba(179, 229, 252, 0.18)';
  const pathStroke = cutPath.pathStyle?.stroke ?? '#ff2f7d';
  const pathStrokeWidth = cutPath.pathStyle?.strokeWidth ?? 1;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(fileName)} acrylic keychain cut line">
  <title>${escapeXml(fileName)} acrylic keychain cut line</title>
  <image href="${escapeXml(artworkDataUrl)}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none"/>
  ${extraPaths}
  <path d="${cutPath.path}" fill="${escapeXml(pathFill)}" fill-rule="evenodd" stroke="${escapeXml(pathStroke)}" stroke-width="${formatSvgNumber(pathStrokeWidth)}" vector-effect="non-scaling-stroke"/>
  ${longStraightLineMarkers}
  ${connectedStraightLineMarkers}
  ${controlPointMarkers}
</svg>
`;
}

function buildCutPathOnlySvg(fileName: string, width: number, height: number, cutPath: SvgPathResult) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(fileName)} acrylic keychain cut line">
  <title>${escapeXml(fileName)} acrylic keychain cut line</title>
  <path d="${cutPath.path}" fill="none" fill-rule="evenodd" stroke="#ff2f7d" stroke-width="1" vector-effect="non-scaling-stroke"/>
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
    const artworkPng = parsePngDataUrl(body.artworkDataUrl);
    const artwork = decodePngAlpha(artworkPng);
    if (artwork.width !== body.width || artwork.height !== body.height) throw new Error('イラストPNGのサイズが不正です');
    const cutPath = buildServerCutPath(artwork, body.holeMode, resolveAcrylicGenerationOptions(body.generationOptions));
    const debug = body.debug === true;

    if (debug) {
      const svg = buildSvg(fileBaseName, body.width, body.height, body.artworkDataUrl, cutPath);
      return new NextResponse(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileBaseName}.svg"`,
          'Cache-Control': 'no-store',
        },
      });
    }

    const svg = buildCutPathOnlySvg(fileBaseName, body.width, body.height, cutPath);
    const zip = createZip([
      { name: `${fileBaseName}.svg`, data: Buffer.from(svg, 'utf8') },
      { name: `${fileBaseName}.png`, data: artworkPng },
    ]);

    return new NextResponse(zip, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${fileBaseName}.zip"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : '発注用ファイルを作成できませんでした', 500);
  }
}
