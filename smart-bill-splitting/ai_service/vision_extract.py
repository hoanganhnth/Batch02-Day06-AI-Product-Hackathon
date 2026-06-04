"""
Vision Extract Orchestrator — Điều phối Multi-Provider.

Hỗ trợ 3 chế độ:
  1. extract_bill()              → Dùng 1 provider
  2. extract_bill_with_fallback() → Tự động chuyển provider khi lỗi
  3. extract_bill_compare()       → Chạy song song 2 providers, so sánh kết quả
"""

import json
import base64
from pathlib import Path
from typing import Optional

from .schema import BillExtraction
from .providers.openai_provider import OpenAIProvider
from .providers.gemini_provider import GeminiProvider
from .providers.deepseek_provider import DeepSeekProvider


# === Registry các providers ===
PROVIDERS = {
    "openai": OpenAIProvider,
    "gemini": GeminiProvider,
    "deepseek": DeepSeekProvider,
}


def _detect_mime(image_path: str) -> str:
    """Tự động detect MIME type từ extension file."""
    suffix = Path(image_path).suffix.lower()
    mime_map = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
    }
    return mime_map.get(suffix, "image/jpeg")


def _parse_and_validate(raw_text: str) -> dict:
    """
    Parse raw JSON string từ LLM và validate bằng Pydantic.
    Xử lý cả trường hợp LLM trả về kèm markdown code block.
    """
    # Loại bỏ markdown code block nếu AI vẫn trả về (```json ... ```)
    cleaned = raw_text.strip()
    if cleaned.startswith("```"):
        # Bỏ dòng đầu (```json) và dòng cuối (```)
        lines = cleaned.split("\n")
        cleaned = "\n".join(lines[1:])
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

    data = json.loads(cleaned)
    bill = BillExtraction(**data)
    result = bill.model_dump()

    # Đánh dấu unclear items dựa trên confidence và item_type
    result["has_unclear_items"] = any(
        item["confidence"] < 0.7 or item["item_type"] == "combo"
        for item in result["items"]
    )

    return result


# =============================================
# CHẾ ĐỘ 1: Dùng 1 provider
# =============================================

def extract_bill(image_path: str, provider: str = "openai") -> dict:
    """
    Trích xuất hóa đơn bằng 1 provider duy nhất.

    Args:
        image_path: Đường dẫn tới file ảnh hóa đơn
        provider: "openai" hoặc "gemini"

    Returns:
        dict chứa kết quả bóc tách (đã validate qua Pydantic)

    Usage:
        result = extract_bill("test_data/bill_01.jpg", provider="openai")
        result = extract_bill("test_data/bill_01.jpg", provider="gemini")
    """
    if provider not in PROVIDERS:
        return {"error": f"Provider '{provider}' không tồn tại. Chọn: {list(PROVIDERS.keys())}"}

    # Đọc ảnh và encode base64
    image_data = Path(image_path).read_bytes()
    image_base64 = base64.b64encode(image_data).decode("utf-8")
    mime_type = _detect_mime(image_path)

    # Gọi provider
    llm = PROVIDERS[provider]()
    try:
        raw_text = llm.extract_from_image(image_base64, mime_type)
        result = _parse_and_validate(raw_text)
        result["provider"] = llm.name
        return result
    except json.JSONDecodeError as e:
        return {
            "error": f"AI trả về không phải JSON hợp lệ: {e}",
            "raw_response": raw_text if 'raw_text' in dir() else None,
            "provider": llm.name,
            "items": [],
            "has_unclear_items": True,
        }
    except Exception as e:
        return {
            "error": f"Lỗi khi gọi {llm.name}: {e}",
            "provider": llm.name,
            "items": [],
            "has_unclear_items": True,
        }


# =============================================
# CHẾ ĐỘ 2: Fallback tự động
# =============================================

def extract_bill_with_fallback(
    image_path: str,
    primary: str = "openai",
    fallback: str = "gemini",
) -> dict:
    """
    Thử provider chính trước. Nếu lỗi → tự động chuyển sang provider dự phòng.

    Args:
        image_path: Đường dẫn tới file ảnh hóa đơn
        primary: Provider ưu tiên ("openai" hoặc "gemini")
        fallback: Provider dự phòng

    Returns:
        dict chứa kết quả, có thêm trường "fallback_used" nếu đã chuyển provider

    Usage:
        result = extract_bill_with_fallback("bill.jpg")
        if result.get("fallback_used"):
            print("Đã dùng provider dự phòng!")
    """
    print(f"🔵 Thử provider chính: {primary}...")
    result = extract_bill(image_path, provider=primary)

    if "error" in result:
        print(f"⚠️  {primary} lỗi: {result['error']}")
        print(f"🔄 Chuyển sang provider dự phòng: {fallback}...")
        result = extract_bill(image_path, provider=fallback)
        result["fallback_used"] = True
        result["primary_error"] = f"{primary} failed"
    else:
        result["fallback_used"] = False

    return result


# =============================================
# CHẾ ĐỘ 3: So sánh song song
# =============================================

def extract_bill_compare(image_path: str) -> dict:
    """
    Chạy CẢ 2 providers cùng 1 ảnh → trả về kết quả song song để so sánh.
    Rất hữu ích khi muốn đánh giá model nào đọc bill chính xác hơn.

    Returns:
        {
            "results": {"openai": {...}, "gemini": {...}},
            "comparison": {
                "grand_total_match": True/False,
                "openai_grand_total": 297000,
                "gemini_grand_total": 297000,
                ...
            }
        }

    Usage:
        data = extract_bill_compare("test_data/bill_01.jpg")
        print(data["comparison"])
    """
    image_data = Path(image_path).read_bytes()
    image_base64 = base64.b64encode(image_data).decode("utf-8")
    mime_type = _detect_mime(image_path)

    results = {}
    for name, ProviderClass in PROVIDERS.items():
        print(f"🔵 Đang chạy: {name}...")
        try:
            llm = ProviderClass()
            raw_text = llm.extract_from_image(image_base64, mime_type)
            parsed = _parse_and_validate(raw_text)
            parsed["provider"] = llm.name
            results[name] = parsed
            print(f"✅ {name}: OK — grand_total={parsed.get('grand_total')}đ, {len(parsed.get('items', []))} items")
        except Exception as e:
            results[name] = {"error": str(e), "provider": name}
            print(f"❌ {name}: LỖI — {e}")

    # So sánh nhanh
    comparison = _quick_compare(results)
    return {"results": results, "comparison": comparison}


def _quick_compare(results: dict) -> dict:
    """So sánh nhanh kết quả giữa 2 providers."""
    providers = list(results.keys())
    if len(providers) < 2:
        return {"note": "Chỉ có 1 provider, không so sánh được."}

    a, b = providers[0], providers[1]
    ra, rb = results[a], results[b]

    if "error" in ra or "error" in rb:
        failed = [p for p in [a, b] if "error" in results[p]]
        return {"note": f"Provider bị lỗi: {failed}. Không so sánh được."}

    # So sánh grand_total
    total_match = ra.get("grand_total") == rb.get("grand_total")

    # So sánh số lượng items
    items_a = len(ra.get("items", []))
    items_b = len(rb.get("items", []))

    # So sánh unclear items
    unclear_a = ra.get("has_unclear_items", False)
    unclear_b = rb.get("has_unclear_items", False)

    # Khuyến nghị: provider nào đọc được nhiều items hơn + ít unclear hơn
    score_a = items_a - (5 if unclear_a else 0)
    score_b = items_b - (5 if unclear_b else 0)
    recommendation = a if score_a >= score_b else b

    return {
        "grand_total_match": total_match,
        f"{a}_grand_total": ra.get("grand_total"),
        f"{b}_grand_total": rb.get("grand_total"),
        f"{a}_items_count": items_a,
        f"{b}_items_count": items_b,
        f"{a}_has_unclear": unclear_a,
        f"{b}_has_unclear": unclear_b,
        "recommendation": recommendation,
    }
