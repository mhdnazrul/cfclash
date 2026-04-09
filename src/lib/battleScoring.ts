/**
 * Global battle points: ((P * 5) + (N * 10)) / T + rankBonus
 * rankBonus for P >= 10: 1st +10 ... 10th +1
 */
export function rankBonus(participantCount: number, place: number): number {
  if (participantCount < 10 || place < 1 || place > 10) return 0;
  return 11 - place;
}

export function baseBattlePoints(participantCount: number, problemCount: number, durationMinutes: number): number {
  const T = Math.max(1, durationMinutes);
  const P = Math.max(1, participantCount);
  const N = Math.max(1, problemCount);
  return (P * 5 + N * 10) / T;
}

export function totalPointsForPlace(
  participantCount: number,
  problemCount: number,
  durationMinutes: number,
  place: number,
): number {
  return baseBattlePoints(participantCount, problemCount, durationMinutes) + rankBonus(participantCount, place);
}

/** Build map userId -> integer points from ordered rank (best first). */
export function allocatePointsToRanks(
  orderedUserIds: string[],
  participantCount: number,
  problemCount: number,
  durationMinutes: number,
): Record<string, number> {
  const out: Record<string, number> = {};
  orderedUserIds.forEach((uid, i) => {
    const place = i + 1;
    out[uid] = Math.round(totalPointsForPlace(participantCount, problemCount, durationMinutes, place) * 100) / 100;
  });
  return out;
}

export interface IcpcRow {
  userId: string;
  handle: string;
  solved: number;
  penalty: number;
  lastAcSeconds?: number;
}

/** Sort ICPC: solved desc, penalty asc, lastAc asc */
export function sortIcpc(rows: IcpcRow[]): IcpcRow[] {
  return [...rows].sort((a, b) => {
    if (b.solved !== a.solved) return b.solved - a.solved;
    if (a.penalty !== b.penalty) return a.penalty - b.penalty;
    return (a.lastAcSeconds ?? 1e12) - (b.lastAcSeconds ?? 1e12);
  });
}
