import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { currentPeriod, formatRelative, periodLabel, recentPeriods } from './format.ts';

describe('recentPeriods', () => {
  it('returns the requested number of months, newest first', () => {
    const periods = recentPeriods(6);
    assert.equal(periods.length, 6);
    assert.equal(periods[0], currentPeriod());
  });

  it('rolls back over a year boundary without producing month 0', () => {
    // Whatever today is, no period may have an out-of-range month.
    for (const period of recentPeriods(24)) {
      const parts = period.split('-');
      const month = Number(parts[1]);
      assert.ok(month >= 1 && month <= 12, `${period} has an impossible month`);
      assert.match(period, /^\d{4}-\d{2}$/);
    }
  });

  it('produces strictly descending, contiguous months', () => {
    const periods = recentPeriods(15);
    for (let i = 1; i < periods.length; i += 1) {
      const [py, pm] = periods[i - 1]!.split('-').map(Number);
      const [cy, cm] = periods[i]!.split('-').map(Number);
      const gap = (py! - cy!) * 12 + (pm! - cm!);
      assert.equal(gap, 1, `${periods[i]} does not immediately precede ${periods[i - 1]}`);
    }
  });
});

describe('currentPeriod', () => {
  it('is expressed in Montevideo time, matching what the API defaults to', () => {
    // The API computes month boundaries in America/Montevideo. If the browser used UTC
    // instead, on the 1st before 03:00 local the UI would request the wrong month.
    const expected = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Montevideo',
      year: 'numeric',
      month: '2-digit',
    })
      .format(new Date())
      .slice(0, 7);
    assert.equal(currentPeriod(), expected);
  });
});

describe('periodLabel', () => {
  it('renders a readable month', () => {
    assert.match(periodLabel('2026-09'), /2026/);
  });

  it('passes through anything it cannot parse rather than showing Invalid Date', () => {
    assert.equal(periodLabel('nonsense'), 'nonsense');
  });
});

describe('formatRelative', () => {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

  it('names the recent past', () => {
    assert.equal(formatRelative(daysAgo(0)), 'Hoy');
    assert.equal(formatRelative(daysAgo(1)), 'Ayer');
    assert.equal(formatRelative(daysAgo(5)), 'Hace 5 días');
  });

  it('switches to months and years as distance grows', () => {
    assert.match(formatRelative(daysAgo(60)), /meses/);
    assert.match(formatRelative(daysAgo(800)), /años/);
  });

  it('says never for a client who has never washed', () => {
    // The inactivity segment is built around these, so they must read clearly rather
    // than as a blank cell.
    assert.equal(formatRelative(null), 'Nunca');
    assert.equal(formatRelative(undefined), 'Nunca');
  });

  it('does not crash on a malformed date', () => {
    assert.equal(formatRelative('not-a-date'), 'Nunca');
  });
});
