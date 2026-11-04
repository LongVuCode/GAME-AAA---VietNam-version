# Track W — Prototype web Demo 0.1 (graybox)

Bản **thử nhịp chơi** của Demo 0.1 (lát cắt `ch_longbien`), chạy trong trình duyệt bằng three.js. Hình khối cơ bản, âm thanh tổng hợp bằng WebAudio. **Không phải đồ họa cuối cùng**; sẽ bỏ khi bản Unreal (Track U) thay thế được (xem `docs/DEMO_PLAN.md`).

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
- `?debug=1`: bật hook `window.__demo` (chỉ dùng cho kiểm thử tự động, không bật khi gửi người test).
- `?khoen=0`: tắt cờ `feature_khoen` (V9) để thử phương án lùi K0: boss kết bằng cú đẩy (lời nhắc `prompt_finisher_shove`), vẫn rụng nanh.
- Smoke test lưu ảnh chụp vào thư mục ngoài repo (mặc định thư mục scratchpad của phiên; đổi bằng biến môi trường `SHOTS_DIR`).
- Dữ liệu: sửa `design/data/*.json` rồi build lại. Chuỗi hiển thị mới phải thêm vào `design/data/strings.json` (đủ `vi` + `en`) và chạy `python3 tools/design_validate.py`. Test `strings.test.mjs` bắt khóa chuỗi thiếu và chữ tiếng Việt viết cứng trong code.

## Điều khiển (mặc định)

| Phím | Việc |
|---|---|
| W A S D / Shift | Di chuyển / đi chậm |
| Chuột (bấm vào màn hình để khóa chuột), phím mũi tên | Xoay camera |
| Chuột trái / chuột phải (giữ để gồng) | Đòn nhẹ / đòn nặng |
| Phím cách | Né (i-frame) |
| Q bấm / Q giữ | Đỡ nhịp / Đỡ |
| Tab hoặc chuột giữa | Khóa mục tiêu (bật/tắt hoặc giữ, chỉnh trong Trợ năng) |
| R | Hồi trống (khi đủ 4 nấc Nhịp trống) |
| F | Tương tác, đòn kết "Đuổi đi" với quái đang choáng, **Cạy** (bấm đúng tiếng trống) |
| E (giữ) | Gọi tên người bị mê |
| H | Ăn nắm cơm lá |
| 1 / 2 | Đổi vũ khí (từ đời Bương) |
| C / J / K | Codex / Sổ tay / Nghề nhà |
| Esc | Tạm dừng: cài đặt (ngôn ngữ vi/en, độ khó 4 mức + tùy chỉnh, trợ năng), Codex, phím, phản hồi |
| ` | Hiện/ẩn FPS |

Tay cầm (thử nghiệm, Gamepad API chuẩn): cần trái/phải, X nhẹ, Y nặng, A né, LB đỡ, B tương tác, RB gọi tên, RT Hồi trống, LT ăn, R3 khóa, Start tạm dừng.

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
  enemyAi.js   timeline đòn địch, chọn đòn, token tấn công
  lockon.js    chọn/huỷ khóa mục tiêu, hỗ trợ nhắm
  secrets.js   chuỗi bí mật + gợi ý + kiểm softlock (FSecretGraph)
  crafting.js  kho, công thức, nâng cấp
  lineage.js   cây kỹ năng, bàn giao đời (Handover), luật chữ cấm theo đời
  difficulty.js, i18n.js, proto.js
src/game/    three.js, DOM, WebAudio: world, meshes, player, enemy, ui, audio, input, game
src/fx/      hiệu ứng, ánh sáng/khí quyển, âm thanh trúng đòn nhiều lớp, slow-mo/rung/FOV; hook sự kiện
             (API + danh sách hook: src/fx/README.md; logic thuần trong fx/logic.js có test)
test/        *.test.mjs (unit), smoke.mjs (Playwright)
```

## Giới hạn và điểm cần biết

- **Hiệu năng chưa đo**: mục tiêu 60 FPS máy tầm trung chưa được kiểm chứng. FPS đọc trong smoke test là Chromium headless với SwiftShader (render bằng CPU, máy dùng chung tải) — **không đại diện**, không dùng làm số liệu. Cần đo trên máy thật (ghi cấu hình, build ID, commit).
- **`src/logic/proto.js`** chứa vài hằng số mà dữ liệu thiết kế **chưa có** (tốc độ di chuyển và bán kính quái, bán kính khiêu khích, cung đánh trúng của địch, thời lượng khóa của Đỡ nhịp lấy theo mặc định ArpgCore). Đây là giả định để graybox chạy được, không phải số cân bằng; cần đưa vào `design/data` nếu giữ.
- Diễn giải thời gian combo là cách đọc của prototype (ghi ở đầu `combo.js`, có test), cần game-designer xác nhận: chuỗi nhẹ còn sống tới `combo_window_s` sau khi đòn trước **kết thúc**; đòn nhánh cần **dừng thật** ≥ `combo_pause_threshold_s` tính từ lúc đòn nhẹ thứ 2+ kết thúc (bấm dồn/đệm phím ra đòn nặng gốc; né, đỡ hay bị trúng đòn đều xóa chuỗi); né→đòn lướt trong `combo_pause_threshold_s` sau khi né xong. ArpgCore README §5 mục 9 tính độ trễ từ lúc đòn trước **bắt đầu** — hai bên cần thống nhất.
- **So với ArpgCore** (đang được hoàn thiện song song, đối chiếu ngày 2026-11-03): cạy dùng cùng lưới nhịp (lead-in = 1 nhịp, thử lại `miss_retries_per_beat`, chế độ giữ/tự động), Nhịp trống cùng luật mất điểm khi trúng đòn. Nhịp cạy chạy trên **thời gian thực** (không bị hit-stop co giãn; có test chứng minh nếu dùng thời gian game thì hụt nhịp 3). `dt` mô phỏng kẹp 0,1 s, `dt` thời gian thực kẹp 0,5 s khi khung hình giật. Khác: prototype phán định phím cạy theo **dấu thời gian sự kiện** và chỉ tính "trượt nhịp" sau cửa sổ + 0,25 s (`INPUT_GRACE_S`) để không phụ thuộc FPS; bản UE nên làm tương tự với timestamp của Enhanced Input.
- Không có: lồng tiếng, nhạc thật, animation thật (tư thế thủ tục), va chạm camera, che khuất tầm nhìn khi khóa mục tiêu (chưa mô phỏng "khuất 1,5 s"), đổi phím (hiện "chưa có trong bản prototype"), lưu tiến trình (chỉ lưu cài đặt vào trình duyệt), hình nộm luyện tập chỉ phản hồi va chạm.
- Âm thanh WebAudio cần một lần bấm (nút Chơi mới) mới phát được, theo chính sách trình duyệt.
- Bản `en` là dịch nháp; hai bài vè cần người viết vè đọc lại; nội dung văn hóa tối đa mức B (demo nội bộ, SB11-14).

## Quan hệ với Track U

Track W dùng chung `design/data/*.json` với `game/Source/ArpgCore` (C++) và bản UE5. Logic trong `src/logic/` giữ cùng ngữ nghĩa với các lớp ArpgCore tương ứng (ghi ở đầu mỗi file) để kết quả thử nhịp chơi chuyển được sang bản Unreal. Prototype không sửa `game/`; khi bản UE chơi được lát cắt này, Track W dừng.
