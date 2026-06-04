-- =========================================================================
-- Smart Bill Splitter — Supabase Database Schema
-- Run this in Supabase Dashboard > SQL Editor
-- =========================================================================

-- 1. Bills table
create table if not exists bills (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  restaurant text not null,
  receipt_image text,
  items jsonb not null default '[]'::jsonb,
  shared_fees jsonb not null default '[]'::jsonb,
  status text not null default 'picking' check (status in ('picking', 'locked'))
);

-- 2. Members table
create table if not exists members (
  id text not null,
  bill_id uuid references bills(id) on delete cascade,
  name text not null,
  avatar text not null,
  color text not null,
  status text not null default 'picking' check (status in ('picking', 'submitted', 'approved')),
  has_paid boolean not null default false,
  primary key (id, bill_id)
);

-- 3. Item Selections table
create table if not exists item_selections (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills(id) on delete cascade,
  item_id text not null,
  member_id text not null,
  qty integer not null default 1 check (qty > 0),
  unique (bill_id, item_id, member_id)
);

-- 4. Edit Requests table
create table if not exists edit_requests (
  id text primary key,
  bill_id uuid references bills(id) on delete cascade,
  item_id text not null,
  member_name text not null,
  old_val jsonb not null,
  new_val jsonb not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

-- 5. Enable Row Level Security (allow all for hackathon demo)
alter table bills enable row level security;
alter table members enable row level security;
alter table item_selections enable row level security;
alter table edit_requests enable row level security;

-- Allow public access (using anon key) — FOR HACKATHON ONLY
create policy "Allow all on bills" on bills for all using (true) with check (true);
create policy "Allow all on members" on members for all using (true) with check (true);
create policy "Allow all on item_selections" on item_selections for all using (true) with check (true);
create policy "Allow all on edit_requests" on edit_requests for all using (true) with check (true);

-- 6. Enable Realtime
alter publication supabase_realtime add table bills;
alter publication supabase_realtime add table members;
alter publication supabase_realtime add table item_selections;
alter publication supabase_realtime add table edit_requests;
