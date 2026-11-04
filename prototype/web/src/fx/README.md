# src/fx — hiệu ứng, ánh sáng, âm thanh trúng đòn (Track W, Demo 0.2 "feel")

Module VFX/game-feel cho prototype web (three.js r169). Không dùng asset ngoài: hạt, vòng sóng, vệt vũ khí, bầu trời, nước đều là shader nhỏ; âm thanh tổng hợp bằng WebAudio trong `src/game/audio.js`. Hướng nghệ thuật theo `docs/ART_DIRECTION.md` (đề xuất): **đỏ đồng chỉ dành cho báo hiệu đòn không đỡ được** (hiệu ứng ở đây không dùng màu đó), không có "nguồn sáng phép", khoen chỉ **bắt sáng** (không phát sáng), cảnh cạy **không nhấp nháy**, nhả cạy êm (không chớp màn hình).

**Không có số FPS nào ở đây.** Chromium headless dùng SwiftShader (render bằng CPU) nên không đại diện; cần đo trên máy thật (ghi cấu hình, build ID, commit).

## Tệp

| Tệp | Nội dung |
|---|---|
| `logic.js` | Logic thuần (không three.js, có unit test `test/fx.test.mjs`): `ParticlePool`, `TimeScale` (slow-mo), `gameStep`, `CameraShake`, `FovKick`, bảng `impactSpec` / `footstepSpec` / `impactSoundSpec`, `vary` |
| `index.js` | `createFx(...)` → đối tượng `Fx` (API bên dưới), hậu kỳ (bloom) và công tắc chất lượng |
| `particles.js` | Hệ hạt GPU: một `THREE.Points` cho mỗi kiểu trộn (cộng sáng / thường); mảng của pool chính là buffer attribute |
| `rings.js` | Pool 18 vòng sóng (nằm trên đất hoặc quay về camera) |
| `trail.js` | Vệt vũ khí (ribbon theo đầu vũ khí, mờ theo tuổi mẫu) |
| `atmosphere.js` | Trời gradient + mặt trời thấp, sương FogExp2 theo độ sâu, nắng + hemisphere, bóng mềm theo người chơi, nước nông phản chiếu giả, mặt đất loang màu, lau lay theo gió (vertex shader trên InstancedMesh) có bông lau, "mood" theo khu |
| `hooks.js` | `GameFxHooks`: các hook sự kiện game gọi (mỗi chỗ một dòng) + bộ poll mỗi khung |

## API (`src/fx/index.js`)

```js
const fx = createFx(scene, camera, renderer, sfx, {
  overlayParent,                 // phần tử chứa canvas (vignette / chớp màn hình)
  shakeEnabled: () => bool,      // acc_camera_shake
  reduceFlash: () => bool,       // acc_reduce_flash
  feel, shake,                   // combat_tuning.feel, combat_tuning.camera_shake (tùy chọn)
});
fx.attachWorld(buildWorld());    // ánh sáng, trời, sương, nước, lau, bóng (một lần)
```

Mỗi khung (đã nối trong `game.js`):

```js
const dt = gameStep(realDt, hitstop, fx.time);  // hit-stop rồi slow-mo; CHỈ cho mô phỏng game
// ... cập nhật game, đặt camera ...
fx.applyCamera();                 // cộng offset rung vào camera vừa đặt
fx.update(wallDt, player);        // thời gian THỰC; truyền 0 khi tạm dừng (mọi thứ đứng yên)
fx.render();                      // composer (Cao) hoặc renderer.render (Thấp)
```

| Hàm | Ghi chú |
|---|---|
| `fx.impact(pos, normal, { weight, surface, ground, sound, scale })` | Tia lửa/đốm sáng, bụi, mảnh bùn/giọt nước/dăm, vòng sóng, quầng sáng ngắn, chớp màn hình (tùy weight) + âm thanh nhiều lớp. `weight`: `light`, `medium`, `heavy`, `finisher`, `parry`, `perfect_parry`, `guard`, `posture_break`, `khoen_crack`, `pry_beat`, `freed`, `hurt`. `surface`: `mud`, `water`, `flesh`, `bronze`, `wood`, `dirt`. `ground`: bề mặt dưới mục tiêu (`mud`/`water`) để thêm bắn bùn/nước |
| `fx.weaponTrail(obj, { color, width, durationS, tipLocal, baseLocal })` | Trả `{ start(), stop(), dispose() }`. Mặc định lấy đầu xa nhất theo +z của mesh |
| `fx.footstep(pos, surface, speedMps, { sound })` | Bụi / bùn / nước + gợn sóng; to hơn khi chạy nhanh (sprint) |
| `fx.dodgeBurst(pos, dir, { surface, perfect })` | Bụi bốc ngược hướng né; `perfect` thêm vòng sáng nhẹ |
| `fx.drumPulse(pos, { strength, color })` | Vòng sóng trên đất theo nhịp trống |
| `fx.khoenGlow(obj, crackLevel)` | Khoen "bắt sáng" (ánh đồng xỉn, trôi chậm, không nhấp nháy), mạnh dần theo nấc; 0 = trả lại vật liệu gốc |
| `fx.hitFlash(obj, { color, durationS, strength })` | Nháy emissive ngắn trên mọi mesh của obj |
| `fx.cameraShake(intensity, durationS)` | Mét; kẹp theo `camera_shake.max_amplitude`; tắt hẳn khi tắt "Rung camera" |
| `fx.fovKick(deltaDeg, durationS)` | Đẩy FOV ngắn; cũng tắt theo "Rung camera" |
| `fx.setFovOffset(name, deg)` | FOV giữ lâu, làm mượt (ví dụ `'sprint'`, `+6`); 0 để bỏ. Không phụ thuộc tùy chọn rung |
| `fx.slowMo(scale, durationS)` → scale | Xem hợp đồng bên dưới |
| `fx.timeScale` | Hệ số slow-mo hiện tại (đọc mỗi khung) |
| `fx.vignettePulse(strength)`, `fx.setVignette(level)` | Viền tối màu than (không đỏ) khi máu thấp / trúng đòn nặng |
| `fx.screenFlash(strength)` | Chớp sáng toàn màn hình; bị tắt khi bật "Giảm nhấp nháy" |
| `fx.embers(pos, n)`, `fx.after(s, fn)` | Tàn lửa; hẹn giờ theo thời gian thực |
| `fx.setMood(id, instant)` | `ben_say`, `dam_nong`, `bai_lau`, `boss_p1`, `boss_p2`, `pry`, `freed`, `hub` (chuyển dần ~2 s) |
| `fx.setQuality('high' \| 'low')`, `fx.setSize(w, h)`, `fx.stats()` | Chất lượng, đổi cỡ, chẩn đoán (debug hook `__demo.fx()`) |

### Hợp đồng slow-mo (QA S2)

`TimeScale` (trong `logic.js`) **chỉ** nhân bước mô phỏng game: `gameDt = hitStop.advance(realDt) * fx.timeScale` (hàm `gameStep`). Thời lượng slow-mo tính bằng **giây thực**. Slow-mo **không** áp vào: đồng hồ nhịp cạy (`PryJudge` chạy bằng `wallDt`), hẹn giờ `Game.after`, UI, âm thanh và chính module FX. Có unit test: hit-stop + slow-mo mạnh ở mỗi nhịp cạy, người chơi bấm đúng tiếng trống vẫn trúng cả 3 nhịp. Các yêu cầu chồng nhau giữ hệ số chậm nhất và điểm kết thúc muộn nhất; hết thời gian thì trả về 1 trong 0,12 s.

Giá trị slow-mo/FOV đọc từ `combat_tuning.feel` (`perfect_parry_time_scale`, `perfect_dodge_*`, `the_break_*`, `fov_heavy_hit_kick_deg`, `fov_kick_return_s`) và `combat_tuning.finisher` (`contact_time_scale`, `contact_slowmo_s`) nếu có; không có thì dùng giá trị mặc định trong `hooks.js`. `feel._note` đề xuất một tùy chọn tắt slow-mo: chưa có trong menu (cần chuỗi + mục trợ năng trong dữ liệu); `fx.time.enabled = false` đã tắt được ở mức code.

## Hook đã nối (gọi `this.fxh.<hook>` trong `src/game`)

| Hook | Gọi từ | Hiệu ứng |
|---|---|---|
| `swingStart(player, cur)` | `player.js` `_startMove` (thay `sfx.whoosh()`) | Vệt vũ khí + tiếng gió đúng khung active (do poller hẹn), tốc độ gió theo độ dài active |
| `dodgeStart(player, dir)` | `player.js` `_startDodge` | Bụi/nước/bùn bốc ngược hướng né |
| `playerHitEnemy(e, weight, result, kind)` | `game.playerStrike` (thay `sfx.hit`) | Impact theo thân quái (cua = `wood`, bọ ngựa/lợn = `flesh`, Ụ Bùn = `mud`) + bề mặt dưới chân, nháy trắng, FOV đẩy với đòn nặng |
| `burstHit(targets, last, weight)` | `game.playerBurstHit` | Vòng trống mỗi nhát Hồi trống + impact |
| `dummyHit(dummy)` | `game.hitDummies` | Dăm gỗ + nháy |
| `parry(enemy, perfect)` | `game.enemyHitsPlayer` (thay `sfx.parry`) | Tia đồng + vòng; hoàn hảo: nhiều hơn, slow-mo, FOV thu, rung nhẹ, chớp nhẹ |
| `guardBlock(enemy)` | `game.enemyHitsPlayer` GUARDED | Tia đồng nhỏ + tiếng đồng |
| `playerHurt(enemy, heavy)` | `game.enemyHitsPlayer` HIT | Impact trên người chơi, nháy ngà, vignette |
| `perfectDodge()` | `game.enemyHitsPlayer` PERFECT_DODGE | Slow-mo + vòng sáng |
| `postureBreak(e)` | `game.onHitResult` (`r.broke`) | Vòng sóng đất lớn + bụi, slow-mo, FOV thu |
| `khoenCrack(boss)` | `game.onHitResult` (`r.cracked`, thay `crackSnap`) | Tia đồng ở khoen + khoen bắt sáng thêm một nấc |
| `pryDrum(boss)` | `game.updatePry` sự kiện `drum` | Vòng trống quanh con thú (nhịp trống nhìn thấy được, cùng đồng hồ thực) |
| `pryBeat(boss, beat)` | `game.updatePry` sự kiện `hit` (thay `crackSnap`) | Tia đồng nhỏ, khoen sáng thêm, FOV hẹp dần mỗi nhịp; không chớp |
| `pryMiss(boss)` | `game.updatePry` sự kiện `miss` | Bùn bắn nhỏ |
| `bossFreed(boss)` | `game.onBossFreed` (thay `crackSnap`) | Thả khoen: bụi + vòng lớn, slow-mo; mood `pry` (lặng gió) suốt 3 s im lặng rồi `freed` (gió về, ấm hơn) |
| `drumBurst()` | `game.onBurst` | Vòng trống lớn, FOV mở, vệt vũ khí suốt Hồi trống |
| `finisher(e)` | đòn kết quái thường, `shoveBoss` | Impact nặng + slow-mo chạm (`finisher.contact_*`) |
| `enemyDefeated(e)` | `game.onEnemyDefeated` | Cua chui bùn, bọ ngựa bay (dăm lau), Ụ Bùn sụp |
| `playerFootPlant(p, side, speed)` | `anim/animator.js` (nhịp chân) qua `player.js` | Bụi/bùn/nước ở bàn chân; chạy nhanh thêm một cụm; thay poller bước chân của người chơi |
| `chargeLevel(p, level)` | `game.onChargeLevel` (gồng đòn nặng) | Lóe ở mũi vũ khí, trống nhỏ, FOV thu |
| `stakeHit(boss, stake)` | `game.onBossTransition('stake_hit')` | "Húc cọc": tia đồng cọ gỗ, dăm gỗ, rung |
| `projectileBurst(x, z)`, `burrowMark(x, z)` | `enemy.js` (Ụ Bùn) | Cục bùn vỡ; bùn sủi chỗ sắp trồi |

Poller `fxh.update(wallDt)` (gọi trong `game.update`): tắt/bật vệt vũ khí theo khung active, tiếng bước chân theo quãng đường (dải sải theo tốc độ, bề mặt bùn/nước/gỗ bến/đất), bước chân lợn lòi và cua, tàn lửa ở bếp, vignette + nhịp tim khi máu < 30%, vòng trống khi Nhịp trống đầy, khoen bắt sáng theo số nấc, mood theo khu/pha boss/cạy.

**Cho agent Animation & Movement:** khi thêm sprint, gọi `game.fx.setFovOffset('sprint', feel.fov_sprint_add_deg)` lúc chạy nhanh và `0` khi dừng; bước chân tự to hơn theo tốc độ đo được (không cần gọi). Khi có animation thật, có thể thay poller vệt vũ khí bằng `fxh.swingStart` + gọi `trail.stop()` ở cuối khung active, và thay `_footsteps` bằng `fx.footstep(...)` đặt theo khung chạm đất. Nếu đổi mesh vũ khí, vệt tự lấy theo bounds mới (cache theo Object3D).

## Âm thanh (mở rộng `src/game/audio.js`, API cũ giữ nguyên)

- `sfx.impact(weight, surface, { pan, gain })`: lớp transient (click lọc cao) + thân theo vật liệu (gỗ, đồng = các họa âm không điều hòa, da, bùn, nước) + đuôi (gửi sang bus delay có lọc); biến thiên ngẫu nhiên ±6 % cao độ, ±12 % âm lượng.
- `sfx.whoosh(speed = 1, weight = 'light')`: gió vung, bộ lọc quét theo tốc độ (gọi không tham số vẫn chạy như cũ).
- `sfx.footstep(surface, speed)`, `sfx.heartbeat(strength)`.
- `sfx.silence()` vẫn chặn mọi lớp (bus đuôi đi qua master), nên 3 giây im lặng sau cạy được giữ.

## Chất lượng (menu Cài đặt → "Chất lượng đồ họa", lưu cùng cài đặt)

| | Cao (mặc định) | Thấp |
|---|---|---|
| Bóng | Shadow map 2048, PCF mềm, theo người chơi | Tắt (giữ bóng tròn dưới chân) |
| Hậu kỳ | Bloom nhẹ (ngưỡng cao, nửa độ phân giải) + MSAA 4 trên render target | Không |
| Hạt | 700 cộng sáng + 1000 thường | 220 + 320 |
| Shader | Nước gợn đủ lớp, đất loang 3 tầng | Nước bớt lớp gợn, đất 1 tầng |
| Pixel ratio | tối đa 1,5 | 1 |

Mặc định là Cao vì chưa đo máy thật; nếu playtest máy yếu thấy giật, đổi mặc định là quyết định cần số đo.
