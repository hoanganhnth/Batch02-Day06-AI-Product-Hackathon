import React, { useState } from 'react';
import ComboPopup from '../components/ComboPopup';

export default function ReviewPage({
  receiptImage,
  restaurant,
  setRestaurant,
  billItems,
  setBillItems,
  sharedFees,
  setSharedFees,
  members,
  setMembers,
  itemSelections,
  setItemSelections,
  billStatus,
  setBillStatus,
  memberStatuses,
  setMemberStatuses,
  memberPayments,
  onNext,
  onBack
}) {
  const [showFullReceipt, setShowFullReceipt] = useState(false);
  const [comboItemToResolve, setComboItemToResolve] = useState(null); // stores item if popup is open
  const [showShareModal, setShowShareModal] = useState(false);
  
  // Member management states
  const [newMemberInput, setNewMemberInput] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);

  // Edit item quantity
  const handleQtyChange = (id, newQty) => {
    const qty = parseInt(newQty) || 0;
    setBillItems(prev => prev.map(item => item.id === id ? { ...item, qty } : item));
  };

  // Edit item price (Override capability for Failure Mode)
  const handlePriceChange = (id, newPrice) => {
    const price = parseInt(newPrice) || 0;
    setBillItems(prev => prev.map(item => item.id === id ? { ...item, price } : item));
  };

  // Correction Path: Convert food item to shared fee
  const handleConvertToSharedFee = (item) => {
    // 1. Remove from billItems
    setBillItems(prev => prev.filter(i => i.id !== item.id));
    
    // 2. Add to sharedFees
    const newFee = {
      id: item.id,
      name: item.name,
      amount: item.price * item.qty
    };
    setSharedFees(prev => [...prev, newFee]);
  };

  // Resolve Low-confidence Combo Item
  const handleResolveCombo = (itemId, choice) => {
    setBillItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { 
          ...item, 
          confidence: 'high', // marked as resolved
          aiNote: choice === 'all' ? 'Đã gán: Chia đều cả bàn' : 'Đã gán: Tự tích chọn' 
        };
      }
      return item;
    }));
    setComboItemToResolve(null);
  };

  // Member management handlers
  const handleAddMember = () => {
    if (!newMemberInput.trim()) return;
    const cleanName = newMemberInput.trim();
    const newId = 'member_' + Date.now();
    const colors = ['member-avatar-pink', 'member-avatar-blue', 'member-avatar-orange', 'member-avatar-green'];
    const randomAvatar = cleanName.charAt(0).toUpperCase();
    const randomColor = colors[members.length % colors.length];

    const newMember = {
      id: newId,
      name: cleanName,
      avatar: randomAvatar,
      color: randomColor
    };

    setMembers(prev => [...prev, newMember]);
    setNewMemberInput('');
  };

  const handleRemoveMember = (id) => {
    if (id === 'host') return; // Host is owner, cannot be removed
    setMembers(prev => prev.filter(m => m.id !== id));
    
    // Clean up their item selections
    setItemSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(itemId => {
        updated[itemId] = (updated[itemId] || []).filter(mId => mId !== id);
      });
      return updated;
    });

    // Clean up member status
    setMemberStatuses(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Calculate sum of food items
  const itemsTotal = billItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  // Calculate sum of shared fees
  const feesTotal = sharedFees.reduce((sum, fee) => sum + fee.amount, 0);
  const grandTotal = itemsTotal + feesTotal;

  // Calculate split costs per member
  const calculateMemberCost = (memberId) => {
    let personalCost = 0;
    let sharedCost = 0;

    billItems.forEach(item => {
      const selections = itemSelections[item.id] || [];
      const isSelected = selections.includes(memberId);
      
      if (isSelected) {
        const totalItemAmount = item.price * item.qty;
        const splitCount = selections.length;
        
        if (splitCount === 1) {
          personalCost += totalItemAmount;
        } else {
          sharedCost += totalItemAmount / splitCount;
        }
      }
    });

    const myFeeShare = feesTotal / (members.length || 1);
    return Math.round(personalCost + sharedCost + myFeeShare);
  };

  // Generate web URL for link sharing
  const shareUrl = `${window.location.origin}${window.location.pathname}?page=pick`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setIsLinkCopied(true);
    setTimeout(() => setIsLinkCopied(false), 2000);
  };

  return (
    <div className="preview-layout">
      {/* 1. Original Receipt Thumbnail Reference */}
      <div className="glass-card" style={{ padding: '12px', marginBottom: '0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-primary)' }}>
            📸 ĐỐI CHIẾU HÓA ĐƠN GỐC
          </span>
          <button 
            onClick={() => setShowFullReceipt(!showFullReceipt)} 
            className="item-action-btn"
            style={{ fontSize: '0.75rem', textDecoration: 'underline' }}
          >
            {showFullReceipt ? "Thu nhỏ" : "Xem ảnh lớn"}
          </button>
        </div>
        
        <div 
          className="receipt-thumbnail-container" 
          style={{ height: showFullReceipt ? '450px' : '120px' }}
          onClick={() => setShowFullReceipt(!showFullReceipt)}
        >
          <img src={receiptImage || '/sample-bill.png'} alt="Original Bill" />
          <div className="receipt-overlay-btn">
            🔍 Click để {showFullReceipt ? "thu nhỏ" : "phóng to"}
          </div>
        </div>
      </div>

      {/* 2. Restaurant details */}
      <div className="glass-card" style={{ marginBottom: '0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '1.2rem' }}>🍲</span>
          <input 
            type="text" 
            value={restaurant} 
            onChange={(e) => setRestaurant(e.target.value)}
            className="price-input"
            style={{ width: '100%', textAlign: 'left', fontWeight: 'bold', fontSize: '1rem', background: 'transparent', border: 'none', padding: '0' }}
          />
        </div>
      </div>

      {/* Warning Notice about AI Mistakes */}
      {billItems.some(i => i.aiMistake) && (
        <div className="alert-note">
          <span>⚠️</span>
          <div>
            <strong>AI Phát hiện lỗi nhầm lẫn:</strong> Một vài dòng (Khăn lạnh, Gửi xe) có thể là phí chung nhưng AI đang xếp nhầm vào món ăn lẻ. Hãy bấm <strong>"Chuyển thành Phí chung"</strong> để sửa lỗi.
          </div>
        </div>
      )}

      {/* 3. Items list scanned by AI */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
          Danh sách món ăn do AI quét ({billItems.length} món)
        </h3>

        <div className="bill-list">
          {billItems.map(item => {
            const isLowConf = item.confidence === 'low';
            const isMistake = item.aiMistake;

            return (
              <div 
                key={item.id} 
                className={`bill-item-card ${isLowConf ? 'low-conf' : ''} ${isMistake ? 'mistake' : ''}`}
              >
                <div className="bill-item-main">
                  <div className="bill-item-info">
                    <div className="bill-item-name">
                      {item.name}
                      {isLowConf && <span className="badge badge-low-conf">⚠️ Combo?</span>}
                      {isMistake && <span className="badge badge-mistake">Nhầm Lẫn AI</span>}
                    </div>
                    
                    <div className="bill-item-meta">
                      <span>SL:</span>
                      <input 
                        type="number" 
                        value={item.qty} 
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        style={{ width: '40px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', color: 'var(--color-text-primary)', textAlign: 'center', borderRadius: '4px' }}
                      />
                      {item.aiNote && <span style={{ color: 'var(--color-warning)', fontWeight: 500 }}>{item.aiNote}</span>}
                    </div>
                  </div>

                  <div className="bill-item-price-section">
                    <div className="price-input-wrapper">
                      <input 
                        type="number" 
                        value={item.price} 
                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                        className="price-input" 
                      />
                      <span className="price-currency">đ</span>
                    </div>
                  </div>
                </div>

                {/* Actions row for Low confidence or Correction paths */}
                {(isLowConf || isMistake) && (
                  <div className="item-actions-panel">
                    {isLowConf && (
                      <button 
                        onClick={() => setComboItemToResolve(item)} 
                        className="btn btn-warning" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px' }}
                      >
                        ⚡️ Giải quyết món Combo
                      </button>
                    )}
                    {isMistake && (
                      <button 
                        onClick={() => handleConvertToSharedFee(item)} 
                        className="btn btn-secondary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', color: 'var(--color-primary)', borderColor: 'rgba(216,45,139,0.2)' }}
                      >
                        🔄 Chuyển thành Phí chung (Sửa Lỗi)
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Shared Fees Section */}
      <div className="glass-card" style={{ marginTop: '10px' }}>
        <h3 style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 600 }}>
          Phí dùng chung (Chia đều cả nhóm)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {sharedFees.map(fee => (
            <div key={fee.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--color-text-primary)' }}>• {fee.name}</span>
              <span style={{ fontWeight: 600 }}>{fee.amount.toLocaleString()} đ</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4.5. Real-time Split Monitoring (Bảng theo dõi chia tiền nhóm) */}
      <div className="glass-card" style={{ marginTop: '10px' }}>
        <h3 style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600 }}>
          📊 Theo dõi tiến độ chia tiền
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
          {members.map(m => {
            const cost = calculateMemberCost(m.id);
            const status = memberStatuses[m.id] || 'picking';
            const hasPaid = memberPayments[m.id];
            
            return (
              <div 
                key={m.id} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  padding: '8px 12px', 
                  background: 'rgba(0,0,0,0.015)', 
                  border: '1px solid rgba(0,0,0,0.04)', 
                  borderRadius: '10px' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className={`member-avatar ${m.color}`} style={{ width: '20px', height: '20px', fontSize: '0.65rem' }}>
                    {m.avatar}
                  </span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                      Phần tiền: <strong style={{ color: 'var(--color-text-primary)' }}>{cost.toLocaleString()} đ</strong>
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {billStatus === 'picking' ? (
                    status === 'submitted' ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.65rem' }}>
                        ✓ Đã gửi duyệt
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.08)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.15)', fontSize: '0.65rem' }}>
                        ⏳ Đang chọn
                      </span>
                    )
                  ) : (
                    hasPaid ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: '1.5px solid var(--color-success)', fontSize: '0.65rem', fontWeight: 'bold' }}>
                        💸 Đã thanh toán
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.65rem' }}>
                        💵 Chờ thanh toán
                      </span>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lock / Unlock Button for Admin */}
        {billStatus === 'picking' ? (
          <button 
            onClick={() => setBillStatus('locked')}
            className="btn btn-primary"
            style={{ 
              width: '100%', 
              background: 'var(--gradient-momo)', 
              fontWeight: 700, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '6px',
              border: 'none',
              boxShadow: 'none'
            }}
          >
            🔒 Chốt chia tiền & Khóa hóa đơn
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', background: 'rgba(16,185,129,0.05)', padding: '8px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.15)', textAlign: 'center', fontWeight: 600 }}>
              🔒 Hóa đơn đã khóa. Bạn bè có thể thanh toán.
            </div>
            <button 
              onClick={() => setBillStatus('picking')}
              className="btn btn-secondary"
              style={{ 
                width: '100%', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '6px',
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            >
              🔓 Mở khóa hóa đơn
            </button>
          </div>
        )}
      </div>

      {/* 5. Members Management Section (Admin/Host adds members first) */}
      <div className="glass-card" style={{ marginTop: '10px' }}>
        <h3 style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600 }}>
          Thành viên nhóm chia tiền ({members.length})
        </h3>
        
        {/* Render current members */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
          {members.map(m => (
            <div 
              key={m.id} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px', 
                padding: '6px 12px', 
                borderRadius: '20px', 
                background: '#f1f5f9', 
                border: '1px solid rgba(0,0,0,0.06)',
                fontSize: '0.8rem',
                color: 'var(--color-text-primary)',
                fontWeight: 600
              }}
            >
              <span className={`member-avatar ${m.color}`} style={{ width: '16px', height: '16px', fontSize: '0.55rem' }}>
                {m.avatar}
              </span>
              <span>{m.name}</span>
              {m.id !== 'host' && (
                <button 
                  onClick={() => handleRemoveMember(m.id)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--color-danger)', 
                    cursor: 'pointer', 
                    padding: '0 2px 0 4px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem',
                    lineHeight: '1'
                  }}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Input to add a new member */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <input 
            type="text" 
            placeholder="Tên thành viên mới..." 
            value={newMemberInput}
            onChange={(e) => setNewMemberInput(e.target.value)}
            className="price-input"
            style={{ 
              flex: 1, 
              textAlign: 'left', 
              padding: '8px 12px', 
              fontSize: '0.85rem',
              borderRadius: '8px',
              background: '#f1f5f9',
              border: '1px solid rgba(0,0,0,0.06)'
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddMember();
            }}
          />
          <button 
            onClick={handleAddMember}
            className="btn btn-primary"
            style={{ width: 'auto', padding: '8px 16px', fontSize: '0.85rem', borderRadius: '8px', border: 'none', boxShadow: 'none' }}
          >
            Thêm
          </button>
        </div>
      </div>

      {/* Spacer to push down */}
      <div style={{ height: '80px' }}></div>

      {/* Sticky Bottom Panel */}
      <div className="bottom-panel">
        <div className="summary-row">
          <span>Tiền món lẻ:</span>
          <span>{itemsTotal.toLocaleString()} đ</span>
        </div>
        <div className="summary-row">
          <span>Thuế & Phí chung:</span>
          <span>{feesTotal.toLocaleString()} đ</span>
        </div>
        <div className="summary-row total-row">
          <span>Tổng hóa đơn:</span>
          <span className="price-val">{grandTotal.toLocaleString()} đ</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ flex: 1 }}>
            Quay lại
          </button>
          <button onClick={() => setShowShareModal(true)} className="btn btn-primary" style={{ flex: 2, border: 'none', boxShadow: 'none' }}>
            🔗 Gửi nhóm chọn món
          </button>
        </div>
      </div>

      {/* Popups & Modals */}
      {comboItemToResolve && (
        <ComboPopup 
          item={comboItemToResolve} 
          onResolve={handleResolveCombo} 
          onClose={() => setComboItemToResolve(null)} 
        />
      )}

      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>🔗</div>
            <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '10px' }}>Đã Tạo Link Chia Tiền!</h3>
            <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '15px' }}>
              Hãy copy link thực tế dưới đây gửi vào Group Chat để bạn bè truy cập trực tiếp chọn món:
            </p>
            <div style={{ width: '100%', background: 'rgba(216, 45, 139, 0.05)', padding: '10px', borderRadius: '8px', fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, wordBreak: 'break-all', marginBottom: '12px', border: '1px solid rgba(216, 45, 139, 0.15)', textAlign: 'left' }}>
              {shareUrl}
            </div>

            <button 
              onClick={handleCopyLink} 
              className="btn btn-secondary" 
              style={{ width: '100%', marginBottom: '15px', color: 'var(--color-primary)', fontWeight: 'bold', borderColor: 'rgba(216, 45, 139, 0.2)', padding: '8px' }}
            >
              {isLinkCopied ? "✓ Đã copy vào bộ nhớ tạm" : "📋 Copy Link Thực Tế"}
            </button>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
              <button onClick={() => {
                setShowShareModal(false);
                onNext();
              }} className="btn btn-primary" style={{ border: 'none', boxShadow: 'none' }}>
                ➡️ Vào màn hình Chọn món (Bạn bè)
              </button>
              <button onClick={() => setShowShareModal(false)} className="btn btn-secondary">
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
