import { describe, expect, it } from 'vitest';
import { DEFAULT_TRIVIA, withNewTrivia } from './trivia';

const byId = (id: string) => DEFAULT_TRIVIA.find((x) => x.id === id)!;
const first48 = DEFAULT_TRIVIA.slice(0, 48);
const v2 = DEFAULT_TRIVIA.filter((x) => +x.id.slice(1) >= 49 && +x.id.slice(1) < 109);
const v3 = DEFAULT_TRIVIA.filter((x) => +x.id.slice(1) >= 109);

describe('withNewTrivia', () => {
  it('adds every newer batch to a list saved before them', () => {
    const custom = { id: 'c1', cat: 'x', q: 'Mine?', a: 'Yes' };
    const out = withNewTrivia([...first48.slice(0, 10), custom]);
    expect(out).toHaveLength(11 + v2.length + v3.length);
    expect(out[10]).toBe(custom);
  });

  it('adds only the batch a list is missing (deletions in a batch it has stay deleted)', () => {
    const list = [...first48, byId('t49')];
    expect(withNewTrivia(list)).toEqual([...list, ...v3]);
  });

  it('leaves an up-to-date list alone', () => {
    const list = [...first48, byId('t49'), byId('t109')];
    expect(withNewTrivia(list)).toBe(list);
  });

  it('uses the defaults when nothing is saved', () => {
    expect(withNewTrivia(null)).toHaveLength(DEFAULT_TRIVIA.length);
    expect(DEFAULT_TRIVIA.length).toBeGreaterThan(200);
  });
});
