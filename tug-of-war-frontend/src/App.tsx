import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import './App.css'

interface Team {
  team_id: number
  team_name: string
  player_names: string[]
}

interface Matchup {
  start_at: number
  left_team: Team
  right_team: Team
}

interface GameState {
  state: 'in-game' | 'intermission' | 'loading'
  start_at?: number
}

const SOCKET_URL = 'http://localhost:3000' // dostosuj do swojego serwera

function App() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [userId, setUserId] = useState<number | null>(null)
  const [username, setUsername] = useState('')
  const [teams, setTeams] = useState<Team[]>([])
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null)
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [matchup, setMatchup] = useState<Matchup | null>(null)
  const [ropePosition, setRopePosition] = useState(0) // -1 do 1
  const [winner, setWinner] = useState<Team | null>(null)
  const [countdown, setCountdown] = useState<number | null>(null)

  // Połączenie z socket.io
  useEffect(() => {
    const newSocket = io(SOCKET_URL)
    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Obsługa eventów socket.io
  useEffect(() => {
    if (!socket) return

    socket.on('list_teams_res', (data: Team[]) => {
      setTeams(data)
    })

    socket.on('create_user_res', (data: number) => {
      setUserId(data)
    })

    socket.on('current_state_res', (data: GameState) => {
      setGameState(data)
    })

    socket.on('game_started', (data: Matchup) => {
      setMatchup(data)
      setWinner(null)
      setRopePosition(0)
      setGameState({ state: 'loading', start_at: data.start_at })
    })

    socket.on('game_state_update', (position: number) => {
      setRopePosition(position)
      setGameState({ state: 'in-game' })
    })

    socket.on('game_ended', (team: Team) => {
      setWinner(team)
      setMatchup(null)
      setGameState({ state: 'intermission' })
    })

    return () => {
      socket.off('list_teams_res')
      socket.off('create_user_res')
      socket.off('current_state_res')
      socket.off('game_started')
      socket.off('game_state_update')
      socket.off('game_ended')
    }
  }, [socket])

  // Countdown timer
  useEffect(() => {
    if (gameState?.state === 'loading' && gameState.start_at) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((gameState.start_at! - Date.now()) / 1000))
        setCountdown(remaining)
        if (remaining <= 0) {
          clearInterval(interval)
          setCountdown(null)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [gameState])

  // Pobierz listę drużyn po połączeniu
  useEffect(() => {
    if (socket && userId) {
      socket.emit('list_teams')
      socket.emit('current_state')
    }
  }, [socket, userId])

  const createUser = useCallback(() => {
    if (socket && username.trim()) {
      socket.emit('create_user', username.trim())
    }
  }, [socket, username])

  const joinTeam = useCallback((teamId: number) => {
    if (socket && userId) {
      socket.emit('join_team', userId, teamId)
      const team = teams.find(t => t.team_id === teamId)
      setCurrentTeam(team || null)
    }
  }, [socket, userId, teams])

  const doWork = useCallback(() => {
    if (socket && userId) {
      socket.emit('do_work', userId)
    }
  }, [socket, userId])

  const startGame = useCallback(() => {
    if (socket) {
      socket.emit('start_game')
    }
  }, [socket])

  const refreshTeams = useCallback(() => {
    if (socket) {
      socket.emit('list_teams')
    }
  }, [socket])

  // Ekran logowania
  if (userId === null) {
    return (
      <div>
        <h1>Tug of War</h1>
        <h2>Podaj nazwę użytkownika</h2>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Nazwa użytkownika"
          onKeyDown={(e) => e.key === 'Enter' && createUser()}
        />
        <button onClick={createUser}>Dołącz</button>
      </div>
    )
  }

  // Ekran wyboru drużyny
  if (currentTeam === null) {
    return (
      <div>
        <h1>Wybierz drużynę</h1>
        <button onClick={refreshTeams}>Odśwież listę</button>
        <div className="teams-list">
          {teams.map(team => (
            <div key={team.team_id} className="team-card">
              <h3>{team.team_name}</h3>
              <p>Gracze: {team.player_names.length > 0 ? team.player_names.join(', ') : 'Brak'}</p>
              <button onClick={() => joinTeam(team.team_id)}>Dołącz</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Ekran gry
  return (
    <div>
      <h1>Tug of War</h1>
      <p>Jesteś w drużynie: <strong>{currentTeam.team_name}</strong></p>

      {winner && (
        <div className="winner-banner">
          🏆 Wygrywa: {winner.team_name}!
        </div>
      )}

      {countdown !== null && countdown > 0 && (
        <div className="countdown">
          Gra rozpocznie się za: {countdown}s
        </div>
      )}

      {matchup && (
        <div className="matchup">
          <span>{matchup.left_team.team_name}</span>
          <span> vs </span>
          <span>{matchup.right_team.team_name}</span>
        </div>
      )}

      <div className="rope-container">
        <div className="rope-track">
          <div 
            className="rope-marker" 
            style={{ left: `${(ropePosition + 1) * 50}%` }}
          />
        </div>
        <div className="rope-labels">
          <span>← Lewa</span>
          <span>Prawa →</span>
        </div>
      </div>

      <div className="controls">
        <button 
          onClick={doWork} 
          disabled={gameState?.state !== 'in-game'}
          className="pull-button"
        >
          🪢 Ciągnij!
        </button>

        {gameState?.state === 'intermission' && (
          <button onClick={startGame} className="start-button">
            Rozpocznij grę
          </button>
        )}
      </div>

      <p className="status">
        Status: {gameState?.state === 'in-game' ? 'W grze' : 
                 gameState?.state === 'loading' ? 'Ładowanie...' : 'Przerwa'}
      </p>
    </div>
  )
}

export default App