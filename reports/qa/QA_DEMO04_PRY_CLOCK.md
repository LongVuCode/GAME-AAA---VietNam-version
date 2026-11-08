# QA Demo 0.4 — nhịp cạy khi render chậm

Ngày: 2026-11-08. Nhánh: `feat/demo-0.4`. Phạm vi: sửa nhịp cạy và đồng bộ bài smoke; không ghép combat 0.4 hoặc dựng quái mới.

## Nguyên nhân và sửa đổi

- `Game.frame()` giới hạn thời gian UI ở 0,5 giây nhưng timestamp bàn phím dùng thời gian thực. Cạy dùng cùng bước UI nên lệch nhịp khi một khung hình dài hơn 0,5 giây.
- Truyền thời gian thực chưa clamp riêng cho cạy; grace xử lý input theo độ dài khung hình thực. Simulation/UI vẫn clamp; cửa sổ bấm đúng nhịp không đổi.
- Smoke chờ nội dung HUD nhiệm vụ, trạng thái tắt rung camera và lời nhắc Cạy thay vì đọc UI sau khoảng chờ cố định.
- Server test trả 204 cho favicon không được khai báo. File thiếu khác vẫn trả 404.

## Bằng chứng

- 159/159 test web đạt, gồm 2 test hồi quy mới cho khung hình 1,2 giây và input đúng nhịp được xử lý muộn hơn 0,5 giây.
- 102/102 test Python đạt.
- `design_validate`: 0 lỗi, 12 cảnh báo (nguồn sử liệu và điểm story chưa khai báo trong world_0_4).
- 8/8 asset LFS đã checkout; SHA-256 khớp từng file phát hành trong ASSET_LICENSE_REGISTER (L-023…L-030).
- Build gồm 9 file, tổng 15,27 MiB; từng file dưới 15 MB, HTML dưới 16 MB.
- Lượt smoke chẩn đoán đầy đủ với PBR thật: 82/86. Toàn bộ gameplay đến màn kết thúc đạt; boss giải thoát ngay lần cạy đầu, 3 hit. Bốn assertion trượt là ba lần đọc UI sớm và console favicon 404, đã sửa sau lượt này.
- Log ngoài repo: `/tmp/smoke04-final.log`, `/tmp/smoke04-verified.log`; ảnh tại `/workspace/.browser-tools/demo04-verified` và các thư mục story04-shots/ui03-shots lân cận.
- Review QA riêng cho code và test: không có lỗi chặn.

## Giới hạn

Không suy ra FPS phần cứng thật từ SwiftShader. Input hiện chỉ giữ một lần bấm mỗi action trong một frame; nhiều lần bấm trong một khung hình rất dài vẫn có thể bị gộp. Unreal chưa build. Chưa Publish game hay gộp main. Lượt xác nhận cuối: **86/86 đạt**, runner exit 0, PBR/asset thật bật; cạy giải thoát ngay lần đầu (3 hit), không lỗi console/page và không request ngoài dist.
