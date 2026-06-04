"""
Config cho Multi-Provider AI Service.
Đọc API keys từ file .env (KHÔNG commit lên git).
"""

import os
from dotenv import load_dotenv

load_dotenv()

# === OpenAI ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# === Google Gemini ===
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# === DeepSeek ===
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

# === Provider mặc định ===
# Có thể đổi bằng biến môi trường: DEFAULT_PROVIDER=gemini
DEFAULT_PROVIDER = os.getenv("DEFAULT_PROVIDER", "openai")  # "openai" hoặc "gemini"
