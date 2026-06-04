"""
OpenAI GPT-4o Vision Provider.
Sử dụng OpenAI Chat Completions API với image_url input.
Hỗ trợ response_format=json_object để ép output JSON chuẩn.
"""

from openai import OpenAI
from .base import VisionProvider
from ..prompt_template import SYSTEM_PROMPT, USER_PROMPT
from ..config import OPENAI_API_KEY


class OpenAIProvider(VisionProvider):
    """Provider sử dụng OpenAI GPT-4o cho Vision tasks."""

    name = "openai-gpt-4o"

    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError(
                "OPENAI_API_KEY chưa được cấu hình! "
                "Hãy thêm vào file .env: OPENAI_API_KEY=sk-..."
            )
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = "gpt-4o"

    def extract_from_image(self, image_base64: str, mime_type: str) -> str:
        """
        Gửi ảnh bill lên GPT-4o Vision và nhận về JSON string.

        Đặc điểm GPT-4o:
        - response_format=json_object → ép trả JSON, không có text thừa
        - detail="high" → đọc ảnh độ phân giải cao (quan trọng cho số tiền)
        """
        response = self.client.chat.completions.create(
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": USER_PROMPT},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{image_base64}",
                                "detail": "high"
                            }
                        }
                    ]
                }
            ],
            max_tokens=4096
        )
        return response.choices[0].message.content.strip()
