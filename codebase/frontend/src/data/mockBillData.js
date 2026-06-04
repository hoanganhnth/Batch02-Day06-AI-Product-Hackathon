export const mockBillResult = {
  restaurant: "Haidilao Vincom Bà Triệu",
  date: "03/06/2026",
  items: [
    { id: 1, name: "Thịt bò Mỹ thái lát", qty: 1, price: 189000, type: "food" },
    { id: 2, name: "Combo Lẩu 4 Người (Bò, Gà, Nấm)", qty: 1, price: 599000, type: "food", confidence: "low", aiNote: "Món Combo này thường dành cho cả nhóm." },
    { id: 3, name: "Khoai tây chiên", qty: 2, price: 49000, type: "food" },
    { id: 4, name: "Coca Cola", qty: 3, price: 25000, type: "food" },
    { id: 5, name: "Nước cam ép", qty: 1, price: 35000, type: "food" },
    // AI nhận diện SAI — đáng lẽ là phí chung nhưng lại xếp vào danh sách món ăn lẻ để gán cho người dùng
    { id: 6, name: "Khăn lạnh", qty: 4, price: 10000, type: "food", aiMistake: true },
    { id: 7, name: "Gửi xe máy", qty: 1, price: 5000, type: "food", aiMistake: true },
  ],
  sharedFees: [
    { id: 101, name: "VAT (8%)", amount: 76000 },
    { id: 102, name: "Phí phục vụ (5%)", amount: 47500 },
  ],
  total: 1098500,
};
