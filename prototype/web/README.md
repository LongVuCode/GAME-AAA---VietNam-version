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
| Né (lăn theo hướng đang bấm; không bấm hướng = lùi bước) | Phím cách | B / ○ |
| Đòn nhẹ / đòn nặng (giữ để gồng) | Chuột trái / chuột phải | X / Y |
| Đỡ nhịp (bấm) / Đỡ (giữ) | Q | LB |
| Khóa mục tiêu / đổi mục tiêu | Chuột giữa hoặc Tab / lăn chuột | R3 / gạt cần phải |
| Hồi trống (đủ 4 nấc) | F | RT |
| Tương tác, đòn kết "Đuổi đi", Cạy (bấm đúng tiếng trống), Vượt; **giữ** cạnh người bị mê = Gọi tên | E | A / ✕ |
| Ăn nắm cơm lá | R | D-pad ↑ |
| Vũ khí ô 1 / 2 (đổi được giữa combo) | 1 / 2 | D-pad ← / → |
| Codex / Sổ tay / Nghề nhà | C / J / K | View (Codex) |
| Tạm dừng (không đổi được) | Esc | Menu |
| FPS | ` | — |

Không có nút nhảy (`movement.jump_enabled = false`): chạy nhanh vào khúc gỗ đổ ở đầm nông hoặc rạch nước ở Bến Sậy thì tự **vượt**; đứng sát rồi bấm Tương tác cũng vượt. Kiểu tay cầm "Đòn trên vai" (`pad_presets`) chọn trong màn Đổi phím. Tùy chọn điều khiển (Cài đặt → Điều khiển, từ `controls.json accessibility_options`): kiểu chạy nhanh/đi chậm/đỡ/gồng/gọi tên (giữ hoặc bật/tắt), độ trễ chạy tự động, giữ nút né để chạy, đảo trục từng thiết bị, độ nhạy chuột/cần, vùng chết, đổi hai cần, biểu tượng nút, cường độ rung. Rung tay cầm qua `gamepad.vibrationActuator` nếu trình duyệt hỗ trợ.

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
