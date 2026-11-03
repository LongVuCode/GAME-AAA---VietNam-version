# Kế hoạch tổng thể và Roadmap

## Nguyên tắc
Làm **một chương hoàn chỉnh ở chất lượng đích (vertical slice, Chương 1)** trước, rồi mới mở rộng. Hết mỗi giai đoạn: nộp báo cáo, sau đó DỪNG chờ duyệt.

## Các giai đoạn
| GĐ | Tên | Nội dung | Tiêu chí nghiệm thu (đo được) |
|---|---|---|---|
| **0** | Tiền sản xuất: nền tảng và nghiên cứu đợt 1 | Bộ tài liệu, dòng thời gian, danh mục huyền thoại, shortlist, tên game, nhân vật chính | Lint dữ liệu 0 lỗi; test đạt; có báo cáo GĐ0 |
| **1** | Nền móng kỹ thuật và nghiên cứu sâu cho Chương 1 | Pin phiên bản UE theo ma trận plugin; tạo project UE và các module; CI; `ArpgCore` (khung, combat math, posture) kèm unit test; đối chiếu nguồn cho mọi mục Chương 1 lên mức B (có số trang); tuyển cố vấn sử học; art bible v1; kiểm tra nhãn hiệu | Project build sạch trên Windows (log); ≥ 80% coverage cho ArpgCore; CI xanh; 100% mục Chương 1 có trích dẫn trang; ma trận plugin được ký |
| **2** | Prototype combat (graybox) | Di chuyển, lock-on, đòn nhẹ/nặng, combo, né, parry, tư thế, hit-stop, 2 vũ khí, 3 loại quái, 1 mini-boss, Nhịp trống | Playtest nội bộ ≥ 5 người với bảng chấm "game feel" ≥ 4/5; input latency đo được; 60 FPS trên máy khuyến nghị ở graybox |
| **3** | Hệ thống | Trang bị, loot, chế tác, set, cây kỹ năng, save/load, Codex (export từ research), localization vi/en, menu cài đặt đầy đủ, upscaler, tự nhận diện phần cứng, benchmark harness, chuỗi bí mật, gợi ý | Test tự động cho loot/craft/secret graph (không softlock); 100% chuỗi UI đi qua localization; benchmark CSV cho 5 preset × 2 GPU |
| **4** | Nội dung vertical slice Chương 1 | Khu bán mở, quái, boss Hồ Tinh 3 pha, set-piece lũ, nhiệm vụ phụ, sự kiện, VO/nhạc placeholder hoặc thật | Chơi từ đầu tới cuối chương không có blocker; 0 bug A; mọi mục nội dung lên mức A (đã qua cố vấn) |
| **5** | Đánh bóng và tối ưu slice | PSO, streaming, VRAM, trợ năng, QA, playtest bên ngoài | Đạt chỉ tiêu FPS và 1% low đo thật theo TECH_SPEC §4; không hitch PSO > 50ms; playtest ≥ 20 người |
| 6+ | Sản xuất mở rộng | Chương 2–9, tuần tự | Mỗi chương có tiêu chí riêng tương tự GĐ4–5 |

## Demo và playtest (D-013)
Nguyên tắc: **test demo liên tục**, mỗi bản build đều có kênh thu thập ý kiến. Trang Steam và trailer chỉ mở khi đạt điều kiện C2 (VERDICT §4).

| Vòng | Khi nào | Kênh (đề xuất) | Người tham gia | Thu thập |
|---|---|---|---|---|
| Nội bộ | Mỗi mốc của GĐ2–GĐ5 | Bản build gửi trực tiếp | PO và người quen | Form chấm game feel, câu hỏi "có bị cướp công không", ghi lại video |
| Playtest kín | Sau GĐ4 (vertical slice) | Steam Playtest (ứng dụng tách riêng khỏi trang game) và/hoặc bản tải từ itch.io có giới hạn | 20–100 người đăng ký | Form khảo sát, thống kê ẩn danh có xin phép, báo lỗi trong game |
| Demo công khai | Sau GĐ5 và sau khi đạt C2 | Steam demo (có thể dự Steam Next Fest); các nền tảng khác nếu chính sách của nền tảng cho phép demo | Công chúng | Đánh giá, khảo sát, Discord |
| Bản thu thập ý kiến riêng | Song song với demo | Một bản build "Feedback" tách riêng (có nút gửi ý kiến và chụp màn hình trong game), phát hành ở nơi phù hợp từng nền tảng | Người chơi demo | Gom về một kho chung (form hoặc issue tracker) |

> **Chưa xác minh:** chính sách demo/playtest của Epic Games Store, GOG, Microsoft Store và quy định về thu thập dữ liệu người chơi (quyền riêng tư) cần kiểm tra trước khi triển khai.

**Công cụ cần có ngay từ GĐ2:**
- Nút "Gửi ý kiến" trong game, kèm build ID và thông tin phần cứng (người chơi đồng ý mới gửi).
- Bảng câu hỏi chuẩn để so sánh kết quả giữa các vòng.

## Phần cần người thật (AI không thay được)
| Hạng mục | Lý do | Pipeline / placeholder đề xuất |
|---|---|---|
| Cố vấn sử học, dân tộc học, tín ngưỡng | Ký duyệt mức A; tham vấn cộng đồng | Hợp đồng theo chương; quy trình review trong RESEARCH_PROTOCOL |
| Pháp lý / sở hữu trí tuệ | Nhãn hiệu, EULA UE, hợp đồng, license asset | Luật sư; dùng ASSET_LICENSE_REGISTER |
| Concept art, 3D nhân vật, boss cao cấp | Chất lượng AAA | Placeholder: asset Fab/Megascans có license, MetaHuman cho NPC; ngân sách thuê studio outsource |
| Motion capture, animation | Cảm giác combat | Placeholder: animation có license (Fab) cộng retarget; đặt studio mocap khi chốt bộ chiêu |
| Lồng tiếng vi/en | | Placeholder TTS gắn nhãn `PLACEHOLDER_AI`, không phát hành |
| Nhạc (nhạc cụ dân tộc), sound design | | Placeholder thư viện SFX có license; thuê nhạc sĩ |
| QA, playtest | | Nhóm thử nghiệm bên ngoài từ GĐ2 |
| Phần cứng build và benchmark | AI không có GPU/Windows | Máy Windows của dự án; CI self-hosted |
