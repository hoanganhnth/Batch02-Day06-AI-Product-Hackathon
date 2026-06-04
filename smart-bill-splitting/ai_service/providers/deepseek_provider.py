"""
DeepSeek Provider (Kiến trúc 2 tầng / Vision Proxy)
Bởi vì DeepSeek V4 Flash chỉ nhận text (không đọc được ảnh), provider này sẽ:
1. Dùng Gemini (miễn phí) làm "mắt" để đọc toàn bộ chữ trên ảnh (OCR).
2. Dùng DeepSeek làm "não" để suy luận, phân tích và xuất JSON chuẩn.
"""

import base64
from openai import OpenAI
from .base import VisionProvider
from ..prompt_template import SYSTEM_PROMPT, USER_PROMPT
from ..config import DEEPSEEK_API_KEY, OPENAI_API_KEY, DEEPSEEK_MODEL


class DeepSeekProvider(VisionProvider):
    """Provider sử dụng DeepSeek (thông qua OpenAI OCR) cho Vision tasks."""

    name = "deepseek-v4"

    def __init__(self):
        if not DEEPSEEK_API_KEY:
            raise ValueError(
                "DEEPSEEK_API_KEY chưa được cấu hình! "
                "Hãy thêm vào file .env: DEEPSEEK_API_KEY=sk-..."
            )
        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY chưa được cấu hình (Cần OpenAI làm OCR cho DeepSeek)!"
            )
            
        # Khởi tạo DeepSeek client (tương thích OpenAI SDK)
        self.deepseek_client = OpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )
        self.model = DEEPSEEK_MODEL  # Có thể đổi thành deepseek-v4-pro qua biến môi trường

        # Khởi tạo OpenAI client cho phần OCR
        self.openai_client = OpenAI(api_key=OPENAI_API_KEY)

    def extract_from_image(self, image_base64: str, mime_type: str) -> str:
        """
        Gửi ảnh qua Gemini lấy text, sau đó gửi text qua DeepSeek lấy JSON.
        """
        image_bytes = base64.b64decode(image_base64)

        # ==========================================
        # BƯỚC 1: Dùng OpenAI để trích xuất text (OCR)
        # ==========================================
        print("   [DeepSeek] Đang chạy OpenAI OCR...")
        ocr_response = self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": (
                            "Đọc chính xác toàn bộ chữ và số trên hóa đơn này.\n"
                            "QUAN TRỌNG: Giữ nguyên bố cục BẢNG với các cột rõ ràng.\n"
                            "Format mỗi dòng món ăn thành: STT | Tên món | SL | Đơn giá | Thành tiền\n"
                            "Dùng dấu | để ngăn cách các cột. Giữ nguyên tên tiếng Việt.\n"
                            "Nếu tên món dài bị xuống dòng, ghép lại thành 1 dòng.\n"
                            "Ghi rõ các dòng tổng: Thành tiền, VAT, Tổng thanh toán.\n"
                            "Không giải thích thêm."
                        )},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=2048,
        )
        raw_text_from_image = ocr_response.choices[0].message.content.strip()

        # ==========================================
        # BƯỚC 2: Dùng DeepSeek để bóc tách JSON
        # ==========================================
        print("   [DeepSeek] Đang chạy DeepSeek suy luận JSON...")
        deepseek_user_prompt = (
            f"{USER_PROMPT}\n\n"
            f"Dưới đây là nội dung văn bản đọc được từ ảnh hóa đơn:\n"
            f"----------------------------------------\n"
            f"{raw_text_from_image}\n"
            f"----------------------------------------"
        )

        response = self.deepseek_client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": deepseek_user_prompt}
            ],
            max_tokens=4096
        )
        
        return response.choices[0].message.content.strip()
