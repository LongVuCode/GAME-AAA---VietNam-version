# Báo cáo Demo 0.3
Ngày: 2026-11-06 · Nhánh `feat/demo-0.3` → `main` · Chơi thử: https://claude.ai/artifact/4PetpFm4jRtHe1UQL86ke5 (build `60e54d4`)

## Yêu cầu của PO → kết quả
| # | Yêu cầu | Đã làm |
|---|---|---|
| 1 | Thay nút né | Né chuyển sang **C**; tay cầm B/○. Có các preset Souls-Shift, V, nút chuột cạnh (chưa có ô chọn preset trong màn Đổi phím) |
| 2 | Nhảy (Space) + hiệu ứng | Nhảy có coyote time, đệm nhấn, thả sớm thì thấp hơn, khựng khi tiếp đất, bụi/nước. Có đòn nhẹ trên không và đòn bổ xuống tạo sóng xung kích; dùng để nhảy qua Sóng bùn của boss |
| 3 | Hành trang (B) | 6 thẻ: Trang bị, Túi đồ, Kỹ năng, Bản đồ, Sổ tay, Codex. 9 ô; nhân vật 3D xoay được; so sánh ▲/▼; 5 màu độ hiếm; bộ "Đồ đò bến Lau" có thưởng bộ; nâng +1..+3 ở lò đúc; 2 Thế võ mỗi vũ khí, 3 bậc, nâng bằng Kinh nghiệm |
| 4 | Bản đồ (M) + minimap tròn góc trên-trái | Bản đồ vẽ trên vải gai, có sương che vùng chưa đi, 17 loại biểu tượng, 8 dấu tự đặt, tiến độ từng vùng, đi nhanh giữa các bếp lửa. Minimap tròn xoay theo camera hoặc theo hướng bắc. Thêm 10 điểm khám phá (rương, điểm nhìn, bí mật) |
| 5 | HUD đẹp, phát sáng | Biểu tượng vũ khí tròn; máu xanh lá → vàng ≤ 50% → đỏ ≤ 10%, phát sáng, có thanh hụt, có icon nhịp tim khi nguy; **mặt trống đồng** chứa chất lỏng dâng theo 4 nấc, đầy thì đỏ-cam rực; ô kỹ năng có vòng hồi chiêu; thanh boss mới (D-024) |
| 6 | Boss dễ, gameplay thiếu điểm nhấn | Boss: 5 đòn mới, 4 chuỗi đòn, phạt khi ăn gần hoặc lăn liên tục, pha 2 nước rút lộ 3 cọc (dụ boss càn vào), "Ghì nanh", 4 mức độ khó. Người chơi: hủy đòn bằng né, Phản nhịp, Hồi trống điện ảnh, trượt khi né lúc chạy nhanh |

## Bằng chứng (người điều phối đã chạy lại)
- Unit test **122/122**; smoke Playwright **68/68** (nhảy, né C, tay cầm, chuỗi đòn boss, Sóng bùn, 3 cọc, cạy giải thoát, hành trang, bản đồ, minimap, HUD).
- `design_validate`: 0 lỗi; test Python 67/67; ArpgCore CTest 19/19.
- **Boss khó hơn, đo bằng bot** (20 seed, cùng một bot đỡ nhịp giỏi, không biết nhảy):

| Chỉ số | Boss 0.2 | Boss 0.3 |
|---|---|---|
| Sát thương nhận/phút (Chèo đò) | 148 | 232 (+57%) |
| Số lần nắm cơm lá đã ăn | 0,55 | 2,0 |
| Tỉ lệ thắng (Ngược nước) | 100% | 50% |

  Bot biết nhảy qua Sóng bùn và dùng Phản nhịp thì thắng 90% ở Ngược nước, tức là kỹ năng mới có tác dụng. Đây là số đo bằng bot, không phải người chơi thật.

## Giới hạn trung thực
- Vẫn là graybox: animation thủ tục, chưa có đồ họa đích.
- Chưa có số FPS thật; chưa thử tay cầm thật.
- **Không có lượt QA agent riêng**: chỉ người điều phối chạy lại test và smoke, và xem ảnh.
- Chưa làm: ô chọn preset bàn phím; lưu tiến trình vào `localStorage`; câu nói của Cói khi Ghì nanh (thiếu chuỗi); tăng sức cho đòn chạy đà.
- Vài hằng số còn tạm, chưa có trong dữ liệu (tốc độ càn tối đa, thời gian hồi chuỗi), đã ghi trong README.
- **Motif sao trên mặt trống ở HUD chưa qua phản biện văn hóa** (D-024).
- Bản Unreal vẫn chờ log build từ máy PO; các tính năng 0.2 và 0.3 mới chỉ có ở prototype web.
