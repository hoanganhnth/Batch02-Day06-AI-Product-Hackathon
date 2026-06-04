#!/bin/bash
echo "🔄 1. Đang mở tunnel cho Backend..."
ssh -o StrictHostKeyChecking=no -R 80:localhost:8000 nokey@localhost.run > tunnel.log 2>&1 &
SSH_PID=$!

echo "⏳ Đang chờ lấy URL (mất khoảng 5 giây)..."
sleep 5
URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.lhr\.life' tunnel.log | head -n 1)

if [ -z "$URL" ]; then
  echo "❌ Lỗi: Không lấy được URL. Log:"
  cat tunnel.log
  kill $SSH_PID
  exit 1
fi

echo "✅ Đã tạo URL Backend thành công: $URL"
echo "🔄 2. Cập nhật URL vào Frontend..."
sed -i "s|^VITE_API_URL=.*|VITE_API_URL=$URL|g" codebase/frontend/.env

echo "🚀 3. Build và Deploy Frontend mới lên mây..."
cd codebase/frontend
npm run build
npx wrangler pages deploy dist --project-name smart-bill-splitter-web

echo ""
echo "🎉 XONG! BẠN VÀO LINK CLOUDFLARE Ở TRÊN ĐỂ DÙNG NHÉ!"
echo "⚠️ CHÚ Ý: ĐỪNG TẮT TERMINAL NÀY! CỨ TREO MÁY Ở ĐÂY ĐỂ GIÁM KHẢO CHẤM!"
wait $SSH_PID
