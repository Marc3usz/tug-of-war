import { Team, MatchResult } from './types';

export function calculateTeamStrength(team: Team): number {
  return team.players.reduce((sum, player) => sum + player.strength, 0);
}

export function resolveMatch(teamA: Team, teamB: Team): MatchResult {
  const scoreA = calculateTeamStrength(teamA);
  const scoreB = calculateTeamStrength(teamB);
  
  let winnerId: string | null = null;
  
  if (scoreA > scoreB) {
    winnerId = teamA.id;
  } else if (scoreB > scoreA) {
    winnerId = teamB.id;
  }

  return {
    winnerId,
    scoreA,
    scoreB,
    log: [
      `Match Start: ${teamA.id} vs ${teamB.id}`,
      `Team ${teamA.id} Strength: ${scoreA}`,
      `Team ${teamB.id} Strength: ${scoreB}`,
      winnerId ? `Winner: ${winnerId}` : 'Result: Draw'
    ]
  };
}
