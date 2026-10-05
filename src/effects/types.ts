// Every on-screen effect, keyed by what happened. Display detects these by
// comparing the previous and next board, then plays them.

export type Effect =
  | { type: 'win'; playerId: string; gold: boolean }
  | { type: 'tickets'; playerId: string; amount: number }
  | { type: 'hype'; word: string }
  | { type: 'shower'; amount: number }
  | { type: 'upset'; playerId: string; kingId: string; streak: number }
  | { type: 'newKing'; playerId: string }
  | { type: 'firstWin'; playerId: string }
  | { type: 'streak'; playerId: string; streak: number }
  | { type: 'challenger'; playerIds: string[]; kingId: string | null }
  | { type: 'bracket'; seeds: string[] }
  | { type: 'seriesWon'; playerId: string; toFinal: boolean }
  | { type: 'finalIntro'; a: string; b: string }
  | { type: 'jackpot'; playerId: string; amount: number }
  | { type: 'champion'; playerId: string; birthday: boolean };

export type EffectType = Effect['type'];
