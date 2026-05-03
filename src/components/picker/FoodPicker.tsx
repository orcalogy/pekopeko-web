'use client';

import { Box, Text, useMantineTheme } from '@mantine/core';
import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { Food, Locale } from '@/types/food';

interface FoodPickerProps {
  candidates: Food[];
  locale: Locale;
  picking: boolean;
  onResult: (food: Food) => void;
  onPickEnd: () => void;
}

interface DisplayItem {
  food: Food;
  uid: string;
}

const ITEM_HEIGHT = 56;
const VISIBLE_ITEMS = 5; // odd number for center alignment
const CYCLE_DURATION = 2400; // ms for the main cycling phase
const SETTLE_DURATION = 800; // ms for the final deceleration

let uidCounter = 0;
function nextUid(): string {
  return `di-${++uidCounter}`;
}

export function FoodPicker({ candidates, locale, picking, onResult, onPickEnd }: FoodPickerProps) {
  const theme = useMantineTheme();
  const [displayItems, setDisplayItems] = useState<DisplayItem[]>([]);
  const [winnerIndex, setWinnerIndex] = useState(-1);
  const [phase, setPhase] = useState<'idle' | 'cycling' | 'settling' | 'done'>('idle');
  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Build a shuffled display list when candidates change
  useEffect(() => {
    if (candidates.length === 0) {
      setDisplayItems([]);
      setWinnerIndex(-1);
      setPhase('idle');
      return;
    }

    const shuffled = shuffleArray(candidates).slice(0, Math.min(candidates.length, 30));
    setDisplayItems(shuffled.map((food) => ({ food, uid: nextUid() })));
  }, [candidates]);

  // Start picking animation
  useEffect(() => {
    if (!picking || candidates.length === 0) return;

    // Choose winner
    const winner = candidates[Math.floor(Math.random() * candidates.length)];

    // Build cycling sequence: lots of random foods, then end with winner
    const sequence = buildCycleSequence(candidates, winner, 40);
    setDisplayItems(sequence.map((food) => ({ food, uid: nextUid() })));
    setWinnerIndex(-1);
    setPhase('cycling');

    let currentIdx = 0;
    const targetIdx = sequence.length - 1; // winner is the last item

    // Accelerate -> cruise -> decelerate stepping
    const startTime = performance.now();
    const totalDuration = CYCLE_DURATION + SETTLE_DURATION;

    const step = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / totalDuration, 1);

      // Map progress to step index using easing
      const easedProgress = settleEasing(progress);
      const stepIdx = Math.min(Math.floor(easedProgress * targetIdx), targetIdx);

      if (stepIdx !== currentIdx) {
        currentIdx = stepIdx;
        setWinnerIndex(currentIdx);

        // Haptic tick
        if (navigator.vibrate && progress < 0.85) {
          navigator.vibrate(6);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        setWinnerIndex(targetIdx);
        setPhase('done');
        onResult(winner);
        onPickEnd();
      }
    };

    requestAnimationFrame(step);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [picking, candidates, onResult, onPickEnd]);

  const centerIdx = winnerIndex >= 0 ? winnerIndex : 0;

  return (
    <Box
      w="100%"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: theme.radius.lg,
        border: `2px solid ${phase === 'done' ? theme.colors.orange[5] : 'var(--mantine-color-default-border)'}`,
        transition: 'border-color 0.3s ease',
        background: 'var(--mantine-color-body)',
      }}
    >
      {/* Reel window */}
      <Box
        style={{
          height: ITEM_HEIGHT * VISIBLE_ITEMS,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Center highlight bar */}
        <Box
          style={{
            position: 'absolute',
            top: ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
            left: 8,
            right: 8,
            height: ITEM_HEIGHT,
            borderRadius: theme.radius.md,
            background:
              phase === 'done'
                ? `${theme.colors.orange[5]}20`
                : 'var(--mantine-color-default-hover)',
            border:
              phase === 'done'
                ? `2px solid ${theme.colors.orange[5]}40`
                : '1px solid var(--mantine-color-default-border)',
            transition: 'all 0.3s ease',
            zIndex: 1,
          }}
        />

        {/* Scrolling items — z-index above highlight bar */}
        <motion.div
          style={{ position: 'relative', zIndex: 2 }}
          animate={{
            y: -(centerIdx * ITEM_HEIGHT) + ITEM_HEIGHT * Math.floor(VISIBLE_ITEMS / 2),
          }}
          transition={
            phase === 'cycling' || phase === 'settling'
              ? { type: 'spring', stiffness: 300, damping: 30 }
              : phase === 'done'
                ? { type: 'spring', stiffness: 200, damping: 20, bounce: 0.3 }
                : { duration: 0 }
          }
        >
          {displayItems.length === 0 ? (
            <Box
              style={{
                height: ITEM_HEIGHT * VISIBLE_ITEMS,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 16px',
              }}
            >
              <Text size="sm" c="dimmed" ta="center">
                {locale === 'zh-CN'
                  ? '没有匹配的候选'
                  : locale === 'ja'
                    ? '一致する候補がありません'
                    : 'No matching candidates'}
              </Text>
            </Box>
          ) : (
            displayItems.map(({ food, uid }, idx) => (
              <Box
                key={uid}
                style={{
                  height: ITEM_HEIGHT,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                }}
              >
                <Text
                  size="lg"
                  fw={idx === centerIdx && phase === 'done' ? 700 : 500}
                  ta="center"
                  style={{
                    color:
                      idx === centerIdx && phase === 'done' ? theme.colors.orange[5] : undefined,
                    transition: 'color 0.2s',
                  }}
                >
                  {food.name[locale]}
                </Text>
              </Box>
            ))
          )}
        </motion.div>
      </Box>

      {/* Candidate count */}
      <Box py={6} px="md" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
        <Text size="xs" c="dimmed" ta="center">
          {locale === 'zh-CN'
            ? `${candidates.length} 道候选菜品中随机`
            : locale === 'ja'
              ? `${candidates.length} 品の候補からランダム`
              : `Random from ${candidates.length} candidates`}
        </Text>
      </Box>
    </Box>
  );
}

/** Easing: fast start, long deceleration tail */
function settleEasing(t: number): number {
  if (t < 0.4) {
    // Fast linear-ish start
    return t * 1.8;
  }
  // Decelerate with quartic ease-out
  const t2 = (t - 0.4) / 0.6;
  return 0.72 + 0.28 * (1 - (1 - t2) ** 4);
}

function shuffleArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Build a sequence that cycles through random foods and ends on the winner */
function buildCycleSequence(candidates: Food[], winner: Food, length: number): Food[] {
  const pool = candidates.filter((f) => f.id !== winner.id);
  const sequence: Food[] = [];
  for (let i = 0; i < length - 1; i++) {
    sequence.push(pool[Math.floor(Math.random() * pool.length)] ?? winner);
  }
  sequence.push(winner); // last item is always the winner
  return sequence;
}
