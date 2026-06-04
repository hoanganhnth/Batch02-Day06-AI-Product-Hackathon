import React from 'react';

export default function ComboPopup({ item, onResolve, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          borderTop: '5px solid #f59e0b',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
          background: '#ffffff',
          width: '90%',
          maxWidth: '380px'
        }}
      >
        <div style={{ 
          width: '56px', 
          height: '56px', 
          borderRadius: '50%', 
          background: 'rgba(245, 158, 11, 0.1)', 
          color: '#d97706',
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '1.8rem', 
          marginBottom: '16px' 
        }}>
          🍲
        </div>

        <h3 className="title-lg" style={{ fontSize: '1.25rem', marginBottom: '8px', fontWeight: 800 }}>
          Phát hiện món Combo
        </h3>
        
        <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '20px', textAlign: 'center', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
          Món <strong style={{ color: 'var(--color-text-primary)' }}>"{item.name}"</strong> ({item.price.toLocaleString()}đ) là combo ăn chung cho nhiều người. Bạn muốn chia món này như thế nào?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '16px' }}>
          <button 
            onClick={() => onResolve(item.id, 'all')}
            className="btn btn-warning" 
            style={{ 
              padding: '12px', 
              fontSize: '0.85rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            👥 Tự động chia đều cho cả bàn
          </button>
          
          <button 
            onClick={() => onResolve(item.id, 'individual')}
            className="btn btn-secondary" 
            style={{ 
              padding: '12px', 
              fontSize: '0.85rem',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              background: '#f1f5f9',
              border: '1px solid rgba(0,0,0,0.06)',
              color: 'var(--color-text-primary)',
              cursor: 'pointer'
            }}
          >
            🙋 Để mọi người tự chọn khi vào link
          </button>
        </div>

        <button 
          onClick={onClose} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--color-text-muted)', 
            fontSize: '0.8rem', 
            cursor: 'pointer',
            fontWeight: 500,
            textDecoration: 'underline',
            padding: '4px'
          }}
        >
          Để thiết lập sau
        </button>
      </div>
    </div>
  );
}
