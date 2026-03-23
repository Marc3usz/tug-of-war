# Tug of War

A lightweight, deterministic engine for simulating Tug of War matches between two teams. The engine calculates the winner based on the aggregated strength of players in each team.

## Features
- **Deterministic Resolution**: Winners are decided by comparing the sum of player strengths.
- **TypeScript**: Written in strict TypeScript for type safety.
- **Zero Runtime Dependencies**: Core logic is dependency-free.

## Quickstart

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Run Tests**
   ```bash
   npm test
   ```

3. **Build**
   ```bash
   npm run build
   ```

## API Usage

```typescript
import { resolveMatch } from './src/engine';
import { Team, Player } from './src/types';

const teamA: Team = {
  id: 'A',
  players: [{ id: 'p1', strength: 10 }, { id: 'p2', strength: 15 }]
};

const teamB: Team = {
  id: 'B',
  players: [{ id: 'p3', strength: 20 }]
};

const result = resolveMatch(teamA, teamB);
console.log(result.winnerId); // 'A' (25 vs 20)
```