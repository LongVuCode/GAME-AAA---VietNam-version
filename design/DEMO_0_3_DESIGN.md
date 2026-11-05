# Thiết kế Demo 0.3: điều khiển, nhảy, hành trang, bản đồ, boss

`game-designer` (AI), 2026-11-05. **ĐỀ XUẤT**, chờ `qa-lead`, `historian-verifier` và PO. **Mọi con số là giả định, chờ playtest.** Chỉ học nguyên lý từ Wukong, God of War, Elden Ring, Ghost of Tsushima (CLAUDE.md §5); tên, chiêu, bố cục đều [SÁNG TẠO]. Dữ liệu chỉ **thêm** (ArpgCore đọc trường cũ), trừ `movement.jump_enabled` → `true` và `drops` của quái thường.

## 1. Điều khiển (`controls.json` → `scheme_0_3`)

**Né mặc định: C.** Space nay là Nhảy; ngón cái từ Space với tới C mà không rời WASD; C rảnh vì Codex thành một thẻ; không dính tổ hợp trình duyệt; né kích hoạt **lúc nhấn**, giữ cửa sổ né hoàn hảo 0,10 s. Đã loại: Ctrl (Ctrl+W đóng tab khi đang giữ W), Alt đơn (Firefox bật menu), "chạm Shift = né" kích hoạt lúc thả (trễ tới 0,25 s).

**Preset:** `kbm_souls_shift` (Shift né lúc nhấn, giữ tiếp thì chạy nhanh; giá: lần chạy nào cũng mở bằng một bước né); `kbm_mouse_side` (chuột cạnh sau; phải chặn điều hướng Quay lại, chưa xác minh trên mọi trình duyệt nên không làm mặc định); `kbm_v`.

| Hành động | Bàn phím | Tay cầm |
|---|---|---|
| Nhảy / Né | Space / C | A/✕ / B/○ |
| Tương tác, Đòn kết, Cạy, Phản nhịp, Ghì nanh | E | **RB/R1** (rời A/✕; ngón cái vẫn ở cần camera khi bấm nhịp) |
| Thế võ 1 / 2 | 3 / 4 (hàng số = đồ mang theo) | giữ LT/L2 + nút đòn nhẹ / nặng (`follows`); có tùy chọn bấm LT một lần |
| Hành trang / Bản đồ | **B** / **M** | View bấm / giữ View 0,4 s |
| Sổ tay / Kỹ năng | J / K (mở thẳng thẻ) | thẻ trong Hành trang |

Preset "Đòn trên vai": Hồi trống → Y/△, Tương tác → X/□. `scheme_0_3` **chưa áp** vào `actions[]` vì test prototype ghim Space là né (`pinned_by`); agent code áp cùng mã 0.3. Validator kiểm sơ đồ đã gộp: không trùng phím, không Ctrl/Alt/Meta, preset không xung đột. Thêm 6 tùy chọn trợ năng (`accessibility_add`).

## 2. Nhảy (`combat_tuning.movement.jump`)

| Thông số | Giá trị |
|---|---|
| Cao / tối thiểu | 1,1 m (cao hơn vật vượt 1,0 m) / 0,5 m (thả sớm cắt 45% vận tốc lên) |
| Lên đỉnh, trọng lực | 0,32 s; 21,5 m/s²; rơi ×1,4. Bay ≈ 0,59 s: nặng, không lơ lửng |
| Trên không | 35% gia tốc mặt đất, xoay 240°/s, giữ đà. Chạy nhanh rồi nhảy được ≈ 4,2 m |
| Coyote / đệm nhấn / lấy đà | 0,10 / 0,12 / 0,05 s |

**Tương tác:** nhảy **không có i-frame**. Trên không không né, không đỡ, không ăn, không dùng Thế võ. Nhảy hủy được hồi đòn (sau 0,1 s) và hồi né. Cao ≥ 0,35 m thì vòng sóng mặt đất (`ring_wave`) không chạm. Đòn càn vẫn trúng dưới 1,4 m (không nhảy qua đầu lợn lòi).

**Đòn trên không** (`weapons[].air_moves_0_3`): mỗi lần nhảy một đòn nhẹ, treo 0,12 s (giáo "Đâm chúc", rìu "Bổ lượn"). Đòn nặng bổ xuống từ ≥ 0,6 m, rơi 18 m/s, tạo sóng xung kích: giáo "Cắm sào giáng" 2,5 m / 25 Thế, rìu "Rìu giáng" 3,0 m / 32 Thế. Hồi 0,45 / 0,55 s, né hủy sau 0,25 s.

**Tiếp đất:** dưới 1,2 m không khựng. Cao hơn thì khựng 0,12 s mỗi mét, tối đa 0,35 s, né hủy được. Có nén thân, camera hạ 6 cm, rung tay. Bụi, bùn hoặc nước bắn tùy bề mặt, mỗi bề mặt một âm.

## 3. Hành trang (phím B)

### 3.1 Nguyên lý (trích đoạn, chưa đối chiếu trong game)
- **Wukong:** 4 ô giáp đầu/thân/tay/chân. Ghép nhiều món cùng bộ có thêm hiệu ứng, có bộ hai nấc. Nâng giáp tăng giáp từng món. Vật đeo có ô riêng, mở thêm dần.
- **Elden Ring:** so sánh ngay trong màn trang bị, số tốt và số kém hai màu khác nhau.
- **GoW:** kỹ năng vũ khí có hồi chiêu (giữ L1 + R1/R2), nâng bằng XP, chỉ số hồi chiêu nằm trên giáp.
- **Ghost of Tsushima:** nâng đồ bằng vật liệu theo loại; ô bùa mở qua khám phá.

Không lấy bố cục, tên hay biểu tượng của game nào.

### 3.2 Cấu trúc
Các thẻ: **Trang bị | Túi đồ | Kỹ năng | Bản đồ | Sổ tay | Codex** (đổi bằng Q/E hoặc LB/RB). Mở Hành trang thì dừng game.

**Trang bị:** cột ô bên trái, nhân vật bên phải (xoay được, phóng gần khi chọn ô Đầu), bảng chỉ số ở dưới. Có 9 ô (`gear_0_3.slots`):
- Vũ khí 1, Vũ khí 2 (mở ở đời Bương)
- Đầu, Thân, Tay, Chân
- Vật đeo 1, Vật đeo 2 (mở sau khi gọi tỉnh người bị mê)
- Bảo khí

Chọn món thì so sánh: tăng ↑ xanh ngọc, giảm ↓ ngà xám gạch dưới (**không đỏ đồng**), kèm tiến độ bộ đồ.

**"Vật đeo" thay "Bùa":** "bùa" gợi phép, yểm, va luật "khoen không phép"; hiệu ứng là thói quen thường ngày.

Túi đồ lọc Đồ dùng / Vật liệu / Bảo khí; thẻ Kỹ năng gồm Thế võ và cây Nghề nhà cũ.

### 3.3 Đồ demo (`items.json`)

| Món | Ô | Hiếm | Chỉ số | Nhận ở |
|---|---|---|---|---|
| Khăn gai chít đầu | Đầu | Tốt | Giáp 6, Thế +5 | Rương Đầm nông |
| Áo gai nhuộm chàm | Thân | Thường | Giáp 14, Sức +20 | Có sẵn |
| Vòng tay ống đồng | Tay | Tốt | Giáp 8, hao Thế khi đỡ −10% | Gò khô (bọc vải của người đi cắt lau) |
| Quấn chân vải vỏ cây | Chân | Thường | Giáp 8, chống lún 30% | Có sẵn |
| Chuông đồng nhỏ | Vật đeo | Quý | Nhịp +10% | Giỏ bỏ quên, Bãi lau |
| Chuỗi hạt đất nung | Vật đeo | Tốt | Chờ hồi Thế −20% | Đó cá bị bỏ |

**Giáp và bộ đồ:** sát thương giảm theo `giáp / (giáp + 150)`; đủ bộ +0 giảm ≈ 19%. Bộ "Đồ đò bến Lau": 2 món được +10 Thế. 4 món mở "Nhịp chèo": Đỡ nhịp hoặc né hoàn hảo rút 1,5 s hồi của cả hai Thế võ.

**Thời kỳ:** mọi món [SÁNG TẠO], có `basis`: đồ vải theo ART_DIRECTION (gai, vỏ cây, chàm); đồ đồng "gợi từ trang sức đồng Đông Sơn", chưa tra hiện vật (ứng viên ARC_DS); chuông theo trích đoạn lsvn.vn về bộ chuông đồng Đông Sơn là Bảo vật quốc gia 2026, **chưa đối chiếu bản gốc**.

**Vật phẩm mới:** Thiếc sông, Sợi gai; Củ súng luộc (Thế hồi +60% trong 60 s), Lá ngải giã (bùn không làm chậm 30 s).

**Nâng cấp +1…+3** ở lò đúc làng: giáp +15%/bậc, vật đeo +25%, vũ khí +8% sát thương, +6% Thế; vũ khí và đồ đồng cần thiếc + mây, đồ vải cần sợi gai.

**Màu độ hiếm** (nền `#1D1B19`):

| Độ hiếm | Mã màu | Gợi từ |
|---|---|---|
| Thường | `#B8B2A3` | ngà xám |
| Tốt | `#7FA35B` | lau |
| Quý | `#5C86C4` | chàm |
| Hiếm | `#9A6FC0` | tím sim |
| Huyền thoại | `#E0B44C` | vàng đồng mới |

Thêm khía góc ô theo bậc (không chỉ dựa màu). Validator chặn màu cách đỏ đồng `#C64E29` < 20° sắc độ.

### 3.4 Thế võ (`skills.json`)

Mỗi vũ khí có 2 Thế võ, mỗi Thế võ 3 bậc. Hồi chiêu tính riêng cho từng vũ khí: đổi vũ khí không mất hồi chiêu. Mở và nâng bậc bằng **Kinh nghiệm**, một tiền tệ riêng; Điểm nghề vẫn dành cho Nghề nhà. Học lại miễn phí ở bếp lửa.

| Thế võ | Bậc 1 | Bậc 2 (120 KN) | Bậc 3 (220 KN) |
|---|---|---|---|
| **Cắm sào vọt** (giáo, có sẵn): chống giáo bật lên, lao 6 m, đâm xuống | 32 sát thương / 30 Thế, hồi 12 s; né được sóng mặt đất | sóng 2 m, 40 Thế | lúc bật có i-frame; đòn nhẹ kế tiếp là Đâm xoáy |
| **Quét sóng** (giáo, mở 60 KN): quét cán 360° | bán kính 3 m, đẩy 1,5 m, ngắt đòn quái thường, hồi 14 s | bán kính 3,6 m, khựng 0,6 s | quét ngược lần hai |
| **Bổ đốn cây** (rìu, có sẵn): gồng 0,5 s rồi bổ | 70 sát thương / 80 Thế, gồng chịu đòn vừa, hồi 16 s | gồng chịu đòn nặng (trừ đòn không đỡ được) | phá Thế thì +50 Nhịp, hồi −5 s |
| **Móc thuyền** (rìu, mở 60 KN): lướt 5 m, móc xoay địch | địch lộ hông ×1,3 Thế; với boss thì tự kéo mình ra sườn | ×1,5 | tầm 8 m, 2 mục tiêu |

**KN** (`xp_sources`): cua 15, bọ ngựa 20, Ụ Bùn 40, điểm nhìn 15, bí mật môi trường 25, chuỗi bí mật 60, người bị mê 50, boss 200. Trước boss ≈ 475: đủ đưa hai Thế võ giáo lên bậc 2 (300), không đủ thêm bậc 3, nên phải chọn.

## 4. Bản đồ (M) và minimap (`map.json`)

**Nguyên lý từ GoW Ragnarök** (trích đoạn guides4gamers, powerpyx, gamepressure):
- Dịch chuyển nhanh giữa các điểm cố định.
- Đếm vật sưu tầm theo từng vùng.
- Có vùng chỉ mở khi đủ điều kiện.

Cách sương tan chưa có nguồn: thiết kế riêng.

**Bản đồ lớn:** vẽ tay trên vải gai (không dùng giấy, có lẽ chưa có ở thời này, chưa xác minh); viền hoa văn hình học Đông Sơn, **không** mặt trời trung tâm, **không** chim Lạc.
- **Sương:** lưới 4 m, tan trong 14 m quanh người chơi; 5 điểm nhìn tan 25–30 m.
- **Biểu tượng:** 17 loại, có chú giải; dấu vết, rương chỉ hiện khi đã thấy. **Dấu tự đặt:** tối đa 8, hiện cả trên minimap.
- **Theo dõi** một mục tiêu `obj_*`; **tiến độ vùng** "Đã tìm 2/3".
- **Dịch chuyển nhanh** giữa các bếp lửa đã thấy, không khi giao chiến hay ở bãi lầy boss.

**Tọa độ** chép từ `world.js`; validator đọc `world.js` để so `world_point`. 10 điểm mới (`new_in_0_3`: 5 điểm nhìn, 2 rương, 3 bí mật môi trường tổ chim rơi, đó cá bị bỏ, gò khô, đường vòng ≤ 25 s) được kiểm nằm trong vùng. **Agent code cần thêm chúng vào `POINTS`.**

**Minimap tròn góc trên trái:** 104 px (1080p), phủ 28 m, 3 mức zoom. **Mặc định xoay theo camera** (WASD tính theo camera nên phía trên minimap là hướng W đi); tùy chọn cố định hướng bắc, kim bắc luôn hiện. Chấm địch khi giao chiến hoặc trong 20 m, kim cương cho quái mạnh, nanh cho boss; mục tiêu ngoài tầm bám mép. Viền vòng tròn tiếp tuyến `#9B7A4E`. Ẩn khi cạy, Ghì nanh, Hồi trống.

## 5. Lợn Lòi Đầm

### 5.1 Vì sao dễ
1. **Một đòn rồi nghỉ dài:** hồi 0,6–2,0 s, cộng 1,2 s chờ token vì boss dùng chung bể token với quái thường (`enemy.js:273, 414`), cộng 30% lùi lại: ước tính ≥ 2 s an toàn sau mỗi đòn.
2. **Không chuỗi, không trộn:** 10 đòn đơn, một đòn trễ, không đòn giả; vài phút là thuộc.
3. **Pha 2 hiền hơn pha 1.** Tốc độ 0,85, báo hiệu ×1,25; 2/6 đòn không gây sát thương.
4. **Không phạt thói quen xấu.** Ăn giữa trận an toàn. Né không tốn gì, nên lăn liên tục là tối ưu.
5. **Đấu trường tĩnh.** Không có gì để dùng hay để tránh.

### 5.2 Thiết kế lại (`enemies.json`, chỉ thêm khối)

**Đòn mới** (nằm trong `attacks[]`, chỉ vào trận qua `moveset_add_0_3`):

| Đòn | Pha | Đọc và đáp |
|---|---|---|
| **Sóng bùn**: vòng 1,5→9 m trong 0,9 s, đỏ đồng | 1, 2 | Nhảy qua hoặc né xuyên đúng lúc mép sóng tới; đỡ thì mất Thế |
| **Càn xuyên bãi**: càn 34 m, để vệt bùn 8 s (chậm ×0,6, cấm chạy nhanh) | 1 | Né ngang, tránh vệt bùn |
| **Cào móng giả**: dáng như Càn lầy nhưng **không rống**, rồi bật tới hất nanh (đỡ được) | 1 | Nghe tiếng: càn thật luôn rống. Né theo phản xạ thì trúng |
| **Càn hai lượt**: tới mép thì trượt quay lại, nghỉ 0,6 s, nhắm lại ≤ 35° | 2 | Né hai lần theo hai tiếng rống |
| **Dậm chậm**: chồm lên, giữ 0,6 s rồi đập (đòn trễ duy nhất của pha 2) | 2 | Chờ tiếng rên; Đỡ nhịp hoàn hảo mở Phản nhịp |

**Chuỗi** (`combos_0_3`). Bước sau báo hiệu ngắn hơn, nhưng validator giữ sàn 0,3 s cho đòn đỡ được và 0,9 s cho đòn không đỡ được.

| Chuỗi | Pha | Các bước |
|---|---|---|
| **Ba nhịp nanh** | 1 | Hất nanh → Quật đầu đôi → Hất nanh (Phản nhịp được). Người chơi đứng sau lưng thì nhịp 3 thành Quay hông |
| **Hất, lùi, càn** | 1 | Hất nanh, nhảy lùi 4 m, rồi Càn lầy (báo hiệu ≥ 1,0 s) |
| **Giãy dồn** | 2 | 4 đòn, kết bằng Dậm chậm. Hồi cuối ×1,2 nên có cửa phạt rõ |
| **Sóng bùn đôi** | 2 | Nhảy, tiếp đất, nhảy |

**Hành vi** (`behavior_0_3`): không dùng token, nghỉ 0,4–1,0 s, lùi 15%, ở gần 55% mở chuỗi. **Phạt ăn** trong 12 m bằng càn (báo hiệu đủ). **Phạt spam né** (3 lần / 3 s) bằng Sóng bùn. Xa > 10 m quá 3 s thì Càn xuyên bãi; sau lưng 1,2 s thì Quay hông.

**Pha 2 "đau quá hóa cuồng"** (`phase2_0_3`): tốc độ 1,0, báo hiệu ×1,1, bỏ Càn khuỵu. Nước rút, vũng lầy co 60%, lộ **3 cọc bẫy cũ**: càn va cọc thì cọc gãy, con thú khựng 2,2 s, mất 60 Thế. Người chơi đứng trước cọc để dụ càn: dùng chính cái bẫy để giải thoát nó.

**"Ghì nanh"** (một lần mỗi trận, không lạm dụng QTE): con thú khựng vì va cọc, đứng trong 3 m, bấm Tương tác; Cói chống cán giáo ghì nanh nó xuống bùn, nói khẽ cho nó yên. 2 nhịp trống theo luật cạy. Đúng: vỡ Thế, tính một vết nứt; trượt: bị hất, mất 10 Sức. Nghe chuyện tự thành công.

**Độ khó** (`difficulty_0_3`). Báo hiệu không bao giờ ngắn đi.

| Mức | Chuỗi dài nhất P1/P2 | Đòn giả | Phạt ăn | Phạt spam né | Nghỉ sau đòn |
|---|---|---|---|---|---|
| Nghe chuyện | 2/2 | không | không | không | 0,9–1,5 s |
| Chèo đò | 3/4 | có | có | không | 0,4–1,0 s |
| Ngược nước | 3/4 | có | có | có | 0,3–0,8 s |
| Thác dữ | 3/4, thêm càn hai lượt ở P1 | có | có | có | 0,2–0,6 s |

**Luật giữ nguyên:** con thú là nạn nhân, đòn từ đau, kết bằng cạy. **Đích:** trận thắng 4–7 phút; Chèo đò 20–40% thắng lần đầu.

## 6. Chiêu đặc biệt của người chơi

1. **Hồi trống thành tuyệt kỹ điện ảnh** (`drum_burst_cinematic_0_3`, `drum_burst_0_3`): mở 0,45 s chậm ×0,2, camera xoay thấp trước mặt; mỗi đòn một nhịp trống (giáo 0,6 s, rìu 0,867 s) kèm sóng 1→4 m, camera dí sát; nhịp cuối trống cái, sóng 6–7 m, chậm 0,45 s, FOV +6°. Bất tử, HUD ẩn; sát thương vẫn từ `drum_burst`.
2. **Thế võ:** §3.4. **Đòn nhảy:** §2.
3. **Hủy đòn bằng né** (`dodge_cancel_0_3`): từ hồi đòn (sau 0,1 s), lúc gồng, Thế võ sau pha chạm, lúc tiếp đất, đòn bổ xuống (sau 0,25 s); không từ pha chuẩn bị hay pha chạm. Né hoàn hảo ngay sau hủy +10 Nhịp.
4. **Phản nhịp** (`riposte_0_3`): Đỡ nhịp hoàn hảo đúng nhịp đánh dấu thì địch hở 1 s. Bấm Tương tác: 30 sát thương, **70 Thế**, bất tử 0,8 s, chậm ×0,3, +40 Nhịp.

## 7. HUD: khóa dữ liệu (`combat_tuning.hud_0_3`)

- **Máu** (`player.hp_max` + đồ): xanh ngọc phát sáng `#8FC79A`; **≤ 50%** hổ phách `#D9A441`; **≤ 10%** `#E8C27A` nhấp 1,5 Hz, viền tối, tiếng tim. Không dùng đỏ đồng.
- **Thanh tuyệt kỹ = Nhịp trống:** 4 nấc (`segments` × `points_per_segment`), sáng nhấp khi đầy.
- **Thế võ:** 2 ô, hồi chiêu = `levels[].cooldown_s` × `skill_cooldown_mult`, quét tròn, hiện số giây khi còn < 5 s.
- **Boss:** vạch pha ở 50% HP, thanh Thế, **không đếm khoen**.

## 8. Dữ liệu đã thêm hoặc sửa

| File | Thêm hoặc sửa |
|---|---|
| `combat_tuning.json` | `movement.jump`, `jump_enabled` = true, 5 khối `*_0_3` |
| `controls.json` | `scheme_0_3` |
| `items.json` | màu độ hiếm, 4 vật phẩm, `gear_0_3` |
| `weapons.json` | `air_moves_0_3`, `drum_burst_0_3`, `skills_0_3` |
| `enemies.json` | `drops` quái thường; boss: 5 đòn, các khối `*_0_3` |
| `strings.json` | 71 chuỗi vi/en |
| `skills.json` (mới) | Thế võ |
| `map.json` (mới) | bản đồ và minimap |
| validator + test | kiểm 3 file mới và các khối 0.3; 19 test mới |

## 9. Kiểm luật thể hiện (Story Bible v1.2 §2)

Không đánh người; quái bỏ chạy hoặc tan, đồ rơi là đồ người làng hay thiếc, không phần cơ thể thú. Khoen không phép (tia va cọc là đồng cọ gỗ), không đồ từ khoen. Thế võ rìu có `era: era_hung_vuong_6`, validator chặn "khoen/mảnh/chốt". Không thần khí: ô cao nhất là Bảo khí [SÁNG TẠO]. Ghì nanh là ghì giữ, không đâm.

## 10. Giả định cần playtest

- C có làm bấm nhầm B không? Giữ LT + nút đòn có khó không? Bay 0,59 s có đủ qua Sóng bùn?
- Boss: ≥ 3/5 người thử nhận ra đòn giả nhờ tiếng rống, ≥ 3/5 chủ động dụ càn vào cọc; pha 2 vẫn là "nó đau", không "nó ác".
- 475 KN có tạo lựa chọn? "Nhịp chèo" có quá mạnh? Hỏi lại PO: "Boss còn dễ không?" (1–5, đích ≥ 4).

## Nguồn (2026-11-05, trích đoạn tìm kiếm)

maxroll.gg; blackmythwukong.fandom.com/wiki/Equipment; gamepur.com; primagames.com/eguides/god-of-war-eguide; game8.co/games/God-of-War-2018/archives/316122; samurai-gamers.com/ghost-of-tsushima/how-to-upgrade-equipment; guides4gamers.com/god-of-war-ragnarok/pois/mystic-gateways; powerpyx.com; web-platform-tests pointerlock/mouse_buttons_back_forward.html; lsvn.vn/cong-nhan-30-bao-vat-quoc-gia-a169186.html.
