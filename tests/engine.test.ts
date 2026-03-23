import { resolveMatch } from '../src/engine';
import { Team } from '../src/types';

describe('Tug of War Engine', () => {
  const teamStrong: Team = {
    id: 'Strong',
    players: [{ id: '1', strength: 100 }]
  };

  const teamWeak: Team = {
    id: 'Weak',
    players: [{ id: '2', strength: 10 }]
  };

  const teamEqual: Team = {
    id: 'Equal',
    players: [{ id: '3', strength: 100 }]
  };

  test('Stronger team wins', () => {
    const result = resolveMatch(teamStrong, teamWeak);
    expect(result.winnerId).toBe('Strong');
    expect(result.scoreA).toBe(100);
  });

  test('Equal teams draw', () => {
    const result = resolveMatch(teamStrong, teamEqual);
    expect(result.winnerId).toBeNull();
  });
});
