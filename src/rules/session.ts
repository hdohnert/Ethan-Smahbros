// The main-session clock: started when the first match starts, counts toward
// the "Main session length" setting. Pure, so Control and the TV agree.

export type ClockPhase = 'running' | 'last5' | 'over';

export interface Clock {
  elapsedMs: number;
  remainingMs: number;
  phase: ClockPhase;
}

export const LAST_MINUTES = 5;

export function sessionClock(startMs: number, minutes: number, now: number): Clock {
  const elapsedMs = Math.max(0, now - startMs);
  const remainingMs = Math.max(0, minutes * 60_000 - elapsedMs);
  const phase: ClockPhase = remainingMs <= 0 ? 'over' : remainingMs <= LAST_MINUTES * 60_000 ? 'last5' : 'running';
  return { elapsedMs, remainingMs, phase };
}

/** 4:05, or 1:02:09 past an hour. */
export function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}
