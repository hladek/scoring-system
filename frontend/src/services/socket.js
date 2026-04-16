import { io } from 'socket.io-client'

// WebSocket URL - uses window origin in production (Docker), localhost in dev
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:8000')

let socket = null

export const connectSocket = () => {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      timeout: 20000,
      forceNew: false
    })

    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id)
    })

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      if (reason === 'io server disconnect') {
        socket.connect()
      }
    })

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
    })

    socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts')
    })

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt', attemptNumber)
    })

    socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed')
    })

    socket.on('connected', (data) => {
      console.log('Server message:', data)
    })
  }
  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('WebSocket disconnected manually')
  }
}

export const getSocket = () => {
  if (!socket) {
    return connectSocket()
  }
  if (!socket.connected) {
    socket.connect()
  }
  return socket
}

// Subscribe to real-time updates for a specific competition
export const subscribeToCompetition = (competitionId, callback) => {
  const s = getSocket()
  s.emit('subscribe_competition', { competition_id: competitionId })
  
  const updateHandler = (data) => {
    if (data.competition_id === competitionId) {
      callback(data)
    }
  }
  
  const createHandler = (data) => {
    if (data.competition_id === competitionId) {
      callback(data)
    }
  }
  
  const deleteHandler = (data) => {
    if (data.competition_id === competitionId) {
      callback(data)
    }
  }
  
  s.on('competition_updated', updateHandler)
  s.on('competition_created', createHandler)
  s.on('competition_deleted', deleteHandler)
  
  return () => {
    s.off('competition_updated', updateHandler)
    s.off('competition_created', createHandler)
    s.off('competition_deleted', deleteHandler)
  }
}

// Subscribe to real-time updates for a specific match
export const subscribeToMatch = (matchId, callback) => {
  const s = getSocket()
  s.emit('subscribe_match', { match_id: matchId })
  
  const updateHandler = (data) => {
    if (data.match_id === matchId) {
      callback(data)
    }
  }
  
  const createHandler = (data) => {
    if (data.match_id === matchId) {
      callback(data)
    }
  }
  
  s.on('match_updated', updateHandler)
  s.on('match_created', createHandler)
  
  return () => {
    s.off('match_updated', updateHandler)
    s.off('match_created', createHandler)
  }
}

export const unsubscribeFromCompetition = (competitionId) => {
  const s = getSocket()
  s.off('competition_updated')
  s.off('competition_created')
  s.off('competition_deleted')
}

export const unsubscribeFromMatch = (matchId) => {
  const s = getSocket()
  s.off('match_updated')
  s.off('match_created')
}

