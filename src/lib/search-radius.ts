const SEARCH_RADIUS_PRESETS_KM = [0.3, 0.5, 0.75, 1, 1.5, 2, 3, 4, 5, 6, 8, 10] as const;

export const SEARCH_RADIUS_MARK_PRESETS_KM = [0.3, 1, 2, 5, 10] as const;

function clampSearchRadiusIndex(index: number): number {
  return Math.max(0, Math.min(SEARCH_RADIUS_PRESETS_KM.length - 1, Math.round(index)));
}

function formatKmValue(km: number): string {
  return Number.isInteger(km) ? String(km) : km.toFixed(1).replace(/\.0$/, '');
}

export function getSearchRadiusKmForIndex(index: number): number {
  return SEARCH_RADIUS_PRESETS_KM[clampSearchRadiusIndex(index)];
}

export function getSearchRadiusPresetIndex(km: number): number {
  let bestIndex = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  SEARCH_RADIUS_PRESETS_KM.forEach((preset, index) => {
    const distance = Math.abs(preset - km);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });

  return bestIndex;
}

export function normalizeSearchRadiusKm(km: number): number {
  return getSearchRadiusKmForIndex(getSearchRadiusPresetIndex(km));
}

export function formatSearchRadius(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }

  return `${formatKmValue(km)} km`;
}

export function formatSearchRadiusMark(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  }

  return `${formatKmValue(km)}km`;
}

export function getSearchRadiusSliderMax(): number {
  return SEARCH_RADIUS_PRESETS_KM.length - 1;
}
