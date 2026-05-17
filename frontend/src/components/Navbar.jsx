import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI, getToken } from '../services/api'

function Navbar({ navigate: navProp }) {
  const navigate = navProp || useNavigate()
  const [currentUser, setCurrentUser] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const loadUser = async () => {
      const token = getToken()
      if (token) {
        try {
          const user = await authAPI.getCurrentUser()
          setCurrentUser(user)
        } catch (err) {
          setCurrentUser(null)
        }
      } else {
        setCurrentUser(null)
      }
    }
    loadUser()
    const handleStorageChange = () => loadUser()
    window.addEventListener('storage', handleStorageChange)
    const interval = setInterval(loadUser, 2000)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  const handleLogout = () => {
    authAPI.logout()
    setCurrentUser(null)
    setMenuOpen(false)
    navigate('/competitions')
  }

  const go = (path) => {
    setMenuOpen(false)
    navigate(path)
  }

  const btnBase = {
    padding: '0.6rem 1.2rem',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s',
    whiteSpace: 'nowrap'
  }

  return (
    <>
      <style>{`
        .rc-navbar {
          background: linear-gradient(135deg, rgba(20,30,50,0.97) 0%, rgba(15,25,40,0.97) 100%);
          color: #fff;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(0,255,255,0.2);
          box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 20px rgba(0,255,255,0.1);
          backdrop-filter: blur(10px);
          position: sticky;
          top: 0;
          z-index: 200;
          gap: 1rem;
        }
        .rc-navbar-logos {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .rc-navbar-logos img {
          height: 36px;
          width: auto;
          max-width: 90px;
          object-fit: contain;
          cursor: pointer;
          filter: brightness(1.1) drop-shadow(0 0 4px rgba(255,255,255,0.3));
          transition: transform 0.2s;
        }
        .rc-navbar-logos img:hover { transform: scale(1.08); }
        .rc-navbar-title {
          margin: 0;
          font-size: 1.3rem;
          cursor: pointer;
          color: #00ffff;
          font-weight: bold;
          text-shadow: 0 0 15px rgba(0,255,255,0.5);
          letter-spacing: 1px;
          font-family: "Orbitron","Arial Black",sans-serif;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .rc-navbar-links {
          display: flex;
          gap: 0.6rem;
          align-items: center;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .rc-navbar-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          background: rgba(0,255,255,0.1);
          border-radius: 8px;
          border: 1px solid rgba(0,255,255,0.3);
          white-space: nowrap;
        }
        .rc-navbar-hamburger {
          display: none;
          flex-direction: column;
          gap: 5px;
          cursor: pointer;
          padding: 8px;
          background: rgba(0,255,255,0.1);
          border: 1px solid rgba(0,255,255,0.3);
          border-radius: 8px;
          flex-shrink: 0;
        }
        .rc-navbar-hamburger span {
          display: block;
          width: 22px;
          height: 2px;
          background: #00ffff;
          border-radius: 2px;
          transition: all 0.3s;
        }
        .rc-mobile-menu {
          display: none;
          flex-direction: column;
          gap: 0.5rem;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, rgba(20,30,50,0.98) 0%, rgba(15,25,40,0.98) 100%);
          border-bottom: 1px solid rgba(0,255,255,0.2);
          position: sticky;
          top: 55px;
          z-index: 199;
        }
        .rc-mobile-menu.open { display: flex; }
        .rc-mobile-menu button {
          width: 100%;
          padding: 0.75rem 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: bold;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        @media (max-width: 768px) {
          .rc-navbar { padding: 0.6rem 1rem; }
          .rc-navbar-links { display: none; }
          .rc-navbar-hamburger { display: flex; }
          .rc-navbar-logos img { height: 28px; max-width: 60px; }
          .rc-navbar-title { font-size: 1rem; }
        }
      `}</style>

      <nav className="rc-navbar">
        {/* Logos */}
        <div className="rc-navbar-logos">
          <img src="/logos/TUKE.png" alt="TUKE"
            onClick={() => window.open('https://www.tuke.sk/sk','_blank')}
            onError={(e) => { e.target.style.display='none' }} />
          <img src="/logos/FEI_Placeholder_Image_EN.webp" alt="FEI"
            onClick={() => window.open('https://www.fei.tuke.sk/sk','_blank')}
            onError={(e) => { e.target.style.display='none' }} />
          <img src="/logos/kps.png" alt="KPS"
            onClick={() => window.open('https://kps.fei.tuke.sk/','_blank')}
            style={{ cursor: 'pointer' }}
            onError={(e) => { e.target.style.display='none' }} />
        </div>

        {/* Title */}
        <h1 className="rc-navbar-title" onClick={() => go('/')}>RoboComp</h1>

        {/* Desktop links */}
        <div className="rc-navbar-links">
          {currentUser && (
            <div className="rc-navbar-user">
              <span style={{ color:'#a0e0ff', fontSize:'0.8rem' }}>Logged in:</span>
              <span style={{ color:'#00ffff', fontWeight:'bold', fontSize:'0.85rem' }}>{currentUser.username}</span>
            </div>
          )}
        <button style={{ ...btnBase, background:'linear-gradient(135deg,#00ffff,#0099ff)', color:'#0a0e27', boxShadow:'0 4px 15px rgba(0,255,255,0.4)' }} onClick={() => go('/home')}>Home</button>
        <button style={{ ...btnBase, background:'linear-gradient(135deg,#00ffff,#0099ff)', color:'#0a0e27', boxShadow:'0 4px 15px rgba(0,255,255,0.4)' }} onClick={() => go('/about')}>About</button>
          {currentUser && (
            <button style={{ ...btnBase, background:'linear-gradient(135deg,#00ff88,#00cc66)', color:'#0a0e27', boxShadow:'0 4px 15px rgba(0,255,136,0.4)' }} onClick={() => go('/my-competitions')}>My Competitions</button>
          )}
          {!currentUser ? (
            <button style={{ ...btnBase, background:'linear-gradient(135deg,#00ff88,#00cc66)', color:'#0a0e27', boxShadow:'0 4px 15px rgba(0,255,136,0.4)' }} onClick={() => go('/login')}>Login</button>
          ) : (
            <button style={{ ...btnBase, background:'linear-gradient(135deg,#6c757d,#495057)', color:'#fff', boxShadow:'0 4px 15px rgba(108,117,125,0.4)' }} onClick={handleLogout}>Logout</button>
          )}
        </div>

        {/* Hamburger */}
        <div className="rc-navbar-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span style={{ transform: menuOpen ? 'rotate(45deg) translate(5px,5px)' : 'none' }} />
          <span style={{ opacity: menuOpen ? 0 : 1 }} />
          <span style={{ transform: menuOpen ? 'rotate(-45deg) translate(5px,-5px)' : 'none' }} />
        </div>
      </nav>

      {/* Mobile dropdown menu */}
      <div className={`rc-mobile-menu${menuOpen ? ' open' : ''}`}>
        {currentUser && (
          <div style={{ color:'#a0e0ff', fontSize:'0.9rem', textAlign:'center', paddingBottom:'0.5rem', borderBottom:'1px solid rgba(0,255,255,0.2)' }}>
            Logged in as: <strong style={{ color:'#00ffff' }}>{currentUser.username}</strong>
          </div>
        )}
        <button style={{ background:'linear-gradient(135deg,#00ffff,#0099ff)', color:'#0a0e27' }} onClick={() => go('/home')}>Home</button>
        <button style={{ background:'linear-gradient(135deg,#00ffff,#0099ff)', color:'#0a0e27' }} onClick={() => go('/about')}>About</button>
        {currentUser && (
          <button style={{ background:'linear-gradient(135deg,#00ff88,#00cc66)', color:'#0a0e27' }} onClick={() => go('/my-competitions')}>My Competitions</button>
        )}
        {!currentUser ? (
          <button style={{ background:'linear-gradient(135deg,#00ff88,#00cc66)', color:'#0a0e27' }} onClick={() => go('/login')}>Login</button>
        ) : (
          <button style={{ background:'linear-gradient(135deg,#6c757d,#495057)', color:'#fff' }} onClick={handleLogout}>Logout</button>
        )}
      </div>
    </>
  )
}

export default Navbar
