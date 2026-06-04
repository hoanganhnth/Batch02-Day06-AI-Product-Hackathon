import React, { useState } from 'react';

export default function PaymentModal({ amount, memberName, onClose, restaurant, hostName = "Tôi (Host)" }) {
  const [step, setStep] = useState('select'); // 'select', 'processing', 'success'
  const [method, setMethod] = useState('momo'); // 'momo', 'vietqr'
  const [useVoucher, setUseVoucher] = useState(true);
  const [copiedField, setCopiedField] = useState(null); // 'acc', 'amount', 'msg'

  const voucherDiscount = 10000;
  const momoFinalAmount = Math.max(0, amount - (useVoucher ? voucherDiscount : 0));

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleConfirmPayment = () => {
    setStep('processing');
    setTimeout(() => {
      setStep('success');
    }, 1800);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          animation: 'slideUp 0.3s ease',
          maxWidth: '400px',
          width: '95%',
          background: '#ffffff',
          border: '1px solid rgba(0, 0, 0, 0.08)',
          padding: '20px'
        }}
      >
        {step === 'select' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="title-lg" style={{ fontSize: '1.2rem', margin: 0, textAlign: 'left' }}>
                Thanh toán cho Host
              </h3>
              <button 
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

            {/* Total Due Header */}
            <div style={{ 
              width: '100%', 
              background: 'rgba(216, 45, 139, 0.03)', 
              borderRadius: '12px', 
              padding: '16px', 
              border: '1px solid rgba(216, 45, 139, 0.08)',
              marginBottom: '20px'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
                Số tiền bạn cần trả
              </p>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-primary)', margin: 0 }}>
                {amount.toLocaleString()} đ
              </h2>
              {restaurant && restaurant !== 'Không rõ' && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: '4px', fontWeight: 500 }}>
                  Nội dung chia: {restaurant}
                </p>
              )}
            </div>

            {/* Payment Method Tabs */}
            <div style={{ 
              display: 'flex', 
              width: '100%', 
              background: 'rgba(0,0,0,0.04)', 
              borderRadius: '8px', 
              padding: '4px',
              marginBottom: '20px'
            }}>
              <button 
                onClick={() => setMethod('momo')}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: method === 'momo' ? 'var(--gradient-momo)' : 'transparent',
                  color: method === 'momo' ? 'white' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                🌸 Ví MoMo (1 chạm)
              </button>
              <button 
                onClick={() => setMethod('vietqr')}
                style={{ 
                  flex: 1, 
                  padding: '8px', 
                  borderRadius: '6px', 
                  border: 'none', 
                  fontWeight: 600, 
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  background: method === 'vietqr' ? 'rgba(0,0,0,0.06)' : 'transparent',
                  color: method === 'vietqr' ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                  transition: 'all 0.2s'
                }}
              >
                🏦 Chuyển khoản QR
              </button>
            </div>

            {/* TAB CONTENT 1: MOMO */}
            {method === 'momo' && (
              <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                <div style={{ 
                  background: 'rgba(216, 45, 139, 0.05)', 
                  border: '1px solid rgba(216, 45, 139, 0.2)', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1.2rem' }}>🎁</span>
                    <div>
                      <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>Voucher chia tiền nhóm MoMo</p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)' }}>Giảm ngay 10.000đ cho hóa đơn</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={useVoucher} 
                    onChange={(e) => setUseVoucher(e.target.checked)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--color-primary)' }}
                  />
                </div>

                <div style={{ 
                  background: 'rgba(0,0,0,0.015)', 
                  borderRadius: '10px', 
                  padding: '12px', 
                  fontSize: '0.8rem', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '6px',
                  border: '1px solid rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Nguồn tiền:</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>Ví MoMo (*9982)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Tiền gốc:</span>
                    <span style={{ color: 'var(--color-text-primary)' }}>{amount.toLocaleString()} đ</span>
                  </div>
                  {useVoucher && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-success)', fontWeight: 500 }}>
                      <span>Khuyến mãi MoMo:</span>
                      <span>-10.000 đ</span>
                    </div>
                  )}
                  <div style={{ borderTop: '1px dashed rgba(0,0,0,0.08)', marginTop: '6px', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 700 }}>
                    <span style={{ color: 'var(--color-text-primary)' }}>Tổng thanh toán:</span>
                    <span style={{ color: 'var(--color-primary)' }}>{momoFinalAmount.toLocaleString()} đ</span>
                  </div>
                </div>

                <button 
                  onClick={handleConfirmPayment} 
                  className="btn btn-primary"
                  style={{ marginTop: '8px' }}
                >
                  ⚡️ Xác nhận thanh toán một chạm
                </button>
              </div>
            )}

            {/* TAB CONTENT 2: VIETQR */}
            {method === 'vietqr' && (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                
                {/* SVG QR Code */}
                <div style={{ position: 'relative' }}>
                  <svg width="150" height="150" viewBox="0 0 100 100" style={{ background: 'white', padding: '10px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.05)' }}>
                    {/* QR Finder patterns */}
                    <path d="M 0 0 h 25 v 25 h -25 z M 5 5 h 15 v 15 h -15 z" fill="black" />
                    <path d="M 75 0 h 25 v 25 h -25 z M 80 5 h 15 v 15 h -15 z" fill="black" />
                    <path d="M 0 75 h 25 v 25 h -25 z M 5 80 h 15 v 15 h -15 z" fill="black" />
                    {/* Mock QR details */}
                    <rect x="30" y="5" width="10" height="10" fill="black" />
                    <rect x="45" y="10" width="15" height="5" fill="black" />
                    <rect x="40" y="22" width="5" height="15" fill="black" />
                    <rect x="10" y="35" width="15" height="10" fill="black" />
                    <rect x="30" y="45" width="10" height="20" fill="black" />
                    <rect x="60" y="35" width="12" height="12" fill="black" />
                    <rect x="75" y="60" width="20" height="10" fill="black" />
                    <rect x="50" y="70" width="10" height="15" fill="black" />
                    <rect x="35" y="85" width="20" height="5" fill="black" />
                    <rect x="65" y="80" width="5" height="15" fill="black" />
                    <rect x="85" y="85" width="10" height="10" fill="black" />
                    {/* Small center logo */}
                    <rect x="41" y="41" width="18" height="18" rx="4" fill="#D82D8B" />
                    <text x="50" y="53" fill="white" fontSize="10" fontWeight="900" textAnchor="middle" fontFamily="var(--font-sans)">m</text>
                  </svg>
                  <div style={{ position: 'absolute', bottom: '-8px', left: '50%', transform: 'translateX(-50%)', background: '#005a9c', color: 'white', fontSize: '0.65rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '20px', border: '1.5px solid #ffffff', whiteSpace: 'nowrap', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                    VietQR / MB Bank
                  </div>
                </div>

                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', textAlign: 'center', margin: '5px 0 0 0' }}>
                  Quét mã QR bằng ứng dụng ngân hàng bất kỳ để tự động điền thông tin chuyển khoản.
                </p>

                {/* Account Details with Copy buttons */}
                <div style={{ 
                  width: '100%', 
                  background: 'rgba(0,0,0,0.015)', 
                  border: '1px solid rgba(0,0,0,0.04)', 
                  borderRadius: '10px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.8rem',
                  textAlign: 'left'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Tài khoản nhận:</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{hostName.toUpperCase()}</span>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Số tài khoản (MB):</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>0966 123 456</span>
                      <button 
                        onClick={() => handleCopy('0966123456', 'acc')}
                        style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                      >
                        {copiedField === 'acc' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Số tiền:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-primary)' }}>{amount.toLocaleString()} đ</span>
                      <button 
                        onClick={() => handleCopy(amount.toString(), 'amount')}
                        style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                      >
                        {copiedField === 'amount' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Nội dung chuyển:</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {(restaurant && restaurant !== 'Không rõ') ? `${restaurant.toUpperCase()} ${memberName.toUpperCase()}` : `CHIA TIEN ${memberName.toUpperCase()}`}
                      </span>
                      <button 
                        onClick={() => handleCopy((restaurant && restaurant !== 'Không rõ') ? `${restaurant.toUpperCase()} ${memberName.toUpperCase()}` : `CHIA TIEN ${memberName.toUpperCase()}`, 'msg')}
                        style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.06)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                      >
                        {copiedField === 'msg' ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleConfirmPayment} 
                  className="btn btn-secondary"
                  style={{ width: '100%', borderColor: 'rgba(0,0,0,0.06)', color: 'var(--color-text-primary)', background: '#f1f5f9' }}
                >
                  ✓ Tôi đã chuyển khoản thành công
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP: PROCESSING */}
        {step === 'processing' && (
          <div style={{ padding: '30px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
            <div className="spinner" style={{ 
              border: '4px solid rgba(0, 0, 0, 0.06)', 
              borderTop: '4px solid var(--color-primary)', 
              borderRadius: '50%', 
              width: '40px', 
              height: '40px', 
              animation: 'spin 1s linear infinite' 
            }}></div>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
            <h3 style={{ fontSize: '1rem', color: 'var(--color-text-primary)', margin: 0, fontWeight: 700 }}>Đang xác thực giao dịch...</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', margin: 0 }}>
              {method === 'momo' ? 'Kết nối an toàn tới cổng ví MoMo...' : 'Chờ phản hồi từ tài khoản ngân hàng của Host...'}
            </p>
          </div>
        )}

        {/* STEP: SUCCESS */}
        {step === 'success' && (
          <>
            <div className="success-icon-circle">
              ✓
            </div>
            
            <h3 className="title-lg" style={{ fontSize: '1.25rem', color: 'var(--color-success)', marginBottom: '8px' }}>
              Thanh toán thành công!
            </h3>
            
            <p className="subtitle" style={{ fontSize: '0.8rem', marginBottom: '20px' }}>
              {method === 'momo' 
                ? 'Giao dịch qua ví MoMo đã hoàn tất tức thì'
                : `Host (${hostName}) đã nhận được tiền chuyển khoản`
              }
            </p>

            <div style={{ 
              width: '100%', 
              background: 'rgba(0,0,0,0.015)', 
              padding: '16px', 
              borderRadius: '12px', 
              border: '1px solid rgba(0,0,0,0.04)',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Người chuyển:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{memberName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Người nhận:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{hostName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Phương thức:</span>
                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{method === 'momo' ? 'Ví MoMo (Khuyến mãi -10k)' : 'Chuyển khoản VietQR'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px dashed rgba(0,0,0,0.08)' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>Tổng tiền thanh toán:</span>
                <span style={{ fontWeight: 700, color: 'var(--color-success)', fontSize: '1rem' }}>
                  {(method === 'momo' ? momoFinalAmount : amount).toLocaleString()} đ
                </span>
              </div>
            </div>

            <button onClick={onClose} className="btn btn-primary" style={{ background: 'var(--gradient-success)', border: 'none', boxShadow: 'none' }}>
              Tuyệt vời
            </button>
          </>
        )}
      </div>
    </div>
  );
}
