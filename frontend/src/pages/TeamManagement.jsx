import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { teamsAPI, userTeamsAPI, adminAPI, getToken } from '../services/api'
import Notification from '../components/Notification'
import ConfirmDialog from '../components/ConfirmDialog'

function TeamManagement() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState(null)
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [showUserAssignment, setShowUserAssignment] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    code: ''
  })

  useEffect(() => {
    const token = getToken()
    if (!token) {
      navigate('/login')
      return
    }
    loadTeams()
    loadUsers()
  }, [navigate])

  const loadTeams = async () => {
    try {
      setLoading(true)
      const data = await teamsAPI.getAll()
      const teamsWithUsers = await Promise.all(
        (data || []).map(async (team) => {
          try {
            const teamUsers = await userTeamsAPI.getTeamUsers(team.id)
            return { ...team, users: teamUsers || [] }
          } catch (err) {
            return { ...team, users: [] }
          }
        })
      )
      setTeams(teamsWithUsers)
    } catch (err) {
      console.error('Error loading teams:', err)
      setNotification({ message: 'Error loading teams: ' + err.message, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const data = await adminAPI.getUsers()
      setUsers(data || [])
    } catch (err) {
      console.error('Error loading users:', err)
    }
  }

  const handleAssignUserToTeam = async (userId, teamId) => {
    try {
      await userTeamsAPI.addUserToTeam(userId, teamId)
      setNotification({ message: 'User assigned to team successfully!', type: 'success' })
      loadTeams()
      setUserSearch('')
      setShowUserDropdown(false)
    } catch (err) {
      setNotification({ message: 'Error assigning user: ' + err.message, type: 'error' })
    }
  }

  const handleRemoveUserFromTeam = async (userId, teamId) => {
    try {
      await userTeamsAPI.removeUserFromTeam(userId, teamId)
      setNotification({ message: 'User removed from team successfully!', type: 'success' })
      loadTeams()
    } catch (err) {
      setNotification({ message: 'Error removing user: ' + err.message, type: 'error' })
    }
  }

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(userSearch.toLowerCase()))
  )

  const handleCreateTeam = async (e) => {
    e.preventDefault()
    try {
      await teamsAPI.create(formData)
      setShowCreateForm(false)
      setFormData({ name: '', code: '' })
      loadTeams()
      setNotification({ message: 'Team created successfully!', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Error creating team: ' + err.message, type: 'error' })
    }
  }

  const handleUpdateTeam = async (e) => {
    e.preventDefault()
    try {
      await teamsAPI.update(editingTeam.id, formData)
      setEditingTeam(null)
      setFormData({ name: '', code: '' })
      loadTeams()
      setNotification({ message: 'Team updated successfully!', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Error updating team: ' + err.message, type: 'error' })
    }
  }

  const handleDeleteTeam = async (teamId) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Team',
      message: 'Are you sure you want to delete this team? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          await teamsAPI.delete(teamId)
          setConfirmDialog(null)
          loadTeams()
          setNotification({ message: 'Team deleted successfully!', type: 'success' })
        } catch (err) {
          setConfirmDialog(null)
          setNotification({ message: 'Error deleting team: ' + err.message, type: 'error' })
        }
      },
      onCancel: () => setConfirmDialog(null)
    })
  }

  const startEdit = (team) => {
    setEditingTeam(team)
    setFormData({ name: team.name, code: team.code || '' })
    setShowCreateForm(true)
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
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading teams...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(160, 224, 255, 0.6);
          opacity: 1;
        }
      `}</style>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
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
                👥 TEAM MANAGEMENT
              </h1>
            </div>
            <button
              onClick={() => {
                setEditingTeam(null)
                setFormData({ name: '', code: '' })
                setShowCreateForm(true)
              }}
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
              + Create Team
            </button>
          </div>

          {/* Teams List */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
            padding: '2rem',
            borderRadius: '16px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)'
          }}>
            {teams.length === 0 ? (
              <p style={{ color: '#a0e0ff', textAlign: 'center', padding: '2rem', fontSize: '1.1rem', fontStyle: 'italic' }}>
                No teams yet. Create one to get started!
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {teams.map(team => (
                  <div
                    key={team.id}
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
                    <h3 style={{
                      margin: '0 0 0.5rem 0',
                      color: '#00ffff',
                      fontSize: '1.3rem',
                      fontWeight: 'bold',
                      textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                    }}>
                      {team.name}
                    </h3>
                    {team.code && (
                      <p style={{ margin: '0 0 0.5rem 0', color: '#a0e0ff', fontSize: '0.9rem' }}>
                        Code: {team.code}
                      </p>
                    )}
                    {team.users && team.users.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <p style={{ margin: '0 0 0.5rem 0', color: '#a0e0ff', fontSize: '0.85rem', fontWeight: 'bold' }}>
                          Members ({team.users.length}):
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                          {team.users.map(user => (
                            <span
                              key={user.id}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(0, 255, 255, 0.2)',
                                border: '1px solid rgba(0, 255, 255, 0.4)',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: '#00ffff'
                              }}
                            >
                              {user.username}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                      <button
                        onClick={() => {
                          setSelectedTeam(team)
                          setShowUserAssignment(true)
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem 1rem',
                          background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                          color: '#0a0e27',
                          border: 'none',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 10px rgba(0, 255, 136, 0.4)',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.02)'
                          e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.6)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = '0 2px 10px rgba(0, 255, 136, 0.4)'
                        }}
                      >
                        + Assign Users
                      </button>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          onClick={() => startEdit(team)}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
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
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(team.id)}
                          style={{
                            flex: 1,
                            padding: '0.5rem 1rem',
                            background: 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
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
            )}
          </div>
        </div>

        {/* Create/Edit Team Form Modal */}
        {showCreateForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              maxWidth: '500px',
              width: '90%',
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
              }}>
                {editingTeam ? 'Edit Team' : 'Create New Team'}
              </h2>
              <form onSubmit={editingTeam ? handleUpdateTeam : handleCreateTeam}>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#00ffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}>
                    Team Name <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span>
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
                    Team Code (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g., T1, TEAM-A"
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
                    {editingTeam ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setEditingTeam(null)
                      setFormData({ name: '', code: '' })
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
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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

        {/* User Assignment Modal */}
        {showUserAssignment && selectedTeam && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)',
              backdropFilter: 'blur(10px)',
              maxWidth: '600px',
              width: '90%',
              maxHeight: '80vh',
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
              }}>
                Assign Users to {selectedTeam.name}
              </h2>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Search Users
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setShowUserDropdown(true)
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Search for user..."
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
                      setTimeout(() => setShowUserDropdown(false), 200)
                    }}
                  />
                  {showUserDropdown && filteredUsers.length > 0 && (
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
                      {filteredUsers
                        .filter(user => !selectedTeam.users?.some(u => u.id === user.id))
                        .map(user => (
                          <div
                            key={user.id}
                            onClick={() => {
                              handleAssignUserToTeam(user.id, selectedTeam.id)
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
                            {user.username} {user.email && `(${user.email})`}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>

              {selectedTeam.users && selectedTeam.users.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '0.75rem',
                    color: '#00ffff',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                  }}>
                    Team Members
                  </label>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    {selectedTeam.users.map(user => (
                      <div
                        key={user.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          background: 'rgba(0, 255, 255, 0.1)',
                          border: '1px solid rgba(0, 255, 255, 0.3)',
                          borderRadius: '8px'
                        }}
                      >
                        <span style={{ color: '#ffffff' }}>
                          {user.username} {user.email && `(${user.email})`}
                        </span>
                        <button
                          onClick={() => handleRemoveUserFromTeam(user.id, selectedTeam.id)}
                          style={{
                            padding: '0.25rem 0.75rem',
                            background: 'rgba(255, 68, 68, 0.3)',
                            border: '1px solid rgba(255, 68, 68, 0.5)',
                            borderRadius: '6px',
                            color: '#ff4444',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 'bold'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'rgba(255, 68, 68, 0.5)'
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'rgba(255, 68, 68, 0.3)'
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setShowUserAssignment(false)
                  setSelectedTeam(null)
                  setUserSearch('')
                }}
                style={{
                  width: '100%',
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
                  boxShadow: '0 4px 15px rgba(108, 117, 125, 0.4)',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'scale(1.02)'
                  e.target.style.boxShadow = '0 6px 20px rgba(108, 117, 125, 0.6)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'scale(1)'
                  e.target.style.boxShadow = '0 4px 15px rgba(108, 117, 125, 0.4)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default TeamManagement



