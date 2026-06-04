import React from 'react';

export default function ComboPopup({ item, onResolve, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderTop: '4px solid var(--color-warning)' }}>
        <div style={{ fontSize: '2rem', marginBottom: '8px' }}>⚠️</div>
        <h3 className="title-lg" style={{ fontSize: '1.1rem', marginBottom: '10px' }}>Phát hiện món Combo</h3>
        <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '16px', textAlign: 'center' }}>
          Món <strong>"{item.name}"</strong> ({item.price.toLocaleString()}đ) có tính chất là combo ăn chung. AI đề xuất cách chia:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginBottom: '16px' }}>
          <button 
            onClick={() => onResolve(item.id, 'all')}
            className="btn btn-warning" 
            style={{ padding: '10px', fontSize: '0.85rem' }}
          >
            👥 Chia đều cho cả bàn (4 người)
          </button>
          
          <button 
            onClick={() => onResolve(item.id, 'individual')}
            className="btn btn-secondary" 
            style={{ padding: '10px', fontSize: '0.85rem' }}
          >
            🙋 Để mọi người tự chọn món lẻ
          </button>
        </div>

        <button 
          onClick={onClose} 
          className="btn" 
          style={{ background: 'transparent', color: 'var(--color-text-secondary)', fontSize: '0.8rem', padding: '0' }}
        >
          Để sau
        </button>
      </div>
    </div>
  );
}
