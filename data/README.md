# 📂 Data — Thư Mục Hóa Đơn Test

## Mục đích

Thu thập ảnh hóa đơn (bill) thực tế từ quán ăn/nhà hàng để test khả năng bóc tách của GPT-4o Vision.

## Cách thu thập bill

### Nguồn nhanh nhất (ưu tiên)

1. **Tự chụp:** Trưa/tối nay đi ăn → giữ hóa đơn → chụp ảnh
2. **Hỏi bạn bè:** Nhắn nhóm bạn/đồng nghiệp: _"Ai có ảnh bill ăn uống gửi mình với"_
3. **Lục Gallery:** Nhiều người hay chụp bill rồi quên, kiểm tra thư mục ảnh cũ
4. **Google Maps reviews:** Ảnh review quán ăn thường kèm bill
5. **Google Images:** Tìm `"hóa đơn quán ăn"`, `"bill nhà hàng VAT"`, `"hóa đơn lẩu"`

### Quy cách chụp ảnh

| Yêu cầu          | Đúng ✅                           | Sai ❌                      |
| ----------------- | --------------------------------- | --------------------------- |
| Góc chụp          | Chụp thẳng từ trên xuống          | Chụp xiên, bị méo           |
| Ánh sáng          | Đủ sáng, rõ chữ                   | Tối, ngược sáng             |
| Phạm vi           | Chụp trọn bill, bao gồm tổng tiền | Cắt mất phần tổng/VAT       |
| Chất lượng        | Nét, không rung                    | Mờ, rung tay                |
| Nền               | Nền sạch (bàn trống)               | Đồ ăn/ly nước che bill      |

### Cần bao nhiêu bill?

**Tối thiểu 8 bill**, đảm bảo phủ đủ 4 loại:

| Loại        | Số lượng tối thiểu | Ví dụ                                        |
| ----------- | ------------------- | --------------------------------------------- |
| `easy/`     | 2                   | Bill trà sữa 2-3 món, bill cafe               |
| `medium/`   | 2                   | Bill cơm trưa 5-8 món, có VAT                 |
| `hard/`     | 2                   | Bill lẩu combo, chữ mờ, bill viết tay         |
| `edge-cases/` | 2                | Bill có phí gửi xe, khăn lạnh, tip, ngoại tệ  |

## Cấu trúc thư mục

```
data/
├── bills/
│   ├── easy/           # Bill rõ ràng, ít món
│   ├── medium/         # Bill nhiều món, có VAT
│   ├── hard/           # Bill nhăn nheo, mờ, combo
│   └── edge-cases/     # Phí chung, khăn lạnh, gửi xe
├── sample-bills/       # Bill mẫu generate để test trước
├── expected/           # Ground truth JSON cho từng bill
└── README.md           # File này
```

## Đặt tên file

Format: `bill_XX.jpg` hoặc `bill_XX.png`

- `bill_01.jpg` → `expected/bill_01_expected.json`
- `bill_02.jpg` → `expected/bill_02_expected.json`

## Ground Truth JSON Format

Mỗi bill cần 1 file JSON tương ứng trong `expected/`:

```json
{
  "restaurant": "Tên quán",
  "date": "YYYY-MM-DD",
  "items": [
    {"name": "Tên món", "qty": 1, "price": 50000},
    {"name": "Khăn lạnh", "qty": 4, "price": 5000, "type": "shared_fee"}
  ],
  "subtotal": 200000,
  "vat_percent": 8,
  "vat_amount": 16000,
  "service_charge_percent": 5,
  "service_charge_amount": 10000,
  "total": 226000,
  "shared_fees": ["Khăn lạnh", "VAT", "Phí phục vụ"],
  "difficulty": "easy|medium|hard|edge-case",
  "notes": "Mô tả ngắn về bill"
}
```

**Lưu ý `type` field:**
- Không có `type` = món ăn bình thường (ai ăn người nấy trả)
- `"type": "shared_fee"` = phí chung chia đều cả bàn (khăn lạnh, gửi xe, tip...)
