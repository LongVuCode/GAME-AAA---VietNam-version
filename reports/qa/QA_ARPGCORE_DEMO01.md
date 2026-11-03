# QA: ArpgCore, Demo 0.1

- **Người duyệt:** `qa-lead` (AI). Độc lập với người viết code. Không sửa code, không commit.
- **Ngày:** 2026-11-03.
- **Đối tượng:** `game/Source/ArpgCore/` ở commit `cedfd0f` ("core: load real design data in ArpgCore…"), nhánh `feat/demo-0.1`. Đây là commit mới nhất chạm vào ArpgCore.
- **Lưu ý về HEAD:** trong lúc review, HEAD tiến lên `91c8044`. Lệnh `git diff cedfd0f HEAD` xác nhận **không có thay đổi** nào trong `game/Source/ArpgCore/` hay trong 6 file dữ liệu ArpgCore đọc. Chỉ `design/data/strings.json` đổi, và ArpgCore không đọc file này.
- **Đối chiếu với:** `CLAUDE.md`, `docs/DEMO_PLAN.md`, `design/DEMO_0_1_DESIGN.md`, `design/schema/README.md`, `design/data/*.json`, `game/Source/ArpgCore/README.md`.

## 1. Kết luận: **ĐẠT CÓ ĐIỀU KIỆN**

- **Tiêu chí nghiệm thu ArpgCore (DEMO_PLAN) đạt đủ, đã đo lại độc lập:**
  - Build `-Wall -Wextra -Wpedantic -Werror` trên g++ 13.3 và clang++ 18.1: 0 cảnh báo.
  - 100% test đạt.
  - Độ phủ dòng `Private/` là 99,1%.
- **Lỗi:** không có lỗi **Chặn**. Có **3 lỗi Nghiêm trọng** và **9 lỗi Nhẹ**.
- **Sanitizer:** chạy ASan + UBSan với gcc, và UBSan (trap) với clang. Không có lỗi sanitizer nào.
- **Điều kiện trước khi nối ArpgCore với game layer (UE hoặc prototype):**
  - Sửa S1 (gợi ý bí mật chỉ sai node).
  - Chốt hợp đồng đồng hồ của cạy so với hit-stop (S2).
  - Designer phán diễn giải "dừng" của combo nhánh (S3).

## 2. Kết quả đo (thực chạy trong container, ngày 2026-11-03)

**Môi trường:**
- Linux container, g++ 13.3.0 (Ubuntu 13.3.0-6ubuntu2~24.04.1), Ubuntu clang 18.1.3, CMake 3.28.3, Ninja.
- nlohmann/json 3.11.3 (vendored).
- Thư mục build: `/tmp/claude-0/-home-user/c58ad2cd-0dde-5c55-b1e4-0cacdf2a6473/scratchpad/qa_build_*`.

| Lượt | Cấu hình | Build | Test (CTest / doctest) |
|---|---|---|---|
| `qa_build_gcc` | g++ Debug, `-Werror` | OK, 0 cảnh báo | 18/18 mục CTest; 100 test case, 5887 assertion, 0 lỗi |
| `qa_build_clang` | clang++ Debug, `-Werror` | OK, 0 cảnh báo | 18/18; 100 test case, 5887 assertion |
| `qa_build_gcc_rel` | g++ Release | OK, 0 cảnh báo | 18/18 |
| `qa_build_clang_rel` | clang++ Release | OK, 0 cảnh báo | 18/18 |
| `qa_build_gcc_asan` | g++ Debug `-fsanitize=address,undefined -fno-sanitize-recover=all` (đã kiểm `libasan.so.8`, `libubsan.so.1` được link) | OK | 18/18. **0 báo cáo ASan, UBSan hay LeakSanitizer** |
| `qa_build_clang_ubsantrap` | clang++ Debug `-fsanitize=undefined -fsanitize-trap=undefined` | OK | 18/18. Không trap |
| `qa_build_clang_asan` | clang++ ASan + UBSan | **Không chạy được**: container thiếu `libclang_rt.asan*.a` (lỗi khi CMake thử biên dịch). Đây là giới hạn môi trường, không phải lỗi code | — |
| `qa_build_gcc_cov` | g++ `-DARPGCORE_COVERAGE=ON` + target `coverage` (`tools/coverage_summary.py`) | OK | 18/18. **`Private/`: 2253/2274 dòng = 99,1%** (ngưỡng 80%). Tổng cả `Public/` là 98,9% (2342/2367) |

**Kiểm tra bổ sung của QA** (mã thăm dò nằm ngoài repo: `/tmp/claude-0/-home-user/c58ad2cd-0dde-5c55-b1e4-0cacdf2a6473/scratchpad/qa_probe/`):

| Kiểm tra | Kết quả |
|---|---|
| Biên dịch `DesignDataLoader.cpp` với `-fno-exceptions -DJSON_NOEXCEPTION` (mô phỏng module UE tắt exception), g++ và clang++, `-Werror` | Biên dịch đạt |
| Fuzz đột biến `LoadDesignData` trên bản build **không exception**, có ASan + UBSan (`fuzz.cpp`) | 24.072 lượt, **không crash, không abort, không lỗi sanitizer**. 14.307 lượt nạp được, 9.765 lượt bị từ chối có lỗi. Mỗi giá trị JSON trong 6 file lần lượt bị thay bằng: null, chuỗi, -1, 0, 1e300, -0.5, 2^31, -2^31-1, `[]`, `{}`, true, hoặc bị xóa. Ngoài ra có thử root rỗng, `[]`, `null`, `schema_version: 2`, JSON cắt cụt và 100.000 dấu `[` lồng nhau |
| `python3 tools/design_validate.py` | 0 lỗi, 2 cảnh báo, khớp README |
| `python3 tools/research_tool.py lint` | 0 lỗi, 7 cảnh báo |
| `python3 -m unittest discover -s tests` | 47 test, OK |

## 3. Bảng lỗi

| Mức | file:dòng | Vấn đề | Cách tái hiện | Đề xuất |
|---|---|---|---|---|
| **Nghiêm trọng** | `Private/SecretGraph.cpp:399-411` (`GetHint`) | **S1. Gợi ý chỉ vào node thừa.** `GetHint` chọn node khả dụng **đầu tiên** còn đường tới kết thúc. Trong `sec_lo_bo_hoang`, sau khi làm `sn_trap_a`, node `sn_trap_b` (nguồn thay thế của **cùng** manh mối `clue_vet_bay`) vẫn khả dụng và đứng trước `sn_scrap`. Vì vậy cả 3 tầng gợi ý đưa người chơi tới cổng bãi lầy, không tới bước kế tiếp thật (bãi lau). Như vậy gợi ý không làm đúng việc "mơ hồ → chỉ hướng → chỉ thẳng" (DEMO §8). README §2 dòng 41 viết "chọn node kế tiếp không dẫn vào ngõ cụt", đúng về chữ nhưng che lỗi này | Probe P1 (`qa_probe/probe.cpp`) nạp dữ liệu thật, `Complete("sn_trap_a")`, rồi gọi `GetHint(P,3)`. Kết quả: `available=sn_trap_b sn_scrap hint=secrets.sec_lo_bo_hoang.sn_trap_b.hint3` | Bỏ qua node mà mọi `grants` đều đã biết. Ưu tiên node nằm trên đường ngắn nhất tới `is_end`. Thêm test: sau `sn_trap_a`, gợi ý phải là `sn_scrap` |
| **Nghiêm trọng** | `Private/Shackle.cpp:124,135`; `Private/BossEncounter.cpp` (`Tick`); `Tests/ConfigTests.cpp` (`RunBossBot`) | **S2. Lưới nhịp cạy trôi so với tiếng trống khi `dt` đã qua hit-stop.** API không nói `FBossEncounter::Tick` nhận dt thật hay dt game. `FHitStopClock` được ghi là công cụ "đổi dt thật → dt game", và chính bot test cũng đưa **dt game** vào `Boss.Tick`. Mỗi nhịp trúng có hit-stop 0,08 s, nên `PryElapsed` chậm 0,08 s so với thời gian thật. Sau 2 nhịp đã lệch 0,16 s, vượt cửa sổ ±0,15 s. Người chơi bấm **đúng** tiếng trống 84 bpm sẽ hụt nhịp 3, hụt cả 2 lần thử lại, rồi cạy hỏng. Ở chế độ Timed, việc cạy thành **không thể thắng**, dù không softlock nhờ vòng phá Thế lại. Bot test không lộ lỗi này vì bot bấm theo đồng hồ nội bộ (`GetPryElapsed`), không theo nhịp thật | Probe P3 bấm theo lưới thật `60/84·(n+1)`. Không hit-stop: `hit hit FREED`. Với dt qua `FHitStopClock` và `Trigger(pry_beat_s)` sau mỗi nhịp trúng: `hit hit miss miss FAILED` | Ghi rõ hợp đồng: đồng hồ cạy chạy theo **thời gian thật**, hoặc ArpgCore tự bù hit-stop vào lưới. Thêm test bấm theo thời gian thật có hit-stop. Thêm câu này vào §5 README |
| **Nghiêm trọng** | `Private/ComboGraph.cpp:245`; `Private/DesignDataLoader.cpp:603`; README §5 #9 (dòng 107) | **S3. Nhánh "dừng" không cần dừng.** Độ trễ tính từ lúc **L2 bắt đầu**, ngưỡng 0,35 s. Ngưỡng này **ngắn hơn chính đòn L2**: giáo dài 0,56 s, rìu dài 0,81 s. Hệ quả: <ul><li>Bấm H theo nhịp bình thường trong lúc L2 đang hồi đòn đã ra đòn nhánh `sp_b1`/`ax_b1`.</li><li>Với rìu, cửa sổ hủy đòn mở ở 0,36 s, nên **mọi** lần bấm H trong recovery của L2 đều ra đòn nhánh.</li><li>Đòn nặng gốc chỉ ra khi bấm dồn trước 0,35 s.</li></ul> Điều này mâu thuẫn với "Nhẹ, nhẹ, **dừng ≥ 0,35 s**, nặng" (DEMO §3) | Probe P2 (dữ liệu thật, tick 1/120 s), bấm H sau khi L2 bắt đầu: <ul><li>giáo: 0,30 s → `sp_h1`; 0,36 / 0,40 / 0,50 s → `sp_b1`;</li><li>rìu: 0,30 s → `ax_h1`; 0,36 / 0,40 / 0,50 s → `ax_b1`.</li></ul> | Designer cần phán. Đề xuất mặc định: đo khoảng dừng từ **lúc L2 kết thúc**, hoặc từ lúc cửa sổ hủy đòn mở, tới lúc bấm H. Thêm test "bấm theo nhịp không dừng → đòn nặng gốc" |
| Nhẹ | `Private/Config.cpp:181-197`; `Private/DesignDataLoader.cpp:816-819` | **N1.** Validator **cho phép khoen bật mà `hp_floor` = 0 hoặc thiếu**. Loader mặc định `HealthFloor = 0` và `forces_final_stagger = false`. Khi đó boss bị **Defeated** bằng máu, trái với "Trận luôn kết bằng cạy; con thú không chết" (DEMO §6). Dữ liệu hiện tại có `hp_floor: 1`, nên đây là lỗ hổng phòng thủ | Probe P5: `HealthFloor=0` → `ValidateConfig` trả 0 lỗi; một đòn 5000 → `outcome=Defeated` dù `shackle.bEnabled=1` | Khi `Sh.bEnabled`, bắt buộc `HealthFloor > 0` **và** `bHealthFloorForcesFinalStagger`, hoặc đòi `hp_floor` là trường bắt buộc |
| Nhẹ | `Private/BossEncounter.cpp:67` | **N2.** `Applied.Posture` báo lượng Thế **chưa thực sự áp** ở đòn chạm sàn máu (nhánh `ForceStagger`) và ở nhánh `Defeated`. Game layer dựa vào giá trị này để hiện số hoặc cộng Nhịp sẽ sai | Probe P6: đòn 5000/50 → `Applied.Posture=50.0` trong khi Thế bị ép đầy, không do đòn này | Đặt `Applied.Posture = 0` ở hai nhánh đó, hoặc ghi rõ ngữ nghĩa |
| Nhẹ | `Private/Crafting.cpp:88,123` | **N3.** `FInventory::RemoveAll` với `Amount` âm lại **cộng** vật phẩm vào kho. `Add` hoặc cộng dồn `Needed` có thể tràn `int` có dấu (UB). `Upgrade()` không kiểm lại `Amount` của công thức nâng cấp lúc chạy, chỉ validator kiểm | Probe P7: `Add("x",1)`; `RemoveAll({{"x",-5}})` → `ok=1`, `count=6` | Từ chối `Amount <= 0` trong `HasAll/RemoveAll`. Bão hòa hoặc kiểm tràn ở `Add` |
| Nhẹ | `Private/Shackle.cpp:124-135` | **N4.** Không kẹp `dt` lớn. Một khung giật 2,5 s (tải, alt-tab) làm hụt, hụt, rồi **Failed** chỉ trong 2 khung kế tiếp, tức người chơi bị phạt vì máy giật. Với `dt` = 1,0 s thì chỉ mất 1 lượt thử | Probe `probe2.cpp`: `Tick(2.5)`, `Tick(1/60)`, `Tick(1/60)` → `BeatMissed`, `BeatMissed`, `Failed` | Kẹp `dt` của cạy (ví dụ ≤ nửa phách), hoặc để game tạm dừng cạy khi mất focus. Ghi vào README |
| Nhẹ | `Public/ArpgCore/ComboGraph.h:136`; `Private/ComboGraph.cpp:188` | **N5.** `FComboRunner::Now` là `float` cộng dồn mãi. Hệ quả: <ul><li>Sau 1 giờ, lệch −8,4 s.</li><li>Sau khoảng 4,5 giờ, mỗi bước sai −6% (0,0078 thay vì 0,0083).</li><li>Ở 262.144 s (khoảng 72,8 giờ), `Now` **đứng yên**: input buffer, cửa sổ `@dodge`/`@perfect_parry` và cửa sổ nối combo không bao giờ hết hạn.</li></ul> Hệ quả: <ul><li>Tính deterministic theo thời gian chơi dài kém.</li><li>Thời gian chơi dài ảnh hưởng tới cửa sổ input.</li></ul> | `probe2.cpp`: tick 1/120 s → `real=3600 Now=3591.572`; `real=16384 step=0.007812`; `real=300000 Now=262144 step=0` | Dùng `double`, hoặc đặt lại gốc thời gian khi runner rảnh |
| Nhẹ | `Private/DesignDataLoader.cpp:979`; `Private/Lineage.cpp:275` | **N6.** Đòn nhà được khóa bằng **cờ** `flag_boss_lon_loi_freed` (`RequiredUnlock`), còn `FGeneration::HouseMoves` lưu **id** `hm_chong_sao`. Hai thứ không nối với nhau, nên `inheritable=false` không chặn được đời sau dùng đòn nếu cờ còn theo dòng họ (`secret_state_scope: lineage`). README §2 mục 8 nói "Giữ Đòn nhà nếu `inheritable`" nhưng không có đường nào từ `HouseMoves` vào `SetUnlocked` | Probe P8: `house move id=hm_chong_sao required unlock=flag_boss_lon_loi_freed` | Thêm helper tạo tập unlock từ `FGeneration` (skill + house move). Hoặc khóa đòn bằng id đòn nhà và để cờ chỉ dùng khi học |
| Nhẹ | `Public/ArpgCore/Lineage.h:79`; `Private/DesignDataLoader.cpp:423, 636, 717`; `Public/ArpgCore/ComboGraph.h:85-86` | **N7. Hard-code ngoài dữ liệu, không có trong §5:** <ul><li>`MaxFamilyMovesets = 3`.</li><li>`HitStop.TimeScaleDuringStop = 0` (đóng băng hoàn toàn).</li><li>`InputBufferCapacity = 1`.</li><li>`ChainLinkWindow = 0,6` (được dùng khi `combo_window_s` < 0, và không validator nào chặn giá trị âm này).</li><li>`phases[].the_max` ≤ 0 bị coi lặng lẽ là "giữ max cũ", không báo lỗi.</li></ul> | Đọc code. Fuzz: `combo_window_s = -1` và `the_max = -1` đều nạp **OK** | Đưa vào dữ liệu hoặc ghi vào §5. Validator chặn `combo_window_s < 0` và `the_max <= 0` |
| Nhẹ | `Private/Defense.cpp:68`; `Private/Damage.cpp:26` | **N8. Diễn giải không được ghi trong §5:** <ul><li>Né hoàn hảo tính từ **đầu i-frame** [0,05; 0,15] s, trong khi DEMO §3 viết "trong 0,10 s đầu".</li><li>`damage_taken_mult` nhân cả **Thế** người chơi nhận (DEMO §11 chỉ nói "Sát thương nhận").</li><li>Đồng hồ cạy so với hit-stop (xem S2).</li></ul> | Đọc code, đối chiếu DEMO §3, §11 | Thêm các mục này vào §5 để designer xác nhận |
| Nhẹ | `README.md:130, 146, 64, 41`; `docs/DEMO_PLAN.md` | **N9. Trung thực / độ tươi của tài liệu:** <ul><li>Dòng 130 ghi "trên các thay đổi chưa commit, sau commit b16e0b6". Nay đã là `cedfd0f`; số liệu QA đo lại **khớp chính xác** (100 / 5887 / 18 / 99,1% = 2253/2274).</li><li>Dòng 146 ghi nhánh không exception "chưa được test". QA đã biên dịch và fuzz nhánh này (xem §2); README có thể cập nhật và dẫn bằng chứng.</li><li>Dòng 64 ghi "có hụt nhịp cạy". Trong bot dữ liệu thật, cả 8 seed khoen bật đều `pries=1`, nên nhánh "cạy hỏng → hồi nửa Thế" **chỉ** được phủ bằng tham số tổng hợp (`ShackleTests`), không phải dữ liệu thật.</li><li>Dòng 41: xem S1.</li><li>DEMO_PLAN gọi module UE là `HonTrong/HonTrongEditor`, còn README và `Build.cs` dùng `ProjectFerry`.</li></ul> | `ArpgCoreTests -s -tc="Lợn Lòi Đầm bot*"` in INFO: thời gian 48,16–63,33 s (khớp claim "48–64 s"); khoen bật luôn `pries=1` | Cập nhật hash và bằng chứng. Ghi rõ phạm vi của các con số bot. Thống nhất tên project UE |

## 4. README §5: đối chiếu 14 diễn giải với thiết kế và dữ liệu

| # | Diễn giải | Kết luận QA |
|---|---|---|
| 1 | LeadIn = 1 phách | Thiết kế không nói. Không mâu thuẫn |
| 2 | `beat_window_s` = ±0,15 s | Khớp DEMO §3 ("±0,15 s") |
| 3 | Thử lại ở ô kế tiếp; bấm sớm tính là hụt | Khớp "thử lại nhịp đó 2 lần". Không mâu thuẫn |
| 4 | Choáng do sàn máu không hết hạn, chỉ một lần | Khớp DEMO §6 ("khoen giữ 3 nấc", phá Thế lại để mở cạy) |
| 5 | Hệ số sát thương khi choáng = 1,0 | Dữ liệu không có. Không mâu thuẫn |
| 6 | Đỡ nhịp không trừ Thế người chơi; dội 20/40 | Khớp `guard.parry_enemy_the_damage` = 20 và `perfect_parry_enemy_the_damage` = 40. "Tốn Thế" ở DEMO §3 là của Đỡ thường |
| 7 | Khóa Đỡ nhịp 0,4 s | Hard-code, nhưng dữ liệu không có. Không mâu thuẫn |
| 8 | `duration_s` né không gồm `recovery_s` (tổng 0,6 s) | **Mơ hồ.** DEMO §3 ghi "Né 0,45 s" như tổng thời lượng; schema tách `recovery_s`. Cần designer xác nhận, chưa phải mâu thuẫn |
| 9 | Khoảng dừng tính từ lúc đòn trước bắt đầu | **MÂU THUẪN** với "dừng ≥ 0,35 s" (xem S3, có bằng chứng P2) |
| 10 | `damage_dealt_mult` chỉ nhân máu | Không mâu thuẫn |
| 11 | Đòn địch dùng hit-stop `medium` | Dữ liệu không có. Không mâu thuẫn |
| 12 | Đòn nhà từ `@perfect_parry` + nặng, khóa bằng cờ | Khớp DEMO §9 và `lineage.json`. Có lỗ hổng về `inheritable` (N6) |
| 13 | Món được nâng cấp không bị trừ khỏi kho | Khớp DEMO §7 ("Sáp ong cũ + Dây mây ×1") |
| 14 | Bảo khí đang mang tự vào Thạp khi bàn giao | Không mâu thuẫn, nhưng lệch thứ tự. DEMO §1 bước 6 nói Cói "chế Nanh Đầm, cất vào Thạp" **trước** bàn giao. API vẫn hỗ trợ (game tự đẩy vào `Thap`) |

**Tóm lại:** 1 diễn giải mâu thuẫn (#9), 1 diễn giải mơ hồ cần designer chốt (#8), 12 diễn giải không mâu thuẫn. Ngoài ra còn 3 diễn giải **chưa có trong §5** (N8).

## 5. Các hạng mục đã kiểm, không thấy lỗi

- **`dt` = 0, âm, NaN, ±inf:** mọi `Tick`/`Advance` đều qua `SanitizeDelta` (giá trị không hữu hạn hoặc ≤ 0 thì thành 0). `ActionTimeline` báo đủ các sự kiện cạnh khi `dt` lớn. Các trường hợp `dt` lớn ở cạy và đồng hồ combo: xem N4, N5.
- **Chia cho 0:** đã có chặn ở `GetRatio`, `UpdatePhase` (MaxHealth), `GetFullNotches`, `bpm` (loader báo lỗi khi ≤ 0), `HitStop` (span), `FRng::RangeInt`. Validator chặn các mẫu số bằng 0 trong dữ liệu.
- **Softlock của state machine khoen/cạy:**
  - Chế độ Timed: hỏng → `Ready` + hồi nửa Thế → phá Thế lại → cạy.
  - Chế độ Auto: luôn ra Freed.
  - Chế độ Hold: không có nhánh thất bại.
  - Sàn máu ép choáng cuối và `ForceReady`.
  - Khoen tắt: choáng cuối → `PerformFinisher`.
  - Validator chặn trường hợp "có sàn máu, không khoen, không ép choáng".
  - Không tìm thấy trạng thái nào không thoát được, trừ S2 (Timed không thể thắng nếu tích hợp sai đồng hồ) và N1 (Defeated khi thiếu sàn máu).
- **Chuyển pha:**
  - Đúng DEMO §6: khoen ≥ 2 nấc **hoặc** máu ≤ 50%.
  - Thế 320 → 260, giữ tỉ lệ.
  - Đúng các số liệu boss: HP 2000, sàn 1, 3 nấc, 3 nhịp, 84 bpm, thử lại 2 lần, im lặng 3 s.
- **Deterministic:**
  - Không dùng `rand()` hay đồng hồ hệ thống. RNG là SplitMix64 có seed.
  - `unordered_map` chỉ dùng để tra cứu. Thứ tự BFS và `std::set` cố định.
  - Hai lượt chạy gcc và clang cho cùng tập thời lượng bot (48,16–63,33 s).
- **Throw qua API:**
  - Không có `throw`, `.at()` hay `stoi` trong `Private/`.
  - Loader bắt mọi exception.
  - Bản build `-fno-exceptions -DJSON_NOEXCEPTION` biên dịch được và qua 24.072 lượt fuzz, không abort. Rủi ro còn lại chỉ là `std::bad_alloc`, như mọi code STL.
- **JSON thiếu trường hoặc sai kiểu:** mỗi lần đọc đều kiểm kiểu, lỗi có đường dẫn kèm tên file. Fuzz không tìm ra crash.
- **Ràng buộc nội dung:**
  - Mảnh khoen không thể thành phần thưởng, đầu vào chế tác hay đồ rơi.
  - Bảo khí bắt buộc có phần thú tự rụng.
  - Bonus độ hiếm không lên Thần khí.

## 6. Giới hạn của lượt QA này

- Không chạy được ASan với clang vì container thiếu compiler-rt. Phần clang chỉ chạy được UBSan ở chế độ trap.
- Không build trong Unreal Engine. README và `Build.cs` ghi trung thực là "CHƯA BUILD TRONG UE". QA không tìm thấy tuyên bố nào nói đã chạy trong UE.
- Chưa kiểm tính bit-exact giữa MSVC và GCC/Clang (README §8 đã nêu).
- Mã thăm dò (`probe.cpp`, `probe2.cpp`, `fuzz.cpp`) nằm ở `/tmp/claude-0/-home-user/c58ad2cd-0dde-5c55-b1e4-0cacdf2a6473/scratchpad/qa_probe/`, ngoài repo, chưa được commit. Người sửa lỗi nên chuyển các kịch bản P1, P2, P3, P5 thành doctest.
