# ArpgCore: lõi luật chơi C++20 (không phụ thuộc Unreal)

`ArpgCore` là thư viện C++20 thuần, chứa toàn bộ luật combat và tiến trình của Demo 0.1 (D-008, D-019, D-020). Sau này nó sẽ là một module của project UE **ProjectFerry** (tên mã nội bộ, trung tính vì tên game chưa đăng ký nhãn hiệu).

- **Đã build và test:** bản standalone (CMake + doctest), trên g++ 13.3 và clang++ 18.1 (container Linux).
- **Dữ liệu thật:** loader đọc trực tiếp `design/data/*.json` của `game-designer` (schema `design/schema/README.md`), xem §4.
- **Chưa build trong UE:** `ArpgCore.Build.cs` và `Private/UE/ArpgCoreModule.cpp`. Môi trường AI không có Unreal Editor (xem §7).

## 1. Nguyên tắc
| Nguyên tắc | Cách làm |
|---|---|
| Deterministic | Thời gian tính bằng giây (`float`). Mọi hệ thống tiến bằng `Tick(dt)`; `dt` âm hoặc NaN bị bỏ qua. RNG là SplitMix64 có seed (`FRng`), không dùng `rand()` hay đồng hồ hệ thống |
| Không I/O trong logic | Logic không đọc file, không log. Loader nhận **chuỗi** JSON; việc đọc file do engine hoặc test làm |
| Không throw qua API công khai | Lỗi trả về bằng giá trị: `TResult<T>` / `FStatus` chứa danh sách `FError{Path, Message}`. Chỉ `DesignDataLoader.cpp` có `try/catch`, để bọc nlohmann/json |
| Data-driven | Mọi tham số nằm trong struct cấu hình (`Config.h`) và được nạp từ `design/data`. Giá trị mặc định trong code chỉ là placeholder; chỗ nào dữ liệu không nói thì ghi ở §5 |
| Không chuỗi hiển thị | Gợi ý bí mật trả về **khóa** (`secrets.<chuỗi>.<node>.hint<tầng>`) trỏ vào văn bản `{vi, en}` trong `secrets.json`, không trả về câu chữ |

## 2. Kiến trúc
```
game/Source/ArpgCore/
  Public/ArpgCore/*.h     API công khai (namespace ArpgCore)
  Private/*.cpp           Cài đặt; MathUtil.h là helper nội bộ
  Private/UE/             Boilerplate module UE (CMake bỏ qua thư mục này)
  Tests/*.cpp             doctest; chỉ biên dịch khi có ARPGCORE_STANDALONE_TESTS
  Tests/fixtures/         malformed.json (test lỗi cú pháp); dữ liệu thật đọc từ design/data
  CMakeLists.txt          Build standalone + test + coverage
  ArpgCore.Build.cs       Module rules cho UBT (chưa build trong UE)
```

| # | Hệ thống | Header | Ý chính |
|---|---|---|---|
| 1 | Nhịp đòn | `ActionTimeline.h`, `InputBuffer.h`, `ComboGraph.h` | Có các phần sau: <ul><li>Startup/Active/Recovery với sự kiện cạnh (vẫn báo đúng khi `dt` lớn). Cửa sổ cancel mặc định = toàn bộ Recovery.</li><li>Input buffer có hạn tuổi.</li><li>Combo graph rẽ nhánh theo nhẹ/nặng **và** độ trễ tính từ lúc đòn trước bắt đầu (nhánh "dừng").</li><li>Hai node ngữ cảnh `@dodge` và `@perfect_parry` cho `dodge,L` và `perfect_parry,L/H`.</li><li>Cửa sổ nối đòn riêng cho từng đòn (`combo_window_s`, 0 = hết chuỗi).</li><li>Đòn khóa theo kỹ năng hoặc cờ (`RequiredUnlock`).</li><li>Né chỉ hủy được đòn sau `DefenseCancelDelay`.</li></ul> |
| 2 | Phòng thủ | `Defense.h` | <ul><li>Né có i-frame, perfect dodge và thời gian hồi.</li><li>Đỡ nhịp (parry) có cửa sổ thường và perfect, nhân hệ số độ khó.</li><li>Đỡ thường (guard): giảm sát thương, nhân Thế nhận vào.</li><li>Cờ `bUnparryable`/`bUnguardable`/`bUndodgeable` trên đòn.</li></ul> |
| 3 | Thế (posture) | `Posture.h` | <ul><li>Tích lũy tới đầy thì vỡ Thế, choáng N giây; hồi sau một khoảng delay.</li><li>Choáng cuối (`ForceStagger`, không hết hạn).</li><li>Đổi `MaxPosture` theo pha, giữ tỉ lệ.</li><li>Tạm dừng đồng hồ choáng khi đang cạy.</li></ul> |
| 4 | Sát thương | `Damage.h` | <ul><li>Máu và Thế × hệ số vũ khí × hệ số độ khó × hệ số stagger × (1 − giảm sát thương).</li><li>`ApplyGuard` tính sát thương khi đỡ.</li><li>`ComputeParryExchange` tính Thế dội lại khi parry: lượng cố định cộng phần theo tỉ lệ.</li></ul> |
| 5 | Hit-stop | `HitStop.h` | <ul><li>Đường cong theo trọng lượng đòn. Dữ liệu `light/medium/heavy/finisher` được đặt vào các điểm 1/2/3/4.</li><li>Kẹp min/max.</li><li>Thời lượng riêng cho nhịp cạy và lúc nhả cạy.</li><li>`FHitStopClock` đổi `dt` thật thành `dt` game.</li></ul> |
| 6 | Nhịp trống | `DrumMeter.h` | <ul><li>N nấc.</li><li>Cộng điểm khi: đòn nhẹ, đòn nặng, đỡ nhịp, đỡ nhịp hoàn hảo, né hoàn hảo, phá Thế, nhịp cạy.</li><li>Trúng đòn thì mất điểm, có tùy chọn giữ các nấc đã đầy.</li><li>Rời giao tranh thì điểm giảm dần.</li><li>Hồi trống tiêu `SurgeCostNotches` nấc.</li></ul> |
| 7 | Khoen (cạy) | `Shackle.h`, `BossEncounter.h`, `Enemy.h` | Xem §3 |
| 8 | Dòng họ | `Lineage.h` | `Handover(prev, request, config) -> next` làm các việc sau: <ul><li>Cây kỹ năng giữ 100%.</li><li>Giữ điểm kỹ năng chưa tiêu và cộng điểm thưởng khi bàn giao.</li><li>Giữ vũ khí và Đòn nhà (`house_moves`, nếu `inheritable`).</li><li>Ghi moveset đời trước vào `FamilyMovesets`.</li><li>Đưa Bảo khí đang mang vào Thạp, xếp theo đời; đời sau lấy ra được.</li></ul> Cây kỹ năng có kiểm tra tiền đề, điểm, nhánh bị khóa và vòng lặp. |
| 9 | Chế tác | `Crafting.h`, `Rng.h` | <ul><li>Công thức vật liệu → Bảo khí.</li><li>Bảo khí bắt buộc có phần thú tự rụng (SB-06).</li><li>Món chế ra bắt đầu ở cấp nền của item.</li><li>Nâng cấp theo công thức `upgrade` trong dữ liệu. Không có công thức thì dùng chi phí tính theo cấp (số nguyên).</li><li>Thao tác trừ kho là nguyên tử.</li><li>Bonus độ hiếm dùng RNG có seed và không bao giờ lên Thần khí.</li></ul> |
| 10 | Đồ thị bí mật | `SecretGraph.h` | <ul><li>Node làm được khi có đủ manh mối `requires.all` và ít nhất một manh mối trong `requires.any`.</li><li>Manh mối không bao giờ mất. Node `is_start` đã hoàn thành sẵn từ đầu.</li><li>`CheckNoSoftlock()` duyệt **toàn bộ** trạng thái: mọi node đều tới được, và từ mọi trạng thái vẫn tới được node kết thúc. Ngữ nghĩa giống `tools/design_validate.py`. Nếu không đạt, hàm trả về phản ví dụ ngắn nhất.</li><li>`GetHint(progress, tier 1..3)` chọn node kế tiếp không dẫn vào ngõ cụt.</li></ul> |
| 11 | Dữ liệu | `Config.h`, `DesignDataLoader.h` | `LoadDesignData` đọc 6 file thiết kế (§4) rồi chạy `ValidateConfig` để kiểm tra: <ul><li>Khoảng giá trị.</li><li>Tham chiếu chéo.</li><li>Combo mơ hồ.</li><li>Softlock bí mật.</li><li>Boss có kết thúc được không.</li><li>Phần thưởng là mảnh khoen.</li></ul> |

## 3. Cơ chế khoen (VERDICT, `DEMO_0_1_DESIGN.md` §3, §6, `enemies.json`)
```
Intact --vỡ Thế--> Cracking --vỡ Thế (đủ khoen_cracks_at_least = 3)--> Ready
Máu chạm sàn (hp_floor = 1, hp_floor_forces_final_stagger) -> choáng cuối không hết hạn + mở cạy ngay
Ready + boss đang choáng --BeginPry--> Prying (đồng hồ choáng tạm dừng)
Prying: 3 nhịp trên lưới trống 84 bpm (ô n ở LeadIn + n·60/84 s), mỗi ô ±0,15 s
  - trúng ô                      -> BeatHit (hit-stop 0,08 s); đủ 3 -> Freed (hit-stop 0,12 s)
  - bấm sớm hoặc để lỡ ô         -> BeatMissed: thử lại nhịp đó ở ô kế tiếp (tối đa 2 lần)
  - hụt lần thứ 3 cùng một nhịp  -> Failed: con thú vùng ra, hết choáng, hồi NỬA Thế,
                                    khoen giữ đủ 3 nấc => phá phần Thế đó là mở lại cạy
Chế độ: Timed (bấm), Hold (giữ 0,5 s mỗi nhịp, nhả chỉ reset tiến độ), Auto ("Nghe chuyện")
Khoen tắt (cờ feature_khoen, V9/K0): máu chạm sàn -> choáng cuối -> PerformFinisher (cú đẩy) -> Fled
```
- Trận **luôn kết bằng cạy** khi khoen bật. Boss không chết, vì máu không xuống dưới `hp_floor`.
- Pha 2 bắt đầu khi khoen nứt ≥ 2 **hoặc** máu ≤ 50%. Khi đó Thế tối đa đổi từ 320 xuống 260, giữ nguyên tỉ lệ.
- **Mảnh khoen không cho người chơi sức mạnh:**
  - Loader bắt buộc `shard_handling = "narrative_only_no_item"`.
  - Vật liệu loại `shackle_fragment` không được làm đầu vào chế tác hay nâng cấp, và không được nằm trong phần rơi.
  - Không có hàm nào đếm mảnh.
- **Bằng chứng chống softlock ở mức logic** (chưa phải ở mức animation):
  - Test bot dùng **tham số thật**: 8 seed × khoen bật/tắt. Bot nhắm trúng 55–90%, có hụt nhịp cạy.
  - Khoen bật luôn kết thúc bằng Freed, khoen tắt luôn kết thúc bằng Fled, cả hai đều rơi `mat_nanh_rung`.
  - Thời gian trận mô phỏng 48–64 s. Bot luôn đánh trúng, nên con số này **không** phải số liệu cân bằng.
  - Có thêm 50 lượt bot với tham số tổng hợp.

## 4. Đọc dữ liệu thiết kế (`LoadDesignData`)
Engine hoặc test đọc 6 file rồi đưa nội dung vào `FDesignDataSources`. Chuỗi hiển thị `{vi, en}`, `codex.json`, `strings.json`, nhãn và trường trình bày (camera, lock-on, telegraph…) là việc của UI hoặc tầng game, ArpgCore bỏ qua.

| File | Đọc vào |
|---|---|
| `combat_tuning` | `input`, `player`, `dodge`, `guard`, `enemy_the_defaults`, `drum_rhythm`, `hit_stop`, `pry`, `difficulty.presets`, `healing` |
| `weapons` | Mỗi vũ khí: một `FMovesetConfig`. Chuỗi `input` được dịch thành chuyển tiếp combo: <ul><li>`L`/`H` + `chain_index` nối với đòn có chỉ số liền trước.</li><li>`L,L,pause,H`: rẽ từ đòn L thứ 2, độ trễ ≥ `combo_pause_threshold_s`.</li><li>`dodge,L` và `perfect_parry,L`: dùng node ngữ cảnh.</li></ul> Thêm `drum_burst`. Đòn nhà ở `lineage` được thêm vào mọi bộ chiêu. |
| `enemies` | Quái thường: `FEnemyConfig`. Boss: `FBossConfig`, gồm pha, sàn máu, khoen (`pry_condition`, `on_pry_success`, `fallback_when_disabled`) |
| `items` | `items` (loại, độ hiếm, nguồn, cấp), `recipes` (`craft` / `upgrade`). Vật liệu `shed_after_pry` / `remains_after_dissolve` được coi là phần của boss |
| `lineage` | `inheritance`, `skill_tree`, `characters`, `house_moves` |
| `secrets` | `chains` (node, `requires.all/any`, `grants`, `is_start/is_end`, khóa gợi ý), `locations` |

- Lỗi kèm đường dẫn có tên file, vd. `combat_tuning.pry.on_fail: unsupported value ...`.
- Khi dữ liệu dùng giá trị mà ArpgCore chưa cài, loader **báo lỗi** chứ không lặng lẽ bỏ qua. Các trường hợp: `crack_on` ≠ `the_break`, `on_fail` ≠ `boss_recovers_the_half`, `finisher` ≠ `final_stagger_shove`, rơi đồ có `chance` < 1, chuỗi input không hiểu, manh mối `consumable: true`, node ở nơi không quay lại được.
- `charge` (gồng đòn nặng) chưa được mô hình hóa nên loader chỉ trả **cảnh báo**.
- `tools/design_validate.py`: 0 lỗi, 2 cảnh báo về nguồn của dữ liệu. ArpgCore không thêm schema mới.

## 5. Diễn giải chờ designer xác nhận
Đã đối chiếu với `DEMO_0_1_DESIGN.md` và `enemies.json`. Ba điểm trước đây khác thiết kế và **đã sửa theo thiết kế**:

1. **Trượt nhịp:** trước đây trượt một nhịp là hủy ngay. Nay thử lại nhịp đó 2 lần, hụt thêm thì hồi **nửa** Thế (`miss_retries_per_beat`, `on_fail`).
2. **Khoen tắt:** trước đây trận kết thúc bằng máu về 0. Nay là cú đẩy khi choáng cuối, con thú chạy và vẫn rụng nanh.
3. **Sàn máu:** nay cũng **mở cạy**.

Giữ nguyên diễn giải "khoen giữ nguyên số vết nứt sau khi cạy hỏng", vì thiết kế nói đúng như vậy.

Những chỗ thiết kế không nói, ArpgCore chọn như sau:

| # | Chỗ dữ liệu không nói | ArpgCore chọn |
|---|---|---|
| 1 | Nhịp cạy đầu tiên đến lúc nào | `LeadIn` = 1 phách (60/84 ≈ 0,714 s) sau khi bắt đầu cạy |
| 2 | `beat_window_s` là toàn cửa sổ hay nửa cửa sổ | **±0,15 s** (theo câu "±0,15 s" trong DEMO §3) |
| 3 | Thử lại nhịp hụt rơi vào lúc nào | Ô kế tiếp trên lưới trống. Bấm sớm cũng tính là hụt ô hiện tại (chống bấm loạn) |
| 4 | Choáng cuối do sàn máu có hết hạn không | **Không hết hạn**, tới khi cạy (hoặc đẩy). Sàn máu chỉ ép choáng cuối **một lần**; sau một lần cạy hỏng thì phải phá Thế |
| 5 | Hệ số sát thương khi địch đang choáng | **1,0** (dữ liệu không có), để không tạo hằng số ẩn |
| 6 | Đỡ nhịp có trừ Thế người chơi không | Không. Chỉ có Thế dội lại cố định 20/40 cho địch |
| 7 | Thời gian khóa của động tác Đỡ nhịp | 0,4 s (mặc định của code, dữ liệu không có) |
| 8 | `duration_s` của né đã gồm `recovery_s` chưa | Chưa gồm. Né bận tổng cộng 0,45 + 0,15 s; cửa sổ `dodge,L` dài 0,6 s |
| 9 | Độ trễ của nhánh "dừng" tính từ đâu | Từ lúc **đòn trước bắt đầu** tới lúc bấm (≥ 0,35 s). Bấm dồn thì ra đòn nặng gốc |
| 10 | `damage_dealt_mult` có nhân cả Thế không | Không, chỉ nhân máu |
| 11 | Trọng lượng hit-stop của đòn địch | Mức `medium` (dữ liệu không có) |
| 12 | Đòn nhà trong combo | Thêm vào mọi bộ chiêu từ `@perfect_parry` bằng phím nặng, khóa bằng cờ `flag_boss_lon_loi_freed` |
| 13 | Công thức nâng cấp liệt kê chính món đồ trong `inputs` | Món được nâng cấp không bị trừ khỏi kho |
| 14 | Thạp | Bảo khí đang mang tự vào Thạp khi bàn giao; đời sau lấy ra bằng `TakeFromThap` |

## 6. Build và test (Linux, đã chạy)
```bash
# g++
CXX=g++ cmake -S game/Source/ArpgCore -B build/arpgcore -G Ninja -DCMAKE_BUILD_TYPE=Debug
cmake --build build/arpgcore && ctest --test-dir build/arpgcore --output-on-failure
# clang++ (thư mục build mới)
CXX=clang++ cmake -S game/Source/ArpgCore -B build/arpgcore -G Ninja -DCMAKE_BUILD_TYPE=Debug
# Độ phủ dòng (gcov; script tools/coverage_summary.py, không cần gcovr)
CXX=g++ cmake -S game/Source/ArpgCore -B build/arpgcore-cov -G Ninja -DCMAKE_BUILD_TYPE=Debug -DARPGCORE_COVERAGE=ON
cmake --build build/arpgcore-cov && ctest --test-dir build/arpgcore-cov
cmake --build build/arpgcore-cov --target coverage      # thoát với mã 1 nếu Private/ < 80%
```
- Cờ biên dịch: `-Wall -Wextra -Wpedantic -Werror`. Thư viện vendor được include dạng `SYSTEM`.
- Test đọc dữ liệu thật ở `ARPGCORE_DESIGN_DATA_DIR` = gốc repo + `ARPGCORE_DESIGN_DATA_RELPATH`. Biến cache CMake này có giá trị mặc định `design/data`.
- CTest tạo một mục cho mỗi `TEST_SUITE` (tự dò từ `Tests/*.cpp` lúc configure), cộng một mục `ArpgCore.All` chạy toàn bộ.

**Kết quả đo ngày 2026-11-03 (container Linux, trên các thay đổi chưa commit, sau commit b16e0b6):**

| Hạng mục | g++ 13.3.0 | clang++ 18.1.3 |
|---|---|---|
| Build Debug, `-Werror` | 0 cảnh báo | 0 cảnh báo |
| Build Release, `-Werror` | 0 cảnh báo, test đạt | 0 cảnh báo, test đạt |
| Test | 100 test case, 5887 assertion, 18/18 mục CTest đạt | như g++ |
| Độ phủ dòng `Private/` | **99,1%** (2253/2274 dòng, gcov) | không đo được: container thiếu `libclang_rt.profile` |

## 7. Unreal Engine: CHƯA BUILD TRONG UE
- `ArpgCore.Build.cs`:
  - Đặt `CppStandard = Cpp20` và phụ thuộc `Core`.
  - Đặt `bEnableExceptions = true`, vì `DesignDataLoader.cpp` dùng nlohmann/json và bọc trong `try/catch`.
  - Thêm `<repo>/third_party` vào include riêng.
  - Include của nlohmann được bọc trong `THIRD_PARTY_INCLUDES_START/END` nếu macro này tồn tại.
- UBT biên dịch mọi `.cpp` trong thư mục module. Các file `Tests/*.cpp` được bọc bởi `#if defined(ARPGCORE_STANDALONE_TESTS)`, nên trong UE chúng thành file rỗng.
- Phương án thay thế nếu PO không muốn bật exceptions: tách `DesignDataLoader.cpp` thành module hoặc thư viện riêng có exceptions, hoặc định nghĩa `JSON_NOEXCEPTION`. Khi đó loader dùng nhánh `allow_exceptions=false` đã có sẵn, nhưng nhánh này **chưa được test**.
- **Hướng dẫn cho PO (Windows, máy RTX 5050):**
  1. Tạo project C++ trống `ProjectFerry` (UE 5.x đã pin, xem TECH_SPEC §2), đặt cùng cấp với `game/Source`, sao cho đường dẫn là `game/ProjectFerry.uproject`.
  2. Thêm `"ArpgCore"` vào `PublicDependencyModuleNames` của module game. Thêm `{ "Name": "ArpgCore", "Type": "Runtime", "LoadingPhase": "Default" }` vào `Modules` trong `.uproject`.
  3. Chuột phải `.uproject` → *Generate Visual Studio project files* → build cấu hình `Development Editor | Win64`.
  4. Gửi lại **toàn bộ log build** (Output window, hoặc `%LOCALAPPDATA%\UnrealBuildTool\Log.txt`). Lỗi dễ gặp: cảnh báo MSVC C4251/C4244/C4668 trong code hoặc trong nlohmann. Gửi log để sửa, không tự tắt cảnh báo.

## 8. Giới hạn đã biết
- **Chưa mô hình hóa** (tầng game hoặc bước sau):
  - Gồng đòn nặng (`charge`).
  - `interrupt_threshold`, `front_damage_mult`, chọn đòn của AI, `max_simultaneous_attackers`.
  - Hiệu ứng của nút kỹ năng: dữ liệu `effect.type/value` đã được đọc nhưng do game áp dụng. Riêng `unlock_move_chain_index` đã chạy qua `RequiredUnlock`.
  - Đòn nhiều hit, lock-on, hồi máu, người bị mê.
  - Ràng buộc `unique` của vật phẩm.
- **Số thực:**
  - Kết quả lặp lại được trên cùng nền tảng và cùng trình biên dịch.
  - Chưa kiểm tra bit-exact giữa MSVC và GCC/Clang; chỉ quan trọng nếu sau này cần replay hoặc lockstep.
  - Chi phí nâng cấp và RNG dùng số nguyên, nên không bị ảnh hưởng.
- **Đồ thị bí mật:**
  - Tối đa 64 node mỗi chuỗi.
  - Kiểm tra softlock có độ phức tạp hàm mũ theo số node độc lập. Có trần `MaxStates`; vượt trần thì báo "inconclusive", không báo đạt.
  - Node kết thúc được coi là trạng thái cuối.
- **Bot trong test** là bằng chứng "trận luôn kết thúc", **không** phải số liệu cân bằng hay thời lượng chơi thật.
- **Coverage clang:** không đo được trong container này, vì thiếu runtime profile.
