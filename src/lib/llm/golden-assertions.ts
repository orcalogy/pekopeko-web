export interface GoldenFieldExpectation<TValue = unknown> {
  value: TValue;
  mode?: 'equals' | 'includes';
}

export type GoldenExpectedObject = Record<string, unknown | GoldenFieldExpectation>;

export function collectGoldenExpectationFailures(
  actual: unknown,
  expected: GoldenExpectedObject,
  path = 'result',
): string[] {
  if (!actual || typeof actual !== 'object' || Array.isArray(actual)) {
    return [`${path} must be an object.`];
  }

  const failures: string[] = [];
  const actualRecord = actual as Record<string, unknown>;

  for (const [key, rawExpectation] of Object.entries(expected)) {
    if (rawExpectation === undefined) continue;

    const currentPath = `${path}.${key}`;
    const expectation = normalizeExpectation(rawExpectation);
    const actualValue = actualRecord[key];

    if (expectation.mode === 'includes') {
      if (!Array.isArray(actualValue)) {
        failures.push(`${currentPath} must be an array.`);
        continue;
      }

      for (const item of asArray(expectation.value)) {
        if (!actualValue.includes(item)) {
          failures.push(`${currentPath} must include ${JSON.stringify(item)}.`);
        }
      }
      continue;
    }

    if (isPlainObject(expectation.value)) {
      failures.push(
        ...collectGoldenExpectationFailures(actualValue, expectation.value, currentPath),
      );
      continue;
    }

    if (Array.isArray(expectation.value)) {
      if (!Array.isArray(actualValue)) {
        failures.push(`${currentPath} must be an array.`);
        continue;
      }

      for (const item of expectation.value) {
        if (!actualValue.includes(item)) {
          failures.push(`${currentPath} must include ${JSON.stringify(item)}.`);
        }
      }
      continue;
    }

    if (actualValue !== expectation.value) {
      failures.push(
        `${currentPath} expected ${JSON.stringify(expectation.value)} but got ${JSON.stringify(
          actualValue,
        )}.`,
      );
    }
  }

  return failures;
}

function normalizeExpectation(raw: unknown | GoldenFieldExpectation): GoldenFieldExpectation {
  if (isPlainObject(raw) && 'value' in raw) {
    return raw as unknown as GoldenFieldExpectation;
  }

  return { value: raw, mode: 'equals' };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [value];
}
