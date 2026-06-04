"""
Script test — Chạy bóc tách bill mẫu với 1 provider.

Usage:
  python run_test.py                        # Dùng provider mặc định (từ .env)
  python run_test.py --provider gemini      # Chỉ định Gemini
  python run_test.py --provider openai      # Chỉ định OpenAI
  python run_test.py --fallback             # Bật fallback tự động
"""

import json
import os
import argparse
from datetime import datetime

from ai_service.vision_extract import extract_bill, extract_bill_with_fallback
from ai_service.config import DEFAULT_PROVIDER

TEST_DIR = "test_data"
LOG_FILE = "logs/extraction_log.json"


def run_all_tests(provider: str, use_fallback: bool = False):
    """Chạy test tất cả bill mẫu trong test_data/ và ghi log."""
    os.makedirs("logs", exist_ok=True)
    results = []

    # Tìm tất cả file ảnh trong test_data/
    if not os.path.exists(TEST_DIR):
        print(f"❌ Thư mục '{TEST_DIR}' không tồn tại!")
        print(f"   Hãy tạo thư mục và bỏ ảnh bill vào đó.")
        return

    image_files = sorted([
        f for f in os.listdir(TEST_DIR)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    ])

    if not image_files:
        print(f"❌ Không tìm thấy file ảnh nào trong '{TEST_DIR}/'")
        print(f"   Hỗ trợ: .jpg, .jpeg, .png, .webp")
        return

    print(f"\n🚀 Bắt đầu test {len(image_files)} bill với provider: {provider}")
    if use_fallback:
        fallback_provider = "gemini" if provider == "openai" else "openai"
        print(f"   Fallback: {fallback_provider}")
    print(f"{'='*60}\n")

    for i, img_file in enumerate(image_files, 1):
        img_path = os.path.join(TEST_DIR, img_file)
        print(f"\n{'='*60}")
        print(f"🧾 [{i}/{len(image_files)}] Đang xử lý: {img_file}")
        print(f"   Provider: {provider}" + (f" (fallback: {fallback_provider})" if use_fallback else ""))
        print(f"{'='*60}")

        # Gọi AI
        if use_fallback:
            result = extract_bill_with_fallback(
                img_path, primary=provider, fallback=fallback_provider
            )
        else:
            result = extract_bill(img_path, provider=provider)

        # Hiển thị kết quả
        if "error" in result:
            print(f"\n❌ LỖI: {result['error']}")
        else:
            print(f"\n✅ Thành công!")
            print(f"   Nhà hàng: {result.get('restaurant_name', 'N/A')}")
            print(f"   Số món: {len(result.get('items', []))}")
            print(f"   Tổng cộng: {result.get('grand_total', 0):,}đ")

            if result.get("fallback_used"):
                print(f"   ⚠️  Đã dùng fallback provider!")

        # Log chi tiết JSON
        print(f"\n📄 JSON chi tiết:")
        print(json.dumps(result, indent=2, ensure_ascii=False))

        # Kiểm tra unclear items
        if result.get("has_unclear_items"):
            print(f"\n⚠️  CÓ MỤC KHÔNG CHẮC CHẮN — Cần Host review!")
            for item in result.get("items", []):
                if item.get("confidence", 1.0) < 0.7:
                    print(f"   🔸 {item['name']}: confidence={item['confidence']} | {item.get('note', '')}")
                if item.get("item_type") == "combo":
                    print(f"   🔸 {item['name']}: COMBO — Host cần quyết định chia thế nào")

        results.append({
            "file": img_file,
            "timestamp": datetime.now().isoformat(),
            "provider": result.get("provider", provider),
            "fallback_used": result.get("fallback_used", False),
            "success": "error" not in result,
            "extraction": result,
        })

    # === Tổng kết ===
    print(f"\n{'='*60}")
    print(f"📊 TỔNG KẾT")
    print(f"{'='*60}")

    total = len(results)
    success = sum(1 for r in results if r["success"])
    warnings = sum(1 for r in results if r["extraction"].get("has_unclear_items"))
    fallbacks = sum(1 for r in results if r["fallback_used"])

    print(f"   Tổng bill: {total}")
    print(f"   Thành công: {success} ✅")
    print(f"   Có cảnh báo: {warnings} ⚠️")
    print(f"   Dùng fallback: {fallbacks} 🔄")
    print(f"   Thất bại: {total - success} ❌")

    # Ghi log file (evidence cho repo)
    with open(LOG_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n💾 Đã ghi log vào: {LOG_FILE}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test Vision LLM bóc tách hóa đơn")
    parser.add_argument(
        "--provider",
        default=DEFAULT_PROVIDER,
        choices=["openai", "gemini", "deepseek"],
        help="Chọn provider (mặc định: từ .env)",
    )
    parser.add_argument(
        "--fallback",
        action="store_true",
        help="Bật fallback tự động khi provider chính lỗi",
    )
    args = parser.parse_args()
    run_all_tests(args.provider, args.fallback)
