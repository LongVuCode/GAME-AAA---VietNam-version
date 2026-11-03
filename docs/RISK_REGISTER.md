# Risk Register

| ID | Rủi ro | Khả năng | Tác động | Giảm thiểu | Chủ |
|---|---|---|---|---|---|
| R-01 | Sai sử liệu gây phản ứng khi phát hành | TB | Rất cao | Nhãn + lint + mức A bắt buộc + cố vấn người thật + Codex minh bạch | Narrative |
| R-02 | Xúc phạm tín ngưỡng (Tứ bất tử, thờ Mẫu, Đức Thánh Trần, Hùng Vương) | TB | Rất cao | Quy tắc "không điều khiển, không đánh bại, không biếm họa"; cố vấn tín ngưỡng | Narrative |
| R-03 | Bị xem là kỳ thị dân tộc hoặc quốc gia láng giềng | TB | Cao | Địch là quân đội hoặc yêu ma [SÁNG TẠO], không phải biếm họa sắc tộc; loại các xung đột Chăm/Khmer; review văn hóa | Director |
| R-04 | Phạm vi AAA vượt nguồn lực | Rất cao | Rất cao | Làm vertical slice trước; cắt chương; dùng asset có license | Director |
| R-05 | AI không build hoặc benchmark được UE trong môi trường hiện tại | Chắc chắn | Cao | Máy Windows của dự án + CI self-hosted; logic tách thành ArpgCore để test được | Tech |
| R-06 | Plugin upscaler chưa hỗ trợ phiên bản UE mới nhất | TB | TB | Ma trận tương thích trước khi pin; có thể lùi về 5.6 | Tech |
| R-07 | Stutter do PSO/shader | Cao | Cao | PSO precache + bundled cache + harness đo hitch | Tech |
| R-08 | Trùng nhãn hiệu tên game | TB | TB | Tra cứu nhãn hiệu ở GĐ1, có 2 tên dự phòng | Legal |
| R-09 | Thiếu bản dịch chuẩn của nguồn để đối chiếu số trang | TB | Cao | Mua hoặc mượn bản in; cộng tác với thư viện hoặc viện | Narrative |
| R-10 | Asset không rõ license, hoặc asset AI bị phát hành nhầm | Thấp | Cao | License register + tag PLACEHOLDER_AI + kiểm tra trước release | Production |
| R-11 | Dòng thời gian Giai đoạn 0 chưa đối chiếu trang (mức B/C) | Chắc chắn | TB | Chưa đưa vào game; nâng lên mức A ở GĐ1/GĐ4 | Narrative |
