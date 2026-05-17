import React, { useState, useEffect, useRef } from 'react'
import { competitionsAPI, matchesAPI, resultsAPI, penaltiesAPI, authAPI, getToken, userTeamsAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { subscribeToCompetition, getSocket } from '../services/socket'
import { useIsMobile } from '../hooks/useIsMobile'

function MyCompetitions() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [competitions, setCompetitions] = useState([])
  const [selectedCompetition, setSelectedCompetition] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [matchSearchQuery, setMatchSearchQuery] = useState('')
  const [matchStatusFilter, setMatchStatusFilter] = useState('all')
  const [matchTimers, setMatchTimers] = useState({})
  const [timerTick, setTimerTick] = useState(0)
  const matchesRef = useRef(matches)
  const selectedCompetitionRef = useRef(selectedCompetition)

  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate('/login')
      return
    }
    
    loadMyCompetitions(true)
    
    const checkBackendConnection = async () => {
      try {
        const response = await fetch('http://localhost:8000/health')
        if (response.ok) {
          setIsConnected(true)
          setLastUpdate(new Date())
        } else {
          setIsConnected(false)
        }
      } catch (error) {
        setIsConnected(false)
      }
    }
    
    checkBackendConnection()
    const connectionCheckInterval = setInterval(checkBackendConnection, 5000)
    
    const socket = getSocket()
    const matchUpdateHandler = (data) => {
      console.log('Match updated via WebSocket:', data)
      if (selectedCompetitionRef.current?.id) {
        loadCompetitionDetails(selectedCompetitionRef.current.id, true)
      }
      loadCompetitions(false)
    }
    
    const competitionUpdateHandler = (data) => {
      console.log('Competition updated via WebSocket:', data)
      loadCompetitions(false)
      if (selectedCompetitionRef.current?.id === data.competition_id) {
        loadCompetitionDetails(data.competition_id, true)
      }
    }
    
    socket.on('match_updated', matchUpdateHandler)
    socket.on('competition_updated', competitionUpdateHandler)
    socket.on('result_updated', matchUpdateHandler)
    socket.on('penalty_created', matchUpdateHandler)
    socket.on('penalty_updated', matchUpdateHandler)
    socket.on('penalty_deleted', matchUpdateHandler)
    
    return () => {
      clearInterval(connectionCheckInterval)
      socket.off('match_updated', matchUpdateHandler)
      socket.off('competition_updated', competitionUpdateHandler)
      socket.off('result_updated', matchUpdateHandler)
      socket.off('penalty_created', matchUpdateHandler)
      socket.off('penalty_updated', matchUpdateHandler)
      socket.off('penalty_deleted', matchUpdateHandler)
    }
  }, [navigate])

  useEffect(() => {
    matchesRef.current = matches
    selectedCompetitionRef.current = selectedCompetition
  }, [matches, selectedCompetition])

  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimerTick(prev => prev + 1)
      
      setMatchTimers(prevTimers => {
        const currentMatches = matchesRef.current
        const updatedTimers = { ...prevTimers }
        
        currentMatches.forEach(match => {
          if (match.status === 'live' && match.current_time !== undefined && match.current_time !== null) {
            if (!updatedTimers[match.id]) {
              updatedTimers[match.id] = { value: match.current_time, lastUpdate: Date.now() }
            } else {
              const timeSinceLastUpdate = (Date.now() - updatedTimers[match.id].lastUpdate) / 1000
              updatedTimers[match.id] = {
                value: updatedTimers[match.id].value + timeSinceLastUpdate,
                lastUpdate: Date.now()
              }
            }
          } else if (match.status === 'paused' && match.current_time !== undefined && match.current_time !== null) {
            if (!updatedTimers[match.id]) {
              updatedTimers[match.id] = { value: match.current_time, lastUpdate: Date.now() }
            }
          }
        })
        
        return updatedTimers
      })
    }, 1000)
    
    return () => clearInterval(timerInterval)
  }, [])

  const loadMyCompetitions = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const myCompetitions = await userTeamsAPI.getMyCompetitions()
      setCompetitions(myCompetitions || [])
    } catch (err) {
      console.error('Error loading my competitions:', err)
      setCompetitions([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const loadCompetitionDetails = async (competitionId, showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const competition = await competitionsAPI.getById(competitionId)
      
      // Get user's teams
      const myTeams = await userTeamsAPI.getMyTeams()
      const userTeamIds = myTeams.map(t => t.id)
      
      // Filter matches where user's teams are involved
      const userMatches = (competition.matches || []).filter(match => 
        (match.team1_id && userTeamIds.includes(match.team1_id)) || 
        (match.team2_id && userTeamIds.includes(match.team2_id))
      )
      
      competition.matches = userMatches
      setSelectedCompetition(competition)
      setMatches(userMatches)
    } catch (err) {
      console.error('Error loading competition details:', err)
      setSelectedCompetition(null)
      setMatches([])
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  if (loading && competitions.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
        padding: '2rem', 
        textAlign: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '60px',
          height: '60px',
          border: '4px solid rgba(0, 255, 255, 0.3)',
          borderTop: '4px solid #00ffff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
      padding: isMobile ? '1rem' : '2rem',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        zIndex: 0,
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1600px', margin: '0 auto' }}>
        <div className="rc-mycomp-layout">
          <div className="rc-mycomp-left" style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            padding: '1.5rem',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)'
          }}>
            <h2 style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              color: '#00ffff',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
              letterSpacing: '1px',
              fontFamily: '"Orbitron", sans-serif'
            }}>
              MY COMPETITIONS
            </h2>
            
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Search competitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  outline: 'none'
                }}
              >
                <option value="all">All Status</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {competitions
                .filter(comp => {
                  const matchesSearch = !searchQuery || 
                    comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (comp.description && comp.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  const matchesStatus = statusFilter === 'all' || comp.status === statusFilter
                  return matchesSearch && matchesStatus
                })
                .map(competition => (
                  <div
                    key={competition.id}
                    onClick={() => loadCompetitionDetails(competition.id, true)}
                    style={{
                      padding: '1rem',
                      background: selectedCompetition?.id === competition.id
                        ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)'
                        : 'rgba(0, 255, 255, 0.05)',
                      border: selectedCompetition?.id === competition.id
                        ? '2px solid rgba(0, 255, 255, 0.6)'
                        : '1px solid rgba(0, 255, 255, 0.2)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.3s'
                    }}
                    onMouseEnter={(e) => {
                      if (selectedCompetition?.id !== competition.id) {
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                        e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.4)'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedCompetition?.id !== competition.id) {
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.05)'
                        e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.2)'
                      }
                    }}
                  >
                    <h3 style={{
                      margin: '0 0 0.5rem 0',
                      color: '#00ffff',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}>
                      {competition.name}
                    </h3>
                    {competition.description && (
                      <p style={{
                        margin: '0 0 0.5rem 0',
                        color: '#a0e0ff',
                        fontSize: '0.85rem'
                      }}>
                        {competition.description}
                      </p>
                    )}
                    {competition.start_date && (
                      <p style={{
                        margin: '0.25rem 0',
                        color: '#a0e0ff',
                        fontSize: '0.8rem'
                      }}>
                        Start: {new Date(competition.start_date).toLocaleString()}
                      </p>
                    )}
                    {competition.end_date && (
                      <p style={{
                        margin: '0.25rem 0',
                        color: '#a0e0ff',
                        fontSize: '0.8rem'
                      }}>
                        End: {new Date(competition.end_date).toLocaleString()}
                      </p>
                    )}
                    <span style={{
                      display: 'inline-block',
                      marginTop: '0.5rem',
                      padding: '0.25rem 0.75rem',
                      background: competition.status === 'ongoing' ? 'rgba(0, 255, 136, 0.2)' :
                                   competition.status === 'completed' ? 'rgba(0, 255, 255, 0.2)' :
                                   competition.status === 'cancelled' ? 'rgba(255, 68, 68, 0.2)' :
                                   'rgba(255, 170, 0, 0.2)',
                      color: competition.status === 'ongoing' ? '#00ff88' :
                             competition.status === 'completed' ? '#00ffff' :
                             competition.status === 'cancelled' ? '#ff4444' :
                             '#ffaa00',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}>
                      {competition.status}
                    </span>
                  </div>
                ))}
            </div>
          </div>
          
          <div className="rc-mycomp-right" style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            padding: '2rem',
            overflowY: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 40px rgba(0, 255, 255, 0.2)'
          }}>
            {selectedCompetition ? (
              <>
                <h2 style={{
                  marginTop: 0,
                  marginBottom: '1rem',
                  color: '#00ffff',
                  fontSize: '2rem',
                  fontWeight: 'bold',
                  textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
                  letterSpacing: '1px',
                  fontFamily: '"Orbitron", sans-serif'
                }}>
                  {selectedCompetition.name}
                </h2>
                
                <div style={{ marginBottom: '2rem' }}>
                  <input
                    type="text"
                    placeholder="Search matches..."
                    value={matchSearchQuery}
                    onChange={(e) => setMatchSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      marginBottom: '1rem'
                    }}
                  />
                  
                  <select
                    value={matchStatusFilter}
                    onChange={(e) => setMatchStatusFilter(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    <option value="all">All Status</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="live">Live</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {(selectedCompetition?.matches || matches)
                    .filter(match => {
                      if (match.competition_id) {
                        const competitionExists = competitions.some(comp => comp.id === match.competition_id)
                        if (!competitionExists) {
                          return false
                        }
                      }
                      
                      const matchesSearch = !matchSearchQuery || 
                        (match.match_name && match.match_name.toLowerCase().includes(matchSearchQuery.toLowerCase())) ||
                        (match.team1_name && match.team1_name.toLowerCase().includes(matchSearchQuery.toLowerCase())) ||
                        (match.team2_name && match.team2_name.toLowerCase().includes(matchSearchQuery.toLowerCase()))
                      const matchesStatus = matchStatusFilter === 'all' || match.status === matchStatusFilter
                      return matchesSearch && matchesStatus
                    })
                    .map((match, matchIndex) => {
                      const matchData = selectedCompetition?.matches?.find(m => m.id === match.id) || match
                      
                      if (!matchData) {
                        return null
                      }
                      
                      const team1Result = matchData.results && matchData.results.length > 0 ? matchData.results[0] : null
                      const team2Result = matchData.results && matchData.results.length > 1 ? matchData.results[1] : null
                      
                      const finalScore1 = team1Result ? 
                        (team1Result.score || 0) - 
                        (matchData.penalties?.filter(p => p.team_id === matchData.team1_id).reduce((sum, p) => sum + (p.points || 0), 0) || 0) +
                        ((team1Result.tasks_completed || 0) * 2) +
                        (team1Result.precision_points || 0) : 0
                      
                      const finalScore2 = team2Result ? 
                        (team2Result.score || 0) - 
                        (matchData.penalties?.filter(p => p.team_id === matchData.team2_id).reduce((sum, p) => sum + (p.points || 0), 0) || 0) +
                        ((team2Result.tasks_completed || 0) * 2) +
                        (team2Result.precision_points || 0) : 0
                      
                      return (
                        <div
                          key={match.id}
                          onClick={() => navigate(`/scoreboard/${match.id}`)}
                          style={{
                            padding: '1.5rem',
                            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            cursor: 'pointer',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                            e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.3)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '1rem'
                          }}>
                            <h3 style={{
                              margin: 0,
                              color: '#00ffff',
                              fontSize: '1.3rem',
                              fontWeight: 'bold'
                            }}>
                              {matchData.match_name || `${matchData.team1_name || 'Team 1'} vs ${matchData.team2_name || 'Team 2'}`}
                            </h3>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: matchData.status === 'live'
                                  ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.2) 0%, rgba(255, 200, 0, 0.2) 100%)'
                                  : matchData.status === 'completed'
                                  ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 204, 102, 0.2) 100%)'
                                  : matchData.status === 'paused'
                                  ? 'linear-gradient(135deg, rgba(108, 117, 125, 0.2) 0%, rgba(73, 80, 87, 0.2) 100%)'
                                  : 'linear-gradient(135deg, rgba(0, 153, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)',
                                border: matchData.status === 'live'
                                  ? '1px solid rgba(255, 170, 0, 0.5)'
                                  : matchData.status === 'completed'
                                  ? '1px solid rgba(0, 255, 136, 0.5)'
                                  : matchData.status === 'paused'
                                  ? '1px solid rgba(108, 117, 125, 0.5)'
                                  : '1px solid rgba(0, 153, 255, 0.5)',
                                borderRadius: '8px'
                              }}>
                                <span style={{
                                  color: matchData.status === 'live' ? '#ffaa00' 
                                    : matchData.status === 'completed' ? '#00ff88'
                                    : matchData.status === 'paused' ? '#a0e0ff'
                                    : '#0099ff',
                                  fontWeight: 'bold',
                                  fontSize: '0.85rem'
                                }}>
                                  {matchData.status === 'live' ? '🔴 LIVE' 
                                    : matchData.status === 'completed' ? '✅ COMPLETED'
                                    : matchData.status === 'paused' ? '⏸️ PAUSED'
                                    : '📅 SCHEDULED'}
                                </span>
                                {(matchData.status === 'live' || matchData.status === 'paused') && (matchData.current_time !== undefined && matchData.current_time !== null) && (
                                  <>
                                    <span style={{
                                      color: matchData.status === 'live' ? '#ffaa00' : '#a0e0ff',
                                      fontWeight: 'bold',
                                      fontSize: '1rem',
                                      fontFamily: '"Orbitron", sans-serif',
                                      textShadow: matchData.status === 'live' ? '0 0 10px rgba(255, 170, 0, 0.8)' : 'none',
                                      minWidth: '60px',
                                      textAlign: 'center'
                                    }}>
                                      {(() => {
                                        const _ = timerTick
                                        const localTimer = matchTimers[matchData.id]
                                        const elapsedSeconds = (localTimer?.value ?? matchData.current_time) || 0
                                        const minutes = Math.floor(elapsedSeconds / 60)
                                        const seconds = elapsedSeconds % 60
                                        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                                      })()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto 1fr',
                            gap: '1rem',
                            alignItems: 'center'
                          }}>
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                color: '#00ffff',
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                fontFamily: '"Orbitron", monospace'
                              }}>
                                {finalScore1}
                              </div>
                              <div style={{
                                color: '#a0e0ff',
                                fontSize: '1rem',
                                marginTop: '0.5rem'
                              }}>
                                {matchData.team1_name || 'Team 1'}
                              </div>
                            </div>
                            
                            <div style={{
                              color: '#00ffff',
                              fontSize: '1.5rem',
                              fontWeight: 'bold'
                            }}>
                              VS
                            </div>
                            
                            <div style={{ textAlign: 'center' }}>
                              <div style={{
                                color: '#00ffff',
                                fontSize: '2rem',
                                fontWeight: 'bold',
                                fontFamily: '"Orbitron", monospace'
                              }}>
                                {finalScore2}
                              </div>
                              <div style={{
                                color: '#a0e0ff',
                                fontSize: '1rem',
                                marginTop: '0.5rem'
                              }}>
                                {matchData.team2_name || 'Team 2'}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                color: '#a0e0ff',
                fontSize: '1.2rem',
                padding: '3rem'
              }}>
                Select a competition from the left panel to view your matches
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MyCompetitions

