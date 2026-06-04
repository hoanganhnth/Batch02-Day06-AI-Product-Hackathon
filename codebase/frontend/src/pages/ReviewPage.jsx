import React, { useState } from 'react';
import ComboPopup from '../components/ComboPopup';
import PaymentModal from '../components/PaymentModal';
import { supabase, lockBill, addMember, removeMember, approveMemberSelections, handleEditRequest as handleEditRequestApi, updateBill, payMemberShare } from '../services/supabaseService';

export default function ReviewPage({
  billId,
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
  setMemberPayments,
  editRequests,
  setEditRequests,
  onNext,
  onBack
}) {
  const [showFullReceipt, setShowFullReceipt] = useState(false);
  const [comboItemToResolve, setComboItemToResolve] = useState(null); // stores item if popup is open
  const [showShareModal, setShowShareModal] = useState(false);
  const [showHostPaymentSuccess, setShowHostPaymentSuccess] = useState(false);
  
  // Member management states
  const [newMemberInput, setNewMemberInput] = useState('');
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [showLockWarningModal, setShowLockWarningModal] = useState(false);

  const getUnselectedItems = () => {
    return billItems.filter(item => {
      const selections = itemSelections[item.id] || [];
      return selections.length < item.qty;
    });
  };

  const handleLockClick = () => {
    const unselected = getUnselectedItems();
    if (unselected.length > 0) {
      setShowLockWarningModal(true);
    } else {
      setBillStatus('locked');
      if (billId) lockBill(billId, true).catch(console.error);
    }
  };

  const handleConfirmLock = () => {
    setBillStatus('locked');
    if (billId) lockBill(billId, true).catch(console.error);
    setShowLockWarningModal(false);
  };

  // Edit item name
  const handleNameChange = (id, newName) => {
    const newItems = billItems.map(item => item.id === id ? { ...item, name: newName } : item);
    setBillItems(newItems);
    if (billId) updateBill(billId, { items: newItems }).catch(console.error);
  };

  // Edit item quantity
  const handleQtyChange = (id, newQty) => {
    const qty = parseInt(newQty) || 0;
    const newItems = billItems.map(item => item.id === id ? { ...item, qty } : item);
    setBillItems(newItems);
    if (billId) updateBill(billId, { items: newItems }).catch(console.error);
  };

  // Edit item price (Override capability for Failure Mode)
  const handlePriceChange = (id, newPrice) => {
    const price = parseInt(newPrice) || 0;
    const newItems = billItems.map(item => item.id === id ? { ...item, price } : item);
    setBillItems(newItems);
    if (billId) updateBill(billId, { items: newItems }).catch(console.error);
  };

  // Correction Path: Convert food item to shared fee
  const handleConvertToSharedFee = (item) => {
    const newItems = billItems.filter(i => i.id !== item.id);
    const newFee = { id: item.id, name: item.name, amount: item.price * item.qty };
    const newFees = [...sharedFees, newFee];
    setBillItems(newItems);
    setSharedFees(newFees);
    if (billId) updateBill(billId, { items: newItems, shared_fees: newFees }).catch(console.error);
  };

  // Resolve Low-confidence Combo Item
  const handleResolveCombo = (itemId, choice) => {
    // If choice is 'all', auto-select this item for all current members
    if (choice === 'all') {
      setItemSelections(prev => {
        const allMemberIds = members.map(m => m.id);
        return {
          ...prev,
          [itemId]: allMemberIds
        };
      });
    } else if (choice === 'individual') {
      // Clear selections so people can pick individually
      setItemSelections(prev => ({
        ...prev,
        [itemId]: []
      }));
    }

    const newItems = billItems.map(item => {
      if (item.id === itemId) {
        return { ...item, confidence: 'resolved', isCombo: true, aiNote: choice === 'all' ? 'Đã gán: Chia đều cả bàn' : 'Đã gán: Tự tích chọn' };
      }
      return item;
    });
    setBillItems(newItems);
    if (billId) updateBill(billId, { items: newItems }).catch(console.error);
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
    if (billId) addMember(billId, newId, cleanName, randomAvatar, randomColor).catch(console.error);
  };

  const handleRemoveMember = (id) => {
    if (id === 'host') return;
    setMembers(prev => prev.filter(m => m.id !== id));
    setItemSelections(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(itemId => {
        updated[itemId] = (updated[itemId] || []).filter(mId => mId !== id);
      });
      return updated;
    });
    setMemberStatuses(prev => { const u = { ...prev }; delete u[id]; return u; });
    if (billId) removeMember(billId, id).catch(console.error);
  };

  // Handle Edit Requests from Friends
  const handleApproveEdit = (req) => {
    const newItems = billItems.map(item => {
      if (item.id === req.itemId) {
        return { ...item, name: req.newVal.name, price: req.newVal.price, qty: req.newVal.qty };
      }
      return item;
    });
    setBillItems(newItems);
    setEditRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: 'approved' } : r));
    if (billId) handleEditRequestApi(billId, req.id, true, newItems).catch(console.error);
  };

  const handleRejectEdit = (reqId) => {
    setEditRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r));
    if (billId) handleEditRequestApi(billId, reqId, false).catch(console.error);
  };

  const handleApproveMemberSelections = (memberId) => {
    setMemberStatuses(prev => ({ ...prev, [memberId]: 'approved' }));
    if (billId) approveMemberSelections(billId, memberId, true).catch(console.error);
  };

  const handleRejectMemberSelections = (memberId) => {
    setMemberStatuses(prev => ({ ...prev, [memberId]: 'picking' }));
    if (billId) approveMemberSelections(billId, memberId, false).catch(console.error);
  };

  // Calculate sum of food items
  const itemsTotal = billItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  // Calculate sum of shared fees
  const feesTotal = sharedFees.reduce((sum, fee) => sum + fee.amount, 0);
  const grandTotal = itemsTotal + feesTotal;

  // Calculate split costs per member using proportional splitting and adjusting rounding difference on Host
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
      
      const myFeeShare = feesTotal / (members.length || 1);
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

  const calculateMemberCost = (memberId) => {
    return memberCosts[memberId]?.total || 0;
  };

  const getMemberSelectedItems = (memberId) => {
    return billItems.filter(item => {
      const selections = itemSelections[item.id] || [];
      return selections.includes(memberId);
    });
  };

  const friends = members.filter(m => m.id !== 'host');
  const allFriendsPaid = friends.length > 0 && friends.every(m => memberPayments[m.id]);

  // Generate web URL for link sharing
  const shareUrl = billId
    ? `${window.location.origin}${window.location.pathname}?page=pick&bill=${billId}`
    : `${window.location.origin}${window.location.pathname}?page=pick`;

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
      {restaurant && restaurant !== 'Không rõ' && (
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
      )}

      {/* Success Notice when all friends paid */}
      {allFriendsPaid && (
        <div className="alert-note" style={{ background: 'rgba(16,185,129,0.06)', borderLeft: '3px solid var(--color-success)', color: '#065f46', marginBottom: '10px' }}>
          <span>🎉</span>
          <div>
            <strong>Tất cả bạn bè đã thanh toán xong!</strong> Số tiền chia nhóm đã được hoàn tất chuyển khoản đầy đủ cho bạn.
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
            const selections = itemSelections[item.id] || [];
            const totalSelected = selections.length;

            let progressBadge = null;
            if (totalSelected > 0) {
              progressBadge = <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.06)', color: 'var(--color-success)', border: '1px solid rgba(16, 185, 129, 0.15)', fontSize: '0.65rem', whiteSpace: 'nowrap' }}>Đã chọn ({totalSelected})</span>;
            }

            return (
              <div 
                key={item.id} 
                className="bill-item-card"
              >
                <div className="bill-item-main">
                  <div className="bill-item-info">
                    <div className="bill-item-name" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                      <input 
                        type="text" 
                        value={item.name} 
                        onChange={(e) => handleNameChange(item.id, e.target.value)}
                        style={{ 
                          flex: 1, 
                          minWidth: 0,
                          background: 'transparent', 
                          border: 'none', 
                          fontWeight: 600, 
                          fontSize: '0.88rem', 
                          color: 'var(--color-text-primary)',
                          padding: 0,
                          margin: 0,
                          outline: 'none'
                        }}
                      />
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0, alignItems: 'center' }}>
                        {progressBadge}
                      </div>
                    </div>
                    
                    <div className="bill-item-meta">
                      <span>SL:</span>
                      <input 
                        type="number" 
                        value={item.qty} 
                        onChange={(e) => handleQtyChange(item.id, e.target.value)}
                        style={{ width: '40px', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.08)', color: 'var(--color-text-primary)', textAlign: 'center', borderRadius: '4px' }}
                      />
                    </div>
                    {item.aiNote && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#b45309', fontSize: '0.72rem', marginTop: '6px', fontWeight: 500 }}>
                        <span>💡</span>
                        <span>{item.aiNote}</span>
                      </div>
                    )}
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

                {/* Actions row removed per user request */}
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
        <h3 style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Theo dõi tiến độ chia tiền</span>
          {allFriendsPaid && <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '0.75rem', textTransform: 'none' }}>🎉 Hoàn tất 100%</span>}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                  <span className={`member-avatar ${m.color}`} style={{ width: '20px', height: '20px', fontSize: '0.65rem', flexShrink: 0 }}>
                    {m.avatar}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>
                      Phần tiền: <strong style={{ color: 'var(--color-text-primary)' }}>{cost.toLocaleString()} đ</strong>
                    </div>
                    {/* Selected items list */}
                    <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '240px' }}>
                      {getMemberSelectedItems(m.id).length > 0 ? (
                        getMemberSelectedItems(m.id).map(item => {
                          const selections = itemSelections[item.id] || [];
                          const shareCount = selections.length;
                          const myQty = selections.filter(id => id === m.id).length;
                          return (
                            <span 
                              key={item.id} 
                              style={{ 
                                fontSize: '0.65rem', 
                                background: 'rgba(216,45,139,0.04)', 
                                color: 'var(--color-primary)', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                border: '1px solid rgba(216,45,139,0.08)',
                                fontWeight: 500
                              }}
                            >
                              {item.name} {myQty > 0 && `(x${myQty})`}{shareCount > 1 && ` [chia ${shareCount}]`}
                            </span>
                          );
                        })
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                          Chưa chọn món nào
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Badges */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  {m.id === 'host' ? (
                    hasPaid ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: '1.5px solid var(--color-success)', fontSize: '0.65rem', fontWeight: 'bold' }}>
                        👑 Host (Đã thanh toán)
                      </span>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="badge" style={{ background: 'rgba(216, 45, 139, 0.08)', color: 'var(--color-primary)', border: '1.5px solid var(--color-primary)', fontSize: '0.65rem', fontWeight: 'bold' }}>
                          👑 Host ({billStatus === 'locked' ? 'Chờ thanh toán' : 'Đang chọn món'})
                        </span>
                        {billStatus === 'picking' && (
                          <button 
                            onClick={onNext}
                            style={{
                              padding: '3px 8px',
                              background: 'var(--gradient-momo)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-sm)',
                              marginTop: '2px'
                            }}
                          >
                            🙋 Tự chọn món
                          </button>
                        )}
                        {billStatus === 'locked' && (
                          <button 
                            onClick={() => setShowHostPaymentSuccess(true)}
                            style={{
                              padding: '3px 8px',
                              background: 'var(--color-success)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              boxShadow: 'var(--shadow-sm)',
                              marginTop: '2px'
                            }}
                          >
                            Thanh toán phần mình
                          </button>
                        )}
                      </div>
                    )
                  ) : hasPaid ? (
                    <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: '1.5px solid var(--color-success)', fontSize: '0.65rem', fontWeight: 'bold' }}>
                      💸 Đã thanh toán
                    </span>
                  ) : billStatus === 'picking' ? (
                    status === 'approved' ? (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', border: '1.5px solid var(--color-success)', fontSize: '0.65rem', fontWeight: 'bold' }}>
                        ✓ Đã duyệt
                      </span>
                    ) : status === 'submitted' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                        <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', border: '1px solid rgba(245, 158, 11, 0.2)', fontSize: '0.65rem' }}>
                          ⏳ Chờ duyệt
                        </span>
                        {m.id !== 'host' && (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button 
                              onClick={() => handleApproveMemberSelections(m.id)}
                              style={{
                                padding: '3px 8px',
                                background: 'var(--color-success)',
                                color: '#ffffff',
                                border: 'none',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                boxShadow: 'var(--shadow-sm)'
                              }}
                            >
                              Duyệt
                            </button>
                            <button 
                              onClick={() => handleRejectMemberSelections(m.id)}
                              style={{
                                padding: '3px 8px',
                                background: 'rgba(239, 68, 68, 0.05)',
                                color: 'var(--color-danger)',
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                borderRadius: '4px',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Trả lại
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(0,0,0,0.04)', color: 'var(--color-text-muted)', border: '1px solid rgba(0,0,0,0.06)', fontSize: '0.65rem' }}>
                        ⏳ Đang chọn
                      </span>
                    )
                  ) : (
                    <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.08)', color: 'var(--color-danger)', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.65rem' }}>
                      💵 Chờ thanh toán
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Lock / Unlock Button for Admin */}
        {billStatus === 'picking' ? (
          <button 
            onClick={handleLockClick}
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
              onClick={() => { setBillStatus('picking'); if (billId) lockBill(billId, false).catch(console.error); }}
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

      {/* 4.7. Friend Edit Requests Monitoring (Duyệt yêu cầu sửa món) */}
      {editRequests && editRequests.some(r => r.status === 'pending') && (
        <div className="glass-card" style={{ marginTop: '10px', borderTop: '4px solid var(--color-primary)' }}>
          <h3 style={{ fontSize: '0.82rem', color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
            🔔 Yêu cầu sửa món từ bạn bè ({editRequests.filter(r => r.status === 'pending').length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {editRequests.filter(r => r.status === 'pending').map(req => {
              const item = billItems.find(i => i.id === req.itemId) || {};
              const nameChanged = req.newVal.name !== req.oldVal.name;
              const priceChanged = req.newVal.price !== req.oldVal.price;
              const qtyChanged = req.newVal.qty !== req.oldVal.qty;

              return (
                <div 
                  key={req.id} 
                  style={{ 
                    padding: '12px', 
                    background: 'rgba(216,45,139,0.02)', 
                    border: '1px solid rgba(216,45,139,0.1)', 
                    borderRadius: '10px',
                    fontSize: '0.8rem',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{req.memberName}</span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Món gốc: {req.oldVal.name}</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    {nameChanged && (
                      <div>
                        • Đổi tên: <del style={{ color: 'var(--color-text-secondary)' }}>{req.oldVal.name}</del> → <strong style={{ color: 'var(--color-text-primary)' }}>{req.newVal.name}</strong>
                      </div>
                    )}
                    {priceChanged && (
                      <div>
                        • Đổi giá: <del style={{ color: 'var(--color-text-secondary)' }}>{req.oldVal.price.toLocaleString()}đ</del> → <strong style={{ color: 'var(--color-primary)' }}>{req.newVal.price.toLocaleString()}đ</strong>
                      </div>
                    )}
                    {qtyChanged && (
                      <div>
                        • Đổi SL: <del style={{ color: 'var(--color-text-secondary)' }}>{req.oldVal.qty}</del> → <strong style={{ color: 'var(--color-text-primary)' }}>{req.newVal.qty}</strong>
                      </div>
                    )}
                    {req.reason && (
                      <div style={{ fontStyle: 'italic', color: 'var(--color-text-secondary)', marginTop: '4px', background: 'rgba(0,0,0,0.02)', padding: '6px', borderRadius: '4px', borderLeft: '2px solid rgba(0,0,0,0.1)' }}>
                        "Lý do: {req.reason}"
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={() => handleApproveEdit(req)}
                      className="btn btn-success"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', width: 'auto', flex: 1, border: 'none', boxShadow: 'none' }}
                    >
                      ✓ Duyệt sửa
                    </button>
                    <button 
                      onClick={() => handleRejectEdit(req.id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '6px', width: 'auto', flex: 1, borderColor: 'rgba(0,0,0,0.08)', background: '#f1f5f9' }}
                    >
                      ✕ Từ chối
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
          {billStatus === 'picking' && (
            <button onClick={onNext} className="btn btn-secondary" style={{ flex: 1.2, borderColor: 'var(--color-primary)', color: 'var(--color-primary)', fontWeight: 600 }}>
              🙋 Tự chọn món
            </button>
          )}
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

      {showLockWarningModal && (
        <div className="modal-overlay" onClick={() => setShowLockWarningModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ borderTop: '5px solid var(--color-danger)' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: 'rgba(239, 68, 68, 0.1)', 
              color: 'var(--color-danger)',
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.8rem', 
              marginBottom: '16px' 
            }}>
              ⚠️
            </div>

            <h3 className="title-lg" style={{ fontSize: '1.2rem', marginBottom: '8px', color: 'var(--color-danger)', fontWeight: 800 }}>
              Món chưa được chọn!
            </h3>
            
            <p className="subtitle" style={{ fontSize: '0.85rem', marginBottom: '16px', textAlign: 'center', color: 'var(--color-text-secondary)', lineHeight: '1.5' }}>
              Phát hiện <strong style={{ color: 'var(--color-danger)' }}>{getUnselectedItems().length} món ăn</strong> chưa có ai chọn:
            </p>

            {/* List of unselected items */}
            <div style={{ 
              width: '100%', 
              maxHeight: '120px', 
              overflowY: 'auto', 
              background: '#f8fafc', 
              padding: '10px 14px', 
              borderRadius: '8px', 
              border: '1px solid rgba(0,0,0,0.06)',
              marginBottom: '20px',
              textAlign: 'left',
              fontSize: '0.78rem'
            }}>
              {getUnselectedItems().map(item => (
                <div key={item.id} style={{ color: 'var(--color-text-primary)', padding: '4px 0', borderBottom: '1px dashed rgba(0,0,0,0.04)', fontWeight: 500 }}>
                  • {item.name} ({item.qty} x {item.price.toLocaleString()}đ)
                </div>
              ))}
            </div>

            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '20px', textAlign: 'center' }}>
              Nếu vẫn khóa, tiền các món này sẽ không phân bổ cho ai. Bạn có chắc chắn muốn khóa hóa đơn không?
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
              <button 
                onClick={handleConfirmLock}
                className="btn"
                style={{ 
                  background: 'var(--gradient-momo)', 
                  color: 'white', 
                  fontSize: '0.85rem',
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                🔒 Vẫn khóa hóa đơn
              </button>
              
              <button 
                onClick={() => setShowLockWarningModal(false)}
                className="btn btn-secondary"
                style={{ 
                  padding: '10px', 
                  fontSize: '0.85rem',
                  borderRadius: '8px',
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: '#f1f5f9',
                  color: 'var(--color-text-primary)',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                Quay lại kiểm tra
              </button>
            </div>
          </div>
        </div>
      )}
      {showHostPaymentSuccess && (
        <PaymentModal 
          amount={calculateMemberCost('host')} 
          memberName={members.find(m => m.id === 'host')?.name || "Tôi (Host)"}
          hostName={members.find(m => m.id === 'host')?.name || "Tôi (Host)"}
          restaurant={restaurant}
          onClose={() => {
            setShowHostPaymentSuccess(false);
            setMemberPayments(prev => ({ ...prev, host: true }));
            if (billId) payMemberShare(billId, 'host').catch(console.error);
          }} 
        />
      )}
    </div>
  );
}
