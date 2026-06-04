import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';
const scanEndpoint = API_URL ? API_URL.replace(/\/$/, '') + '/api/scan-receipt' : '';

export default function UploadPage({ setReceiptImage, onScanComplete, setBillItems, setSharedFees, setRestaurant }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFileObj, setSelectedFileObj] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scanError, setScanError] = useState('');

  const handleUseSample = () => {
    const samplePath = '/sample-bill.png';
    setSelectedFile(samplePath);
    setSelectedFileObj(null);
    setReceiptImage(samplePath);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileUrl = URL.createObjectURL(file);
      setSelectedFile(fileUrl);
      setSelectedFileObj(file);
      setReceiptImage(fileUrl);
      setScanError('');
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimension 1024px to keep base64 size small (< 300KB)
          const MAX_SIZE = 1024;
          if (width > height && width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Compress as JPEG 70%
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fetchImageAsBase64 = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return fileToBase64(blob);
  };

  const handleStartScan = async () => {
    if (!selectedFile) return;

    setIsScanning(true);
    setScanStep(0);
    setScanError('');

    // If no API backend configured, fall back to mock demo mode
    if (!API_URL) {
      setScanStep(0);
      setTimeout(() => setScanStep(1), 700);
      setTimeout(() => setScanStep(2), 1400);
      setTimeout(async () => {
        setScanStep(3);
        await onScanComplete(null);
        setIsScanning(false);
      }, 2200);
      return;
    }

    try {
      // Step 1: Convert image to base64
      setScanStep(0);
      let base64;
      if (selectedFileObj) {
        base64 = await fileToBase64(selectedFileObj);
      } else {
        base64 = await fetchImageAsBase64(selectedFile);
      }

      // Step 2: Call AI backend
      setScanStep(1);
      const response = await fetch(scanEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      // Step 3: Parse result
      setScanStep(2);
      const result = await response.json();
      result.base64Image = base64; // attach base64 so App can save to DB

      // Small delay for UX feel before navigating
      await new Promise((r) => setTimeout(r, 600));
      setScanStep(3);
      await onScanComplete(result);
      setIsScanning(false);
    } catch (err) {
      console.error('Scan error:', err);
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      setScanError(
        isNetworkError
          ? 'Không gọi được AI backend (' + (scanEndpoint || 'chưa cấu hình VITE_API_URL') + '). Hãy kiểm tra tunnel/backend còn chạy và frontend đã build lại đúng URL.'
          : err.message || 'Có lỗi xảy ra khi quét hóa đơn.'
      );
      setIsScanning(false);
    }
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

        {/* Error display */}
        {scanError && (
          <div style={{ 
            marginTop: '12px', padding: '10px 14px', borderRadius: '8px',
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', fontSize: '0.85rem', textAlign: 'left'
          }}>
            ⚠️ {scanError}
          </div>
        )}

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
              {scanStep === 3 && "Đang tạo phòng chia tiền..."}
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
        {API_URL
          ? '* AI backend: ' + scanEndpoint
          : '* Đang chạy chế độ demo — chưa kết nối AI backend.'}
      </div>
    </div>
  );
}
