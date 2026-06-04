import React, { useState } from 'react';
import PaymentModal from '../components/PaymentModal';

export default function PickItemsPage({
  restaurant,
  billItems,
  sharedFees,
  members,
  setMembers,
  itemSelections,
  setItemSelections,
  onBack
}) {
  const [userIdentified, setUserIdentified] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [activeMemberId, setActiveMemberId] = useState('');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [lastPaymentAmount, setLastPaymentAmount] = useState(0);

  const handleJoinWithNewName = () => {
    if (!newMemberName.trim()) return;
    const cleanName = newMemberName.trim();
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
    setActiveMemberId(newId);
    setUserIdentified(true);
    setNewMemberName('');
  };

  const handleJoinAsExisting = (id) => {
    setActiveMemberId(id);
    setUserIdentified(true);
  };

  // Toggle item selection for current active member
  const handleToggleItem = (itemId) => {
    if (!activeMemberId) return;
    setItemSelections(prev => {
      const currentSelections = prev[itemId] || [];
      const exists = currentSelections.includes(activeMemberId);
      
      const newSelections = exists 
        ? currentSelections.filter(id => id !== activeMemberId)
        : [...currentSelections, activeMemberId];
        
      return { ...prev, [itemId]: newSelections };
    });
  };

  // Get active member details
  const activeMember = members.find(m => m.id === activeMemberId);

  // Calculate bill sharing for the active member
  let personalCost = 0;
  let sharedCost = 0;

  billItems.forEach(item => {
    const selections = itemSelections[item.id] || [];
    const isSelectedByMe = selections.includes(activeMemberId);
    
    if (isSelectedByMe) {
      const totalItemAmount = item.price * item.qty;
      const splitCount = selections.length;
      
      if (splitCount === 1) {
        personalCost += totalItemAmount;
      } else {
        sharedCost += totalItemAmount / splitCount;
      }
    }
  });

  // Fees are divided equally among all members
  const totalSharedFees = sharedFees.reduce((sum, f) => sum + f.amount, 0);
  const myFeeShare = totalSharedFees / (members.length || 1);

  const myTotalCost = Math.round(personalCost + sharedCost + myFeeShare);

  const handlePay = () => {
    setLastPaymentAmount(myTotalCost);
    setShowPaymentSuccess(true);
  };

  // 1. WELCOME SCREEN (When opening the link for the first time)
  if (!userIdentified) {
    return (
      <div className="preview-layout" style={{ justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
        <div className="glass-card" style={{ padding: '24px', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🌸</div>
          <h2 className="title-lg" style={{ background: 'linear-gradient(to right, #D82D8B, #9B2FAD)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' }}>
            Chia Tiền Nhóm MoMo
          </h2>
          <p className="subtitle" style={{ marginBottom: '24px' }}>
            Bạn vừa mở link chia hóa đơn tại <strong>{restaurant}</strong>. Hãy nhập tên để chọn món ăn của bạn.
          </p>

          {/* Form to enter name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left', marginBottom: '24px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Tên của bạn:
            </label>
            <input 
              type="text" 
              placeholder="Nhập tên hiển thị..." 
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              className="price-input"
              style={{ 
                width: '100%', 
                textAlign: 'left', 
                padding: '12px', 
                fontSize: '0.95rem',
                borderRadius: '8px',
                background: '#f1f5f9',
                border: '1px solid rgba(0,0,0,0.08)'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleJoinWithNewName();
              }}
            />
            <button 
              onClick={handleJoinWithNewName}
              className="btn btn-primary"
              disabled={!newMemberName.trim()}
              style={{ opacity: newMemberName.trim() ? 1 : 0.6, marginTop: '8px' }}
            >
              🚀 Tham gia chọn món
            </button>
          </div>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '20px' }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              Hoặc chọn một danh tính giả lập để test nhanh:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {members.map(m => (
                <button
                  key={m.id}
                  onClick={() => handleJoinAsExisting(m.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 12px',
                    borderRadius: '20px',
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    color: 'var(--color-text-primary)',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.2s'
                  }}
                >
                  <span className={`member-avatar ${m.color}`} style={{ width: '16px', height: '16px', fontSize: '0.55rem' }}>
                    {m.avatar}
                  </span>
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. MAIN SELECTION SCREEN (Once identity is chosen)
  return (
    <div className="preview-layout">
      {/* Active User Identity Info Banner */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        background: '#ffffff', 
        padding: '10px 14px', 
        borderRadius: '10px', 
        border: '1px solid rgba(0,0,0,0.05)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={`member-avatar ${activeMember?.color}`}>
            {activeMember?.avatar}
          </span>
          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
            Bạn: <span style={{ color: 'var(--color-primary)' }}>{activeMember?.name}</span>
          </span>
        </div>
        <button 
          onClick={() => setUserIdentified(false)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--color-primary)', 
            fontSize: '0.75rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Đổi vai / Thêm người
        </button>
      </div>

      {/* Simulator Switcher Panel (Collapsible instruction) */}
      <div className="glass-card" style={{ background: 'rgba(216, 45, 139, 0.02)', border: '1px dashed rgba(216, 45, 139, 0.3)', marginBottom: '0px' }}>
        <p className="subtitle" style={{ color: 'var(--color-primary)', fontWeight: 700, fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📱 TRÌNH GIẢ LẬP NHÓM BẠN BÈ
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
          Chuyển nhanh qua vai người khác để tick chọn món ăn của họ (mô phỏng nhiều điện thoại):
        </p>
        
        {/* Member Selector */}
        <div className="members-list" style={{ marginBottom: 0, paddingBottom: 0 }}>
          {members.map(member => (
            <div 
              key={member.id} 
              className={`member-pill ${activeMemberId === member.id ? 'active' : ''}`}
              onClick={() => setActiveMemberId(member.id)}
              style={{ padding: '6px 12px' }}
            >
              <div className={`member-avatar ${member.color}`}>
                {member.avatar}
              </div>
              <span style={{ fontSize: '0.78rem', fontWeight: 500 }}>{member.name.split(' ')[0]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bill summary title */}
      <div>
        <h2 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🍲 {restaurant}</h2>
        <p className="subtitle" style={{ fontSize: '0.8rem' }}>Host: Hoàng Anh • Tổng cộng {members.length} người tham gia chia tiền</p>
      </div>

      {/* Items picking list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
          Chạm vào các món bạn đã ăn bên dưới:
        </h3>

        <div className="bill-list">
          {billItems.map(item => {
            const selections = itemSelections[item.id] || [];
            const isCheckedByMe = selections.includes(activeMemberId);
            const totalItemAmount = item.price * item.qty;
            const splitCount = selections.length;

            return (
              <div 
                key={item.id} 
                onClick={() => handleToggleItem(item.id)}
                className="bill-item-card" 
                style={{ 
                  cursor: 'pointer',
                  borderLeft: isCheckedByMe ? '4px solid var(--color-success)' : '1px solid rgba(0,0,0,0.04)',
                  background: isCheckedByMe ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0,0,0,0.01)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {/* Custom Checkbox */}
                  <div className={`item-checkbox ${isCheckedByMe ? 'checked' : ''}`}>
                    {isCheckedByMe && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{item.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {item.qty} x {item.price.toLocaleString()} đ = {totalItemAmount.toLocaleString()} đ
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isCheckedByMe ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                      {splitCount > 0 
                        ? `${Math.round(totalItemAmount / splitCount).toLocaleString()} đ` 
                        : `${totalItemAmount.toLocaleString()} đ`
                      }
                    </div>
                    {splitCount > 1 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        chia {splitCount} người
                      </div>
                    )}
                  </div>
                </div>

                {/* Show badges of people who checked */}
                {selections.length > 0 && (
                  <div className="item-selections">
                    {selections.map(mId => {
                      const member = members.find(m => m.id === mId);
                      const isMe = mId === activeMemberId;
                      return (
                        <span 
                          key={mId} 
                          className={`selection-dot ${isMe ? 'mine' : ''}`}
                        >
                          {member ? member.name.split(' ')[0] : mId}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared fees list display */}
      <div className="glass-card" style={{ marginTop: '5px' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '8px', fontWeight: 600 }}>
          Phí dùng chung (Chia đều mỗi người nhận {Math.round(myFeeShare).toLocaleString()} đ)
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
          {sharedFees.map(fee => (
            <div key={fee.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>• {fee.name} ({fee.amount.toLocaleString()} đ)</span>
              <span style={{ fontWeight: 500 }}>{(Math.round(fee.amount / members.length)).toLocaleString()} đ/người</span>
            </div>
          ))}
        </div>
      </div>

      {/* Spacer */}
      <div style={{ height: '100px' }}></div>

      {/* Sticky Bottom Summary Panel */}
      <div className="bottom-panel">
        <div className="summary-row">
          <span>Tiền món riêng của {activeMember?.name?.split(' ')[0]}:</span>
          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{personalCost.toLocaleString()} đ</span>
        </div>
        <div className="summary-row">
          <span>Tiền món ăn chung (chia đầu người):</span>
          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{Math.round(sharedCost).toLocaleString()} đ</span>
        </div>
        <div className="summary-row">
          <span>Phí chung & VAT (chia đều {members.length}):</span>
          <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{Math.round(myFeeShare).toLocaleString()} đ</span>
        </div>
        <div className="summary-row total-row">
          <span>Tổng tiền cần trả:</span>
          <span className="price-val">{myTotalCost.toLocaleString()} đ</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
          <button onClick={onBack} className="btn btn-secondary" style={{ flex: 1 }}>
            Sửa bill (Host)
          </button>
          <button 
            onClick={handlePay} 
            disabled={myTotalCost === 0} 
            className="btn btn-primary" 
            style={{ flex: 2, background: 'var(--gradient-success)', opacity: myTotalCost === 0 ? 0.5 : 1, border: 'none', boxShadow: 'none' }}
          >
            💸 Thanh toán ngay
          </button>
        </div>
      </div>

      {/* Success Payment Modal */}
      {showPaymentSuccess && (
        <PaymentModal 
          amount={myTotalCost} 
          memberName={activeMember?.name}
          onClose={() => setShowPaymentSuccess(false)} 
        />
      )}
    </div>
  );
}
