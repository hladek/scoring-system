import React from 'react'

function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', type = 'warning' }) {
  if (!isOpen) return null

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
        zIndex: 10001,
        backdropFilter: 'blur(5px)'
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: type === 'danger'
            ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(200, 50, 50, 0.15) 100%)'
            : 'linear-gradient(135deg, rgba(255, 170, 0, 0.15) 0%, rgba(200, 130, 0, 0.15) 100%)',
          padding: '2.5rem 3rem',
          borderRadius: '16px',
          border: type === 'danger'
            ? '1px solid rgba(255, 107, 107, 0.4)'
            : '1px solid rgba(255, 170, 0, 0.4)',
          boxShadow: type === 'danger'
            ? '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 107, 107, 0.3), inset 0 0 25px rgba(255, 107, 107, 0.15)'
            : '0 8px 32px rgba(0, 0, 0, 0.5), 0 0 40px rgba(255, 170, 0, 0.3), inset 0 0 25px rgba(255, 170, 0, 0.15)',
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
          color: type === 'danger' ? '#ff6b6b' : '#ffaa00',
          fontSize: '1.8rem',
          fontWeight: 'bold',
          textShadow: type === 'danger' ? '0 0 15px rgba(255, 107, 107, 0.5)' : '0 0 15px rgba(255, 170, 0, 0.5)',
          letterSpacing: '1px',
          fontFamily: '"Orbitron", sans-serif'
        }}>
          {title || 'Confirm Action'}
        </h3>
        <p style={{
          margin: '0 0 1.5rem 0',
          fontSize: '1.1rem',
          color: '#a0e0ff',
          lineHeight: '1.6',
          wordWrap: 'break-word'
        }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={onCancel}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              color: '#ffffff',
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
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '0.75rem 2rem',
              background: type === 'danger'
                ? 'linear-gradient(135deg, #ff6b6b 0%, #cc4444 100%)'
                : 'linear-gradient(135deg, #ffaa00 0%, #cc8800 100%)',
              color: '#ffffff',
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
            {confirmText}
          </button>
        </div>
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

export default ConfirmDialog



