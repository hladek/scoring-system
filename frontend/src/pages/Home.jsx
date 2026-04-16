import React from 'react'
import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1f3a 50%, #0f1419 100%)',
      position: 'relative',
      overflow: 'hidden',
      width: '100%'
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
        pointerEvents: 'none',
        animation: 'gridMove 20s linear infinite'
      }} />

      {/* Hero Section */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        minHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        overflow: 'hidden'
      }}>
        {/* Background Images with Animation */}
        <div style={{
          position: 'absolute',
          left: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '300px',
          height: '300px',
          zIndex: 0,
          opacity: 0.3,
          animation: 'float 6s ease-in-out infinite'
        }}>
          <img 
            src="/logos/robot1.avif" 
            alt="Robot"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 30px rgba(0, 255, 255, 0.5))'
            }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </div>

        <div style={{
          position: 'absolute',
          right: '5%',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '400px',
          height: '400px',
          zIndex: 0,
          opacity: 0.2,
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '1s'
        }}>
          <img 
            src="/logos/wallpaper.jpg" 
            alt="Robot Competition"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '20px',
              filter: 'blur(2px) drop-shadow(0 0 40px rgba(0, 255, 255, 0.3))'
            }}
            onError={(e) => {
              e.target.style.display = 'none'
            }}
          />
        </div>

        {/* Main Content */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          maxWidth: '1200px',
          width: '100%',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <h1 style={{
            fontSize: '4rem',
            fontWeight: '900',
            color: '#00ffff',
            marginBottom: '1.5rem',
            textShadow: '0 0 30px rgba(0, 255, 255, 0.8), 0 0 60px rgba(0, 255, 255, 0.4)',
            letterSpacing: '3px',
            fontFamily: '"Orbitron", "Arial Black", sans-serif',
            animation: 'glow 3s ease-in-out infinite alternate'
          }}>
            ROBO COMPETITION
          </h1>
          
          <p style={{
            fontSize: '1.5rem',
            color: '#a0e0ff',
            marginBottom: '2rem',
            fontWeight: '300',
            lineHeight: '1.8',
            maxWidth: '800px',
            margin: '0 auto 2rem'
          }}>
            Live scoring system for robotics competitions with real-time updates and match statistics.
          </p>

          <div style={{
            display: 'flex',
            gap: '1.5rem',
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: '3rem'
          }}>
            <button
              onClick={() => navigate('/competitions')}
              style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #00ffff 0%, #0099ff 100%)',
                color: '#0a0e27',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)',
                transition: 'all 0.3s',
                fontFamily: '"Orbitron", sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05) translateY(-2px)'
                e.target.style.boxShadow = '0 12px 40px rgba(0, 255, 255, 0.7), 0 0 60px rgba(0, 255, 255, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1) translateY(0)'
                e.target.style.boxShadow = '0 8px 30px rgba(0, 255, 255, 0.5), 0 0 40px rgba(0, 255, 255, 0.3)'
              }}
            >
              View Competitions
            </button>
            
            <button
              onClick={() => navigate('/login')}
              style={{
                padding: '1rem 2.5rem',
                background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                color: '#0a0e27',
                border: 'none',
                borderRadius: '12px',
                fontSize: '1.1rem',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                cursor: 'pointer',
                boxShadow: '0 8px 30px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.3)',
                transition: 'all 0.3s',
                fontFamily: '"Orbitron", sans-serif'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'scale(1.05) translateY(-2px)'
                e.target.style.boxShadow = '0 12px 40px rgba(0, 255, 136, 0.7), 0 0 60px rgba(0, 255, 136, 0.5)'
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'scale(1) translateY(0)'
                e.target.style.boxShadow = '0 8px 30px rgba(0, 255, 136, 0.5), 0 0 40px rgba(0, 255, 136, 0.3)'
              }}
            >
              Admin Login
            </button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '5rem 2rem',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        <h2 style={{
          textAlign: 'center',
          fontSize: '2.5rem',
          color: '#00ffff',
          marginBottom: '3rem',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '2px'
        }}>
          FEATURES
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          marginTop: '3rem'
        }}>
          {/* Feature 1 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
            padding: '2.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-10px)'
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)'
          }}
          >
            <h3 style={{
              color: '#00ffff',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
            }}>
              LIVE SCORING
            </h3>
            <p style={{
              color: '#a0e0ff',
              lineHeight: '1.8',
              fontSize: '1rem'
            }}>
              Real-time score updates and match statistics during competitions.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
            padding: '2.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-10px)'
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)'
          }}
          >
            <h3 style={{
              color: '#00ffff',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
            }}>
              ROBOT COMPETITIONS
            </h3>
            <p style={{
              color: '#a0e0ff',
              lineHeight: '1.8',
              fontSize: '1rem'
            }}>
              Robotics competitions with automated scoring and match management.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 255, 200, 0.15) 100%)',
            padding: '2.5rem',
            borderRadius: '20px',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)',
            backdropFilter: 'blur(10px)',
            textAlign: 'center',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-10px)'
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.4), 0 0 40px rgba(0, 255, 255, 0.3)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 255, 255, 0.2)'
          }}
          >
            <h3 style={{
              color: '#00ffff',
              fontSize: '1.5rem',
              marginBottom: '1rem',
              fontWeight: 'bold',
              textShadow: '0 0 15px rgba(0, 255, 255, 0.5)'
            }}>
              STATISTICS
            </h3>
            <p style={{
              color: '#a0e0ff',
              lineHeight: '1.8',
              fontSize: '1rem'
            }}>
              Statistics, penalties tracking, and match analytics.
            </p>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: '5rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        width: '100%',
        textAlign: 'center'
      }}>
        <h2 style={{
          fontSize: '2.5rem',
          color: '#00ffff',
          marginBottom: '2rem',
          fontWeight: 'bold',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.5)',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '2px'
        }}>
          ABOUT
        </h2>
        <p style={{
          color: '#a0e0ff',
          fontSize: '1.2rem',
          lineHeight: '2',
          maxWidth: '900px',
          margin: '0 auto',
          marginBottom: '2rem'
        }}>
          Robotics competition scoring system with real-time scoring, live updates, and match statistics.
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(-50%) translateX(0);
          }
          50% {
            transform: translateY(-50%) translateX(20px);
          }
        }
        
        @keyframes gridMove {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 50px 50px;
          }
        }
      `}</style>
    </div>
  )
}

export default Home

