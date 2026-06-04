# Kịch Bản Demo: Smart Bill Splitting (MoMo AI)

**Thời gian dự kiến:** 3 - 5 phút
**Người thuyết trình (Gợi ý):** Nguyễn Văn Minh / Nguyễn Dương Hiếu

## 1. Mở đầu (Context & Pain Point) - 30s
* **Người thuyết trình (MC):** "Chào ban giám khảo và các bạn. Chắc hẳn ai ở đây cũng từng đi ăn nhóm, và trải qua cảm giác cầm một tờ hóa đơn dài dằng dặc, phải gõ lại từng món hoặc ngồi tính tay cộng máy tính để chia tiền cho từng người. Rất mất thời gian, dễ tính sai thuế phí, và việc đòi tiền lẻ tẻ khiến chúng ta rất ngại.
* Nhóm **Bills** xin trình bày giải pháp: **Smart Bill Splitting** tích hợp trên MoMo, sử dụng Vision LLM để bóc tách hóa đơn tự động và cơ chế Crowdsourcing (Giao quyền chọn món) để mọi người tự nhận phần ăn của mình một cách vui vẻ và minh bạch."

## 2. Kịch bản 1: Happy Path (Chạy luồng chuẩn) - 1.5 phút
* **Thao tác trên màn hình:**
    1. Mở app MoMo (Prototype), vào mục **Chia tiền**.
    2. Bấm nút **Quét hóa đơn**. Chọn một ảnh hóa đơn rõ nét (gồm các món ăn lẻ).
    3. Màn hình loading (AI đang xử lý bằng Vision LLM).
    4. Trả về màn hình **Danh sách món ăn** đã được số hóa chuẩn xác 100% (bao gồm Tên món, Giá, Thuế VAT/Phí dịch vụ được tách riêng).
    5. Host bấm **Tạo Link Chia Tiền** và gửi vào Group Chat (giả lập gửi qua Zalo/MoMo chat).
    6. Đóng vai Bạn bè (mở 2-3 tab ẩn danh hoặc điện thoại khác): Bấm vào link, tự chọn món mình đã ăn (ví dụ: Bạn A chọn "Trà đào", Bạn B chọn "Cơm tấm").
    7. Quay lại màn hình Host: Nhìn thấy danh sách cập nhật realtime (A ăn gì, B ăn gì) và tổng tiền mỗi người phải trả đã gồm thuế phí.
    8. Host bấm **Yêu cầu thanh toán**.
* **Lời bình của MC:** "Thay vì Host phải tự hỏi ai ăn gì, AI đã bóc tách hóa đơn trong 3 giây. Sau đó, mỗi người tự vào link tick món của mình. Tính minh bạch tuyệt đối, không ai phải chịu cảnh 'bị đòi nợ', và hệ thống tự động chia thuế phí công bằng."

## 3. Kịch bản 2: Low-Confidence Path (AI hỏi lại user) - 45s
* **Thao tác trên màn hình:**
    1. Upload một hóa đơn thứ hai, trong đó có món "Combo Lẩu 4 Người".
    2. AI xử lý xong, màn hình hiện danh sách món.
    3. Dòng "Combo Lẩu 4 Người" bị bôi vàng (Highlight).
    4. Một Popup hiện lên: *"Món Combo này chia đều cho cả bàn hay gán cho 1 cá nhân?"*
    5. Host bấm chọn **Chia đều**. Hệ thống lập tức chuyển món này vào mục "Phí chung".
* **Lời bình của MC:** "AI không thể đoán được nhóm bạn ăn chung hay ăn riêng món Combo. Thay vì tự ý chia sai, AI chủ động đánh dấu low-confidence và nhường quyền quyết định (Human in the loop) cho người Host. Việc này đảm bảo tính chính xác cao nhất."

## 4. Kịch bản 3: Correction & Failure Mode (Sửa sai khi AI nhầm lẫn) - 1 phút
* **Thao tác trên màn hình:**
    1. Tiếp tục trên hóa đơn vừa rồi. Phí "Khăn lạnh/Gửi xe" bị AI nhận nhầm thành một món ăn độc lập (đang chờ có người tick chọn).
    2. Host nhấp vào dòng "Khăn lạnh/Gửi xe", chọn **Chuyển thành Phí chung**. Món này lập tức được chia đều cho mọi người.
    3. Cố tình chọn một hóa đơn bị mờ, AI đọc sai giá tiền (ví dụ món "Bia" 150.000đ AI đọc thành 1.500.000đ).
    4. Host bấm vào ô giá tiền "1.500.000đ", gõ đè thành "150.000đ". Tiền tổng tự động cập nhật lại.
    5. (Tùy chọn) Giả sử bạn bè tick nhầm món của người khác, Host dùng quyền Admin bấm **Gỡ tick**.
* **Lời bình của MC:** "Hệ thống luôn cho phép User kiểm soát cuối cùng (Human as Decider). Việc AI đọc sai phí gửi xe hay sai giá tiền (Failure Mode) hoàn toàn có thể xảy ra. Do đó, chúng tôi thiết kế tính năng ghi đè (Override) và chuyển đổi linh hoạt để Host sửa sai ngay lập tức trước khi chốt chia tiền."

## 5. Kết luận (15s)
* **Lời bình của MC:** "Với Smart Bill Splitting, chúng tôi biến một trải nghiệm tài chính mệt mỏi, dễ cãi vã thành một luồng tương tác vui vẻ, nhanh chóng. Xin cảm ơn ban giám khảo đã theo dõi."
