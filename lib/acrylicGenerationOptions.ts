export type AcrylicKeychainGenerationOptions = {
  holeCenterXRatio: number;
  holeCenterYRatio: number | null;
  holeOuterRadius: number;
  holeInnerRadius: number;
  holeGap: number;
  paddingSpace: number;
};

export type AcrylicStandGenerationOptions = {
  baseWidthRatioPercent: number;
  baseHeightRatioPercent: number;
  baseMinHeight: number;
  baseDepthOffsetRatio: number;
  clawWidthRatio: number | null;
  clawCenterXRatio: number;
};

export type AcrylicGenerationOptions = {
  keychain: AcrylicKeychainGenerationOptions;
  stand: AcrylicStandGenerationOptions;
};

export const DEFAULT_ACRYLIC_GENERATION_OPTIONS: AcrylicGenerationOptions = {
  keychain: {
    holeCenterXRatio: 0.5,
    holeCenterYRatio: null,
    holeOuterRadius: 24,
    holeInnerRadius: 11,
    holeGap: 2,
    paddingSpace: 20,
  },
  stand: {
    baseWidthRatioPercent: 100,
    baseHeightRatioPercent: 22,
    baseMinHeight: 18,
    baseDepthOffsetRatio: 0.18,
    clawWidthRatio: null,
    clawCenterXRatio: 0.5,
  },
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumberOrDefault(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function nullableFiniteNumberOrDefault(value: unknown, fallback: number | null) {
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function resolveAcrylicGenerationOptions(value: unknown): AcrylicGenerationOptions {
  const root = isRecord(value) ? value : {};
  const keychain = isRecord(root.keychain) ? root.keychain : {};
  const stand = isRecord(root.stand) ? root.stand : {};
  const defaults = DEFAULT_ACRYLIC_GENERATION_OPTIONS;

  return {
    keychain: {
      holeCenterXRatio: clamp(finiteNumberOrDefault(keychain.holeCenterXRatio, defaults.keychain.holeCenterXRatio), 0, 1),
      holeCenterYRatio: nullableFiniteNumberOrDefault(keychain.holeCenterYRatio, defaults.keychain.holeCenterYRatio),
      holeOuterRadius: clamp(finiteNumberOrDefault(keychain.holeOuterRadius, defaults.keychain.holeOuterRadius), 1, 240),
      holeInnerRadius: clamp(finiteNumberOrDefault(keychain.holeInnerRadius, defaults.keychain.holeInnerRadius), 1, 240),
      holeGap: clamp(finiteNumberOrDefault(keychain.holeGap, defaults.keychain.holeGap), 0, 240),
      paddingSpace: clamp(finiteNumberOrDefault(keychain.paddingSpace, defaults.keychain.paddingSpace), 0, 480),
    },
    stand: {
      baseWidthRatioPercent: clamp(finiteNumberOrDefault(stand.baseWidthRatioPercent, defaults.stand.baseWidthRatioPercent), 1, 300),
      baseHeightRatioPercent: clamp(finiteNumberOrDefault(stand.baseHeightRatioPercent, defaults.stand.baseHeightRatioPercent), 1, 200),
      baseMinHeight: clamp(finiteNumberOrDefault(stand.baseMinHeight, defaults.stand.baseMinHeight), 1, 480),
      baseDepthOffsetRatio: clamp(finiteNumberOrDefault(stand.baseDepthOffsetRatio, defaults.stand.baseDepthOffsetRatio), 0, 2),
      clawWidthRatio: nullableFiniteNumberOrDefault(stand.clawWidthRatio, defaults.stand.clawWidthRatio),
      clawCenterXRatio: clamp(finiteNumberOrDefault(stand.clawCenterXRatio, defaults.stand.clawCenterXRatio), 0, 1),
    },
  };
}
