export interface RestaurantMatchable {
  name: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}

export interface RestaurantMatchEvaluation {
  accepted: boolean;
  score: number;
  distanceM: number;
  isContainmentPair: boolean;
  hasAddressConflict: boolean;
  hasPositiveAddressCorroboration: boolean;
  nameSimilarity: number;
}

export interface RestaurantMatchCandidate<T> extends RestaurantMatchable {
  value: T;
}

export interface RestaurantMatchSelection<T> {
  value: T;
  evaluation: RestaurantMatchEvaluation;
}

const EXACT_NAME_DISTANCE_M = 80;
const CONTAINMENT_DISTANCE_M = 20;
const STRONG_FUZZY_NAME_DISTANCE_M = 35;
const CLOSE_FUZZY_NAME_DISTANCE_M = 20;
const STRONG_FUZZY_NAME_SIMILARITY = 0.88;
const CLOSE_FUZZY_NAME_SIMILARITY = 0.8;

export function evaluateRestaurantMatch(
  left: RestaurantMatchable,
  right: RestaurantMatchable,
): RestaurantMatchEvaluation {
  const distanceM = haversineMeters(left.lat, left.lng, right.lat, right.lng);
  const leftName = normalizeRestaurantNameForMatch(left.name);
  const rightName = normalizeRestaurantNameForMatch(right.name);
  const { hasAddressConflict, hasPositiveAddressCorroboration } = buildAddressEvidence(
    left.address,
    right.address,
  );

  const shortestLength = Math.min(leftName.length, rightName.length);
  const isContainmentPair =
    shortestLength >= 6 && (leftName.includes(rightName) || rightName.includes(leftName));

  if (hasAddressConflict || !leftName || !rightName) {
    return {
      accepted: false,
      score: 0,
      distanceM,
      isContainmentPair,
      hasAddressConflict,
      hasPositiveAddressCorroboration,
      nameSimilarity: 0,
    };
  }

  if (leftName === rightName) {
    const accepted = distanceM <= EXACT_NAME_DISTANCE_M;
    return {
      accepted,
      score: accepted ? 1 - distanceM / 1000 : 0,
      distanceM,
      isContainmentPair,
      hasAddressConflict,
      hasPositiveAddressCorroboration,
      nameSimilarity: 1,
    };
  }

  if (isContainmentPair) {
    const accepted = hasPositiveAddressCorroboration && distanceM <= CONTAINMENT_DISTANCE_M;
    return {
      accepted,
      score: accepted ? 0.92 - distanceM / 1000 : 0,
      distanceM,
      isContainmentPair,
      hasAddressConflict,
      hasPositiveAddressCorroboration,
      nameSimilarity: 0,
    };
  }

  if (shortestLength < 5) {
    return {
      accepted: false,
      score: 0,
      distanceM,
      isContainmentPair,
      hasAddressConflict,
      hasPositiveAddressCorroboration,
      nameSimilarity: 0,
    };
  }

  const nameSimilarity = sorensenDiceSimilarity(leftName, rightName);

  if (nameSimilarity >= STRONG_FUZZY_NAME_SIMILARITY && distanceM <= STRONG_FUZZY_NAME_DISTANCE_M) {
    return {
      accepted: true,
      score: 0.78 + nameSimilarity * 0.1 - distanceM / 1000,
      distanceM,
      isContainmentPair,
      hasAddressConflict,
      hasPositiveAddressCorroboration,
      nameSimilarity,
    };
  }

  if (nameSimilarity >= CLOSE_FUZZY_NAME_SIMILARITY && distanceM <= CLOSE_FUZZY_NAME_DISTANCE_M) {
    return {
      accepted: true,
      score: 0.65 + nameSimilarity * 0.1 - distanceM / 1000,
      distanceM,
      isContainmentPair,
      hasAddressConflict,
      hasPositiveAddressCorroboration,
      nameSimilarity,
    };
  }

  return {
    accepted: false,
    score: 0,
    distanceM,
    isContainmentPair,
    hasAddressConflict,
    hasPositiveAddressCorroboration,
    nameSimilarity,
  };
}

export function selectBestRestaurantMatch<T>(
  target: RestaurantMatchable,
  candidates: RestaurantMatchCandidate<T>[],
): RestaurantMatchSelection<T> | null {
  let best: RestaurantMatchSelection<T> | null = null;

  for (const candidate of candidates) {
    const evaluation = evaluateRestaurantMatch(target, candidate);
    if (!evaluation.accepted) continue;

    if (
      !best ||
      evaluation.score > best.evaluation.score ||
      (evaluation.score === best.evaluation.score &&
        evaluation.distanceM < best.evaluation.distanceM)
    ) {
      best = {
        value: candidate.value,
        evaluation,
      };
    }
  }

  return best;
}

export function normalizeRestaurantNameForMatch(value: string): string {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

export function normalizeRestaurantAddressForMatch(value: string): string {
  return value.normalize('NFKC').toLowerCase().trim();
}

interface RestaurantAddressEvidence {
  hasAddressConflict: boolean;
  hasPositiveAddressCorroboration: boolean;
}

function buildAddressEvidence(
  leftAddress: string | null | undefined,
  rightAddress: string | null | undefined,
): RestaurantAddressEvidence {
  const left = normalizeRestaurantAddressForMatch(leftAddress ?? '');
  const right = normalizeRestaurantAddressForMatch(rightAddress ?? '');

  if (!left || !right) {
    return {
      hasAddressConflict: false,
      hasPositiveAddressCorroboration: false,
    };
  }

  const leftFloors = extractFloorMarkers(left);
  const rightFloors = extractFloorMarkers(right);
  const hasFloorConflict =
    leftFloors.length > 0 && rightFloors.length > 0 && !hasSharedToken(leftFloors, rightFloors);

  const leftPrimarySequence = extractPrimaryAddressNumberSequence(left);
  const rightPrimarySequence = extractPrimaryAddressNumberSequence(right);
  const hasPrimarySequenceMatch =
    leftPrimarySequence.length === 2 &&
    rightPrimarySequence.length === 2 &&
    leftPrimarySequence.every((value, index) => value === rightPrimarySequence[index]);
  const hasPrimarySequenceConflict =
    leftPrimarySequence.length === 2 &&
    rightPrimarySequence.length === 2 &&
    !hasPrimarySequenceMatch;

  return {
    hasAddressConflict: hasFloorConflict || hasPrimarySequenceConflict,
    hasPositiveAddressCorroboration: hasPrimarySequenceMatch,
  };
}

function extractFloorMarkers(address: string): string[] {
  const matches = address.matchAll(/(\d{1,2})(?:\s*)(f|階)/gu);
  return [...new Set(Array.from(matches, (match) => match[1]))];
}

function extractPrimaryAddressNumberSequence(address: string): string[] {
  const withoutPostalCode = stripPostalCode(address);
  return (withoutPostalCode.match(/\d+/g) ?? []).slice(0, 2);
}

function hasSharedToken(left: string[], right: string[]): boolean {
  const rightSet = new Set(right);
  return left.some((token) => rightSet.has(token));
}

function stripPostalCode(address: string): string {
  return address.replace(/〒?\s*\d{3}-\d{4}/gu, ' ');
}

function sorensenDiceSimilarity(left: string, right: string): number {
  if (left === right) {
    return 1;
  }

  if (left.length < 2 || right.length < 2) {
    return 0;
  }

  const leftBigrams = buildBigrams(left);
  const rightBigrams = buildBigrams(right);
  const rightCounts = new Map<string, number>();

  for (const bigram of rightBigrams) {
    rightCounts.set(bigram, (rightCounts.get(bigram) ?? 0) + 1);
  }

  let overlap = 0;

  for (const bigram of leftBigrams) {
    const count = rightCounts.get(bigram) ?? 0;
    if (count > 0) {
      overlap += 1;
      rightCounts.set(bigram, count - 1);
    }
  }

  return (2 * overlap) / (leftBigrams.length + rightBigrams.length);
}

function buildBigrams(value: string): string[] {
  const bigrams: string[] = [];

  for (let index = 0; index < value.length - 1; index += 1) {
    bigrams.push(value.slice(index, index + 2));
  }

  return bigrams;
}

function haversineMeters(
  lat1: number | null | undefined,
  lng1: number | null | undefined,
  lat2: number | null | undefined,
  lng2: number | null | undefined,
): number {
  if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
    return Number.POSITIVE_INFINITY;
  }

  if (
    !Number.isFinite(lat1) ||
    !Number.isFinite(lng1) ||
    !Number.isFinite(lat2) ||
    !Number.isFinite(lng2)
  ) {
    return Number.POSITIVE_INFINITY;
  }

  const radius = 6_371_000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;

  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
