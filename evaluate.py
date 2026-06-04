import json
from pathlib import Path

def load_json(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def evaluate():
    expected_dir = Path("data/expected")
    results_dir = Path("results/latest_run")
    
    if not results_dir.exists():
        print("❌ Chưa có thư mục results/latest_run/ (Cần chạy test_prompt.py trước)")
        return

    summary = {}
    
    for prompt_dir in results_dir.iterdir():
        if not prompt_dir.is_dir(): continue
        
        prompt_name = prompt_dir.name
        summary[prompt_name] = {
            "total_bills": 0,
            "grand_total_correct": 0,
            "items_count_correct": 0,
            "shared_fee_detected": 0
        }
        
        for result_file in prompt_dir.glob("*_result.json"):
            bill_name = result_file.stem.replace("_result", "")
            expected_file = expected_dir / f"{bill_name}_expected.json"
            
            if not expected_file.exists():
                print(f"⚠️ Thiếu ground truth: {expected_file.name}")
                continue
                
            summary[prompt_name]["total_bills"] += 1
            
            try:
                result_data = load_json(result_file)
                expected_data = load_json(expected_file)
                
                # Metric 1: Grand Total Correct
                if result_data.get("grand_total") == expected_data.get("grand_total"):
                    summary[prompt_name]["grand_total_correct"] += 1
                    
                # Metric 2: Items Length Correct
                if len(result_data.get("items", [])) == len(expected_data.get("items", [])):
                    summary[prompt_name]["items_count_correct"] += 1
                    
                # Metric 3: Shared Fee Detection (Chỉ tính những bill có shared_fee)
                expected_shared = any(item.get("item_type") == "shared_fee" for item in expected_data.get("items", []))
                result_shared = any(item.get("item_type") == "shared_fee" for item in result_data.get("items", []))
                
                if expected_shared == result_shared:
                    summary[prompt_name]["shared_fee_detected"] += 1
                    
            except Exception as e:
                print(f"Lỗi khi đánh giá {result_file.name}: {e}")
                
    # In báo cáo
    print("="*50)
    print("🏆 BÁO CÁO ĐÁNH GIÁ PROMPT GPT-4o VISION")
    print("="*50)
    for prompt_name, metrics in summary.items():
        total = metrics["total_bills"]
        if total == 0: continue
        print(f"\n📌 Prompt: {prompt_name} (Đã test {total} bills)")
        print(f"  - Grand Total Accuracy:   {metrics['grand_total_correct']/total*100:.1f}%")
        print(f"  - Items Count Accuracy:   {metrics['items_count_correct']/total*100:.1f}%")
        print(f"  - Shared Fee Detection:   {metrics['shared_fee_detected']/total*100:.1f}%")
    print("="*50)

if __name__ == "__main__":
    evaluate()
