import json
import sys
import io
import os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from ai_service.vision_extract import extract_bill

def main():
    test_dir = "test_data"
    for filename in os.listdir(test_dir):
        if filename.endswith(".png") or filename.endswith(".jpg"):
            path = os.path.join(test_dir, filename)
            print(f"Extracting {path}...")
            result = extract_bill(path, provider="openai")
            print(f"File: {filename} - Restaurant: {result.get('restaurant_name')}")

if __name__ == "__main__":
    main()
