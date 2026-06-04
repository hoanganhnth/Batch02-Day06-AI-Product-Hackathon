"""
Google Gemini 2.5 Flash Vision Provider.
Sử dụng google-genai SDK mới (thay thế google-generativeai đã deprecated).
Miễn phí, tốc độ nhanh — phù hợp cho test và fallback.
"""

import base64
from google import genai
from google.genai import types
from .base import VisionProvider
from ..prompt_template import SYSTEM_PROMPT, USER_PROMPT
from ..config import GEMINI_API_KEY


class GeminiProvider(VisionProvider):
    """Provider sử dụng Google Gemini 2.5 Flash cho Vision tasks."""

    name = "gemini-2.5-flash"

    def __init__(self):
        if not GEMINI_API_KEY:
            raise ValueError(
                "GEMINI_API_KEY chưa được cấu hình! "
                "Hãy thêm vào file .env: GEMINI_API_KEY=AIza..."
            )
        self.client = genai.Client(api_key=GEMINI_API_KEY)
        self.model = "gemini-2.5-flash"

    def extract_from_image(self, image_base64: str, mime_type: str) -> str:
        """
        Gửi ảnh bill lên Gemini 2.5 Flash Vision và nhận về JSON string.

        Đặc điểm Gemini:
        - Miễn phí (free tier)
        - Hỗ trợ inline image data (base64)
        - Tốc độ nhanh, phù hợp cho test nhiều bill
        """
        # Decode base64 thành bytes cho Gemini SDK mới
        image_bytes = base64.b64decode(image_base64)

        response = self.client.models.generate_content(
            model=self.model,
            contents=[
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_text(text=USER_PROMPT),
                        types.Part.from_bytes(
                            data=image_bytes,
                            mime_type=mime_type,
                        ),
                    ],
                ),
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
            ),
        )
        return response.text.strip()
