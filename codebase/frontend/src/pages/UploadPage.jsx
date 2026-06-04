import React, { useState } from 'react';

export default function UploadPage({ setReceiptImage, onScanComplete }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);

  const handleUseSample = () => {
    const samplePath = '/sample-bill.png';
    setSelectedFile(samplePath);
    setReceiptImage(samplePath);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setSelectedFile(fileUrl);
      setReceiptImage(fileUrl);
    }
  };

  const handleStartScan = () => {
    if (!selectedFile) return;
    
    setIsScanning(true);
    setScanStep(0);

    // Simulate scanning steps
    const timer1 = setTimeout(() => setScanStep(1), 700);
    const timer2 = setTimeout(() => setScanStep(2), 1400);
    const timer3 = setTimeout(() => {
      setIsScanning(false);
      onScanComplete();
    }, 2200);
  };

  return (
    <div className="preview-layout" style={{ justifyContent: 'center', minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
        <h2 className="title-lg" style={{ background: 'linear-gradient(to right, #ff60b6, #b843cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>
          Tải Bill Lên Chia Tiền
        </h2>
        <p className="subtitle" style={{ marginBottom: '20px' }}>
          Chụp ảnh hóa đơn nhà hàng của bạn. AI sẽ tự động đọc món, phân tích thuế phí và tạo link chọn món cho cả nhóm.
        </p>

        {/* Drag Drop Area */}
        <div className="upload-area" onClick={() => !selectedFile && document.getElementById('bill-input').click()}>
          <input 
            type="file" 
            id="bill-input" 
            accept="image/*" 
            onChange={handleFileChange} 
            style={{ display: 'none' }} 
            disabled={isScanning}
          />
          
          {selectedFile ? (
            <div className="scanner-container">
              {isScanning && <div className="scanner-line"></div>}
              <img 
                src={selectedFile} 
                alt="Receipt Preview" 
                style={{ width: '100%', maxHeight: '350px', objectFit: 'contain', borderRadius: '8px', opacity: isScanning ? 0.7 : 1 }} 
              />
            </div>
          ) : (
            <>
              <div className="upload-icon">📸</div>
              <p style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>Chụp ảnh hoặc Chọn ảnh</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Hỗ trợ JPG, PNG, WEBP</p>
            </>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {!selectedFile ? (
            <button onClick={handleUseSample} className="btn btn-secondary">
              ✨ Sử dụng Hóa đơn Mẫu (Haidilao)
            </button>
          ) : isScanning ? (
            <button className="btn btn-primary" disabled style={{ opacity: 0.8 }}>
              <span className="spinner" style={{ marginRight: '8px' }}>⏳</span>
              {scanStep === 0 && "Đang đọc ảnh..."}
              {scanStep === 1 && "Nhận diện chữ viết bằng AI..."}
              {scanStep === 2 && "Tách món lẻ và phí chung..."}
            </button>
          ) : (
            <>
              <button onClick={handleStartScan} className="btn btn-primary">
                ⚡️ AI Quét Hóa Đơn
              </button>
              <button onClick={handleUseSample} className="btn btn-secondary" style={{ fontSize: '0.85rem' }}>
                Thay bằng bill mẫu
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--color-text-muted)', padding: '0 20px' }}>
        * Dữ liệu hóa đơn được xử lý trực tiếp bằng mô hình Vision AI bảo mật cao.
      </div>
    </div>
  );
}
