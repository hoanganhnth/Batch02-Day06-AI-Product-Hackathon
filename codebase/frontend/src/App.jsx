import React, { useState, useEffect } from 'react';
import UploadPage from './pages/UploadPage';
import ReviewPage from './pages/ReviewPage';
import PickItemsPage from './pages/PickItemsPage';
import { supabase, createBill, getBill, subscribeToBill } from './services/supabaseService';

const loadStored = (key, fallback) => {
  const stored = localStorage.getItem(key);
  if (!stored) return fallback;
  try { return JSON.parse(stored); } catch { return fallback; }
};
const loadStoredString = (key, fallback) => localStorage.getItem(key) || fallback;

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const initialPage = urlParams.get('page') || 'upload';
  const initialBillId = urlParams.get('bill') || loadStoredString('momo_split_billId', '');

  const [currentPage, setCurrentPage] = useState(initialPage);
  const [billId, setBillId] = useState(initialBillId);
  const [receiptImage, setReceiptImage] = useState(() => loadStoredString('momo_split_receiptImage', ''));
  const [restaurant, setRestaurant] = useState(() => loadStoredString('momo_split_restaurant', ''));
  const [billItems, setBillItems] = useState(() => loadStored('momo_split_billItems', []));
  const [sharedFees, setSharedFees] = useState(() => loadStored('momo_split_sharedFees', []));
  const [members, setMembers] = useState(() => loadStored('momo_split_members', [
    { id: 'host', name: 'Hoàng Anh (Host)', avatar: 'HA', color: 'member-avatar-pink' },
    { id: 'linh', name: 'Linh', avatar: 'L', color: 'member-avatar-blue' },
    { id: 'nam', name: 'Nam', avatar: 'N', color: 'member-avatar-orange' },
    { id: 'huong', name: 'Hương', avatar: 'H', color: 'member-avatar-green' }
  ]));
  const [itemSelections, setItemSelections] = useState(() => loadStored('momo_split_itemSelections', {
    1: [], 2: ['host', 'linh', 'nam', 'huong'], 3: [], 4: [], 5: [], 6: [], 7: []
  }));
  const [billStatus, setBillStatus] = useState(() => loadStoredString('momo_split_billStatus', 'picking'));
  const [memberStatuses, setMemberStatuses] = useState(() => loadStored('momo_split_memberStatuses', {}));
  const [memberPayments, setMemberPayments] = useState(() => loadStored('momo_split_memberPayments', {}));
  const [editRequests, setEditRequests] = useState(() => loadStored('momo_split_editRequests', []));

  // --- Supabase: Load + Subscribe when billId exists ---
  useEffect(() => {
    if (!billId || !supabase) return;
    let mounted = true;

    const hydrate = (data) => {
      if (!data || !mounted) return;
      setRestaurant(data.bill.restaurant);
      setReceiptImage(data.bill.receiptImage || '');
      setBillItems(data.bill.items);
      setSharedFees(data.bill.sharedFees);
      setBillStatus(data.bill.status);
      setMembers(data.members);
      setItemSelections(data.itemSelections);
      setMemberStatuses(data.memberStatuses);
      setMemberPayments(data.memberPayments);
      setEditRequests(data.editRequests);
    };

    getBill(billId).then(hydrate).catch(err => console.error('Failed to load bill:', err));

    const channel = subscribeToBill(billId, hydrate);

    return () => { mounted = false; channel.unsubscribe(); };
  }, [billId]);

  // --- LocalStorage persistence (fallback + offline cache) ---
  useEffect(() => { localStorage.setItem('momo_split_restaurant', restaurant); }, [restaurant]);
  useEffect(() => { localStorage.setItem('momo_split_receiptImage', receiptImage || ''); }, [receiptImage]);
  useEffect(() => { localStorage.setItem('momo_split_billItems', JSON.stringify(billItems)); }, [billItems]);
  useEffect(() => { localStorage.setItem('momo_split_sharedFees', JSON.stringify(sharedFees)); }, [sharedFees]);
  useEffect(() => { localStorage.setItem('momo_split_members', JSON.stringify(members)); }, [members]);
  useEffect(() => { localStorage.setItem('momo_split_itemSelections', JSON.stringify(itemSelections)); }, [itemSelections]);
  useEffect(() => { localStorage.setItem('momo_split_billStatus', billStatus); }, [billStatus]);
  useEffect(() => { localStorage.setItem('momo_split_memberStatuses', JSON.stringify(memberStatuses)); }, [memberStatuses]);
  useEffect(() => { localStorage.setItem('momo_split_memberPayments', JSON.stringify(memberPayments)); }, [memberPayments]);
  useEffect(() => { localStorage.setItem('momo_split_editRequests', JSON.stringify(editRequests)); }, [editRequests]);
  useEffect(() => { if (billId) localStorage.setItem('momo_split_billId', billId); }, [billId]);

  // --- Cross-tab sync via storage event ---
  useEffect(() => {
    const handle = (e) => {
      if (!e.newValue) return;
      try {
        const map = {
          momo_split_restaurant: v => setRestaurant(v),
          momo_split_receiptImage: v => setReceiptImage(v),
          momo_split_billItems: v => setBillItems(JSON.parse(v)),
          momo_split_sharedFees: v => setSharedFees(JSON.parse(v)),
          momo_split_members: v => setMembers(JSON.parse(v)),
          momo_split_itemSelections: v => setItemSelections(JSON.parse(v)),
          momo_split_billStatus: v => setBillStatus(v),
          momo_split_memberStatuses: v => setMemberStatuses(JSON.parse(v)),
          momo_split_memberPayments: v => setMemberPayments(JSON.parse(v)),
          momo_split_editRequests: v => setEditRequests(JSON.parse(v)),
        };
        if (map[e.key]) map[e.key](e.newValue);
      } catch (err) { console.error("Storage sync error", err); }
    };
    window.addEventListener('storage', handle);
    return () => window.removeEventListener('storage', handle);
  }, []);

  // --- URL popstate ---
  useEffect(() => {
    const handle = () => {
      const p = new URLSearchParams(window.location.search);
      setCurrentPage(p.get('page') || 'upload');
      const b = p.get('bill');
      if (b) setBillId(b);
    };
    window.addEventListener('popstate', handle);
    return () => window.removeEventListener('popstate', handle);
  }, []);

  // --- Navigation helpers ---
  const navigate = (page) => {
    const qs = billId ? `?page=${page}&bill=${billId}` : `?page=${page}`;
    window.history.pushState({}, '', qs);
    setCurrentPage(page);
  };

  // --- Bill creation after AI scan ---
  const handleScanComplete = async (scanResult) => {
    // Update local state with scan results (or keep defaults for mock mode)
    if (scanResult) {
      setRestaurant(scanResult.restaurant);
      setBillItems(scanResult.items);
      setSharedFees(scanResult.sharedFees);
    }

    // Create bill in Supabase
    if (supabase) {
      try {
        const r = scanResult || { restaurant, items: billItems, sharedFees };
        // Save the base64 image (from scanResult) so it persists across devices,
        // rather than the local blob URL which only works on this machine.
        const imageToSave = (scanResult && scanResult.base64Image) ? scanResult.base64Image : receiptImage; 
        const newId = await createBill(r.restaurant, r.items, r.sharedFees, imageToSave);
        setBillId(newId);
        window.history.pushState({}, '', `?page=review&bill=${newId}`);
        setCurrentPage('review');
        return;
      } catch (err) {
        console.error('Failed to create bill in Supabase:', err);
      }
    }
    navigate('review');
  };

  const handleReset = () => {
    // Clear localStorage
    ['restaurant', 'receiptImage', 'billItems', 'sharedFees', 'members',
     'itemSelections', 'billStatus', 'memberStatuses', 'memberPayments',
     'editRequests', 'billId'
    ].forEach(k => localStorage.removeItem(`momo_split_${k}`));

    setReceiptImage('');
    setBillId('');
    setRestaurant('');
    setBillItems([]);
    setSharedFees([]);
    setMembers([
      { id: 'host', name: 'Hoàng Anh (Host)', avatar: 'HA', color: 'member-avatar-pink' },
      { id: 'linh', name: 'Linh', avatar: 'L', color: 'member-avatar-blue' },
      { id: 'nam', name: 'Nam', avatar: 'N', color: 'member-avatar-orange' },
      { id: 'huong', name: 'Hương', avatar: 'H', color: 'member-avatar-green' }
    ]);
    setItemSelections({ 1: [], 2: ['host', 'linh', 'nam', 'huong'], 3: [], 4: [], 5: [], 6: [], 7: [] });
    setBillStatus('picking');
    setMemberStatuses({});
    setMemberPayments({});
    setEditRequests([]);

    window.history.pushState({}, '', window.location.pathname);
    setCurrentPage('upload');
  };

  return (
    <div className="phone-container">
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

      {currentPage === 'upload' && (
        <UploadPage
          setReceiptImage={(img) => { setReceiptImage(img); localStorage.setItem('momo_split_receiptImage', img || ''); }}
          setRestaurant={setRestaurant}
          setBillItems={setBillItems}
          setSharedFees={setSharedFees}
          onScanComplete={handleScanComplete}
        />
      )}

      {currentPage === 'review' && (
        <ReviewPage
          billId={billId}
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
          onNext={() => navigate('pick')}
          onBack={() => navigate('upload')}
        />
      )}

      {currentPage === 'pick' && (
        <PickItemsPage
          billId={billId}
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
          onBack={() => navigate('review')}
        />
      )}
    </div>
  );
}
