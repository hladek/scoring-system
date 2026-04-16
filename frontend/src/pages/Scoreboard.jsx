import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesAPI, resultsAPI, penaltiesAPI } from '../services/api'

function Scoreboard() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [match, setMatch] = useState(null)
  const [results, setResults] = useState([])
  const [penalties, setPenalties] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(null)
  const [viewMode, setViewMode] = useState('stage') // 'stage' or 'scheduled'
  const timerIntervalRef = useRef(null)

  useEffect(() => {
    if (matchId) {
      loadMatchData()
      // Auto-refresh every 500ms for live updates
      const refreshInterval = setInterval(() => {
        loadMatchData()
      }, 500)
      
      return () => {
        clearInterval(refreshInterval)
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
        }
      }
    }
  }, [matchId])

  // Timer countdown for live matches
  useEffect(() => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }

    if (match && match.status === 'live' && match.current_time !== null && match.current_time !== undefined) {
      setCurrentTime(match.current_time)
      
      timerIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev !== null && prev !== undefined) {
            const newTime = prev + 1
            // Check if we've reached the duration
            if (match.duration_minutes > 0 && newTime >= match.duration_minutes * 60) {
              return match.duration_minutes * 60
            }
            return newTime
          }
          return prev
        })
      }, 1000)
    } else if (match && match.status === 'paused' && match.current_time !== null && match.current_time !== undefined) {
      setCurrentTime(match.current_time)
    } else {
      setCurrentTime(match?.current_time || null)
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
    }
  }, [match?.status, match?.current_time, match?.duration_minutes])

  const loadMatchData = async () => {
    try {
      const [matchData, resultsData, penaltiesData] = await Promise.all([
        matchesAPI.getById(matchId),
        resultsAPI.getAll(matchId),
        penaltiesAPI.getAll(matchId)
      ])
      
      setMatch(matchData)
      setResults(resultsData || [])
      setPenalties(penaltiesData || [])
      
      // Sync timer with server time
      if (matchData && (matchData.status === 'live' || matchData.status === 'paused') && matchData.current_time !== null && matchData.current_time !== undefined) {
        setCurrentTime(matchData.current_time)
      }
    } catch (err) {
      console.error('Error loading match data:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const calculateFinalScore = (teamResult, teamId, allPenalties) => {
    if (!teamResult) return 0
    const rawScore = Number(teamResult.score) || 0
    const teamPenalties = allPenalties.filter(p => p.team_id === teamId) || []
    const totalPenaltyPoints = teamPenalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
    const tasksPoints = (teamResult.tasks_completed || 0) * 2
    const precisionPoints = (teamResult.precision_points || 0) * 1
    return rawScore - totalPenaltyPoints + tasksPoints + precisionPoints
  }

  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
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
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading scoreboard...</p>
      </div>
    )
  }

  if (!match) {
    return (
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <p style={{ color: '#ff6b6b', fontSize: '1.5rem' }}>Match not found</p>
      </div>
    )
  }

  // Calculate final scores - ensure we have match and results before calculating
  const team1Result = match && results.length > 0 ? (results.find(r => r.team_id === match.team1_id) || results[0]) : null
  const team2Result = match && results.length > 0 ? (results.find(r => r.team_id === match.team2_id) || results[1]) : null
  
  const finalScore1 = match && team1Result ? calculateFinalScore(team1Result, match.team1_id, penalties) : 0
  const finalScore2 = match && team2Result ? calculateFinalScore(team2Result, match.team2_id, penalties) : 0
  

  const team1Penalties = penalties.filter(p => p.team_id === match.team1_id) || []
  const team2Penalties = penalties.filter(p => p.team_id === match.team2_id) || []
  const team1TotalPenaltyPoints = team1Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
  const team2TotalPenaltyPoints = team2Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)

  return (
    <div style={{ 
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
      padding: '3rem',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background Grid */}
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

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1800px', margin: '0 auto' }}>
        {/* Back Button */}
        <div style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'flex-start'
        }}>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '1rem 2rem',
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(108, 117, 125, 0.4), 0 0 20px rgba(108, 117, 125, 0.2)',
              transition: 'all 0.3s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.6), 0 0 30px rgba(108, 117, 125, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 4px 15px rgba(108, 117, 125, 0.4), 0 0 20px rgba(108, 117, 125, 0.2)'
            }}
          >
            ← Back
          </button>
        </div>

        {/* Header - Match Name */}
        <div style={{
          textAlign: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{
            margin: '0 0 2rem 0',
            color: '#00ffff',
            fontSize: '4rem',
            fontWeight: 'bold',
            textShadow: '0 0 40px rgba(0, 255, 255, 1), 0 0 80px rgba(0, 255, 255, 0.6)',
            letterSpacing: '4px',
            fontFamily: '"Orbitron", "Arial Black", sans-serif'
          }}>
            {match.match_name || 'MATCH'}
          </h1>

          {/* Match Status and Timer */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '2rem',
            marginBottom: '2rem',
            flexWrap: 'wrap'
          }}>
            <div style={{
              padding: '1rem 2rem',
              background: match.status === 'live'
                ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.2) 0%, rgba(255, 200, 0, 0.2) 100%)'
                : match.status === 'completed'
                ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.2) 0%, rgba(0, 204, 102, 0.2) 100%)'
                : match.status === 'paused'
                ? 'linear-gradient(135deg, rgba(108, 117, 125, 0.2) 0%, rgba(73, 80, 87, 0.2) 100%)'
                : 'linear-gradient(135deg, rgba(0, 153, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)',
              border: match.status === 'live'
                ? '2px solid rgba(255, 170, 0, 0.6)'
                : match.status === 'completed'
                ? '2px solid rgba(0, 255, 136, 0.6)'
                : match.status === 'paused'
                ? '2px solid rgba(108, 117, 125, 0.6)'
                : '2px solid rgba(0, 153, 255, 0.6)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              boxShadow: match.status === 'live'
                ? '0 0 30px rgba(255, 170, 0, 0.5)'
                : match.status === 'completed'
                ? '0 0 30px rgba(0, 255, 136, 0.5)'
                : match.status === 'paused'
                ? '0 0 30px rgba(108, 117, 125, 0.3)'
                : '0 0 30px rgba(0, 153, 255, 0.3)'
            }}>
              <span style={{
                color: match.status === 'live' ? '#ffaa00' 
                  : match.status === 'completed' ? '#00ff88'
                  : match.status === 'paused' ? '#a0e0ff'
                  : '#0099ff',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                textTransform: 'uppercase',
                letterSpacing: '2px'
              }}>
                {match.status === 'live' ? '🔴 LIVE' 
                  : match.status === 'completed' ? '✅ COMPLETED'
                  : match.status === 'paused' ? '⏸️ PAUSED'
                  : '📅 SCHEDULED'}
              </span>
              {(match.status === 'live' || match.status === 'paused') && match.current_time !== null && match.current_time !== undefined && match.duration_minutes > 0 && (
                <>
                  <div style={{
                    color: match.status === 'live' ? '#ffaa00' : '#a0e0ff',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    fontFamily: '"Orbitron", monospace',
                    textShadow: match.status === 'live' 
                      ? '0 0 20px rgba(255, 170, 0, 0.8), 0 0 40px rgba(255, 170, 0, 0.4)'
                      : '0 0 20px rgba(108, 117, 125, 0.8), 0 0 40px rgba(108, 117, 125, 0.4)',
                    letterSpacing: '3px',
                    minWidth: '120px',
                    textAlign: 'center'
                  }}>
                    {(() => {
                      const elapsedSeconds = currentTime || match.current_time || 0
                      const totalDurationSeconds = match.duration_minutes * 60
                      const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds)
                      const minutes = Math.floor(remainingSeconds / 60)
                      const secs = remainingSeconds % 60
                      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
                    })()}
                  </div>
                  <span style={{
                    color: '#6b9bc2',
                    fontSize: '1rem',
                    fontWeight: '500'
                  }}>
                    / {match.duration_minutes}:00
                  </span>
                </>
              )}
            </div>
          </div>

          {/* View Mode Buttons */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <button
              onClick={() => setViewMode('stage')}
              style={{
                padding: '1rem 2rem',
                background: viewMode === 'stage' 
                  ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.3) 0%, rgba(0, 200, 255, 0.3) 100%)'
                  : 'rgba(0, 153, 255, 0.2)',
                border: viewMode === 'stage'
                  ? '2px solid rgba(0, 255, 255, 0.8)'
                  : '2px solid rgba(0, 153, 255, 0.4)',
                borderRadius: '12px',
                color: '#00ffff',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                textShadow: viewMode === 'stage' ? '0 0 20px rgba(0, 255, 255, 0.8)' : 'none',
                boxShadow: viewMode === 'stage' 
                  ? '0 0 30px rgba(0, 255, 255, 0.6), inset 0 0 20px rgba(0, 255, 255, 0.2)'
                  : '0 0 10px rgba(0, 153, 255, 0.3)',
                transition: 'all 0.3s'
              }}
            >
              🏆 STAGE
            </button>
            <button
              onClick={() => setViewMode('scheduled')}
              style={{
                padding: '1rem 2rem',
                background: viewMode === 'scheduled' 
                  ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.3) 0%, rgba(0, 200, 255, 0.3) 100%)'
                  : 'rgba(0, 153, 255, 0.2)',
                border: viewMode === 'scheduled'
                  ? '2px solid rgba(0, 255, 255, 0.8)'
                  : '2px solid rgba(0, 153, 255, 0.4)',
                borderRadius: '12px',
                color: '#00ffff',
                fontSize: '1.2rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                textTransform: 'uppercase',
                textShadow: viewMode === 'scheduled' ? '0 0 20px rgba(0, 255, 255, 0.8)' : 'none',
                boxShadow: viewMode === 'scheduled' 
                  ? '0 0 30px rgba(0, 255, 255, 0.6), inset 0 0 20px rgba(0, 255, 255, 0.2)'
                  : '0 0 10px rgba(0, 153, 255, 0.3)',
                transition: 'all 0.3s'
              }}
            >
              SCHEDULED
            </button>
          </div>
        </div>


        {/* Detailed Stats - one panel for solo, two for two teams */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: match.team2_id ? '1fr 1fr' : '1fr',
          gap: '3rem'
        }}>
          {/* Team 1 Details */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.9) 0%, rgba(15, 25, 40, 0.9) 100%)',
            padding: '3rem',
            borderRadius: '20px',
            border: '2px solid rgba(0, 255, 255, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: '2.5rem',
              color: '#00ffff',
              fontSize: '2.2rem',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              {match.team1_name || 'Team 1'} Details
            </h3>
            {team1Result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '2rem',
                  alignItems: 'start'
                }}>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '2px solid rgba(0, 255, 255, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
                    <div style={{ 
                      color: '#00ffff', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {finalScore1 || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '2px solid rgba(0, 255, 136, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Tasks</div>
                    <div style={{ 
                      color: '#00ff88', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 255, 136, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {team1Result.tasks_completed || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0, 153, 255, 0.1)',
                    border: '2px solid rgba(0, 153, 255, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 153, 255, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Precision</div>
                    <div style={{ 
                      color: '#0099ff', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(0, 153, 255, 0.8), 0 0 40px rgba(0, 153, 255, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {team1Result.precision_points || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 170, 0, 0.1)',
                    border: '2px solid rgba(255, 170, 0, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(255, 170, 0, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Penalties</div>
                    <div style={{ 
                      color: '#ffaa00', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(255, 170, 0, 0.8), 0 0 40px rgba(255, 170, 0, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {team1TotalPenaltyPoints || 0}
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: 'auto',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)',
                  borderRadius: '16px',
                  border: '3px solid rgba(0, 255, 255, 0.6)',
                  boxShadow: '0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 30px rgba(0, 255, 255, 0.2)'
                }}>
                  <div style={{ 
                    color: '#00ffff', 
                    fontSize: '3.5rem', 
                    fontWeight: 'bold', 
                    textAlign: 'center',
                    textShadow: '0 0 40px rgba(0, 255, 255, 1), 0 0 80px rgba(0, 255, 255, 0.6)',
                    fontFamily: '"Orbitron", monospace',
                    letterSpacing: '3px'
                  }}>
                    Score: {finalScore1}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#a0e0ff', textAlign: 'center', fontStyle: 'italic', fontSize: '1.2rem' }}>No results yet</div>
            )}
          </div>

          {/* Team 2 Details - only when two teams */}
          {match.team2_id && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.9) 0%, rgba(15, 25, 40, 0.9) 100%)',
            padding: '3rem',
            borderRadius: '20px',
            border: '2px solid rgba(0, 255, 255, 0.5)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 30px rgba(0, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{
              marginTop: 0,
              marginBottom: '2.5rem',
              color: '#00ffff',
              fontSize: '2.2rem',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(0, 255, 255, 0.8)',
              textAlign: 'center',
              textTransform: 'uppercase',
              letterSpacing: '2px'
            }}>
              {match.team2_name || 'Team 2'} Details
            </h3>
            {team2Result ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1 }}>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '2rem',
                  alignItems: 'start'
                }}>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '2px solid rgba(0, 255, 255, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Score</div>
                    <div style={{ 
                      color: '#00ffff', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {finalScore2 || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '2px solid rgba(0, 255, 136, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Tasks</div>
                    <div style={{ 
                      color: '#00ff88', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(0, 255, 136, 0.8), 0 0 40px rgba(0, 255, 136, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {team2Result.tasks_completed || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(0, 153, 255, 0.1)',
                    border: '2px solid rgba(0, 153, 255, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(0, 153, 255, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Precision</div>
                    <div style={{ 
                      color: '#0099ff', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(0, 153, 255, 0.8), 0 0 40px rgba(0, 153, 255, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {team2Result.precision_points || 0}
                    </div>
                  </div>
                  <div style={{
                    padding: '1.5rem',
                    background: 'rgba(255, 170, 0, 0.1)',
                    border: '2px solid rgba(255, 170, 0, 0.5)',
                    borderRadius: '12px',
                    boxShadow: '0 0 20px rgba(255, 170, 0, 0.3)'
                  }}>
                    <div style={{ color: '#a0e0ff', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Penalties</div>
                    <div style={{ 
                      color: '#ffaa00', 
                      fontSize: '3rem', 
                      fontWeight: 'bold',
                      textShadow: '0 0 20px rgba(255, 170, 0, 0.8), 0 0 40px rgba(255, 170, 0, 0.4)',
                      textAlign: 'center',
                      fontFamily: '"Orbitron", monospace'
                    }}>
                      {team2TotalPenaltyPoints || 0}
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: 'auto',
                  padding: '2rem',
                  background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 200, 255, 0.2) 100%)',
                  borderRadius: '16px',
                  border: '3px solid rgba(0, 255, 255, 0.6)',
                  boxShadow: '0 0 40px rgba(0, 255, 255, 0.6), inset 0 0 30px rgba(0, 255, 255, 0.2)'
                }}>
                  <div style={{ 
                    color: '#00ffff', 
                    fontSize: '3.5rem', 
                    fontWeight: 'bold', 
                    textAlign: 'center',
                    textShadow: '0 0 40px rgba(0, 255, 255, 1), 0 0 80px rgba(0, 255, 255, 0.6)',
                    fontFamily: '"Orbitron", monospace',
                    letterSpacing: '3px'
                  }}>
                    Score: {finalScore2}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: '#a0e0ff', textAlign: 'center', fontStyle: 'italic', fontSize: '1.2rem' }}>No results yet</div>
            )}
          </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}

export default Scoreboard
