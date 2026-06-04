"""
Image Preprocessor — Tiền xử lý ảnh bill trước khi gửi cho AI.

Mục đích:
  1. Resize ảnh quá lớn → giảm chi phí token và tăng tốc độ.
  2. Tăng contrast → giúp AI đọc rõ bill mờ/tối.
  3. Auto-rotate → sửa ảnh bị xoay do EXIF metadata (chụp ngang).
  4. Nén JPEG → giảm kích thước file gửi lên API.

Usage:
    from ai_service.image_preprocessor import preprocess_image
    processed_path = preprocess_image("test_data/bill_01.png")
"""

import os
import io
from pathlib import Path
from PIL import Image, ImageEnhance, ImageOps


# === Cấu hình ===
MAX_DIMENSION = 2048       # Cạnh dài nhất tối đa (px) — cân bằng chất lượng và chi phí
JPEG_QUALITY = 85          # Chất lượng nén JPEG (85 = giữ chi tiết, giảm ~40% size)
CONTRAST_FACTOR = 1.3      # Hệ số tăng tương phản (1.0 = giữ nguyên, 1.3 = tăng nhẹ)
MAX_FILE_SIZE_MB = 4       # Giới hạn kích thước file sau xử lý (MB)


def preprocess_image(image_path: str) -> tuple[bytes, str]:
    """
    Tiền xử lý ảnh bill và trả về bytes đã xử lý.

    Args:
        image_path: Đường dẫn tới file ảnh gốc.

    Returns:
        Tuple (processed_bytes, mime_type):
            - processed_bytes: Ảnh đã qua xử lý dưới dạng bytes
            - mime_type: MIME type của ảnh đã xử lý (luôn là image/jpeg)

    Pipeline xử lý:
        1. Mở ảnh và auto-rotate theo EXIF
        2. Resize nếu vượt MAX_DIMENSION
        3. Tăng contrast
        4. Nén JPEG
    """
    original_size = os.path.getsize(image_path)
    img = Image.open(image_path)
    original_dimensions = img.size

    # === Bước 1: Auto-rotate theo EXIF metadata ===
    # Sửa lỗi ảnh bị xoay ngang khi chụp bằng điện thoại
    img = ImageOps.exif_transpose(img)

    # === Bước 2: Chuyển sang RGB (bỏ alpha channel nếu có) ===
    if img.mode in ("RGBA", "P", "LA"):
        # Tạo nền trắng cho ảnh có transparency
        background = Image.new("RGB", img.size, (255, 255, 255))
        if img.mode == "P":
            img = img.convert("RGBA")
        background.paste(img, mask=img.split()[-1] if "A" in img.mode else None)
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    # === Bước 3: Resize nếu ảnh quá lớn ===
    width, height = img.size
    if max(width, height) > MAX_DIMENSION:
        ratio = MAX_DIMENSION / max(width, height)
        new_width = int(width * ratio)
        new_height = int(height * ratio)
        img = img.resize((new_width, new_height), Image.LANCZOS)

    # === Bước 4: Tăng contrast (giúp đọc bill mờ/tối) ===
    enhancer = ImageEnhance.Contrast(img)
    img = enhancer.enhance(CONTRAST_FACTOR)

    # === Bước 5: Tăng độ sắc nét nhẹ (sharpness) ===
    sharpener = ImageEnhance.Sharpness(img)
    img = sharpener.enhance(1.2)  # 1.2 = tăng nhẹ, tránh tạo noise

    # === Bước 6: Nén thành JPEG ===
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    processed_bytes = buffer.getvalue()

    # === Bước 7: Nếu vẫn quá lớn, giảm quality thêm ===
    max_bytes = MAX_FILE_SIZE_MB * 1024 * 1024
    quality = JPEG_QUALITY
    while len(processed_bytes) > max_bytes and quality > 50:
        quality -= 10
        buffer = io.BytesIO()
        img.save(buffer, format="JPEG", quality=quality, optimize=True)
        processed_bytes = buffer.getvalue()

    # === Log kết quả ===
    new_size = len(processed_bytes)
    reduction = (1 - new_size / original_size) * 100 if original_size > 0 else 0
    print(f"   📸 Preprocessing: {original_dimensions[0]}x{original_dimensions[1]} → {img.size[0]}x{img.size[1]}")
    print(f"   📦 Size: {original_size / 1024:.0f}KB → {new_size / 1024:.0f}KB (giảm {reduction:.0f}%)")

    return processed_bytes, "image/jpeg"
