"""
Schema chuẩn hóa đầu ra cho Vision LLM.
Cả OpenAI GPT-4o và Gemini 2.5 Flash đều PHẢI trả về đúng format này.
Dùng Pydantic để validate kết quả từ AI.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum


class ItemType(str, Enum):
    """Phân loại từng dòng trên hóa đơn."""
    FOOD = "food"              # Món ăn/đồ uống bình thường → gán cho cá nhân
    SHARED_FEE = "shared_fee"  # Phí chung chia đều: khăn lạnh, gửi xe, phí DV
    COMBO = "combo"            # Combo/set nhiều người → cần Host quyết định


class BillItem(BaseModel):
    """Một dòng trên hóa đơn."""
    name: str = Field(..., description="Tên món (tiếng Việt gốc trên bill)")
    unit_price: Optional[int] = Field(default=None, description="Đơn giá (cho phép null nếu bill không ghi)")
    quantity: Optional[float] = Field(default=None, description="Số lượng (cho phép null nếu bị gộp chung)")
    total_price: int = Field(..., description="Thành tiền = unit_price × quantity")
    item_type: ItemType = Field(default=ItemType.FOOD, description="Loại: food / shared_fee / combo")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Độ tin cậy AI đọc đúng (0.0 → 1.0)")
    note: Optional[str] = Field(default=None, description="Ghi chú nếu AI không chắc chắn")


class BillExtraction(BaseModel):
    """Kết quả bóc tách toàn bộ hóa đơn."""
    restaurant_name: Optional[str] = Field(default=None, description="Tên nhà hàng (nếu đọc được)")
    items: List[BillItem] = Field(default_factory=list, description="Danh sách món")
    sub_total: Optional[int] = Field(default=None, description="Tổng phụ (trước thuế)")
    vat_percent: Optional[float] = Field(default=None, description="% VAT (ví dụ: 8.0 hoặc 10.0)")
    vat_amount: Optional[int] = Field(default=None, description="Tiền VAT")
    service_charge_percent: Optional[float] = Field(default=None, description="% phí dịch vụ")
    service_charge_amount: Optional[int] = Field(default=None, description="Tiền phí dịch vụ")
    grand_total: int = Field(..., description="TỔNG CỘNG cuối cùng")
    has_unclear_items: bool = Field(default=False, description="True nếu có item confidence < 0.7")
    raw_text_fallback: Optional[str] = Field(default=None, description="Text thô nếu AI không parse được")
