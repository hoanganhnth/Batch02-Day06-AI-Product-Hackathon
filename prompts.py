SCHEMA = """
{
  "restaurant_name": "string hoặc null",
  "items": [
    {
      "name": "string",
      "unit_price": int,
      "quantity": float (ví dụ 1.0, 1.5),
      "total_price": int,
      "item_type": "food" | "shared_fee" | "combo",
      "confidence": float (0.0 - 1.0),
      "note": "string hoặc null"
    }
  ],
  "sub_total": int hoặc null,
  "vat_percent": float hoặc null,
  "vat_amount": int hoặc null,
  "service_charge_percent": float hoặc null,
  "service_charge_amount": int hoặc null,
  "grand_total": int,
  "has_unclear_items": bool,
  "raw_text_fallback": "string hoặc null"
}
"""

PROMPTS = {
    "v1_basic": f"""
Trích xuất thông tin hóa đơn trong ảnh và trả về dưới dạng JSON theo đúng schema sau. KHÔNG giải thích thêm.
Lưu ý:
- Trả về đúng JSON format.
- Các trường số tiền (unit_price, total_price, grand_total...) phải là số nguyên (ví dụ: 150000, KHÔNG CÓ DẤU PHẨY).

Schema:
{SCHEMA}
    """,
    
    "v2_vietnamese": f"""
Bạn là một AI chuyên đọc hóa đơn nhà hàng Việt Nam. 
Hãy trích xuất thông tin hóa đơn trong ảnh và trả về dưới dạng JSON hợp lệ theo schema sau.
Lưu ý:
- "unit_price", "total_price", "sub_total", "grand_total" phải là số nguyên (ví dụ: 150000, không phải "150.000").
- "quantity" có thể là số lẻ (ví dụ: 1.5).
- Khăn lạnh, gửi xe, phí phục vụ là "shared_fee".
- Trả về JSON, không giải thích.
Schema:
{SCHEMA}
    """,
    
    "v3_edge_case_aware": f"""
Bạn là AI Kế Toán xuất sắc nhất, chuyên bóc tách bill Việt Nam khó, viết tay, hoặc mờ.
Nhiệm vụ: Trích xuất thông tin bill và trả về chuẩn JSON theo schema.

Hướng dẫn xử lý các trường hợp khó (edge cases):
1. Khăn lạnh, phí gửi xe, vé tham quan, tiền phòng/tàu: phân loại là "shared_fee" (phí chung).
2. Món ăn, đồ uống: phân loại "food".
3. Combo (VD: Combo 2 người gồm A, B, C): gom thành 1 item là "combo", liệt kê chi tiết trong "note".
4. Nếu bill có VAT, tách riêng "vat_percent" (vd 8.0) và "vat_amount".
5. Nếu bill có phí phục vụ (Service Charge), tách riêng "service_charge_percent" (vd 5.0) và "service_charge_amount".
6. Nếu dòng nào khó đọc (viết tay mờ), hãy cố gắng đoán (best effort), ghi "confidence" thấp (<0.8), ghi chú vào "note", và bật cờ "has_unclear_items": true.
7. Trả về đúng định dạng số (150000), không chứa dấu phẩy phân cách ngàn.

Schema bắt buộc (trả về JSON hợp lệ, không bọc markdown block nếu dùng response_format json_object):
{SCHEMA}
    """
}
