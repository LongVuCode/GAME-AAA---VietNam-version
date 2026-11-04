# Báo cáo Demo 0.2: Đợt "game feel"
Ngày: 2026-11-04 · Nhánh: `feat/demo-0.2-feel` → gộp vào `main` · Chơi thử: https://claude.ai/artifact/4PetpFm4jRtHe1UQL86ke5 (build `5cc7e27`)

## Phản hồi của PO → cách xử lý
| Phản hồi | Đã làm | Tài liệu / mã |
|---|---|---|
| 1. Gameplay chán | Chẩn đoán 5 nguyên nhân (dẫn file:dòng), rồi làm toàn bộ danh sách P0 | `design/FUN_PASS_0_2.md` |
| 2. Khi hoàn thiện sẽ trông thế nào | Bản định hướng mỹ thuật: tầm nhìn, 5 trụ cột, cảnh đích có mã màu, tham chiếu hiện vật Đông Sơn, công nghệ UE5, phần cần người thật | `docs/ART_DIRECTION.md` |
| 3. Thiếu hiệu ứng, thiếu motion, thiếu nút chạy | Ba tốc độ đi/chạy/chạy nhanh có quán tính; né 8 hướng; rig có khớp với 16 đòn ba pha; hiệu ứng trúng đòn ≥ 6 lớp; vệt vũ khí; camera; âm thanh 3 lớp; ánh sáng, sương, lau sậy lay | `prototype/web/src/anim/`, `src/fx/`, `src/logic/` |
| 4. Học phím của game khác | So sánh 7 game; sơ đồ phím mới cho bàn phím+chuột và tay cầm; màn đổi phím; nút hiển thị theo thiết bị | `design/CONTROLS_STUDY.md`, `design/data/controls.json` |
| 5. Đưa toàn bộ lên `main` | Đã gộp (xem §4) | |

## Bằng chứng (người điều phối đã tự chạy lại)
- Prototype: unit test **79/79**, smoke Playwright **51/51** (không lỗi console, không gọi mạng).
- `design_validate`: 0 lỗi; test Python đạt.
- ArpgCore: CTest **19/19**, 0 cảnh báo, không bị ảnh hưởng vì dữ liệu chỉ được thêm trường.
- Ảnh động tác (chuỗi khung hình) đã xem: đòn rìu có lấy đà → bổ xuống kèm vệt sáng → thu đòn.

## Giới hạn trung thực
- **Vẫn là graybox:** động tác là animation thủ tục trên hình khối, chưa có IK bàn chân. Đây là bản thử *nhịp chơi*, không phải đồ họa đích (xem `ART_DIRECTION.md`).
- Chưa có số FPS thật (headless chạy đồ họa phần mềm). Chưa thử tay cầm thật.
- Mọi con số (tốc độ, cửa sổ, sát thương) là giả định chờ playtest.
- Phím của 7 game mới tra qua trích đoạn tìm kiếm, chưa đối chiếu menu thật.
- Đợt này **không có lượt QA agent riêng**. Người điều phối chỉ chạy lại test và smoke, và xem ảnh.
- Chưa làm (P1/P2): phần thưởng "Đầm yên lại", lối tắt thứ hai, 3 bí mật môi trường, vật phẩm nhặt, tùy chọn tắt slow-mo.
- Track UE vẫn chờ log build từ máy PO; các thay đổi feel mới nằm ở prototype web, chưa port sang UE.

## Bước tiếp đề xuất
1. PO chơi lại bản 0.2, nhận xét cụ thể: chạy, đòn, quái, boss, phím.
2. Làm các mục P1 (phần thưởng, khám phá); QA review prototype.
3. Port movement/motion/fx sang code UE sau khi có log build đầu tiên.
