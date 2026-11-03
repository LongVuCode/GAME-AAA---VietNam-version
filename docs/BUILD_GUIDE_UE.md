# Hướng dẫn build ProjectFerry (Unreal Engine 5) — Demo 0.1 Track U

> **Trạng thái: CHƯA BUILD TRONG UE.** Toàn bộ code trong `game/` (trừ phần standalone CMake của `ArpgCore`) được AI viết trong container Linux, **không có Unreal Engine, Windows hay GPU**. Chưa ai biên dịch hay chạy nó. Lần build đầu trên máy PO gần như chắc chắn sẽ có lỗi biên dịch; mục tiêu của lần đầu là **lấy log** gửi lại để sửa (xem §9). Chỉ được ghi "đã build" khi có log từ máy PO (`docs/DEMO_PLAN.md`).
>
> Tên `ProjectFerry` là tên mã nội bộ, không phải tên sản phẩm.

## 0. Tóm tắt các bước
| # | Việc | Thời gian ước tính (chưa đo) |
|---|---|---|
| 1 | Cài Visual Studio 2022 + các component C++ | 30–60 phút |
| 2 | Cài UE 5.7 (hoặc 5.6) qua Epic Games Launcher | 1–2 giờ (tải ~ vài chục GB) |
| 3 | Clone repo + Git LFS | 5–15 phút |
| 4 | Generate Visual Studio project files | 1 phút |
| 5 | Build `Development Editor | Win64` | 10–40 phút lần đầu |
| 6 | Mở editor, chạy script Python tạo map graybox | 2–5 phút |
| 7 | Bấm Play, thử điều khiển | — |
| 8 | (Tùy chọn) Đóng gói bản Windows | 20–60 phút |
| 9 | Gửi log về cho AI | 5 phút |

## 1. Visual Studio 2022
1. Tải **Visual Studio 2022 Community** (miễn phí) từ trang Microsoft.
2. Trong Visual Studio Installer, tab **Workloads**, tick:
   - **Game development with C++**
   - **Desktop development with C++**
3. Tab **Individual components**, kiểm tra đã tick:
   - **MSVC v143 – VS 2022 C++ x64/x86 build tools (Latest)**
   - **Windows 11 SDK** (bản mới nhất có trong danh sách; Windows 10 SDK 10.0.19041 trở lên cũng được)
   - **C++ profiling tools**, **C++ AddressSanitizer** (không bắt buộc)
   - **.NET 8.0 Runtime** hoặc **.NET SDK** (UnrealBuildTool chạy trên .NET; thường đã đi kèm engine, tick để chắc)
   - **Unreal Engine installer** và **IDE support for Unreal Engine** (trong workload Game development; giúp xem log UBT và gợi ý code)
4. Phiên bản MSVC chính xác mà UE 5.7/5.6 yêu cầu được ghi trong *Release Notes* của bản engine ("Platform SDK Upgrades"). **VERIFY:** mở release notes của đúng bản đã cài để đối chiếu; nếu UBT báo "compiler version not supported", cài thêm đúng bản MSVC được nêu trong thông báo lỗi.

## 2. Unreal Engine
1. Cài **Epic Games Launcher**, đăng nhập, vào **Unreal Engine → Library → Engine Versions → +**, chọn **5.7.x** (bản vá mới nhất).
2. Bấm **Options** của bản engine, tick **Editor symbols for debugging** (giúp đọc crash log; tốn thêm dung lượng). Không cần tải thêm nền tảng Android/iOS/Linux.
3. **Nếu không dùng 5.7:** theo D-001 và `docs/TECH_SPEC.md` §2, phiên bản chỉ được pin sau khi kiểm tra plugin upscaler (DLSS/FSR/XeSS). Nếu plugin nào chưa hỗ trợ 5.7 hoặc 5.7 crash, cài **5.6.x** rồi sửa một dòng trong `game/ProjectFerry.uproject`:
   ```json
   "EngineAssociation": "5.6",
   ```
   Graybox Demo 0.1 **chưa dùng plugin upscaler nào**, nên có thể build trên 5.7 trước để lấy log rồi mới quyết định.
4. Dung lượng: engine + DerivedDataCache cần hàng trăm GB trống trên SSD (TECH_SPEC §5b).

## 3. Clone repo và Git LFS
```powershell
git lfs install
git clone <URL repo> project-dongco
cd project-dongco
git checkout feat/demo-0.1        # hoặc nhánh mà người điều phối chỉ định
git lfs pull
```
- Không đặt repo trong đường dẫn quá dài hoặc có ký tự tiếng Việt có dấu. Nên dùng dạng `D:\dev\project-dongco` (UBT và MSVC hay lỗi với đường dẫn dài trên 260 ký tự).
- Cấu trúc liên quan:
  ```
  project-dongco/
    design/data/*.json           dữ liệu thiết kế (nguồn duy nhất, D-020)
    third_party/nlohmann/        thư viện JSON (MIT) dùng bởi ArpgCore
    game/ProjectFerry.uproject
    game/Config/*.ini
    game/Content/Python/build_graybox_longbien.py
    game/Source/ArpgCore/        lõi luật chơi C++20 (đã test ngoài engine)
    game/Source/ProjectFerry/    module game (CHƯA BUILD)
    game/Source/ProjectFerryEditor/  module editor tối thiểu (CHƯA BUILD)
  ```

## 4. Generate Visual Studio project files
1. Mở thư mục `game\` trong File Explorer.
2. Chuột phải **`ProjectFerry.uproject`** → **Show more options** (Windows 11) → **Generate Visual Studio project files**.
   - Nếu không thấy mục này: chạy trong PowerShell (sửa đường dẫn theo bản engine):
     ```powershell
     & "C:\Program Files\Epic Games\UE_5.7\Engine\Build\BatchFiles\Build.bat" -projectfiles -project="D:\dev\project-dongco\game\ProjectFerry.uproject" -game -engine
     ```
3. Kết quả: file `game\ProjectFerry.sln`. File này bị `.gitignore` bỏ qua (mỗi máy tự sinh).

## 5. Build Development Editor
1. Mở `ProjectFerry.sln` bằng Visual Studio 2022.
2. Thanh công cụ: cấu hình **Development Editor**, nền tảng **Win64**, Startup Project **ProjectFerry**.
3. **Build → Build Solution** (Ctrl+Shift+B). Lần đầu sẽ build cả engine module cần thiết cho project, khá lâu.
4. Cách build không cần mở Visual Studio (dùng khi muốn lấy log gọn):
   ```powershell
   & "C:\Program Files\Epic Games\UE_5.7\Engine\Build\BatchFiles\Build.bat" ProjectFerryEditor Win64 Development -Project="D:\dev\project-dongco\game\ProjectFerry.uproject" -WaitMutex 2>&1 | Tee-Object -FilePath build_log.txt
   ```
   File `build_log.txt` là thứ cần gửi lại nếu lỗi.
5. Nếu build lỗi: **đừng tự tắt cảnh báo hay sửa code ArpgCore**; gửi log (xem §9).

## 6. Mở editor và tạo map graybox
1. Nhấp đúp `ProjectFerry.uproject` (hoặc trong Visual Studio bấm **F5 / Debug → Start Debugging** với cấu hình Development Editor).
   - Lần đầu editor biên dịch shader rất lâu (có thể 10–30 phút trên máy mới).
   - Lần đầu sẽ có một dòng lỗi "map /Game/Maps/L_LongBien_Graybox not found" và editor mở level trống: **bình thường**, vì map chưa được tạo.
2. Kiểm tra plugin: **Edit → Plugins**, tìm và chắc chắn đã bật **Python Editor Script Plugin** và **Editor Scripting Utilities** (project đã khai báo sẵn; nếu editor hỏi restart thì đồng ý).
3. Kiểm tra dữ liệu thiết kế: mở **Window → Output Log**, tìm dòng `[ProjectFerryEditor] design data OK from ...`. Nếu thấy `design data FAILED`, chép các dòng `LogFerry: Error` gửi lại.
4. Chạy script graybox, chọn **một** trong ba cách:
   - **Tools → Execute Python Script...** → chọn `game\Content\Python\build_graybox_longbien.py`.
   - Output Log, đổi ô nhập bên trái từ **Cmd** sang **Python**, gõ: `exec(open(r"D:\dev\project-dongco\game\Content\Python\build_graybox_longbien.py", encoding="utf-8").read())`
   - Output Log ở chế độ **Cmd**, gõ: `py "D:\dev\project-dongco\game\Content\Python\build_graybox_longbien.py"`
5. Kết quả mong đợi trong Output Log: `[graybox] done: N actors in /Game/Maps/L_LongBien_Graybox (0 data warnings)`. Map được lưu ở `Content/Maps/L_LongBien_Graybox.umap`, vật liệu màu ở `Content/Graybox/Materials/`.
   - Dòng `LogPython: Warning: [graybox] ... skipped` nghĩa là một chi tiết (màu, sương, đèn) không đặt được do khác biệt API; map vẫn dùng được. Gửi lại các dòng này để sửa script.
   - Chạy lại script nhiều lần là an toàn: các actor trong thư mục Outliner `Graybox/...` bị xóa rồi dựng lại.
6. File `.umap`/`.uasset` sinh ra là file nhị phân, đi qua Git LFS. **Chưa commit** chúng cho tới khi người điều phối yêu cầu.

### Bố cục map (theo `design/DEMO_0_1_DESIGN.md` §2, kích thước là giả định)
| Vùng | Vị trí (m, X = bắc) | Nội dung |
|---|---|---|
| Z0 Bến Sậy | (0, 0), 25 × 30 | PlayerStart, bếp lửa `cp_ben_say`, bến gỗ + đò (`ferry_to_hub`, chỉ là marker), bà lái đò (marker), 1 Cua Càng Bùn |
| Z1 Đầm nông | (45, 0), 40 × 60 | 2 Cua, 1 Ụ Bùn, 3 vũng nước nông, 1 vũng bùn, cọc bẫy `sn_trap_a` |
| Z2 Bãi lau | (100, 0), 50 × 50 | ~220 cây lau (đi xuyên qua được), 2 Bọ Ngựa Lau, người bị mê (marker), `sn_scrap`, cổng lối tắt |
| Lối tắt | dải phía đông | Z2 → Z0, tách khỏi Z1 bằng một dải nước |
| Đường tới boss | (136, 0) | 3 dấu vết, bếp lửa `cp_cong_lau`, rẽ trái vào Z3 |
| Z3 Lò bỏ hoang | (135, −30), 20 × 20 | tường lò, `sn_kiln`, `sn_end`, 1 Ụ Bùn |
| Z4 Bãi lầy (boss) | (165, 0), tròn r = 18 | 3 vũng lầy, vòng lau, Lợn Lòi Đầm, cọc bẫy `sn_trap_b` ở cổng |

Hub bến Lau là level riêng, **chưa có** trong bản này.

## 7. Play và điều khiển
Bấm **Play** (Alt+P). Nên chọn **Play → Selected Viewport** hoặc **New Editor Window (PIE)**.

| Hành động | Bàn phím + chuột | Tay cầm (XInput) |
|---|---|---|
| Di chuyển | W A S D | Cần trái |
| Xoay camera | Chuột | Cần phải |
| Đòn nhẹ | Chuột trái | X (trái) |
| Đòn nặng | Chuột phải | Y (trên) |
| Né | Space | B (phải) |
| Đỡ nhịp (bấm) / Đỡ (giữ) | Q | LB |
| Khóa mục tiêu (bật/tắt) | Chuột giữa hoặc Tab | Bấm cần phải (R3) |
| Hồi trống (khi đủ 4 nấc) | R | RB |
| Cạy khoen (bấm theo nhịp) | E | RT |
| Tương tác | F | A (dưới) |

- **Q:** bấm đúng lúc đòn tới là Đỡ nhịp (parry); giữ nút là Đỡ (giảm sát thương, tốn Thế). Đỡ nhịp hoàn hảo mở cửa sổ phản đòn (bấm nhẹ) và Đòn nhà *Chống sào* (bấm nặng, chỉ mở sau khi giải thoát boss, cờ `flag_boss_lon_loi_freed`).
- **Cạy:** khi boss đủ vết nứt và đang choáng, đứng gần (≤ 3 m, giá trị tạm) và bấm E để bắt đầu, rồi bấm E đúng các vạch nhịp trên thanh giữa màn hình. Mức `diff_nghe_chuyen` cạy tự động. Khi tắt khoen (`ferry.Khoen.Enabled 0`), E ở choáng cuối là cú đẩy (K0).
- Bấm **Esc** (hoặc Shift+F1) để nhả chuột khỏi cửa sổ game.
- Lệnh console (phím `~`):
  | Lệnh | Tác dụng |
  |---|---|
  | `ferry.Lang vi` / `ferry.Lang en` | Đổi ngôn ngữ HUD (mặc định `vi`) |
  | `ferry.Difficulty diff_nghe_chuyen` | Đổi độ khó theo id trong `combat_tuning.json` (áp dụng khi spawn lại) |
  | `ferry.Khoen.Enabled 0` | Tắt khoen (đường lùi K0, cờ `feature_khoen`, V9); áp dụng cho boss spawn sau đó |
  | `ferry.Debug 1` | Vẽ hình cầu báo hiệu đòn của địch và vùng đánh của người chơi |
  | `FerryEquip wp_riu_xeo` | Đổi vũ khí (thử rìu xéo của Bương) |
  | `FerryReloadData` | Đọc lại `design/data/*.json` khi đang chơi (áp dụng cho địch spawn sau đó) |
- HUD (Canvas, chưa phải UI đích): thanh Sức, thanh Thế, 4 nấc Nhịp trống, thanh máu/Thế của địch đang khóa hoặc của boss, vạch nhịp khi cạy, chữ "Cạy" khi mở được cạy. Chuỗi hiển thị lấy từ `design/data/strings.json`.
- Phông chữ mặc định của engine (Roboto). **VERIFY:** kiểm tra chữ tiếng Việt có dấu hiện đúng trên HUD (ví dụ "Thế", "Nhịp trống"); nếu thấy ô vuông, chụp màn hình gửi lại.

## 8. (Tùy chọn) Đóng gói bản Windows
1. Copy dữ liệu thiết kế vào Content (bản copy đã bị `.gitignore` bỏ qua, nguồn vẫn là `design/data`):
   ```powershell
   robocopy D:\dev\project-dongco\design\data D:\dev\project-dongco\game\Content\Data\Design *.json
   ```
2. `DefaultGame.ini` đã khai báo `Data/Design` trong **Project Settings → Packaging → Additional Non-Asset Directories to Package**. Kiểm tra lại mục này trong editor.
3. **Platforms → Windows → Package Project**, chọn thư mục ra. Cấu hình **Development** để còn console và log.
4. Chạy bản đóng gói; nếu không có địch xuất hiện, xem log ở `<thư mục ra>\Windows\ProjectFerry\Saved\Logs\ProjectFerry.log`, tìm `LogFerry`.

**Thứ tự tìm dữ liệu lúc chạy** (`FFerryDesignDataLoader::ResolveDataDirectory`):
1. Tham số dòng lệnh `-FerryDataDir="D:\...\design\data"` nếu có.
2. `<repo>/design/data` (tức `ProjectDir/../design/data`), dùng khi chạy từ repo (editor, PIE).
3. `Content/Data/Design` (bản copy khi đóng gói).

## 9. Lấy log và gửi lại (quan trọng nhất)
Gửi **toàn bộ** các file sau (nén zip được), không cắt bớt:

| Tình huống | Log cần gửi | Đường dẫn |
|---|---|---|
| Build lỗi trong Visual Studio | Cửa sổ **Output** (chọn "Show output from: Build"), chuột phải → Select All → Copy, dán vào file .txt | — |
| Build lỗi (dòng lệnh) | `build_log.txt` ở §5 | thư mục chạy lệnh |
| Log chi tiết của UnrealBuildTool | `Log.txt` | `%LOCALAPPDATA%\UnrealBuildTool\Log.txt` |
| Editor không mở / crash | log editor mới nhất + thư mục crash | `game\Saved\Logs\ProjectFerry.log`, `game\Saved\Crashes\` |
| Script Python lỗi | Output Log: chuột phải → **Copy All** (hoặc file log editor ở trên) | `game\Saved\Logs\ProjectFerry.log` |
| Chạy game lỗi/hành vi lạ | log editor (PIE ghi chung) + mô tả bước tái hiện + ảnh chụp | `game\Saved\Logs\` |

Kèm thêm: bản engine (Help → About Unreal Editor), bản Visual Studio và MSVC (Help → About), Windows version, commit hash (`git rev-parse HEAD`).

## 10. Checklist gỡ lỗi thường gặp
| Triệu chứng | Kiểm tra |
|---|---|
| Chuột phải `.uproject` không có "Generate Visual Studio project files" | Chạy `Engine\Binaries\Win64\UnrealVersionSelector.exe` một lần (hoặc mở `.uproject` bằng Launcher), rồi thử lại; hoặc dùng lệnh `Build.bat -projectfiles` ở §4 |
| "The following modules are missing or built with a different engine version" khi mở `.uproject` | Bấm **Yes** để editor tự build; nếu báo lỗi, build bằng Visual Studio (§5) để xem lỗi chi tiết |
| `Unable to find SDK` / `MSVC not found` | Thiếu component ở §1; mở Visual Studio Installer → Modify |
| Lỗi C++ trong `game/Source/ProjectFerry/...` | Lỗi của code AI chưa build: gửi log, không tự sửa |
| Lỗi trong `nlohmann/json.hpp` hoặc cảnh báo C4668/C4244/C4251 trong ArpgCore | Gửi log; xem `game/Source/ArpgCore/README.md` §5 |
| `Cannot open include file 'nlohmann/json.hpp'` | Thiếu thư mục `third_party/` ở gốc repo (clone thiếu?) |
| Editor mở ra level trống | Bình thường lần đầu; chạy script §6 |
| Script Python: `ModuleNotFoundError: unreal` | Script đang chạy bằng Python ngoài editor; phải chạy trong editor (§6) |
| Script Python: `AttributeError: ... has no attribute ...` | Khác biệt API giữa các bản UE (các dòng `VERIFY:` trong script); gửi log |
| Play nhưng không có nhân vật / camera đứng yên | Kiểm tra **World Settings → GameMode Override** = `FerryGameMode` (hoặc để trống để dùng mặc định trong `DefaultEngine.ini`) |
| Không điều khiển được | Kiểm tra Output Log có dòng `LogFerry: input mapping context added`; Project Settings → Input → Default Classes phải là `EnhancedPlayerInput` / `EnhancedInputComponent` |
| Không có địch | Output Log tìm `LogFerry`: "design data" lỗi, hoặc "no spawn markers" (chưa chạy script §6) |
| Camera dọc bị đảo | Bật/tắt thuộc tính `bInvertLookY` trên `FerryCharacter` hoặc gõ `ferry.InvertLookY 1` |
| Chữ tiếng Việt thành ô vuông | Font thiếu glyph; chụp màn hình gửi lại |

## 11. Đo FPS cơ bản (chỉ để quan sát, KHÔNG phải số liệu chính thức)
Trong PIE hoặc bản đóng gói, mở console (`~`):
- `stat fps`: FPS và thời gian khung hình.
- `stat unit`: thời gian Frame / Game / Draw / GPU (ms), cho biết nghẽn ở CPU game thread, render thread hay GPU.
- `stat unitgraph`: đồ thị theo thời gian.
- `t.MaxFPS 0`: bỏ giới hạn FPS khi đo (VSync có thể vẫn khóa; tắt VSync bằng `r.VSync 0`).
- Muốn ghi CSV: chạy bản đóng gói với `-csvprofile`, file nằm ở `Saved\Profiling\CSV\`.

**Không tuyên bố chỉ tiêu FPS từ các con số này.** Theo CLAUDE.md §2 và TECH_SPEC §5, số liệu hiệu năng chỉ được ghi khi đo bằng harness benchmark, kèm cấu hình máy, bản build và commit hash. Map graybox hiện tại không đại diện cho đồ họa đích. PIE trong editor chậm hơn bản đóng gói.

## 12. Thiết kế kỹ thuật của khung (để review)
| Quyết định | Lựa chọn | Lý do |
|---|---|---|
| Luật chơi | Gọi `ArpgCore` (combo, né/đỡ, Thế, sát thương, Nhịp trống, hit-stop, khoen/boss) | D-008: một nguồn luật, đã test ngoài engine |
| Đọc dữ liệu | `FFerryDesignDataLoader` đọc 7 file JSON bằng `FFileHelper`, đưa **chuỗi** JSON vào `ArpgCore::LoadDesignData` (luật + `ValidateConfig`); các trường trình bày mà ArpgCore bỏ qua (tầm đánh, góc, khoảng cách lock-on, tốc độ chạy, màu báo hiệu, tên hiển thị, `strings.json`) đọc bằng module `Json` của UE. Module editor nạp thử dữ liệu lúc khởi động và báo lỗi trong Output Log | ArpgCore không làm I/O (README ArpgCore §1) |
| Vị trí dữ liệu | Đọc thẳng `<repo>/design/data` khi chạy từ repo; bản đóng gói dùng bản copy `Content/Data/Design` | Một nguồn sự thật, không phải đồng bộ tay khi làm việc hằng ngày |
| Input | Enhanced Input; `UInputAction`/`UInputMappingContext` tạo bằng `NewObject` trong C++ lúc chạy | Không cần file `.uasset` cho input; đổi phím sau này chuyển sang asset + UI remap |
| Hit-stop | `CustomTimeDilation` **từng actor** (người đánh và mục tiêu), không dùng global time dilation | Dữ liệu ghi `applies_to_attacker`/`applies_to_target`; global sẽ làm đứng cả quái khác và camera |
| AI | FSM C++ đơn giản trong `AFerryEnemy`, bộ chiêu lấy từ `enemies.json`; không navmesh, không StateTree | Đủ cho graybox; StateTree ở bước sau (TECH_SPEC §3) |
| HUD | `AHUD::DrawHUD` (Canvas) | Không cần asset UMG |
| Khoen | `UFerryKhoenComponent` bọc `ArpgCore::FBossEncounter`; không có UI đếm mảnh (V9) | Theo README ArpgCore §3 |

## 13. Giới hạn đã biết của bản khung này
- Chưa build, chưa chạy (xem đầu file).
- Chưa có animation, âm thanh, VFX; báo hiệu đòn là hình cầu debug (`ferry.Debug 1`) và đổi màu thân.
- Chưa có: hub bến Lau, chế tác, Thạp, bàn giao đời, chuỗi bí mật (chỉ có marker), Codex, người bị mê (chỉ marker), nắm cơm lá, đòn gồng, chế độ giữ nút khi cạy, menu, lưu game.
- Lock-on dùng tia nhìn (line trace) đơn giản; chưa có đổi mục tiêu bằng cần.
- Di chuyển của địch không dùng navmesh (đi thẳng tới người chơi).
- Chưa có cây kỹ năng: các đòn cần kỹ năng (`sk_vo_noi_don`, gồng mức 2) bị khóa như lúc bắt đầu demo; đòn gồng chưa có (ArpgCore cũng chưa mô hình hóa).
- Đổi vũ khí, đổi độ khó, bật/tắt khoen hiện chỉ qua console (chưa có menu).

## 14. Điểm `VERIFY:` (API chưa chắc chắn, cần xác nhận khi build)
| Nơi | Nội dung |
|---|---|
| `*.Target.cs` | `BuildSettingsVersion.Latest` / `EngineIncludeOrderVersion.Latest` có hợp với bản engine đã cài |
| `ProjectFerry.uproject` | Khóa `TargetAllowList: ["Editor"]` cho PythonScriptPlugin/EditorScriptingUtilities (JSON không cho ghi chú). Nếu editor báo lỗi plugin, xóa hai dòng này |
| `FerryCharacter.cpp` | `UInputAction::ValueType` là thành viên public; `UInputMappingContext::MapKey` trả về `FEnhancedActionKeyMapping&`; dấu trục dọc camera |
| `FerryCharacter.cpp` | Né bằng `LaunchCharacter` + tắt ma sát tạm thời: quãng đường thực tế có đúng `dodge.distance_m` |
| `FerryCharacter.h`, `FerryGameMode.h` | Hàm `UFUNCTION(Exec)` trên pawn và GameMode có nhận lệnh console |
| `FerryCombatUtils.h` | Hit-stop dùng `CustomTimeDilation` tối thiểu 0,01 thay vì 0 |
| `FerryEnemy.cpp`, script Python | `BasicShapeMaterial` có tham số màu tên `Color` (nếu không, địch không đổi màu khi báo hiệu; quả cầu báo hiệu vẫn hiện) |
| `FerryDesignDataLoader.cpp` | Bản đóng gói đọc được `Content/Data/Design` bên trong `.pak` |
| `FerryHUD.cpp` | Font mặc định hiển thị đủ dấu tiếng Việt |
| Script Python | `LevelEditorSubsystem.new_level`, `Actor.set_folder_path`, tên thuộc tính đèn (`atmosphere_sun_light`, `real_time_capture`), `default_game_mode` |

## 15. Giá trị tạm trong code (dữ liệu thiết kế chưa có trường tương ứng)
Không phải luật combat (luật đến từ ArpgCore + `design/data`), nhưng là con số nằm trong code. Đề nghị designer bổ sung vào schema rồi đổi code đọc từ dữ liệu:

| Giá trị | Hiện dùng | Đề xuất trường |
|---|---|---|
| Tầm bắt đầu cạy | 3 m (cảnh báo khi nạp dữ liệu) | `combat_tuning.pry.range_m` |
| Tốc độ di chuyển của địch | = `movement.walk_speed_mps` × hệ số độ khó/pha | `enemies[].move_speed_mps` |
| Bán kính phát hiện người chơi | = `lock_on.max_distance_m` | `enemies[].aggro_radius_m` |
| Góc đánh của địch, góc "phía trước" cho `front_damage_mult` | ±60° | `attacks[].arc_deg`, `front_arc_deg` |
| Đòn lao (tầm ≥ 4 m) di chuyển trong pha Active | ngưỡng 4 m | `attacks[].lunge` |
| Thời gian bỏ chạy / tan vào bùn | 4 s / 1 s (+ `pry.silence_after_s` cho boss) | `defeat_behavior_duration_s` |
| Khoảng nghỉ sau khi bị ngắt đòn | = `player.hitstun_light_s` | `enemies[].interrupt_recover_s` |
| Thời gian hồi sinh, bán kính kích hoạt bếp lửa | 3 s, 3 m | `player.respawn_delay_s`, `checkpoint_radius_m` |
| Chuỗi nhắc cú đẩy K0 | khóa `prompt_finisher_shove` chưa có trong `strings.json` (HUD hiện `#prompt_finisher_shove`) | thêm khóa vào `strings.json` |
| Tốc độ xoay camera bằng tay cầm, độ dài cánh tay camera | 150°/s, 4,5 m | cài đặt người chơi |
