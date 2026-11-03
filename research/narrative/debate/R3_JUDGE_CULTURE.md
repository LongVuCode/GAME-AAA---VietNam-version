# R3 — Giám khảo 1: Sử học & Văn hóa

`historian-verifier` (AI), độc lập, 2026-11-03. Kết luận tối đa mức B. Lint: `0 error(s), 7 warning(s)`, không đổi so với REVIEW §5 (T002, T009, M016 vẫn WARN).

## 0. Kiểm tra đồng thuận quá dễ (groupthink)

1. **Hai bên đổi chéo cách sửa F-01 rồi gọi đó là đồng thuận.** R2_B nhận "dòng họ thợ đúc, mỗi chương một người", còn R2_D nhận "một nhân vật, thế giới không theo niên đại" và rút bản dòng họ. Bất đồng vẫn còn, H chưa chốt điểm này.
2. **Tiền đề "MYTH an toàn hơn" chưa ai kiểm.** 3/4 chương của H chạm mục `high` (M005, M006, cùng M001 vì Lạc Long Quân hành động ở chương 1–2), trong đó có hai vị Tứ bất tử. Rủi ro tín ngưỡng không được cắt bỏ, chỉ dồn vào Game 1.
3. **Cổng "chỉ khi có cố vấn" là cổng giả.** CLAUDE.md §3 đòi mức A cho mọi mục `in_game`, nên chính Game 1 cũng bị chặn bởi việc tuyển cố vấn.
4. **Đồng thuận mới nằm trên giấy.** Trong `research/data` và `tools` chưa có trường `worshipped`, `reality_mode` hay `earliest_text_century`. Trường `gameplay` vẫn trái QT-17: M005 ghi "Tre đằng ngà (vũ khí tối thượng)", M001 ghi "thần lực Rồng/Tiên", M007 ghi "gậy, nón thần", M015 ghi "vật phẩm Móng rồng".

## 1. Chấm điểm (1–5)

| Ứng viên | Chính xác / kiểm soát | An toàn tín ngưỡng – dân tộc | Codex minh bạch | Tổng |
|---|---|---|---|---|
| **H** (như hiện mô tả) | 3: nếu theo bản "phi niên đại" thì mâu thuẫn mốc Hùng Vương thứ 6 và 18 ghi ngay trong M005, M006 | 3: hai vị Tứ bất tử và Lạc Long Quân; không hứa công khai nên tránh được V1 lan sang | 4: một chế độ, ba nhãn | **10** (11 nếu sửa §3.1) |
| B thuần | 3: phi niên đại (như trên); dòng sử mở bằng Bạch Đằng 938 cần nhiều mục A | 3: cùng nội dung; thêm Nam Hán (V1) | 4: lint đơn giản, nhưng thiếu `worshipped` | **10** |
| D thuần (đã sửa R1) | 4: dòng họ giải được F-01 | 3: hứa công khai Quyển lịch sử nên Game 1 vạ lây (V1) | 4: `reality_mode` rõ, nhưng thừa khi chỉ có MYTH | **11** |
| A-gọn | 2: T009 chỉ một dòng nguồn; đổi chế độ thực tại giữa game | 2: Chử Đồng Tử (Tứ bất tử), quân Lương (QT-08), "đốt tre cháy" (F-05) | 3: nhãn chuyển dần là ý hay nhưng khó đọc | **7** |

## 2. Rủi ro còn sót trong H và cách sửa

| ID | Mức | Vấn đề | Đề xuất |
|---|---|---|---|
| J-01 | Nghiêm trọng | **Chương 3, "giặc Ân":** "Ân" là tên triều đại cổ Trung Hoa. Làm thành yêu ma rồi thì cái tên vẫn gợi quốc gia (QT-08). Người chơi hạ tướng giặc dễ bị hiểu là chia công với Gióng | UI chỉ ghi "giặc" hoặc một tên [SÁNG TẠO] trung tính. "Giặc Ân" chỉ xuất hiện trong Codex, trích LNCQ, nhãn [HUYỀN THOẠI], kèm câu "không trình bày như sự kiện sử". Mỹ thuật không dùng mô-típ đồ đồng Thương, chữ Hán hay giáp trụ Trung Hoa. Boss là trận [SÁNG TẠO] ở tuyến phụ; đạo quân chính chỉ do Gióng phá, trong cutscene |
| J-02 | Nghiêm trọng | **Hội Gióng là lễ hội sống (UNESCO 2010)**; đền Phù Đổng và đền Sóc là nơi thờ có thật | Combat chỉ diễn ra ở làng [SÁNG TẠO] (QT-09). Không mô phỏng nghi lễ hội. Đưa ban quản lý di tích Phù Đổng và Sóc Sơn vào danh sách QT-16. Gióng không có thoại tự do, không có cận cảnh hài; roi, ngựa và tre không vào tay người chơi. Sửa `M005.gameplay` |
| J-03 | Nghiêm trọng | **Chương 4: Thủy Tinh bị biến thành ác nhân bằng hàm ý.** Người chơi đánh thủy quái ngay trong trận lũ Thủy Tinh dâng thì kiểu gì cũng đọc thành "quân Thủy Tinh", dù không ghi tên. Việc Thủy Tinh có được thờ hay không: chưa xác minh (F-18) | Kẻ thù ở chương 4 **không được là sinh vật nước**. Mục tiêu là cứu người, dẫn dân lên cao, giữ bờ; nguy hiểm đến từ môi trường. Thủy Tinh không có tạo hình quỷ, nhạc và ánh sáng không mã hóa "ác", NPC không gọi ông là "yêu" hay "giặc". Kết chương nhấn vào chu kỳ lũ hằng năm. Đặt `worshipped=true` cho Thủy Tinh tới khi xác minh xong |
| J-04 | Nghiêm trọng | **Tản Viên và Mị Nương:** Tản Viên thuộc Tứ bất tử. Việc Mị Nương có được thờ hay không: cần đối chiếu | Không ai điều khiển hay tấn công hai nhân vật này. Cảnh dời núi để trong cutscene. Thêm khu di tích Ba Vì vào QT-16 |
| J-05 | Nghiêm trọng | **Lạc Long Quân, Âu Cơ và Hùng Vương gắn Tín ngưỡng thờ cúng Hùng Vương (UNESCO 2012, M001).** H cho Lạc Long Quân hành động ở chương 1–2, cho Hùng Vương thứ 6 và 18 xuất hiện ở chương 3–4 | Lạc Long Quân hiện qua rồng, nước và dáng uy nghi, không thoại tự do, không làm thành "anh hùng hành động". Âu Cơ chỉ ở Codex. Hùng Vương không lộ mặt, truyền lệnh qua sứ giả. Bỏ "thần lực Rồng/Tiên" khỏi `M001.gameplay`. Tham vấn Khu di tích Đền Hùng |
| J-06 | Nhẹ | **Trống truyền đời.** Trống đồng là hiện vật Đông Sơn (T002, mốc còn tranh luận, lint WARN), lại được đặt vào thời Lạc Long Quân | Codex tách rõ hai câu: "trống trong game là [SÁNG TẠO]" và "theo khảo cổ...". Không ngụ ý Văn Lang = Đông Sơn đã được chứng minh. Không mô phỏng một trống thật có tên (Ngọc Lũ). Họa tiết khắc thêm ghi [SÁNG TẠO]. Không gắn thần Đồng Cổ (M013) |
| J-07 | Nhẹ | **Cổng Dạ Trạch:** M015 có Chử Đồng Tử cưỡi rồng nhưng ghi `sensitivity: low`, lệch với M007 (`high`) | Nâng M015 lên `high`. Thêm vào cổng: xác minh việc thờ Triệu Quang Phục, và M015 đạt mức A |

## 3. Phán quyết: **chọn H, có điều kiện** (KHÔNG ĐẠT cho tới khi xong điều kiện 1–3)

1. **Chốt F-01 bằng dòng họ:** mỗi chương một người, nối bằng trống [SÁNG TẠO]. Bỏ "phi niên đại", vì truyện gốc tự ghi đời Hùng Vương.
2. **Cố vấn sử học và tham vấn QT-16** (Đền Hùng, Phù Đổng/Sóc, Ba Vì) là **điều kiện của Game 1**, phải xong trước khi lên trang Steam hoặc trailer. Đây không chỉ là cổng cho phần lịch sử.
3. **Dữ liệu phải đi trước thiết kế chương:** thêm `worshipped` (mặc định `true`) cùng luật lint; sửa trường `gameplay` của M001, M005, M007, M015 theo QT-17; sửa sensitivity của M015.
4. Áp dụng J-01 và J-03 cho chương 3 và 4. Nếu tham vấn phản đối chương 4, cắt xuống phạm vi tối thiểu 1–2–3.
5. Thêm một tiêu chí bác bỏ cho H: tham vấn hoặc playtest cho thấy chương Gióng hoặc Ba Vì bị cộng đồng thờ phụng coi là xúc phạm. Khi đó, tiền đề "MYTH an toàn hơn" sai.
