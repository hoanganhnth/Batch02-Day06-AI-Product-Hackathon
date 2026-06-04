"""
Script so sánh song song — Chạy CẢ 2 providers (OpenAI + Gemini) cùng 1 ảnh bill.
So sánh kết quả để đánh giá model nào đọc bill chính xác hơn.

Usage:
  python run_compare.py
"""

import json
import os
from datetime import datetime

from ai_service.vision_extract import extract_bill_compare

TEST_DIR = "test_data"
LOG_FILE = "logs/comparison_log.json"


def run_comparison():
    """Chạy so sánh tất cả bill mẫu với cả 2 providers."""
    os.makedirs("logs", exist_ok=True)
    results = []

    if not os.path.exists(TEST_DIR):
        print(f"❌ Thư mục '{TEST_DIR}' không tồn tại!")
        return

    image_files = sorted([
        f for f in os.listdir(TEST_DIR)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ])

    if not image_files:
        print(f"❌ Không tìm thấy file ảnh nào trong '{TEST_DIR}/'")
        return

    print(f"\n🚀 So sánh {len(image_files)} bill giữa OpenAI GPT-4o và Gemini 2.5 Flash")
    print(f"{'='*60}\n")

    for i, img_file in enumerate(image_files, 1):
        img_path = os.path.join(TEST_DIR, img_file)
        print(f"\n{'='*60}")
        print(f"🧾 [{i}/{len(image_files)}] SO SÁNH: {img_file}")
        print(f"{'='*60}")

        comparison = extract_bill_compare(img_path)

        # Hiển thị kết quả so sánh
        comp = comparison["comparison"]

        if "note" in comp:
            print(f"\n⚠️  {comp['note']}")
        else:
            print(f"\n📊 Kết quả so sánh:")
            print(f"   ┌──────────────┬─────────────────┬────────────────┐")
            print(f"   │              │ OpenAI GPT-4o   │ Gemini Flash   │")
            print(f"   ├──────────────┼─────────────────┼────────────────┤")
            print(f"   │ Grand Total  │ {comp.get('openai_grand_total', 'N/A'):>13,}đ │ {comp.get('gemini_grand_total', 'N/A'):>12,}đ │")
            print(f"   │ Số items     │ {comp.get('openai_items_count', 0):>15} │ {comp.get('gemini_items_count', 0):>14} │")
            print(f"   │ Unclear?     │ {'⚠️ Có' if comp.get('openai_has_unclear') else '✅ Không':>15} │ {'⚠️ Có' if comp.get('gemini_has_unclear') else '✅ Không':>14} │")
            print(f"   └──────────────┴─────────────────┴────────────────┘")
            print(f"   Grand Total khớp: {'✅ CÓ' if comp.get('grand_total_match') else '❌ KHÔNG'}")
            print(f"   → Khuyến nghị dùng: {comp.get('recommendation', 'N/A').upper()}")

        results.append({
            "file": img_file,
            "timestamp": datetime.now().isoformat(),
            **comparison,
        })

    # === Tổng kết ===
    print(f"\n{'='*60}")
    print(f"📊 TỔNG KẾT SO SÁNH")
    print(f"{'='*60}")

    total = len(results)
    matches = sum(
        1 for r in results
        if r.get("comparison", {}).get("grand_total_match", False)
    )
    print(f"   Tổng bill: {total}")
    print(f"   Grand Total khớp nhau: {matches}/{total}")

    # Đếm recommendations
    recs = [r.get("comparison", {}).get("recommendation") for r in results if "recommendation" in r.get("comparison", {})]
    openai_wins = recs.count("openai")
    gemini_wins = recs.count("gemini")
    print(f"   OpenAI thắng: {openai_wins} lần")
    print(f"   Gemini thắng: {gemini_wins} lần")

    # Ghi log
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Đã ghi log so sánh vào: {LOG_FILE}")


if __name__ == "__main__":
    run_comparison()
