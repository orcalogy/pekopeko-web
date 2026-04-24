import { normalizeSearchQuery } from '@/lib/llm/keyword-fallback';
import type { EatOutSemanticIntent } from '@/lib/llm/types';

export function buildEatOutNavigationParams(params: {
  query?: string | null;
  intent?: EatOutSemanticIntent | null;
  random?: boolean;
}): URLSearchParams {
  const searchParams = new URLSearchParams();
  const normalizedQuery = normalizeSearchQuery(params.query);
  const keyword = params.intent?.keyword ?? normalizedQuery;

  if (keyword) {
    searchParams.set('keyword', keyword);
  }

  if (params.intent?.category) {
    searchParams.set('category', params.intent.category);
  }

  if (params.intent?.openNow) {
    searchParams.set('openNow', 'true');
  }

  if (params.random) {
    searchParams.set('random', 'true');
  }

  return searchParams;
}
