# R3 — Giám khảo 3: Producer & TD (khả thi)

Giám khảo độc lập (AI), 2026-11-03. Chưa có số đo nào trên RTX 5050; mọi nhận định kỹ thuật là rủi ro cần spike.

## 1. Điểm (1–5; Rủi ro KT: 5 = thấp)

| Tiêu chí | H | B thuần | D thuần | A-gọn |
|---|---|---|---|---|
| Khả thi solo | 3: 4 chương × mật độ GDD §2 là quá tải | 2: thêm dòng sử, thương hiệu 2 | 3: như H, thêm rig nếu mỗi chương một người | 4: 3 chương, 2 sinh cảnh |
| Tái sử dụng | 4: biển lạc loài | 3 | 4 | 5: đầm dùng 2 lần |
| Rủi ro KT | 2: tối thiểu 1–2–3 **chứa biển** | 2: biển, Bạch Đằng thủy chiến | 2 | 4: chỉ nước dâng |
| Đường lùi | 4: chương 4 → DLC | 3 | 3: hứa "Quyển" công khai | 2: chương 3 chờ cố vấn **chưa tuyển** |
| **Tổng /20** | **13** | **10** | **12** | **15** |

A-gọn rẻ nhất về kỹ thuật, nhưng cổng của nó nằm ngoài tầm kiểm soát của dev. Lỗi của H là **thứ tự phạm vi**, không phải cấu trúc. Nếu sắp lại như §2, H đạt **16**.

## 2. Phạm vi và thứ tự sản xuất

Chỉ số chi phí nội dung lấy chương 1 = 1,0. Đây là **giả định thô**, chưa ước lượng công:

| Chương | Chỉ số | Mới | Dùng lại |
|---|---|---|---|
| 1 Hồ Tinh | 1,0 | đầm, hang, nước dâng, boss cáo tứ túc | — |
| 3 Gióng | ~0,6–0,8 | rừng tre; quân hậu cảnh | nhà sàn, quái người, AI |
| 4 Ba Vì | ~0,8–1,0 | đồi núi | **hệ nước dâng chương 1** |
| 2 Biển | ~1,2–1,5 | đại dương, thuyền nổi, combat trên nền di động, quái khổng lồ | ít |

**Thứ tự đề xuất: 1 → 3 → 4 → 2.**
- **Tối thiểu 1–3–4.** Sàn cứng khi trễ: 1–3.
- Biển làm sau cùng hoặc thành DLC. Nếu giữ, làm lại thành ven bờ, thuyền neo cố định; Lạc Long Quân diệt Ngư Tinh trong cutscene.
- Chương 2+ dùng lại họ quái, mỗi chương 1 mini-boss.

**Giữ slice Hồ Tinh:** rủi ro của nó cũng là rủi ro Ba Vì cần giải.
1. **Mặt nước dâng:** Water Body có đổi cao độ lúc chạy được không thì cần kiểm tra trên bản đã pin. Phương án rẻ: mặt Single Layer Water và volume dưới nước, cùng di chuyển theo Timeline.
2. **"Đánh trên mặt nước" (GDD §3)** dễ kéo theo combat bơi. Ràng buộc: nước tối đa ngang mức lội, bãi đấu có bệ đá, vùng sâu gây sát thương.
3. **Navmesh** dùng các trạng thái bake sẵn, không rebuild lúc chạy.
4. **Lumen phần mềm trong hang:** rò sáng qua vách mỏng, nhiễu khi tối, phản chiếu đổi theo nước động.
5. **Đầm:** cỏ lau masked gây overdraw; sương volumetric và texture Megascans tốn VRAM; Editor và PIE cùng chia 8 GB.
6. **"Lũ phá hang":** dùng Sequencer và thay mesh, không phá hủy Chaos lúc chạy.
7. **Cáo tứ túc** không retarget được từ người: cần animation có license hoặc thuê ngoài. Giới hạn số bản sao ảo ảnh.
8. AI không build được UE: spike nhỏ, làm sớm.

## 3. Phán quyết

**Chọn H, kèm điều kiện:**
- Tối thiểu 1–3–4.
- Biển làm sau cùng hoặc thành DLC.
- Game 1 không có combat bơi.

Cổng go/no-go, đo trên RTX 5050 và lưu CSV kèm commit hash (TECH_SPEC §5):
1. **Spike nước dâng, trước GĐ4.** Graybox hang có 3 mức nước, boss cùng 4 địch, preset Cao 1080p.
   - Đạt khi: VRAM đỉnh ≤ 7 GB, không có hitch > 50 ms, FPS đạt chỉ tiêu §4.
   - Nếu trượt: pha 3 để nước ở mức lội cố định, nước dâng chỉ diễn ra trong cutscene.
2. **Đo công thật chương 1 (GĐ4).** Chỉ mở chương mới khi quỹ thời gian còn lại ≥ chỉ số §2 × công chương 1 × 1,5. Hệ số 1,5 là giả định.
3. **Tái sử dụng chương 3.** Kiểm tra tham chiếu asset phải cho thấy phần lớn skeleton quái và vật liệu lấy từ chương 1, theo ngưỡng PO đặt trước.
4. **Biển** chỉ vào sản xuất khi spike thuyền cùng lock-on trên nền di động đạt cổng 1 và đạt game feel ≥ 4/5 (PLAN GĐ2).
5. **Editor** chạy slice map và PIE 30 phút trên 8 GB không crash vì hết VRAM.
