import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://sijorwsblxgqyaclzmks.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNpam9yd3NibHhncXlhY2x6bWtzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTI4NDMsImV4cCI6MjA5NjA4ODg0M30.f_p1cUIPtwqFjNYR8TETs8vG0ltN71L4fv1aFV9yG-g');
async function test() {
  const { data, error } = await supabase.from('bills').select('*').order('created_at', { ascending: false }).limit(1).single();
  console.log(data ? `Got bill: ${data.id}, receipt_image length: ${data.receipt_image ? data.receipt_image.length : 0}` : error);
}
test();
