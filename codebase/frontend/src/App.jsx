import React, { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';
import PickItemsPage from './pages/PickItemsPage';
import { mockBillResult } from './data/mockBillData';

// Helper functions for localStorage loading
const loadStored = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try {
    return JSON.parse(stored);
  } catch(e) {
    return fallback;
  }
};

const loadStoredString = (key, fallback) => {
  return localStorage.getItem(key) || fallback;
};

export default function App() {
  // Read initial page from URL query param (?page=pick)
  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = urlParams.get('page') || 'upload';
  
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [receiptImage, setReceiptImage] = useState(() => loadStoredString('momo_split_receiptImage', ''));
  
  // App state synchronized with LocalStorage
  const [restaurant, setRestaurant] = useState(() => loadStoredString('momo_split_restaurant', mockBillResult.restaurant));
  const [billItems, setBillItems] = useState(() => loadStored('momo_split_billItems', mockBillResult.items));
  const [sharedFees, setSharedFees] = useState(() => loadStored('momo_split_sharedFees', mockBillResult.sharedFees));
  
  const [members, setMembers] = useState(() => loadStored('momo_split_members', [
    { id: 'host', name: 'Hoàng Anh (Host)', avatar: 'HA', color: 'member-avatar-pink' },
    { id: 'linh', name: 'Linh', avatar: 'L', color: 'member-avatar-blue' },
    { id: 'nam', name: 'Nam', avatar: 'N', color: 'member-avatar-orange' },
    { id: 'huong', name: 'Hương', avatar: 'H', color: 'member-avatar-green' }
  ]));

  const [itemSelections, setItemSelections] = useState(() => loadStored('momo_split_itemSelections', {
    1: [],
    2: ['host', 'linh', 'nam', 'huong'],
    3: [],
    4: [],
    5: [],
    6: [],
    7: []
  }));

  // Hackathon Multi-User Status States
  const [billStatus, setBillStatus] = useState(() => loadStoredString('momo_split_billStatus', 'picking')); // 'picking', 'locked'
  const [memberStatuses, setMemberStatuses] = useState(() => loadStored('momo_split_memberStatuses', {})); // { memberId: 'picking' | 'submitted' }
  const [memberPayments, setMemberPayments] = useState(() => loadStored('momo_split_memberPayments', {})); // { memberId: boolean }
  
  // Edit requests from friends to Host
  const [editRequests, setEditRequests] = useState(() => loadStored('momo_split_editRequests', []));

  // Save to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('momo_split_restaurant', restaurant);
  }, [restaurant]);

  useEffect(() => {
    localStorage.setItem('momo_split_receiptImage', receiptImage || '');
  }, [receiptImage]);

  useEffect(() => {
    localStorage.setItem('momo_split_billItems', JSON.stringify(billItems));
  }, [billItems]);

  useEffect(() => {
    localStorage.setItem('momo_split_sharedFees', JSON.stringify(sharedFees));
  }, [sharedFees]);

  useEffect(() => {
    localStorage.setItem('momo_split_members', JSON.stringify(members));
  }, [members]);

  useEffect(() => {
    localStorage.setItem('momo_split_itemSelections', JSON.stringify(itemSelections));
  }, [itemSelections]);

  useEffect(() => {
    localStorage.setItem('momo_split_billStatus', billStatus);
  }, [billStatus]);

  useEffect(() => {
    localStorage.setItem('momo_split_memberStatuses', JSON.stringify(memberStatuses));
  }, [memberStatuses]);

  useEffect(() => {
    localStorage.setItem('momo_split_memberPayments', JSON.stringify(memberPayments));
  }, [memberPayments]);

  useEffect(() => {
    localStorage.setItem('momo_split_editRequests', JSON.stringify(editRequests));
  }, [editRequests]);

  // Synchronize state in real-time when updated in another tab
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.newValue) return;
      try {
        if (e.key === 'momo_split_restaurant') {
          setRestaurant(e.newValue);
        } else if (e.key === 'momo_split_receiptImage') {
          setReceiptImage(e.newValue);
        } else if (e.key === 'momo_split_billItems') {
          setBillItems(JSON.parse(e.newValue));
        } else if (e.key === 'momo_split_sharedFees') {
          setSharedFees(JSON.parse(e.newValue));
        } else if (e.key === 'momo_split_members') {
          setMembers(JSON.parse(e.newValue));
        } else if (e.key === 'momo_split_itemSelections') {
          setItemSelections(JSON.parse(e.newValue));
        } else if (e.key === 'momo_split_billStatus') {
          setBillStatus(e.newValue);
        } else if (e.key === 'momo_split_memberStatuses') {
          setMemberStatuses(JSON.parse(e.newValue));
        } else if (e.key === 'momo_split_memberPayments') {
          setMemberPayments(JSON.parse(e.newValue));
        } else if (e.key === 'momo_split_editRequests') {
          setEditRequests(JSON.parse(e.newValue));
        }
      } catch (err) {
        console.error("Error parsing storage change", err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen to URL changes (when clicking Reset or changing navigation)
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const page = params.get('page') || 'upload';
      setCurrentPage(page);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleReset = () => {
    localStorage.removeItem('momo_split_restaurant');
    localStorage.removeItem('momo_split_receiptImage');
    localStorage.removeItem('momo_split_billItems');
    localStorage.removeItem('momo_split_sharedFees');
    localStorage.removeItem('momo_split_members');
    localStorage.removeItem('momo_split_itemSelections');
    localStorage.removeItem('momo_split_billStatus');
    localStorage.removeItem('momo_split_memberStatuses');
    localStorage.removeItem('momo_split_memberPayments');
    localStorage.removeItem('momo_split_editRequests');

    setReceiptImage('');
    setRestaurant(mockBillResult.restaurant);
    setBillItems(JSON.parse(JSON.stringify(mockBillResult.items)));
    setSharedFees(JSON.parse(JSON.stringify(mockBillResult.sharedFees)));
    setMembers([
      { id: 'host', name: 'Hoàng Anh (Host)', avatar: 'HA', color: 'member-avatar-pink' },
      { id: 'linh', name: 'Linh', avatar: 'L', color: 'member-avatar-blue' },
      { id: 'nam', name: 'Nam', avatar: 'N', color: 'member-avatar-orange' },
      { id: 'huong', name: 'Hương', avatar: 'H', color: 'member-avatar-green' }
    ]);
    setItemSelections({
      1: [],
      2: ['host', 'linh', 'nam', 'huong'],
      3: [],
      4: [],
      5: [],
      6: [],
      7: []
    });
    setBillStatus('picking');
    setMemberStatuses({});
    setMemberPayments({});
    setEditRequests([]);

    // Clear URL page param
    window.history.pushState({}, '', window.location.pathname);
    setCurrentPage('upload');
  };

  return (
    <div className="phone-container">
      {/* MoMo style App Header */}
      <header className="app-header">
        <div className="logo-momo">m</div>
        <div>
          <h1>Smart Bill Splitter</h1>
          <p style={{ fontSize: '0.72rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            MoMo AI Lab / Day 06 Prototype
          </p>
        </div>
        {currentPage !== 'upload' && (
          <button 
            onClick={handleReset} 
            className="item-action-btn" 
            style={{ marginLeft: 'auto', fontSize: '0.72rem', padding: '6px 10px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.06)', background: '#f1f5f9', fontWeight: 600, color: 'var(--color-text-primary)' }}
          >
            Reset
          </button>
        )}
      </header>

      {/* Page Routing */}
      {currentPage === 'upload' && (
        <UploadPage 
          setReceiptImage={(img) => {
            setReceiptImage(img);
            localStorage.setItem('momo_split_receiptImage', img || '');
          }} 
          onScanComplete={() => {
            window.history.pushState({}, '', '?page=review');
            setCurrentPage('review');
          }} 
        />
      )}

      {currentPage === 'review' && (
        <ReviewPage 
          receiptImage={receiptImage}
          restaurant={restaurant}
          setRestaurant={setRestaurant}
          billItems={billItems}
          setBillItems={setBillItems}
          sharedFees={sharedFees}
          setSharedFees={setSharedFees}
          members={members}
          setMembers={setMembers}
          itemSelections={itemSelections}
          setItemSelections={setItemSelections}
          billStatus={billStatus}
          setBillStatus={setBillStatus}
          memberStatuses={memberStatuses}
          setMemberStatuses={setMemberStatuses}
          memberPayments={memberPayments}
          setMemberPayments={setMemberPayments}
          editRequests={editRequests}
          setEditRequests={setEditRequests}
          onNext={() => {
            window.history.pushState({}, '', '?page=pick');
            setCurrentPage('pick');
          }}
          onBack={() => {
            window.history.pushState({}, '', '?page=upload');
            setCurrentPage('upload');
          }}
        />
      )}

      {currentPage === 'pick' && (
        <PickItemsPage 
          restaurant={restaurant}
          billItems={billItems}
          sharedFees={sharedFees}
          members={members}
          setMembers={setMembers}
          itemSelections={itemSelections}
          setItemSelections={setItemSelections}
          billStatus={billStatus}
          setBillStatus={setBillStatus}
          memberStatuses={memberStatuses}
          setMemberStatuses={setMemberStatuses}
          memberPayments={memberPayments}
          setMemberPayments={setMemberPayments}
          editRequests={editRequests}
          setEditRequests={setEditRequests}
          onBack={() => {
            window.history.pushState({}, '', '?page=review');
            setCurrentPage('review');
          }}
        />
      )}
    </div>
  );
}
