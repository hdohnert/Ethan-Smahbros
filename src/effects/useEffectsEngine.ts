// Watches the board, turns changes into effects, and schedules them:
// quick ones (KO flash, ticket fly-ins, confetti) play at once; big moments
// (banners, countdown, final intro, champion) queue so they never overlap.

import { useEffect, useRef, useState } from 'react';
import type { BoardModel } from '../display/model';
import { EFFECTS } from './config';
import { burst, cannons } from './confetti';
import { detectEffects } from './detect';
import { play } from './sound';
import type { Effect } from './types';

export type Moment = Extract<
  Effect,
  { type: 'upset' | 'newKing' | 'firstWin' | 'streak' | 'challenger' | 'bracket' | 'seriesWon' | 'finalIntro' | 'jackpot' | 'champion' }
>;

export interface EffectsState {
  /** Player ids whose names flash K.O. right now. */
  flashing: Set<string>;
  /** Ticket fly-ins in progress: player id → { amount, key }. */
  tickets: Record<string, { amount: number; key: number }>;
  /** The big moment on screen now, with a unique key. */
  moment: { effect: Moment; key: number } | null;
  shake: boolean;
  /** Comic hype word popping over the stage. */
  hype: { word: string; key: number } | null;
  /** Ticket rain in progress (its key), or null. */
  shower: number | null;
}

const BIG = new Set(['upset', 'newKing', 'firstWin', 'streak', 'challenger', 'bracket', 'seriesWon', 'finalIntro', 'jackpot', 'champion']);

export function useEffectsEngine(model: BoardModel | null, active: boolean, reduced: boolean): EffectsState {
  const prev = useRef<BoardModel | null>(null);
  const queue = useRef<{ effect: Moment; key: number }[]>([]);
  const [flashing, setFlashing] = useState<Set<string>>(new Set());
  const [tickets, setTickets] = useState<EffectsState['tickets']>({});
  const [moment, setMoment] = useState<EffectsState['moment']>(null);
  const [shake, setShake] = useState(false);
  const [hype, setHype] = useState<EffectsState['hype']>(null);
  const [shower, setShower] = useState<number | null>(null);
  const busy = useRef(false);
  const seq = useRef(0);
  const sound = model?.settings.sound ?? false;

  const next = () => {
    const item = queue.current.shift();
    if (!item) {
      busy.current = false;
      setMoment(null);
      return;
    }
    busy.current = true;
    setMoment(item);
    const e = item.effect;
    if (e.type === 'newKing') {
      if (sound) play('newKing');
      if (!reduced) {
        setShake(true);
        window.setTimeout(() => setShake(false), 500);
      }
    }
    if (e.type === 'champion') {
      if (sound) play('champion');
      cannons(e.birthday);
      window.setTimeout(() => cannons(e.birthday), 1800);
      window.setTimeout(() => cannons(e.birthday), 4000);
    }
    if (e.type === 'upset') {
      if (sound) play('newKing');
      if (!reduced) {
        setShake(true);
        window.setTimeout(() => setShake(false), 700);
      }
    }
    if (e.type === 'seriesWon' || e.type === 'firstWin') burst({ count: 60, y: 0.5 });
    if (e.type === 'jackpot') burst({ gold: true, count: 120, y: 0.5 });
    if (e.type === 'bracket') [1200, 2400, 3600, 4800].forEach((t) => window.setTimeout(() => burst({ count: 40, y: 0.45 }), t));
    window.setTimeout(next, EFFECTS[e.type].ms);
  };

  useEffect(() => {
    if (!model) return;
    const before = prev.current;
    prev.current = model;
    if (!active) return;
    const fx = detectEffects(before, model).filter((e) => EFFECTS[e.type].enabled);
    if (!fx.length) return;

    for (const e of fx) {
      const key = ++seq.current;
      if (e.type === 'win') {
        setFlashing((s) => new Set(s).add(e.playerId));
        window.setTimeout(() => setFlashing((s) => {
          const n = new Set(s);
          n.delete(e.playerId);
          return n;
        }), EFFECTS.win.ms);
        burst({ gold: e.gold, count: e.gold ? 120 : 60, y: 0.35 });
        if (sound) play('ko');
      } else if (e.type === 'tickets') {
        setTickets((t) => ({ ...t, [e.playerId]: { amount: e.amount, key } }));
        window.setTimeout(() => setTickets((t) => {
          if (t[e.playerId]?.key !== key) return t;
          const n = { ...t };
          delete n[e.playerId];
          return n;
        }), EFFECTS.tickets.ms);
      } else if (e.type === 'hype') {
        setHype({ word: e.word, key });
        window.setTimeout(() => setHype((h) => (h?.key === key ? null : h)), EFFECTS.hype.ms);
      } else if (e.type === 'shower') {
        if (!reduced) {
          setShower(key);
          window.setTimeout(() => setShower((k) => (k === key ? null : k)), EFFECTS.shower.ms);
        }
      } else if (BIG.has(e.type)) {
        // A newer challenger call replaces one still waiting in line.
        if (e.type === 'challenger') queue.current = queue.current.filter((q) => q.effect.type !== 'challenger');
        queue.current.push({ effect: e as Moment, key });
      }
    }
    if (!busy.current) {
      // Let the KO flash land before the first banner.
      busy.current = true;
      window.setTimeout(next, fx.some((e) => e.type === 'win') ? 700 : 0);
    }
    // next() reads refs and stable setters only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, active]);

  return { flashing, tickets, moment, shake, hype, shower };
}
