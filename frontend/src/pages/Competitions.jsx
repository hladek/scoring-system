import React, { useState, useEffect, useRef } from 'react'
import { competitionsAPI, matchesAPI, resultsAPI, penaltiesAPI } from '../services/api'
import { getToken } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { subscribeToCompetition, getSocket } from '../services/socket'

function Competitions() {
  const navigate = useNavigate()
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
  const [matchTimers, setMatchTimers] = useState({}) // Track local timers for each match
  const [timerTick, setTimerTick] = useState(0) // Force re-render every second
  const [detailsLoading, setDetailsLoading] = useState(false) // Right panel loading when switching competition
  const matchesRef = useRef(matches) // Store latest matches to avoid stale closure
  const selectedCompetitionRef = useRef(selectedCompetition) // Store latest selectedCompetition

  useEffect(() => {
    // Initial load with loading indicator
    loadCompetitions(true)
    
    // Check if Flask backend is running
    const checkBackendConnection = async () => {
      try {
        // Use relative path to work in both dev and Docker (Nginx will proxy to backend)
        const healthUrl = import.meta.env.PROD ? '/health' : 'http://localhost:8000/health'
        const response = await fetch(healthUrl)
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
    
    // Check connection immediately
    checkBackendConnection()
    
    // Check connection every 5 seconds
    const connectionCheckInterval = setInterval(checkBackendConnection, 5000)
    
    // Subscribe to WebSocket updates for all competitions
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
  }, [])

  // Update refs when matches or selectedCompetition change
  useEffect(() => {
    matchesRef.current = matches
    selectedCompetitionRef.current = selectedCompetition
  }, [matches, selectedCompetition])

  // Real-time timer updates - runs every second for live matches
  // This runs independently and doesn't restart when matches change
  useEffect(() => {
    // Set up interval for real-time updates - always runs
    const timerInterval = setInterval(() => {
      // Force re-render by updating tick counter FIRST
      setTimerTick(prev => prev + 1)
      
      setMatchTimers(prevTimers => {
        // Get current matches from refs (always latest values)
        const allMatches = selectedCompetitionRef.current?.matches || matchesRef.current || []
        const newTimers = { ...prevTimers }
        
        // Update timers for all matches
        allMatches.forEach(match => {
          if (!match || !match.id) return
          
          const matchId = match.id
          const prevTimer = prevTimers[matchId]
          
          if (match.status === 'live' && match.current_time !== undefined && match.current_time !== null) {
            // For live matches, ALWAYS increment timer every second
            const currentTimerValue = prevTimer?.value ?? match.current_time
            const lastServerUpdate = prevTimer?.lastServerUpdate ?? match.current_time
            
            // If server time changed significantly (more than 3 seconds), sync; otherwise increment
            if (Math.abs(match.current_time - lastServerUpdate) > 3) {
              // Server time changed significantly, sync with server
              newTimers[matchId] = {
                value: match.current_time,
                lastServerUpdate: match.current_time,
                lastLocalUpdate: Date.now()
              }
            } else {
              // ALWAYS increment locally for real-time countdown
              // This ensures smooth 1-second updates regardless of data refresh frequency
              newTimers[matchId] = {
                value: currentTimerValue + 1,
                lastServerUpdate: match.current_time, // Keep server time for reference
                lastLocalUpdate: Date.now()
              }
            }
          } else if (match.status === 'paused' && match.current_time !== undefined && match.current_time !== null) {
            // For paused matches, sync with server time (don't increment)
            if (!prevTimer || Math.abs(prevTimer.value - match.current_time) > 1) {
              newTimers[matchId] = {
                value: match.current_time,
                lastServerUpdate: match.current_time,
                lastLocalUpdate: Date.now()
              }
            }
          }
        })
        
        // Always return new object to force re-render, even if no updates
        // This ensures the timer display updates every second
        return { ...newTimers }
      })
    }, 1000) // Update every second for real-time display
    
    return () => clearInterval(timerInterval)
  }, []) // Empty dependencies - timer runs independently, uses refs for latest values
  
  // Initialize timers when matches are loaded - but don't overwrite active timers
  // This only initializes new timers, doesn't reset running ones
  useEffect(() => {
    const allMatches = selectedCompetition?.matches || matches || []
    if (allMatches.length === 0) return
    
    setMatchTimers(prevTimers => {
      const newTimers = { ...prevTimers }
      let updated = false
      
      allMatches.forEach(match => {
        if (!match || !match.id) return
        if ((match.status === 'live' || match.status === 'paused') && match.current_time !== undefined && match.current_time !== null) {
          const matchId = match.id
          const prevTimer = prevTimers[matchId]
          
          // Only initialize if timer doesn't exist yet
          // Don't reset existing timers - let the timer interval handle updates
          if (!prevTimer) {
            // No timer exists, initialize it
            newTimers[matchId] = {
              value: match.current_time,
              lastServerUpdate: match.current_time,
              lastLocalUpdate: Date.now()
            }
            updated = true
          }
          // If timer exists, don't touch it - the timer interval will handle updates
        }
      })
      
      return updated ? { ...newTimers } : prevTimers
    })
  }, [matches, selectedCompetition?.id]) // Initialize when matches or competition changes

  useEffect(() => {
    // Auto-refresh every 2s if backend is connected (smooth, less lag when switching)
    let interval = null
    if (isConnected) {
      interval = setInterval(() => {
        loadCompetitions(false)
        if (selectedCompetition?.id) {
          loadCompetitionDetails(selectedCompetition.id, true)
        }
        setLastUpdate(new Date())
      }, 2000)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isConnected, selectedCompetition?.id])

  const loadCompetitions = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true)
      const data = await competitionsAPI.getAll()
      setCompetitions(data)
      setLastUpdate(new Date())
    } catch (err) {
      console.error('Error loading competitions:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const loadCompetitionDetails = async (competitionId, silent = false) => {
    try {
      const competition = await competitionsAPI.getById(competitionId)
      let freshMatches = []
      
      if (competition.matches && competition.matches.length > 0) {
        freshMatches = competition.matches.map((match) => {
          const newMatch = {
            id: match.id,
            competition_id: match.competition_id,
            team1_id: match.team1_id,
            team2_id: match.team2_id,
            team1_name: match.team1_name,
            team2_name: match.team2_name,
            match_name: match.match_name,
            match_date: match.match_date,
            duration_minutes: match.duration_minutes,
            current_time: match.current_time,
            status: match.status,
            stage: match.stage,
            round_number: match.round_number,
            completion_time_milliseconds: match.completion_time_milliseconds,
            results: match.results ? match.results.map(r => ({
              id: r.id,
              team_id: r.team_id,
              score: r.score,
              goals: r.goals,
              fouls: r.fouls,  // Kept for backward compatibility
              tasks_completed: r.tasks_completed || 0,
              precision_points: r.precision_points || 0,
              completion_time_milliseconds: r.completion_time_milliseconds,
              notes: r.notes
            })) : [],
            penalties: match.penalties ? match.penalties.map(p => ({
              id: p.id,
              team_id: p.team_id,
              penalty_type: p.penalty_type,
              points: p.points,
              description: p.description,
              time_occurred: p.time_occurred,
              issued_by: p.issued_by
            })) : [],
            penalties_count: match.penalties_count || 0
          }
          return newMatch
        })
      } else {
        const matchesData = await matchesAPI.getAll(competitionId)
        // Load results for each match
        for (const match of matchesData) {
          try {
            const results = await resultsAPI.getAll(match.id)
            const penalties = await penaltiesAPI.getAll(match.id)
            freshMatches.push({
              ...match,
              results: results || [],
              penalties: penalties || [],
              penalties_count: penalties?.length || 0
            })
          } catch (err) {
            console.error(`Error loading results for match ${match.id}:`, err)
            freshMatches.push({
              ...match,
              results: [],
              penalties: [],
              penalties_count: 0
            })
          }
        }
        competition.matches = freshMatches
      }
      
      // Force React to detect changes by creating completely new objects with timestamp
      const refreshTimestamp = Date.now()
      
      // FORCE COMPLETE STATE RESET - Create brand new objects
      const newMatches = freshMatches.map(m => {
        const score1 = Number(m.results?.[0]?.score) || 0
        const score2 = Number(m.results?.[1]?.score) || 0
        return {
          id: m.id,
          competition_id: m.competition_id,
          team1_id: m.team1_id,
          team2_id: m.team2_id,
          team1_name: m.team1_name,
          team2_name: m.team2_name,
          match_name: m.match_name,
          match_date: m.match_date,
          duration_minutes: m.duration_minutes,
          current_time: m.current_time,
          status: m.status,
          stage: m.stage,
          round_number: m.round_number,
          completion_time_milliseconds: m.completion_time_milliseconds,
          results: m.results ? m.results.map(r => ({
            id: r.id,
            team_id: r.team_id,
            score: Number(r.score) || 0,
            goals: Number(r.goals) || 0,
            fouls: Number(r.fouls) || 0,  // Kept for backward compatibility
            tasks_completed: Number(r.tasks_completed) || 0,
            precision_points: Number(r.precision_points) || 0,
            completion_time_milliseconds: r.completion_time_milliseconds,
            notes: r.notes
          })) : [],
          penalties: m.penalties ? m.penalties.map(p => ({
            id: p.id,
            team_id: p.team_id,
            penalty_type: p.penalty_type,
            points: p.points,
            description: p.description,
            time_occurred: p.time_occurred,
            issued_by: p.issued_by
          })) : [],
          penalties_count: m.penalties_count || 0,
          _renderKey: refreshTimestamp,
          _scoreKey: `${score1}-${score2}`,
          _timestamp: refreshTimestamp,
          _forceUpdate: refreshTimestamp // Extra flag to force update
        }
      })
      
      // Ignore stale response if user already switched to another competition
      if (selectedCompetitionRef.current?.id !== competitionId) {
        return
      }

      // ALWAYS update selectedCompetition - FORCE REACT TO SEE CHANGE
      const newSelectedCompetition = {
        id: competition.id,
        name: competition.name,
        description: competition.description,
        location: competition.location,
        start_date: competition.start_date,
        end_date: competition.end_date,
        status: competition.status,
        created_at: competition.created_at,
        updated_at: competition.updated_at,
        matches: newMatches,
        _refreshKey: refreshTimestamp,
        _forceUpdate: refreshTimestamp
      }
      
      setSelectedCompetition(newSelectedCompetition)
      setMatches(newMatches)
      
      // Initialize/update timers for all matches
      setMatchTimers(prevTimers => {
        const newTimers = { ...prevTimers }
        newMatches.forEach(match => {
          if ((match.status === 'live' || match.status === 'paused') && match.current_time !== undefined) {
            const matchId = match.id
            // Only update if server time changed or timer doesn't exist
            if (!newTimers[matchId] || newTimers[matchId].lastServerUpdate !== match.current_time) {
              newTimers[matchId] = {
                value: match.current_time,
                lastServerUpdate: match.current_time,
                lastLocalUpdate: Date.now()
              }
            }
          }
        })
        return newTimers
      })
      
      setLastUpdate(new Date())
      setDetailsLoading(false)
    } catch (err) {
      console.error('Error loading competition details:', err)
      if (selectedCompetitionRef.current?.id === competitionId) {
        setDetailsLoading(false)
      }
      if (!silent) {
        alert('Error loading competition details: ' + err.message)
      }
    }
  }

  const handleCompetitionClick = (competition) => {
    if (selectedCompetition?.id === competition.id) return
    setDetailsLoading(true)
    setSelectedCompetition(competition)
    loadCompetitionDetails(competition.id)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const updateScore = async (resultId, field, value, matchId) => {
    const token = getToken()
    if (!token) {
      alert('Please login to update scores')
      return
    }
    
    try {
      // Find the result in the current matches
      let result = null
      for (const m of matches) {
        if (m.results) {
          result = m.results.find(r => r.id === resultId)
          if (result) break
        }
      }
      
      if (!result) {
        // If not found, try to get it from the selected competition's matches
        if (selectedCompetition && selectedCompetition.matches) {
          for (const m of selectedCompetition.matches) {
            if (m.results) {
              result = m.results.find(r => r.id === resultId)
              if (result) break
            }
          }
        }
      }

      if (!result) {
        console.error('Result not found')
        return
      }

      await resultsAPI.update(resultId, {
        ...result,
        [field]: parseInt(value) || 0
      })
      
      // Reload competition details to show updated scores
      if (selectedCompetition) {
        loadCompetitionDetails(selectedCompetition.id)
      }
    } catch (err) {
      console.error('Error updating score:', err)
      alert('Error updating score: ' + (err.message || 'Please check your connection'))
    }
  }

  const isAuthenticated = () => {
    return !!getToken()
  }

  if (loading && competitions.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p>Loading competitions...</p>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
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
      
      {/* Full Screen Content Container */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        padding: '2rem',
        width: '100%',
        maxWidth: '100%',
        margin: 0,
        minHeight: '100vh',
        boxSizing: 'border-box',
        display: 'grid',
        gridTemplateColumns: '1fr 2.5fr',
        gap: '3rem'
      }}>
        {/* Left Panel - Competition List */}
        <div style={{ overflowY: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#a0e0ff' }}>
              <p>Loading competitions...</p>
            </div>
          ) : competitions.length === 0 ? (
            <div style={{
              textAlign: 'center', 
              padding: '3rem', 
              background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ color: '#a0e0ff', fontSize: '1rem' }}>No competitions available yet.</p>
              <p style={{ color: '#6b9bc2', marginTop: '0.5rem', fontSize: '0.9rem' }}>Check back later for upcoming competitions.</p>
            </div>
          ) : (
            <div>
              <h2 style={{ 
                marginTop: 0, 
                marginBottom: '1.5rem', 
                color: '#00ffff',
                fontSize: '1.3rem',
                fontWeight: 'bold',
                textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                letterSpacing: '1px'
              }}>
                ALL COMPETITIONS
              </h2>
              
              {/* Search and Filter */}
              <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <input
                  type="text"
                  placeholder="🔍 Search competitions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
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
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                    e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'
                  }}
                  onBlur={(e) => {
                    e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                    e.target.style.boxShadow = 'none'
                  }}
                >
                  <option value="all" style={{ color: '#000', background: '#fff' }}>All Status</option>
                  <option value="upcoming" style={{ color: '#000', background: '#fff' }}>Upcoming</option>
                  <option value="ongoing" style={{ color: '#000', background: '#fff' }}>Ongoing</option>
                  <option value="completed" style={{ color: '#000', background: '#fff' }}>Completed</option>
                  <option value="cancelled" style={{ color: '#000', background: '#fff' }}>Cancelled</option>
                </select>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
                {competitions
                  .filter(comp => {
                    const matchesSearch = !searchQuery || comp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                      (comp.description && comp.description.toLowerCase().includes(searchQuery.toLowerCase()))
                    const matchesStatus = statusFilter === 'all' || comp.status === statusFilter
                    return matchesSearch && matchesStatus
                  })
                  .map(competition => {
                  const compStatus = selectedCompetition?.id === competition.id 
                    ? selectedCompetition.status 
                    : competition.status
                  
                  return (
                  <div
                    key={competition.id}
                    onClick={() => handleCompetitionClick(competition)}
                    style={{
                      padding: '1.5rem',
                      background: selectedCompetition?.id === competition.id 
                        ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 200, 255, 0.15) 100%)'
                        : 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                      border: `2px solid ${selectedCompetition?.id === competition.id ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 255, 255, 0.2)'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      boxShadow: selectedCompetition?.id === competition.id 
                        ? '0 4px 16px rgba(0, 255, 255, 0.3), 0 0 20px rgba(0, 255, 255, 0.2)' 
                        : '0 2px 8px rgba(0, 0, 0, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem', gap: '1rem' }}>
                      <h3 style={{ 
                        margin: 0, 
                        color: '#ffffff', 
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        wordWrap: 'break-word',
                        overflowWrap: 'break-word',
                        flex: 1,
                        minWidth: 0
                      }}>
                        {competition.name}
                      </h3>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        background: compStatus === 'completed' 
                          ? 'rgba(0, 255, 136, 0.2)' 
                          : compStatus === 'ongoing' || compStatus === 'live'
                          ? 'rgba(255, 170, 0, 0.2)'
                          : compStatus === 'cancelled'
                          ? 'rgba(255, 68, 68, 0.2)'
                          : 'rgba(0, 153, 255, 0.2)',
                        color: compStatus === 'completed' 
                          ? '#00ff88' 
                          : compStatus === 'ongoing' || compStatus === 'live'
                          ? '#ffaa00'
                          : compStatus === 'cancelled'
                          ? '#ff4444'
                          : '#0099ff',
                        border: `1px solid ${compStatus === 'completed' 
                          ? 'rgba(0, 255, 136, 0.4)' 
                          : compStatus === 'ongoing' || compStatus === 'live'
                          ? 'rgba(255, 170, 0, 0.4)'
                          : compStatus === 'cancelled'
                          ? 'rgba(255, 68, 68, 0.4)'
                          : 'rgba(0, 153, 255, 0.4)'}`,
                        whiteSpace: 'nowrap',
                        textShadow: `0 0 5px ${compStatus === 'completed' 
                          ? 'rgba(0, 255, 136, 0.5)' 
                          : compStatus === 'ongoing' || compStatus === 'live'
                          ? 'rgba(255, 170, 0, 0.5)'
                          : compStatus === 'cancelled'
                          ? 'rgba(255, 68, 68, 0.5)'
                          : 'rgba(0, 153, 255, 0.5)'}`
                      }}>
                        {compStatus?.toUpperCase() || 'UPCOMING'}
                      </span>
                    </div>
                    {competition.description && (
                      <p style={{ color: '#a0e0ff', margin: '0.5rem 0', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        {competition.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
                      {competition.location && (
                        <div style={{ color: '#6b9bc2', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#00ffff' }}>📍</span> {competition.location}
                        </div>
                      )}
                      {competition.start_date && (
                        <div style={{ color: '#6b9bc2', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#00ffff' }}>📅</span> Start: {formatDate(competition.start_date)}
                        </div>
                      )}
                      {competition.end_date && (
                        <div style={{ color: '#6b9bc2', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: '#00ffff' }}>📅</span> End: {formatDate(competition.end_date)}
                        </div>
                      )}
                    </div>
                  </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Main Content */}
        <div style={{ overflowY: 'auto' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div>
            <h1 style={{ 
              margin: 0, 
              color: '#00ffff',
              fontSize: '2.5rem',
              fontWeight: 'bold',
              textShadow: '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)',
              letterSpacing: '2px',
              fontFamily: '"Orbitron", "Arial Black", sans-serif'
            }}>
              LIVE COMPETITIONS
            </h1>
            <p style={{ margin: '0.5rem 0 0 0', color: '#a0e0ff', fontSize: '1rem', fontWeight: '500' }}>
              {isConnected ? (
                <span style={{ 
                  color: '#00ff88', 
                  fontWeight: 'bold',
                  textShadow: '0 0 10px rgba(0, 255, 136, 0.8)',
                  animation: 'pulse 2s infinite'
                }}>● LIVE</span>
              ) : (
                <span style={{ 
                  color: '#ff6b6b', 
                  fontWeight: 'bold'
                }}>● Disconnected</span>
              )}
              {' '}Last updated: <span style={{ color: '#ffffff' }}>{lastUpdate.toLocaleTimeString()}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          </div>
        </div>

        {competitions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '3rem', 
            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <p style={{ color: '#a0e0ff', fontSize: '1.1rem', fontWeight: '500' }}>No competitions available yet.</p>
            <p style={{ color: '#6b9bc2', marginTop: '0.5rem' }}>Check back later for upcoming competitions.</p>
          </div>
        ) : (
          <>
          {/* Competition Details */}
          {selectedCompetition ? (
            <div style={{ width: '100%', minWidth: 0 }}>
              <div style={{
                background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)',
                marginBottom: '1.5rem',
                backdropFilter: 'blur(10px)',
                width: '100%'
              }}>
                <h2 style={{ 
                  marginTop: 0, 
                  color: '#ffffff',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                  marginBottom: '0.5rem'
                }}>
                  {selectedCompetition.name}
                </h2>
                {selectedCompetition.description && (
                  <p style={{ 
                    color: '#a0e0ff', 
                    marginBottom: '0.5rem', 
                    fontSize: '1.1rem',
                    fontWeight: '500'
                  }}>
                    {selectedCompetition.description}
                  </p>
                )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
                    {selectedCompetition.location && (
                      <div style={{
                        padding: '1rem',
                        background: 'rgba(0, 255, 255, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 255, 255, 0.2)'
                      }}>
                        <strong style={{ color: '#00ffff', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>LOCATION</strong>
                        <p style={{ margin: 0, color: '#a0e0ff', fontSize: '0.95rem' }}>📍 {selectedCompetition.location}</p>
                      </div>
                    )}
                    {selectedCompetition.start_date && (
                      <div style={{
                        padding: '1rem',
                        background: 'rgba(0, 255, 255, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 255, 255, 0.2)'
                      }}>
                        <strong style={{ color: '#00ffff', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>START DATE</strong>
                        <p style={{ margin: 0, color: '#a0e0ff', fontSize: '0.95rem' }}>📅 {formatDate(selectedCompetition.start_date)}</p>
                      </div>
                    )}
                    {selectedCompetition.end_date && (
                      <div style={{
                        padding: '1rem',
                        background: 'rgba(0, 255, 255, 0.05)',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 255, 255, 0.2)'
                      }}>
                        <strong style={{ color: '#00ffff', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>END DATE</strong>
                        <p style={{ margin: 0, color: '#a0e0ff', fontSize: '0.95rem' }}>📅 {formatDate(selectedCompetition.end_date)}</p>
                      </div>
                    )}
                    <div style={{
                      padding: '1rem',
                      background: 'rgba(0, 255, 255, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(0, 255, 255, 0.2)'
                    }}>
                      <strong style={{ color: '#00ffff', display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>STATUS</strong>
                      <p style={{ margin: 0 }}>
                        <span style={{
                          padding: '0.4rem 0.9rem',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '1px',
                          background: 
                            selectedCompetition.status === 'completed' ? 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)' : 
                            selectedCompetition.status === 'ongoing' || selectedCompetition.status === 'live' ? 'linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)' :
                            selectedCompetition.status === 'cancelled' ? 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)' : 
                            'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
                          color: '#0a0e27',
                          boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
                          display: 'inline-block'
                        }}>
                          {selectedCompetition.status?.toUpperCase() || 'UPCOMING'}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

              {/* Matches Section */}
              <div>
                <h3 style={{ 
                  marginBottom: '1rem', 
                  color: '#00ffff',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                  letterSpacing: '1px'
                }}>
                  Matches
                </h3>
                
                {/* Match Search and Filter */}
                {matches.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search matches..."
                      value={matchSearchQuery}
                      onChange={(e) => setMatchSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 255, 255, 0.1)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                        e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                        e.target.style.boxShadow = 'none'
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
                        fontSize: '1rem',
                        outline: 'none',
                        transition: 'all 0.3s',
                        boxSizing: 'border-box'
                      }}
                      onFocus={(e) => {
                        e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                        e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'
                      }}
                      onBlur={(e) => {
                        e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                        e.target.style.boxShadow = 'none'
                      }}
                    >
                      <option value="all" style={{ color: '#000', background: '#fff' }}>All Status</option>
                      <option value="scheduled" style={{ color: '#000', background: '#fff' }}>Scheduled</option>
                      <option value="live" style={{ color: '#000', background: '#fff' }}>Live</option>
                      <option value="completed" style={{ color: '#000', background: '#fff' }}>Completed</option>
                      <option value="paused" style={{ color: '#000', background: '#fff' }}>Paused</option>
                      <option value="cancelled" style={{ color: '#000', background: '#fff' }}>Cancelled</option>
                    </select>
                  </div>
                )}
                
                {detailsLoading ? (
                  <div style={{
                    padding: '3rem 2rem',
                    background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    textAlign: 'center',
                    color: '#a0e0ff',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(10px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      border: '3px solid rgba(0, 255, 255, 0.3)',
                      borderTop: '3px solid #00ffff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    <p style={{ fontSize: '1rem', margin: 0 }}>Loading matches...</p>
                  </div>
                ) : matches.length === 0 ? (
                  <div style={{
                    padding: '2rem',
                    background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 255, 255, 0.2)',
                    textAlign: 'center',
                    color: '#a0e0ff',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <p style={{ fontSize: '1.1rem' }}>No matches scheduled for this competition yet.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(selectedCompetition?.matches || matches)
                      .filter(match => {
                        // Filter out matches that belong to deleted competitions
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
                      // CRITICAL: Always use selectedCompetition.matches as it's the most up-to-date source
                      // If not available, fall back to matches state
                      const matchData = selectedCompetition?.matches?.find(m => m.id === match.id) || match
                      
                      // Ensure we have matchData
                      if (!matchData) {
                        console.warn(`Match data not found for ${match.id}`)
                        return null
                      }
                      
                      const team1Result = matchData.results && matchData.results.length > 0 ? matchData.results[0] : null
                      const team2Result = matchData.results && matchData.results.length > 1 ? matchData.results[1] : null
                      
                      // Calculate unique key based on FINAL SCORES to force re-render when scores change
                      const rawScore1 = matchData.results?.[0]?.score ?? 0
                      const rawScore2 = matchData.results?.[1]?.score ?? 0
                      const team1Id = matchData.results?.[0]?.team_id || matchData.team1_id
                      const team2Id = matchData.results?.[1]?.team_id || matchData.team2_id
                      const team1Penalties = (matchData.penalties || []).filter(p => p.team_id === team1Id) || []
                      const team2Penalties = (matchData.penalties || []).filter(p => p.team_id === team2Id) || []
                      const team1TotalPenaltyPoints = team1Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
                      const team2TotalPenaltyPoints = team2Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
                      const team1TasksPoints = (matchData.results?.[0]?.tasks_completed || 0) * 2
                      const team1PrecisionPoints = (matchData.results?.[0]?.precision_points || 0) * 1
                      const team2TasksPoints = (matchData.results?.[1]?.tasks_completed || 0) * 2
                      const team2PrecisionPoints = (matchData.results?.[1]?.precision_points || 0) * 1
                      const finalScore1 = rawScore1 - team1TotalPenaltyPoints + team1TasksPoints + team1PrecisionPoints
                      const finalScore2 = rawScore2 - team2TotalPenaltyPoints + team2TasksPoints + team2PrecisionPoints
                      
                      return (
                        <div
                          key={`match-${matchData.id}-${finalScore1}-${finalScore2}-${matchTimers[matchData.id]?.value ?? matchData.current_time ?? 0}-${matchData._timestamp || lastUpdate.getTime()}`}
                          style={{
                            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.9) 0%, rgba(15, 25, 40, 0.9) 100%)',
                            padding: '2rem',
                            borderRadius: '16px',
                            border: `2px solid ${
                              matchData.status === 'live' ? 'rgba(255, 170, 0, 0.6)' :
                              matchData.status === 'completed' ? 'rgba(0, 255, 136, 0.6)' :
                              matchData.status === 'cancelled' ? 'rgba(255, 68, 68, 0.6)' : 'rgba(0, 255, 255, 0.4)'
                            }`,
                            boxShadow: `0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px ${
                              matchData.status === 'live' ? 'rgba(255, 170, 0, 0.3)' :
                              matchData.status === 'completed' ? 'rgba(0, 255, 136, 0.3)' :
                              matchData.status === 'cancelled' ? 'rgba(255, 68, 68, 0.3)' : 'rgba(0, 255, 255, 0.2)'
                            }, inset 0 0 20px rgba(0, 255, 255, 0.1)`,
                            backdropFilter: 'blur(10px)',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1.5rem', position: 'relative', zIndex: 1 }}>
                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                margin: '0 0 0.5rem 0', 
                                color: '#00ffff', 
                                fontSize: '1.5rem',
                                fontWeight: 'bold',
                                textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                                letterSpacing: '1px',
                                wordWrap: 'break-word',
                                overflowWrap: 'break-word',
                                maxWidth: '100%'
                              }}>
                                {matchData.match_name || (matchData.team2_id ? `${matchData.team1_name || 'Team 1'} vs ${matchData.team2_name || 'Team 2'}` : (matchData.team1_name || 'Solo round'))}
                              </h4>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
                                {matchData.results?.filter(r => r.completion_time_milliseconds != null && r.completion_time_milliseconds > 0).map(r => (
                                  <span key={r.id} style={{ color: '#00ff88', fontSize: '0.95rem', fontWeight: '600' }}>
                                    ⏱️ {r.team_id === matchData.team1_id ? (matchData.team1_name || 'Team 1') : (matchData.team2_name || 'Team 2')}: {(() => {
                                      const ms = r.completion_time_milliseconds
                                      const min = Math.floor(ms / 60000)
                                      const sec = Math.floor((ms % 60000) / 1000)
                                      const mm = ms % 1000
                                      return `${min}:${sec.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
                                    })()}
                                  </span>
                                ))}
                                {(!matchData.results?.length || !matchData.results.some(r => r.completion_time_milliseconds > 0)) && matchData.completion_time_milliseconds != null && matchData.completion_time_milliseconds > 0 && (
                                  <span style={{ color: '#00ff88', fontSize: '0.95rem', fontWeight: '600' }}>
                                    ⏱️ Time: {(() => {
                                      const ms = matchData.completion_time_milliseconds
                                      const min = Math.floor(ms / 60000)
                                      const s = Math.floor((ms % 60000) / 1000)
                                      const mm = ms % 1000
                                      return `${min}:${s.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
                                    })()}
                                  </span>
                                )}
                                {matchData.stage && (
                                  <span style={{ color: '#a0e0ff', fontSize: '0.9rem', fontWeight: '500' }}>
                                    🏆 {matchData.stage}
                                    {matchData.round_number && ` - Round ${matchData.round_number}`}
                                  </span>
                                )}
                                {matchData.match_date && (
                                  <span style={{ color: '#a0e0ff', fontSize: '0.9rem', fontWeight: '500' }}>
                                    📅 {formatDate(matchData.match_date)}
                                  </span>
                                )}
                                {matchData.duration_minutes > 0 && (
                                  <span style={{ color: '#a0e0ff', fontSize: '0.9rem', fontWeight: '500' }}>
                                    ⏱️ {matchData.duration_minutes} min
                                  </span>
                                )}
                                {/* Timer Display - Show for both live and paused matches */}
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
                                        {/* timerTick forces re-render every second */}
                                        {(() => {
                                          // Use local timer if available, otherwise use server time
                                          // timerTick dependency ensures this re-renders every second
                                          const _ = timerTick // Reference timerTick to force re-render
                                          const localTimer = matchTimers[matchData.id]
                                          const elapsedSeconds = (localTimer?.value ?? matchData.current_time) || 0
                                          const totalDurationSeconds = matchData.duration_minutes > 0 ? matchData.duration_minutes * 60 : 0
                                          const remainingSeconds = totalDurationSeconds > 0 ? Math.max(0, totalDurationSeconds - elapsedSeconds) : elapsedSeconds
                                          const minutes = Math.floor(remainingSeconds / 60)
                                          const seconds = remainingSeconds % 60
                                          return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                                        })()}
                                      </span>
                                      {matchData.duration_minutes > 0 && (
                                        <span style={{
                                          color: '#6b9bc2',
                                          fontSize: '0.8rem'
                                        }}>
                                          / {matchData.duration_minutes}:00
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                              {matchData.penalties && matchData.penalties.length > 0 && (
                                <span style={{ color: '#dc3545', fontSize: '0.9rem', fontWeight: 'bold' }}>
                                  🟨 {matchData.penalties.length} {matchData.penalties.length === 1 ? 'Penalty' : 'Penalties'}
                                </span>
                              )}
                            </div>
                            <span style={{
                              padding: '0.5rem 1rem',
                              borderRadius: '12px',
                              fontSize: '0.85rem',
                              fontWeight: 'bold',
                              textTransform: 'uppercase',
                              backgroundColor: 
                                matchData.status === 'live' ? '#ffaa00' :
                                matchData.status === 'completed' ? '#00ff88' :
                                matchData.status === 'cancelled' ? '#ff4444' : 
                                matchData.status === 'paused' ? '#6c757d' : '#0099ff',
                              color: '#0a0e27',
                              whiteSpace: 'nowrap',
                              boxShadow: `0 0 15px ${
                                matchData.status === 'live' ? 'rgba(255, 170, 0, 0.6)' :
                                matchData.status === 'completed' ? 'rgba(0, 255, 136, 0.6)' :
                                matchData.status === 'cancelled' ? 'rgba(255, 68, 68, 0.6)' : 
                                matchData.status === 'paused' ? 'rgba(108, 117, 125, 0.6)' : 'rgba(0, 153, 255, 0.6)'
                              }`,
                              textShadow: 'none'
                            }}>
                              {matchData.status === 'live' ? '🔴 LIVE' :
                               matchData.status === 'completed' ? '✅ COMPLETED' :
                               matchData.status === 'cancelled' ? '❌ CANCELLED' : 
                               matchData.status === 'paused' ? '⏸ PAUSED' : '📅 SCHEDULED'}
                            </span>
                          </div>

                          {/* Match Score and Details - Always show match info */}
                          <div style={{
                            padding: '2rem',
                            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
                            borderRadius: '12px',
                            marginTop: '1.5rem',
                            border: '1px solid rgba(0, 255, 255, 0.2)',
                            boxShadow: 'inset 0 0 20px rgba(0, 255, 255, 0.1)',
                            position: 'relative',
                            zIndex: 1
                          }}>
                            {/* Main Score Display - one column for solo, three for two teams */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: matchData.team2_id ? '1fr auto 1fr' : '1fr auto',
                              gap: '2rem',
                              alignItems: 'center',
                              marginBottom: '2rem',
                              paddingBottom: '2rem',
                              borderBottom: '2px solid rgba(0, 255, 255, 0.3)'
                            }}>
                              <div style={{ textAlign: matchData.team2_id ? 'right' : 'center' }}>
                                <div style={{ 
                                  fontWeight: 'bold', 
                                  fontSize: '1.4rem', 
                                  color: '#00ffff',
                                  marginBottom: '0.5rem',
                                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  maxWidth: '100%'
                                }}>
                                  {matchData.team1_name || 'Team 1'}
                                </div>
                              </div>
                              <div style={{
                                fontSize: '4rem',
                                fontWeight: 'bold',
                                color: matchData.status === 'live' ? '#ffaa00' : '#00ffff',
                                textAlign: 'center',
                                minWidth: '150px',
                                textShadow: matchData.status === 'live' 
                                  ? '0 0 20px rgba(255, 170, 0, 0.8), 0 0 40px rgba(255, 170, 0, 0.4)'
                                  : '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)',
                                fontFamily: '"Orbitron", "Arial Black", sans-serif',
                                letterSpacing: '2px'
                              }}>
                                {(() => {
                                  let finalScore1 = 0
                                  let finalScore2 = 0
                                  if (matchData.results && Array.isArray(matchData.results)) {
                                    if (matchData.results.length > 0 && matchData.results[0]) {
                                      const rawScore1 = Number(matchData.results[0].score) || 0
                                      const team1Id = matchData.results[0].team_id || matchData.team1_id
                                      const team1Penalties = (matchData.penalties || []).filter(p => p.team_id === team1Id) || []
                                      const team1TotalPenaltyPoints = team1Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
                                      const team1TasksPoints = (matchData.results[0].tasks_completed || 0) * 2
                                      const team1PrecisionPoints = (matchData.results[0].precision_points || 0) * 1
                                      finalScore1 = rawScore1 - team1TotalPenaltyPoints + team1TasksPoints + team1PrecisionPoints
                                    }
                                    if (matchData.results.length > 1 && matchData.results[1]) {
                                      const rawScore2 = Number(matchData.results[1].score) || 0
                                      const team2Id = matchData.results[1].team_id || matchData.team2_id
                                      const team2Penalties = (matchData.penalties || []).filter(p => p.team_id === team2Id) || []
                                      const team2TotalPenaltyPoints = team2Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
                                      const team2TasksPoints = (matchData.results[1].tasks_completed || 0) * 2
                                      const team2PrecisionPoints = (matchData.results[1].precision_points || 0) * 1
                                      finalScore2 = rawScore2 - team2TotalPenaltyPoints + team2TasksPoints + team2PrecisionPoints
                                    }
                                  }
                                  return matchData.team2_id ? `${finalScore1} - ${finalScore2}` : String(finalScore1)
                                })()}
                              </div>
                              {matchData.team2_id && (
                              <div style={{ textAlign: 'left' }}>
                                <div style={{ 
                                  fontWeight: 'bold', 
                                  fontSize: '1.2rem', 
                                  color: '#00ffff',
                                  marginBottom: '0.5rem',
                                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                                }}>
                                  {matchData.team2_name || 'Team 2'}
                                </div>
                              </div>
                              )}
                            </div>

                            {/* Detailed Stats Grid - one column for solo match, two for two teams */}
                            {(team1Result || team2Result || (matchData.results && matchData.results.length > 0)) ? (
                              <div style={{
                                display: 'grid',
                                gridTemplateColumns: matchData.team2_id ? '1fr 1fr' : '1fr',
                                gap: '1.5rem'
                              }}>
                                {/* Team 1 Stats */}
                                <div style={{
                                  background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                                  padding: '1.5rem',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(0, 255, 255, 0.3)',
                                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 0 15px rgba(0, 255, 255, 0.1)',
                                  backdropFilter: 'blur(10px)'
                                }}>
                                  <div style={{ 
                                    fontWeight: 'bold', 
                                    marginBottom: '1rem', 
                                    color: '#00ffff', 
                                    fontSize: '1rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                                    wordWrap: 'break-word',
                                    overflowWrap: 'break-word',
                                    maxWidth: '100%'
                                  }}>
                                    {matchData.team1_name || 'Team 1'} Stats
                                  </div>
                                  {team1Result ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.25rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        Score
                                      </label>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#00ffff', 
                                        fontSize: '1.3rem', 
                                        textAlign: 'center', 
                                        padding: '0.75rem', 
                                        background: 'rgba(0, 255, 255, 0.1)',
                                        borderRadius: '8px', 
                                        border: '2px solid rgba(0, 255, 255, 0.4)',
                                        boxShadow: '0 0 15px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1)',
                                        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                                      }}>
                                        {team1Result.score ?? 0}
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        🟨 PENALTIES
                                      </label>
                                      {(() => {
                                        const teamPenalties = matchData.penalties?.filter(p => p.team_id === matchData.team1_id) || []
                                        const totalPenaltyPoints = teamPenalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
                                        return (
                                          <div style={{ 
                                            fontWeight: 'bold', 
                                            color: '#ffaa00', 
                                            fontSize: '1.3rem', 
                                            textAlign: 'center', 
                                            padding: '0.75rem', 
                                            background: 'rgba(255, 170, 0, 0.15)',
                                            borderRadius: '8px', 
                                            border: '2px solid rgba(255, 170, 0, 0.4)',
                                            boxShadow: '0 0 15px rgba(255, 170, 0, 0.3), inset 0 0 10px rgba(255, 170, 0, 0.1)',
                                            textShadow: '0 0 10px rgba(255, 170, 0, 0.5)'
                                          }}>
                                            {totalPenaltyPoints || 0}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        ✅ Tasks Completed
                                      </label>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#00ff88', 
                                        fontSize: '1.3rem', 
                                        textAlign: 'center', 
                                        padding: '0.75rem', 
                                        background: 'rgba(0, 255, 136, 0.15)',
                                        borderRadius: '8px', 
                                        border: '2px solid rgba(0, 255, 136, 0.4)',
                                        boxShadow: '0 0 15px rgba(0, 255, 136, 0.3), inset 0 0 10px rgba(0, 255, 136, 0.1)',
                                        textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
                                      }}>
                                        {team1Result.tasks_completed ?? 0}
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        🎯 Precision Points
                                      </label>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#0099ff', 
                                        fontSize: '1.3rem', 
                                        textAlign: 'center', 
                                        padding: '0.75rem', 
                                        background: 'rgba(0, 153, 255, 0.15)',
                                        borderRadius: '8px', 
                                        border: '2px solid rgba(0, 153, 255, 0.4)',
                                        boxShadow: '0 0 15px rgba(0, 153, 255, 0.3), inset 0 0 10px rgba(0, 153, 255, 0.1)',
                                        textShadow: '0 0 10px rgba(0, 153, 255, 0.5)'
                                      }}>
                                        {team1Result.precision_points ?? 0}
                                      </div>
                                    </div>
                                    {team1Result.notes && (
                                      <div style={{ 
                                        marginTop: '0.5rem', 
                                        paddingTop: '0.5rem', 
                                        borderTop: '1px solid rgba(0, 255, 255, 0.3)', 
                                        fontSize: '0.85rem', 
                                        color: '#a0e0ff',
                                        fontWeight: '500'
                                      }}>
                                        📝 {team1Result.notes}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ 
                                    color: '#6b9bc2', 
                                    fontSize: '0.9rem', 
                                    fontStyle: 'italic',
                                    textAlign: 'center',
                                    padding: '2rem'
                                  }}>
                                    {matchData.status === 'scheduled' ? '⏰ Waiting to start' :
                                     matchData.status === 'live' ? '🔴 Match in progress' :
                                     matchData.status === 'completed' ? '✅ Match completed' :
                                     '📋 No stats yet'}
                                  </div>
                                )}
                              </div>

                              {/* Team 2 Stats - only when two teams */}
                              {matchData.team2_id && (
                              <div style={{
                                background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                                padding: '1.5rem',
                                borderRadius: '12px',
                                border: '1px solid rgba(0, 255, 255, 0.3)',
                                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 0 15px rgba(0, 255, 255, 0.1)',
                                backdropFilter: 'blur(10px)'
                              }}>
                                <div style={{ 
                                  fontWeight: 'bold', 
                                  marginBottom: '1rem', 
                                  color: '#00ffff', 
                                  fontSize: '1rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                                  wordWrap: 'break-word',
                                  overflowWrap: 'break-word',
                                  maxWidth: '100%'
                                }}>
                                  {matchData.team2_name || 'Team 2'} Stats
                                </div>
                                {team2Result ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        SCORE
                                      </label>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#00ffff', 
                                        fontSize: '1.3rem', 
                                        textAlign: 'center', 
                                        padding: '0.75rem', 
                                        background: 'rgba(0, 255, 255, 0.1)',
                                        borderRadius: '8px', 
                                        border: '2px solid rgba(0, 255, 255, 0.4)',
                                        boxShadow: '0 0 15px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1)',
                                        textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                                      }}>
                                        {team2Result.score ?? 0}
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        🟨 PENALTIES
                                      </label>
                                      {(() => {
                                        const teamPenalties = matchData.penalties?.filter(p => p.team_id === matchData.team2_id) || []
                                        const totalPenaltyPoints = teamPenalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
                                        return (
                                          <div style={{ 
                                            fontWeight: 'bold', 
                                            color: '#ffaa00', 
                                            fontSize: '1.3rem', 
                                            textAlign: 'center', 
                                            padding: '0.75rem', 
                                            background: 'rgba(255, 170, 0, 0.15)',
                                            borderRadius: '8px', 
                                            border: '2px solid rgba(255, 170, 0, 0.4)',
                                            boxShadow: '0 0 15px rgba(255, 170, 0, 0.3), inset 0 0 10px rgba(255, 170, 0, 0.1)',
                                            textShadow: '0 0 10px rgba(255, 170, 0, 0.5)'
                                          }}>
                                            {totalPenaltyPoints || 0}
                                          </div>
                                        )
                                      })()}
                                    </div>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        ✅ Tasks Completed
                                      </label>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#00ff88', 
                                        fontSize: '1.3rem', 
                                        textAlign: 'center', 
                                        padding: '0.75rem', 
                                        background: 'rgba(0, 255, 136, 0.15)',
                                        borderRadius: '8px', 
                                        border: '2px solid rgba(0, 255, 136, 0.4)',
                                        boxShadow: '0 0 15px rgba(0, 255, 136, 0.3), inset 0 0 10px rgba(0, 255, 136, 0.1)',
                                        textShadow: '0 0 10px rgba(0, 255, 136, 0.5)'
                                      }}>
                                        {team2Result.tasks_completed ?? 0}
                                      </div>
                                    </div>
                                    <div>
                                      <label style={{ 
                                        display: 'block', 
                                        marginBottom: '0.5rem', 
                                        color: '#a0e0ff', 
                                        fontSize: '0.85rem',
                                        fontWeight: '500'
                                      }}>
                                        🎯 Precision Points
                                      </label>
                                      <div style={{ 
                                        fontWeight: 'bold', 
                                        color: '#0099ff', 
                                        fontSize: '1.3rem', 
                                        textAlign: 'center', 
                                        padding: '0.75rem', 
                                        background: 'rgba(0, 153, 255, 0.15)',
                                        borderRadius: '8px', 
                                        border: '2px solid rgba(0, 153, 255, 0.4)',
                                        boxShadow: '0 0 15px rgba(0, 153, 255, 0.3), inset 0 0 10px rgba(0, 153, 255, 0.1)',
                                        textShadow: '0 0 10px rgba(0, 153, 255, 0.5)'
                                      }}>
                                        {team2Result.precision_points ?? 0}
                                      </div>
                                    </div>
                                    {team2Result.notes && (
                                      <div style={{ 
                                        marginTop: '0.5rem', 
                                        paddingTop: '0.5rem', 
                                        borderTop: '1px solid rgba(0, 255, 255, 0.3)', 
                                        fontSize: '0.85rem', 
                                        color: '#a0e0ff',
                                        fontWeight: '500'
                                      }}>
                                        📝 {team2Result.notes}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div style={{ color: '#999', fontSize: '0.9rem', fontStyle: 'italic' }}>
                                    {matchData.status === 'scheduled' ? '⏰ Waiting to start' :
                                     matchData.status === 'live' ? '🔴 Match in progress' :
                                     matchData.status === 'completed' ? '✅ Match completed' :
                                     '📋 No stats yet'}
                                  </div>
                                )}
                              </div>
                              )}
                            </div>
                            ) : (
                              <div style={{ 
                                padding: '1rem', 
                                textAlign: 'center', 
                                color: '#999', 
                                fontSize: '0.9rem', 
                                fontStyle: 'italic' 
                              }}>
                                {matchData.status === 'scheduled' ? '⏰ Waiting to start' :
                                 matchData.status === 'live' ? '🔴 Match in progress' :
                                 matchData.status === 'completed' ? '✅ Match completed - No stats available' :
                                 '📋 No stats yet'}
                              </div>
                            )}

                            {/* Match Info and Penalties - Always show */}
                            <div style={{
                              marginTop: '1rem',
                              paddingTop: '1rem',
                              borderTop: '1px solid #dee2e6',
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '1rem',
                              fontSize: '0.9rem',
                              color: '#a0e0ff',
                              alignItems: 'center',
                              fontWeight: '500'
                            }}>
                              {matchData.results?.filter(r => r.completion_time_milliseconds != null && r.completion_time_milliseconds > 0).map(r => (
                                <span key={r.id} style={{ color: '#00ff88', fontWeight: '600' }}>
                                  ⏱️ {r.team_id === matchData.team1_id ? (matchData.team1_name || 'Team 1') : (matchData.team2_name || 'Team 2')}: {(() => {
                                    const ms = r.completion_time_milliseconds
                                    const min = Math.floor(ms / 60000)
                                    const s = Math.floor((ms % 60000) / 1000)
                                    const mm = ms % 1000
                                    return `${min}:${s.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
                                  })()}
                                </span>
                              ))}
                              {(!matchData.results?.length || !matchData.results.some(r => r.completion_time_milliseconds > 0)) && matchData.completion_time_milliseconds != null && matchData.completion_time_milliseconds > 0 && (
                                <span style={{ color: '#00ff88', fontWeight: '600' }}>
                                  ⏱️ Time: {(() => {
                                    const ms = matchData.completion_time_milliseconds
                                    const min = Math.floor(ms / 60000)
                                    const s = Math.floor((ms % 60000) / 1000)
                                    const mm = ms % 1000
                                    return `${min}:${s.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
                                  })()}
                                </span>
                              )}
                              {matchData.duration_minutes > 0 && (
                                <span>⏱️ Duration: {matchData.duration_minutes} min</span>
                              )}
                              {/* Match Status Display */}
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
                                  fontSize: '0.9rem'
                                }}>
                                  {matchData.status === 'live' ? '🔴 LIVE' 
                                    : matchData.status === 'completed' ? '✅ COMPLETED'
                                    : matchData.status === 'paused' ? '⏸️ PAUSED'
                                    : '📅 SCHEDULED'}
                                </span>
                                {(matchData.status === 'live' || matchData.status === 'paused') && matchData.current_time !== undefined && (
                                  <>
                                    <span style={{
                                      color: matchData.status === 'live' ? '#ffaa00' : '#a0e0ff',
                                      fontWeight: 'bold',
                                      fontSize: '1.1rem',
                                      fontFamily: '"Orbitron", sans-serif',
                                      textShadow: matchData.status === 'live' ? '0 0 10px rgba(255, 170, 0, 0.8)' : 'none',
                                      minWidth: '60px',
                                      textAlign: 'center'
                                    }}>
                                      {/* timerTick forces re-render every second */}
                                      {(() => {
                                        // Use local timer if available, otherwise use server time
                                        // timerTick dependency ensures this re-renders every second
                                        const _ = timerTick // Reference timerTick to force re-render
                                        const localTimer = matchTimers[matchData.id]
                                        const elapsedSeconds = (localTimer?.value ?? matchData.current_time) || 0
                                        const totalDurationSeconds = matchData.duration_minutes > 0 ? matchData.duration_minutes * 60 : 0
                                        const remainingSeconds = totalDurationSeconds > 0 ? Math.max(0, totalDurationSeconds - elapsedSeconds) : elapsedSeconds
                                        const minutes = Math.floor(remainingSeconds / 60)
                                        const seconds = remainingSeconds % 60
                                        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                                      })()}
                                    </span>
                                    {matchData.duration_minutes > 0 && (
                                      <span style={{
                                        color: '#6b9bc2',
                                        fontSize: '0.85rem'
                                      }}>
                                        / {matchData.duration_minutes}:00
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                              {matchData.penalties && matchData.penalties.length > 0 && (
                                <span style={{ color: '#dc3545', fontWeight: 'bold' }}>
                                  🟨 Penalties: {matchData.penalties.length}
                                </span>
                              )}
                              {matchData.stage && (
                                <span>🏆 {matchData.stage}{matchData.round_number ? ` - Round ${matchData.round_number}` : ''}</span>
                              )}
                            </div>

                            {/* Penalties List - Always show if exists */}
                            {matchData.penalties && matchData.penalties.length > 0 && (
                              <div style={{
                                marginTop: '1.5rem',
                                paddingTop: '1.5rem',
                                borderTop: '1px solid rgba(0, 255, 255, 0.3)',
                                position: 'relative',
                                zIndex: 1
                              }}>
                                <div style={{ 
                                  fontWeight: 'bold', 
                                  marginBottom: '1rem', 
                                  color: '#00ffff', 
                                  fontSize: '1rem',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                                }}>
                                  🟨 Penalties ({matchData.penalties.length})
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                  {matchData.penalties.slice(0, 5).map(penalty => (
                                    <div key={penalty.id} style={{
                                      padding: '1rem',
                                      background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.6) 0%, rgba(15, 25, 40, 0.6) 100%)',
                                      borderRadius: '8px',
                                      fontSize: '0.9rem',
                                      border: '1px solid rgba(0, 255, 255, 0.2)',
                                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
                                      backdropFilter: 'blur(5px)'
                                    }}>
                                      <span style={{ 
                                        fontWeight: 'bold',
                                        color: '#00ffff',
                                        textShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
                                      }}>
                                        {penalty.team_id === matchData.team1_id ? (matchData.team1_name || 'Team 1') : 
                                         penalty.team_id === matchData.team2_id ? (matchData.team2_name || 'Team 2') : 'Match'}
                                      </span>
                                      {' - '}
                                      <span style={{ color: '#a0e0ff', textTransform: 'capitalize' }}>
                                        {penalty.penalty_type.replace(/_/g, ' ')}
                                      </span>
                                      {penalty.points > 0 && (
                                        <span style={{ 
                                          color: '#ff6b6b', 
                                          marginLeft: '0.5rem',
                                          fontWeight: 'bold',
                                          textShadow: '0 0 5px rgba(255, 107, 107, 0.5)'
                                        }}>
                                          (-{penalty.points} pts)
                                        </span>
                                      )}
                                      {penalty.time_occurred > 0 && (
                                        <span style={{ color: '#6b9bc2', marginLeft: '0.5rem' }}>
                                          @ {Math.floor(penalty.time_occurred / 60)}:{(penalty.time_occurred % 60).toString().padStart(2, '0')}
                                        </span>
                                      )}
                                      {penalty.description && (
                                        <div style={{ marginTop: '0.5rem', color: '#6b9bc2', fontSize: '0.85rem' }}>
                                          {penalty.description}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                  {matchData.penalties.length > 5 && (
                                    <div style={{ 
                                      color: '#a0e0ff', 
                                      fontSize: '0.85rem', 
                                      fontStyle: 'italic',
                                      fontWeight: '500'
                                    }}>
                                      +{matchData.penalties.length - 5} more penalties
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Full-Screen Scoreboard Button */}
                            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                              <button
                                onClick={() => navigate(`/scoreboard/${matchData.id}`)}
                                style={{
                                  padding: '0.75rem 2rem',
                                  background: 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)',
                                  color: '#ffffff',
                                  border: 'none',
                                  borderRadius: '8px',
                                  cursor: 'pointer',
                                  fontSize: '1rem',
                                  fontWeight: 'bold',
                                  textTransform: 'uppercase',
                                  letterSpacing: '1px',
                                  boxShadow: '0 4px 15px rgba(157, 78, 221, 0.4), 0 0 20px rgba(157, 78, 221, 0.2)',
                                  transition: 'all 0.3s'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.transform = 'scale(1.05)'
                                  e.target.style.boxShadow = '0 6px 20px rgba(157, 78, 221, 0.6), 0 0 30px rgba(157, 78, 221, 0.3)'
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'scale(1)'
                                  e.target.style.boxShadow = '0 4px 15px rgba(157, 78, 221, 0.4), 0 0 20px rgba(157, 78, 221, 0.2)'
                                }}
                              >
                                📺 Full-Screen Scoreboard
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
              borderRadius: '16px',
              border: '1px solid rgba(0, 255, 255, 0.2)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)'
            }}>
              <p style={{ color: '#a0e0ff', fontSize: '1.2rem', fontWeight: '500' }}>Select a competition from the left panel to view details</p>
            </div>
          )}
          </>
        )}
        </div>
      </div>
    </div>
  )
}

export default Competitions
