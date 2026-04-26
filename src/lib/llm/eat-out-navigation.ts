import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import type { EatOutSemanticIntent } from '@/lib/llm/types';

export function buildEatOutNavigationParams(params: {
  query?: string | null;
  intent?: EatOutSemanticIntent | null;
  random?: boolean;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  const normalizedQuery = normalizeSearchQuery(params.query);
  const keyword =
    params.intent?.keyword ?? params.intent?.queryExpansion?.primaryKeyword ?? normalizedQuery;

  if (keyword) {
    searchParams.set('keyword', keyword);
  }

  if (params.intent?.category) {
    searchParams.set('category', params.intent.category);
  }

  if (params.intent?.openNow || params.intent?.queryExpansion?.hardFilters?.includes('openNow')) {
    searchParams.set('openNow', 'true');
  }

  const providerQueries = params.intent?.queryExpansion?.providerQueries;
  if (providerQueries && Object.keys(providerQueries).length > 0) {
    searchParams.set('providerKeywords', JSON.stringify(providerQueries));
  }

  const softPreferences = [
    ...(params.intent?.softPreferences ?? []),
    ...(params.intent?.queryExpansion?.softPreferences ?? []),
  ];
  if (softPreferences.length > 0) {
    searchParams.set('softPreferences', [...new Set(softPreferences)].join(','));
  }

  const radiusM = params.intent?.spatialIntent?.radiusM;
  if (radiusM != null) {
    searchParams.set('radiusM', String(radiusM));
  }

  if (params.random) {
    searchParams.set('random', 'true');
  }

  return searchParams;
}
