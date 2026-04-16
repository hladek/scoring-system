import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, getToken } from '../services/api'

function Navbar({ navigate: navProp }) {
  const navigate = navProp || useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  
  useEffect(() => {
    const loadUser = async () => {
      const token = getToken()
      if (token) {
        try {
          const user = await authAPI.getCurrentUser()
          setCurrentUser(user)
        } catch (err) {
          console.error('Error loading user:', err)
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
    }
    loadUser()
    
    // Listen for storage changes (when user logs in/out in another tab)
    const handleStorageChange = () => {
      loadUser()
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically in case token was set in same tab
    const interval = setInterval(loadUser, 2000)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])
  
  const handleLogout = () => {
    authAPI.logout()
    setCurrentUser(null)
    navigate('/competitions')
  }
  
  return (
    <nav style={{
      background: 'linear-gradient(135deg, rgba(20, 30, 50, 0.95) 0%, rgba(15, 25, 40, 0.95) 100%)',
      color: '#ffffff',
      padding: '0.75rem 2rem',
      display: 'flex',
      gap: '2rem',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3), 0 0 20px rgba(0, 255, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      position: 'sticky',
      top: 0,
      zIndex: 100
    }}>
      {/* Left Section - Logos */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '1.25rem',
        flexShrink: 0
      }}>
        <img 
          src="/logos/TUKE.png" 
          alt="TUKE Logo"
          onClick={() => window.open('https://www.tuke.sk/sk', '_blank')}
          style={{
            height: '40px',
            width: 'auto',
            maxWidth: '120px',
            objectFit: 'contain',
            filter: 'brightness(1.1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)'
            e.target.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.filter = 'brightness(1.1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))'
          }}
        />
        <img 
          src="/logos/FEI_Placeholder_Image_EN.webp" 
          alt="TUKE FEI Logo"
          onClick={() => window.open('https://www.fei.tuke.sk/sk', '_blank')}
          style={{
            height: '40px',
            width: 'auto',
            maxWidth: '120px',
            objectFit: 'contain',
            filter: 'brightness(1.1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)'
            e.target.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.filter = 'brightness(1.1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))'
          }}
        />
        <img 
          src="/logos/kemt.jpg" 
          alt="TUKE KEMT Logo"
          onClick={() => window.open('https://kemt.fei.tuke.sk/', '_blank')}
          style={{
            height: '40px',
            width: 'auto',
            maxWidth: '120px',
            objectFit: 'contain',
            filter: 'brightness(1.1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onError={(e) => {
            e.target.style.display = 'none'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.1)'
            e.target.style.filter = 'brightness(1.2) drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.filter = 'brightness(1.1) drop-shadow(0 0 5px rgba(255, 255, 255, 0.3))'
          }}
        />
      </div>
      
      {/* Center Section - Title */}
      <h1 
        style={{ 
          margin: 0, 
          fontSize: '1.5rem', 
          cursor: 'pointer',
          color: '#00ffff',
          fontWeight: 'bold',
          textShadow: '0 0 15px rgba(0, 255, 255, 0.5)',
          letterSpacing: '1px',
          fontFamily: '"Orbitron", "Arial Black", sans-serif',
          transition: 'all 0.3s',
          flexShrink: 0
        }} 
        onClick={() => navigate('/')}
        onMouseEnter={(e) => {
          e.target.style.textShadow = '0 0 20px rgba(0, 255, 255, 0.8)'
          e.target.style.transform = 'scale(1.05)'
        }}
        onMouseLeave={(e) => {
          e.target.style.textShadow = '0 0 15px rgba(0, 255, 255, 0.5)'
          e.target.style.transform = 'scale(1)'
        }}
      >
        RoboComp
      </h1>
      
      {/* Right Section - Navigation Buttons and User Info */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '8px',
            border: '1px solid rgba(0, 255, 255, 0.3)'
          }}>
            <span style={{
              color: '#a0e0ff',
              fontSize: '0.85rem',
              fontWeight: '500'
            }}>
              Logged in as:
            </span>
            <span style={{
              color: '#00ffff',
              fontSize: '0.9rem',
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
            }}>
              {currentUser.username}
            </span>
          </div>
        )}
        <button 
          onClick={() => navigate('/home')}
          style={{
            padding: '0.6rem 1.2rem',
            background: 'linear-gradient(135deg, #00ffff 0%, #0099ff 100%)',
            color: '#0a0e27',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
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
          Home
        </button>
        <button 
          onClick={() => navigate('/competitions')}
          style={{
            padding: '0.6rem 1.2rem',
            background: 'linear-gradient(135deg, #00ffff 0%, #0099ff 100%)',
            color: '#0a0e27',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.9rem',
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
          Competitions
        </button>
        {currentUser && (
          <button 
            onClick={() => navigate('/my-competitions')}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
              color: '#0a0e27',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
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
            My Competitions
          </button>
        )}
        {!currentUser ? (
          <>
            <button 
              onClick={() => navigate('/login')}
              style={{
                padding: '0.6rem 1.2rem',
                background: 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)',
                color: '#0a0e27',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.9rem',
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
              Login
            </button>
          </>
        ) : (
          <button 
            onClick={handleLogout}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
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
            Logout
          </button>
        )}
      </div>
    </nav>
  )
}

export default Navbar


