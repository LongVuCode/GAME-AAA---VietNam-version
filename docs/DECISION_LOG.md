# Decision Log

| ID | Ngày | Quyết định | Lý do | Trạng thái |
|---|---|---|---|---|
| D-001 | 2026-11-03 | Engine: Unreal Engine 5; ứng viên phiên bản 5.7.x | Nanite, Lumen, VSM, World Partition, GAS; có plugin upscaler của 3 hãng | Đề xuất. Chờ ma trận plugin ở GĐ1 |
| D-002 | 2026-11-03 | Làm vertical slice Chương 1 "Đầm Xác Cáo" (Hồ Tinh) | Điểm shortlist cao nhất (93); là huyền thoại thuần nên không rủi ro sai sử trong khi quy trình nghiên cứu còn đang hoàn thiện | **Tạm hoãn** (PO): làm lại sau khi có kết quả D-012 |
| D-003 | 2026-11-03 | Phạm vi Game 1: từ Hồng Bàng tới năm 1428 (Lam Sơn); Tây Sơn và Hai Bà Trưng để làm DLC/dự phòng; loại giai đoạn từ 1858 | Cân bằng giữa ý nghĩa và rủi ro | **Tạm hoãn**: phụ thuộc D-012 |
| D-004 | 2026-11-03 | Nhân vật chính hư cấu "Đồng", lập lời thề với thần Đồng Cổ (P1) | Chi phí thấp, rủi ro tranh cãi thấp, có cung bậc cảm xúc | **Tạm hoãn** (PO): làm lại sau D-012 |
| D-005 | 2026-11-03 | Tên game: "HỒN TRỐNG — Lời Thề Đồng Cổ" | Gắn cơ chế với biểu tượng văn hóa | **Tạm hoãn** (PO): làm lại sau D-012 |
| D-006 | 2026-11-03 | Dữ liệu nghiên cứu ở dạng JSON, có lint tự động; Codex sinh từ chính dữ liệu này | Một nguồn sự thật; chặn tự động nội dung chưa xác minh | Đã áp dụng |
| D-007 | 2026-11-03 | Quy tắc "2 dòng nguồn độc lập"; công trình hiện đại không được tính là bằng chứng độc lập | Toàn thư và Cương mục kế thừa nhau | Đã áp dụng |
| D-008 | 2026-11-03 | Logic gameplay đặt trong module C++ thuần `ArpgCore` | Test được ngoài engine, kể cả trong môi trường AI không có GPU | Đề xuất |
| D-009 | 2026-11-03 | Phát hành thương mại trên Steam và các nền tảng khác | Quyết định của PO | **Đã chốt** (xem `COMMERCIAL_RELEASE.md`) |
| D-010 | 2026-11-03 | Máy phát triển và đo hiệu năng: RTX 5050, 8 GB VRAM; nhân sự là 1 người | Thông tin từ PO | **Đã chốt**: ảnh hưởng tới TECH_SPEC §7 và phạm vi game |
| D-011 | 2026-11-03 | Dùng đội AI agent theo vai trò (`.claude/agents/`); mọi sản phẩm phải được agent khác review; mốc quan trọng do PO duyệt | PO yêu cầu; solo dev | **Đã áp dụng** (`AGENT_TEAM.md`) |
| D-012 | 2026-11-03 | Cấu trúc cốt truyện: kết hợp sử + huyền thoại, tách riêng, hay lai có ranh giới | PO chưa chắc chắn, giao `narrative-researcher` nghiên cứu | **ĐÃ CHỐT (PO)**: phương án lai **H** với điều kiện C1–C6 (`research/narrative/debate/VERDICT.md`) |
| D-013 | 2026-11-03 | Chiến lược demo và playtest: test demo liên tục trước khi lên Steam; demo công khai trên Steam cùng một bản thu thập ý kiến riêng trên nhiều nền tảng | Quyết định của PO | **ĐÃ CHỐT**: chi tiết ở `PLAN.md` §Demo và playtest |
| D-014 | 2026-11-03 | Nhân vật chính: hướng **dòng họ** (mỗi chương một người, tiến trình kế thừa), tiếp tục cải tiến qua agent | PO thích ý của giám khảo Văn hóa nhưng muốn cải tiến thêm | **Đang thiết kế**: `research/narrative/protagonist/` |
| D-015 | 2026-11-03 | Tạo agent `vn-history-folklore-expert` (chuyên gia lịch sử và văn hóa dân gian) | PO yêu cầu thay cho tuyển cố vấn | **Đã áp dụng**, nhưng AI chỉ được xác minh tới mức B; mức A và điều kiện C2 vẫn cần người thật (xem R-12) |
| D-017 | 2026-11-03 | Phản diện Game 1: "K1+ đã sửa" (Khoen Thuần, cạy để giải thoát; nền K1-nhẹ; lùi về K0) | Tranh luận phản diện sau nghiên cứu Elden Ring; là phương án duy nhất cả 3 giám khảo chấp nhận | **Chờ PO chốt**: `research/narrative/villain_debate/VERDICT.md` |
| D-016 | 2026-11-03 | Tên chương biển là **"Đông Hải"** (theo văn phong LNCQ); bản `en` không dùng "East Sea" hay "South China Sea"; Codex trích bản dịch thì giữ "Biển Đông"; game không có bản đồ biển đảo hiện đại | Phản biện V-05, hồ sơ chuyên gia | **Đã áp dụng**; các tài liệu cũ (STUDY, V1) giữ nguyên làm hồ sơ lịch sử |
