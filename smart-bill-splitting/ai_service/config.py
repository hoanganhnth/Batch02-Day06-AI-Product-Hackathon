"""
Config cho Multi-Provider AI Service.
Đọc API keys từ file .env (KHÔNG commit lên git).
"""

import os
from dotenv import load_dotenv

load_dotenv()

# === OpenAI ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4-mini")

# === Google Gemini ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# === DeepSeek ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# === Provider mặc định ===
# Có thể đổi bằng biến môi trường: DEFAULT_PROVIDER=deepseek
DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "deepseek")  # "openai", "gemini" hoặc "deepseek"
