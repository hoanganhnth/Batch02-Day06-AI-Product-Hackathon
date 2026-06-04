"""
DeepSeek Provider (Kiến trúc 2 tầng / Vision Proxy)
Bởi vì DeepSeek V4 Flash chỉ nhận text (không đọc được ảnh), provider này sẽ:
1. Dùng Gemini (miễn phí) làm "mắt" để đọc toàn bộ chữ trên ảnh (OCR).
2. Dùng DeepSeek làm "não" để suy luận, phân tích và xuất JSON chuẩn.
"""

import base64
from openai import OpenAI
from google import genai
from google.genai import types
from .base import VisionProvider
from ..prompt_template import SYSTEM_PROMPT, USER_PROMPT
from ..config import DEEPSEEK_API_KEY, GEMINI_API_KEY, DEEPSEEK_MODEL


class DeepSeekProvider(VisionProvider):
    """Provider sử dụng DeepSeek (thông qua Gemini OCR) cho Vision tasks."""

    name = "deepseek-v4"

    def __init__(self):
        if not DEEPSEEK_API_KEY:
            raise ValueError(
                "DEEPSEEK_API_KEY chưa được cấu hình! "
                "Hãy thêm vào file .env: DEEPSEEK_API_KEY=sk-..."
            )
        if not GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY chưa được cấu hình (Cần Gemini làm OCR cho DeepSeek)!"
            )
            
        # Khởi tạo DeepSeek client (tương thích OpenAI SDK)
        self.deepseek_client = OpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )
        self.model = DEEPSEEK_MODEL  # Có thể đổi thành deepseek-v4-pro qua biến môi trường

        # Khởi tạo Gemini client cho phần OCR
        self.gemini_client = genai.Client(api_key=GEMINI_API_KEY)

    def extract_from_image(self, image_base64: str, mime_type: str) -> str:
        """
        Gửi ảnh qua Gemini lấy text, sau đó gửi text qua DeepSeek lấy JSON.
        """
        image_bytes = base64.b64decode(image_base64)

        # ==========================================
        # BƯỚC 1: Dùng Gemini để trích xuất text (OCR)
        # ==========================================
        print("   [DeepSeek] Đang chạy Gemini OCR...")
        ocr_response = self.gemini_client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text="Đọc chính xác toàn bộ chữ và số trên hóa đơn này, giữ nguyên bố cục. Không giải thích thêm."),
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                    ],
                ),
            ]
        )
        raw_text_from_image = ocr_response.text.strip()

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
