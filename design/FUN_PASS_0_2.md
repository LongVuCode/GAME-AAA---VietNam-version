# Fun Pass Demo 0.2: chẩn đoán và thay đổi

`game-designer` (AI), 2026-11-04. **ĐỀ XUẤT**, chờ `qa-lead` và PO, theo nhận xét PO về Demo 0.1. **Mọi con số là giả định, chờ playtest.** Chỉ học nguyên lý từ God of War, Black Myth: Wukong, Sekiro, Elden Ring (CLAUDE.md §5). Động tác vũ khí là [SÁNG TẠO]; chỉ dáng giáo, rìu có cơ sở (T002, mức B); **không có nguồn về võ cổ**.

## 1. Chẩn đoán

Dòng mã theo build `b942f4c` trong `prototype/web/src/`.

| Mảng | Nguyên lý | Hiện trạng |
|---|---|---|
| Phản hồi đòn | 3 pha chuẩn bị, chạm, dư đà; chạm nhiều lớp, có hướng | Đứng yên khi đánh (`player.js:192-203`); chạm tính 1 lần cuối startup (`player.js:194`); dáng = xoay 1 cánh tay (`player.js:277-281`); quay mặt tức thì (`player.js:140-143`). Trúng có 4 lớp (hit-stop, rung nhiễu, 1 tiếng, lóe: `game.js:392-393`, `enemy.js:69`), không lớp nào có hướng |
| Phản ứng địch | Bị đẩy, khựng theo sức đòn | Chỉ lóe; chỉ bị ngắt khi đang vung (`enemy.js:80`); khuỵu = nghiêng thân (`enemy.js:275`). Đánh bao cát |
| Di chuyển | 3 tốc độ; quán tính có trọng lượng mà vẫn nhạy | Shift là **đi chậm**, không chạy nhanh (`input.js:5`); vận tốc tức thì (`player.js:125-131`); xoay cứng 12 rad/s (`player.js:132`); nhịp chân cố định (`player.js:291`); né chỉ ngả người (`player.js:217`, `283`); ≈ 175 m chạy đều 5 m/s |
| Địch, AI | Tính cách qua di chuyển; nhóm có luật | Chỉ tiến/lùi thẳng; không có lượt thì **đứng yên** (`enemy.js:177-180`); chọn đòn ngẫu nhiên đều (`enemyAi.js:56`); tốc độ, bán kính, tầm phát hiện là hằng tạm (`proto.js:8-17`) |
| Quyết định | Lựa chọn nào cũng có giá | Di chuyển không tốn gì; đòn đánh chỉ +8 Nhịp; tuyệt kỹ đầu tiên ước sau ≈ 3 trận. Tối ưu là đánh nhẹ lặp lại |
| Vòng 30 s / 5 phút | 30 s: đọc, đáp, trừng phạt, thưởng; 5 phút: trộn điều đã học | 3 trận cua đơn liên tiếp; 2 bọ ngựa đặt cách 11 m (`world.js:35-43`); 2 kẻ cùng đánh hiếm khi xảy ra |
| Khám phá, thưởng | Rẽ ngang thì có thứ để thấy | Mọi quái `drops: []`; quái trốn chỉ hiện toast (`game.js:485-490`); đánh nhau không được gì |
| Nhịp boss | Pha 2 phải đổi trận, không chỉ chậm lại (N6) | Pha 2: tốc độ 0,85 ×, báo hiệu 1,25 ×, 1/4 đòn không sát thương: cao trào xẹp. HP 2000, đòn nhẹ ≈ 22: ước tính HP chạm sàn trước lần vỡ Thế thứ 3 |
| Âm thanh, camera | Âm theo vật liệu; camera kể sức đòn | Mọi cú trúng một âm (`audio.js:67-73`); FOV 60 cố định (`game.js:98`); khoảng cách cố định, cạy chỉ kéo gần (`game.js:297`); rung là nhiễu (`game.js:305-307`); đòn kết quái thường xóa quái ngay (`game.js:619`) |

**Giữ nguyên:** giao tranh đầu sau ≈ 3–5 s (ước tính, đạt đích ≤ 20 s); báo hiệu; Đỡ nhịp; cạy.

**Năm nguyên nhân chính**
1. Đòn không có 3 pha, không bước tới, chạm tức thì nên không có sức nặng.
2. Địch không phản ứng khi trúng, đứng yên chờ lượt, chọn đòn ngẫu nhiên.
3. Di chuyển phẳng: không chạy nhanh, không quán tính, né không có dáng.
4. Không có giá và không có thưởng: chạy không tốn gì, đánh không được gì, tuyệt kỹ đến muộn.
5. Trận lặp một bài học; pha 2 boss chậm lại thay vì đổi; camera, âm thanh không tạo khoảnh khắc.

## 2. Thay đổi ưu tiên

### P0: bắt buộc cho 0.2

**P0-1. Di chuyển ba nhịp có quán tính** (`movement`)
- Đi 2,2 · chạy 5,0 · **chạy nhanh 7,2 m/s** (giữ nút; phím do agent điều khiển chốt). Tăng tốc 30 m/s², giảm 40; buông thì trượt 0,3 s.
- Xoay: đứng 900°/s, chạy 720, chạy nhanh 300; quay gắt có bước xoay 0,18 s.
- **Chạy nhanh không tốn thanh sức:** HUD đã có HP, Thế, Nhịp; thanh thứ tư là ma sát, không phải quyết định. Giá: Thế **ngừng hồi**, quay đầu kém, mất đi ngang khi khóa mục tiêu. Áp sát hay đứng hồi Thế là quyết định thật.
- **Không nhảy:** không có đòn trên không, graybox phẳng, ArpgCore không có trục đứng. Thay bằng **vượt theo ngữ cảnh** (tự động khi chạy nhanh) qua khúc gỗ, rạch nước.
- *Đo:* tới tốc độ chạy ≤ 0,2 s, dừng ≤ 0,15 s; chạy nhanh ≥ 50% thời gian đi đường (log).

**P0-2. Đòn có ba pha, có bước tới** (`attack_motion`, `weapons.json` `moves[].motion`)
- Mỗi đòn bước tới 0,2–2,0 m trong startup; hút mục tiêu trong 1,5 m; xoay theo mục tiêu tới lúc chạm (540°/s) rồi khóa hướng.
- Chạm quét suốt `active_s`.
- *Đo:* hụt vì địch lùi ≤ 15%; ≥ 4/5 người thử phân biệt đâm thẳng, quét cán, đâm xoáy bằng mắt.

**P0-3. Địch phản ứng khi trúng** (`hit_react`, `behavior.hit_react`)
- Khựng 0,18/0,30/0,45 s; đẩy 0,15/0,35/0,8 m, đòn kết 1,5 m; hệ số theo loài (boss không bị đẩy). Khựng không ngắt đòn đang vung; vỡ Thế có dáng khuỵu 0,35 s.
- Người chơi bị đẩy 0,3/1,2 m; đòn càn quật ngã, dậy 0,8 s có i-frame.
- *Đo:* mọi cú trúng làm địch dịch chuyển hoặc đổi dáng; ≥ 4/5 người nhận ra vỡ Thế khi không nhìn HUD.

**P0-4. Tối thiểu 6 lớp mỗi cú trúng** (`feel`, §4): hit-stop, flash 0,06 s, rung có hướng, hạt theo đích, âm vũ khí + âm vật liệu, đẩy/khựng. *Đo:* đếm sự kiện trong log.

**P0-5. Địch có tính cách khi di chuyển** (`enemy_ai`, `behavior`)
- Kẻ chưa có lượt **đi vòng** ở vành 3,5 m; đòn từ ngoài khung thêm 0,25 s báo hiệu và bắt buộc có âm.
- Chọn đòn theo tầm và độ mới: đòn vừa dùng ×0,5 trọng số, tối đa 2 lần liền.
- **Phản ứng với Thế:** Thế tích lũy của địch ≥ 70% thì nó thủ (cua co mai, bọ ngựa nhảy xa); Thế người chơi ≥ 70% thì địch hăng ×1,4. Gần phá được thì phải đuổi, gần bị phá thì phải lùi.
- Cua bò ngang, phạt đứng sau lưng; bọ ngựa đánh rồi rút; Ụ Bùn giữ vùng, trồi chỗ khác.
- *Đo:* không địch nào đứng yên > 1 s khi đã giao tranh; không đòn nào ra 3 lần liền.

**P0-6. Boss: thêm 2 đòn, pha 2 kể chuyện bằng hành động**
- **Quay hông** (`ll_quay_hong`, cả 2 pha): người chơi ở sau lưng ≥ 1,5 s thì con thú ngoái đầu, khịt hai tiếng, quật hông; đỡ được.
- **Chuyển pha "Húc cọc"** (`transition_set_piece_0_2`, 4 s): con thú **bỏ mặc Cói**, càn vào cọc bẫy gãy đã thấy trước trận; lưỡi bẫy ở cổ va cọc tóe tia (vật lý, không phép); khuỵu, dụi cổ; Cói: "Ai trói mày thế này?". Vũng lầy thứ tư lan ra. Người chơi vẫn đi, đỡ, né.
- **Dụi cổ** (`ll_dui_co`, pha 2): lết cổ một vệt dài, không nhắm Cói (0 sát thương, chỉ đẩy). Đòn vào cổ từ bên hông được ×1,5 Thế: người chơi nhắm vào **cái trói**, không vào con thú.
- `tuning_changes_0_2`: HP 1600; pha 2 tốc độ 0,95, báo hiệu 1,15.
- *Đo:* ≥ 2/3 người thử tả pha 2 là "nó đau / nó cố gỡ bẫy"; ≥ 2/3 lần mở cạy đến từ vỡ Thế, không từ sàn HP.

**P0-7. Đòn kết quái thường có điện ảnh, không giết** (`finisher`): 0,9 s, bất tử, camera xoay thấp, chậm lúc chạm. Cua bị lật ngửa mai rồi chui bùn; bọ ngựa bị quét chân, bay vào lau; Ụ Bùn bị chọc lõi, sụp thành vũng. *Đo:* ≥ 4/5 người thử chủ động dùng.

### 2.1 Động tác giáo và rìu [SÁNG TẠO]

Giáo: thế thấp, dáng chống sào đò. Rìu: đà xoay hông, lưỡi lệch nên đường bổ cong. Đủ 3 pha cho 16 đòn ở `moves[].motion`; dưới là nét chính.

| Đòn | Nét chính | Bước (m) |
|---|---|---|
| Đâm thẳng | thu cán về hông; cán trượt qua tay trước; rút nửa chừng | 0,5 |
| Đâm rút / Quét cán | đâm thấp rồi giật rút, lùi 0,3 m / đổi tay, đuôi cán quét ngang gối | 0,3 / 0,2 |
| Đâm xoáy | gập gối; lao người, mũi xoáy; trượt trên bùn | 1,0 |
| Phóng mũi | ngả người, chân cào đất; mỗi mức gồng lóe + trống nhỏ; phóng như thuyền rời bến; quỳ gối | 2,0 + 0,8/mức |
| Chống giáo hất | cắm đuôi cán như chống sào; bẩy mũi hất lên; bật lùi | 0,4 |
| Bổ xéo / Bổ ngược | rìu qua vai; bổ chéo, rồi mượn đà bổ ngược bằng mặt lưỡi kia | 0,6 / 0,4 |
| Chặt xuống / Xoay rìu | rìu quá đầu; chặt, dậm, đất bắn, lưỡi cắm 0,15 s / rìu sát đất; xoay vòng rưỡi, loạng choạng | 0,5 / 0,3 |
| Bổ gồng | rìu sau gáy; bước dài, bổ cả thân; rìu cắm, hủy bằng né sau 0,25 s | 1,2 + 0,4/mức |
| Móc lưỡi | xoay mũi lưỡi vào trong; móc rồi **kéo** địch lại (−0,8 m) | 0,3 |

### P1: nên có

- **Né có hướng** (`dodge`): 8 hướng theo camera; không nghiêng cần thì lùi bước 2,0 m; từ chạy nhanh 4,5 m; tối đa 2 lần liền. Giữ i-frame ArpgCore.
- **Đòn chạy đà** (`sprint_attack`): chạy nhanh ≥ 0,4 s rồi đánh nhẹ thì bước thêm 1,5 m, Thế ×1,25.
- **Đổi vũ khí giữa combo** (`weapon_swap`, `swap_attack`): đổi trong hồi đòn, 0,15 s; đánh nhẹ ngay sau là đòn đổi, Thế ×1,3. *Đo:* ở bãi sông ≥ 60% người thử đổi giữa combo.
- **Gồng chịu đòn nhẹ**: giáo từ mức 2, rìu từ mức 1.
- **Nhóm giao tranh** (`encounters_0_2`): cua đơn, cua đôi, Ụ Bùn với cua, bọ ngựa phục đôi, bọ ngựa với cua, Ụ Bùn ở lò. *Đo:* trận thường 15–40 s; giữa hai trận ≤ 25 s chạy.
- **Đòn mới quái thường** (`attacks_0_2`).
- **"Đầm yên lại"**: xua hết quái một vùng thì lau thôi rung, chim đáp, lộ 1 điểm nhặt; thưởng hợp chuyện, không lấy phần cơ thể thú.
- **Lối tắt thứ hai** (cầu tre từ bếp lửa Cổng Lau về bãi lau) và **ba bí mật môi trường** ≤ 30 s đường vòng, có mốc nhìn thấy: tổ chim, đó cá bị bỏ (thả cá về nước), gò khô.
- **Nhịp nghỉ ở bến**: dáng ngồi, nhạc riêng, một câu bà lái đò theo tiến độ. Giữa các đoạn combat có nhịp nghỉ 20–40 s.
- **Áp dụng `tuning_changes_0_2`** về Nhịp trống. *Đo:* Hồi trống lần đầu ở trận thứ 2.

### P2: nếu còn thời gian

- Vượt theo ngữ cảnh (`contextual_vault`).
- Camera boss lùi 8,5 m; camera cạy xoay, dí vào mỗi nhịp; nhả cạy chậm 0,4 s rồi mới im lặng.
- Vật phẩm nhặt [SÁNG TẠO]: Củ súng (Thế hồi nhanh 60 s), Lá ngải (gỡ chậm).
- Trợ năng mới "Tắt chậm thời gian".

## 3. Tham số đã thêm vào dữ liệu

Chỉ **thêm** trường (không đổi tên, xóa hay đổi giá trị cũ), nên prototype 0.1 và ArpgCore chạy y như cũ. Đổi giá trị đề xuất nằm trong `combat_tuning.tuning_changes_0_2`, **chưa áp dụng** (HP boss bị ghim bởi `ConfigTests.cpp`). Khối mới: `combat_tuning` (`movement.*`, `dodge.*`, `attack_motion`, `weapon_swap`, `hit_react`, `finisher`, `feel`, `enemy_ai.*`, `pry.camera_*`); `weapons` (`moves[].motion`, `sprint_attack`, `swap_attack`); `enemies` (`shape`, `player_knockback_m`, `behavior`, `attacks_0_2`, `moveset_add_0_2`, `transition_set_piece_0_2`, `encounters_0_2`). Chi tiết: `design/schema/README.md`.

## 4. Juice cho agent VFX và âm thanh

| Sự kiện | Lớp |
|---|---|
| Vung đòn | Vệt: giáo mảnh màu đồng ở mũi, rìu cung rộng; âm vút theo vũ khí (tre cao, rìu trầm) |
| Trúng đòn | Hit-stop, flash 0,06 s, hạt theo đích (vỏ cua, bụi cánh, bùn, lông), **không máu** (N10); âm vật liệu + thân trầm; rung có hướng; rung tay |
| Trúng nặng, gồng | FOV kick 3°, rung tay mạnh; mỗi mức gồng lóe + trống nhỏ |
| Đỡ nhịp hoàn hảo | Tia đồng cọ gỗ, chậm 0,25 × trong 0,2 s, rung tay sắc, điểm trống |
| Né hoàn hảo / vỡ Thế | Chậm 0,4 × 0,25 s / vòng sóng bùn, trống lớn, chậm 0,3 × 0,3 s |
| Bước, né, chạy nhanh | Bụi, bùn, nước bắn theo bề mặt; chạy nhanh thêm FOV +6° |
| Khoen | Chỉ phản quang và tia va chạm; không hào quang, không ký hiệu |

Tôn trọng `acc_camera_shake`, `acc_reduce_flash`.

## 5. Kiểm luật thể hiện (v1.2 §2)

Đòn kết không giết (quái trốn hoặc sụp); không kẻ địch người; không vật phẩm từ khoen hay phần cơ thể thú; mô tả rìu và đời Bương không có "khoen", "mảnh", "chốt"; tia ở chuyển pha là đồng cọ gỗ, không phép.

## 6. Giả định cần playtest

- Mọi số ở §2, nhất là chạy nhanh không tốn sức, hút mục tiêu 1,5 m, chậm thời gian, HP boss 1600.
- Thế ngừng hồi khi chạy nhanh có thành quyết định không? "Húc cọc" 4 s có dài quá? Dụi cổ ×1,5 Thế có làm pha 2 quá dễ?
- Hỏi lại PO: "Còn chán không? Chỗ nào chán nhất?" (1–5, đích ≥ 4).
