"""
Abstract Base Class cho mọi Vision LLM Provider.
Mỗi provider (OpenAI, Gemini, ...) phải implement method extract_from_image().
"""

from abc import ABC, abstractmethod


class VisionProvider(ABC):
    """Base class cho mọi Vision LLM provider."""

    name: str = "base"  # Tên provider (để log và so sánh)

    @abstractmethod
    def extract_from_image(self, image_base64: str, mime_type: str) -> str:
        """
        Gửi ảnh (base64) lên LLM và trả về raw JSON string.

        Args:
            image_base64: Ảnh đã encode base64
            mime_type: MIME type của ảnh (image/jpeg, image/png)

        Returns:
            Raw JSON string từ LLM response
        """
        pass
