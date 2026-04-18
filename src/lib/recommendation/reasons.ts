import type { Locale } from '@/types/food';
import type { FeedbackKind, RecommendationReasonCode } from './types';

const reasonLabels: Record<RecommendationReasonCode, Record<Locale, string>> = {
  query_match: {
    'zh-CN': '符合当前搜索',
    ja: '今の条件に合う',
    en: 'Matches your search',
  },
  preferred_cuisine: {
    'zh-CN': '符合你常吃的类型',
    ja: 'よく選ぶ料理に近い',
    en: 'Fits your usual cuisine',
  },
  preferred_feature: {
    'zh-CN': '有你常选的条件',
    ja: 'よく重視する条件あり',
    en: 'Has features you often prefer',
  },
  budget_fit: {
    'zh-CN': '预算比较合适',
    ja: '予算感が近い',
    en: 'Fits your usual budget',
  },
  distance_fit: {
    'zh-CN': '距离合适',
    ja: '行きやすい距離',
    en: 'Good distance fit',
  },
  novel_pick: {
    'zh-CN': '适合换个新地方',
    ja: '少し新規開拓向き',
    en: 'A fresh option',
  },
  not_recently_visited: {
    'zh-CN': '不是最近刚去过',
    ja: '最近行っていない',
    en: 'Not visited recently',
  },
  popular_high_rating: {
    'zh-CN': '评分不错',
    ja: '評価が高め',
    en: 'Strong rating',
  },
  suppressed_due_to_feedback: {
    'zh-CN': '最近已标记暂不考虑',
    ja: '最近見送りにした',
    en: 'Recently hidden',
  },
};

const feedbackLabels: Record<FeedbackKind, Record<Locale, string>> = {
  liked_after_visit: {
    'zh-CN': '喜欢',
    ja: '気に入った',
    en: 'Liked',
  },
  disliked_after_visit: {
    'zh-CN': '不太喜欢',
    ja: '合わなかった',
    en: 'Disliked',
  },
  not_interested: {
    'zh-CN': '暂不考虑',
    ja: '今回は見送り',
    en: 'Not interested',
  },
};

export function localizeRecommendationReason(
  code: RecommendationReasonCode,
  locale: Locale,
): string {
  return reasonLabels[code][locale];
}

export function localizeFeedbackKind(kind: FeedbackKind, locale: Locale): string {
  return feedbackLabels[kind][locale];
}
