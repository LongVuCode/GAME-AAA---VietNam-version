# ArpgCore: lõi luật chơi C++20 (không phụ thuộc Unreal)

`ArpgCore` là thư viện C++20 thuần, chứa toàn bộ luật combat và tiến trình của Demo 0.1 (D-008, D-019, D-020). Sau này nó sẽ là một module của project UE **ProjectFerry** (tên mã nội bộ, trung tính vì tên game chưa đăng ký nhãn hiệu).

- **Đã build và test:** bản standalone (CMake + doctest), trên g++ 13.3 và clang++ 18.1 (Linux container).
- **Chưa build trong UE:** `ArpgCore.Build.cs` và `Private/UE/ArpgCoreModule.cpp`. Môi trường AI không có Unreal Editor (xem §5).

## 1. Nguyên tắc
| Nguyên tắc | Cách làm |
|---|---|
| Deterministic | Thời gian tính bằng giây (`float`). Mọi hệ thống tiến bằng `Tick(dt)`; `dt` âm hoặc NaN bị bỏ qua. RNG là SplitMix64 có seed (`FRng`), không dùng `rand()` hay đồng hồ hệ thống |
| Không I/O trong logic | Logic không đọc file, không log. Loader nhận **chuỗi** JSON; việc đọc file do engine hoặc test làm |
| Không throw qua API công khai | Lỗi trả về bằng giá trị: `TResult<T>` / `FStatus` chứa danh sách `FError{Path, Message}`. Chỉ `ConfigLoader.cpp` có `try/catch`, để bọc nlohmann/json |
| Data-driven | Mọi tham số nằm trong struct cấu hình (`Config.h`) và được nạp từ JSON. Giá trị mặc định trong code chỉ là placeholder |
| Không chuỗi hiển thị | Gợi ý bí mật trả về **khóa localization** (`hint.*`), không trả về câu chữ |

## 2. Kiến trúc
```
game/Source/ArpgCore/
  Public/ArpgCore/*.h     API công khai (namespace ArpgCore)
  Private/*.cpp           Cài đặt; MathUtil.h là helper nội bộ
  Private/UE/             Boilerplate module UE (CMake bỏ qua thư mục này)
  Tests/*.cpp             doctest; chỉ biên dịch khi có ARPGCORE_STANDALONE_TESTS
  Tests/fixtures/*.json   Fixture riêng của ArpgCore (không phải dữ liệu thiết kế)
  CMakeLists.txt          Build standalone + test + coverage
  ArpgCore.Build.cs       Module rules cho UBT (chưa build trong UE)
```

| # | Hệ thống | Header | Ý chính |
|---|---|---|---|
| 1 | Nhịp đòn | `ActionTimeline.h`, `InputBuffer.h`, `ComboGraph.h` | Startup/Active/Recovery với sự kiện cạnh (vẫn báo đúng khi `dt` lớn). Cửa sổ cancel mặc định = toàn bộ Recovery. Input buffer có hạn tuổi. Combo graph rẽ nhánh theo nhẹ/nặng **và** độ trễ giữa hai lần bấm. `FComboRunner` ghép ba thứ trên |
| 2 | Phòng thủ | `Defense.h` | Né có i-frame và perfect dodge. Parry có cửa sổ thường và cửa sổ perfect, nhân hệ số độ khó, bị kẹp theo thời lượng động tác. Đòn `bUnparryable`/`bUndodgeable` |
| 3 | Thế (posture) | `Posture.h` | Tích lũy tới `MaxPosture` thì vỡ Thế, stagger N giây. Thế hồi sau một khoảng delay. Trong lúc stagger, sát thương máu được nhân hệ số. Có thể tạm dừng đồng hồ stagger (dùng khi cạy) |
| 4 | Sát thương | `Damage.h` | Máu và Thế × hệ số vũ khí × hệ số độ khó × hệ số stagger × (1 − giảm sát thương). Riêng `ComputeParryExchange` tính Thế dội lại khi parry |
| 5 | Hit-stop | `HitStop.h` | Đường cong tuyến tính từng đoạn theo trọng lượng đòn, kẹp min/max, có thưởng cho perfect parry. `FHitStopClock` đổi `dt` thật thành `dt` game |
| 6 | Nhịp trống | `DrumMeter.h` | N nấc. Perfect parry, perfect dodge và đòn trúng cộng điểm. `TrySurge` (Hồi trống) chỉ chạy khi đầy và tiêu hết. Rời giao tranh quá `DecayDelay` thì điểm giảm dần; tùy chọn không giảm xuống dưới nấc đã đầy |
| 7 | Khoen (cạy) | `Shackle.h`, `BossEncounter.h` | Xem §3 |
| 8 | Dòng họ | `Lineage.h` | `Handover(prev, request, config) -> next`: cây kỹ năng giữ 100% (tham số `SkillRankRetention`); moveset đời trước thành Đòn nhà (khử trùng lặp, giới hạn số lượng, bỏ cái cũ nhất trước); Bảo khí đang mang vào Thạp, xếp theo đời |
| 9 | Chế tác | `Crafting.h`, `Rng.h` | Công thức vật liệu → Bảo khí; 6 bậc hiếm (Thường → Thần khí); nâng cấp +N với chi phí số nguyên `ceil((Base + PerLevel·L) · Rarity% / 100)`; thao tác trừ kho là nguyên tử. Bonus độ hiếm dùng RNG có seed và không bao giờ lên Thần khí |
| 10 | Đồ thị bí mật | `SecretGraph.h` | Node yêu cầu manh mối, cấp manh mối (**không tiêu hao**), có thể bị node khác loại trừ (lựa chọn rẽ nhánh). `CheckNoSoftlock()` duyệt **toàn bộ** trạng thái đạt được và xác nhận từ mọi trạng thái vẫn tới được kết thúc; nếu không, trả về phản ví dụ ngắn nhất. `GetHint(progress, tier 1..3)` chọn node kế tiếp không dẫn vào ngõ cụt |
| 11 | Dữ liệu | `Config.h`, `ConfigLoader.h` | `FArpgConfig` gom cấu hình mọi hệ thống. `ValidateConfig` kiểm tra ngữ nghĩa: khoảng giá trị, thứ tự, tham chiếu chéo, combo mơ hồ, softlock bí mật, phần thưởng là mảnh khoen. `LoadConfigFromJson` báo lỗi kèm đường dẫn JSON (vd. `combat.moves[0].startup: expected number`); key lạ chỉ thành cảnh báo |

## 3. Cơ chế khoen (theo `research/narrative/villain_debate/VERDICT.md`)
```
Intact --vỡ Thế--> Cracking --vỡ Thế (đủ CracksToOpen)--> Ready
Ready + boss đang stagger --BeginPry--> Prying (đồng hồ stagger tạm dừng)
Prying: 3 nhịp tại LeadIn + k·BeatInterval, mỗi nhịp có cửa sổ ±BeatHalfWindow
  - bấm đúng cả 3 nhịp      -> Freed (kết thúc trận)
  - bấm sớm, bấm thừa, hoặc để lỡ nhịp -> Miss: quay về Ready (giữ nguyên số vết nứt),
    stagger kết thúc, boss hồi lại MissPostureRecoverFraction của thanh Thế
    => người chơi chỉ cần phá phần Thế đó lần nữa là mở lại cạy (không thua ngay)
Disabled (bEnabled=false, điều kiện V9) -> trận kết thúc bằng máu (Defeated), tức là đường lùi K0
```
- Khi khoen còn bật, boss **không chết vì sát thương**: máu bị chặn ở `HealthFloorWhileShackled`, nên trận chỉ kết thúc bằng Freed.
- Trong lúc cạy, đòn đánh thường bị bỏ qua.
- **Mảnh khoen không cho người chơi sức mạnh:**
  - Vật liệu loại `shackle_fragment` không được làm đầu vào chế tác hay chi phí nâng cấp (validator và `Craft` đều từ chối).
  - Vật liệu đó không được nằm trong `freed_drops` (validator từ chối).
  - Không có hàm nào đếm mảnh.
- Có test mô phỏng 50 lượt bot chơi không hoàn hảo (25 seed cố định × khoen bật/tắt). Mọi lượt đều kết thúc trận. Đây là bằng chứng chống softlock của V9 ở mức logic; chưa phải bằng chứng ở mức animation.
- **Diễn giải cần designer xác nhận:**
  - "Trượt thì boss hồi một phần Thế" được cài thành: hủy lượt cạy và đặt Thế tích lũy = `Max·(1 − f)`.
  - Phương án khác: giữ tiến độ nhịp, hoặc cho trượt nhiều lần mới hủy. Muốn đổi thì chỉ cần sửa `FShackle::InputBeat/Tick`.

## 4. Build và test (Linux, đã chạy)
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
- CTest tạo một mục cho mỗi `TEST_SUITE` (tự dò từ `Tests/*.cpp`), cộng một mục `ArpgCore.All` chạy toàn bộ.

**Kết quả đo ngày 2026-11-03 (container Linux, không có commit hash vì chưa commit):**

| Hạng mục | g++ 13.3.0 | clang++ 18.1.3 |
|---|---|---|
| Build Debug, `-Werror` | 0 cảnh báo | 0 cảnh báo |
| Test | 79 test case, 4992 assertion, 18/18 mục CTest đạt | như g++ |
| Thêm: build Release | 0 cảnh báo, test đạt | 0 cảnh báo, test đạt |
| Thêm: `-Wshadow-all -Wconversion` | — | 0 cảnh báo |
| Độ phủ dòng `Private/` | **99,2%** (1454/1465 dòng, gcov) | không đo được: container thiếu `libclang_rt.profile` |

## 5. Unreal Engine: CHƯA BUILD TRONG UE
- `ArpgCore.Build.cs`:
  - Đặt `CppStandard = Cpp20`, `bEnableExceptions = true` (cần vì `ConfigLoader.cpp` dùng nlohmann/json và bọc trong `try/catch`), phụ thuộc `Core`.
  - Thêm `<repo>/third_party` vào include riêng.
  - Include của nlohmann được bọc trong `THIRD_PARTY_INCLUDES_START/END` nếu macro này tồn tại.
- UBT biên dịch mọi `.cpp` trong thư mục module. Các file `Tests/*.cpp` được bọc bởi `#if defined(ARPGCORE_STANDALONE_TESTS)`, nên trong UE chúng thành file rỗng.
- Phương án thay thế nếu PO không muốn bật exceptions: tách `ConfigLoader.cpp` thành module hoặc thư viện riêng có exceptions, hoặc định nghĩa `JSON_NOEXCEPTION`. Khi đó loader dùng nhánh `allow_exceptions=false` đã có sẵn, nhưng nhánh này **chưa được test**.
- **Hướng dẫn cho PO (Windows, máy RTX 5050):**
  1. Tạo project C++ trống `ProjectFerry` (UE 5.x đã pin, xem TECH_SPEC §2), đặt cùng cấp với `game/Source`, sao cho đường dẫn là `game/ProjectFerry.uproject`.
  2. Thêm `"ArpgCore"` vào `PublicDependencyModuleNames` của module game. Thêm `{ "Name": "ArpgCore", "Type": "Runtime", "LoadingPhase": "Default" }` vào `Modules` trong `.uproject`.
  3. Chuột phải `.uproject` → *Generate Visual Studio project files* → build cấu hình `Development Editor | Win64`.
  4. Gửi lại **toàn bộ log build** (Output window, hoặc `%LOCALAPPDATA%\UnrealBuildTool\Log.txt`). Lỗi dễ gặp: cảnh báo MSVC C4251/C4244/C4668 trong code hoặc trong nlohmann. Gửi log để sửa, không tự tắt cảnh báo.

## 6. Giới hạn đã biết
- **Schema dữ liệu:** định dạng JSON trong `Tests/fixtures/` là định dạng riêng của ArpgCore. **Loader sẽ được khớp với schema của designer (`design/data/*.json`, `design/schema/README.md`) ở bước sau.** Mọi con số trong fixture là placeholder, không phải dữ liệu thiết kế.
- **Số thực:**
  - Kết quả lặp lại được trên cùng nền tảng và cùng trình biên dịch.
  - Chưa kiểm tra bit-exact giữa MSVC và GCC/Clang; chỉ quan trọng nếu sau này cần replay hoặc lockstep.
  - Chi phí nâng cấp và RNG dùng số nguyên, nên không bị ảnh hưởng.
- **Đồ thị bí mật:**
  - Tối đa 64 node mỗi chuỗi.
  - Kiểm tra softlock có độ phức tạp hàm mũ theo số node độc lập. Có trần `MaxStates`; vượt trần thì báo "inconclusive", không báo đạt.
  - "Điều kiện" hiện chỉ là manh mối và loại trừ; chưa có cờ thế giới (vd. `ch1_done`). Nếu cần, cờ thế giới sẽ được mô hình hóa thành manh mối.
- **`FComboRunner`:**
  - Chỉ nhận nhẹ/nặng. Né và parry đi qua `TryCancelForDefense` cùng với `FDefenseController`.
  - Chưa có đòn gồng (charge) hay đòn trên không.
  - Combo graph tham chiếu tới graph bên ngoài, nên graph phải sống lâu hơn runner.
- **Chưa có:** lock-on, AI, loot roll, event director. Các phần này là việc của module game hoặc của bước sau.
- **Coverage clang:** không đo được trong container này, vì thiếu runtime profile.
