const { Server } = require('socket.io');
const crypto = require('crypto');

const PORT = 3000;
const WORK_DELTA = 0.01;
const GAME_START_DELAY = 5000; // 5 seconds

// Repository for in-memory data storage
class GameRepository {
  constructor() {
    this.teams = new Map();
    this.users = new Map();
    this.gameState = 0; // -1 to 1 range
    this.currentMatchup = null; // { left_team, right_team, start_at }
    this.phase = 'intermission'; // 'intermission', 'loading', 'in-game'
    this.pendingTeamChanges = new Map(); // user_id -> team_id
    
    // Initialize hardcoded teams
    this.teams.set('apple', {
      team_id: 'apple',
      team_name: 'Apple',
      player_ids: []
    });
    this.teams.set('android', {
      team_id: 'android',
      team_name: 'Android',
      player_ids: []
    });
  }

  generateId() {
    return crypto.randomUUID();
  }

  createUser(username) {
    const userId = this.generateId();
    this.users.set(userId, {
      user_id: userId,
      username: username,
      team_id: null
    });
    return userId;
  }

  deleteUser(userId) {
    const user = this.users.get(userId);
    if (user && user.team_id) {
      this.leaveTeam(userId);
    }
    this.users.delete(userId);
    this.pendingTeamChanges.delete(userId);
  }

  getUser(userId) {
    return this.users.get(userId);
  }

  getAllTeams() {
    return Array.from(this.teams.values()).map(team => ({
      team_id: team.team_id,
      team_name: team.team_name,
      player_names: team.player_ids.map(id => {
        const user = this.users.get(id);
        return user ? user.username : '';
      }).filter(name => name)
    }));
  }

  getTeam(teamId) {
    return this.teams.get(teamId);
  }

  leaveTeam(userId) {
    const user = this.users.get(userId);
    if (user && user.team_id) {
      const team = this.teams.get(user.team_id);
      if (team) {
        team.player_ids = team.player_ids.filter(id => id !== userId);
      }
      user.team_id = null;
    }
  }

  joinTeam(userId, teamId) {
    const user = this.users.get(userId);
    const team = this.teams.get(teamId);
    
    // Ignore if team doesn't exist (suspicious client)
    if (!user || !team) {
      return;
    }

    // If game is in progress, queue the change
    if (this.phase === 'in-game' || this.phase === 'loading') {
      this.pendingTeamChanges.set(userId, teamId);
      return;
    }

    // Leave current team
    if (user.team_id) {
      this.leaveTeam(userId);
    }

    // Join new team
    user.team_id = teamId;
    team.player_ids.push(userId);
  }

  applyPendingTeamChanges() {
    for (const [userId, teamId] of this.pendingTeamChanges.entries()) {
      const user = this.users.get(userId);
      const team = this.teams.get(teamId);
      
      if (user && team) {
        // Leave current team
        if (user.team_id) {
          this.leaveTeam(userId);
        }
        
        // Join new team
        user.team_id = teamId;
        team.player_ids.push(userId);
      }
    }
    this.pendingTeamChanges.clear();
  }

  doWork(userId) {
    // Ignore work during intermission or loading
    if (this.phase !== 'in-game') {
      return null;
    }

    const user = this.users.get(userId);
    if (!user || !user.team_id || !this.currentMatchup) {
      return null;
    }

    // Determine delta based on team position
    let delta = 0;
    if (user.team_id === this.currentMatchup.left_team.team_id) {
      delta = -WORK_DELTA; // Pull left (towards -1)
    } else if (user.team_id === this.currentMatchup.right_team.team_id) {
      delta = WORK_DELTA; // Pull right (towards 1)
    }

    this.gameState += delta;
    
    // Clamp between -1 and 1
    this.gameState = Math.max(-1, Math.min(1, this.gameState));

    return this.gameState;
  }

  isGameOver() {
    return this.gameState <= -1 || this.gameState >= 1;
  }

  getWinningTeam() {
    if (this.gameState <= -1 && this.currentMatchup) {
      return this.currentMatchup.left_team;
    } else if (this.gameState >= 1 && this.currentMatchup) {
      return this.currentMatchup.right_team;
    }
    return null;
  }

  startGame() {
    if (this.phase !== 'intermission') {
      return null;
    }

    // Get all teams and shuffle
    const allTeams = Array.from(this.teams.values());
    const shuffled = allTeams.sort(() => Math.random() - 0.5);
    
    // Select top 2 teams
    const leftTeam = shuffled[0];
    const rightTeam = shuffled[1];

    const startAt = Date.now() + GAME_START_DELAY;

    this.currentMatchup = {
      start_at: startAt,
      left_team: {
        team_id: leftTeam.team_id,
        team_name: leftTeam.team_name,
        player_names: leftTeam.player_ids.map(id => {
          const user = this.users.get(id);
          return user ? user.username : '';
        }).filter(name => name)
      },
      right_team: {
        team_id: rightTeam.team_id,
        team_name: rightTeam.team_name,
        player_names: rightTeam.player_ids.map(id => {
          const user = this.users.get(id);
          return user ? user.username : '';
        }).filter(name => name)
      }
    };

    this.phase = 'loading';
    this.gameState = 0;

    // Schedule actual game start
    setTimeout(() => {
      if (this.phase === 'loading') {
        this.phase = 'in-game';
        io.emit('current_state_res', { state: 'in-game' });
      }
    }, GAME_START_DELAY);

    return this.currentMatchup;
  }

  endGame() {
    const winningTeam = this.getWinningTeam();
    this.phase = 'intermission';
    this.currentMatchup = null;
    this.gameState = 0;
    
    // Apply pending team changes
    this.applyPendingTeamChanges();

    return winningTeam;
  }

  getCurrentState() {
    if (this.phase === 'intermission') {
      return { state: 'intermission' };
    } else if (this.phase === 'loading' && this.currentMatchup) {
      return { state: 'loading', start_at: this.currentMatchup.start_at };
    } else if (this.phase === 'in-game') {
      return { state: 'in-game' };
    }
    return { state: 'intermission' };
  }
}

// Initialize server
const io = new Server(PORT, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  }
});
const repo = new GameRepository();

console.log(`Socket.IO server running on port ${PORT}`);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('list_teams', () => {
    const teams = repo.getAllTeams();
    socket.emit('list_teams_res', teams);
  });

  socket.on('create_user', (username) => {
    const userId = repo.createUser(username);
    socket.emit('create_user_res', userId);
  });

  socket.on('delete_user', (userId) => {
    repo.deleteUser(userId);
  });

  socket.on('join_team', (userId, teamId) => {
    repo.joinTeam(userId, teamId);
  });

  socket.on('do_work', (userId) => {
    const newState = repo.doWork(userId);
    
    if (newState !== null) {
      // Broadcast to all clients
      io.emit('game_state_update', newState);

      // Check if game ended
      if (repo.isGameOver()) {
        const winningTeam = repo.endGame();
        if (winningTeam) {
          io.emit('game_ended', winningTeam);
        }
      }
    }
  });

  socket.on('start_game', () => {
    const matchup = repo.startGame();
    if (matchup) {
      io.emit('game_started', matchup);
    }
  });

  socket.on('current_state', () => {
    const state = repo.getCurrentState();
    socket.emit('current_state_res', state);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});
