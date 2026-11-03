# Phản biện khả thi — LINEAGE_DESIGN_V1

Giám khảo khả thi (AI), 2026-11-03. Mọi mức chi phí là **giả định thô**.

## 1. Chi phí tương đối

| Hạng mục | A | B lai | C |
|---|---|---|---|
| Nhân vật điều khiển | 3 | 3 | 4 cộng Cói |
| Bộ chiêu mới | theo vũ khí | sào, rìu, dao đôi | 3–4 |
| Hệ riêng | trống khắc | mask xăm, Thế tổ | cảnh khung, logic hai thời |
| Mức | thấp–vừa | **vừa** | vừa–cao |

- **Rig, hai giới tính:** một skeleton dùng chung được, với điều kiện tỉ lệ thân hai mesh gần nhau; lệch nhiều thì animation xuyên mesh. Chi phí thật nằm ở **bộ chiêu theo họ vũ khí**, không ở số người. Dao găm đôi là họ mới, đắt nhất.
- **Lồng tiếng:** 3 người × vi/en, cộng tiếng gồng nam và nữ. TTS không được phát hành. Chi phí tính theo số câu, không theo số người.
- **Hình xăm cộng dồn:**
  - Làm bằng **lớp material, mask theo UV**. Không dùng decal, vì decal trượt trên skeletal mesh.
  - Mỗi kênh RGBA chứa một hình. VRAM thêm vào nhỏ so với môi trường nhưng **cần đo**.
  - Hai mesh phải chung bố cục UV vùng xăm, không thì phải vẽ mỗi hình hai lần. Giáp không được che vùng xăm.
- **Hồi kết:** dùng lại map thì rẻ, chỉ thêm Data Layer "sau lũ". Phần đắt là **boss Thuồng luồng chúa**: rig thân rắn khó cả về animation lẫn va chạm. Ngoài ra, Thế tổ buộc cả 3 bộ chiêu phải chạy được trên mesh Lau.
- **"Rết chúa núi"** (chương 4): rig nhiều chân, đắt.

## 2. Biển ở vị trí 2

Thứ tự này **không phá phạm vi tối thiểu 1–3–4**, vì Sào giữ cả chương 1 lẫn 2. Cần các điều kiện sau:
1. Chương 1 phải khép trọn. Gợi ý "ra biển" chỉ là tùy chọn.
2. Chương 3, 4 và Hồi kết không phụ thuộc chương 2. Câu vè, hình xăm và Rương họ đọc cờ `ch2_done`; số hình xăm bắt buộc không tính hình của chương 2.
3. Nếu chương 2 thành DLC, nó là **ký ức của Sào**, chọn từ menu và đồng bộ cấp, để Gia nghiệp đã đầy không phá cân bằng.
4. **Hồi kết thuộc phạm vi tối thiểu**. Thứ tự sản xuất: 1 → 3 → (4 + Hồi kết) → 2.

Rủi ro: sàn "1–3" mất Lau và Hồi kết. Khi trễ, rút chương 4 thành đoạn tuyến tính, không cắt.

## 3. Cắt giảm

1. **Bộ chiêu:** sào của Sào dùng lại bộ giáo đồng của slice; rìu của Đá cũng đã có trong slice. Chỉ dao đôi là mới, làm ở chương 4. Nếu trễ, Lau dùng giáo.
2. **Thế tổ:** đổi theo kịch bản ở mốc chuyển pha, không cho đổi tự do.
3. **Thuồng luồng chúa:** dùng lại rig Thuồng luồng đầu đàn, phóng to, thêm chiêu.
4. **Rết chúa núi:** đổi sang một họ rig đã có.
5. **Lồng tiếng:** người chơi ít thoại; câu vè do **một** NPC hát; tiếng gồng dùng chung một kho.
6. **Mask xăm:** tối đa 4 hình trong một texture (giả định). Hiệu ứng "sáng lên" chỉ là tham số emissive.
7. **Trống báo bến:** chỉ đổi texture vành và thêm mục Codex.

## 4. Lựa chọn: **B lai, rút gọn theo §3**

- Chi phí của B ngang A và rẻ hơn C.
- An toàn văn hóa của B hơn A.
- Thứ tự 1 → 3 → 4 cho làm lần lượt từng người, mỗi người thêm tối đa một họ vũ khí mới.

**Cổng trước khi làm Đá:**
- Mask xăm chạy được trên cả 2 mesh.
- Animation dùng chung không xuyên thân ở các chiêu chính.
- VRAM thêm vào được đo bằng harness (TECH_SPEC §5).
