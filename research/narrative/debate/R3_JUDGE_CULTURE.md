# R3 — Giám khảo 1: Sử học & Văn hóa

`historian-verifier` (AI), 2026-11-03, tối đa mức B. Lint: 0 lỗi, 7 WARN.

## 0. Đồng thuận quá dễ?

1. **F-01 chưa giải.** R2_B nhận "dòng họ", R2_D nhận "một nhân vật, phi niên đại": hai bên đổi chéo, chưa chốt.
2. **"MYTH an toàn hơn" chưa ai kiểm.** 3/4 chương H chạm mục `high` (M005, M006, M001 qua Lạc Long Quân), có hai vị Tứ bất tử.
3. **Cổng "có cố vấn" là giả:** CLAUDE.md §3 đòi mức A cho mọi mục `in_game`, nên Game 1 cũng bị chặn.
4. **Chỉ trên giấy:** `research/data` chưa có `worshipped`, `reality_mode`, `earliest_text_century`. Trường `gameplay` của M001 (thần lực Rồng/Tiên), M005 (Tre đằng ngà "vũ khí tối thượng"), M007, M015 vẫn trái QT-17.

## 1. Điểm (1–5)

| Ứng viên | Chính xác | An toàn tín ngưỡng | Codex | Tổng |
|---|---|---|---|---|
| **H** | 3: bản "phi niên đại" trái mốc Hùng Vương thứ 6/18 ghi trong M005, M006 | 3: hai Tứ bất tử; không hứa công khai | 4: một chế độ | **10** (11 nếu sửa đ.k. 1) |
| B thuần | 3: phi niên đại; Bạch Đằng cần nhiều mục A | 3: thêm Nam Hán (V1) | 4: thiếu `worshipped` | **10** |
| D thuần (sửa) | 4: dòng họ giải F-01 | 3: hứa Quyển sử, Game 1 vạ lây | 4 | **11** |
| A-gọn | 2: T009 một dòng nguồn | 2: Chử Đồng Tử, quân Lương, "đốt tre cháy" | 3: đổi chế độ khó đọc | **7** |

## 2. Rủi ro còn sót trong H

| ID | Mức | Vấn đề | Sửa |
|---|---|---|---|
| J-01 | Nghiêm trọng | **"Giặc Ân":** Ân là tên triều đại cổ Trung Hoa; tên vẫn gợi quốc gia dù là yêu ma (QT-08). | UI chỉ ghi "giặc" hoặc tên [SÁNG TẠO] trung tính. "Giặc Ân" chỉ ở Codex, trích LNCQ, [HUYỀN THOẠI]. Tránh mô-típ Thương, chữ Hán. Boss ở tuyến phụ; đạo quân chính do Gióng phá trong cutscene |
| J-02 | Nghiêm trọng | Hội Gióng là lễ hội sống (UNESCO 2010); đền Phù Đổng và đền Sóc có thật | Chỉ combat ở làng [SÁNG TẠO] (QT-09); không mô phỏng nghi lễ. Gióng không thoại tự do. Đưa hai di tích vào QT-16 |
| J-03 | Nghiêm trọng | **Thủy Tinh thành ác nhân bằng hàm ý:** đánh thủy quái trong lũ ông dâng = "quân Thủy Tinh". Việc ông được thờ: chưa xác minh (F-18) | Kẻ thù chương 4 **không phải sinh vật nước**. Mục tiêu là cứu người, dẫn dân lên cao; nguy hiểm từ môi trường. Không tạo hình quỷ, NPC không gọi "yêu/giặc". Đặt `worshipped=true` |
| J-04 | Nghiêm trọng | Tản Viên (Tứ bất tử); Mị Nương có được thờ: cần đối chiếu | Dời núi chỉ trong cutscene. Thêm di tích Ba Vì vào QT-16 |
| J-05 | Nghiêm trọng | Lạc Long Quân, Âu Cơ, Hùng Vương gắn tín ngưỡng Hùng Vương (UNESCO 2012, M001) | Lạc Long Quân hiện qua rồng, nước, dáng uy nghi; không thoại tự do. Âu Cơ chỉ ở Codex. Hùng Vương không lộ mặt, truyền lệnh qua sứ giả. Tham vấn Đền Hùng |
| J-06 | Nhẹ | Trống đồng là hiện vật Đông Sơn (T002, mốc còn tranh luận) lại đặt vào thời Lạc Long Quân | Codex tách "trống [SÁNG TẠO]" khỏi "theo khảo cổ". Không ngụ ý Văn Lang = Đông Sơn.. Không gắn M013 |
| J-07 | Nhẹ | M015 có Chử Đồng Tử nhưng ghi `low`, còn M007 ghi `high` | Nâng M015 lên `high`. Cổng Dạ Trạch thêm: xác minh việc thờ Triệu Quang Phục |

## 3. Phán quyết: **H, có điều kiện**

KHÔNG ĐẠT cho tới khi xong điều kiện 1–3.

1. **Chốt F-01 bằng dòng họ:** mỗi chương một người, nối bằng trống [SÁNG TẠO]. Bỏ "phi niên đại".
2. **Cố vấn và tham vấn QT-16** (Đền Hùng, Phù Đổng/Sóc, Ba Vì) là điều kiện **của Game 1**, phải xong trước trang Steam và trailer.
3. **Dữ liệu trước thiết kế:** thêm `worshipped` (mặc định `true`) và lint; sửa `gameplay` của M001, M005, M007, M015; nâng M015.
4. Áp J-01 và J-03. Nếu tham vấn phản đối chương 4, giữ phạm vi 1–2–3.
5. Tiêu chí bác bỏ: tham vấn coi chương Gióng hoặc Ba Vì là xúc phạm.
