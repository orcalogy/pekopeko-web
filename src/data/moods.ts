import type { Locale, Mood } from '@/types/food';

export interface MoodOption {
  id: Mood;
  emoji: string;
  label: Record<Locale, string>;
  color: string;
}

export const moods: MoodOption[] = [
  {
    id: 'happy',
    emoji: '\u{1F60A}',
    label: { 'zh-CN': '开心', ja: 'ハッピー', en: 'Happy' },
    color: 'yellow',
  },
  {
    id: 'sad',
    emoji: '\u{1F614}',
    label: { 'zh-CN': '低落', ja: '落ち込み', en: 'Down' },
    color: 'blue',
  },
  {
    id: 'tired',
    emoji: '\u{1F634}',
    label: { 'zh-CN': '疲惫', ja: '疲れた', en: 'Tired' },
    color: 'gray',
  },
  {
    id: 'stressed',
    emoji: '\u{1F624}',
    label: { 'zh-CN': '压力大', ja: 'ストレス', en: 'Stressed' },
    color: 'red',
  },
  {
    id: 'adventurous',
    emoji: '\u{1F929}',
    label: { 'zh-CN': '想冒险', ja: '冒険したい', en: 'Adventurous' },
    color: 'violet',
  },
  {
    id: 'comfort',
    emoji: '\u{1F970}',
    label: { 'zh-CN': '想治愈', ja: '癒されたい', en: 'Need Comfort' },
    color: 'pink',
  },
];
