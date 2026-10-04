// Every on-screen effect, keyed by what happened. Display detects these by
// comparing the previous and next board, then plays them.

export type Effect =
  | { type: 'win'; playerId: string; gold: boolean }
  | { type: 'tickets'; playerId: string; amount: number }
  | { type: 'newKing'; playerId: string }
  | { type: 'challenger'; playerId: string }
  | { type: 'bracket' }
  | { type: 'seriesWon'; playerId: string; toFinal: boolean }
  | { type: 'finalIntro'; a: string; b: string }
  | { type: 'champion'; playerId: string; birthday: boolean };

export type EffectType = Effect['type'];
