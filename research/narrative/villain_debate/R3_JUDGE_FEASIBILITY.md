# R3 — Giám khảo Producer & TD: phản diện Game 1

AI, 2026-11-03. Chưa có spike nào; mọi mức chi phí là **giả định thô**.

## 1. Điểm (1–5, 5 = tốt cho sản xuất)

Bảng chỉ chấm **phần chênh**; boss tự thắng mỗi chương và map hub mới (R3-07) là chi phí chung.

| Tiêu chí | K1+ | K1-nhẹ | K4 gọn | K2 cuối | K0 |
|---|---|---|---|---|---|
| Chi phí | 3: thêm Trận bến | 4: mesh khoen, đòn cạy | 2: dây, thuyền, dân kéo chão, trùm người | 2: trùm người, field boss người, địch người, trại | 5 |
| Rủi ro KT | 3: cạy nhiều rig, arena hub | 4: cạy nhiều rig, cả rết | 2: dây cáp, đám đông, AI đấu người | 2: AI boss người, địch người trong lũ | 4: đòn kết riêng từng boss |
| Chịu cắt về sàn 2 chương | 4: `finale_after` chỉ đổi người chơi | 5: chương ship cuối là kết | 3: trùm, đám đông vẫn phải làm | 3: trùm đời Bương làm đối thủ cuối | 5 |
| Tái sử dụng | 4 | 5: một cơ chế cho mọi boss | 4 | 4: skeleton người, trại mô-đun | 3: "nỗi hành" riêng |
| **Tổng /20** | **14** | **18** | **11** | **11** | **17** |

Nhận xét:
- **"Cạy" không nên là hệ paired-animation mới.** Nên làm nó thành chính đòn kết khi Thế đầy (GDD §3): một animation người chơi, một phản ứng gục cho mỗi rig, motion warping tới socket khoen.
- **Cáo, Gấu, Lợn Lòi và "thú đầu tiên" phải chung một họ skeleton bốn chân.** Gấu Đầm của K1 hiện là rig mới.
- **Khoen hay gông** đều là static mesh gắn socket, VRAM không đáng kể. Gông tre to hơn nên dễ xuyên cổ khi thú cử động.
- **Đánh người** (K2, K4) cần AI boss riêng, telegraph riêng và lồng tiếng phản diện.

## 2. Spike làm trước, theo thứ tự

1. **Cạy trên 2 rig** (Cáo Đầu Bầy và Rết Lớn, hoặc thú cưỡi của Giáp Xương), làm trong GĐ2 cùng hệ đòn kết. Go khi:
   - không xuyên mesh nhìn thấy được ở 3 góc camera cố định;
   - khoen bám socket suốt toàn bộ bộ chiêu của boss;
   - giờ công thật mỗi rig ≤ 1,5 × giờ công một đòn hành quyết thường (hệ số là giả định).

   Trượt ở rết thì dùng Lợn Lòi; trượt cả hai thì về K0.
2. **Họ skeleton bốn chân:** Cáo và Lợn Lòi dùng chung skeleton, chạy được bộ locomotion chung, có video làm bằng chứng.
3. **Trận bến (chỉ cho K1+):** chỉ graybox sau khi có giờ công chương 1 (C5) và map hub graybox. Ràng buộc: dùng lại rig bốn chân; không đám đông, không ván phá được, không thuyền vật lý. Ngân sách ≤ 0,3 chỉ số chương (giả định). Vượt thì dừng ở K1-nhẹ.
4. **Đấu người** (K2/K4): không xếp lịch; nếu PO vẫn chọn thì cần game feel ≥ 4/5 và cố vấn đồng ý.

## 3. Phán quyết

**Chọn K1-nhẹ làm mặc định, K1+ là nâng cấp có cổng.** K1-nhẹ là tập con của K1+; rút về K0 chỉ cần tắt dữ liệu mảnh.

Điều kiện bắt buộc:
1. Spike 1 đạt trước khi làm boss chương 3.
2. Khoen là dữ liệu (`binding_item` cho mỗi boss), có test: tắt khoen thì mọi boss vẫn hạ được và không có softlock.
3. Game 1 không có boss người. Loại K2 và K4 khỏi phạm vi sản xuất.
4. **PO phải sửa VERDICT §3** (phản diện xuyên suốt bị hạ ở chương cuối) nếu chỉ ship K1-nhẹ; ghi vào DECISION_LOG. K1+ đáp ứng VERDICT chỉ khi cổng spike 3 đạt.
5. Cố vấn C2 xác nhận khoen không bôi xấu nghề đúc; trượt thì về K0.
