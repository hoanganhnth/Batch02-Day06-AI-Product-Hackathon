# Deploy AI Backend (Cloudflare) & Real-time Database (Supabase)

## Goal
Replace the simulated frontend mock data by deploying a real Vision AI backend on Cloudflare Workers and connecting the multi-user state to Supabase.

## Tasks
- [x] Task 1: Create Supabase SQL schema → `codebase/backend/supabase-schema.sql`
- [x] Task 2: Configure env vars → `.env.example` for both frontend and backend
- [x] Task 3: Initialize Cloudflare Worker → `codebase/backend/` with wrangler, verified on `:8787`
- [x] Task 4: Implement AI logic → OpenAI GPT-4o Vision API in `src/index.js`
- [x] Task 5: Install Supabase SDK → `@supabase/supabase-js` added to frontend
- [x] Task 6: Connect UploadPage to Worker → base64 POST, result passed via callback
- [x] Task 7: Wire App.jsx to Supabase → billId from URL, realtime subscribe, createBill on scan
- [x] Task 8: Wire ReviewPage.jsx → All 14 handlers call Supabase (lock, members, edits, payments)
- [x] Task 9: Wire PickItemsPage.jsx → All 7 handlers call Supabase (join, selections, submit, pay, editReq)
- [x] Task 10: Add missing service functions → `removeMember()`, `updateBill()` added to supabaseService
- [x] Task 11: Build verification → `npm run build` passes with 0 errors
- [ ] Task 12: **USER ACTION** — Run SQL in Supabase dashboard, set `.env` credentials
- [ ] Task 13: **USER ACTION** — `npx wrangler secret put OPENAI_API_KEY` + `npm run deploy`

## Done When
- [x] Frontend builds successfully with all Supabase integrations
- [ ] Uploading a receipt calls live Cloudflare Worker and parses items
- [ ] Multi-user selection syncs in real-time across devices via Supabase

## Notes
- Share URL now includes `?page=pick&bill=<uuid>` so different devices access the same bill
- All Supabase calls are fire-and-forget (optimistic local + realtime sync)
- Falls back to localStorage-only mode when Supabase/API not configured
