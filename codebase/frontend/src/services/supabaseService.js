/**
 * Supabase Service Client and API Functions
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install Supabase JS SDK:
 *    npm install @supabase/supabase-js
 * 
 * 2. Add your credentials in .env or .env.local file:
 *    VITE_SUPABASE_URL=https://your-project-id.supabase.co
 *    VITE_SUPABASE_ANON_KEY=your-anon-public-key
 * 
 * 3. Run the SQL DDL commands below in the Supabase SQL Editor to set up the schema.
 */

/*
-- =========================================================================
-- SQL SCHEMA FOR SUPABASE DATABASE SETUP
-- =========================================================================

-- Enable Realtime for these tables in Supabase -> Database -> Replication
-- Or run: alter publication supabase_realtime add table bills, members, item_selections, edit_requests;

-- 1. Create Bills Table
create table bills (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  restaurant text not null,
  receipt_image text, -- Stores image URL or base64
  items jsonb not null default '[]'::jsonb, -- Array of items: { id, name, price, qty }
  shared_fees jsonb not null default '[]'::jsonb, -- Array of fees: { id, name, amount }
  status text not null default 'picking' check (status in ('picking', 'locked'))
);

-- 2. Create Members Table
create table members (
  id text not null, -- Use our local 'member_xxx' or 'host' string IDs
  bill_id uuid references bills(id) on delete cascade,
  name text not null,
  avatar text not null,
  color text not null,
  status text not null default 'picking' check (status in ('picking', 'submitted', 'approved')),
  has_paid boolean not null default false,
  primary key (id, bill_id)
);

-- 3. Create Item Selections Table (to store quantity selection)
create table item_selections (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills(id) on delete cascade,
  item_id text not null, -- ID of the bill item
  member_id text not null,
  qty integer not null default 1 check (qty > 0)
);

-- 4. Create Edit Requests Table
create table edit_requests (
  id text primary key, -- req_xxx
  bill_id uuid references bills(id) on delete cascade,
  item_id text not null,
  member_name text not null,
  old_val jsonb not null, -- { name, price, qty }
  new_val jsonb not null, -- { name, price, qty }
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

if (!supabase) {
  console.warn("Supabase credentials missing. Supabase service is running in mock/demo mode.");
}

/**
 * 1. Create a brand new Bill
 * @param {string} restaurant - Name of the restaurant
 * @param {Array} items - Scanned food items list [{ id, name, price, qty }]
 * @param {Array} sharedFees - Shared fees list [{ id, name, amount }]
 * @returns {Promise<string>} - The newly created Bill UUID
 */
export async function createBill(restaurant, items = [], sharedFees = [], receiptImage = null) {
  if (!supabase) {
    console.error("Supabase client not initialized.");
    return 'demo_bill_id';
  }

  const { data, error } = await supabase
    .from('bills')
    .insert([{ restaurant, items, shared_fees: sharedFees, status: 'picking', receipt_image: receiptImage }])
    .select('id')
    .single();

  if (error) {
    console.error("Error creating bill:", error.message);
    throw error;
  }

  // Auto-add Host member by default
  await addMember(data.id, 'host', 'Tôi (Host)', 'T', 'member-avatar-pink');

  return data.id;
}

/**
 * 2. Fetch full Bill details
 * @param {string} billId - Bill UUID
 * @returns {Promise<object>} - All details (bill, members, itemSelections, editRequests)
 */
export async function getBill(billId) {
  if (!supabase) return null;

  // Query all tables in parallel
  const [billRes, membersRes, selectionsRes, editRequestsRes] = await Promise.all([
    supabase.from('bills').select('*').eq('id', billId).single(),
    supabase.from('members').select('*').eq('bill_id', billId),
    supabase.from('item_selections').select('*').eq('bill_id', billId),
    supabase.from('edit_requests').select('*').eq('bill_id', billId)
  ]);

  if (billRes.error) {
    console.error("Error fetching bill:", billRes.error.message);
    throw billRes.error;
  }

  // Process item selections: Convert flat list of rows { item_id, member_id, qty }
  // to local state format: { [itemId]: [memberId, memberId, ...] } based on qty
  const formattedSelections = {};
  if (selectionsRes.data) {
    selectionsRes.data.forEach(sel => {
      const arr = [];
      for (let i = 0; i < sel.qty; i++) {
        arr.push(sel.member_id);
      }
      formattedSelections[sel.item_id] = [
        ...(formattedSelections[sel.item_id] || []),
        ...arr
      ];
    });
  }

  // Convert members format
  const formattedMembers = (membersRes.data || []).map(m => ({
    id: m.id,
    name: m.name,
    avatar: m.avatar,
    color: m.color
  }));

  // Convert statuses & payments format
  const memberStatuses = {};
  const memberPayments = {};
  (membersRes.data || []).forEach(m => {
    memberStatuses[m.id] = m.status;
    memberPayments[m.id] = m.has_paid;
  });

  return {
    bill: {
      id: billRes.data.id,
      restaurant: billRes.data.restaurant,
      receiptImage: billRes.data.receipt_image,
      items: billRes.data.items,
      sharedFees: billRes.data.shared_fees,
      status: billRes.data.status
    },
    members: formattedMembers,
    itemSelections: formattedSelections,
    memberStatuses,
    memberPayments,
    editRequests: editRequestsRes.data || []
  };
}

/**
 * 3. Subscribe to Realtime changes for a Bill
 * @param {string} billId - Bill UUID
 * @param {function} onUpdate - Callback when any change happens in the database
 * @returns {object} - The subscription object (call subscription.unsubscribe() to cleanup)
 */
export function subscribeToBill(billId, onUpdate) {
  if (!supabase) return { unsubscribe: () => {} };

  const channel = supabase
    .channel(`bill-room-${billId}`)
    .on('postgres_changes', { event: '*', schema: 'public', filter: `bill_id=eq.${billId}` }, async (payload) => {
      // Re-fetch everything and trigger callback on any database modification
      const data = await getBill(billId);
      onUpdate(data);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bills', filter: `id=eq.${billId}` }, async (payload) => {
      const data = await getBill(billId);
      onUpdate(data);
    })
    .subscribe();

  return channel;
}

/**
 * 4. Add a new Member
 */
export async function addMember(billId, memberId, name, avatar, color) {
  if (!supabase) return;

  const { error } = await supabase
    .from('members')
    .insert([{
      id: memberId,
      bill_id: billId,
      name,
      avatar,
      color,
      status: 'picking',
      has_paid: false
    }]);

  if (error) {
    console.error("Error adding member:", error.message);
    throw error;
  }
}

/**
 * 5. Update a member's quantity selection for an item
 * @param {string} billId - Bill UUID
 * @param {string} itemId - Item ID
 * @param {string} memberId - Member ID
 * @param {number} qty - New quantity (if 0, deletion is triggered)
 */
export async function updateItemSelections(billId, itemId, memberId, qty) {
  if (!supabase) return;

  if (qty <= 0) {
    // Delete selection if qty reaches 0
    const { error } = await supabase
      .from('item_selections')
      .delete()
      .eq('bill_id', billId)
      .eq('item_id', itemId)
      .eq('member_id', memberId);

    if (error) {
      console.error("Error deleting selection:", error.message);
      throw error;
    }
  } else {
    // Upsert new quantity
    const { error } = await supabase
      .from('item_selections')
      .upsert({
        bill_id: billId,
        item_id: itemId,
        member_id: memberId,
        qty
      }, {
        onConflict: 'bill_id,item_id,member_id'
      });

    if (error) {
      console.error("Error updating selection quantity:", error.message);
      throw error;
    }
  }
}

/**
 * 6. Submit selections (Mark member status as 'submitted')
 */
export async function submitSelections(billId, memberId) {
  if (!supabase) return;

  const { error } = await supabase
    .from('members')
    .update({ status: 'submitted' })
    .eq('bill_id', billId)
    .eq('id', memberId);

  if (error) {
    console.error("Error submitting member selections:", error.message);
    throw error;
  }
}

/**
 * 7. Approve / Reject member selections (Host action)
 * @param {string} billId - Bill UUID
 * @param {string} memberId - Member ID
 * @param {boolean} isApproved - true to approve, false to send back to 'picking'
 */
export async function approveMemberSelections(billId, memberId, isApproved) {
  if (!supabase) return;

  const status = isApproved ? 'approved' : 'picking';
  const { error } = await supabase
    .from('members')
    .update({ status })
    .eq('bill_id', billId)
    .eq('id', memberId);

  if (error) {
    console.error("Error changing approval status:", error.message);
    throw error;
  }
}

/**
 * 8. Lock / Unlock the Bill (Host action)
 * @param {string} billId - Bill UUID
 * @param {boolean} isLocked - true to lock, false to unlock
 */
export async function lockBill(billId, isLocked) {
  if (!supabase) return;

  const status = isLocked ? 'locked' : 'picking';
  const { error } = await supabase
    .from('bills')
    .update({ status })
    .eq('id', billId);

  if (error) {
    console.error("Error locking/unlocking bill:", error.message);
    throw error;
  }
}

/**
 * 9. Pay member share (Mark as paid)
 */
export async function payMemberShare(billId, memberId) {
  if (!supabase) return;

  const { error } = await supabase
    .from('members')
    .update({ has_paid: true })
    .eq('bill_id', billId)
    .eq('id', memberId);

  if (error) {
    console.error("Error paying member share:", error.message);
    throw error;
  }
}

/**
 * 10. Create an Edit Request from friends to Host
 */
export async function createEditRequest(billId, request) {
  if (!supabase) return;

  const { error } = await supabase
    .from('edit_requests')
    .insert([{
      id: request.id,
      bill_id: billId,
      item_id: request.itemId,
      member_name: request.memberName,
      old_val: request.oldVal,
      new_val: request.newVal,
      reason: request.reason,
      status: 'pending'
    }]);

  if (error) {
    console.error("Error creating edit request:", error.message);
    throw error;
  }
}

/**
 * 11. Handle Edit Request (Host action: approve or reject)
 * @param {string} billId - Bill UUID
 * @param {string} requestId - Edit Request ID
 * @param {boolean} isApproved - true to approve, false to reject
 * @param {Array} updatedItems - If approved, this should contain the updated full bill items list
 */
export async function handleEditRequest(billId, requestId, isApproved, updatedItems = null) {
  if (!supabase) return;

  const status = isApproved ? 'approved' : 'rejected';
  
  if (isApproved && updatedItems) {
    const { error: billErr } = await supabase
      .from('bills')
      .update({ items: updatedItems })
      .eq('id', billId);

    if (billErr) {
      console.error("Error updating bill items on edit request approval:", billErr.message);
      throw billErr;
    }
  }

  const { error } = await supabase
    .from('edit_requests')
    .update({ status })
    .eq('bill_id', billId)
    .eq('id', requestId);

  if (error) {
    console.error("Error resolving edit request:", error.message);
    throw error;
  }
}

/**
 * 12. Remove a member and their selections
 */
export async function removeMember(billId, memberId) {
  if (!supabase) return;

  await supabase
    .from('item_selections')
    .delete()
    .eq('bill_id', billId)
    .eq('member_id', memberId);

  const { error } = await supabase
    .from('members')
    .delete()
    .eq('bill_id', billId)
    .eq('id', memberId);

  if (error) {
    console.error("Error removing member:", error.message);
    throw error;
  }
}

/**
 * 13. Generic bill update (items, shared_fees, restaurant, etc.)
 */
export async function updateBill(billId, updates) {
  if (!supabase) return;

  const { error } = await supabase
    .from('bills')
    .update(updates)
    .eq('id', billId);

  if (error) {
    console.error("Error updating bill:", error.message);
    throw error;
  }
}
