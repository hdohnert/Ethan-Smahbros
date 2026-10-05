import { describe, expect, it } from 'vitest';
import { makeTables, roundCost, tablePayout } from './lrc';

const kids = (n: number) => Array.from({ length: n }, (_, i) => `k${i}`);

describe('Left Right Center tables', () => {
  it('20 kids in tables of 5 → 4 tables of 5, each paying 15', () => {
    const t = makeTables(kids(20), 5);
    expect(t.map((x) => x.length)).toEqual([5, 5, 5, 5]);
    expect(t.map((x) => tablePayout(x, 3))).toEqual([15, 15, 15, 15]);
    expect(roundCost(20, 3)).toBe(60);
  });

  it('uneven counts split as evenly as possible', () => {
    expect(makeTables(kids(18), 5).map((x) => x.length)).toEqual([5, 5, 4, 4]);
    expect(makeTables(kids(7), 5).map((x) => x.length)).toEqual([4, 3]);
    expect(makeTables(kids(3), 5).map((x) => x.length)).toEqual([3]);
  });

  it('every kid sits at exactly one table, and payouts add up to the round cost', () => {
    const t = makeTables(kids(19), 5);
    expect(t.flat().sort()).toEqual(kids(19).sort());
    expect(t.reduce((n, x) => n + tablePayout(x, 3), 0)).toBe(roundCost(19, 3));
  });
});
