# Thiết kế nhân vật chính — V3: người bến Lau

`narrative-researcher` (AI), 2026-11-03. **ĐỀ XUẤT**, chờ `historian-verifier` và PO. Tối đa mức B. Sửa theo `REVIEW_V2.md`.

**Mã:** P-n = CRITIQUE_PLAYER §3.n; F-x.y = CRITIQUE_FEASIBILITY §x.y; C-Q/C-R = CRITIQUE_CULTURE §1/§2; SSR = STORY_STRUCTURE_REVIEW. Truyền thuyết ghi [HUYỀN THOẠI] tại chỗ; thiết kế là [SÁNG TẠO].

## 0. Tóm tắt
- Phản diện mới: **Rễ Cuồng** [SÁNG TẠO], cây yêu sống lâu, gốc ý từ Mộc Tinh (M004 [HUYỀN THOẠI]). Nó **không phải loài nước**.
- **Chương Ba Vì không có thủy quái dưới mọi hình thức** (R2-01).
- Hub bến Lau đặt ở một khúc sông [SÁNG TẠO], tách khỏi Đầm Xác Cáo/Hồ Tây.
- Ba đời, tên theo cây bờ nước: **Cói** (nữ), **Bương** (nam, thay "Đá"), **Nứa** (nữ).

## 1. Gốc rễ của R2-02/03/04/07 và lựa chọn
Gốc chung: **phản diện thuộc loài nước**, nên gợi Thủy Tinh (cạnh lũ Ba Vì), rùa–rắn của Trấn Vũ (Hồ Tây, cần đối chiếu) và thủy tộc của Lạc Long Quân.

| Tiêu chí | (a) Giữ thuồng luồng, tách khỏi chu kỳ nước, dời hub | (b) Rễ Cuồng |
|---|---|---|
| C3, R2-01 | Đạt, nhưng chương 4 vắng phản diện nên P-3 trượt | Đạt; có mặt được ở chương 4 |
| R2-02 Thủy Tinh | Còn chuỗi "quái nước → lũ → quái nước" | Hết |
| R2-04, R2-07 | Chương 1 vẫn ở Hồ Tây; phải tách bằng tạo hình | Hết |
| Văn bản | M028, mức B | M004, mức **C**: "diệt hay đuổi" chưa rõ (V-10) |
| Rủi ro mới | — | Tục thờ cây; Mẫu Thượng Ngàn (V-07) |
| Chi phí rig | Thân rắn, đắt | Lõi đứng yên cộng xúc tu rễ; quái "người rễ" dùng skeleton người |

**Chọn (b):** gỡ cùng lúc bốn lỗi, đáp ứng P-3 cả ở chương 4, rẻ hơn về rig. Cái giá: mất liên kết hình xăm–phản diện; văn bản mức C (dossier §8 đã đề xuất "Mộc Tinh con").

**Luật cho Rễ Cuồng:**
- Là **hạt rơi khỏi cây yêu trước khi** Lạc Long Quân trừ nó. Cách kể này đúng với cả dị bản "diệt" lẫn "đuổi", và không ngụ ý thần thất bại.
- Không nhắc hướng Mộc Tinh chạy tới (tránh gắn cư dân miền núi); không là cây thiêng (đa, đề, gạo, si); không ở rừng Tản Viên, không hình tượng "mẹ rừng".
- Động cơ duy nhất: đòi lại **lõi** bị chặt (R2-15). Không theo mùa (R2-02).
- Codex: "cây yêu sống lâu"; lời kể dùng "nhiều đời sau" (R2-22).

**Nhánh Vảy còn ý nghĩa gì (M028):**
- Là **nghề** của nhà: giữ người trên nước trước giao long hoang.
- Là nhánh phụ khoảng 6 nút: thủy quái do dự, giảm sát thương từ thủy quái, đi qua vùng nước có quái.
- Dùng ở chương 3 (giao long sông), ở sự kiện "thuồng luồng quấy bến" tại hub (GDD §5), và ở NG+. Sự kiện thủy quái **tắt khi chương đang mở là Ba Vì**.

## 2. Phạm vi
| Cốt truyện | Thời điểm (truyền thống, theo nhiều bản kể) | Người | Sản xuất |
|---|---|---|---|
| 1. Đầm Xác Cáo / Hồ Tinh | Thời Lạc Long Quân | Cói | 1 |
| 2. Đông Hải / Ngư Tinh (tùy chọn) | Cùng đời | Cói | 5 |
| 3. Phù Đổng / Gióng | Hùng Vương thứ 6 | Bương | 2 |
| Trận bến | Không gắn mùa | Bương hoặc Nứa | 3 |
| 4. Ba Vì | Hùng Vương thứ 18 | Nứa | 4 |

- **VERDICT:** tối thiểu là Long Biên, Phù Đổng, Ba Vì; khi trễ nặng thì Long Biên và Phù Đổng.
- **ĐỀ XUẤT – cần PO duyệt:** "Trận bến" là encounter mô-đun, làm ngay sau chương 3, có cờ `finale_after = ch3 | ch4`.
  - **Sàn hai chương:** Bương hạ Rễ Cuồng.
  - **Đủ chương 4:** chương 3 chỉ để lại vết rìu; Nứa đánh trận này sau chương 4, có thêm một pha.
  - Ở mọi sàn, phản diện đều bị hạ ở chương cuối (R2-09).
- Tên chương 1 là "Đầm Xác Cáo". Codex: "Long Biên, Phong Châu là tên theo LNCQ, địa danh đời sau" (V-11).
- Bản `en` giữ tên "Đông Hải"; không có bản đồ hiện đại (V-05).

## 3. Từng chương
**Ch. 1 — Đầm Xác Cáo (Cói).**
- **Phản diện:** cảnh mở ở bến Lau. Rễ Cuồng còn non phá bến; Cói chặt được lõi nó, nó rút xuống đất. Lõi thành **"Cán Lõi"**, cán sào truyền đời. Đây là vật truyền đời, không phải Bảo khí.
- **Truyền thuyết:** Cói cứu người bị mê, phá ảo ảnh, dồn Hồ Tinh qua pha 1–2. Lạc Long Quân dâng nước diệt yêu [HUYỀN THOẠI M003]; người chơi chỉ có Ân phù. Dị bản Huyền Thiên chỉ ở Codex.
- **Boss tự thắng:** **Cáo Đầu Bầy**, dùng lại rig bốn chân. Chương này không có quái thân rắn hay rùa; giao long mang dáng cá sấu (dossier §7.3).

**Ch. 2 — Đông Hải (Cói, tùy chọn).**
- Không có phản diện (F-2.2).
- Lạc Long Quân ném sắt nung [HUYỀN THOẠI M002]; người chơi giữ thuyền, không chạm sắt.
- **Boss tự thắng:** **Đuối Đen**, dáng đuối dẹt, khác hẳn Ngư Tinh (R2-18). Không có dáng cá voi (tín ngưỡng Cá Ông, chưa tra nguồn).

**Ch. 3 — Phù Đổng (Bương).**
- **Truyền thuyết:** đò nhà chở dân tản cư. Một ngựa sắt lao qua ở cảnh xa có kịch bản, không va chạm [HUYỀN THOẠI M005]. "Giặc Ân" chỉ ở Codex.
- **Boss tự thắng:** **Giáp Xương**, yêu ma cầm đầu toán tiền đạo; giáp bằng đá, xương, lông, gỗ; cưỡi thú xương; không mô-típ Thương, không chữ Hán.
  - Đấu ở một bến đò làng [SÁNG TẠO], xa đền Phù Đổng và đền Sóc.
  - Giáp vỡ, yêu rã thành tro: **không chém đầu, không có nữ tướng** (R2-06).
  - Codex chia hai đoạn: "Theo truyền thuyết: giặc Ân (LNCQ)" và "Phần hư cấu: Giáp Xương".
- **Phản diện:** chặn đường tản cư trong rừng, tách biệt với giặc. Rìu của Bương để lại vết sâu.
- **Vảy mở:** làng nhờ nhà vẽ và giữ mẫu (tục vua dạy dân, M028); từ đây làng gọi là **nhà Vảy** (R2-16).

**Ch. 4 — Ba Vì (Nứa).**
- **Phản diện:** chỉ ở cảnh mở **tại bến Lau**. Rễ Cuồng mang vết rìu đến đòi Cán Lõi, Nứa đẩy lui. Nó không phải loài nước, nên không phạm C3.
- **Truyền thuyết:** đò nhà lên chở dân chân núi tránh lũ. Nứa dựng rào tre và đánh trống **chỉ để cứu người**; không mang kỹ thuật nào về dùng sau (R2-03). Sơn Tinh dời núi trong cutscene [HUYỀN THOẠI M006].
- **Boss tự thắng:** **Rết Lớn**, thú bị nước dồn. Nếu rig nhiều chân trượt cổng: **Lợn Lòi Lớn** dùng lại rig bốn chân (F-3.4).

**Trận bến (cao trào).** Biểu tượng là **nghề nhà, không phải người nhà**. Chỉ dùng đòn của nhân vật đang chơi: không gọi tên tổ tiên, không bóng hình, không hồi tưởng (R2-05).
1. Rễ xuyên ván bến; chặt rễ.
2. Dân kéo dây chão đò theo nhịp trống (nhánh Trống), giật bật bộ rễ.
3. Cắm Cán Lõi vào lõi.

Bà lái đò, một NPC còn sống, hát vè. Kết: mẫu Vảy được **vẽ mực** lên tay một đứa trẻ, không kim, không máu (R2-19).

## 4. Hệ thống kế thừa
- **Nghề nhà:** cây kỹ năng Võ / Trống / Vảy, giữ 100%.
- **Đổi vũ khí: tự do** giữa 2 ô (GDD §3). Hai ô chọn từ giá vũ khí ở bến: Cói có sào (dùng lại bộ giáo); Bương thêm rìu (bộ của slice); Nứa thêm dao đôi (bộ mới).
  - Lý do: P-1 cần tay nghề liên tục; F-3.2 chỉ phục vụ "Thế tổ", nay đã bỏ.
  - Nếu cổng 2 trượt: khóa thành vũ khí riêng cộng vũ khí của đời trước.
- **Thạp nhà:** đặt ở kho; xếp theo đời, không đánh số; chỉ hiện chữ Codex.
- **Bến Lau:** nhà, thuyền, trống lớn dần qua mỗi đời. **Bỏ miếu** (R2-24).
- **Trống:** gỗ bịt da. Nhánh Trống là nhịp chiến đấu, không có hiệu ứng nước.

**Chế tác Bảo khí:** ở lò đúc của làng. Công thức trong DataTable: {nguyên liệu boss + đồng + nguyên liệu vùng}. Đúc đồng rồi ghép vật liệu boss; **không rèn, không sắt** (V-19). Nâng cấp +1…+10.

| Bảo khí | Boss | Vật liệu | Công dụng |
|---|---|---|---|
| Dao Nanh | Cáo Đầu Bầy | Nanh, lưỡi đồng | Làm lộ ảo ảnh; tăng sát thương Thế |
| Mũi Đuối (tùy chọn) | Đuối Đen | Gai đuôi, khâu đồng | Gây tê |
| Vòng Xương | Giáp Xương | Mảnh xương, viền đồng | Tăng chịu Thế khi Đỡ nhịp |
| Giáp Vỏ Rết (lùi: Giáp Da Lợn) | Rết Lớn | Đốt vỏ, tấm đồng | Giảm choáng |

**DLC Đông Hải: "hồ sơ ký ức Cói"** (R2-10):
- Cấp và điểm **từng nhánh** đồng bộ về mốc cuối chương 1.
- Khóa nhánh Vảy và vũ khí đời sau.
- Bộ đồ cố định: sào, Dao Nanh, giáp chương 1.
- Mũi Đuối vào Thạp của save hiện tại, kèm cờ `ch2_done`.
- Bản gốc: chương 2 mở trước lần bàn giao đầu hoặc từ menu ký ức.

## 5. Luật mẫu xăm (R2-08)
- **Được dùng:** hoa văn hình học Đông Sơn (vòng tròn tiếp tuyến, chữ S, răng cưa), thuyền, thủy quái cách điệu. Nguồn: ARC_DS, T002 [SỬ LIỆU-TRANH LUẬN].
- **Cấm:**
  - hình Lạc Long Quân, rồng-thần, bất kỳ nhân vật được thờ nào;
  - mặt trời trung tâm, chim Lạc (J-06, M013);
  - irezumi, sak yant, tā moko;
  - mẫu (kể cả xăm mặt) của bất kỳ dân tộc cụ thể nào;
  - chữ viết.
- Codex: "không có bằng chứng khảo cổ trực tiếp về hình xăm" (G-10).

## 6. Cổng, tham vấn, tài liệu
**Cổng trước khi làm Bương:**
1. Mask xăm chạy trên hai mesh, chung UV.
2. Cả ba bộ chiêu chạy trên **cả hai** mesh, không xuyên thân (R2-13).
3. VRAM đo bằng harness, kèm CSV và commit hash.
4. Giờ công thật chương 1 (C5).
5. Playtest bàn giao.
6. Spike nước dâng (C4).
7. Spike boss rễ.

Spike thuyền (C5) làm trước chương 2. Lồng tiếng: 3 nhân vật × vi/en, 2 kho tiếng gồng, 1 giọng hát.

**Tham vấn C2:**
Đền Hùng, Đền Mẫu Âu Cơ Hiền Lương, Phù Đổng/Sóc, Ba Vì, Đền Và, **Đền Quán Thánh và Phủ Tây Hồ** (chương 1 vẫn ở Đầm Xác Cáo); cố vấn về thờ Mẫu Thượng Ngàn và tục thờ cây. C6: trailer bán Hồ Tinh, Rễ Cuồng, Giáp Xương.

**Cần cập nhật (R2-20):**
GDD §2 (Cõi Trống → bến Lau), §3 (bỏ Phù lực Thủy/Sơn), §4 (điểm kỹ năng từ việc giúp làng, không từ đền), §6 (Thần khí → Bảo khí), §8 (slice: Cói, bỏ lời thề Đồng Cổ); M004 `gameplay`.

## 7. Tên game (chưa chốt; chưa tra nhãn hiệu; tiếng lóng: hiểu biết sẵn có)
| Tên | Bỏ dấu | Tiếng lóng | Tiếng Anh |
|---|---|---|---|
| **Trống Bến** | "trong bến", vô hại | Không thấy | *Landing Drum*; nối trụ cột Nhịp trống |
| **Người Giữ Bến** | Vô hại | Không thấy | *The Ferrykeepers* |
| **Rễ Cuồng** | "Re Cuong", vô nghĩa | "cuồng" nghĩa nhẹ | *Rootrage*; bán quái vật |
| **Cán Lõi** | Mơ hồ | "lõi đời" | Khó dịch; xếp cuối |

Loại "Vảy" đứng riêng, vì bỏ dấu thành "Vay".

## 8. Đối chiếu R2
| Mã | Xử lý |
|---|---|
| R2-01 | Phản diện không phải loài nước; Ba Vì không có thủy quái hay dấu vết |
| R2-02 | Không phải loài nước; động cơ là cái lõi; không gắn mùa |
| R2-03 | Rào tre chỉ để cứu người; cao trào dùng dây chão |
| R2-04 | Hub ở khúc sông [SÁNG TẠO]; chương 1 không rắn, không rùa; tham vấn Quán Thánh, Phủ Tây Hồ |
| R2-05 | Đòn của nhân vật đang chơi; NPC sống hát vè; Thạp không phát tiếng |
| R2-06 | Giáp Xương: yêu ma, đấu ở bến làng, rã thành tro, Codex hai đoạn |
| R2-07 | Phản diện là cây; giao long dáng cá sấu |
| R2-08 | Luật mẫu xăm §5 |
| R2-09 | Trận bến mô-đun (ĐỀ XUẤT cần PO) |
| R2-10 | Hồ sơ ký ức Cói |
| R2-11 | Đổi tự do, có phương án lùi |
| R2-12 | Bảo khí có tên, vật liệu, công dụng; xếp theo đời |
| R2-13 | Cổng 2; dòng chi phí lồng tiếng |
| R2-14 | Cổng 6; spike thuyền trước ch. 2 |
| R2-15 | Một động cơ duy nhất |
| R2-16 | Vảy và tên "nhà Vảy" bắt đầu từ chương 3; vật truyền đời là Cán Lõi |
| R2-17…25 | Nhãn tại chỗ; Đuối Đen; chỉ vẽ mực; danh sách cập nhật GDD; quy đổi mã; "nhiều đời sau"; V-11; bỏ miếu; Đá thành Bương |

## 9. Rủi ro, chưa xác minh, nguồn
- **Rủi ro:** M004 mức C; cây yêu bị đọc là xúc phạm tục thờ cây; nhánh Vảy mờ nhạt; Trận bến hai cấu hình.
- **Chưa xác minh:** nguyên văn Mộc tinh truyện (V-10); tượng ở Quán Thánh; tín ngưỡng thờ Cá Ông; tiếng lóng.
- **Nguồn:** M002–M006, M024, M028; ARC_DS, T002; `GAME1_LORE_DOSSIER*.md`; `REVIEW_V2.md`; `CRITIQUE_*.md`; `VERDICT.md`. Không tra nguồn ngoài.
