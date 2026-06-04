import os
import json
import base64
import time
from pathlib import Path
from openai import OpenAI
from prompts import PROMPTS

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def test_bill(client, image_path, prompt_version, prompt_text):
    print(f"Testing {image_path.name} with {prompt_version}...")
    base64_image = encode_image(image_path)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            response_format={ "type": "json_object" },
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}", "detail": "high"}}
                    ]
                }
            ],
            temperature=0.0
        )
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        print(f"  -> Lỗi gọi API: {e}")
        return {"error": str(e)}

def run_all_tests():
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        print("❌ LỖI: Vui lòng cài đặt biến môi trường OPENAI_API_KEY trước khi chạy.")
        return

    client = OpenAI(api_key=api_key)
    
    data_dir = Path("data/bills")
    results_dir = Path("results/latest_run")
    results_dir.mkdir(parents=True, exist_ok=True)
    
    # Tìm tất cả file png, jpg
    bills = list(data_dir.rglob("*.png")) + list(data_dir.rglob("*.jpg"))
    if not bills:
        print("Không tìm thấy bill nào trong data/bills/")
        return
        
    print(f"Tìm thấy {len(bills)} bills. Bắt đầu test...")
    
    for prompt_key, prompt_text in [("v3_edge_case_aware", PROMPTS["v3_edge_case_aware"])]:
        print(f"\n=== Đang test prompt: {prompt_key} ===")
        prompt_dir = results_dir / prompt_key
        prompt_dir.mkdir(exist_ok=True)
        
        for bill in bills:
            result_path = prompt_dir / f"{bill.stem}_result.json"
            if result_path.exists():
                print(f"Bỏ qua {bill.stem} (đã chạy trước đó)")
                continue
                
            result_json = test_bill(client, bill, prompt_key, prompt_text)
            
            with open(result_path, "w", encoding="utf-8") as f:
                json.dump(result_json, f, ensure_ascii=False, indent=2)
            
            # Rate limiting sleep
            time.sleep(2)
            
    print("\n✅ Hoàn thành test_prompt.py. Kết quả được lưu trong results/latest_run/")

if __name__ == "__main__":
    run_all_tests()
