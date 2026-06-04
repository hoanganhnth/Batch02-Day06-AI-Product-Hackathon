from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from ai_service.vision_extract import extract_bill
from ai_service.config import DEFAULT_PROVIDER
import uvicorn
import os
import tempfile
import base64

app = FastAPI(title="Smart Bill Splitting AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/scan-receipt")
async def scan_receipt(request: Request):
    try:
        body = await request.json()
        image_data = body.get("image")
        if not image_data:
            raise HTTPException(status_code=400, detail="Missing image data")

        # Strip "data:image/jpeg;base64," if present
        if "," in image_data:
            header, base64_str = image_data.split(",", 1)
        else:
            base64_str = image_data
            
        # Write base64 to a temporary file since vision_extract expects a file path
        img_bytes = base64.b64decode(base64_str)
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
            tmp.write(img_bytes)
            tmp_path = tmp.name

        try:
            print(f"Calling AI extraction using provider: {DEFAULT_PROVIDER}")
            result = extract_bill(tmp_path, provider=DEFAULT_PROVIDER)
            if "error" in result:
                raise HTTPException(status_code=500, detail=result["error"])
                
            # Map Python schema (BillExtraction) to Frontend schema (Cloudflare Worker format)
            frontend_result = {
                "restaurant": result.get("restaurant_name") or "Không rõ",
                "items": [],
                "sharedFees": []
            }
            
            item_id = 1
            fee_id = 101
            
            # Map items
            for item in result.get("items", []):
                if item.get("item_type") == "shared_fee":
                    frontend_result["sharedFees"].append({
                        "id": fee_id,
                        "name": item.get("name", "Phí chung"),
                        "amount": item.get("total_price", 0)
                    })
                    fee_id += 1
                else:
                    qty = item.get("quantity") or 1
                    price = item.get("unit_price")
                    if price is None:
                        price = item.get("total_price", 0) / qty if qty else item.get("total_price", 0)
                    
                    frontend_result["items"].append({
                        "id": item_id,
                        "name": item.get("name", "Món ăn"),
                        "qty": int(qty),
                        "price": int(price),
                        "type": "food"
                    })
                    item_id += 1
            
            # Map VAT and Service Charge if present
            if result.get("vat_amount"):
                frontend_result["sharedFees"].append({
                    "id": fee_id,
                    "name": f"VAT ({result.get('vat_percent', '')}%)" if result.get('vat_percent') else "VAT",
                    "amount": result.get("vat_amount", 0)
                })
                fee_id += 1
                
            if result.get("service_charge_amount"):
                frontend_result["sharedFees"].append({
                    "id": fee_id,
                    "name": f"Phí phục vụ ({result.get('service_charge_percent', '')}%)" if result.get('service_charge_percent') else "Phí phục vụ",
                    "amount": result.get("service_charge_amount", 0)
                })
                fee_id += 1
                
        finally:
            os.unlink(tmp_path)

        return frontend_result

    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    print("Starting AI Service on port 8000...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
