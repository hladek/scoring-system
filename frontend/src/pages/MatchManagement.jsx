import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { matchesAPI, resultsAPI, penaltiesAPI, splitTimesAPI, getToken } from '../services/api'
import Notification from '../components/Notification'
import ConfirmDialog from '../components/ConfirmDialog'
import { subscribeToMatch, getSocket } from '../services/socket'
import { useIsMobile } from '../hooks/useIsMobile'

const inputPlaceholderStyle = `
  input::placeholder,
  textarea::placeholder {
    color: rgba(160, 224, 255, 0.6);
    opacity: 1;
  }
  select option {
    color: #000;
    background: #fff;
  }
`

function MatchManagement() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const [match, setMatch] = useState(null)
  const [results, setResults] = useState([])
  const [penalties, setPenalties] = useState([])
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [showPenaltyForm, setShowPenaltyForm] = useState(false)
  const [penaltyFormData, setPenaltyFormData] = useState({
    team_id: '',
    penalty_type: 'point_deduction',
    points: 0,
    description: '',
    time_occurred: null,
    issued_by: ''
  })
  const [currentTimer, setCurrentTimer] = useState(0)
  const timerIntervalRef = useRef(null)
  const [splits, setSplits] = useState([])
  const [savingSplit, setSavingSplit] = useState(null)
  const matchRef = useRef(match)
  const [pendingMatchChanges, setPendingMatchChanges] = useState(null)
  const [pendingResultsChanges, setPendingResultsChanges] = useState({})
  const [completionMinutes, setCompletionMinutes] = useState('')
  const [completionSeconds, setCompletionSeconds] = useState('')
  const [completionMilliseconds, setCompletionMilliseconds] = useState('')
  const [completionMinutes2, setCompletionMinutes2] = useState('')
  const [completionSeconds2, setCompletionSeconds2] = useState('')
  const [completionMilliseconds2, setCompletionMilliseconds2] = useState('')
  const [savingCompletionTime, setSavingCompletionTime] = useState(false)
  const [savingCompletionTime2, setSavingCompletionTime2] = useState(false)

  // Format completion time as M:SS:mmm for display
  const formatCompletionTime = (ms) => {
    if (ms == null || ms < 0) return null
    const m = Math.floor(ms / 60000)
    const s = Math.floor((ms % 60000) / 1000)
    const mm = ms % 1000
    return `${m}:${s.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
  }

  useEffect(() => {
    matchRef.current = match
  }, [match])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate('/login')
      return
    }
    
    if (matchId) {
      loadMatchData()
      
      // Subscribe to match updates via WebSocket
      const cleanup = subscribeToMatch(matchId, (data) => {
        loadMatchData()
      })
      
      return () => {
        if (cleanup) cleanup()
      }
    }
  }, [matchId, navigate])

  // Timer update for live matches
  useEffect(() => {
    if (match) {
      setCurrentTimer(match.current_time || 0)
    }
  }, [match?.current_time])

  // Timer: counts up from 0 while live; no automatic end at duration
  useEffect(() => {
    if (match && match.status === 'live') {
      timerIntervalRef.current = setInterval(async () => {
        const currentMatch = matchRef.current
        if (!currentMatch || currentMatch.status !== 'live') {
          if (timerIntervalRef.current) {
            clearInterval(timerIntervalRef.current)
            timerIntervalRef.current = null
          }
          return
        }

        const currentTime = currentMatch.current_time || 0
        const newTime = currentTime + 1

        setCurrentTimer(newTime)

        try {
          await matchesAPI.updateTimer(matchId, newTime)
          setMatch(prev => prev ? { ...prev, current_time: newTime } : null)
        } catch (err) {
          console.error('Error updating timer:', err)
        }
      }, 1000)
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
        timerIntervalRef.current = null
      }
    }
  }, [match?.status, matchId])

  const loadMatchData = async () => {
    try {
      setLoading(true)
      const [matchData, resultsData, penaltiesData] = await Promise.all([
        matchesAPI.getById(matchId),
        resultsAPI.getAll(matchId),
        penaltiesAPI.getAll(matchId)
      ])
      
      setMatch(matchData)
      setResults(resultsData || [])
      setPenalties(penaltiesData || [])
      try {
        const splitsData = await splitTimesAPI.getAll(matchId)
        setSplits(splitsData || [])
      } catch { setSplits([]) }
      setPendingMatchChanges(null)
      setPendingResultsChanges({})
    } catch (err) {
      console.error('Error loading match data:', err)
      setNotification({ 
        message: 'Error loading match: ' + (err.message || 'Please check your connection and try again'), 
        type: 'error' 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStartMatch = async () => {
    try {
      await matchesAPI.start(matchId)
      setNotification({ message: 'Match started successfully!', type: 'success' })
      loadMatchData()
    } catch (err) {
      setNotification({ message: 'Error starting match: ' + err.message, type: 'error' })
    }
  }

  const handleSaveCompletionTime = async (resultId, minutesStr, secondsStr, msStr, setSaving, clearInputs) => {
    if (!resultId) {
      setNotification({ message: 'No result for this team yet.', type: 'error' })
      return
    }
    const min = parseInt(minutesStr, 10) || 0
    const sec = Math.min(59, parseInt(secondsStr, 10) || 0)
    const ms = Math.min(999, parseInt(msStr, 10) || 0)
    const totalMs = min * 60000 + sec * 1000 + ms
    const value = totalMs <= 0 ? null : totalMs
    setSaving(true)
    try {
      await resultsAPI.update(resultId, { completion_time_milliseconds: value })
      setNotification({ message: 'Completion time saved.', type: 'success' })
      loadMatchData()
      if (clearInputs) clearInputs()
    } catch (err) {
      setNotification({ message: 'Error saving completion time: ' + err.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handlePauseMatch = async () => {
    if (!getToken()) {
      setNotification({ message: 'Please log in again.', type: 'error' })
      navigate('/login')
      return
    }
    try {
      await matchesAPI.pause(matchId)
      setNotification({ message: 'Match paused successfully!', type: 'success' })
      loadMatchData()
    } catch (err) {
      setNotification({ message: 'Error pausing match: ' + err.message, type: 'error' })
    }
  }

  const handleUpdateMatchStatus = (newStatus) => {
    // Only update local state, don't save to API yet
    setPendingMatchChanges({ status: newStatus })
    setMatch(prev => prev ? { ...prev, status: newStatus } : null)
    setNotification({ message: `Match status changed to ${newStatus}. Click "SAVE MATCH STATS" to apply.`, type: 'info' })
  }

  const handleUpdateScore = async (resultId, field, value, teamId) => {
    try {
      if (!getToken()) {
        setNotification({ message: 'Session expired. Please log in again.', type: 'error' })
        navigate('/login')
        return
      }
      if (!teamId) {
        setNotification({ message: 'Team ID is required', type: 'error' })
        return
      }

      let result = resultId ? results.find(r => r.id === resultId) : null
      
      // Tasks Completed and Precision Points save immediately
      if (field === 'tasks_completed' || field === 'precision_points') {
        // If result doesn't exist, create it
        if (!result) {
          const newResultData = {
            match_id: matchId,
            team_id: teamId,
            score: 0,
            tasks_completed: field === 'tasks_completed' ? parseInt(value) || 0 : 0,
            precision_points: field === 'precision_points' ? parseInt(value) || 0 : 0,
            goals: 0,
            fouls: 0
          }
          const createdResult = await resultsAPI.create(newResultData)
          setNotification({ message: 'Updated successfully!', type: 'success' })
          loadMatchData()
          return
        }

        // Update existing result immediately
        await resultsAPI.update(result.id, {
          ...result,
          [field]: parseInt(value) || 0
        })
        setNotification({ message: 'Updated successfully!', type: 'success' })
        loadMatchData()
        return
      }

      // Score field uses pending changes (requires SAVE MATCH STATS)
      if (field === 'score') {
        // If result doesn't exist, create a temporary one in local state
        if (!result) {
          const newResult = {
            id: `temp-${teamId}-${Date.now()}`,
            match_id: matchId,
            team_id: teamId,
            score: parseInt(value) || 0,
            tasks_completed: 0,
            precision_points: 0,
            goals: 0,
            fouls: 0
          }
          setResults(prev => [...prev, newResult])
          setPendingResultsChanges(prev => ({
            ...prev,
            [newResult.id]: { ...newResult, isNew: true }
          }))
          setNotification({ message: 'Changes made. Click "SAVE MATCH STATS" to apply.', type: 'info' })
          return
        }

        // Update local state only
        const updatedResult = {
          ...result,
          [field]: parseInt(value) || 0
        }
        setResults(prev => prev.map(r => r.id === result.id ? updatedResult : r))
        setPendingResultsChanges(prev => ({
          ...prev,
          [result.id]: updatedResult
        }))
        setNotification({ message: 'Changes made. Click "SAVE MATCH STATS" to apply.', type: 'info' })
      }
    } catch (err) {
      console.error('Error updating score:', err)
      const msg = err.message || 'Unknown error'
      const isAuthError = msg.toLowerCase().includes('authenticated') || msg.toLowerCase().includes('unauthorized')
      setNotification({
        message: isAuthError ? 'Session expired or not logged in. Please log in again.' : ('Error updating score: ' + msg),
        type: 'error'
      })
      if (isAuthError) {
        setTimeout(() => navigate('/login'), 1500)
      }
    }
  }

  const handleSaveMatchStats = async () => {
    try {
      if (!getToken()) {
        setNotification({ message: 'Session expired. Please log in again.', type: 'error' })
        navigate('/login')
        return
      }
      let hasChanges = false

      // Save match status if changed
      if (pendingMatchChanges) {
        // If status is being set to 'live', use start endpoint
        if (pendingMatchChanges.status === 'live') {
          await matchesAPI.start(matchId)
        } 
        // If status is being set to 'paused', use pause endpoint
        else if (pendingMatchChanges.status === 'paused') {
          await matchesAPI.pause(matchId)
        }
        // Otherwise use update endpoint
        else {
          await matchesAPI.update(matchId, pendingMatchChanges)
        }
        setPendingMatchChanges(null)
        hasChanges = true
      }

      // Save all pending result changes
      const pendingResultIds = Object.keys(pendingResultsChanges)
      for (const resultId of pendingResultIds) {
        const resultData = pendingResultsChanges[resultId]
        if (resultData.isNew) {
          // Create new result
          const { isNew, ...newResultData } = resultData
          await resultsAPI.create(newResultData)
        } else {
          // Update existing result
          await resultsAPI.update(resultId, resultData)
        }
        hasChanges = true
      }

      if (hasChanges) {
        setNotification({ message: 'Match stats saved successfully!', type: 'success' })
        setPendingResultsChanges({})
        loadMatchData()
      } else {
        setNotification({ message: 'No changes to save.', type: 'info' })
      }
    } catch (err) {
      setNotification({ message: 'Error saving match stats: ' + err.message, type: 'error' })
    }
  }

  const handleCreatePenalty = async (e) => {
    e.preventDefault()
    try {
      await penaltiesAPI.create({
        match_id: matchId,
        ...penaltyFormData,
        points: parseInt(penaltyFormData.points) || 0,
        time_occurred: penaltyFormData.time_occurred ? parseInt(penaltyFormData.time_occurred) : null
      })
      
      setNotification({ message: 'Penalty added successfully!', type: 'success' })
      setShowPenaltyForm(false)
      setPenaltyFormData({
        team_id: '',
        penalty_type: 'point_deduction',
        points: 0,
        description: '',
        time_occurred: null,
        issued_by: ''
      })
      loadMatchData()
    } catch (err) {
      setNotification({ message: 'Error adding penalty: ' + err.message, type: 'error' })
    }
  }

  const handleDeletePenalty = async (penaltyId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Penalty',
      message: 'Are you sure you want to delete this penalty?',
      type: 'danger',
      onConfirm: async () => {
        try {
          await penaltiesAPI.delete(penaltyId)
          setNotification({ message: 'Penalty deleted successfully!', type: 'success' })
          loadMatchData()
        } catch (err) {
          setNotification({ message: 'Error deleting penalty: ' + err.message, type: 'error' })
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const formatTime = (seconds) => {
    if (seconds === null || seconds === undefined) return '00:00'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const NumberInput = ({ value, onChange, min = 0, color = '#00ffff', label }) => {
    const handleIncrement = () => {
      const newValue = (parseInt(value) || 0) + 1
      onChange(newValue)
    }

    const handleDecrement = () => {
      const newValue = Math.max(min, (parseInt(value) || 0) - 1)
      onChange(newValue)
    }

    const handleInputChange = (e) => {
      const val = e.target.value === '' ? 0 : parseInt(e.target.value) || 0
      onChange(Math.max(min, val))
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={handleDecrement}
          style={{
            width: '50px',
            height: '50px',
            background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
            border: `2px solid ${color}88`,
            borderRadius: '10px',
            color: color,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 15px ${color}44`,
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.target.style.background = `linear-gradient(135deg, ${color}44 0%, ${color}22 100%)`
            e.target.style.boxShadow = `0 0 25px ${color}66`
            e.target.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`
            e.target.style.boxShadow = `0 0 15px ${color}44`
            e.target.style.transform = 'scale(1)'
          }}
        >
          −
        </button>
        <input
          type="text"
          value={value || 0}
          onChange={handleInputChange}
          style={{
            flex: 1,
            padding: '0.75rem',
            background: 'transparent',
            border: 'none',
            color: color,
            fontSize: '2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: `0 0 15px ${color}99`,
            fontFamily: '"Orbitron", monospace'
          }}
        />
        <button
          type="button"
          onClick={handleIncrement}
          style={{
            width: '50px',
            height: '50px',
            background: `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`,
            border: `2px solid ${color}88`,
            borderRadius: '10px',
            color: color,
            fontSize: '1.5rem',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 15px ${color}44`,
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          onMouseEnter={(e) => {
            e.target.style.background = `linear-gradient(135deg, ${color}44 0%, ${color}22 100%)`
            e.target.style.boxShadow = `0 0 25px ${color}66`
            e.target.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.target.style.background = `linear-gradient(135deg, ${color}22 0%, ${color}11 100%)`
            e.target.style.boxShadow = `0 0 15px ${color}44`
            e.target.style.transform = 'scale(1)'
          }}
        >
          +
        </button>
      </div>
    )
  }

  const formatTimer = (elapsedSeconds) => {
    if (elapsedSeconds === null || elapsedSeconds === undefined) return '00:00'
    const t = Math.max(0, Number(elapsedSeconds) || 0)
    const mins = Math.floor(t / 60)
    const secs = t % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleRecordSplit = async (teamId) => {
    setSavingSplit(teamId)
    try {
      const timeVal = matchRef.current?.current_time || currentTimer || 0
      await splitTimesAPI.create({
        match_id: matchId,
        team_id: teamId || null,
        time_seconds: timeVal,
      })
      const splitsData = await splitTimesAPI.getAll(matchId)
      setSplits(splitsData || [])
      setNotification({ message: 'Medzičas zaznamenaný!', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Chyba: ' + err.message, type: 'error' })
    } finally {
      setSavingSplit(null)
    }
  }

  const handleDeleteSplit = async (splitId) => {
    try {
      await splitTimesAPI.delete(splitId)
      setSplits(prev => prev.filter(s => s.id !== splitId))
      setNotification({ message: 'Medzičas odstránený.', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Chyba: ' + err.message, type: 'error' })
    }
  }

  const handleStopMatch = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Stop Match',
      message: 'Are you sure you want to stop this match? This will set the status to completed.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await matchesAPI.update(matchId, { status: 'completed' })
          setNotification({ message: 'Match stopped successfully!', type: 'success' })
          loadMatchData()
        } catch (err) {
          setNotification({ message: 'Error stopping match: ' + err.message, type: 'error' })
        }
        setConfirmDialog(null)
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const getTeamResult = (teamId) => {
    return results.find(r => r.team_id === teamId) || null
  }

  const getTeamPenalties = (teamId) => {
    return penalties.filter(p => p.team_id === teamId) || []
  }

  const calculateFinalScore = (result, teamId) => {
    if (!result) return 0
    const teamPenalties = getTeamPenalties(teamId)
    const totalPenaltyPoints = teamPenalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
    const tasksPoints = (result.tasks_completed || 0) * 2
    const precisionPoints = (result.precision_points || 0) * 1
    return (result.score || 0) - totalPenaltyPoints + tasksPoints + precisionPoints
  }

  if (loading) {
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
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading match data...</p>
      </div>
    )
  }

  if (!match) {
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
        <p style={{ color: '#ff6b6b', fontSize: '1.2rem' }}>Match not found</p>
        <button
          onClick={() => navigate('/admin')}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold'
          }}
        >
          Back to Admin
        </button>
      </div>
    )
  }

  const team1Result = getTeamResult(match.team1_id)
  const team2Result = getTeamResult(match.team2_id)
  const team1Penalties = getTeamPenalties(match.team1_id)
  const team2Penalties = getTeamPenalties(match.team2_id)
  const team1TotalPenaltyPoints = team1Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
  const team2TotalPenaltyPoints = team2Penalties.reduce((sum, p) => sum + (Number(p.points) || 0), 0)
  const finalScore1 = calculateFinalScore(team1Result, match.team1_id)
  const finalScore2 = calculateFinalScore(team2Result, match.team2_id)

  return (
    <>
      <style>{inputPlaceholderStyle}</style>
      <div className="rc-page" style={{ padding: 'var(--page-pad)' }}>
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
          {/* Header - Large Navigation Bar */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            marginBottom: '2rem',
            padding: '1.5rem',
            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
            borderRadius: '20px',
            border: '2px solid rgba(0, 255, 255, 0.4)',
            boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.2), inset 0 0 30px rgba(0, 255, 255, 0.1)',
            backdropFilter: 'blur(15px)'
          }}>
            {/* Top Row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '2rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => navigate('/admin')}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    boxShadow: '0 6px 20px rgba(108, 117, 125, 0.5), 0 0 30px rgba(108, 117, 125, 0.3)',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 8px 25px rgba(108, 117, 125, 0.7), 0 0 40px rgba(108, 117, 125, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.5), 0 0 30px rgba(108, 117, 125, 0.3)'
                  }}
                >
                  ← BACK
                </button>
                <h1 style={{ 
                  margin: 0, 
                  color: '#00ffff',
                  fontSize: '2.5rem',
                  fontWeight: 'bold',
                  textShadow: '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4)',
                  letterSpacing: '3px',
                  fontFamily: '"Orbitron", "Arial Black", sans-serif'
                }}>
                  MATCH MANAGEMENT
                </h1>
              </div>
              
              {/* Timer Display — elapsed time from match start */}
              {(match.status === 'live' || match.status === 'paused') && (
                <div style={{
                  padding: '1.25rem 2.5rem',
                  background: 'rgba(0, 255, 255, 0.15)',
                  border: '2px solid rgba(0, 255, 255, 0.5)',
                  borderRadius: '12px',
                  minWidth: '220px',
                  textAlign: 'center',
                  boxShadow: '0 0 30px rgba(0, 255, 255, 0.4)'
                }}>
                  <div style={{
                    color: '#a0e0ff',
                    fontSize: '0.9rem',
                    fontWeight: 'bold',
                    marginBottom: '0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    {match.status === 'live' ? '⏱️ ELAPSED TIME' : '⏸️ PAUSED'}
                  </div>
                  <div style={{
                    color: match.status === 'live' ? '#00ffff' : '#ffaa00',
                    fontSize: '2.5rem',
                    fontWeight: 'bold',
                    fontFamily: '"Orbitron", monospace',
                    textShadow: match.status === 'live' 
                      ? '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.4)'
                      : '0 0 20px rgba(255, 170, 0, 0.8), 0 0 40px rgba(255, 170, 0, 0.4)',
                    letterSpacing: '2px'
                  }}>
                    {formatTimer(currentTimer)}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row - Controls */}
            <div className="rc-btn-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
              {(match.status === 'live' || match.status === 'paused' || match.status === 'scheduled') && (
                <button
                  onClick={handleStopMatch}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    boxShadow: '0 6px 20px rgba(108, 117, 125, 0.5), 0 0 30px rgba(108, 117, 125, 0.3)',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 8px 25px rgba(108, 117, 125, 0.7), 0 0 40px rgba(108, 117, 125, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.5), 0 0 30px rgba(108, 117, 125, 0.3)'
                  }}
                >
                  ✓ COMPLETE MATCH
                </button>
              )}
              
              {match.status === 'scheduled' && (
                <button
                  onClick={handleStartMatch}
                  style={{
                    padding: '1rem 2rem',
                    background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                    color: '#0a0e27',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '1.1rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1.5px',
                    boxShadow: '0 6px 20px rgba(0, 255, 136, 0.5), 0 0 30px rgba(0, 255, 136, 0.3)',
                    transition: 'all 0.3s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.7), 0 0 40px rgba(0, 255, 136, 0.4)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5), 0 0 30px rgba(0, 255, 136, 0.3)'
                  }}
                >
                  ▶ START MATCH
                </button>
              )}
              
              {match.status === 'live' && (
                <>
                  <button
                    onClick={handlePauseMatch}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)',
                      color: '#0a0e27',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      boxShadow: '0 6px 20px rgba(255, 170, 0, 0.5), 0 0 30px rgba(255, 170, 0, 0.3)',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)'
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 170, 0, 0.7), 0 0 40px rgba(255, 170, 0, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = '0 6px 20px rgba(255, 170, 0, 0.5), 0 0 30px rgba(255, 170, 0, 0.3)'
                    }}
                  >
                    ⏸ PAUSE MATCH
                  </button>
                  <button
                    onClick={handleStopMatch}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      boxShadow: '0 6px 20px rgba(255, 68, 68, 0.5), 0 0 30px rgba(255, 68, 68, 0.3)',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)'
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 68, 68, 0.7), 0 0 40px rgba(255, 68, 68, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.5), 0 0 30px rgba(255, 68, 68, 0.3)'
                    }}
                  >
                    ⏹ STOP MATCH
                  </button>
                </>
              )}
              
              {match.status === 'paused' && (
                <>
                  <button
                    onClick={handleStartMatch}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                      color: '#0a0e27',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      boxShadow: '0 6px 20px rgba(0, 255, 136, 0.5), 0 0 30px rgba(0, 255, 136, 0.3)',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)'
                      e.target.style.boxShadow = '0 8px 25px rgba(0, 255, 136, 0.7), 0 0 40px rgba(0, 255, 136, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.5), 0 0 30px rgba(0, 255, 136, 0.3)'
                    }}
                  >
                    ▶ RESUME MATCH
                  </button>
                  <button
                    onClick={handleStopMatch}
                    style={{
                      padding: '1rem 2rem',
                      background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      boxShadow: '0 6px 20px rgba(255, 68, 68, 0.5), 0 0 30px rgba(255, 68, 68, 0.3)',
                      transition: 'all 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'scale(1.05)'
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 68, 68, 0.7), 0 0 40px rgba(255, 68, 68, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'scale(1)'
                      e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.5), 0 0 30px rgba(255, 68, 68, 0.3)'
                    }}
                  >
                    ⏹ STOP MATCH
                  </button>
                </>
              )}
              
              <button
                onClick={handleSaveMatchStats}
                style={{
                  padding: '1rem 2rem',
                  background: (pendingMatchChanges || Object.keys(pendingResultsChanges).length > 0)
                    ? 'linear-gradient(135deg, #ffaa00 0%, #ff8800 100%)'
                    : 'linear-gradient(135deg, #9d4edd 0%, #7b2cbf 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  boxShadow: (pendingMatchChanges || Object.keys(pendingResultsChanges).length > 0)
                    ? '0 6px 20px rgba(255, 170, 0, 0.5), 0 0 30px rgba(255, 170, 0, 0.3)'
                    : '0 6px 20px rgba(157, 78, 221, 0.5), 0 0 30px rgba(157, 78, 221, 0.3)',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  if (pendingMatchChanges || Object.keys(pendingResultsChanges).length > 0) {
                    e.target.style.boxShadow = '0 8px 25px rgba(255, 170, 0, 0.7), 0 0 40px rgba(255, 170, 0, 0.4)'
                  } else {
                    e.target.style.boxShadow = '0 8px 25px rgba(157, 78, 221, 0.7), 0 0 40px rgba(157, 78, 221, 0.4)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  if (pendingMatchChanges || Object.keys(pendingResultsChanges).length > 0) {
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 170, 0, 0.5), 0 0 30px rgba(255, 170, 0, 0.3)'
                  } else {
                    e.target.style.boxShadow = '0 6px 20px rgba(157, 78, 221, 0.5), 0 0 30px rgba(157, 78, 221, 0.3)'
                  }
                }}
              >
                💾 SAVE MATCH STATS
                {(pendingMatchChanges || Object.keys(pendingResultsChanges).length > 0) && (
                  <span style={{
                    marginLeft: '0.5rem',
                    fontSize: '0.8rem',
                    background: 'rgba(255, 255, 255, 0.3)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '10px',
                    fontWeight: 'bold'
                  }}>
                    ({Object.keys(pendingResultsChanges).length + (pendingMatchChanges ? 1 : 0)})
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Bottom Section - Detailed Team Statistics */}
          <div className={`rc-match-teams${match.team2_id ? '' : ' rc-match-team-solo'}`}>
            {/* Team 1 Details */}
            <div className="rc-scoreboard-panel" style={{ padding: '2rem' }}>
              {/* Large Score Display */}
              <div style={{
                padding: '1.5rem',
                background: 'rgba(0,255,255,0.15)',
                border: '3px solid rgba(0,255,255,0.6)',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(0,255,255,0.5)'
              }}>
                <div className="rc-score-big">
                  {finalScore1}
                </div>
              </div>
              
              <h3 style={{
                marginTop: 0,
                marginBottom: '1.5rem',
                color: '#00ffff',
                fontSize: 'var(--title-md)',
                fontWeight: 'bold',
                textShadow: '0 0 20px rgba(0,255,255,0.8)',
                textAlign: 'center',
                textTransform: 'uppercase',
                wordBreak: 'break-word'
              }}>
                {match.team1_name || 'Team 1'} Stats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '2px solid rgba(0, 255, 255, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Score</div>
                  <div style={{ 
                    color: '#00ffff', 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    textShadow: '0 0 15px rgba(0, 255, 255, 0.6)',
                    fontFamily: '"Orbitron", monospace'
                  }}>
                    {finalScore1}
                  </div>
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '2px solid rgba(0, 255, 136, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>✅</span>
                    Tasks Completed
                  </div>
                  <NumberInput
                    value={team1Result?.tasks_completed || 0}
                    onChange={(val) => handleUpdateScore(team1Result?.id || null, 'tasks_completed', val, match.team1_id)}
                    min={0}
                    color="#00ff88"
                  />
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 153, 255, 0.1)',
                  border: '2px solid rgba(0, 153, 255, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 153, 255, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🎯</span>
                    Positive Points
                  </div>
                  <NumberInput
                    value={team1Result?.precision_points || 0}
                    onChange={(val) => handleUpdateScore(team1Result?.id || null, 'precision_points', val, match.team1_id)}
                    min={0}
                    color="#0099ff"
                  />
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 255, 136, 0.15)',
                  border: '2px solid rgba(0, 255, 136, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⏱️</span>
                    Completion time (M:SS:mmm)
                  </div>
                  {(team1Result?.completion_time_milliseconds ?? match.completion_time_milliseconds) != null && (team1Result?.completion_time_milliseconds ?? match.completion_time_milliseconds) > 0 && (
                    <span style={{ color: '#00ff88', fontSize: '1.1rem', fontWeight: '600', marginRight: '1rem' }}>
                      {formatCompletionTime(team1Result?.completion_time_milliseconds ?? match.completion_time_milliseconds)}
                    </span>
                  )}
                  <table style={{ marginTop: '0.5rem', borderCollapse: 'separate', borderSpacing: '0.5rem' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#a0e0ff', fontSize: '0.85rem', paddingRight: '0.25rem' }}>Min</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={completionMinutes}
                            onChange={(e) => setCompletionMinutes(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            placeholder="0"
                            style={{ width: '56px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 136, 0.5)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ color: '#00ff88', fontWeight: 'bold', textAlign: 'center' }}>:</td>
                        <td style={{ color: '#a0e0ff', fontSize: '0.85rem', paddingRight: '0.25rem' }}>Sec</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={59}
                            value={completionSeconds}
                            onChange={(e) => setCompletionSeconds(e.target.value.replace(/\D/g, '').slice(0, 2))}
                            placeholder="0"
                            style={{ width: '56px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 136, 0.5)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ color: '#00ff88', fontWeight: 'bold', textAlign: 'center' }}>:</td>
                        <td style={{ color: '#a0e0ff', fontSize: '0.85rem', paddingRight: '0.25rem' }}>Ms</td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            max={999}
                            value={completionMilliseconds}
                            onChange={(e) => setCompletionMilliseconds(e.target.value.replace(/\D/g, '').slice(0, 3))}
                            placeholder="0"
                            style={{ width: '56px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 136, 0.5)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'center' }}
                          />
                        </td>
                        <td style={{ paddingLeft: '0.75rem' }}>
                          <button
                            type="button"
                            onClick={() => handleSaveCompletionTime(team1Result?.id, completionMinutes, completionSeconds, completionMilliseconds, setSavingCompletionTime, () => { setCompletionMinutes(''); setCompletionSeconds(''); setCompletionMilliseconds('') })}
                            disabled={savingCompletionTime}
                            style={{
                              padding: '0.5rem 1rem',
                              background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                              color: '#0a0e27',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: savingCompletionTime ? 'not-allowed' : 'pointer',
                              fontWeight: 'bold',
                              fontSize: '0.9rem'
                            }}
                          >
                            {savingCompletionTime ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 170, 0, 0.1)',
                  border: '2px solid rgba(255, 170, 0, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(255, 170, 0, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '12px', height: '12px', background: '#ffaa00', borderRadius: '2px' }}></span>
                    PENALTIES
                  </div>
                  <div style={{ color: '#ffaa00', fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', textShadow: '0 0 15px rgba(255, 170, 0, 0.6)' }}>
                    {team1TotalPenaltyPoints}
                  </div>
                </div>
              </div>
            </div>

            {match.team2_id && (
            <>
            {/* Team 2 Details */}
            <div className="rc-scoreboard-panel" style={{ padding: '2rem' }}>
              {/* Large Score Display */}
              <div style={{
                padding: '1.5rem',
                background: 'rgba(0,255,255,0.15)',
                border: '3px solid rgba(0,255,255,0.6)',
                borderRadius: '16px',
                marginBottom: '1.5rem',
                textAlign: 'center',
                boxShadow: '0 0 40px rgba(0,255,255,0.5)'
              }}>
                <div className="rc-score-big">
                  {finalScore2}
                </div>
              </div>
              <h3 style={{
                marginTop: 0,
                marginBottom: '1.5rem',
                color: '#00ffff',
                fontSize: 'var(--title-md)',
                fontWeight: 'bold',
                textShadow: '0 0 20px rgba(0,255,255,0.8)',
                textAlign: 'center',
                textTransform: 'uppercase',
                wordBreak: 'break-word'
              }}>
                {match.team2_name || 'Team 2'} Stats
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 255, 255, 0.1)',
                  border: '2px solid rgba(0, 255, 255, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 255, 255, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500' }}>Score</div>
                  <div style={{ 
                    color: '#00ffff', 
                    fontSize: '2rem', 
                    fontWeight: 'bold', 
                    textAlign: 'center', 
                    textShadow: '0 0 15px rgba(0, 255, 255, 0.6)',
                    fontFamily: '"Orbitron", monospace'
                  }}>
                    {finalScore2}
                  </div>
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 255, 136, 0.1)',
                  border: '2px solid rgba(0, 255, 136, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>✅</span>
                    Tasks Completed
                  </div>
                  <NumberInput
                    value={team2Result?.tasks_completed || 0}
                    onChange={(val) => handleUpdateScore(team2Result?.id || null, 'tasks_completed', val, match.team2_id)}
                    min={0}
                    color="#00ff88"
                  />
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 153, 255, 0.1)',
                  border: '2px solid rgba(0, 153, 255, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 153, 255, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>🎯</span>
                    Positive Points
                  </div>
                  <NumberInput
                    value={team2Result?.precision_points || 0}
                    onChange={(val) => handleUpdateScore(team2Result?.id || null, 'precision_points', val, match.team2_id)}
                    min={0}
                    color="#0099ff"
                  />
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(0, 255, 136, 0.15)',
                  border: '2px solid rgba(0, 255, 136, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(0, 255, 136, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span>⏱️</span>
                    Completion time (M:SS:mmm)
                  </div>
                  {team2Result?.completion_time_milliseconds != null && team2Result.completion_time_milliseconds > 0 && (
                    <span style={{ color: '#00ff88', fontSize: '1.1rem', fontWeight: '600', marginRight: '1rem' }}>
                      {formatCompletionTime(team2Result.completion_time_milliseconds)}
                    </span>
                  )}
                  <table style={{ marginTop: '0.5rem', borderCollapse: 'separate', borderSpacing: '0.5rem' }}>
                    <tbody>
                      <tr>
                        <td style={{ color: '#a0e0ff', fontSize: '0.85rem', paddingRight: '0.25rem' }}>Min</td>
                        <td>
                          <input type="number" min={0} max={999} value={completionMinutes2} onChange={(e) => setCompletionMinutes2(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="0" style={{ width: '56px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 136, 0.5)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'center' }} />
                        </td>
                        <td style={{ color: '#00ff88', fontWeight: 'bold', textAlign: 'center' }}>:</td>
                        <td style={{ color: '#a0e0ff', fontSize: '0.85rem', paddingRight: '0.25rem' }}>Sec</td>
                        <td>
                          <input type="number" min={0} max={59} value={completionSeconds2} onChange={(e) => setCompletionSeconds2(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="0" style={{ width: '56px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 136, 0.5)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'center' }} />
                        </td>
                        <td style={{ color: '#00ff88', fontWeight: 'bold', textAlign: 'center' }}>:</td>
                        <td style={{ color: '#a0e0ff', fontSize: '0.85rem', paddingRight: '0.25rem' }}>Ms</td>
                        <td>
                          <input type="number" min={0} max={999} value={completionMilliseconds2} onChange={(e) => setCompletionMilliseconds2(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="0" style={{ width: '56px', padding: '0.5rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(0, 255, 136, 0.5)', borderRadius: '8px', color: '#fff', fontSize: '1rem', textAlign: 'center' }} />
                        </td>
                        <td style={{ paddingLeft: '0.75rem' }}>
                          <button type="button" onClick={() => handleSaveCompletionTime(team2Result?.id, completionMinutes2, completionSeconds2, completionMilliseconds2, setSavingCompletionTime2, () => { setCompletionMinutes2(''); setCompletionSeconds2(''); setCompletionMilliseconds2('') })} disabled={savingCompletionTime2} style={{ padding: '0.5rem 1rem', background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)', color: '#0a0e27', border: 'none', borderRadius: '8px', cursor: savingCompletionTime2 ? 'not-allowed' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem' }}>
                            {savingCompletionTime2 ? 'Saving...' : 'Save'}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div style={{
                  padding: '1rem',
                  background: 'rgba(255, 170, 0, 0.1)',
                  border: '2px solid rgba(255, 170, 0, 0.5)',
                  borderRadius: '12px',
                  boxShadow: '0 0 20px rgba(255, 170, 0, 0.3)'
                }}>
                  <div style={{ color: '#a0e0ff', fontSize: '0.9rem', marginBottom: '0.5rem', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '12px', height: '12px', background: '#ffaa00', borderRadius: '2px' }}></span>
                    PENALTIES
                  </div>
                  <div style={{ color: '#ffaa00', fontSize: '2rem', fontWeight: 'bold', textAlign: 'center', textShadow: '0 0 15px rgba(255, 170, 0, 0.6)' }}>
                    {team2TotalPenaltyPoints}
                  </div>
                </div>
              </div>
            </div>
            </>
            )}
          </div>

          {/* ── Split Times Section ─────────────────────── */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20,30,50,0.8) 0%, rgba(15,25,40,0.8) 100%)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid rgba(0,255,136,0.4)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 30px rgba(0,255,136,0.2)',
            backdropFilter: 'blur(10px)',
            marginBottom: '2rem'
          }}>
            <h2 style={{ margin: '0 0 1.5rem 0', color: '#00ff88', fontSize: '1.8rem', fontWeight: 'bold', textShadow: '0 0 15px rgba(0,255,136,0.5)' }}>
              ⏱ Medzičasy
            </h2>

            {/* Record buttons – one per team (and one for no-team solo) */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {match.team1_id && (
                <button
                  disabled={savingSplit === match.team1_id}
                  onClick={() => handleRecordSplit(match.team1_id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg,#00ff88,#00cc66)',
                    color: '#0a0e27',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 15px rgba(0,255,136,0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  📍 {match.team1_name || 'Team 1'} — zaznamenaj {currentTimer > 0 ? `(${String(Math.floor(currentTimer/60)).padStart(2,'0')}:${String(currentTimer%60).padStart(2,'0')})` : ''}
                </button>
              )}
              {match.team2_id && (
                <button
                  disabled={savingSplit === match.team2_id}
                  onClick={() => handleRecordSplit(match.team2_id)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg,#00ffff,#0099ff)',
                    color: '#0a0e27',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '0.95rem',
                    boxShadow: '0 4px 15px rgba(0,255,255,0.4)',
                    transition: 'all 0.2s'
                  }}
                >
                  📍 {match.team2_name || 'Team 2'} — zaznamenaj {currentTimer > 0 ? `(${String(Math.floor(currentTimer/60)).padStart(2,'0')}:${String(currentTimer%60).padStart(2,'0')})` : ''}
                </button>
              )}
              {!match.team1_id && !match.team2_id && (
                <button
                  disabled={!!savingSplit}
                  onClick={() => handleRecordSplit(null)}
                  style={{ padding: '0.75rem 1.5rem', background: 'linear-gradient(135deg,#00ff88,#00cc66)', color: '#0a0e27', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', fontSize: '0.95rem' }}
                >
                  📍 Zaznamenaj medzičas
                </button>
              )}
            </div>

            {/* List of recorded splits */}
            {splits.length === 0 ? (
              <p style={{ color: '#6b9bc2', fontStyle: 'italic', margin: 0 }}>Žiadne medzičasy ešte neboli zaznamenané.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {splits.map(s => (
                  <div key={s.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'rgba(0,255,136,0.08)',
                    border: '1px solid rgba(0,255,136,0.3)',
                    borderRadius: '8px',
                    flexWrap: 'wrap',
                    gap: '0.5rem'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ color: '#00ff88', fontFamily: '"Orbitron",monospace', fontWeight: 'bold', fontSize: '1.1rem', minWidth: '60px' }}>
                        {s.time_formatted}
                      </span>
                      {s.team_name && (
                        <span style={{ color: '#a0e0ff', fontWeight: '600', fontSize: '0.9rem' }}>
                          {s.team_name}
                        </span>
                      )}
                      {s.label && (
                        <span style={{ color: '#6b9bc2', fontSize: '0.85rem' }}>{s.label}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSplit(s.id)}
                      style={{ padding: '0.3rem 0.75rem', background: 'rgba(255,68,68,0.2)', color: '#ff6b6b', border: '1px solid rgba(255,68,68,0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Penalties Section */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{
                margin: 0,
                color: '#00ffff',
                fontSize: '1.8rem',
                fontWeight: 'bold',
                textShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
              }}>
                Penalties
              </h2>
              <button
                onClick={() => setShowPenaltyForm(!showPenaltyForm)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'linear-gradient(135deg, #ff6b6b 0%, #cc5555 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.05)'
                  e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4)'
                }}
              >
                {showPenaltyForm ? '✕ Cancel' : '+ Add Penalty'}
              </button>
            </div>

            {showPenaltyForm && (
              <form onSubmit={handleCreatePenalty} style={{
                padding: '1.5rem',
                background: 'rgba(0, 255, 255, 0.05)',
                borderRadius: '12px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                marginBottom: '1.5rem'
              }}>
                <div className="rc-match-penalty-form-grid">
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#00ffff', fontWeight: 'bold' }}>
                      Team
                    </label>
                    <select
                      value={penaltyFormData.team_id}
                      onChange={(e) => setPenaltyFormData({ ...penaltyFormData, team_id: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 255, 255, 0.1)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Select Team</option>
                      {match.team1_id && (
                        <option value={match.team1_id}>{match.team1_name || 'Team 1'}</option>
                      )}
                      {match.team2_id && (
                        <option value={match.team2_id}>{match.team2_name || 'Team 2'}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#00ffff', fontWeight: 'bold' }}>
                      Penalty Type
                    </label>
                    <select
                      value={penaltyFormData.penalty_type}
                      onChange={(e) => setPenaltyFormData({ ...penaltyFormData, penalty_type: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 255, 255, 0.1)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="point_deduction">Point Deduction</option>
                      <option value="yellow_card">Yellow Card</option>
                      <option value="red_card">Red Card</option>
                      <option value="technical_foul">Technical Foul</option>
                      <option value="time_penalty">Time Penalty</option>
                      <option value="disqualification">Disqualification</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="rc-match-penalty-form-grid">
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#00ffff', fontWeight: 'bold' }}>
                      Points
                    </label>
                    <input
                      type="number"
                      value={penaltyFormData.points}
                      onChange={(e) => setPenaltyFormData({ ...penaltyFormData, points: e.target.value })}
                      required
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 255, 255, 0.1)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', color: '#00ffff', fontWeight: 'bold' }}>
                      Time Occurred (seconds)
                    </label>
                    <input
                      type="number"
                      value={penaltyFormData.time_occurred || ''}
                      onChange={(e) => setPenaltyFormData({ ...penaltyFormData, time_occurred: e.target.value || null })}
                      min="0"
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        background: 'rgba(0, 255, 255, 0.1)',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '1rem'
                      }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#00ffff', fontWeight: 'bold' }}>
                    Description
                  </label>
                  <textarea
                    value={penaltyFormData.description}
                    onChange={(e) => setPenaltyFormData({ ...penaltyFormData, description: e.target.value })}
                    rows="3"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      resize: 'vertical'
                    }}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', color: '#00ffff', fontWeight: 'bold' }}>
                    Issued By
                  </label>
                  <input
                    type="text"
                    value={penaltyFormData.issued_by}
                    onChange={(e) => setPenaltyFormData({ ...penaltyFormData, issued_by: e.target.value })}
                    placeholder="Judge name"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem'
                    }}
                  />
                </div>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                    color: '#0a0e27',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4)'
                  }}
                >
                  Add Penalty
                </button>
              </form>
            )}

            {penalties.length === 0 ? (
              <p style={{ color: '#a0e0ff', textAlign: 'center', padding: '2rem', fontStyle: 'italic' }}>
                No penalties yet
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {penalties.map(penalty => (
                  <div
                    key={penalty.id}
                    style={{
                      padding: '1rem',
                      background: 'rgba(255, 107, 107, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 107, 107, 0.3)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, color: '#ffffff', fontWeight: 'bold' }}>
                        {penalty.team_name || 'Team'} - {penalty.penalty_type.replace('_', ' ').toUpperCase()}
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', color: '#a0e0ff', fontSize: '0.9rem' }}>
                        {penalty.description || 'No description'}
                      </p>
                      <p style={{ margin: '0.5rem 0 0 0', color: '#ff6b6b', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        -{penalty.points} points
                        {penalty.time_occurred && ` at ${formatTime(penalty.time_occurred)}`}
                        {penalty.issued_by && ` by ${penalty.issued_by}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeletePenalty(penalty.id)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <Notification notification={notification} onClose={() => setNotification(null)} />
      <ConfirmDialog
        isOpen={confirmDialog?.isOpen || false}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        type={confirmDialog?.type}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={confirmDialog?.onCancel || (() => setConfirmDialog(null))}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </>
  )
}

export default MatchManagement
