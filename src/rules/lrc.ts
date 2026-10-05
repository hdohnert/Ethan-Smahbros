// Left Right Center rounds. Pure. Every player starts with the same number of
// tickets from the bank; the last player with tickets at each table wins every
// ticket at that table. So a round costs players × tickets each, and each table
// pays its size × tickets each to one winner.

/** Splits players into tables of at most `size`, as even as possible (18 by 5 → 5, 5, 4, 4). */
export function makeTables(ids: readonly string[], size: number, random: () => number = Math.random): string[][] {
  const shuffled = [...ids];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const n = shuffled.length;
  if (n === 0) return [];
  const count = Math.ceil(n / Math.max(2, size));
  const tables: string[][] = Array.from({ length: count }, () => []);
  // Deal round-robin so table sizes differ by at most one.
  shuffled.forEach((id, i) => tables[i % count].push(id));
  return tables;
}

/** Tickets the bank must cover before a round can start. */
export const roundCost = (players: number, ticketsEach: number) => players * ticketsEach;

/** What the winner of a table takes home. */
export const tablePayout = (table: readonly string[], ticketsEach: number) => table.length * ticketsEach;
