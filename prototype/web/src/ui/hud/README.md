# src/ui/hud — HUD chiến đấu Demo 0.3

HUD người chơi, thanh boss, mặt trống tuyệt kỹ, lời nhắc nhặt đồ, số/vạch trúng đòn. DOM + CSS (`src/style.css`, mục "HUD 0.3") + **một canvas nhỏ** cho mặt trống. Không tải ảnh/font ngoài; font hệ thống (`--font`) đủ dấu tiếng Việt. Học nguyên lý bố cục HUD God of War (biểu tượng vũ khí tròn + thanh phát sáng), không sao chép hình.

## Bố cục

| Vị trí | Thành phần |
|---|---|
| Trên-trái | **Chừa** ô tròn ~180 px cho minimap (`hud.minimapSlot`) |
| Trên-phải | Khu vực, mục tiêu, điểm nghề (mờ đi khi có boss) |
| Trên-giữa | Thanh boss: tên + họa tiết, pha, máu đỏ phát sáng + thanh hụt, vạch pha (`boss_bar.phase_marker_at_hp_ratio`), Thế, 3 khoen (vòng đồng, nứt thì có vết nứt + bắt sáng), hiện ra có hiệu ứng trượt + máu dâng |
| Dưới-trái | 2 ô Thế võ hình thoi (vòng hồi chiêu, số giây < 5 s, khóa), biểu tượng vũ khí tròn (giáo/rìu, đổi có xoay; vũ khí ô kia nhỏ; "+N"), thanh Sức, thanh Thế (ẩn khi Thế = 0), Nắm cơm lá × N + phím |
| Dưới-phải | Mặt trống Hồi trống (canvas 112 px) + phím kích hoạt theo thiết bị + nhãn `hud_drum` / `hud_drum_ready` |
| Trên cụm dưới-trái | Thông báo nhặt đồ |

Lý do đặt trống dưới-phải: cân hai góc, trạng thái "đầy" nằm trong tầm mắt ngoại vi, không chồng phụ đề ở giữa dưới.

## Hiệu ứng

- **Thanh Sức**: gradient 3 điểm (sáng/gốc/tối) tính từ màu hiện tại, vệt bóng kính (`::after`), đầu thanh trắng phát sáng, glow `drop-shadow` theo màu trên lớp bọc (không bị `clip-path` cắt). Màu: xanh lá sáng → **vàng ở ≤ 50 %** → **đỏ ở ≤ 10 %** (`logic.js hpColor/hpTier`, ngưỡng đọc từ `combat_tuning.hud_0_3.health_bar`). Mức đỏ: lớp glow riêng nhấp theo `critical_pulse_hz` (chỉ animate `opacity`), biểu tượng nhịp tim + chữ `hud_low_health` (không chỉ dựa vào màu), vạch khắc ở 50 % và 10 %. "Giảm nhấp nháy": glow đứng yên. Thanh hụt trắng-vàng giữ `damage_trail_s` rồi rút.
- **Mặt trống** (`drumFace.js`) **[SÁNG TẠO]**: mặt trống đồng cách điệu — sao 12 cánh ở tâm, các vành tròn tiếp tuyến có chấm, vạch thang, zigzag; không chim/thuyền; không phục dựng một trống cụ thể nào. Theo ART_DIRECTION §3.5, motif sao/mặt trời ở tâm cần `historian-verifier` duyệt (D-024 đã ghi đây là họa tiết giao diện, trống trong thế giới game vẫn là trống gỗ). Chất lỏng: 2 lớp sóng sin chuyển động, gradient độ sâu, đường mặt sáng, bong bóng; mức nước dâng mượt (`DrumFaceState`), sóng sánh mạnh khi vừa được cộng. 4 cung ở vành = 4 nấc Nhịp trống. **Đầy**: chất lỏng đỏ-cam nóng chảy, hoa văn sáng xuyên qua, quầng sáng nhấp theo `ready_pulse_hz`, tia sáng xoay (CSS `repeating-conic-gradient` + mask), sóng xung khi vừa đầy/vừa dùng, phím kích hoạt sáng.
- Số Thế bay lên kèm vạch chém, "Vỡ Thế!" to hơn; lời nhắc/toast nền than + viền đồng + glow nhẹ.

## Hiệu năng

Mọi cập nhật DOM qua `_set` (chỉ ghi khi giá trị đổi); thanh dùng `transform: scaleX`. Lớp tĩnh của mặt trống vẽ một lần vào canvas phụ; canvas chính chỉ vẽ lại khi nấc đổi hoặc chất lỏng đang chuyển động, tối đa ~30 lần/s, không vẽ khi HUD bị ẩn hay tạm dừng. Không animate `filter` (glow nhấp là lớp `opacity` riêng; canvas không có CSS filter). **Chưa đo FPS trên máy thật**; Chromium headless (SwiftShader) không đại diện.

## API

```js
import { createHud } from './ui/hud/index.js';
const hud = createHud(root, data, { glyphText(action) }, i18n);   // game/ui.js: game.ui.hudView
hud.update(state, realDt);   // mỗi khung chơi (game.updateHud)
hud.applySettings(acc);      // acc_reduce_flash, acc_hud_minimal, acc_hud_scale, acc_subtitle_size (cỡ chữ)
hud.setSkills([{ id, name, icon?, action?, locked? }]);  // icon: thrust|sweep|spin|guard|drum|lock
hud.setCooldown(id, t01, secondsLeft?);                  // t01: 1 vừa dùng → 0 sẵn sàng
hud.setCinematic(on);        // ẩn toàn bộ (cảnh Hồi trống điện ảnh)
hud.popup(x, y, value, kind); hud.pickup(text); hud.minimapSlot; hud.debugState()
```

`state`: `hp, hpMax, the (0..1), drum ([4] 0..1) + drumReady` hoặc `drumPoints + drumSegPoints`, `heals, weapon, otherWeapon, weaponPlus, slot, slots, zone, objective, points, fps, combat, boss: { name, phase, hp, the, cracks, showCracks } | null`.

"HUD tối giản" (`acc_hud_minimal`, đang là tùy chọn của prototype vì dữ liệu chưa có mục này): cụm người chơi và mặt trống ẩn khi không giao chiến sau `fade_out_of_combat_after_s`, hiện lại khi giao chiến/có boss/máu ≤ 50 %/trống đầy/vừa đổi.

Test: `test/hud.test.mjs` (logic thuần), kiểm HUD trong `test/smoke.mjs` (màu ở 100/50/10 %, trống đầy, thanh boss, HUD tối giản).
