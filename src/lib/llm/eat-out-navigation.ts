import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import type { EatOutSemanticIntent } from '@/lib/llm/types';

export const EAT_OUT_LOCAL_INTENT_PARAM = 'localIntent';

const EAT_OUT_LOCAL_INTENT_STORAGE_PREFIX = 'pekopeko:eat-out-local-intent:';

export interface EatOutLocalIntentState {
  originalQuery?: string;
  intent?: EatOutSemanticIntent | null;
  createdAt: number;
}

export function saveEatOutLocalIntentState(
  state: Omit<EatOutLocalIntentState, 'createdAt'>,
): string | null {
  if (typeof window === 'undefined') return null;

  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

  const payload: EatOutLocalIntentState = {
    ...state,
    originalQuery: normalizeSearchQuery(state.originalQuery),
    createdAt: Date.now(),
  };

  try {
    window.sessionStorage.setItem(
      `${EAT_OUT_LOCAL_INTENT_STORAGE_PREFIX}${id}`,
      JSON.stringify(payload),
    );
    return id;
  } catch {
    return null;
  }
}

export function readEatOutLocalIntentState(id: string | null): EatOutLocalIntentState | null {
  if (!id || typeof window === 'undefined') return null;

  try {
    const raw = window.sessionStorage.getItem(`${EAT_OUT_LOCAL_INTENT_STORAGE_PREFIX}${id}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

    const record = parsed as Partial<EatOutLocalIntentState>;
    return {
      originalQuery:
        typeof record.originalQuery === 'string'
          ? normalizeSearchQuery(record.originalQuery)
          : undefined,
      intent: record.intent ?? null,
      createdAt: typeof record.createdAt === 'number' ? record.createdAt : 0,
    };
  } catch {
    return null;
  }
}

export function buildEatOutNavigationParams(params: {
  query?: string | null;
  intent?: EatOutSemanticIntent | null;
  random?: boolean;
  localOnly?: boolean;
  localIntentId?: string | null;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  const normalizedQuery = normalizeSearchQuery(params.query);
  const keyword = params.localOnly
    ? ''
    : (params.intent?.keyword ?? params.intent?.queryExpansion?.primaryKeyword ?? normalizedQuery);

  if (params.localIntentId) {
    searchParams.set(EAT_OUT_LOCAL_INTENT_PARAM, params.localIntentId);
  }

  if (keyword) {
    searchParams.set('keyword', keyword);
  }

  if (!params.localOnly && params.intent?.category) {
    searchParams.set('category', params.intent.category);
  }

  if (
    !params.localOnly &&
    (params.intent?.openNow || params.intent?.queryExpansion?.hardFilters?.includes('openNow'))
  ) {
    searchParams.set('openNow', 'true');
  }

  const providerQueries = params.intent?.queryExpansion?.providerQueries;
  if (!params.localOnly && providerQueries && Object.keys(providerQueries).length > 0) {
    searchParams.set('providerKeywords', JSON.stringify(providerQueries));
  }

  const softPreferences = [
    ...(params.intent?.softPreferences ?? []),
    ...(params.intent?.queryExpansion?.softPreferences ?? []),
  ];
  if (!params.localOnly && softPreferences.length > 0) {
    searchParams.set('softPreferences', [...new Set(softPreferences)].join(','));
  }

  const radiusM = params.intent?.spatialIntent?.radiusM;
  if (!params.localOnly && radiusM != null) {
    searchParams.set('radiusM', String(radiusM));
  }

  if (params.random) {
    searchParams.set('random', 'true');
  }

  return searchParams;
}
