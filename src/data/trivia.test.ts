import { describe, expect, it } from 'vitest';
import { DEFAULT_TRIVIA, withNewTrivia } from './trivia';

const first48 = DEFAULT_TRIVIA.slice(0, 48);

describe('withNewTrivia', () => {
  it('adds the new questions to a list saved before they existed', () => {
    const custom = { id: 'c1', cat: 'x', q: 'Mine?', a: 'Yes' };
    const out = withNewTrivia([...first48.slice(0, 10), custom]);
    expect(out).toHaveLength(11 + 60);
    expect(out[10]).toBe(custom);
  });

  it('leaves a list that already has new questions alone (deletions stay deleted)', () => {
    const list = [...first48, DEFAULT_TRIVIA[48]];
    expect(withNewTrivia(list)).toBe(list);
  });

  it('uses the defaults when nothing is saved', () => {
    expect(withNewTrivia(null)).toHaveLength(108);
  });
});
