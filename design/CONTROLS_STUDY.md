# Nghiên cứu điều khiển — Demo 0.1

UX/Controls Researcher, 2026-11-04. Dữ liệu đi kèm: `design/data/controls.json`. Trạng thái: **đề xuất**, chờ Product Owner duyệt và playtest.

> **Mức tin cậy:** phím của các game lấy từ **trích đoạn WebSearch** (wiki, trang hướng dẫn bên thứ ba); không mở được trang gốc (WebFetch bị chặn mạng), chưa kiểm trong game ⇒ **toàn bộ là "chưa đối chiếu bản gốc"**. Dấu "?" = một nguồn, nguồn mâu thuẫn hoặc hiểu biết chung: **(chưa xác minh)**.

## 1. Tay cầm (ký hiệu PlayStation; Xbox: ✕=A, ○=B, □=X, △=Y, L1=LB, R1=RB, L2=LT, R2=RT)

| Game | Chạy nhanh | Né | Nhảy | Nhẹ / Nặng | Đỡ / Parry | Lock-on | Hồi máu | Tương tác / khác |
|---|---|---|---|---|---|---|---|---|
| Elden Ring | **giữ ○** (chung nút né) | ○ | ✕ | R1 / R2 ? | L1 đỡ; parry là kỹ năng (L2) | R3 | □ | Kỹ năng L2 |
| Sekiro | giữ ○ ? | ○ | ✕ | R1 | **L1: bấm = gạt, giữ = đỡ** | R3 | ? | □ hành động; L2 móc; R2 dụng cụ; △ đổi dụng cụ; L1+R1 võ kỹ |
| God of War (2018) | L3 ? | ✕ ? | không có nút nhảy tự do ? | R1 / R2 | L1 đỡ/parry | R3 ? | ? | L2 ngắm; △ gọi rìu ? |
| Black Myth: Wukong | **R1 hoặc L3** (nút riêng) | ○ | ✕ | □ / △ (giữ gồng) | không có nút đỡ | R3 | L1 (hồ lô) | Phép: R2 + nút mặt ?; tương tác □ hay R2 (mâu thuẫn) |
| Ghost of Tsushima | L3 | ○ | ✕ ? | □ / △ | L1 (giữ đỡ, bấm đúng lúc parry) | không có mặc định; bản vá có thêm ? | ? | R2 tương tác/lên ngựa |
| Lies of P | giữ ○ (dash) | ○ | L3 (nhảy tới) | R1 / R2 (giữ gồng) | L1 (giữ đỡ, bấm đúng lúc parry) | R3 | ? | L2 tay Legion; △ Fable Arts (mâu thuẫn) |
| Stellar Blade | giữ ○ hoặc L3 (mâu thuẫn) | ○ | ✕ | □ / △ | L1 đỡ/parry (+ kỹ năng Beta) | R3 | ? | R1 kỹ năng Burst |

## 2. Bàn phím + chuột (PC)

| Game | Phím đã thấy trong nguồn |
|---|---|
| Elden Ring | **Space né/giữ chạy**; Alt đi bộ; chuột trái đánh, Shift+chuột trái mạnh; chuột phải đỡ, Shift+chuột phải kỹ năng ?; R vật phẩm; E tương tác; chuột giữa lock-on; G bản đồ; F nhảy ? |
| Sekiro | chuột phải gạt/giữ đỡ; F móc; E nhặt; R vật phẩm (một nguồn ?) |
| God of War (2018) / Ragnarök | **Shift chạy; Space né**; chuột trái/phải nhẹ/nặng; **Q đỡ/parry**; Ctrl ngắm; E tương tác; chuột giữa lock-on ?; **chạy tự động có chỉnh độ trễ**; đổi phím đầy đủ. Ragnarök: R kỹ năng vũ khí ? |
| Black Myth: Wukong | **giữ Shift chạy**; Space né; Ctrl nhảy; chuột trái/phải nhẹ/nặng; 1–4 phép; R hồ lô; E tương tác; chuột giữa lock-on. Tay cầm chỉ có preset ? |
| Ghost of Tsushima | Shift chạy; Space nhảy; Caps Lock đi bộ; E tương tác; chuột trái/phải nhẹ/nặng; Q đỡ (mâu thuẫn); Alt né ? |
| Lies of P | Space né/nhảy tới; Caps Lock đi bộ; chuột giữa lock-on; Ctrl tay Legion; F Fable Arts; Shift đỡ ? |
| Stellar Blade | **Không tìm được** danh sách phím PC mặc định. |

## 3. Quy ước chung và chỗ khác nhau

**Đa số làm giống nhau**
1. **Né ở ○/B** (6/7 game; GoW là ngoại lệ ?). Trên PC: **Space**.
2. **Lock-on ở R3**, đổi mục tiêu bằng cách gạt cần phải. Trên PC: **chuột giữa**.
3. **Một nút cho đỡ và parry ở L1/LB**: bấm đúng lúc là parry, giữ là đỡ (Sekiro, GoT, Lies of P, Stellar Blade, GoW).
4. **PC: E tương tác, R dùng vật phẩm/hồi máu, Shift chạy, chuột trái đòn nhẹ.**

**Chia hai trường phái**
- *Đòn trên vai* (R1/R2: Elden Ring, Sekiro, Lies of P, GoW) và *đòn trên nút mặt* (□/△: Wukong, GoT, Stellar Blade).
- *Chạy bằng cách giữ nút né* (Elden Ring, Lies of P, có thể Sekiro và Stellar Blade) và *nút chạy riêng* (GoW, GoT: L3; Wukong: R1/L3). Trên PC hầu hết dùng Shift riêng; Elden Ring là ngoại lệ (Space).

**Thực hành tốt**
- **Giữ ○ để chạy gây "claw grip"** (ngón cái vừa giữ ○ vừa xoay camera); muốn chung nút thì né phải kích hoạt lúc **thả**, làm chậm phản hồi (chưa xác minh). Game này có né hoàn hảo 0,10 s ⇒ né kích hoạt lúc nhấn, chạy dùng nút riêng.
- **L3 dạng chốt** (nhấn một lần, tự dừng khi đứng lại) và **chạy tự động** (GoW) tránh giữ L3.
- **XAG 107**: đổi mọi phím (analog lẫn số); đảo trục X/Y riêng từng cần; bật/tắt hoặc tự động thay cho giữ lâu; tránh bấm hai nút cùng lúc; đổi theo *hành động*. **Game Accessibility Guidelines**: đổi phím (cơ bản), thay thế cho giữ nút và bấm dồn (trung bình).
- **Glyph theo thiết bị vừa dùng**, cho chọn tay (Sekiro cho đổi biểu tượng, theo người dùng Steam ?). **Đổi phím tay cầm hay bị thiếu** (Wukong ?): nên có cả preset lẫn đổi tự do.

## 4. Đề xuất cho Demo 0.1

| Hành động | Bàn phím + chuột | Tay cầm (Xbox / PS) | Kiểu | Lý do |
|---|---|---|---|---|
| Di chuyển / camera | WASD / chuột (+ mũi tên) | Cần trái / cần phải | trục | Chuẩn chung |
| **Chạy nhanh** | **giữ Shift** | **L3 nhấn một lần** (chốt) | giữ, có bật/tắt/tự động | Nút riêng, không làm chậm né; L3 dạng chốt tránh mỏi tay |
| Đi chậm (tùy chọn) | Caps Lock (bật/tắt) | Nghiêng cần nhẹ | bấm | Như GoT/Lies of P; trên web tránh Ctrl/Alt (Ctrl+W đóng tab) |
| Né | Space | **B / ○** | bấm, kích hoạt lúc nhấn | Quy ước mạnh nhất |
| Nhảy | — (không có) | — | giữ chỗ | Xem dưới |
| Đòn nhẹ | Chuột trái | X / □ | bấm | Combo nhẹ-nhẹ-dừng-nặng dễ nhịp hơn trên nút mặt |
| Đòn nặng | Chuột phải, giữ để gồng | Y / △, giữ để gồng | giữ, có bật/tắt | Như Wukong/Lies of P |
| Đỡ nhịp / Đỡ | Q: bấm / giữ | LB / L1: bấm / giữ | bấm + giữ | Quy ước một nút cho đỡ và parry |
| Lock-on | Chuột giữa hoặc Tab | RS / R3 | bật/tắt hoặc giữ | Chuẩn; không có mục tiêu thì đưa camera về sau lưng |
| Đổi mục tiêu | Lăn chuột | Gạt cần phải | — | Chuẩn |
| Hồi trống | **F** | RT / R2 | bấm | F sát WASD (như Fable Arts của Lies of P); không dùng tổ hợp |
| Tương tác / Đòn kết / **Cạy** | **E** | **A / ✕** | bấm | Một nút ngữ cảnh luôn có lời nhắc; E là chuẩn PC |
| Gọi tên | **giữ E** (2 s) | **giữ A / ✕** | giữ, có bấm một lần | Chỉ hiện cạnh người bị mê, nên không lẫn với tương tác |
| Ăn nắm cơm lá | **R** | D-pad ↑ | bấm | R chuẩn PC; D-pad khó bấm nhầm, hồi máu là cam kết |
| Đổi vũ khí | 1 / 2 | D-pad ← / → | bấm | Như hiện tại |
| Codex / Sổ tay / Nghề nhà | C / J / K | View: sổ chung, LB/RB đổi thẻ | bấm | Tay cầm không đủ nút cho từng màn |
| Bản đồ | M (giữ chỗ) | thẻ trong sổ chung | — | Demo chưa có bản đồ |
| Tạm dừng | Esc | Menu / Options | bấm | Chuẩn |

Còn trống để dùng sau: LT/L2, RB/R1 (về sau có thể làm *giữ LT + nút mặt = kỹ năng*, kiểu Wukong). Preset thứ hai **"Đòn trên vai"** (RB nhẹ, RT nặng, LT Hồi trống, X/□ ăn) cho người quen Souls.

**Nhảy: không đưa vào Demo 0.1.** Khu vực bằng phẳng, không có thử thách độ cao; nhảy tự do kéo theo va chạm, sát thương rơi, lối tắt ngoài ý muốn, mà né đã đủ cơ động (GoW 2018 cũng không có nút nhảy, chưa xác minh). Chỗ cần vượt dùng Tương tác theo ngữ cảnh.

**Chạy nhanh** tốn Sức cho nhịp giữa các trận và đường lui; cần game-designer thêm `movement.sprint_speed_mps` và mức tốn Sức vào `combat_tuning.json`.

**Đổi so với prototype hiện tại:** Shift: đi chậm → chạy; đi chậm → Caps Lock; F tương tác → E; E gọi tên → giữ E; R Hồi trống → F; H ăn → R. Tay cầm: A né → B; B tương tác → A; RB gọi tên → giữ A; LT ăn → D-pad ↑; thêm L3 chạy; Back → sổ chung.

## 5. Trợ năng (chi tiết trong `controls.json` → `accessibility_options`)
- **Bật/tắt thay cho giữ**: chạy (giữ / bật-tắt / tự động), đỡ, gồng, gọi tên (bấm một lần), cạy (đã có), lock-on (đã có); tùy chọn **giữ né để chạy** kiểu Souls.
- **Camera**: đảo trục X/Y riêng cho chuột và tay cầm; độ nhạy riêng ngang/dọc; vùng chết cần analog (hiện 0,18); đổi hai cần.
- **Đổi phím** mọi hành động, cả hai thiết bị, 2 phím/hành động trên bàn phím, báo trùng, khôi phục mặc định; Esc khóa cứng (trình duyệt dùng Esc thoát khóa chuột).
- **Glyph** tự động hoặc chọn tay Xbox / PlayStation / bàn phím. Web: đoán từ `Gamepad.id` (Sony `054c`, Microsoft `045e`); Steam Input có thể báo tay PS là Xbox (chưa xác minh).
- **Không có tổ hợp nút bắt buộc**; rung chỉnh được, mức 0 là tắt.

## 6. Nguồn (truy cập 2026-11-04, chỉ trích đoạn tìm kiếm)
- Elden Ring: eldenring.fandom.com/wiki/Controls; vulkk.com/2022/02/26/elden-ring-pc-and-console-controls-guide-and-lists/; eldenring.wiki.fextralife.com/Controls; gamerguides.com/elden-ring/guide/gameplay/tips-and-tricks/how-to-optimise-controls-for-keyboard-and-mouse; primagames.com/gaming/the-best-pc-keybindings-for-elden-ring; charlieintel.com/games/elden-ring-controller-settings-playstation-xbox-binds-162927/; pcgamer.com/elden-ring-pc-keyboard-mouse-controls
- Sekiro: gosunoob.com/sekiro-shadows-die-twice/controls-list-playstation-4-xbox-one-pc/; sekiroshadowsdietwice.wiki.fextralife.com/Controls; magicgameworld.com/?p=31070; steamcommunity.com/app/814380/discussions/0/1850323802572283270
- God of War / Ragnarök: shacknews.com/article/128344/god-of-war-pc-keybindings-controls; gamenguides.com/nl/god-of-war-pc-gamepad-controls; caniplaythat.com/2022/01/12/god-of-war-pc-accessibility-review-can-i-play-that/; magicgameworld.com/?p=106988
- Black Myth: Wukong: primagames.com/tips/black-myth-wukong-complete-controls-for-pc-controller; sportskeeda.com/esports/all-black-myth-wukong-controls-keyboard-controller; gamevoyagers.com/black-myth-wukong-all-controls-list-pc-controller; magicgameworld.com/black-myth-wukong-xbox-and-playstation-controls-guide/
- Ghost of Tsushima: outsidergaming.com/ghost-of-tsushima-complete-controls-guide-for-ps4/; twinfinite.net/guides/ghost-of-tsushima-sprint-run-faster/; sportskeeda.com/gaming-tech/best-ghost-tsushima-pc-controller-settings; tutorialtactic.com/blog/ghost-of-tsushima-shortcuts/; steamcommunity.com/app/2215430/discussions/0/7093810350790478597; kitguru.net/gaming/mustafa-mahmoud/new-ghost-of-tsushima-patch-includes-lock-on-new-animations-and-more
- Lies of P: liesofp.wiki.fextralife.com/Controls; gamertweak.com/lies-of-p-controls-guide; samurai-gamers.com/?p=292106; sportskeeda.com/gaming-tech/lies-p-best-controller-settings; steamcommunity.com/app/1627720/discussions/0/3883848063134956300
- Stellar Blade: gamepressure.com/stellar-blade/controls/z011374; samurai-gamers.com/stellar-blade/sblade-game-controls/
- Trợ năng: learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/107; gameaccessibilityguidelines.com
- Gamepad API: w3.org/TR/2021/WD-gamepad-20210325/ (bảng "standard gamepad": buttons[0..16], axes[0..3])
