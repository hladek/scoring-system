import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminAPI } from '../services/api'

function Statistics() {
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStatistics()
  }, [])

  const loadStatistics = async () => {
    try {
      setLoading(true)
      const data = await adminAPI.getStatistics()
      setStats(data)
    } catch (err) {
      console.error('Error loading statistics:', err)
    } finally {
      setLoading(false)
    }
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
        <p style={{ color: '#00ffff', fontSize: '1.2rem', fontWeight: 'bold' }}>Loading statistics...</p>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
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
                📊 STATISTICS & ANALYTICS
              </h1>
            </div>
          </div>

          {stats && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              {/* Competitions Stats */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ color: '#00ffff', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>🏆 Competitions</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Total:</span>
                    <span style={{ color: '#00ffff', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.competitions?.total || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Upcoming:</span>
                    <span style={{ color: '#0099ff', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.competitions?.upcoming || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Ongoing:</span>
                    <span style={{ color: '#ffaa00', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.competitions?.ongoing || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Completed:</span>
                    <span style={{ color: '#00ff88', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.competitions?.completed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Matches Stats */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ color: '#00ffff', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>⚽ Matches</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Total:</span>
                    <span style={{ color: '#00ffff', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.matches?.total || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Live:</span>
                    <span style={{ color: '#ffaa00', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.matches?.live || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Scheduled:</span>
                    <span style={{ color: '#0099ff', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.matches?.scheduled || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Completed:</span>
                    <span style={{ color: '#00ff88', fontSize: '1.2rem', fontWeight: 'bold' }}>{stats.matches?.completed || 0}</span>
                  </div>
                </div>
              </div>

              {/* Teams Stats */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ color: '#00ffff', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>👥 Teams</h2>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#a0e0ff' }}>Total Teams:</span>
                  <span style={{ color: '#00ffff', fontSize: '2rem', fontWeight: 'bold' }}>{stats.teams?.total || 0}</span>
                </div>
              </div>

              {/* Results Stats */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ color: '#00ffff', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>📈 Results</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Total Results:</span>
                    <span style={{ color: '#00ffff', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.results?.total || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Average Score:</span>
                    <span style={{ color: '#00ff88', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.results?.average_score?.toFixed(1) || '0.0'}</span>
                  </div>
                </div>
              </div>

              {/* Penalties Stats */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                padding: '2rem',
                borderRadius: '16px',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}>
                <h2 style={{ color: '#00ffff', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>🟨 Penalties</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Total Penalties:</span>
                    <span style={{ color: '#00ffff', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.penalties?.total || 0}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#a0e0ff' }}>Total Points:</span>
                    <span style={{ color: '#ff6b6b', fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.penalties?.total_points || 0}</span>
                  </div>
                </div>
              </div>

              {/* Top Teams Leaderboard */}
              {stats.top_teams && stats.top_teams.length > 0 && (
                <div style={{
                  background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.8) 0%, rgba(15, 25, 40, 0.8) 100%)',
                  padding: '2rem',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 255, 255, 0.3)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 30px rgba(0, 255, 255, 0.2)',
                  backdropFilter: 'blur(10px)',
                  gridColumn: '1 / -1'
                }}>
                  <h2 style={{ color: '#00ffff', marginTop: 0, marginBottom: '1.5rem', fontSize: '1.5rem' }}>🏅 Top Teams Leaderboard</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {stats.top_teams.map((team, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '1rem',
                        background: index < 3 ? 'rgba(0, 255, 136, 0.1)' : 'rgba(0, 255, 255, 0.05)',
                        borderRadius: '8px',
                        border: index < 3 ? '1px solid rgba(0, 255, 136, 0.3)' : '1px solid rgba(0, 255, 255, 0.2)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{
                            color: index === 0 ? '#ffaa00' : index === 1 ? '#a0e0ff' : index === 2 ? '#ff6b6b' : '#a0e0ff',
                            fontSize: '1.5rem',
                            fontWeight: 'bold',
                            minWidth: '30px'
                          }}>
                            {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                          </span>
                          <span style={{ color: '#00ffff', fontSize: '1.1rem', fontWeight: 'bold' }}>{team.name}</span>
                        </div>
                        <span style={{ color: '#00ff88', fontSize: '1.3rem', fontWeight: 'bold' }}>{team.total_score} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Statistics



