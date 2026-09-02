import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const illustrationDir = path.join(rootDir, 'tests/acrylic/illustrations');
const baselineDir = path.join(rootDir, 'tests/acrylic/baseline');
const currentDir = path.join(rootDir, 'tests/acrylic/current');
const baseUrl = process.env.ACRYLIC_TEST_BASE_URL ?? 'http://127.0.0.1:3000';
const mode = process.argv[2];

const productCases = [
  { productMode: 'keychain', shapeMode: 'with-hole' },
  { productMode: 'keychain', shapeMode: 'without-hole' },
  { productMode: 'stand', shapeMode: 'simple' },
  { productMode: 'stand', shapeMode: 'stable' },
];

const exportCases = [
  { productMode: 'keychain', shapeMode: 'with-hole', holeMode: 'with-hole' },
  { productMode: 'keychain', shapeMode: 'without-hole', holeMode: 'without-hole' },
  { productMode: 'stand', shapeMode: 'simple' },
  { productMode: 'stand', shapeMode: 'stable' },
];

const defaultGenerationOptions = {
  keychain: {
    holeCenterXRatio: 0.5,
    holeCenterYRatio: null,
    holeOuterRadius: 24,
    holeInnerRadius: 11,
    holeGap: 2,
    clearRadius: 10,
    paddingSpace: 20,
  },
  stand: {
    baseWidthPx: null,
    baseHeightPx: 18,
    baseWidthRatioPercent: 100,
    baseHeightRatioPercent: 22,
    baseMinHeight: 18,
    baseDepthOffsetRatio: 0.18,
    clawWidthPx: null,
    clawWidthRatio: null,
    clawCenterXRatio: 0.5,
    clawLengthPx: 18,
    clawLengthRatio: null,
    clawCornerRadius: 2,
  },
};

function usage() {
  console.error('Usage: node scripts/acrylic-regression.mjs <baseline|compare|stand-claw-check>');
}

function hash(content) {
  return createHash('sha256').update(content).digest('hex');
}

function normalizeFileBaseName(fileName) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'acrylic-keychain';
}

function dataUrlFromPng(buffer) {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

function pngBufferFromDataUrl(dataUrl) {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) throw new Error('Unexpected PNG data URL in preview response.');
  return Buffer.from(match[1], 'base64');
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => [key, sortJsonValue(entryValue)]),
  );
}

function stableJson(value) {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

async function ensureDirs() {
  await fs.mkdir(illustrationDir, { recursive: true });
  await fs.mkdir(baselineDir, { recursive: true });
  await fs.mkdir(currentDir, { recursive: true });
}

async function clearArtifactDir(targetDir) {
  const entries = await fs.readdir(targetDir, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.name !== '.gitkeep' && entry.name !== '.gitignore')
      .map((entry) => fs.rm(path.join(targetDir, entry.name), { recursive: true, force: true })),
  );
}

async function listIllustrations() {
  const entries = await fs.readdir(illustrationDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function postJson(pathname, body) {
  let response;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    response = await fetch(`${baseUrl}${pathname}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok || response.status !== 404 || attempt === 3) break;
    await new Promise((resolve) => {
      setTimeout(resolve, 800);
    });
  }

  if (!response || !response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`${pathname} failed with ${response.status}${text ? `: ${text}` : ''}`);
  }

  return response;
}

async function buildArtifacts(fileName) {
  const source = await fs.readFile(path.join(illustrationDir, fileName));
  const imageDataUrl = dataUrlFromPng(source);
  const artifacts = [];
  const previewByCase = new Map();

  for (const testCase of productCases) {
    const response = await postJson('/api/acrylic/preview', {
      fileName,
      imageDataUrl,
      productMode: testCase.productMode,
      shapeMode: testCase.shapeMode,
      generationOptions: defaultGenerationOptions,
    });
    const preview = await response.json();
    previewByCase.set(`${testCase.productMode}:${testCase.shapeMode}`, preview);
    const content = stableJson(preview);
    const artifactDir = path.join(normalizeFileBaseName(fileName), `${testCase.productMode}-${testCase.shapeMode}`);
    artifacts.push({
      relativePath: `${artifactDir}.preview.json`,
      content,
    });
    for (const layerName of ['acrylicSrc', 'edgeSrc', 'sideSrc', 'artworkSrc', 'backSrc', 'highlightSrc']) {
      artifacts.push({
        relativePath: path.join(artifactDir, `${layerName.replace(/Src$/, '')}.png`),
        content: pngBufferFromDataUrl(preview[layerName]),
      });
    }
  }

  for (const testCase of exportCases) {
    const preview = previewByCase.get(`${testCase.productMode}:${testCase.shapeMode}`);
    if (!preview) throw new Error(`Missing preview artifact for ${testCase.productMode}:${testCase.shapeMode}`);
    const exportResponse = await postJson('/api/acrylic/export', {
      fileName: normalizeFileBaseName(fileName),
      width: preview.width,
      height: preview.height,
      artworkDataUrl: preview.originalArtworkSrc,
      productMode: testCase.productMode,
      holeMode: testCase.holeMode,
      shapeMode: testCase.shapeMode,
      debug: true,
      generationOptions: defaultGenerationOptions,
    });
    artifacts.push({
      relativePath: path.join(normalizeFileBaseName(fileName), `${testCase.productMode}-${testCase.shapeMode}.export.svg`),
      content: await exportResponse.text(),
    });
  }

  return artifacts;
}

function hashDataUrl(dataUrl) {
  return hash(pngBufferFromDataUrl(dataUrl));
}

function buildStandClawSummary(preview) {
  return {
    productMode: preview.productMode,
    shapeMode: preview.shapeMode,
    width: preview.width,
    height: preview.height,
    standBaseFrame: preview.standBaseFrame,
    acrylicHash: hashDataUrl(preview.acrylicSrc),
    edgeHash: hashDataUrl(preview.edgeSrc),
    sideHash: hashDataUrl(preview.sideSrc),
    standBaseHash: hashDataUrl(preview.standBaseSrc),
    standShapeGuideHash: preview.standShapeGuide ? hashDataUrl(preview.standShapeGuide.src) : null,
  };
}

function diffStandClawSummaries(reference, candidate) {
  const differences = [];
  for (const key of ['productMode', 'shapeMode', 'width', 'height', 'acrylicHash', 'edgeHash', 'sideHash', 'standBaseHash', 'standShapeGuideHash']) {
    if (reference[key] !== candidate[key]) differences.push(key);
  }
  if (stableJson(reference.standBaseFrame) !== stableJson(candidate.standBaseFrame)) {
    differences.push('standBaseFrame');
  }
  return differences;
}

async function buildStandClawCheckArtifacts(fileName) {
  const source = await fs.readFile(path.join(illustrationDir, fileName));
  const imageDataUrl = dataUrlFromPng(source);
  const clearRadiusCases = [4, 10, 30];
  const artifacts = [];
  const differences = [];

  for (const shapeMode of ['simple', 'stable']) {
    const summaries = [];
    for (const clearRadius of clearRadiusCases) {
      const generationOptions = {
        ...defaultGenerationOptions,
        keychain: {
          ...defaultGenerationOptions.keychain,
          clearRadius,
        },
      };
      const response = await postJson('/api/acrylic/preview', {
        fileName,
        imageDataUrl,
        productMode: 'stand',
        shapeMode,
        generationOptions,
      });
      const preview = await response.json();
      const summary = buildStandClawSummary(preview);
      summaries.push({ clearRadius, summary });

      const artifactDir = path.join(
        'stand-claw-check',
        normalizeFileBaseName(fileName),
        `stand-${shapeMode}`,
        `clear-${clearRadius}`,
      );
      artifacts.push({
        relativePath: path.join(artifactDir, 'summary.json'),
        content: stableJson({ fileName, shapeMode, clearRadius, ...summary }),
      });
      for (const layerName of ['acrylicSrc', 'edgeSrc', 'sideSrc', 'standBaseSrc']) {
        artifacts.push({
          relativePath: path.join(artifactDir, `${layerName.replace(/Src$/, '')}.png`),
          content: pngBufferFromDataUrl(preview[layerName]),
        });
      }
    }

    const reference = summaries.find((entry) => entry.clearRadius === 10);
    if (!reference) throw new Error(`Missing stand claw reference for ${fileName} ${shapeMode}`);
    for (const entry of summaries) {
      if (entry.clearRadius === reference.clearRadius) continue;
      const changedFields = diffStandClawSummaries(reference.summary, entry.summary);
      if (changedFields.length > 0) {
        differences.push({
          fileName,
          shapeMode,
          referenceClearRadius: reference.clearRadius,
          comparedClearRadius: entry.clearRadius,
          changedFields,
        });
      }
    }
  }

  return { artifacts, differences };
}

async function writeArtifacts(targetDir, artifacts) {
  for (const artifact of artifacts) {
    const outputPath = path.join(targetDir, artifact.relativePath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, artifact.content);
  }
}

async function compareArtifacts(artifacts) {
  const changed = [];
  const missing = [];

  for (const artifact of artifacts) {
    const baselinePath = path.join(baselineDir, artifact.relativePath);
    let baseline;
    try {
      baseline = await fs.readFile(baselinePath);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        missing.push(artifact.relativePath);
        continue;
      }
      throw error;
    }

    if (hash(baseline) !== hash(Buffer.isBuffer(artifact.content) ? artifact.content : Buffer.from(artifact.content))) {
      changed.push(artifact.relativePath);
    }
  }

  return { changed, missing };
}

async function main() {
  if (mode !== 'baseline' && mode !== 'compare' && mode !== 'stand-claw-check') {
    usage();
    process.exitCode = 1;
    return;
  }

  await ensureDirs();
  const illustrations = await listIllustrations();
  if (illustrations.length === 0) {
    console.log(`No PNG files found in ${path.relative(rootDir, illustrationDir)}.`);
    return;
  }

  if (mode === 'stand-claw-check') {
    const outputDir = path.join(currentDir, 'stand-claw-check');
    await fs.rm(outputDir, { recursive: true, force: true });
    const allArtifacts = [];
    const allDifferences = [];
    for (const fileName of illustrations) {
      console.log(`Checking stand claw shape for ${fileName}...`);
      const { artifacts, differences } = await buildStandClawCheckArtifacts(fileName);
      allArtifacts.push(...artifacts);
      allDifferences.push(...differences);
    }
    await writeArtifacts(currentDir, allArtifacts);
    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      stableJson({
        checkedAt: new Date().toISOString(),
        baseUrl,
        comparedKeychainClearRadii: [4, 10, 30],
        differences: allDifferences,
      }),
    );
    if (allDifferences.length === 0) {
      console.log(`No stand claw differences found. Saved review artifacts to ${path.relative(rootDir, outputDir)}.`);
      return;
    }
    console.log('Stand claw differences found:');
    for (const difference of allDifferences) {
      console.log(
        `- ${difference.fileName} / stand-${difference.shapeMode} / clearRadius ${difference.referenceClearRadius} vs ${difference.comparedClearRadius}: ${difference.changedFields.join(', ')}`,
      );
    }
    console.log(`Review artifacts were saved to ${path.relative(rootDir, outputDir)}.`);
    console.log('Differences are reported for human review; this script does not fail on diffs.');
    return;
  }

  const allArtifacts = [];
  for (const fileName of illustrations) {
    console.log(`Generating acrylic artifacts for ${fileName}...`);
    allArtifacts.push(...await buildArtifacts(fileName));
  }

  if (mode === 'baseline') {
    await clearArtifactDir(baselineDir);
    await writeArtifacts(baselineDir, allArtifacts);
    console.log(`Saved ${allArtifacts.length} baseline artifacts to ${path.relative(rootDir, baselineDir)}.`);
    return;
  }

  await clearArtifactDir(currentDir);
  await writeArtifacts(currentDir, allArtifacts);
  const { changed, missing } = await compareArtifacts(allArtifacts);
  if (changed.length === 0 && missing.length === 0) {
    console.log('No acrylic artifact differences found.');
    return;
  }

  if (changed.length > 0) {
    console.log('Acrylic artifact differences found:');
    changed.forEach((relativePath) => console.log(`- ${relativePath}`));
  }
  if (missing.length > 0) {
    console.log('Missing baseline artifacts:');
    missing.forEach((relativePath) => console.log(`- ${relativePath}`));
  }
  console.log('Differences are reported for human review; this script does not fail on diffs.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
