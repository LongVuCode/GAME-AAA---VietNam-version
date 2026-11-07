# Combat 0.4: bộ chiêu, quái, boss, thế giới bán mở

`game-designer` (AI), 2026-11-07. **ĐỀ XUẤT**, chờ `qa-lead`, `historian-verifier`, PO; theo phản hồi PO 5–7. **Mọi con số là giả định, chờ playtest.**

Chỉ học **nguyên lý** (CLAUDE.md §5); tên chiêu, động tác, quái, địa danh đều [SÁNG TẠO]; dáng giáo, rìu theo T002 (mức B). Chỉ **thêm** khối `*_0_4`.

## 1. Nghiên cứu: năm nguyên lý

Nguồn là trích đoạn tìm kiếm ngày 2026-11-07. Phần lớn là wiki và bài hướng dẫn, nên mọi mục ghi **(chưa xác minh trong game)**.

1. **Ít nút, nhiều nghĩa:** bấm, giữ, dừng nhịp, hướng và trạng thái (vừa né, vừa đỡ, đang chạy) đổi đòn; chiêu mở dần qua cây kỹ năng. *GoW 2018/Ragnarök: mỗi vũ khí 2 ô runic nhẹ/nặng (game8, godofwar.fandom).*
2. **Tài nguyên sinh từ chơi giỏi, tiêu vào đòn mạnh.** *Wukong: đòn nhanh, né hoàn hảo tích Focus, đòn nặng tiêu; tài năng tự đâm sau né (gamepressure, deltiasgaming). Nioh: đổi thế đúng ki pulse được thưởng (rpgsite, critpoints). Lies of P: đỡ hoàn hảo dồn tới choáng rồi đòn kết (gamepressure, fextralife).*
3. **Mỗi mối nguy một lời giải, báo bằng hình và âm** (đâm thì phản, quét thì nhảy, bắt thì né); đòn trễ phải có giới hạn. *Sekiro: ký hiệu đỏ, posture (fextralife, samurai-gamers). Elden Ring: đòn trễ là khác biệt lớn nhưng dễ ức chế (game-wisdom).*
4. **Mỗi quái buộc đổi cách đánh:** mánh riêng, điểm yếu, sinh thái, trạng thái giận. *George Fan, GDC 2017 (tóm tắt trên medium, chưa xem bài gốc); Monster Hunter: quái khớp sinh thái (phỏng vấn Fujioka, gamerbraves, press-start); điểm yếu, giận theo bài không chính thức.*
5. **Boss bộ chiêu lớn, pha sau xây trên pha trước, vòng đánh–phạt–hồi; mẫu đủ đơn giản để nhớ.** Thế giới: mốc cao dẫn đường, mốc nhỏ dắt lối, thấy thì tới được. *game-wisdom (≥ 5 đòn), choostgames, gamedeveloper (GDC 2021 Ghost of Tsushima "flag/breadcrumb"), gamesradar (Elden Ring).*

## 2. Người chơi

### 2.1 Ngữ pháp input và Đà

`combat_tuning.input_0_4` dùng các token `L H hold_H pause fwd back dodge perfect_dodge perfect_parry sprint slide air`.
- **Hướng:** đẩy cần ≥ 60% về phía mục tiêu hoặc ngược lại khi bấm.
- **Dừng:** 0,35 s, đổi nhánh chuỗi.
- **Cửa sổ nối:** sau né hoàn hảo hoặc Đỡ nhịp hoàn hảo có 0,6 s để ra đòn điều kiện.

**Đà** (`momentum_0_4`, N2) có 3 nấc.
- **Tích:** +1 cho mỗi đòn nhẹ trúng từ bước 3 của chuỗi, mỗi lần né hoàn hảo, Đỡ nhịp hoàn hảo, Phản nhịp hoặc đòn kết.
- **Mất:** ngừng đánh 5 s thì rơi dần; bị trúng đòn mất 1 nấc.
- **Tiêu:** giữ H thì mỗi nấc bỏ qua một mức gồng. Hai đòn "tiêu Đà" thêm một nhát cho mỗi nấc.
- **HUD:** 3 vạch quanh biểu tượng vũ khí, màu ngà rồi vàng đồng; không dùng đỏ đồng.

### 2.2 Giáo đồng (Cói): thế thấp, dáng chống sào

| Chuỗi | Input | Đòn |
|---|---|---|
| Xuôi dòng | L×5 | 4 đòn 0.1 + **Đâm ba mũi**: lùi chân, kéo cán ngang tai, mũi rung hai nhịp (báo đòn kết); ba đâm cao-giữa-thấp, mỗi đâm nửa bước; giữ mũi 0,2 s |
| Ngắt nhịp | L,L,dừng,L,L | **Xoay cán gạt**: hai tay trượt về giữa cán, xoay 1,5 vòng trên đầu như guồng nước, 360°, gạt đòn nhẹ và vật bay. **Chọc lao vọt**: gập gối, mũi chúc bùn, bật đâm chéo lên, hất quái thường 0,8 m; nhảy hủy được sau 0,15 s để đuổi lên không |
| Sào nặng | H,H,H | **Bẩy mũi**: cắm mũi sát chân địch, bẩy như bẩy đò mắc cạn, lật ngửa quái lưng đá. **Giáng cán**: nhấc quá đầu, giáng cả thân cán, bùn tóe 1,8 m. **Phóng sào xuyên**: thân nén như sào cong, lao 3 m xuyên 2 địch, quỳ gối trượt (hit-stop đòn kết). Giữ H vẫn là Phóng mũi gồng (0.1) |
| Trộn | L,L,H / L,L,L,H | **Quét nước**: quét thấp 160°, quái nhẹ ngã 1,2 s. **Xuyên đà**: 2 đâm + 1 đâm mỗi nấc Đà |
| Hướng | fwd,H / back,L | **Lao sào**: lướt 5 m. **Đâm lui**: chọc trong lúc nhảy lùi 1,6 m (giữ khoảng với bọ ngựa) |
| Điều kiện | perfect_dodge,L / perfect_dodge,H / perfect_parry,H | **Mũi ngược dòng**: còn trong lúc chậm thời gian thì đâm ngược, +1 Đà. **Vòng sào qua lưng**: cắm cán, đu qua đầu địch cao ≤ 2,2 m, đáp sau lưng đâm (với boss: đu ra sườn 3 m). **Đè sào**: ghì càng hoặc chân địch xuống bùn 0,8 s, 55 Thế |
| Chạy, trượt | sprint,H / slide,L | **Nhảy sào**: bay 5 m, đâm chúc; khi trên không thì sóng mặt đất không chạm. **Trượt đâm gối**: làm ngã |

**Thế võ mới: Lướt lau ba bước.** Ba lần lướt chéo 3 m. Bấm lại trong 0,25–0,6 s để lướt tiếp; mỗi lần lướt có 0,12 s i-frame và trúng nhiều địch.
- Bậc 2: trúng đủ ba lần thì +1 Đà.
- Bậc 3: lần bấm thứ tư đúng nhịp thêm cú đâm kết, 40 Thế.
- Mở: 90 KN sau khi tới Cây gạo trụi.

### 2.3 Rìu xéo (Bương): đà hông, nhát bổ cong

| Chuỗi | Input | Đòn |
|---|---|---|
| Bổ dọc thân cây | L×5 | **Bổ gốc**: rìu vòng qua vai trái, nhấc chân trước, dậm và bổ cắm, đất bắn 2 m |
| Ngắt nhịp | L,dừng,L,L,L | **Vai húc**: lao 1,2 m, chịu đòn nhẹ. **Bổ cắm**: lưỡi cắm 0,2 s. **Giật rìu**: đạp chân kéo cán, hất lên, lật ngửa quái lưng đá |
| Quai rìu | H,H,H | **Quai ngang** 200°, xoắn thân hết cỡ. **Quai ngược** 270°, đổi chân trụ, không dừng đà. **Bổ trời giáng**: nhảy thấp 0,8 m, đất nứt thẳng 4 m (hit-stop đòn kết). Giữ H vẫn là Bổ gồng |
| Trộn | L,L,H / L,L,L,H | **Cán thúc**: thúc đuôi cán rồi móc kéo về 0,6 m. **Xoáy lốc**: 1 vòng + 1 vòng mỗi nấc Đà, mỗi vòng tiến 1,5 m |
| Hướng | fwd,H / back,H | **Lao vai bổ** 4 m. **Bổ chặn lui**: nhảy lùi 1,5 m, bổ xuống chỗ vừa đứng |
| Điều kiện | perfect_dodge,L / perfect_dodge,H / perfect_parry,H | **Bổ quay lưng**, +1 Đà. **Chém gối lách**: lách sườn chém gối. **Móc bẻ càng**: móc rồi bẻ, địch mất thăng bằng 1 s, 70 Thế |
| Chạy, trượt | sprint,H / slide,L | **Xô cây đổ**: đổ cả người theo nhát bổ. **Trượt chặt gối** |

**Thế võ mới: Đốn ba nhát.** Ba nhát bổ cách nhau 0,6 s theo nhịp trống. Nhát trúng nhịp (±0,12 s) được ×1,3 Thế; nhát thứ ba đúng nhịp phá thế thủ quái thường.
- Bậc 2: chịu đòn vừa.
- Bậc 3: nhát ba nứt đất 4 m.
- Mỗi đòn rìu mang `era: era_hung_vuong_6`, nên validator chặn từ cấm.

### 2.4 Mở khóa và cảm giác đòn

**Cây chiêu** (`skills.move_unlocks_0_4`, N1): ngắt nhịp và chuỗi nặng mở sẵn; đòn thứ năm 40 KN, theo hướng 40, trộn 60, khi chạy/trượt 40, phản 80. Thế võ: biết tối đa 3, mang 2 ô, đổi ở bếp lửa. Trước boss: đi hết ≈ 1383 KN, đường chính cộng một nhánh ≈ 830; mở hết của giáo cần ≈ 1370, nên phải chọn.

**Cảm giác đòn** (`hit_feel_0_4`): đòn cuối chuỗi +0,03 s hit-stop, đòn phản ×1,5; trúng điểm yếu có tiếng vỏ nứt hoặc bùn vỡ; tiêu Đà lóe 0,08 s. Mỗi đòn trong `moves_0_4[].motion` có `anticipation`, `active`, `follow_through`, `lunge_m`, `target_react` (mới: `trip`, `push_up`), `hit_stop`; kênh pose theo `anim/humanoidPoses.js`.

## 3. Di chuyển (`movement_0_4`, `dodge_0_4`, `traversal_0_4`)

**Chạy nhanh có quán tính:** 2 bước đầu sải ×1,25, nghiêng 14°; chạy liền 2 s thì lên 7,8 m/s trong 0,6 s; vào cua nghiêng 16°; quay gắt ≥ 135° thì trượt bánh 0,28 s, giữ 45% tốc độ, bùn/nước bắn theo bề mặt.

**Trượt** (chạy nhanh + né + đẩy cần tới): 4,5 m (bùn ×1,3), chui dưới vật cao 0,7 m, ra đòn sau 0,15 s; dốc > 28° tự trượt.

**Né có 5 biến thể.** Khung i-frame gốc của ArpgCore không đổi.

| Biến thể | Khi nào | Quãng |
|---|---|---|
| Bước nhanh | Đang khóa mục tiêu, bấm nhẹ | 2 m, 0,3 s |
| Lăn | Mặc định | 3,5 m |
| Lùi bước | Không đẩy cần | |
| Lăn dài | Lần né thứ 2 liền nhau | 4,2 m, hồi lâu hơn |
| Trượt | Đang chạy nhanh | 4,5 m, không i-frame |

Né hoàn hảo: chậm ×0,4 trong 0,25 s, để lại bóng bùn ở chỗ cũ, +1 Đà.

**Leo, vượt:** trèo gờ 1,0–2,2 m; nhảy xuống bờ dốc ≤ 4 m (cao hơn 2,2 m thì một chiều); leo dây leo; đu sào qua khe ≤ 5 m (giáo, chỗ đánh dấu); đi trên thân cây đổ; lội ×0,6; nước sâu chặn, **không bơi** (Story Bible §2).

## 4. Quái thường: yêu đầm theo hướng quái vật (`attacks_0_4`, `moveset_0_4`)

**Archetype** (`enemy_ai_0_4`, N4): lưng đá (giữ mặt), phục kích, quấy, trâu, tầm xa.
- Tối đa 2 kẻ cùng đánh.
- Hai đòn bắt cách nhau ít nhất 6 s.
- Đòn không đỡ được có sát thương luôn có đỏ đồng kèm âm (validator kiểm).

Hình dáng theo brief `STORY_INTEGRATION_0_4` §6.2. Ụ Bùn theo brief mới: đáy loe, trườn, không chân, không tay. Brief này thay "khối bùn hai chân" của 0.1 và ART_DIRECTION.

### Yêu đầm nhiều chân (`en_cua_cang_bun`, lưng đá)

Phản biện văn hóa thay con cua bằng yêu đầm nhiều chân, thân thấp, rig `crab_small`; id giữ nguyên. **Tên và brief chờ `creatures_0_4.json`** (chưa có lúc viết). Không đòn phun; tên chiêu mới không có chữ "cua" (tên 4 đòn 0.1 do agent cốt truyện đổi).
- **Mánh lưng đá:** mặt trước ×0,6 sát thương (×0,4 khi nằm bẹp); bò ngang giật cục.
- **Chiêu mới:** Cào hất bùn (chậm ×0,6, không sát thương); Ôm ghì (đòn bắt, đỏ đồng, phạt giơ thủ trước mặt > 1,2 s, né lùi); Chui bùn trồi (vệt bọt bám 2 s, trồi lên rồi ngửa bụng 1,4 s); Bò xoáy (đỡ được).
- **Điểm yếu:** sườn ×1,5; bụng ×2 khi bị lật (Bẩy mũi, Chọc lao vọt, Giật rìu) hoặc sau khi trồi; chân dài bị quét thì khuỵu.
- **Giận "Dựng chân"** khi đồng bọn chạy: nhanh ×1,2 nhưng sườn lộ 140°. **Nhóm:** một con giữ mặt, một con trồi sau lưng, không đứng hàng. Nước nông nhanh hơn; bãi bồi khô không chui được.

### Bọ Ngựa Lau (phục kích)
- **Mánh ẩn lau:** đứng im là bụi lau, chỉ rõ trong 4 m; lau quanh nó không rung theo gió, tiếng tách mỗi 1,5 s.
- **Chiêu mới:** Cánh dọa (mây bụi 3,5 m, mất khóa; đòn kế từ mép mây +0,25 s báo hiệu); Lướt cánh chém (lượn 6 m; trúng đòn đâm hoặc nặng lúc lượn thì rơi ngửa 1,5 s); Kẹp lưỡi liềm (đòn bắt bằng bẹ lau hóa sừng; hụt thì cắm bùn 0,9 s).
- **Điểm yếu:** chân mảnh (quét ngã 1,5 s, ×1,5 Thế); đang lượn ×2 Thế. **Giận "Xòe cánh lá"** ≤ 50% máu, ưu tiên lượn. **Cặp cánh:** một dọa, một vồ. Ra bãi trống thì rút 80% sau mỗi đòn.

### Ụ Bùn (tầm xa, giữ vùng)
- **Mánh vỏ bùn:** 2 lớp × 60 máu; đòn nặng ×1,5; đất khô ×1,3.
- **Chiêu mới:** Ném cục bùn (12 m, để vũng; **Đỡ nhịp hoàn hảo hất ngược**, nó khựng 1 s); Rễ trói (1 s, đỏ đồng); Sụp đè (sóng 4 m, báo 1,4 s, lõi lộ 2 s); Hút bùn (trong vũng hồi 1 lớp; đòn nặng ngắt).
- **Điểm yếu:** lõi rễ ×1,5 sát thương, ×2 Thế. **Giận "Gào bùn"** khi mất vỏ: ném nhanh ×1,6, không hồi vỏ. Ném bùn tạo vũng cho đồng bọn.

### Quái mới [SÁNG TẠO] (`enemies_0_4`; không loài nước, rắn, cáo, người)
**Cào Cào Gai** (côn trùng, quấy; bầy 2–3 trên gò). Mánh *bật lò xo*: thấy gồng đòn nặng trong 3 m thì 70% bật lùi 4 m, ép dùng đòn nhẹ và đâm. Chiêu: Đạp nhảy (bật 1,6 m; đòn nhẹ lúc nó nén chân là ngắt), Gặm gai, Hất gai (không phun; Đỡ tốn Thế ×1,5 trong 4 s), Đạp liên hồi (phạt đứng sau). Yếu khi vừa đáp; trúng trên không thì rơi. Tối đa 2 con trên không.

**Bọ Hung Lăn Bùn** (yêu đầm, trâu; Rừng sung, Đồng lầy; chung rig với phương án lùi của agent cốt truyện). Mánh *cục bùn*: lăn 14 m, bẻ ≤ 15°/s, đỏ đồng, quật ngã; đập cây, cọc thì vỡ thành vũng; trúng cả quái khác. Thêm Lăn vòng, Húc sừng hất, Xô vỏ. Mất cục bùn thì chậm ×0,7, quay lưng nặn cục mới 2,5 s (lưng ×1,5); cục bị phá (80 máu) thì giận, húc liên tục 8 s.

## 5. Boss Lợn Lòi Đầm: "chủ bãi lầy" (`attacks_0_4`, `phases_0_4`)

**Bản sắc:** con thú dùng bùn làm giáp, làm tường, làm bẫy. Chiêu chỉ dựa trên tập tính lợn rừng (ủi đất, tắm bùn, húc, càn), không có phép.

**Đọc đòn:** rống = càn (luôn đúng); khịt dài, mõm cắm bùn = hất bùn; ụt ịt = đi tắm bùn; lau rạp ở mép sân = sắp xông ra. Idle cọ cổ (bàn giao của agent cốt truyện); cốt truyện boss do họ chốt.

**10 chiêu mới** (cửa phạt đo bằng `punish_window_s`):

| Chiêu | Đọc | Lời giải | Cửa phạt |
|---|---|---|---|
| **Cày nanh** (đặc trưng) | Mõm cắm bùn, khịt dài, đỏ đồng | Cày 10 m, dựng hai bờ bùn 1,2 m trong 4 s làm sân đổi hình; né ngang sớm, vượt bờ bùn | 1,0 s, đầu kẹt bùn |
| **Tắm bùn giáp** | Ụt ịt, đi về vũng | Được 2 lớp giáp bùn (80/lớp, Thế mặt trước ×0,6). Lúc nó lăn, lưng lộ: 2 đòn nặng làm nó khựng. Dụ nó xa vũng | 1,6 s |
| **Hất mõm bùn** | Mõm cắm bùn, hông phồng | Ủi hất bùn (không phun), mù bùn 2 s, thường nối vào càn: nghe tiếng rống | 0,6 s |
| **Ủi nhấc** | Đầu chúi nghiêng, ịt ngắn, đỏ đồng | Đòn bắt phạt người giơ thủ ≥ 2 s; **né tới**. Bị hất thì bấm Nhảy lúc chạm đất để không ngã | 0,9 s |
| **Xé lau đâm ngang** | Lau mép sân rạp vào, tiếng lau gãy chạy vòng | Phạt đứng sát mép sân > 2,5 s; đòn từ ngoài khung hình có thêm 0,25 s | 1,2 s |
| **Càn ba góc** (đặc trưng, P2) | 3 tiếng rống | Né 3 lần; dụ lượt cuối vào cọc: choáng 2,4 s, mất 60 Thế, mở Ghì nanh | 1,6 s |
| **Nhấn chìm lầy** (đặc trưng, P2) | Chồm, lau cả sân run 1,6 s | Cả sân thành lầy sâu 3,5 s (×0,45, né ×0,5); chạy lên 1 trong 4 gò khô | 0,8 s |
| **Nanh xoáy** (P2) | Lắc đầu hai lần, rít cao dần | Nhảy qua vòng thấp hoặc lùi ra ngoài 3,2 m | 1,0 s |
| **Dậm đuổi** (P2) | 3 nhịp dậm theo nhịp trống 0,6 s | Đỡ nhịp ba lần; nhịp ba hoàn hảo mở Phản nhịp | 0,9 s |
| **Bật tung lầy** | Bọt dồn dưới chân, mặt bùn phồng 1,2 s | Né khỏi chỗ phồng; lần đầu sát thương ×0,5 | 1,0 s |

**Pha 1 "Chủ bãi lầy"** (12 chiêu: 5 cũ, Sóng bùn, Cào móng giả, 5 mới). Chuỗi: 2 cũ, Khịt rồi càn, Cày rồi hất (Phản nhịp), Hất-quật-ủi.

**Chuyển pha "Lặn lầy"** (6 s, điện ảnh mà vẫn chơi): con thú phi vào vũng lớn, lặn mất; im lặng, chỉ còn tiếng bọt; vệt bọt chạy hai vòng quanh Cói; mặt bùn phồng rồi Bật tung lầy (chậm ×0,5, camera thấp nhìn lên); nước rút, 3 cọc lộ ra (0.3).

**Pha 2 "Lầy dậy"** (12 chiêu, không đòn giả, 1 đòn trễ). Chuỗi: Giãy dồn, Sóng bùn đôi, Chìm rồi sóng (đứng trên gò thì nhảy qua được), Giãy rồi xoáy, Dậm rồi hất (4 nhịp đỡ). Kết bằng Ghì nanh và cạy như 0.3.

**Luật công bằng** (`boss_rules_0_4`, validator kiểm): mỗi pha ≥ 8 chiêu, ≤ 60% không đỡ được, ≤ 1 đòn trễ, ≤ 1 đòn giả; đòn không đỡ được có sát thương cần cửa phạt ≥ 0,8 s; sàn báo hiệu trong chuỗi như 0.3. **Độ khó** (`difficulty_0_4`): Nghe chuyện chỉ 2 lượt càn ba góc, lầy 2,5 s, không phạt giơ thủ; Thác dữ lầy 4 s.

## 6. Bản đồ `ch_longbien` bán mở (`world_0_4.json`, `map.json` → `map_0_4`)

**Diện tích** (raster 2 m, validator đo): đất đi được **40 348 m²**, gấp **4,83 lần** 8 356 m² của 0.3. Một khối liền: mọi ô đi được đều tới được từ điểm xuất phát. Khung bản đồ 285 × 310 m.

**Tương thích:** mọi id `POINTS`, `AREAS`, `ENCOUNTER_LAYOUT`, `VAULTS` của `world.js` giữ tọa độ (`legacy_map`, validator so); vùng mới bao quanh; chỉ đổi hành vi cổng bãi lầy.

| Vùng mới | m² (raster, tính cả phần chồng) | Đặc điểm |
|---|---|---|
| Bãi bồi bến cũ | 2 800 | Phía đông Bến Sậy; thuyền mục, lưới rách; cào cào |
| Đồi gò sim | 6 300 | Heightmap: đỉnh 9 m (điểm nhìn 60 m), gò 4 m và 6 m, sống đồi, **bờ dốc 2,4 m một chiều xuống Bãi lau** (lối tắt) |
| Rừng sung già | 5 700 | Cây sung ba thân làm mốc; hộc rễ trũng 1,2 m; bọ hung |
| Đồng lầy bắc | 5 100 | Gò nổi lún, rương đầu đàn; cổng bắc vào bãi lầy; bếp lửa đầu đê |
| Rạch nước tây | 5 800 | Rạch lội được, nước sâu không bơi; đu sào sang cù lao; bè chuối làm cầu tắt |
| Rừng lau sâu | 5 400 | Mê lộ tường lau; cây gạo trụi 22 m; ba bọ ngựa phục |
| Sân lò ngoài | 1 900 | Nền lò cao 3 m (leo dây leo lên nóc), ống khói 14 m; đê tây nối Đồng lầy bắc |

**Đường đi:** ba đường chính (giữa 135 m, đông 389 m, tây 427 m) khép vòng quanh bãi lầy; 13 đường phụ, 3 lối tắt. Khoảng xa nhất giữa hai điểm đáng chú ý trên mọi đường là **60 m ≈ 12 s chạy**, dưới đích 60–90 s (validator: `pacing.max_gap_s` = 75). Mới: 3 bếp lửa, 7 điểm nhìn, 7 rương, 7 bí mật môi trường, 4 vệt dấu, 5 điểm hái, 8 điểm leo/vượt, 11 nhóm quái.

**Cổng boss:** tìm ≥ 2 trên 4 vệt dấu thì cổng nam (cọc 0.3) và cổng bắc mở. Người chơi lần theo dấu con thú (N4) qua ít nhất một nhánh. Có 4 vệt mà chỉ cần 2 nên không thể kẹt. Cần agent cốt truyện gắn vào quest.

**Mốc thị giác** (N5): mốc cao là ống khói lò, cây gạo trụi, cây sim đỉnh gò, tán sung ba thân, cột sương bãi lầy; mốc dắt lối là đàn cò bay về vệt dấu gần nhất chưa tìm và vệt bùn khô dọc đường chính.

## 7. Dữ liệu đã thêm

Chỉ thêm khối `*_0_4` (ArpgCore đọc trường cũ, CTest vẫn qua); schema ở `design/schema/README.md`.
- `weapons.json`: `moves_0_4` (giáo 15, rìu 16), `chains_0_4`, `skills_0_4`.
- `skills.json`: `rules_0_4`, `skills_0_4`, `move_unlocks_0_4` (14 nút), `xp_sources_0_4`.
- `enemies.json`: bộ chiêu, mánh, điểm yếu, hành vi của 3 quái thường; boss (10 chiêu, 2 pha, 6 chuỗi, chuyển pha); gốc `enemies_0_4` (2 quái mới).
- `combat_tuning.json`: 8 khối (input, Đà, di chuyển, né, leo/vượt, cảm giác đòn, AI, luật boss).
- `world_0_4.json` (mới), `map.json` → `map_0_4`; validator `check_demo_0_4`, `check_world_0_4`; 14 test `Combat04`.

## 8. Kiểm luật thể hiện

Không địch là người; không loài nước, rắn, bò sát, cáo ở chương 1 (validator chặn cả `enemies_0_4`); không đòn phun; quái thua thì chạy hoặc tan, đồ rơi là thiếc, sợi gai, đồ người làng; khoen không phép, lực trong chiêu boss là bùn và cọc; không bơi; đỏ đồng chỉ để báo hiệu.

## 9. Giả định cần playtest

- Đà 3 nấc có làm HUD rối? Đích: ≥ 3/5 người thử tự dùng đòn sau né hoàn hảo.
- Đòn bắt có làm người chơi sợ giơ thủ quá mức? Nhấn chìm lầy 3,5 s có ức chế?
- Bản đồ 4,8 lần có thành đi bộ? Đích: giữa hai trận ≤ 25 s chạy. Cổng 2/4 vệt dấu có phiền?
- Hỏi lại PO: "Chiêu quái, boss còn dở không? Bản đồ đủ phiêu lưu chưa?" (1–5, đích ≥ 4).

## Nguồn (trích đoạn tìm kiếm 2026-11-07, chưa đối chiếu trong game)

game8.co/games/God-of-War-2018/archives/316122; godofwar.fandom.com/wiki/Blessings_of_the_Frost_(Runic_Attack); gamepressure.com/black-myth-wu-kong/combat-system/z211583; deltiasgaming.com/?p=65771; blackmythwukong.fandom.com/wiki/Staff_Stances; sekiroshadowsdietwice.wiki.fextralife.com/Posture; samurai-gamers.com/sekiro-shadows-die-twice/posture-system; game-wisdom.com/critical/breakdown-sekiros-combat-broken; game-wisdom.com/critical/impact-dark-souls-boss-design; gamepressure.com/lies-of-p/groggy/zc10d6a; liesofp.wiki.fextralife.com/Combat; gamerbraves.com/monster-hunter-wilds-developer-interview…; press-start.com.au/features/2025/01/03/monster-hunter-wilds-interview; medium.com/@lurlichs/what-actually-makes-a-good-enemy-c4d7a24e491c; rpgsite.net/feature/5278; critpoints.net/2017/03/09/what-makes-niohs-ki-burst-fun; choostgames.com/blog/what-makes-a-good-boss-fight; gamedeveloper.com/design/a-taxonomy-of-weenies-the-landmarks-that-define-i-ghost-of-tsushima-i-; gamesradar.com/elden-ring-is-a-great-example-of-an-open-world-working-smarter-game-devs-say.
