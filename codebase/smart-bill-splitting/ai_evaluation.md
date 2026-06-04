# Đánh giá AI Pipeline — Smart Bill Splitting

## 1. Tổng quan AI được sử dụng

Hệ thống sử dụng **3 mô hình Vision LLM** để đọc ảnh hóa đơn:

| Provider | Model | Vai trò | Chi phí |
|----------|-------|---------|---------|
| OpenAI | GPT-4o | Đọc ảnh trực tiếp → JSON | Trả phí (~$2.5/1K ảnh HD) |
| Google | Gemini 2.5 Flash | Đọc ảnh trực tiếp → JSON | Miễn phí (free tier) |
| DeepSeek | DeepSeek V4 (text-only) | Chỉ xử lý text → JSON | Rất rẻ (~$0.14/1M tokens) |

### Kiến trúc đặc biệt của DeepSeek Provider
DeepSeek V4 **không có khả năng đọc ảnh**, nên nhóm thiết kế một kiến trúc **2 tầng (2-stage pipeline)**:
```
Ảnh bill → [OpenAI GPT-4o làm "MẮT" (OCR)] → Text thô → [DeepSeek làm "NÃO" (suy luận)] → JSON
```
Đây là một thiết kế rất sáng tạo, tận dụng được khả năng suy luận logic rẻ tiền của DeepSeek trong khi "mượn mắt" của GPT-4o.

---

## 2. Đánh giá điểm MẠNH

### ✅ 2.1. Prompt Engineering chất lượng cao
File `prompt_template.py` được viết rất kỹ lưỡng:
- Quy định rõ schema JSON, không cho phép AI "sáng tạo" tự do.
- Xử lý nhiều edge case thực tế của bill Việt Nam: món gộp, VAT ẩn, chữ viết tay, bill mờ.
- Yêu cầu `confidence score` cho từng dòng — giúp frontend biết dòng nào cần người xác nhận.
- Quy tắc ưu tiên số trên bill khi tổng tính toán không khớp → tránh AI tự sửa sai.

### ✅ 2.2. Multi-Provider Design (Strategy Pattern)
- Không phụ thuộc vào 1 hãng AI duy nhất.
- Dễ dàng thêm provider mới (chỉ cần tạo file `X_provider.py` kế thừa `VisionProvider`).
- Có cơ chế Fallback tự động và So sánh A/B testing.

### ✅ 2.3. Structured Output nghiêm ngặt
- OpenAI: sử dụng `response_format={"type": "json_object"}` → ép AI trả JSON thuần.
- Gemini: sử dụng `response_mime_type="application/json"` → tương tự.
- Pydantic validation ở tầng sau cùng → lưới an toàn kép (double safety net).

### ✅ 2.4. Có sẵn Expected Data để đánh giá
Thư mục `test_data/expected/` chứa 6 file JSON "đáp án chuẩn" — cho thấy nhóm có ý thức xây dựng bộ benchmark để đánh giá chất lượng AI.

---

## 3. Đánh giá điểm YẾU

### ⚠️ 3.1. Không có cơ chế Retry khi gọi AI
**Vấn đề:** Hiện tại, nếu API của OpenAI/Gemini trả về lỗi mạng tạm thời (timeout, rate limit 429), hệ thống sẽ fail ngay lập tức hoặc nhảy sang fallback.

**Tại sao nghiêm trọng:** Các API AI thường hay bị rate limit hoặc timeout ngắn, đặc biệt là khi gửi ảnh độ phân giải cao. Một lần retry đơn giản có thể cứu vãn 80% lỗi tạm thời.

### ⚠️ 3.2. DeepSeek Pipeline tốn gấp đôi chi phí
**Vấn đề:** DeepSeek Provider hiện phải gọi **2 lần API** (1 lần OpenAI OCR + 1 lần DeepSeek suy luận). Nghĩa là chi phí = chi phí OpenAI + chi phí DeepSeek, trong khi kết quả chưa chắc tốt hơn gọi trực tiếp OpenAI 1 lần.

**Tại sao:** Vì đi qua bước OCR text trung gian, thông tin bố cục bảng (layout) trên bill có thể bị mất, dẫn đến DeepSeek suy luận sai cột giá/số lượng.

### ⚠️ 3.3. Chưa có đo lường thời gian xử lý (Latency Tracking)
**Vấn đề:** Không log thời gian từ lúc gửi ảnh đến lúc nhận JSON. Khi chạy production, không biết provider nào nhanh hơn, và không phát hiện được các lần gọi chậm bất thường.

### ⚠️ 3.4. Không so sánh kết quả AI với Expected Data tự động
**Vấn đề:** Có sẵn file `expected/bill_01_expected.json` nhưng **chưa có script nào tự động so sánh** output AI vs expected. Hiện tại việc so sánh chỉ dừng ở mức "nhìn bằng mắt" trên console.

### ⚠️ 3.5. Prompt dùng chung cho tất cả Provider
**Vấn đề:** Cả 3 provider đều dùng chung 1 prompt (`SYSTEM_PROMPT` + `USER_PROMPT`). Nhưng thực tế, mỗi model có cách hiểu và thực thi prompt khác nhau. GPT-4o có thể tuân thủ prompt rất tốt, nhưng Gemini hoặc DeepSeek có thể cần prompt được tinh chỉnh riêng để đạt hiệu quả tối ưu.

### ⚠️ 3.6. Chưa xử lý ảnh lớn (Image Preprocessing)
**Vấn đề:** Ảnh gốc được gửi thẳng lên AI mà không qua bước tiền xử lý (resize, crop, tăng độ tương phản). Ảnh bill chụp lệch, tối, hoặc quá lớn (>5MB) sẽ:
- Tốn thêm token (tiền).
- Tăng latency.
- Có thể vượt giới hạn kích thước của một số API.

---

## 4. Đề xuất cải tiến

### 🚀 Cải tiến 1: Thêm Retry với Exponential Backoff
```python
# Ví dụ trong vision_extract.py
import time

def _call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except (TimeoutError, RateLimitError) as e:
            if attempt == max_retries - 1:
                raise
            wait = 2 ** attempt  # 1s, 2s, 4s
            print(f"⏳ Retry {attempt+1}/{max_retries} sau {wait}s...")
            time.sleep(wait)
```
**Lợi ích:** Giảm 80% lỗi tạm thời mà không cần nhảy sang fallback provider.

---

### 🚀 Cải tiến 2: Thêm Automated Evaluation Script
Tạo file `evaluate.py` tự động so sánh output AI với expected JSON:
```python
# So sánh từng trường: grand_total, số items, tên món
# Tính toán accuracy score tự động
# Ví dụ: "OpenAI đúng 5/6 bill, Gemini đúng 4/6 bill"
```
**Lợi ích:** Mỗi lần thay đổi prompt hoặc model, chạy 1 lệnh là biết ngay chất lượng tăng hay giảm.

---

### 🚀 Cải tiến 3: Thay OCR của DeepSeek Pipeline bằng Gemini (miễn phí)
Hiện DeepSeek đang dùng **OpenAI GPT-4o** để OCR (tốn tiền). Có thể thay bằng **Gemini** (miễn phí) để giảm chi phí:
```
Ảnh → [Gemini OCR miễn phí] → Text → [DeepSeek suy luận rẻ] → JSON
```
**Lợi ích:** Chi phí DeepSeek pipeline giảm từ ~$2.5 xuống gần $0 cho bước OCR.

---

### 🚀 Cải tiến 4: Thêm Image Preprocessing
```python
from PIL import Image

def preprocess_image(image_path):
    img = Image.open(image_path)
    # 1. Resize nếu quá lớn (giới hạn 2048px cạnh dài)
    # 2. Tăng contrast cho bill mờ
    # 3. Auto-rotate nếu bị xoay
    # 4. Nén JPEG quality=85 để giảm size
    return processed_img
```
**Lợi ích:** Giảm chi phí token, tăng tốc độ, cải thiện độ chính xác cho bill mờ/tối.

---

### 🚀 Cải tiến 5: Thêm Latency & Cost Tracking
```python
import time

start = time.time()
result = extract_bill(image_path, provider="openai")
elapsed = time.time() - start

result["latency_ms"] = int(elapsed * 1000)
result["estimated_cost_usd"] = _estimate_cost(provider, image_size)
```
**Lợi ích:** Có dữ liệu thực tế để quyết định provider nào tối ưu nhất cho production.

---

### 🚀 Cải tiến 6: Fine-tune Prompt riêng cho từng Provider
Tạo prompt template có phần chung và phần riêng:
```python
# prompt_template.py
COMMON_RULES = "..."
OPENAI_SPECIFIC = "Trả về JSON object duy nhất, không markdown."
GEMINI_SPECIFIC = "Chỉ trả về JSON, tuyệt đối không giải thích."
DEEPSEEK_SPECIFIC = "Phân tích text OCR sau đây thành JSON..."
```
**Lợi ích:** Tăng độ chính xác 5-15% do mỗi model được hướng dẫn theo cách nó hiểu tốt nhất.

---

## 5. Bảng tổng hợp đề xuất (ưu tiên từ cao → thấp)

| # | Đề xuất | Độ khó | Tác động | Ưu tiên |
|---|---------|--------|----------|---------|
| 1 | Retry với Backoff | Dễ | Cao — giảm lỗi tạm thời | 🔴 Cao |
| 2 | Automated Evaluation | Trung bình | Cao — đo lường chất lượng | 🔴 Cao |
| 3 | Thay OCR bằng Gemini miễn phí | Dễ | Trung bình — giảm chi phí | 🟡 Trung bình |
| 4 | Image Preprocessing | Trung bình | Trung bình — tăng chính xác | 🟡 Trung bình |
| 5 | Latency & Cost Tracking | Dễ | Trung bình — monitor | 🟡 Trung bình |
| 6 | Prompt riêng từng Provider | Trung bình | Trung bình — tăng chính xác | 🟢 Thấp |
