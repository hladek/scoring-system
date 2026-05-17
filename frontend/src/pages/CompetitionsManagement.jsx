import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { competitionsAPI, matchesAPI, teamsAPI, userTeamsAPI, getToken } from '../services/api'
import Notification from '../components/Notification'
import ConfirmDialog from '../components/ConfirmDialog'

// Add CSS for placeholder text
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

function CompetitionsManagement() {
  const navigate = useNavigate()
  const [competitions, setCompetitions] = useState([])
  const [selectedCompetition, setSelectedCompetition] = useState(null)
  const [matches, setMatches] = useState([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [editingCompetition, setEditingCompetition] = useState(null)
  const [showMatchForm, setShowMatchForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)

  useEffect(() => {
    // Check if user is authenticated
    const token = getToken()
    if (!token) {
      navigate('/login')
      return
    }
  }, [navigate])
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location: '',
    start_date: '',
    end_date: '',
    status: 'upcoming'
  })
  const [matchFormData, setMatchFormData] = useState({
    competition_id: '',
    team1_id: '',
    team2_id: '',
    match_name: '',
    match_date: '',
    duration_minutes: 0,
    round_number: '',
    stage: '',
    status: 'scheduled'
  })
  const [teams, setTeams] = useState([])
  const [team1Search, setTeam1Search] = useState('')
  const [team2Search, setTeam2Search] = useState('')
  const [showTeam1Dropdown, setShowTeam1Dropdown] = useState(false)
  const [showTeam2Dropdown, setShowTeam2Dropdown] = useState(false)

  useEffect(() => {
    console.log('CompetitionsManagement: Component mounted, loading competitions...')
    loadCompetitions()
    loadTeams()
  }, [])

  const loadTeams = async () => {
    try {
      const data = await teamsAPI.getAll()
      setTeams(data || [])
    } catch (err) {
      console.error('Error loading teams:', err)
      setTeams([])
    }
  }

  useEffect(() => {
    if (selectedCompetition?.id) {
      loadMatches(String(selectedCompetition.id))
    } else {
      setMatches([])
    }
  }, [selectedCompetition?.id])

  const loadCompetitions = async () => {
    try {
      setLoading(true)
      const data = await competitionsAPI.getAll()
      setCompetitions(data || [])
    } catch (err) {
      console.error('Error loading competitions:', err)
      setCompetitions([]) // Set empty array on error
    } finally {
      setLoading(false)
    }
  }

  const loadMatches = async (competitionId) => {
    if (!competitionId) {
      setMatches([])
      return
    }
    try {
      const data = await matchesAPI.getAll(String(competitionId))
      setMatches(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('Error loading matches:', err)
      setMatches([])
    }
  }

  const handleDeleteMatch = async (matchId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Match',
      message: 'Are you sure you want to delete this match? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await matchesAPI.delete(matchId)
          setConfirmDialog(null)
          setNotification({ message: 'Match deleted successfully!', type: 'success' })
          // Reload matches after deletion
          if (selectedCompetition) {
            loadMatches(selectedCompetition.id)
          }
        } catch (err) {
          console.error('Error deleting match:', err)
          setConfirmDialog(null)
          setNotification({ message: 'Error deleting match: ' + (err.message || 'Please check your connection and try again'), type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const handleCreateCompetition = async (e) => {
    e.preventDefault()
    try {
      // Clean up form data - remove empty strings for optional fields
      const cleanData = {
        name: formData.name,
        description: formData.description || null,
        location: formData.location || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status
      }
      await competitionsAPI.create(cleanData)
      setShowCreateForm(false)
      setFormData({
        name: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        status: 'upcoming'
      })
      loadCompetitions()
      setNotification({ message: 'Competition created successfully!', type: 'success' })
    } catch (err) {
      console.error('Error creating competition:', err)
      setNotification({ message: 'Error creating competition: ' + (err.message || 'Please check your connection and try again'), type: 'error' })
    }
  }

  const handleCreateMatch = async (e) => {
    e.preventDefault()
    try {
      if (!matchFormData.team1_id) {
        setNotification({ message: 'Please select at least Team 1', type: 'error' })
        return
      }
      const payload = {
        ...matchFormData,
        competition_id: typeof selectedCompetition.id === 'string' ? selectedCompetition.id : String(selectedCompetition.id),
        team1_id: matchFormData.team1_id || null,
        team2_id: matchFormData.team2_id || null,
        duration_minutes: parseInt(matchFormData.duration_minutes) || 0,
        round_number: matchFormData.round_number ? parseInt(matchFormData.round_number) : null
      }
      await matchesAPI.create(payload)
      setShowMatchForm(false)
      setMatchFormData({
        competition_id: '',
        team1_id: '',
        team2_id: '',
        match_name: '',
        match_date: '',
        duration_minutes: 0,
        round_number: '',
        stage: '',
        status: 'scheduled'
      })
      setTeam1Search('')
      setTeam2Search('')
      loadMatches(selectedCompetition.id)
      setNotification({ message: 'Match created successfully!', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Error creating match: ' + err.message, type: 'error' })
    }
  }

  const filteredTeams1 = teams.filter(team => 
    team.name.toLowerCase().includes(team1Search.toLowerCase())
  )
  const filteredTeams2 = teams.filter(team => 
    team.name.toLowerCase().includes(team2Search.toLowerCase())
  )

  const getTeamName = (teamId) => {
    const team = teams.find(t => t.id === teamId)
    return team ? team.name : ''
  }

  const handleEditCompetition = (competition) => {
    setEditingCompetition(competition)
    setFormData({
      name: competition.name || '',
      description: competition.description || '',
      location: competition.location || '',
      start_date: competition.start_date ? competition.start_date.split('T')[0] : '',
      end_date: competition.end_date ? competition.end_date.split('T')[0] : '',
      status: competition.status || 'upcoming'
    })
    setShowEditForm(true)
  }

  const handleUpdateCompetition = async (e) => {
    e.preventDefault()
    try {
      const cleanData = {
        name: formData.name,
        description: formData.description || null,
        location: formData.location || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: formData.status
      }
      await competitionsAPI.update(editingCompetition.id, cleanData)
      setShowEditForm(false)
      setEditingCompetition(null)
      setFormData({
        name: '',
        description: '',
        location: '',
        start_date: '',
        end_date: '',
        status: 'upcoming'
      })
      loadCompetitions()
      // Update selected competition if it was the one being edited
      if (selectedCompetition?.id === editingCompetition.id) {
        const updated = await competitionsAPI.getById(editingCompetition.id)
        setSelectedCompetition(updated)
      }
      setNotification({ message: 'Competition updated successfully!', type: 'success' })
    } catch (err) {
      console.error('Error updating competition:', err)
      setNotification({ message: 'Error updating competition: ' + (err.message || 'Please check your connection and try again'), type: 'error' })
    }
  }

  const handleDeleteCompetition = async (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Competition',
      message: 'Are you sure you want to delete this competition? This will also delete all associated matches. This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await competitionsAPI.delete(id)
          if (selectedCompetition?.id === id) {
            setSelectedCompetition(null)
            setMatches([])
          }
          loadCompetitions()
          setConfirmDialog(null)
          setNotification({ message: 'Competition deleted successfully!', type: 'success' })
        } catch (err) {
          setConfirmDialog(null)
          setNotification({ message: 'Error deleting competition: ' + err.message, type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
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
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading...</p>
      </div>
    )
  }

  return (
    <>
      <style>{inputPlaceholderStyle}</style>
      <div style={{ 
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
        padding: '2rem', 
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
        
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.1) 0%, rgba(0, 255, 200, 0.1) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 255, 255, 0.2)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
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
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(108, 117, 125, 0.4), 0 0 20px rgba(108, 117, 125, 0.2)',
              transition: 'all 0.3s'
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
          <h1 style={{ 
            margin: 0, 
            color: '#00ffff',
            fontSize: '2rem',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            letterSpacing: '2px',
            fontFamily: '"Orbitron", "Arial Black", sans-serif'
          }}>
            COMPETITIONS MANAGEMENT
          </h1>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
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
            boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)'
            e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6), 0 0 30px rgba(0, 255, 136, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)'
          }}
        >
          + Create Competition
        </button>
      </div>

      {/* Create Competition Form */}
      {showCreateForm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 25px rgba(0, 255, 255, 0.15)',
            backdropFilter: 'blur(10px)',
            width: '90%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            color: '#ffffff'
          }}>
            <h2 style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              color: '#00ffff',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
              letterSpacing: '1px',
              fontFamily: '"Orbitron", sans-serif',
              textAlign: 'center'
            }}>Create New Competition</h2>
            <form onSubmit={handleCreateCompetition}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Competition Name <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s'
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
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    minHeight: '100px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s',
                    fontFamily: 'inherit'
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
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s'
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
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#00ffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s'
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
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#00ffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s'
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
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s'
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
                  <option value="upcoming" style={{ color: '#000', background: '#fff' }}>Upcoming</option>
                  <option value="ongoing" style={{ color: '#000', background: '#fff' }}>Ongoing</option>
                  <option value="completed" style={{ color: '#000', background: '#fff' }}>Completed</option>
                  <option value="cancelled" style={{ color: '#000', background: '#fff' }}>Cancelled</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                    color: '#0a0e27',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6), 0 0 30px rgba(0, 255, 136, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)'
                  }}
                >
                  ✅ Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(108, 117, 125, 0.4), 0 0 20px rgba(108, 117, 125, 0.2)',
                    transition: 'all 0.3s'
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
                  ❌ Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Competition Modal */}
      {showEditForm && editingCompetition && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)'
        }}
        onClick={() => {
          setShowEditForm(false)
          setEditingCompetition(null)
        }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 25px rgba(0, 255, 255, 0.15)',
              backdropFilter: 'blur(10px)',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflowY: 'auto',
              color: '#ffffff'
            }}
          >
            <h2 style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              color: '#00ffff',
              fontSize: '1.8rem',
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
              letterSpacing: '1px',
              fontFamily: '"Orbitron", sans-serif',
              textAlign: 'center'
            }}>Edit Competition</h2>
            <form onSubmit={handleUpdateCompetition}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Competition Name <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s'
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
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    minHeight: '100px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    resize: 'vertical',
                    transition: 'all 0.3s',
                    fontFamily: 'inherit'
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
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s'
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
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#00ffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}>
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s'
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
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#00ffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}>
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: 'rgba(0, 255, 255, 0.1)',
                      border: '1px solid rgba(0, 255, 255, 0.3)',
                      borderRadius: '8px',
                      color: '#ffffff',
                      fontSize: '1rem',
                      outline: 'none',
                      transition: 'all 0.3s'
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
                </div>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: 'rgba(0, 255, 255, 0.1)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '1rem',
                    outline: 'none',
                    transition: 'all 0.3s'
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
                  <option value="upcoming" style={{ color: '#000', background: '#fff' }}>Upcoming</option>
                  <option value="ongoing" style={{ color: '#000', background: '#fff' }}>Ongoing</option>
                  <option value="completed" style={{ color: '#000', background: '#fff' }}>Completed</option>
                  <option value="cancelled" style={{ color: '#000', background: '#fff' }}>Cancelled</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                    color: '#0a0e27',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6), 0 0 30px rgba(0, 255, 136, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)'
                  }}
                >
                  Update Competition
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingCompetition(null)
                    setFormData({
                      name: '',
                      description: '',
                      location: '',
                      start_date: '',
                      end_date: '',
                      status: 'upcoming'
                    })
                  }}
                  style={{
                    flex: 1,
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4), 0 0 20px rgba(255, 107, 107, 0.2)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6), 0 0 30px rgba(255, 107, 107, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4), 0 0 20px rgba(255, 107, 107, 0.2)'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
        {/* Competitions List */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{
            marginTop: 0,
            marginBottom: '1.5rem',
            color: '#00ffff',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
            letterSpacing: '1px',
            fontFamily: '"Orbitron", sans-serif'
          }}>Competitions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {competitions.map(comp => (
              <div
                key={comp.id}
                onClick={() => {
                  setSelectedCompetition(comp)
                  loadMatches(comp.id)
                }}
                style={{
                  padding: '1.5rem',
                  background: selectedCompetition?.id === comp.id
                    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 150, 255, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 150, 255, 0.05) 0%, rgba(0, 255, 200, 0.05) 100%)',
                  border: selectedCompetition?.id === comp.id
                    ? '2px solid #00ffff'
                    : '1px solid rgba(0, 255, 255, 0.2)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: selectedCompetition?.id === comp.id
                    ? '0 0 20px rgba(0, 255, 255, 0.5), inset 0 0 15px rgba(0, 255, 255, 0.3)'
                    : '0 4px 15px rgba(0, 0, 0, 0.2)'
                }}
                onMouseEnter={(e) => {
                  if (selectedCompetition?.id !== comp.id) {
                    e.currentTarget.style.transform = 'translateY(-5px)'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.3)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCompetition?.id !== comp.id) {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)'
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{
                      margin: '0 0 0.5rem 0',
                      color: '#00ffff',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                      wordWrap: 'break-word',
                      overflowWrap: 'break-word',
                      maxWidth: '100%'
                    }}>{comp.name}</h3>
                    {comp.location && (
                      <p style={{
                        margin: '0 0 0.75rem 0',
                        color: '#a0e0ff',
                        fontSize: '0.9rem'
                      }}>
                        📍 {comp.location}
                      </p>
                    )}
                    <span style={{
                      padding: '0.4rem 0.8rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: comp.status === 'completed' ? '#00ff88' :
                        comp.status === 'ongoing' ? '#ffaa00' :
                          comp.status === 'upcoming' ? '#0099ff' : '#ff6b6b',
                      color: '#0a0e27',
                      display: 'inline-block',
                      marginTop: '0.5rem',
                      boxShadow: `0 0 10px ${comp.status === 'completed' ? 'rgba(0, 255, 136, 0.6)' :
                        comp.status === 'ongoing' ? 'rgba(255, 170, 0, 0.6)' :
                          comp.status === 'upcoming' ? 'rgba(0, 153, 255, 0.6)' : 'rgba(255, 107, 107, 0.6)'}`
                    }}>
                      {comp.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditCompetition(comp)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 10px rgba(0, 153, 255, 0.4)',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)'
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 153, 255, 0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)'
                        e.target.style.boxShadow = '0 2px 10px rgba(0, 153, 255, 0.4)'
                      }}
                    >
                      Manage
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCompetition(comp.id)
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 'bold',
                        boxShadow: '0 2px 10px rgba(255, 107, 107, 0.4)',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'scale(1.05)'
                        e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.6)'
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'scale(1)'
                        e.target.style.boxShadow = '0 2px 10px rgba(255, 107, 107, 0.4)'
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Matches Section */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
          padding: '2rem',
          borderRadius: '16px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          {selectedCompetition ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{
                  margin: 0,
                  color: '#00ffff',
                  fontSize: '1.8rem',
                  fontWeight: 'bold',
                  textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                  letterSpacing: '1px',
                  fontFamily: '"Orbitron", sans-serif',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word',
                  maxWidth: '100%'
                }}>
                  Matches - {selectedCompetition.name}
                </h2>
                <button
                  onClick={() => setShowMatchForm(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(0, 153, 255, 0.4), 0 0 20px rgba(0, 153, 255, 0.2)',
                    transition: 'all 0.3s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'scale(1.05)'
                    e.target.style.boxShadow = '0 6px 20px rgba(0, 153, 255, 0.6), 0 0 30px rgba(0, 153, 255, 0.3)'
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'scale(1)'
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 153, 255, 0.4), 0 0 20px rgba(0, 153, 255, 0.2)'
                  }}
                >
                  + Add Match
                </button>
              </div>

              {/* Create Match Form */}
              {showMatchForm && (
                <div style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000
                }}>
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
                    padding: '2.5rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3), inset 0 0 25px rgba(0, 255, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                    width: '90%',
                    maxWidth: '700px',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    color: '#ffffff'
                  }}>
                    <h2 style={{
                      marginTop: 0,
                      marginBottom: '1.5rem',
                      color: '#00ffff',
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
                      letterSpacing: '1px',
                      fontFamily: '"Orbitron", sans-serif',
                      textAlign: 'center'
                    }}>Create New Match</h2>
                    <form onSubmit={handleCreateMatch}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.75rem',
                            color: '#00ffff',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                          }}>
                            👥 Team 1 <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              required
                              value={team1Search || getTeamName(matchFormData.team1_id)}
                              onChange={(e) => {
                                setTeam1Search(e.target.value)
                                setShowTeam1Dropdown(true)
                                if (!e.target.value) {
                                  setMatchFormData({ ...matchFormData, team1_id: '' })
                                }
                              }}
                              onFocus={() => setShowTeam1Dropdown(true)}
                              placeholder="Search for team..."
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(0, 255, 255, 0.1)',
                                border: '1px solid rgba(0, 255, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.3s'
                              }}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                                e.target.style.boxShadow = 'none'
                                setTimeout(() => setShowTeam1Dropdown(false), 200)
                              }}
                            />
                            {showTeam1Dropdown && filteredTeams1.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '0.25rem',
                                background: 'rgba(10, 14, 39, 0.95)',
                                border: '1px solid rgba(0, 255, 255, 0.5)',
                                borderRadius: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                              }}>
                                {filteredTeams1.map(team => (
                                  <div
                                    key={team.id}
                                    onClick={() => {
                                      setMatchFormData({ ...matchFormData, team1_id: team.id })
                                      setTeam1Search(team.name)
                                      setShowTeam1Dropdown(false)
                                    }}
                                    style={{
                                      padding: '0.75rem',
                                      cursor: 'pointer',
                                      color: '#ffffff',
                                      borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.background = 'rgba(0, 255, 255, 0.2)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.background = 'transparent'
                                    }}
                                  >
                                    {team.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ position: 'relative' }}>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.75rem',
                            color: '#00ffff',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                          }}>
                            👥 Team 2 <span style={{ color: '#a0e0ff', fontSize: '0.85rem' }}>(optional – leave empty for solo round)</span>
                          </label>
                          <div style={{ position: 'relative' }}>
                            <input
                              type="text"
                              value={team2Search || getTeamName(matchFormData.team2_id)}
                              onChange={(e) => {
                                setTeam2Search(e.target.value)
                                setShowTeam2Dropdown(true)
                                if (!e.target.value) {
                                  setMatchFormData({ ...matchFormData, team2_id: '' })
                                }
                              }}
                              onFocus={() => setShowTeam2Dropdown(true)}
                              placeholder="Search for team..."
                              style={{
                                width: '100%',
                                padding: '0.75rem',
                                background: 'rgba(0, 255, 255, 0.1)',
                                border: '1px solid rgba(0, 255, 255, 0.3)',
                                borderRadius: '8px',
                                color: '#ffffff',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: 'all 0.3s'
                              }}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.4)'
                              }}
                              onBlur={(e) => {
                                e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                                e.target.style.boxShadow = 'none'
                                setTimeout(() => setShowTeam2Dropdown(false), 200)
                              }}
                            />
                            {showTeam2Dropdown && filteredTeams2.length > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '0.25rem',
                                background: 'rgba(10, 14, 39, 0.95)',
                                border: '1px solid rgba(0, 255, 255, 0.5)',
                                borderRadius: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
                              }}>
                                {filteredTeams2.map(team => (
                                  <div
                                    key={team.id}
                                    onClick={() => {
                                      setMatchFormData({ ...matchFormData, team2_id: team.id })
                                      setTeam2Search(team.name)
                                      setShowTeam2Dropdown(false)
                                    }}
                                    style={{
                                      padding: '0.75rem',
                                      cursor: 'pointer',
                                      color: '#ffffff',
                                      borderBottom: '1px solid rgba(0, 255, 255, 0.1)',
                                      transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.background = 'rgba(0, 255, 255, 0.2)'
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.background = 'transparent'
                                    }}
                                  >
                                    {team.name}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.75rem',
                          color: '#00ffff',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                        }}>
                          🏆 Match Name
                        </label>
                        <input
                          type="text"
                          value={matchFormData.match_name}
                          onChange={(e) => setMatchFormData({ ...matchFormData, match_name: e.target.value })}
                          placeholder="e.g., Quarterfinal, Semifinal, Final"
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'all 0.3s'
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
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.75rem',
                            color: '#00ffff',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                          }}>
                            📅 Match Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={matchFormData.match_date}
                            onChange={(e) => setMatchFormData({ ...matchFormData, match_date: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(0, 255, 255, 0.1)',
                              border: '1px solid rgba(0, 255, 255, 0.3)',
                              borderRadius: '8px',
                              color: '#ffffff',
                              fontSize: '1rem',
                              outline: 'none',
                              transition: 'all 0.3s'
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
                        </div>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.75rem',
                            color: '#00ffff',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                          }}>
                            ⏱️ Duration (minutes)
                          </label>
                          <input
                            type="number"
                            value={matchFormData.duration_minutes}
                            onChange={(e) => setMatchFormData({ ...matchFormData, duration_minutes: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(0, 255, 255, 0.1)',
                              border: '1px solid rgba(0, 255, 255, 0.3)',
                              borderRadius: '8px',
                              color: '#ffffff',
                              fontSize: '1rem',
                              outline: 'none',
                              transition: 'all 0.3s'
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
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div>
                          <label style={{
                            display: 'block',
                            marginBottom: '0.75rem',
                            color: '#00ffff',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                          }}>
                            🔢 Round Number
                          </label>
                          <input
                            type="number"
                            value={matchFormData.round_number}
                            onChange={(e) => setMatchFormData({ ...matchFormData, round_number: e.target.value })}
                            style={{
                              width: '100%',
                              padding: '0.75rem',
                              background: 'rgba(0, 255, 255, 0.1)',
                              border: '1px solid rgba(0, 255, 255, 0.3)',
                              borderRadius: '8px',
                              color: '#ffffff',
                              fontSize: '1rem',
                              outline: 'none',
                              transition: 'all 0.3s'
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
                        </div>
                      </div>
                      <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{
                          display: 'block',
                          marginBottom: '0.75rem',
                          color: '#00ffff',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                        }}>
                          📊 Status
                        </label>
                        <select
                          value={matchFormData.status}
                          onChange={(e) => setMatchFormData({ ...matchFormData, status: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            background: 'rgba(0, 255, 255, 0.1)',
                            border: '1px solid rgba(0, 255, 255, 0.3)',
                            borderRadius: '8px',
                            color: '#ffffff',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'all 0.3s'
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
                          <option value="scheduled" style={{ color: '#000', background: '#fff' }}>Scheduled</option>
                          <option value="live" style={{ color: '#000', background: '#fff' }}>Live</option>
                          <option value="completed" style={{ color: '#000', background: '#fff' }}>Completed</option>
                          <option value="cancelled" style={{ color: '#000', background: '#fff' }}>Cancelled</option>
                          <option value="paused" style={{ color: '#000', background: '#fff' }}>Paused</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                        <button
                          type="submit"
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                            color: '#0a0e27',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            boxShadow: '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)',
                            transition: 'all 0.3s'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.05)'
                            e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6), 0 0 30px rgba(0, 255, 136, 0.3)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)'
                            e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)'
                          }}
                        >
                          ✅ Create Match
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowMatchForm(false)
                            setTeam1Search('')
                            setTeam2Search('')
                            setMatchFormData({
                              competition_id: '',
                              team1_id: '',
                              team2_id: '',
                              match_name: '',
                              match_date: '',
                              duration_minutes: 0,
                              round_number: '',
                              stage: '',
                              status: 'scheduled'
                            })
                          }}
                          style={{
                            flex: 1,
                            padding: '0.75rem 1.5rem',
                            background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            fontSize: '1rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            boxShadow: '0 4px 15px rgba(108, 117, 125, 0.4), 0 0 20px rgba(108, 117, 125, 0.2)',
                            transition: 'all 0.3s'
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
                          ❌ Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {matches.length === 0 ? (
                  <p style={{
                    color: '#a0e0ff',
                    textAlign: 'center',
                    padding: '2rem',
                    fontSize: '1.1rem',
                    fontStyle: 'italic'
                  }}>
                    No matches yet. Create one to get started!
                  </p>
                ) : (
                  matches.map(match => (
                    <div
                      key={match.id}
                      style={{
                        padding: '1.5rem',
                        background: 'rgba(0, 255, 255, 0.05)',
                        border: '1px solid rgba(0, 255, 255, 0.2)',
                        borderRadius: '12px',
                        transition: 'all 0.3s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
                        e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.4)'
                        e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 255, 255, 0.05)'
                        e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.2)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{
                            margin: '0 0 0.75rem 0',
                            color: '#00ffff',
                            fontSize: '1.3rem',
                            fontWeight: 'bold',
                            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            maxWidth: '100%'
                          }}>
                            {match.match_name || (match.team2_id ? `${match.team1?.name || 'Team 1'} vs ${match.team2?.name || 'Team 2'}` : (match.team1?.name || 'Solo round'))}
                          </h3>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                            {match.team1 && (
                              <span style={{
                                color: '#a0e0ff',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                              }}>
                                👤 {match.team1.name}
                              </span>
                            )}
                            {match.team2 && (
                              <span style={{
                                color: '#a0e0ff',
                                fontSize: '0.9rem',
                                fontWeight: '500'
                              }}>
                                👤 {match.team2.name}
                              </span>
                            )}
                          </div>
                          {match.results?.filter(r => r.completion_time_milliseconds != null && r.completion_time_milliseconds > 0).map(r => (
                            <p key={r.id} style={{ margin: '0.5rem 0', color: '#00ff88', fontSize: '0.95rem', fontWeight: '600' }}>
                              ⏱️ {r.team_id === match.team1_id ? (match.team1_name || match.team1?.name || 'Team 1') : (match.team2_name || match.team2?.name || 'Team 2')}: {(() => {
                                const ms = r.completion_time_milliseconds
                                const min = Math.floor(ms / 60000)
                                const s = Math.floor((ms % 60000) / 1000)
                                const mm = ms % 1000
                                return `${min}:${s.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
                              })()}
                            </p>
                          ))}
                          {(!match.results?.length || !match.results.some(r => r.completion_time_milliseconds > 0)) && match.completion_time_milliseconds != null && match.completion_time_milliseconds > 0 && (
                            <p style={{ margin: '0.5rem 0', color: '#00ff88', fontSize: '0.95rem', fontWeight: '600' }}>
                              ⏱️ Time: {(() => {
                                const ms = match.completion_time_milliseconds
                                const min = Math.floor(ms / 60000)
                                const s = Math.floor((ms % 60000) / 1000)
                                const mm = ms % 1000
                                return `${min}:${s.toString().padStart(2, '0')}:${mm.toString().padStart(3, '0')}`
                              })()}
                            </p>
                          )}
                          {match.match_date && (
                            <p style={{
                              margin: '0.5rem 0',
                              color: '#a0e0ff',
                              fontSize: '0.9rem'
                            }}>
                              📅 {new Date(match.match_date).toLocaleString()}
                            </p>
                          )}
                          {match.duration_minutes > 0 && (
                            <p style={{
                              margin: '0.5rem 0',
                              color: '#a0e0ff',
                              fontSize: '0.9rem'
                            }}>
                              ⏱️ Duration: {match.duration_minutes} minutes
                            </p>
                          )}
                          <span style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            textTransform: 'uppercase',
                            backgroundColor: match.status === 'completed' ? '#00ff88' :
                              match.status === 'live' ? '#ffaa00' :
                                match.status === 'scheduled' ? '#0099ff' : '#ff6b6b',
                            color: '#0a0e27',
                            display: 'inline-block',
                            marginTop: '0.5rem',
                            boxShadow: `0 0 10px ${match.status === 'completed' ? 'rgba(0, 255, 136, 0.6)' :
                              match.status === 'live' ? 'rgba(255, 170, 0, 0.6)' :
                                match.status === 'scheduled' ? 'rgba(0, 153, 255, 0.6)' : 'rgba(255, 107, 107, 0.6)'}`
                          }}>
                            {match.status}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <button
                            onClick={() => window.location.href = `/match/${match.id}`}
                            style={{
                              padding: '0.75rem 1.5rem',
                              background: 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              boxShadow: '0 4px 15px rgba(0, 153, 255, 0.4), 0 0 20px rgba(0, 153, 255, 0.2)',
                              transition: 'all 0.3s',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              minWidth: '100px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.05)'
                              e.target.style.boxShadow = '0 6px 20px rgba(0, 153, 255, 0.6), 0 0 30px rgba(0, 153, 255, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)'
                              e.target.style.boxShadow = '0 4px 15px rgba(0, 153, 255, 0.4), 0 0 20px rgba(0, 153, 255, 0.2)'
                            }}
                          >
                            Manage
                          </button>
                          <button
                            onClick={() => handleDeleteMatch(match.id)}
                            style={{
                              padding: '0.75rem 1.5rem',
                              background: 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '8px',
                              fontSize: '0.9rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              boxShadow: '0 4px 15px rgba(255, 107, 107, 0.4), 0 0 20px rgba(255, 107, 107, 0.2)',
                              transition: 'all 0.3s',
                              whiteSpace: 'nowrap',
                              width: '100%',
                              minWidth: '100px'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.transform = 'scale(1.05)'
                              e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.6), 0 0 30px rgba(255, 107, 107, 0.3)'
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.transform = 'scale(1)'
                              e.target.style.boxShadow = '0 4px 15px rgba(255, 107, 107, 0.4), 0 0 20px rgba(255, 107, 107, 0.2)'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: '#a0e0ff',
              fontSize: '1.2rem',
              fontStyle: 'italic'
            }}>
              <p>Select a competition to view and manage matches</p>
            </div>
          )}
        </div>
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
        confirmText="Delete"
        cancelText="Cancel"
      />
    </>
  )
}

export default CompetitionsManagement

