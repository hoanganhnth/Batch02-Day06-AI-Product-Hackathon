import React, { useState } from 'react';
import PaymentModal from '../components/PaymentModal';
import { supabase, addMember, updateItemSelections as updateItemSelectionsApi, submitSelections, payMemberShare, createEditRequest } from '../services/supabaseService';

// Helper component for the Edit Request form
function EditRequestForm({ item, activeMember, onClose, onSubmit }) {
  const [name, setName] = useState(item.name);
  const [price, setPrice] = useState(item.price);
  const [qty, setQty] = useState(item.qty);
  const [reason, setReason] = useState('');

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSubmit(name, price, qty, reason);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        onSubmit={handleFormSubmit}
        style={{ 
          borderTop: '5px solid var(--color-primary)', 
          borderRadius: '20px',
          padding: '20px',
          textAlign: 'left',
          width: '90%',
          maxWidth: '380px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="title-lg" style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>
            Yêu cầu sửa món ăn
          </h3>
          <button 
            type="button"
            onClick={onClose} 
            style={{ 
              background: 'rgba(0,0,0,0.05)', 
              border: 'none', 
              color: 'var(--color-text-primary)', 
              borderRadius: '50%', 
              width: '28px', 
              height: '28px', 
              cursor: 'pointer',
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ✕
          </button>
        </div>

        <p className="subtitle" style={{ fontSize: '0.78rem', marginBottom: '16px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
          Bạn đang gửi yêu cầu sửa món cho Host ({members.find(m => m.id === 'host')?.name || 'Tôi'}). Nhập các thông tin cần thay đổi:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Tên món ăn:</label>
            <input 
              type="text" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              className="price-input" 
              style={{ width: '100%', textAlign: 'left', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px' }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Đơn giá (đ):</label>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                className="price-input" 
                style={{ width: '100%', textAlign: 'left', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px' }}
                required
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '80px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Số lượng:</label>
              <input 
                type="number" 
                value={qty} 
                onChange={(e) => setQty(e.target.value)} 
                className="price-input" 
                style={{ width: '100%', textAlign: 'center', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px' }}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>Lý do sửa đổi:</label>
            <input 
              type="text" 
              placeholder="Ví dụ: Menu ghi giá 59k, AI đọc sai..." 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              className="price-input" 
              style={{ width: '100%', textAlign: 'left', background: '#f1f5f9', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '8px', padding: '10px' }}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary"
          style={{ width: '100%', border: 'none', boxShadow: 'none' }}
        >
          📤 Gửi yêu cầu sửa
        </button>
      </form>
    </div>
  );
}

export default function PickItemsPage({
  billId,
  restaurant,
  billItems,
  sharedFees,
  members,
  setMembers,
  itemSelections,
  setItemSelections,
  billStatus,
  setBillStatus,
  memberStatuses,
  setMemberStatuses,
  memberPayments,
  setMemberPayments,
  editRequests,
  setEditRequests,
  onBack
}) {
  const urlParams = new URLSearchParams(window.location.search);
  const isHost = urlParams.get('role') === 'host';

  const [userIdentified, setUserIdentified] = useState(isHost);
  const [newMemberName, setNewMemberName] = useState('');
  const [activeMemberId, setActiveMemberId] = useState(isHost ? 'host' : '');
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [lastPaymentAmount, setLastPaymentAmount] = useState(0);
  
  // State for item currently requested to be edited
  const [requestEditItem, setRequestEditItem] = useState(null);

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
    if (billId) addMember(billId, newId, cleanName, randomAvatar, randomColor).catch(console.error);
  };

  const handleJoinAsExisting = (id) => {
    setActiveMemberId(id);
    setUserIdentified(true);
  };

  // Get active member details
  const activeMember = members.find(m => m.id === activeMemberId);
  const myStatus = memberStatuses[activeMemberId] || 'picking';
  const hasPaid = memberPayments[activeMemberId] || false;

  // Toggle item selection for current active member (handles checkbox toggling)
  const handleToggleItem = (itemId) => {
    if (!activeMemberId) return;
    // If bill is locked, member has submitted, or is approved, disable toggling!
    if (billStatus === 'locked' || myStatus === 'submitted' || myStatus === 'approved') return;

    setItemSelections(prev => {
      const currentSelections = prev[itemId] || [];
      const myQty = currentSelections.filter(id => id === activeMemberId).length;

      if (myQty > 0) {
        const newSelections = currentSelections.filter(id => id !== activeMemberId);
        if (billId) updateItemSelectionsApi(billId, String(itemId), activeMemberId, 0).catch(console.error);
        return { ...prev, [itemId]: newSelections };
      } else {
        const item = billItems.find(i => i.id === itemId);
        if (!item) return prev;
        const othersQty = currentSelections.length;
        const maxAllowed = item.qty === 1 ? 1 : Math.max(0, item.qty - othersQty);
        if (maxAllowed === 0) return prev;
        if (billId) updateItemSelectionsApi(billId, String(itemId), activeMemberId, 1).catch(console.error);
        return { ...prev, [itemId]: [...currentSelections, activeMemberId] };
      }
    });
  };

  const handleIncreaseQty = (itemId) => {
    if (!activeMemberId) return;
    if (billStatus === 'locked' || myStatus === 'submitted' || myStatus === 'approved') return;

    const item = billItems.find(i => i.id === itemId);
    if (!item) return;

    setItemSelections(prev => {
      const currentSelections = prev[itemId] || [];
      const myQty = currentSelections.filter(id => id === activeMemberId).length;
      const othersQty = currentSelections.length - myQty;
      const maxAllowed = item.qty === 1 ? 1 : Math.max(0, item.qty - othersQty);
      if (myQty >= maxAllowed) return prev;
      if (billId) updateItemSelectionsApi(billId, String(itemId), activeMemberId, myQty + 1).catch(console.error);
      return { ...prev, [itemId]: [...currentSelections, activeMemberId] };
    });
  };

  const handleDecreaseQty = (itemId) => {
    if (!activeMemberId) return;
    if (billStatus === 'locked' || myStatus === 'submitted' || myStatus === 'approved') return;

    setItemSelections(prev => {
      const currentSelections = prev[itemId] || [];
      const myQty = currentSelections.filter(id => id === activeMemberId).length;
      if (myQty === 0) return prev;
      const index = currentSelections.indexOf(activeMemberId);
      if (index === -1) return prev;
      const newSelections = [...currentSelections];
      newSelections.splice(index, 1);
      if (billId) updateItemSelectionsApi(billId, String(itemId), activeMemberId, myQty - 1).catch(console.error);
      return { ...prev, [itemId]: newSelections };
    });
  };

  const handleSubmitSelections = () => {
    if (!activeMemberId) return;
    setMemberStatuses(prev => ({ ...prev, [activeMemberId]: 'submitted' }));
    if (billId) submitSelections(billId, activeMemberId).catch(console.error);
  };

  // Proportional cost split calculations with host rounding adjustment
  const totalSharedFees = sharedFees.reduce((sum, f) => sum + f.amount, 0);
  const itemsTotal = billItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const grandTotal = itemsTotal + totalSharedFees;

  const calculateAllMemberCosts = () => {
    const costs = {};
    let sumRounded = 0;
    
    members.forEach(m => {
      let pCost = 0;
      let sCost = 0;
      
      billItems.forEach(item => {
        const selections = itemSelections[item.id] || [];
        const myQty = selections.filter(id => id === m.id).length;
        if (myQty > 0) {
          const totalItemAmount = item.price * item.qty;
          const totalSelected = selections.length;
          const myPortion = (myQty / totalSelected) * totalItemAmount;
          if (totalSelected === myQty) {
            pCost += myPortion;
          } else {
            sCost += myPortion;
          }
        }
      });
      
      const myFeeShare = totalSharedFees / (members.length || 1);
      const rawTotal = pCost + sCost + myFeeShare;
      costs[m.id] = {
        personalCost: pCost,
        sharedCost: sCost,
        myFeeShare,
        total: Math.round(rawTotal)
      };
      sumRounded += costs[m.id].total;
    });
    
    // Adjust rounding difference on Host (or first member)
    const diff = grandTotal - sumRounded;
    if (diff !== 0 && members.length > 0) {
      const hostMember = members.find(m => m.id === 'host') || members[0];
      if (costs[hostMember.id]) {
        costs[hostMember.id].total += diff;
        costs[hostMember.id].sharedCost += diff; // adjust shared breakdown
      }
    }
    return costs;
  };

  const memberCosts = calculateAllMemberCosts();
  const activeMemberCost = memberCosts[activeMemberId] || { personalCost: 0, sharedCost: 0, myFeeShare: 0, total: 0 };

  const personalCost = activeMemberCost.personalCost;
  const sharedCost = activeMemberCost.sharedCost;
  const myFeeShare = activeMemberCost.myFeeShare;
  const myTotalCost = activeMemberCost.total;

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
            {restaurant && restaurant !== 'Không rõ' ? (
              <>Bạn vừa mở link chia hóa đơn tại <strong>{restaurant}</strong>. </>
            ) : (
              <>Bạn vừa mở link chia hóa đơn. </>
            )}
            Vui lòng chọn danh tính của bạn dưới đây để bắt đầu chọn món:
          </p>

          <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '10px' }}>
            <p style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
              Danh sách thành viên bàn ăn:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {members.filter(m => m.id !== "host").map(m => (
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
        {activeMemberId !== 'host' && (
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
            Đổi vai chọn món
          </button>
        )}
      </div>

      {/* Dynamic Status Banner */}
      {billStatus === 'picking' ? (
        myStatus === 'approved' ? (
          <div className="alert-note" style={{ background: 'rgba(16,185,129,0.05)', borderLeft: '3px solid var(--color-success)', color: '#065f46', marginBottom: 0 }}>
            <span>✓</span>
            <div>
              <strong>Host đã duyệt phần ăn!</strong> Bạn có thể tiến hành chuyển khoản thanh toán ngay bằng nút ở dưới.
            </div>
          </div>
        ) : myStatus === 'submitted' ? (
          <div className="alert-note" style={{ background: 'rgba(16,185,129,0.05)', borderLeft: '3px solid var(--color-success)', color: '#065f46', marginBottom: 0 }}>
            <span>⏳</span>
            <div>
              <strong>Đã gửi phần ăn!</strong> Danh sách món của bạn đã được lưu lại và gửi cho Host ({members.find(m => m.id === 'host')?.name || 'Tôi'}) phê duyệt. Vui lòng chờ Host khóa hóa đơn để tiến hành chuyển khoản.
            </div>
          </div>
        ) : (
          <div className="alert-note" style={{ background: 'rgba(245,158,11,0.05)', borderLeft: '3px solid var(--color-warning)', color: '#92400e', marginBottom: 0 }}>
            <span>👉</span>
            <div>
              Hóa đơn đang mở. Bạn hãy tick chọn các món mình đã ăn, sau đó bấm <strong>"Gửi Host duyệt"</strong> ở bên dưới.
            </div>
          </div>
        )
      ) : (
        hasPaid ? (
          <div className="alert-note" style={{ background: 'rgba(16,185,129,0.06)', borderLeft: '3px solid var(--color-success)', color: '#065f46', marginBottom: 0 }}>
            <span>🎉</span>
            <div>
              <strong>Thanh toán hoàn tất!</strong> Bạn đã thanh toán xong phần tiền của mình cho Host. Cảm ơn bạn!
            </div>
          </div>
        ) : (
          <div className="alert-note" style={{ background: 'rgba(216,45,139,0.05)', borderLeft: '3px solid var(--color-primary)', color: 'var(--color-primary)', marginBottom: 0 }}>
            <span>🔒</span>
            <div>
              <strong>Hóa đơn đã chốt!</strong> Host đã phê duyệt và khóa danh sách. Bạn không thể thay đổi món nữa. Hãy bấm <strong>"Thanh toán ngay"</strong> để chuyển khoản tiền món của mình.
            </div>
          </div>
        )
      )}

      {/* Bill summary title */}
      <div>
        {restaurant && restaurant !== 'Không rõ' && (
          <h2 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '4px' }}>🍲 {restaurant}</h2>
        )}
        <p className="subtitle" style={{ fontSize: '0.8rem' }}>Host: {members.find(m => m.id === 'host')?.name || 'Tôi'} • Tổng cộng {members.length} người tham gia chia tiền</p>
      </div>

      {/* Items picking list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <h3 style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', fontWeight: 600 }}>
          Danh sách món ăn của bàn:
        </h3>

        <div className="bill-list">
          {billItems.map(item => {
            const selections = itemSelections[item.id] || [];
            const myQty = selections.filter(id => id === activeMemberId).length;
            const isCheckedByMe = myQty > 0;
            const totalItemAmount = item.price * item.qty;
            const totalSelected = selections.length;
            
            const othersQty = totalSelected - myQty;
            const maxAllowed = item.qty === 1 ? 1 : Math.max(0, item.qty - othersQty);
            const myPortion = totalSelected > 0 ? (myQty / totalSelected) * totalItemAmount : totalItemAmount;

            const displayAmount = myQty > 0 
              ? myPortion 
              : (totalSelected > 0 ? totalItemAmount / totalSelected : totalItemAmount);

            // Check if there is an active/pending edit request for this item from this user
            const myEditReq = editRequests && editRequests.find(r => r.itemId === item.id && r.memberName === activeMember?.name && r.status === 'pending');
            const approvedReq = editRequests && editRequests.find(r => r.itemId === item.id && r.memberName === activeMember?.name && r.status === 'approved');
            const rejectedReq = editRequests && editRequests.find(r => r.itemId === item.id && r.memberName === activeMember?.name && r.status === 'rejected');

            // Group selections to avoid duplicate keys and display nicely
            const getGroupedSelections = (selectionsList) => {
              const counts = {};
              selectionsList.forEach(id => {
                counts[id] = (counts[id] || 0) + 1;
              });
              return Object.entries(counts).map(([memberId, count]) => ({
                memberId,
                qty: count
              }));
            };

            return (
              <div 
                key={item.id} 
                className="bill-item-card" 
                style={{ 
                  borderLeft: isCheckedByMe ? '4px solid var(--color-success)' : '1px solid rgba(0,0,0,0.04)',
                  background: isCheckedByMe ? 'rgba(16, 185, 129, 0.04)' : 'rgba(0,0,0,0.01)'
                }}
              >
                <div 
                  onClick={() => handleToggleItem(item.id)}
                  style={{ display: 'flex', alignItems: 'center', cursor: (billStatus === 'locked' || myStatus === 'submitted' || myStatus === 'approved') ? 'not-allowed' : 'pointer' }}
                >
                  {/* Custom Checkbox */}
                  <div className={`item-checkbox ${isCheckedByMe ? 'checked' : ''}`}>
                    {isCheckedByMe && (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-text-primary)' }}>{item.name}</span>
                      {isCheckedByMe && item.qty > 1 && (
                        <div 
                          onClick={(e) => e.stopPropagation()} 
                          style={{ 
                            display: 'inline-flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            background: '#ffffff', 
                            border: '1px solid rgba(0,0,0,0.1)', 
                            borderRadius: '12px', 
                            padding: '1px 6px',
                            boxShadow: 'var(--shadow-sm)'
                          }}
                        >
                          <button 
                            type="button"
                            onClick={() => handleDecreaseQty(item.id)}
                            disabled={billStatus === 'locked' || myStatus === 'submitted' || myStatus === 'approved'}
                            style={{ 
                              border: 'none', 
                              background: 'none', 
                              color: 'var(--color-primary)', 
                              fontWeight: 'bold', 
                              fontSize: '0.95rem', 
                              cursor: 'pointer',
                              padding: '0 4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            -
                          </button>
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, minWidth: '12px', textAlign: 'center', color: 'var(--color-text-primary)' }}>
                            {myQty}
                          </span>
                          <button 
                            type="button"
                            onClick={() => handleIncreaseQty(item.id)}
                            disabled={billStatus === 'locked' || myStatus === 'submitted' || myStatus === 'approved' || myQty >= maxAllowed}
                            style={{ 
                              border: 'none', 
                              background: 'none', 
                              color: myQty >= maxAllowed ? 'var(--color-text-muted)' : 'var(--color-primary)', 
                              fontWeight: 'bold', 
                              fontSize: '0.95rem', 
                              cursor: myQty >= maxAllowed ? 'not-allowed' : 'pointer',
                              padding: '0 4px',
                              display: 'flex',
                              alignItems: 'center'
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                      {item.qty} x {item.price.toLocaleString()} đ = {totalItemAmount.toLocaleString()} đ
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: isCheckedByMe ? 'var(--color-success)' : 'var(--color-text-primary)' }}>
                      {Math.round(displayAmount).toLocaleString()} đ
                    </div>
                    {totalSelected > 0 && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                        {totalSelected === myQty 
                          ? (myQty > 1 ? `bạn chọn ${myQty} phần` : 'phần riêng của bạn') 
                          : `chia ${totalSelected} phần ${myQty > 0 ? `(bạn lấy ${myQty})` : ''}`
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Show badges of people who checked */}
                {totalSelected > 0 && (
                  <div className="item-selections">
                    {getGroupedSelections(selections).map(({ memberId, qty }) => {
                      const member = members.find(m => m.id === memberId);
                      const isMe = memberId === activeMemberId;
                      return (
                        <span 
                          key={memberId} 
                          className={`selection-dot ${isMe ? 'mine' : ''}`}
                        >
                          {member ? member.name.split(' ')[0] : memberId} {qty > 1 && `(x${qty})`}
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Chức năng Yêu cầu sửa đã ẩn cho bạn bè */}
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
          {activeMemberId === 'host' ? (
            billStatus === 'locked' ? (
              <>
                <button 
                  onClick={onBack} 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }}
                >
                  📊 Tiến độ thu tiền
                </button>
                {hasPaid ? (
                  <button 
                    disabled 
                    className="btn btn-success" 
                    style={{ flex: 1.5, background: 'var(--gradient-success)', opacity: 0.9, border: 'none', boxShadow: 'none', cursor: 'not-allowed' }}
                  >
                    ✓ Đã xong phần mình
                  </button>
                ) : (
                  <button 
                    onClick={handlePay} 
                    disabled={myTotalCost === 0} 
                    className="btn btn-primary" 
                    style={{ flex: 1.5, background: 'var(--gradient-success)', opacity: myTotalCost === 0 ? 0.5 : 1, border: 'none', boxShadow: 'none' }}
                  >
                    💸 Thanh toán phần mình
                  </button>
                )}
              </>
            ) : (
              <>
                <button 
                  onClick={onBack} 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: 'var(--gradient-momo)', border: 'none', boxShadow: 'none' }}
                >
                  📊 Quay lại màn hình Duyệt
                </button>
              </>
            )
          ) : (
            (billStatus === 'locked' || myStatus === 'approved') ? (
              hasPaid ? (
                <button 
                  disabled 
                  className="btn btn-success" 
                  style={{ flex: 1, background: 'var(--gradient-success)', opacity: 0.9, border: 'none', boxShadow: 'none', cursor: 'not-allowed' }}
                >
                  ✓ Đã thanh toán xong
                </button>
              ) : (
                <button 
                  onClick={handlePay} 
                  disabled={myTotalCost === 0} 
                  className="btn btn-primary" 
                  style={{ flex: 1, background: 'var(--gradient-success)', opacity: myTotalCost === 0 ? 0.5 : 1, border: 'none', boxShadow: 'none' }}
                >
                  💸 Thanh toán ngay
                </button>
              )
            ) : (
              myStatus === 'submitted' ? (
                <button 
                  disabled 
                  className="btn btn-secondary" 
                  style={{ flex: 1, background: 'rgba(0,0,0,0.03)', color: 'var(--color-text-muted)', cursor: 'not-allowed', borderColor: 'rgba(0,0,0,0.05)' }}
                >
                  ⏳ Đang chờ Host duyệt...
                </button>
              ) : (
                <button 
                  onClick={handleSubmitSelections}
                  disabled={myTotalCost === 0}
                  className="btn btn-primary"
                  style={{ flex: 1, background: 'var(--gradient-momo)', border: 'none', boxShadow: 'none', opacity: myTotalCost === 0 ? 0.5 : 1 }}
                >
                  📤 Gửi Host duyệt phần ăn
                </button>
              )
            )
          )}
        </div>
      </div>

      {/* Success Payment Modal */}
      {showPaymentSuccess && (
        <PaymentModal 
          amount={myTotalCost} 
          memberName={activeMember?.name}
          onClose={() => {
            setShowPaymentSuccess(false);
            setMemberPayments(prev => ({ ...prev, [activeMemberId]: true }));
            if (billId) payMemberShare(billId, activeMemberId).catch(console.error);
          }} 
        />
      )}

      {/* Edit Request Modal */}
      {requestEditItem && (
        <EditRequestForm 
          item={requestEditItem}
          activeMember={activeMember}
          onClose={() => setRequestEditItem(null)}
          onSubmit={(newName, newPrice, newQty, reason) => {
            const req = {
              id: 'req_' + Date.now(),
              itemId: requestEditItem.id,
              memberName: activeMember.name,
              oldVal: {
                name: requestEditItem.name,
                price: requestEditItem.price,
                qty: requestEditItem.qty
              },
              newVal: {
                name: newName,
                price: parseInt(newPrice) || 0,
                qty: parseInt(newQty) || 0
              },
              reason: reason,
              status: 'pending'
            };
            setEditRequests(prev => [...prev, req]);
            if (billId) createEditRequest(billId, req).catch(console.error);
            setRequestEditItem(null);
          }}
        />
      )}
    </div>
  );
}
