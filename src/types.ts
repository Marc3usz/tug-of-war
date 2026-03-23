export interface Player {
  id: string;
  strength: number;
}

export interface Team {
  id: string;
  players: Player[];
}

export interface MatchResult {
  winnerId: string | null; // null represents a draw
  scoreA: number;
  scoreB: number;
  log: string[];
}
