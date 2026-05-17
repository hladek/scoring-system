import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useIsMobile } from '../hooks/useIsMobile'

function Login({ navigate: navProp }) {
  const navigate = navProp || useNavigate()
  const isMobile = useIsMobile()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [copied, setCopied] = useState({ username: false, password: false })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      await authAPI.login(username, password)
      navigate('/admin')
    } catch (err) {
      setError(err.message || 'Login failed. Only admins can log in.')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied({ ...copied, [type]: true })
      setTimeout(() => {
        setCopied({ ...copied, [type]: false })
      }, 2000)
    })
  }

  const fillAdminCredentials = () => {
    setUsername(ADMIN_CREDENTIALS.username)
    setPassword(ADMIN_CREDENTIALS.password)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '1rem' : '2rem'
    }}>
      <div style={{
        maxWidth: '450px',
        width: '100%',
        padding: isMobile ? '1.25rem' : '2.5rem',
        background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2), inset 0 0 20px rgba(0, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)'
      }}>
        <h2 style={{ 
          marginBottom: '1.5rem', 
          color: '#00ffff',
          fontSize: '2rem',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          letterSpacing: '2px',
          fontFamily: '"Orbitron", "Arial Black", sans-serif',
          textAlign: 'center'
        }}>
          LOGIN
        </h2>
      
        {/* Admin Credentials Display */}
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), inset 0 0 15px rgba(0, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <h3 style={{ 
            marginBottom: '0.75rem', 
            fontSize: '0.9rem', 
            color: '#00ffff',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
          }}>
            Admin Credentials (click to copy):
          </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0e0ff', minWidth: '70px', fontWeight: '500' }}>Username:</span>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(0, 255, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => copyToClipboard(ADMIN_CREDENTIALS.username, 'username')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)'
              e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.5)'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
              e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.3)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <code style={{ 
                flex: 1, 
                fontFamily: 'monospace', 
                fontSize: '0.9rem',
                color: '#00ffff',
                userSelect: 'all',
                fontWeight: 'bold',
                textShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
              }}>
                {ADMIN_CREDENTIALS.username}
              </code>
              {copied.username && (
                <span style={{ fontSize: '0.75rem', color: '#00ff88', fontWeight: 'bold', textShadow: '0 0 5px rgba(0, 255, 136, 0.8)' }}>Copied</span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#a0e0ff', minWidth: '70px', fontWeight: '500' }}>Password:</span>
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem',
              background: 'rgba(0, 255, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => copyToClipboard(ADMIN_CREDENTIALS.password, 'password')}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.2)'
              e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.5)'
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(0, 255, 255, 0.1)'
              e.currentTarget.style.border = '1px solid rgba(0, 255, 255, 0.3)'
              e.currentTarget.style.boxShadow = 'none'
            }}
            >
              <code style={{ 
                flex: 1, 
                fontFamily: 'monospace', 
                fontSize: '0.9rem',
                color: '#00ffff',
                userSelect: 'all',
                fontWeight: 'bold',
                textShadow: '0 0 5px rgba(0, 255, 255, 0.5)'
              }}>
                {ADMIN_CREDENTIALS.password}
              </code>
              {copied.password && (
                <span style={{ fontSize: '0.75rem', color: '#00ff88', fontWeight: 'bold', textShadow: '0 0 5px rgba(0, 255, 136, 0.8)' }}>Copied</span>
              )}
            </div>
          </div>
        </div>
          <button
            type="button"
            onClick={fillAdminCredentials}
            style={{
              marginTop: '0.75rem',
              width: '100%',
              padding: '0.75rem',
              background: 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '0.875rem',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              boxShadow: '0 4px 15px rgba(0, 153, 255, 0.4), 0 0 20px rgba(0, 153, 255, 0.2)',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = 'scale(1.02)'
              e.target.style.boxShadow = '0 6px 20px rgba(0, 153, 255, 0.6), 0 0 30px rgba(0, 153, 255, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = 'scale(1)'
              e.target.style.boxShadow = '0 4px 15px rgba(0, 153, 255, 0.4), 0 0 20px rgba(0, 153, 255, 0.2)'
            }}
          >
            Fill Admin Credentials
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '0.5rem', 
              color: '#a0e0ff',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}>
              Username:
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1)'
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
              marginBottom: '0.5rem', 
              color: '#a0e0ff',
              fontWeight: '500',
              fontSize: '0.9rem'
            }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '1rem',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid rgba(0, 255, 255, 0.6)'
                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3), inset 0 0 10px rgba(0, 255, 255, 0.1)'
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(0, 255, 255, 0.3)'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>
          {error && (
            <div style={{
              marginTop: '1rem',
              padding: '1rem',
              background: 'rgba(255, 68, 68, 0.2)',
              color: '#ff6b6b',
              borderRadius: '8px',
              border: '1px solid rgba(255, 68, 68, 0.4)',
              fontSize: '0.875rem',
              fontWeight: '500',
              textShadow: '0 0 5px rgba(255, 107, 107, 0.5)'
            }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem 1.5rem',
              background: loading 
                ? 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'
                : 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
              color: loading ? '#ffffff' : '#0a0e27',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading 
                ? 'none'
                : '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)',
              transition: 'all 0.3s',
              marginTop: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = 'scale(1.02)'
                e.target.style.boxShadow = '0 6px 20px rgba(0, 255, 136, 0.6), 0 0 30px rgba(0, 255, 136, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = 'scale(1)'
                e.target.style.boxShadow = '0 4px 15px rgba(0, 255, 136, 0.4), 0 0 20px rgba(0, 255, 136, 0.2)'
              }
            }}
          >
            {loading ? 'Logging in' : 'Login'}
          </button>
          
        </form>
      </div>
    </div>
  )
}

export default Login

