import React, { useEffect } from 'react'

function Notification({ notification, onClose }) {
  useEffect(() => {
    if (notification && notification.autoClose !== false) {
      const timer = setTimeout(() => {
        onClose()
      }, notification.duration || 3000)
      return () => clearTimeout(timer)
    }
  }, [notification, onClose])

  if (!notification) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        backdropFilter: 'blur(5px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: notification.type === 'success'
            ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.15) 0%, rgba(0, 200, 100, 0.15) 100%)'
            : notification.type === 'error'
            ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(200, 50, 50, 0.15) 100%)'
            : notification.type === 'warning'
            ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.15) 0%, rgba(200, 130, 0, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(0, 150, 255, 0.15) 0%, rgba(0, 100, 200, 0.15) 100%)',
          padding: '2.5rem 3rem',
          borderRadius: '16px',
          border: notification.type === 'success'
            ? '1px solid rgba(0, 255, 136, 0.4)'
            : notification.type === 'error'
            ? '1px solid rgba(255, 107, 107, 0.4)'
            : notification.type === 'warning'
            ? '1px solid rgba(255, 170, 0, 0.4)'
            : '1px solid rgba(0, 150, 255, 0.4)',
          boxShadow: notification.type === 'success'
            ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 136, 0.3), inset 0 0 25px rgba(0, 255, 136, 0.15)'
            : notification.type === 'error'
            ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 107, 0.3), inset 0 0 25px rgba(255, 107, 107, 0.15)'
            : notification.type === 'warning'
            ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 170, 0, 0.3), inset 0 0 25px rgba(255, 170, 0, 0.15)'
            : '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 150, 255, 0.3), inset 0 0 25px rgba(0, 150, 255, 0.15)',
          backdropFilter: 'blur(10px)',
          maxWidth: '500px',
          width: '90%',
          textAlign: 'center',
          color: '#ffffff',
          animation: 'slideIn 0.3s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{
          marginTop: 0,
          marginBottom: '1rem',
          color: notification.type === 'success' ? '#00ff88' : notification.type === 'error' ? '#ff6b6b' : notification.type === 'warning' ? '#ffaa00' : '#00ffff',
          fontSize: '1.8rem',
          fontWeight: 'bold',
          textShadow: notification.type === 'success' ? '0 0 15px rgba(0, 255, 136, 0.5)' : notification.type === 'error' ? '0 0 15px rgba(255, 107, 107, 0.5)' : notification.type === 'warning' ? '0 0 15px rgba(255, 170, 0, 0.5)' : '0 0 15px rgba(0, 255, 255, 0.5)',
          letterSpacing: '1px',
          fontFamily: '"Orbitron", sans-serif'
        }}>
          {notification.type === 'success' ? 'Success' : notification.type === 'error' ? 'Error' : notification.type === 'warning' ? 'Warning' : 'Information'}
        </h3>
        <p style={{
          margin: 0,
          fontSize: '1.1rem',
          color: '#a0e0ff',
          lineHeight: '1.6',
          wordWrap: 'break-word'
        }}>
          {notification.message}
        </p>
        <button
          onClick={onClose}
          style={{
            marginTop: '1.5rem',
            padding: '0.75rem 2rem',
            background: notification.type === 'success'
              ? 'linear-gradient(135deg, #00ff88 0%, #00cc66 100%)'
              : notification.type === 'error'
              ? 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)'
              : notification.type === 'warning'
              ? 'linear-gradient(135deg, #ffaa00 0%, #cc8800 100%)'
              : 'linear-gradient(135deg, #0099ff 0%, #0066cc 100%)',
            color: '#0a0e27',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'scale(1.05)'
            e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.6)'
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'scale(1)'
            e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.4)'
          }}
        >
          OK
        </button>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  )
}

export default Notification



