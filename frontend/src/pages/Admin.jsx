import React, { useState, useEffect } from 'react'
import { adminAPI, authAPI } from '../services/api'
import Notification from '../components/Notification'
import ConfirmDialog from '../components/ConfirmDialog'

function Admin() {
  const [dashboard, setDashboard] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [currentUser, setCurrentUser] = useState(null)
  const [notification, setNotification] = useState(null)
  const [confirmDialog, setConfirmDialog] = useState(null)
  const [editingUser, setEditingUser] = useState(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [createFormData, setCreateFormData] = useState({
    username: '',
    email: '',
    password: ''
  })

  useEffect(() => {
    loadAdminData()
  }, [])

  const loadAdminData = async () => {
    try {
      setLoading(true)
      const [dashboardData, usersData, userData] = await Promise.all([
        adminAPI.getDashboard(),
        adminAPI.getUsers(),
        authAPI.getCurrentUser()
      ])
      setDashboard(dashboardData)
      setUsers(usersData)
      setCurrentUser(userData)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authAPI.logout()
    window.location.href = '/login'
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setUserFormData({
      username: user.username || '',
      email: user.email || '',
      password: ''
    })
    setShowEditForm(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    try {
      const updateData = {
        username: userFormData.username,
        email: userFormData.email || null
      }
      if (userFormData.password) {
        updateData.password = userFormData.password
      }
      
      await adminAPI.updateUser(editingUser.id, updateData)
      setShowEditForm(false)
      setEditingUser(null)
      setUserFormData({ username: '', email: '', password: '' })
      loadAdminData()
      setNotification({ message: 'User updated successfully!', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Error updating user: ' + (err.message || 'Unknown error'), type: 'error' })
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    try {
      await adminAPI.createUser({
        username: createFormData.username.trim(),
        password: createFormData.password,
        email: createFormData.email.trim() || null,
        role: 'judge'  // judge = admin, no role selection when creating
      })
      setShowCreateForm(false)
      setCreateFormData({ username: '', email: '', password: '' })
      loadAdminData()
      setNotification({ message: 'User created successfully! They can now log in.', type: 'success' })
    } catch (err) {
      setNotification({ message: 'Error creating user: ' + (err.message || 'Unknown error'), type: 'error' })
    }
  }

  const handleDeleteUser = (user) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete User Account',
      message: `Are you sure you want to delete user "${user.username}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          await adminAPI.deleteUser(user.id)
          setConfirmDialog(null)
          loadAdminData()
          setNotification({ message: 'User deleted successfully!', type: 'success' })
        } catch (err) {
          setConfirmDialog(null)
          setNotification({ message: 'Error deleting user: ' + (err.message || 'Unknown error'), type: 'error' })
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
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading admin dashboard</p>
      </div>
    )
  }

  if (error) {
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
        <p style={{ color: '#ff6b6b', fontSize: '1.1rem', fontWeight: 'bold' }}>Error: {error}</p>
        <button onClick={handleLogout} style={{
          padding: '0.75rem 1.5rem',
          background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          boxShadow: '0 4px 15px rgba(255, 68, 68, 0.4)',
          transition: 'all 0.3s'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)'
          e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.6)'
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)'
          e.target.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.4)'
        }}
        >
          Logout
        </button>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
      padding: '2rem', 
      maxWidth: '1200px', 
      margin: '0 auto' 
    }}>
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
        <div>
          <h1 style={{ 
            margin: 0, 
            color: '#00ffff',
            fontSize: '2rem',
            fontWeight: 'bold',
            textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
            letterSpacing: '2px',
            fontFamily: '"Orbitron", "Arial Black", sans-serif'
          }}>
            ADMIN DASHBOARD
          </h1>
          {currentUser && (
            <p style={{ margin: '0.5rem 0 0 0', color: '#a0e0ff', fontSize: '0.9rem' }}>
              Logged in as: <strong style={{ color: '#00ffff' }}>{currentUser.username}</strong> ({currentUser.email})
            </p>
          )}
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => window.location.href = '/competitions-management'}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #00ffff 0%, #0099ff 100%)',
              color: '#0a0e27',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(0, 255, 255, 0.4), 0 0 20px rgba(0, 255, 255, 0.2)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 255, 0.6), 0 0 30px rgba(0, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 255, 0.4), 0 0 20px rgba(0, 255, 255, 0.2)'
            }}
          >
            Manage Competitions
          </button>
          <button
            onClick={() => window.location.href = '/team-management'}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #ffaa00 0%, #cc8800 100%)',
              color: '#0a0e27',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 6px 20px rgba(255, 170, 0, 0.6), 0 0 30px rgba(255, 170, 0, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 4px 15px rgba(255, 170, 0, 0.4), 0 0 20px rgba(255, 170, 0, 0.2)'
            }}
          >
            Team Management
          </button>
          <button
            onClick={() => window.location.href = '/statistics'}
            style={{
              padding: '0.75rem 1.5rem',
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
            Statistics
          </button>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'linear-gradient(135deg, #ff4444 0%, #cc0000 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(255, 68, 68, 0.4)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.05)'
              e.target.style.boxShadow = '0 6px 20px rgba(255, 68, 68, 0.6)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 4px 15px rgba(255, 68, 68, 0.4)'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)',
          background: 'rgba(0, 255, 255, 0.05)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: '#00ffff',
            fontSize: '1.3rem',
            fontWeight: 'bold',
            textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
            letterSpacing: '1px'
          }}>
            ALL USERS
          </h2>
          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              padding: '0.5rem 1.25rem',
              background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
              color: '#0a0e27',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '0.95rem',
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
            New account
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0, 255, 255, 0.1)' }}>
                <th style={{ 
                  padding: '1rem', 
                  textAlign: 'left', 
                  borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: '0.85rem'
                }}>
                  Username
                </th>
                <th style={{ 
                  padding: '1rem', 
                  textAlign: 'left', 
                  borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: '0.85rem'
                }}>
                  Email
                </th>
                <th style={{ 
                  padding: '1rem', 
                  textAlign: 'left', 
                  borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: '0.85rem'
                }}>
                  Role
                </th>
                <th style={{ 
                  padding: '1rem', 
                  textAlign: 'left', 
                  borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: '0.85rem'
                }}>
                  Created At
                </th>
                <th style={{ 
                  padding: '1rem', 
                  textAlign: 'left', 
                  borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  fontSize: '0.85rem'
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <tr key={user.id} style={{
                  borderBottom: index < users.length - 1 ? '1px solid rgba(0, 255, 255, 0.2)' : 'none',
                  background: index % 2 === 0 ? 'rgba(0, 255, 255, 0.02)' : 'transparent'
                }}>
                  <td style={{ padding: '1rem', color: '#ffffff' }}>{user.username}</td>
                  <td style={{ padding: '1rem', color: '#a0e0ff' }}>{user.email || '-'}</td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: '500',
                      background: user.role === 'admin' 
                        ? 'rgba(0, 255, 136, 0.2)' 
                        : user.role === 'judge' 
                        ? 'rgba(255, 170, 0, 0.2)' 
                        : 'rgba(0, 153, 255, 0.2)',
                      color: user.role === 'admin' 
                        ? '#00ff88' 
                        : user.role === 'judge' 
                        ? '#ffaa00' 
                        : '#0099ff',
                      border: `1px solid ${user.role === 'admin' 
                        ? 'rgba(0, 255, 136, 0.4)' 
                        : user.role === 'judge' 
                        ? 'rgba(255, 170, 0, 0.4)' 
                        : 'rgba(0, 153, 255, 0.4)'}`,
                      textShadow: `0 0 5px ${user.role === 'admin' 
                        ? 'rgba(0, 255, 136, 0.5)' 
                        : user.role === 'judge' 
                        ? 'rgba(255, 170, 0, 0.5)' 
                        : 'rgba(0, 153, 255, 0.5)'}`
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#a0e0ff' }}>
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEditUser(user)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 8px rgba(0, 153, 255, 0.4)',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)'
                          e.target.style.boxShadow = '0 4px 12px rgba(0, 153, 255, 0.6)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = '0 2px 8px rgba(0, 153, 255, 0.4)'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        style={{
                          padding: '0.4rem 0.8rem',
                          background: 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          boxShadow: '0 2px 8px rgba(255, 107, 107, 0.4)',
                          transition: 'all 0.3s'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'scale(1.05)'
                          e.target.style.boxShadow = '0 4px 12px rgba(255, 107, 107, 0.6)'
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'scale(1)'
                          e.target.style.boxShadow = '0 2px 8px rgba(255, 107, 107, 0.4)'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
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
              New account
            </h2>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Username <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={createFormData.username}
                  onChange={(e) => setCreateFormData({ ...createFormData, username: e.target.value })}
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
                  Password <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span> (min. 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createFormData.password}
                  onChange={(e) => setCreateFormData({ ...createFormData, password: e.target.value })}
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
                  Email
                </label>
                <input
                  type="email"
                  value={createFormData.email}
                  onChange={(e) => setCreateFormData({ ...createFormData, email: e.target.value })}
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
              <div style={{ display: 'flex', gap: '1rem' }}>
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
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateFormData({ username: '', email: '', password: '' })
                  }}
                  style={{
                    flex: 1,
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
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditForm && editingUser && (
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
              Edit User Account
            </h2>
            <form onSubmit={handleUpdateUser}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{
                  display: 'block',
                  marginBottom: '0.75rem',
                  color: '#00ffff',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
                }}>
                  Username <span style={{ color: '#ff6b6b', fontSize: '0.9rem' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={userFormData.username}
                  onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
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
                  Email
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
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
                  New Password (leave empty to keep current)
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Enter new password..."
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

              <div style={{ display: 'flex', gap: '1rem' }}>
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
                  Update
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false)
                    setEditingUser(null)
                    setUserFormData({ username: '', email: '', password: '' })
                  }}
                  style={{
                    flex: 1,
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
    </div>
  )
}

export default Admin

