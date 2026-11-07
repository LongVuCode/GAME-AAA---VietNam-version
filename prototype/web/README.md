# Track W — Prototype web Demo 0.2 (graybox)

Bản **thử nhịp chơi** của Demo 0.1/0.2 (lát cắt `ch_longbien`; 0.2 = fun pass `design/FUN_PASS_0_2.md`), chạy trong trình duyệt bằng three.js. Hình khối cơ bản, âm thanh tổng hợp bằng WebAudio. **Không phải đồ họa cuối cùng**; sẽ bỏ khi bản Unreal (Track U) thay thế được (xem `docs/DEMO_PLAN.md`).

Kết quả build là **một file HTML duy nhất** `dist/index.html`: JS (three.js r169 + logic) và toàn bộ `design/data/*.json` được nhúng lúc build; khi chạy không tải gì từ mạng (smoke test kiểm tra điều này).

## Build, chạy, test

```bash
cd prototype/web
npm ci              # three 0.169.0, esbuild 0.24.0 (ghim chính xác, có package-lock.json)
npm run build       # → dist/index.html
npm test            # unit test logic: node --test test/*.test.mjs
npm run smoke       # build + Playwright smoke test (cần gói `playwright` có sẵn trong môi trường)
```

- Chạy: mở `dist/index.html` trực tiếp trong Chrome/Edge/Firefox bản mới (cần WebGL2), hoặc publish file này thành trang web.
- `?debug=1`: bật hook `window.__demo` (chỉ dùng cho kiểm thử tự động, không bật khi gửi người test). Thêm cho 0.2: `playerInfo()` (tốc độ, dáng, góc khớp rig), `feedbackLog()`, `bindings()`, `enemyDetail(uid)`.
- `?khoen=0`: tắt cờ `feature_khoen` (V9) để thử phương án lùi K0: boss kết bằng cú đẩy (lời nhắc `prompt_finisher_shove`), vẫn rụng nanh.
- Smoke test lưu ảnh chụp vào thư mục ngoài repo (mặc định thư mục scratchpad của phiên; đổi bằng biến môi trường `SHOTS_DIR`).
- Dữ liệu: sửa `design/data/*.json` rồi build lại. Chuỗi hiển thị mới phải thêm vào `design/data/strings.json` (đủ `vi` + `en`) và chạy `python3 tools/design_validate.py`. Test `strings.test.mjs` bắt khóa chuỗi thiếu và chữ tiếng Việt viết cứng trong code.

## Điều khiển (mặc định, đọc từ `design/data/controls.json`)

Phím lấy từ `controls.json` (đề xuất của UX/Controls Researcher, chờ PO duyệt); **đổi được** trong Tạm dừng → Phím → **Đổi phím** (bấm ô → bấm phím/nút mới; trùng thì hai hành động đổi chỗ; 2 phím mỗi hành động trên bàn phím; khôi phục mặc định; lưu `localStorage`, có báo khi trình duyệt chặn). Lời nhắc trên HUD hiện biểu tượng đúng thiết bị bấm gần nhất (bàn phím/chuột hoặc tay cầm Xbox/PlayStation; chỉnh ở Cài đặt → Điều khiển → Biểu tượng nút).

| Việc | Bàn phím + chuột | Tay cầm (standard) |
|---|---|---|
| Di chuyển | W A S D | Cần trái (nghiêng nhẹ = đi, hết = chạy) |
| **Chạy nhanh** | Shift trái (giữ; tùy chọn bật/tắt hoặc tự động) | L3 (bấm một lần, tự dừng khi buông cần) |
| Đi chậm | Caps Lock (bật/tắt; tùy chọn giữ) | nghiêng cần nhẹ |
| Camera | Chuột (bấm màn hình để khóa chuột), phím mũi tên | Cần phải |
| **Nhảy** (giữ lâu nhảy cao; 0.3) | Phím cách | A / ✕ |
| Né (lăn theo hướng đang bấm; không bấm hướng = lùi bước; đang chạy nhanh = trượt) | **C** (preset: Shift kiểu Souls, V, chuột cạnh sau) | B / ○ |
| Đòn nhẹ / đòn nặng (giữ để gồng) | Chuột trái / chuột phải | X / Y |
| Đỡ nhịp (bấm) / Đỡ (giữ) | Q | LB |
| Khóa mục tiêu / đổi mục tiêu | Chuột giữa hoặc Tab / lăn chuột | R3 / gạt cần phải |
| Hồi trống (đủ 4 nấc) | F | RT |
| Tương tác, **Phản nhịp**, đòn kết "Đuổi đi", Cạy, **Ghì nanh** (bấm đúng tiếng trống), Vượt; **giữ** cạnh người bị mê = Gọi tên | E | RB / R1 |
| **Thế võ 1 / 2** (0.3) | 3 / 4 | giữ LT + X / Y (theo nút đòn; tùy chọn bấm LT một lần) |
| **Hành trang / Bản đồ** (0.3) | B / M | View bấm / giữ 0,4 s |
| Ăn nắm cơm lá | R | D-pad ↑ |
| Vũ khí ô 1 / 2 (đổi được giữa combo) | 1 / 2 | D-pad ← / → |
| Sổ tay / Kỹ năng (Codex là thẻ trong Hành trang) | J / K | — |
| Tạm dừng (không đổi được) | Esc | Menu |
| FPS | ` | — |

Sơ đồ 0.3 (`controls.json scheme_0_3`) được **gộp lúc khởi động** (`logic/controls.js applyScheme03`, gọi trong `logic/tuning.js`); JSON giữ nguyên. Phím đã lưu theo sơ đồ 0.2 (Space = né) bị bỏ một lần. Preset bàn phím (`kbm_presets`) có trong `Bindings.applyKbmPreset` (chưa có ô chọn trong màn Đổi phím: màn đó thuộc agent UI). Nút chuột cạnh: chặn điều hướng Quay lại khi đang chơi, **chưa kiểm trên mọi trình duyệt**. Vẫn **vượt theo ngữ cảnh**: chạy nhanh vào khúc gỗ đổ / rạch nước, hoặc đứng sát bấm Tương tác; nhảy cao ≥ 0,6 m cũng qua được. Kiểu tay cầm "Đòn trên vai" (`pad_presets`) chọn trong màn Đổi phím. Tùy chọn điều khiển (Cài đặt → Điều khiển, từ `controls.json accessibility_options`): kiểu chạy nhanh/đi chậm/đỡ/gồng/gọi tên (giữ hoặc bật/tắt), độ trễ chạy tự động, giữ nút né để chạy, đảo trục từng thiết bị, độ nhạy chuột/cần, vùng chết, đổi hai cần, biểu tượng nút, cường độ rung. Rung tay cầm qua `gamepad.vibrationActuator` nếu trình duyệt hỗ trợ.

## Demo 0.2: chuyển động, animation, combat feel (FUN_PASS_0_2 P0)

- **Di chuyển** (`logic/locomotion.js`, `combat_tuning.movement`): đi 2,2 / chạy 5,0 / chạy nhanh 7,2 m/s; tăng tốc 30, giảm 40 m/s² (tới tốc độ chạy ≤ 0,2 s, dừng ≤ 0,15 s — có unit test); tốc độ xoay theo dáng (900/720/300°/s), bước xoay gắt khi quay đầu > 135°, trượt 0,3 s khi dừng sau chạy nhanh, nghiêng người khi rẽ và khi tăng tốc; khóa mục tiêu thì đi ngang (3,8 m/s), chạy nhanh phá thế đi ngang. Chạy nhanh: **Thế ngừng hồi** (`sprint_the_regen_mult`), FOV +6° (`fx.setFovOffset('sprint')`), camera lùi 7,3 m, bụi bước chân dày hơn (bước chân đặt theo nhịp chân của animation).
- **Né** (`dodge`): 8 hướng theo camera, không bấm hướng = lùi bước 2 m, từ chạy nhanh 4,5 m, tối đa 2 lần liền rồi thêm 0,25 s; i-frame giữ nguyên (`DefenseController`). Khóa mục tiêu: lăn trước/sau/ngang mà vẫn nhìn mục tiêu.
- **Đòn có 3 pha và bước tới** (`logic/attackMotion.js`, `moves[].motion`): bước `lunge_m` trong startup, hút mục tiêu trong 1,5 m (dừng cách 45 % tầm đánh, không đi xuyên), xoay theo mục tiêu 540°/s tới lúc chạm rồi khóa hướng; **chạm quét suốt khung active** (giáo đâm: tầm dài dần; rìu/quét cán: lưỡi quét qua cung, chỉ trúng phần đã quét; xoay rìu 360°), mỗi địch trúng một lần mỗi đòn. Lùi sau đòn (`self_move_after_m`), trôi theo đà (`self_drift_m`). **Đòn chạy đà** (`sprint_attack`, chạy nhanh ≥ 0,4 s), **đổi vũ khí giữa combo** (trong hồi đòn, 0,15 s, đòn nhẹ ngay sau là `swap_attack` ×1,3 Thế), gồng chịu đòn nhẹ (`charge_armor_from_level`), mỗi mức gồng: lóe ở mũi, trống nhỏ, camera dí vào, rung tay.
- **Animation thủ tục** (`src/anim/`): người chơi và NPC là rig có khớp (hông, cột sống, ngực, đầu, 2 tay có khuỷu, 2 chân có gối và bàn chân); hai tay bám cán vũ khí bằng IK hai đoạn (`anim/ik.js`), vũ khí điều khiển trong không gian ngực (`anim/pose.js`). Chu kỳ đi/chạy/chạy nhanh theo quãng đường và sải (`stride_*`), nhún hông, xoay ngực ngược, thở khi đứng; **16 đòn giáo/rìu** có khung lấy đà → chạm → dư đà → hồi (`anim/humanoidPoses.js`, theo `moves[].motion`), gồng run rẩy, lăn né cuộn tròn, đỡ nhịp gạt, đỡ giữ, Hồi trống (dậm chân + đâm/bổ theo nhịp, cách điệu đánh trống), ăn, gọi tên, cạy 3 nhịp (mỗi nhịp đè cán xuống một nấc), chế tác (khi mở lò đúc), **bàn giao** (Cói quỳ, hai tay đưa Mũi Sào, 1,8 s trước các thẻ), vượt, bị trúng (lớp cộng bằng lò xo: giật, lùi, nghiêng theo hướng đòn), bị quật ngã rồi dậy (0,8 s i-frame). Quái (`anim/creatures.js`): cua bò ngang, giơ càng, kẹp, co mai, bị lật ngửa; bọ ngựa đung đưa, chém đôi, rình rồi khựng, vồ, nhảy lùi xòe cánh; Ụ Bùn thở phập phồng, giơ khối bùn đập, lún xuống trồi lên; Lợn Lòi Đầm đi nước kiệu, phi khi càn, **cào chân lấy đà**, hất nanh, quật đầu đôi, chồm dậm, ủi bùn, **quay hông**, **dụi cổ**, khuỵu.
- **Địch phản ứng** (`hit_react`, `behavior.hit_react`): khựng 0,18/0,30/0,45 s và bị đẩy theo sức đòn × hệ số loài (boss không bị đẩy, Ụ Bùn chỉ khựng từ đòn vừa), Móc lưỡi kéo lại; khựng không ngắt đòn đang vung. Người chơi bị đẩy theo `player_knockback_m`, đòn càn quật ngã.
- **Mỗi cú trúng ≥ 6 lớp** (đếm trong `__demo.feedbackLog()`): hit-stop, hạt theo vật liệu, âm nhiều lớp, nháy, rung camera, **đẩy camera theo hướng đòn**, đẩy/khựng địch, rung tay cầm (nếu có), **số Thế bay lên** ("Vỡ Thế!" khi vỡ), FOV kick với đòn nặng.
- **Đòn kết quái thường** (`finisher`): 0,9 s, bất tử, camera hạ thấp xoay 30°, FOV 52, chậm lúc chạm; cua bị lật ngửa rồi chui bùn, bọ ngựa văng ngửa rồi bay vào lau, Ụ Bùn sụp thành vũng — **không giết**.
- **Camera combat**: theo sau có độ trễ 0,08 s, khóa mục tiêu xoay mượt và dời tâm khung về phía mục tiêu (boss: lùi 8,5 m, giữ cả con thú trong khung), cạy: dí vào và xoay mỗi nhịp, nhả cạy chậm 0,4 s (chỉ thời gian game).
- **Địch có tính cách** (`behavior`, `enemy_ai`): tốc độ/bán kính/tầm khiêu khích/xích lấy từ dữ liệu (thay hằng tạm trong `proto.js`); kẻ chưa có lượt **đi vòng** ở vành 3,5 m (bọ ngựa đánh sườn), sau đòn có thể lùi; chọn đòn theo tầm và độ mới (đòn vừa dùng ×0,5, không quá 2 lần liền); Thế địch ≥ 70 %: cua co mai (mai trước ×0,4), bọ ngựa nhảy xa; Thế người chơi ≥ 70 %: địch hăng ×1,4; đứng sau lưng cua 1,2 s / lợn 1,5 s bị quay đòn sau; đuổi bọ ngựa gấp bị nhảy lùi chém; đứng xa Ụ Bùn bị "Lăn ụ", Ụ Bùn lún xuống trồi chỗ khác; lượt đánh ưu tiên địch trong khung hình, đòn từ ngoài khung báo hiệu thêm 0,25 s và luôn có âm báo có hướng. Đòn `attacks_0_2` đã thêm.
- **Boss**: thêm Quay hông (2 pha) và Dụi cổ (pha 2; đánh vào cổ từ bên hông ×1,5 Thế, số Thế vàng); **chuyển pha "Húc cọc"** 4 s (`transition_set_piece_0_2`): con thú bỏ mặc Cói, càn vào cọc bẫy gãy ở mép bãi (tóe tia đồng cọ gỗ, cọc gãy), khuỵu dụi cổ, 2,6 s Cói nói "Ai trói mày thế này?", vũng lầy thứ 4 lan ra; người chơi đi/đỡ/né được, không đánh được; boss bất tử trong cảnh.
- **Nhóm giao tranh** theo `encounters_0_2` (cua đơn, cua đôi, Ụ Bùn + cua, bọ ngựa phục đôi, bọ ngựa + cua, Ụ Bùn ở lò).
- **`tuning_changes_0_2`** (HP boss 1600, pha 2 tốc độ 0,95 / báo hiệu 1,15, Nhịp trống, hit-stop nhẹ 0,05) chỉ áp **trong prototype** qua lớp override (`logic/tuning.js`, `DATA_02`); JSON gốc giữ nguyên để không vỡ `ConfigTests.cpp`. Unit test kiểm cả hai.

## Demo 0.3: gameplay & combat (`logic/jump.js`, `logic/skills.js`, `logic/boss03.js`, `game/gameplay03.js`)

- **Nhảy** (`movement.jump`): cao 1,1 m / tối thiểu 0,5 m (thả sớm cắt 45 % vận tốc lên), lên đỉnh 0,32 s, rơi ×1,4 (bay ≈ 0,59 s), lấy đà 0,05 s, đệm nhấn 0,12 s, coyote 0,10 s (graybox phẳng nên coyote chỉ có ý nghĩa ở mép vượt), điều khiển trên không 35 %, xoay 240°/s, giữ đà chạy nhanh. Không i-frame, không né/đỡ/ăn/Thế võ trên không; nhảy hủy hồi đòn (sau 0,1 s) và hồi né. Tiếp đất: khựng theo độ cao (> 1,2 m), nén thân, camera hạ, bụi/bùn/nước theo bề mặt. Rig: nhún lấy đà → co gối → duỗi ở đỉnh → chân với xuống; bóng tròn ở lại mặt đất.
- **Đòn trên không** (`air_moves_0_3`): một đòn nhẹ mỗi lần nhảy (treo 0,12 s); đòn nặng từ ≥ 0,6 m = **bổ xuống** 18 m/s, sóng xung kích 2,5 / 3,0 m, +15 Nhịp, hồi 0,45 / 0,55 s (né hủy sau 0,25 s).
- **Hủy bằng né** (`dodge_cancel_0_3`): hồi đòn, gồng, Thế võ sau pha chạm, khựng tiếp đất, hồi bổ xuống; né hoàn hảo ngay sau khi hủy +10 Nhịp; chuỗi đòn nhẹ giữ 0,6 s. Né khi đang chạy nhanh về phía trước = **trượt** thấp.
- **Phản nhịp** (`riposte_0_3`): Đỡ nhịp hoàn hảo bước có `riposte_on_perfect_parry` (hoặc Dậm chậm) → con thú hở 1 s, lời nhắc E trong 0,6 s → 30 sát thương / 70 Thế, bất tử 0,8 s, chậm ×0,3, camera xoay 25°, +40 Nhịp, 1 lần mỗi chuỗi.
- **Thế võ** (`skills.json`): 2 mỗi vũ khí (Cắm sào vọt, Quét sóng, Bổ đốn cây, Móc thuyền) theo bậc `game.progress.getSkillLevel` (0 = khóa), hồi chiêu `levels[].cooldown_s × stats.skill_cooldown_mult` bắt đầu lúc kết thúc, chạy cả khi đổi vũ khí; HUD qua `hud.setSkills/setCooldown`. Giáp (`damageReduction`), `hpMax`, `theMax`, chống lún đọc từ `getStats()`.
- **Hồi trống điện ảnh**: mở 0,45 s chậm ×0,2, camera thấp trước mặt theo `drum_burst_0_3.camera_script`, mỗi nhịp một sóng xung kích (25 % sát thương nhịp cho địch trong vòng), nhịp cuối 6–7 m + đẩy quái thường + chậm 0,45 s + FOV +6°; bất tử, HUD ẩn, địch trong 8 m đứng yên. Tôn trọng `acc_slowmo`, `acc_burst_camera_simple`, "Rung camera", "Giảm nhấp nháy".
- **Lợn Lòi Đầm 0.3** (`?boss03=0` chạy lại boss 0.2 để so sánh): 5 đòn mới (Sóng bùn = vòng 1,5→9 m chỉ nhảy ≥ 0,35 m hoặc né xuyên mới thoát; Càn xuyên bãi tới mép bãi để **vệt bùn** 8 s ×0,6 cấm chạy nhanh; Cào móng giả không rống; Càn hai lượt quay lại nhắm ≤ 35°; Dậm chậm giữ 0,6 s), 4 chuỗi (bước sau nhanh hơn nhưng không dưới 0,3 / 0,9 s), không dùng chung token với quái thường, nghỉ 0,4–1,0 s, phạt ăn gần / lăn liên tục (Ngược nước+) / đứng xa / đứng sau lưng; độ khó theo `difficulty_0_3` (báo hiệu không bao giờ ngắn đi). **Pha 2**: tốc độ 1,0, báo hiệu ×1,1, bỏ Càn khuỵu, vũng lầy co 60 % trong 6 s, **3 cọc** trồi lên; đứng trước cọc để dụ càn → cọc gãy, con thú khựng 2,2 s, −60 Thế; lúc đó **Ghì nanh** (E, 2 nhịp trống theo luật cạy, chấm theo **thời gian thực**, 1 lần mỗi trận, tự động ở Nghe chuyện): đúng = vỡ Thế + một vết nứt khoen, trượt = bị hất 2,5 m, −10 Sức. Camera điện ảnh khi chuyển pha. Vẫn kết bằng cạy.
- **Rơi đồ** khi quái bỏ chạy/tan (`drops` + `xp_sources`) thành gói nhặt được tại chỗ → `progress.addItem/addXp`.
- **Đo "khó hơn"**: `node test/bossbench.mjs [lượt] [giây] [độ khó]` chạy thật Player/Enemy/BossEncounter trong node (60 Hz, không render) với cùng bot và cùng seed cho boss 0.2 và 0.3.
- Hằng prototype chưa có trong dữ liệu: tốc độ càn xuyên bãi trần 22 m/s, hồi chuỗi 8 s, dụ cọc 7 s, cửa sổ chọn chuỗi một lần mỗi quyết định; chưa có lời thoại khẽ của Cói khi Ghì nanh (thiếu chuỗi trong `strings.json`).

## Demo 0.3: Hành trang, bản đồ, minimap (`src/ui/inventory`, `src/ui/map`)

- **Hành trang (B)** dừng game; thẻ Trang bị | Túi đồ | Kỹ năng | Bản đồ | Sổ tay | Codex (Q/E hoặc LB/RB; J/K/M mở thẳng thẻ; B/Esc đóng). Trang bị: 9 ô theo `items.gear_0_3.slots` (Vũ khí 2 mở ở đời Bương, Vật đeo 2 mở sau khi gọi tỉnh người bị mê), viền màu độ hiếm + khía góc, nhân vật 3D (rig người chơi, renderer WebGL thứ hai, kéo chuột để xoay, phóng gần khi chọn ô Đầu), bảng chỉ số, so sánh ▲ xanh ngọc / ▼ ngà gạch dưới, nâng cấp +1..+3 (trừ nguyên liệu theo `upgrades.costs`, chỉ ở gần lò đúc). Kỹ năng: Thế võ (bậc kim cương, hồi chiêu, mở/nâng bằng Kinh nghiệm, học lại ở bếp lửa) + cây Nghề nhà cũ. Sổ tay/Codex giữ nội dung cũ.
- **Bản đồ (M)**: vẽ từ hình học `world.js` + `map.json` lên "vải gai", sương 4 m tan 14 m quanh người chơi (điểm nhìn 25–30 m), mốc + chú giải 17 biểu tượng, tối đa 8 dấu tự đặt, theo dõi mục tiêu, tiến độ vùng, đi nhanh giữa bếp lửa đã thấy (chặn khi giao chiến / ở bãi lầy). **Minimap** tròn góc trên-trái (xoay theo camera, tùy chọn hướng bắc), dùng chung sương.
- **Điểm mới** trong `POINTS`: 5 điểm nhìn (tự phát hiện khi tới gần), 2 rương, 3 bí mật môi trường (Tương tác), phần thưởng theo `map.json`.
- **API `game.progress`** (`logic/progression.js`, test `inventory.test.mjs`): `getStats(weaponId?)` → `{ hpMax, theMax, armor, damageReduction, stats{ guard_the_cost_mult, drum_gain_mult, the_regen_delay_mult, skill_cooldown_mult, weapon_damage_mult, ... }, effects[], sets[] }`, `getSkillLevel(id)`, `getSkillInfo(id)`, `addItem(id, n)`, `addXp(n)`, `awardXp(kind, ref)`, `onChange(fn)`. Giả định chưa có trong dữ liệu: giới hạn chồng (`STACK_LIMITS`), sức chứa đồ rời 24, nâng giáp chỉ nhân chỉ số `armor`.

## Demo 0.4: cốt truyện trong lúc chơi (`src/story`, `src/ui/story`)

Đặc tả: `research/narrative/STORY_INTEGRATION_0_4.md` (v1.1); dữ liệu `dialogue.json`, `quests.json`, `cinematics.json`, `creatures_0_4.json`.
- **Cảnh dựng** (`story/timeline.js` thuần + `story/director.js`): shot camera, letterbox, phụ đề vi/en có tên người nói, giữ **Phím cách** (pad: A) để bỏ qua. Chạy trên thời gian thực (`wallDt`), không đụng hit-stop/slow-mo/đồng hồ cạy. `cin_cold_open` khi chơi mới (toast phím dời ra sau cảnh); `cin_handoff` có 4 lần **giữ E** (khắc vạch, buộc dải chàm lên sào, lắp cán, ông Vầu buộc dải mới); `cin_demo_hook` sau trận tập của Bương. Vị trí người/đạo cụ từng shot: `story/staging.js`.
- **NPC**: bà Mơ, Nghệ, Năn, chú Đót, bác Sung, ông Vầu, bé Kê (rig người, khác màu áo/khăn/nón). Hộp thoại có tên, lựa chọn bấm 1/2 hoặc chuột; lựa chọn chỉ đặt cờ `flag_choice_*`, mọi nhánh hội tụ. Dấu thoi trên đầu NPC có chuyện mới. Bark combat/Ghì nanh/cạy, vè của Năn theo điều kiện.
- **Nhiệm vụ** (`story/quests.js`): "Người chưa về" 6 bước + chuyển đời + 3 việc phụ; theo dõi ở HUD trên-phải (tên, bước, "Vì sao"), Sổ tay trong Hành trang, mục tiêu trên bản đồ/minimap, băng rôn bắt đầu/hoàn thành. Điểm kể chuyện `quests.new_points` trong `POINTS` (Xem kỹ → mô tả + mở Codex).
- Tên quái hiển thị từ `creatures_0_4.json` (id giữ nguyên). Test: `test/story04.test.mjs`; smoke có phần Story 0.4 (ảnh ở `story04-shots/` cạnh thư mục ảnh smoke). Chỉ để test: `?debug=1&intro=0` bỏ cảnh mở.

## Demo 0.4: môi trường và bản đồ lớn (`src/env`, `src/game/world04.js`)

- **Bản đồ lớn**: game chạy trên `design/data/world_0_4.json` (designer; diện tích đi được 40 348 m², 4,83× vùng 0.3 theo `tools/design_validate.py`): 7 vùng mới quanh 5 vùng cũ (Bãi bồi bến cũ, Đồi gò sim, Rừng sung già, Đồng lầy bắc, Rạch nước tây, Rừng lau sâu, Sân lò ngoài), 3 hành lang mới, 5 tường lau + 1 dải nước sâu (chặn), 2 rạch lội (chậm), 43 điểm mới (`POINTS.push(...POINTS_04)`, cùng id/tọa độ với dữ liệu). Mọi id/vùng/điểm 0.3 giữ nguyên tọa độ; vùng mới chồng lên vùng cũ (không có tường vô hình ở mép). Bản đồ/minimap dùng `map.json` + khối `map_0_4` (gộp trong `world04.mergeMap04`, vùng là đa giác).
- **Độ cao**: `groundAt(x, z)` (world.js) = heightmap của `world_0_4` (`region.height_m` + đồi/sống/bậc/lòng chảo + nhiễu), cùng một trường độ cao với mặt đất được vẽ (`env/field.js`, lưới 1 m, nội suy song tuyến). Người chơi, quái, hiệu ứng trúng đòn đứng trên mặt đất; rơi khỏi bờ dốc có trọng lực (`Player.groundY`); camera luôn cao hơn đất 0,45 m. Dốc lên quá 35° (`max_walkable_slope_deg`) không đi được: bờ dốc 2,4 m của Đồi gò (`ledge_go_lau`) chỉ nhảy xuống, không leo ngược. Thân cây trong Rừng sung là vật cản. `Walkable.bossGates` có sẵn để lớp cốt truyện đóng/mở cổng bãi lầy (mặc định mở như 0.3).
- **Môi trường PBR**: HDRI CC0 + PMREM (IBL), terrain 5 lớp CC0 trộn theo độ cao vân, độ dốc (dốc thì đất trơ thay cỏ) và độ ẩm (bùn ướt sẫm, bóng mờ); nước nông phản chiếu bầu trời/HDRI, độ trong theo độ sâu, mép nước theo mặt đất (không mép chữ nhật); lau/cỏ là thẻ alpha instancing chia ô 24 m có LOD mật độ theo khoảng cách; cây (sung tự dựng + tán bổ sung) instancing theo ô 64 m, cắt theo khoảng cách; rừng xa ở bờ ngoài là khối tán rẻ; bờ đất bao quanh đầm thay cho mặt nước vô tận; sương (height fog + mảng sương), bóng mềm theo người chơi; "mood" ánh sáng cho từng vùng 0.4. Props Blender tự dựng ([SÁNG TẠO]): nhà sàn mái thuyền cách điệu Đông Sơn, cầu tre (có cầu gãy ở Rạch nước), cọc, thuyền độc mộc (úp/mục ở Bãi bồi), lò, ống khói gạch nghiêng gãy đỉnh ở Sân lò.
- **Chất lượng** (Cài đặt → Chất lượng đồ họa): Cao = bóng, bloom, lau/cỏ dày tới 120/55 m, cây tới 190 m; Thấp = độ phân giải render 70%, không bóng, không bloom, mật độ lau/cỏ 40% và gần hơn, không cỏ dại/cành vụn, cây tới 105 m, ít mảng sương, không normal map terrain.
- **Asset**: `prototype/web/assets/` (Git LFS) — nguồn CC0 Poly Haven và file phát hành đăng ký ở `docs/ASSET_LICENSE_REGISTER.md` (L-004…L-030, có SHA-256); pipeline `tools/assets/` (tải, kiểm SHA, chỉnh màu, nén glb) và `tools/blender/build_env_props.py` (bpy). Không chạy file tải về.
- So sánh: `?world=03` vẽ lại bố cục môi trường 0.3 (chỉ để so ảnh; gameplay vẫn là 0.4). Ảnh cố định góc: `node test/envshots.mjs <thư mục> <tiền tố> high`. Test: `test/walkable.test.mjs` (lan tỏa đi được tới mọi điểm/vùng, hai chiều, bờ dốc một chiều, chặn, mép vùng), `test/env04.test.mjs`. `npm run smoke` chạy từ file:// với `env=0` mặc định (file:// không tải được asset; trên SwiftShader lớp môi trường tốn ~1,5 s/khung kể cả ở Thấp nên các đoạn bot có giới hạn thời gian không xong); gameplay (vùng đi được, độ cao) giống hệt. Môi trường đủ asset được kiểm qua HTTP bằng `test/envshots.mjs`. `SMOKE_QUERY=` (rỗng) để bật lại môi trường trong smoke.

## Có gì trong bản này

- **Khu vực graybox** theo sơ đồ DEMO_0_1_DESIGN §2: Bến Sậy (bếp lửa, bà lái đò, đò), đầm nông (nước nông làm chậm), bãi lau (người bị mê trong sương ảo), lối tắt về bến, lò bỏ hoang (bí mật), bếp lửa trước boss, bãi lầy tròn r≈18 m có 3 vũng lầy; hub bến Lau đặt riêng (lò đúc, Thạp gốm trơn, trống gỗ, bãi sông). Không hồ lớn, không đền miếu.
- **Combat đọc từ dữ liệu** (`combat_tuning`, `weapons`, `enemies`): chuỗi nhẹ 3 nhịp (+ nhịp 4 với *Nối đòn*), nặng gồng 2 mức, đòn nhánh (nhẹ, nhẹ, dừng, nặng), né rồi nhẹ, phản đòn sau Đỡ nhịp hoàn hảo, Đòn nhà *Chống sào*; input buffer; né có i-frame và né hoàn hảo; Đỡ nhịp thường/hoàn hảo, Đỡ giữ (giảm 70%, tốn Thế), vỡ Thế; Thế người chơi và địch, choáng; Nhịp trống 4 nấc (tăng/giảm/tụt đúng dữ liệu) và Hồi trống của từng vũ khí (siêu giáp); hit-stop theo trọng lượng đòn; rung camera (tắt được); lock-on + hỗ trợ nhắm theo độ khó; mai trước của cua giảm sát thương.
- **Báo hiệu đòn địch**: vòng sáng trên đầu + vòng/làn trên đất cho đòn đỡ được; vòng đôi cho đòn trễ; **tam giác đỏ đồng có dấu "!" + ánh đỏ trên thân + tiếng rền trầm chung** cho đòn không Đỡ nhịp được (không chỉ dựa vào màu). Âm báo có hướng trái/phải (tắt được). Thời gian báo hiệu nhân theo độ khó/pha, không bao giờ bị rút ngắn bởi tốc độ địch.
- **Quái thường**: Cua Càng Bùn, Bọ Ngựa Lau, Ụ Bùn; tối đa 2 con đánh cùng lúc. Hết sức thì **bỏ chạy** (cua chui bùn, bọ ngựa bay vào lau) hoặc **sụp lại thành bùn** (Ụ Bùn, theo `defeat_behavior: dissipate`); không con nào chết. Không có kẻ địch là người.
- **Boss Lợn Lòi Đầm** 2 pha theo `enemies.json`: khoen nứt 1 nấc mỗi lần vỡ Thế (HUD có 3 nấc), sang pha 2 khi nứt 2 nấc hoặc HP ≤ 50% (câu "Ai trói mày thế này?"), HP chạm sàn thì buộc choáng và mở cạy. **Cạy 3 nhịp** theo trống 84 bpm, cửa sổ ±0,15 s, phán định theo dấu thời gian phím (không phụ thuộc FPS), mỗi nhịp được thử lại 2 lần, hụt nữa thì con thú vùng ra và hồi nửa Thế (khoen giữ 3 nấc). Tùy chọn giữ nút thay bấm; mức *Nghe chuyện* cạy tự động. Sau cạy: hit-stop, **3 giây im lặng**, vè, nanh tự rụng, con thú đi vào lau. Mảnh khoen không thành vật phẩm, không có giao diện đếm.
- **Người bị mê**: không khóa mục tiêu, không đánh; giữ E 2 giây, bị đánh trúng mất nửa tiến độ; xong thì về bến, +1 điểm nghề.
- **Chuỗi bí mật "Lò bỏ hoang"** (`secrets.json`): vết bẫy (2 nguồn thay thế) → đồng vụn → chọn mảnh miệng lò khớp (sai không phạt) → hốc lò (Sáp ong cũ + đoạn Codex thêm). Manh mối ghi trong Sổ tay, không mất. Gợi ý 3 tầng chỉ khi người chơi hỏi bà lái đò; tắt được.
- **Chế tác ở hub**: thợ đúc tặng Đồng lò làng; Nanh Đầm = Nanh rụng + Đồng lò làng + Dây mây ×2 (6 điểm tước mây); nâng cấp bằng Sáp ong cũ. Bảo khí tự trang bị (+15%/+20% sát thương Thế cho đòn nặng/nhánh).
- **Bàn giao đời** (`lineage.json`): hộp xác nhận liệt kê việc còn dở → thẻ "Nhiều đời sau" → lời người giữ bến → mở Thạp (chỉ chữ) → nhận Mũi Sào → cây kỹ năng giữ nguyên (+1 điểm) → mở ô 2 rìu xéo → Bương luyện ở bãi sông với 2 hình nộm rơm và 2 Cua Càng Bùn (không thua được, mục tiêu đổi vũ khí ít nhất 1 lần) → vè bản sàn → "Giữ bến bằng tay mình." → hết demo (Ký ức: chơi lại đời Cói / về màn đầu). Nội dung đời Hùng 6 không chứa "khoen/mảnh/chốt" (unit test + smoke test kiểm), Codex không mở mục khoen mới ở đời này.
- **Hiệu ứng và ánh sáng** (`src/fx`, Demo 0.2): trời gradient + nắng thấp, sương theo độ sâu, bóng mềm, tone mapping ACES, nước nông phản chiếu giả, lau lay theo gió, "mood" theo khu và pha boss; tia lửa/bụi/bùn/nước bắn, vòng sóng, vệt vũ khí, nháy trúng đòn, slow-mo (chỉ thời gian game, không ảnh hưởng nhịp cạy), rung/FOV (tắt theo "Rung camera"), vignette khi máu thấp; âm thanh trúng đòn nhiều lớp theo vật liệu, gió vung, bước chân theo bề mặt. Cài đặt → **Chất lượng đồ họa** Cao/Thấp (Thấp: tắt bóng và bloom). Smoke test kiểm tra Cao rồi chạy phần bot ở Thấp (SwiftShader chậm, không đại diện).
- **UI**: HUD (Sức, Thế, Nhịp trống 4 nấc, nắm cơm lá, vũ khí, điểm nghề, khu vực, mục tiêu, thanh boss + nấc khoen), menu tạm dừng (vi/en, 4 mức độ khó + tùy chỉnh trong `custom_ranges`, các tùy chọn trợ năng trong dữ liệu: cỡ/nền phụ đề, rung camera, giảm nhấp nháy, giữ nút khi cạy, kiểu khóa mục tiêu, âm báo hướng), Codex (nhãn có biểu tượng hình + chữ, nguồn, dòng cố định "mức B"), Sổ tay, Nghề nhà, màn phím. Màn mở đầu ghi rõ bản prototype/graybox, nhãn nội dung, ghi chú nội bộ và nút **Phản hồi** (hướng dẫn gửi ý kiến + khối build ID / trình duyệt để tự sao chép; không gửi dữ liệu đi đâu).

## Kiến trúc

```
src/logic/   logic thuần, không phụ thuộc three.js (test bằng node --test)
  posture.js   Thế          (mirror ArpgCore FPosture)
  defense.js   né / Đỡ nhịp (mirror FDefenseController, thêm Đỡ giữ)
  drum.js      Nhịp trống   (theo combat_tuning.drum_rhythm; gần FDrumMeter)
  combo.js     chọn đòn theo input, gồng, input buffer (FInputBuffer)
  damage.js    sát thương hai chiều, Bảo khí, kỹ năng, độ khó
  hitstop.js   hit-stop theo trọng lượng, đồng hồ hit-stop (FHitStopClock)
  shackle.js   khoen + bộ phán định nhịp cạy (FShackle; phán định theo timestamp phím)
  boss.js      trận boss: sàn HP, pha, cạy (FBossEncounter)
  enemyAi.js   timeline đòn địch, chọn đòn theo trọng số, token (ưu tiên trong khung hình), đi vòng
  controls.js  phím từ controls.json: đổi phím, trùng phím, lưu, glyph, giữ/bật-tắt, chạy nhanh
  locomotion.js 3 dáng đi, quán tính, xoay, trượt, nghiêng; né 8 hướng, lùi bước, giới hạn chuỗi
  attackMotion.js bước tới + hút mục tiêu, chạm quét suốt active, khựng/đẩy theo sức đòn
  tuning.js    override tuning_changes_0_2 chỉ trong prototype
  lockon.js    chọn/huỷ khóa mục tiêu, hỗ trợ nhắm
  secrets.js   chuỗi bí mật + gợi ý + kiểm softlock (FSecretGraph)
  crafting.js  kho, công thức, nâng cấp
  lineage.js   cây kỹ năng, bàn giao đời (Handover), luật chữ cấm theo đời
  difficulty.js, i18n.js, proto.js
src/anim/    animation thủ tục: curves (easing, lò xo, pha đòn), pose (bố cục khớp), ik (IK hai đoạn),
             humanoidPoses (tư thế, 16 đòn), animator (lớp nền/hành động/cộng) — thuần, có test;
             rig.js (rig người three.js), creatures.js (cua, bọ ngựa, Ụ Bùn, lợn lòi)
src/game/    three.js, DOM, WebAudio: world, meshes, player, enemy, ui, audio, input, game
src/fx/      hiệu ứng, ánh sáng/khí quyển, âm thanh trúng đòn nhiều lớp, slow-mo/rung/FOV; hook sự kiện
             (API + danh sách hook: src/fx/README.md; logic thuần trong fx/logic.js có test)
test/        *.test.mjs (unit), smoke.mjs (Playwright)
```

## Giới hạn và điểm cần biết

- **Hiệu năng chưa đo**: mục tiêu 60 FPS máy tầm trung chưa được kiểm chứng. FPS đọc trong smoke test là Chromium headless với SwiftShader (render bằng CPU, máy dùng chung tải) — **không đại diện**, không dùng làm số liệu. Cần đo trên máy thật (ghi cấu hình, build ID, commit).
- **`src/logic/proto.js`** chỉ còn vài hằng số dữ liệu **chưa có** (cung đánh trúng của địch, cung mai trước, bán kính người chơi, thời lượng khóa của Đỡ nhịp lấy theo mặc định ArpgCore); tốc độ/bán kính/tầm khiêu khích quái nay đọc từ `behavior`. Đây là giả định để graybox chạy được, không phải số cân bằng; cần đưa vào `design/data` nếu giữ.
- Diễn giải thời gian combo là cách đọc của prototype (ghi ở đầu `combo.js`, có test), cần game-designer xác nhận: chuỗi nhẹ còn sống tới `combo_window_s` sau khi đòn trước **kết thúc**; đòn nhánh cần **dừng thật** ≥ `combo_pause_threshold_s` tính từ lúc đòn nhẹ thứ 2+ kết thúc (bấm dồn/đệm phím ra đòn nặng gốc; né, đỡ hay bị trúng đòn đều xóa chuỗi); né→đòn lướt trong `combo_pause_threshold_s` sau khi né xong. ArpgCore README §5 mục 9 tính độ trễ từ lúc đòn trước **bắt đầu** — hai bên cần thống nhất.
- **So với ArpgCore** (đang được hoàn thiện song song, đối chiếu ngày 2026-11-03): cạy dùng cùng lưới nhịp (lead-in = 1 nhịp, thử lại `miss_retries_per_beat`, chế độ giữ/tự động), Nhịp trống cùng luật mất điểm khi trúng đòn. Nhịp cạy chạy trên **thời gian thực** (không bị hit-stop co giãn; có test chứng minh nếu dùng thời gian game thì hụt nhịp 3). `dt` mô phỏng kẹp 0,1 s, `dt` thời gian thực kẹp 0,5 s khi khung hình giật. Khác: prototype phán định phím cạy theo **dấu thời gian sự kiện** và chỉ tính "trượt nhịp" sau cửa sổ + 0,25 s (`INPUT_GRACE_S`) để không phụ thuộc FPS; bản UE nên làm tương tự với timestamp của Enhanced Input.
- Không có: lồng tiếng, nhạc thật, animation bắt chuyển động/keyframe của họa sĩ (mọi động tác là **thủ tục**, hình khối graybox, [SÁNG TẠO]; không có nguồn võ cổ), IK bàn chân (chân có thể trượt nhẹ trên đất), va chạm camera, che khuất tầm nhìn khi khóa mục tiêu, lưu tiến trình (chỉ lưu cài đặt và phím vào trình duyệt), hình nộm luyện tập chỉ phản hồi va chạm.
- Fun pass **chưa làm** (P1/P2): phần thưởng "Đầm yên lại", lối tắt thứ hai, ba bí mật môi trường, nhịp nghỉ ở bến, vật phẩm nhặt, tùy chọn "Tắt chậm thời gian" trong menu (`fx.time.enabled` có ở mức code). Điều hướng menu bằng tay cầm là tối thiểu (D-pad lên/xuống, A chọn, B quay lại, LB/RB đổi thẻ).
- Tay cầm và rung chỉ kiểm bằng Gamepad API giả lập trong smoke test; chưa thử tay cầm thật.
- Âm thanh WebAudio cần một lần bấm (nút Chơi mới) mới phát được, theo chính sách trình duyệt.
- Bản `en` là dịch nháp; hai bài vè cần người viết vè đọc lại; nội dung văn hóa tối đa mức B (demo nội bộ, SB11-14).

## Quan hệ với Track U

Track W dùng chung `design/data/*.json` với `game/Source/ArpgCore` (C++) và bản UE5. Logic trong `src/logic/` giữ cùng ngữ nghĩa với các lớp ArpgCore tương ứng (ghi ở đầu mỗi file) để kết quả thử nhịp chơi chuyển được sang bản Unreal. Prototype không sửa `game/`; khi bản UE chơi được lát cắt này, Track W dừng.
