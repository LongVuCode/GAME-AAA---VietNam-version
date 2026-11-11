# AI_CONTEXT.md — Bối cảnh toàn dự án cho model AI tiếp quản

> **Đọc file này trước tiên**, rồi `CLAUDE.md` (luật làm việc bắt buộc), rồi `reports/HANDOFF_0_4.md`.
> Cập nhật lần cuối: 2026-11-08 · Nhánh đang làm: `feat/demo-0.4` · `main` = Demo 0.3 + bản sửa tường vô hình (commit `5a29f94`).
> Ngôn ngữ: trao đổi, tài liệu, lore, chuỗi hiển thị dùng **tiếng Việt có dấu**; code, tên biến, commit dùng **tiếng Anh**.

---

## 1. Dự án là gì
- Game Action RPG góc nhìn thứ ba, chủ đề thần thoại / truyền thuyết / cổ tích / lịch sử Việt Nam. **Bán thương mại trên Steam** và nền tảng khác (D-009).
- **Product Owner (PO):** 1 người, làm một mình, máy Windows có **RTX 5050 8 GB** (D-010). PO giao việc cho "đội AI agent" (D-011, `docs/AGENT_TEAM.md`). PO trao đổi bằng tiếng Việt và thích làm liên tục.
- **Tên tạm:** "Người Giữ Bến" / *The Ferrykeepers* (D-018; chưa tra nhãn hiệu). Tên mã kỹ thuật trung tính: `ProjectFerry`.
- **Cấu trúc truyện đã chốt — phương án H** (D-012, `research/narrative/debate/VERDICT.md`): Game 1 là sản phẩm độc lập, tiếp thị "action RPG thần thoại Việt", 4 chương huyền thoại thời Hồng Bàng – Văn Lang. Thứ tự cốt truyện: Long Biên (Hồ Tinh) → Đông Hải (Ngư Tinh) → Phù Đổng (Gióng) → Ba Vì (Sơn Tinh – Thủy Tinh) → `ch_ben` (trận cuối). Thứ tự sản xuất: Long Biên → Phù Đổng → Ba Vì + cuối → Đông Hải. Lịch sử (Dạ Trạch…) để cho Quyển sau.
- **Nhân vật chính** (D-014): dòng họ **nhà Vảy**, dân thường làm nghề chèo đò, vẽ và giữ mẫu xăm cho cả làng. Mỗi chương một người: Cói (nữ) → Bương (nam) → Nứa (nữ). Tiến trình được kế thừa: cây kỹ năng "Nghề nhà", "Đòn nhà", "Thạp nhà" (thạp gốm), hình xăm. Vật truyền đời: Mũi Sào. Không phải hậu duệ Hùng Vương hay Lạc Long Quân. Nghệ (em trai Cói) là tổ tiên của Bương (mặc định, chờ PO ghi nhận).
- **Phản diện** (D-017, `research/narrative/villain_debate/VERDICT.md`): "Khoen Thuần" — một lái đò đúc vụng bộ khoen đồng để bắt thú nghe lời; khoen vỡ, mảnh làm thú hóa dữ. **Khoen không có phép.** Boss là nạn nhân; kết trận bằng **cạy khoen 3 nhịp theo trống để giải thoát**, không giết. Game 1 không có trận đánh người.
- **Luật văn hóa cốt lõi** (`research/narrative/STORY_BIBLE_V1_2.md` §2, `docs/RESEARCH_PROTOCOL.md`):
  - Thần và nhân vật được thờ: không điều khiển, không đánh bại, không biếm họa, không thoại tự do.
  - Người chơi không cầm thần khí; dùng "Bảo khí" [SÁNG TẠO].
  - Không giao long, rắn, cáo, loài nước ở chương 1. Không gợi phe Thủy Tinh / Sơn Tinh / Mẫu.
  - Nội dung đời Hùng Vương 6 (Bương) không chứa từ khoen/mảnh/chốt/lưỡi bẫy/đồng cũ/mắc ở cổ (validator chặn).
  - Mọi nội dung gắn nhãn [SỬ LIỆU]/[SỬ LIỆU-TRANH LUẬN]/[HUYỀN THOẠI]/[CỔ TÍCH]/[SÁNG TẠO]/[CHƯA XÁC MINH]. AI chỉ xác minh tới **mức B**; mức A cần cố vấn người thật (R-12).

## 2. Bản đồ repo
| Đường dẫn | Nội dung |
|---|---|
| `CLAUDE.md` | Luật làm việc (bắt buộc) |
| `docs/` | PLAN, GDD (cũ, GĐ0), TECH_SPEC, DECISION_LOG (D-001 → D-026), RISK_REGISTER, ASSET_LICENSE_REGISTER, ART_DIRECTION, BUILD_GUIDE_UE, COMMERCIAL_RELEASE, DEMO_PLAN, AGENT_TEAM |
| `.claude/agents/*.md` | 7 vai agent: narrative-researcher, historian-verifier, vn-history-folklore-expert, game-designer, ue-gameplay-engineer, tech-art-perf, qa-lead |
| `research/` | Dữ liệu nghiên cứu `data/*.json` (timeline, myths, sources) + lint; `narrative/` (Story Bible v1.2, các vòng tranh luận, phản biện, STORY_INTEGRATION_0_4); `expert/` (hồ sơ lore); `design/` (nguyên lý Elden Ring) |
| `design/` | Tài liệu thiết kế theo bản demo (0.1 → COMBAT_0_4) + `data/*.json`: **nguồn dữ liệu duy nhất** cho cả ArpgCore và prototype web + `schema/README.md` |
| `tools/` | `research_tool.py` (lint/render), `design_validate.py` (validator dữ liệu), `coverage_summary.py`, `assets/` (tải CC0), `blender/` (script bpy) |
| `tests/` | Test Python (research + design) |
| `game/` | **Track U — Unreal Engine 5**: `Source/ArpgCore` (C++20 thuần, doctest, CMake), `Source/ProjectFerry*` (module UE, **chưa từng build trong UE**), `Content/Python/build_graybox_longbien.py` |
| `prototype/web/` | **Track W — prototype trình duyệt** (three.js 0.169 + esbuild). `src/`: logic, game, anim, fx, ui (hud, inventory, map), story, env. `test/`: unit test `node --test`, `smoke.mjs` (Playwright bot), `serve.mjs`, `envshots.mjs`, `bossbench.mjs`. `assets/` (Git LFS) |
| `reports/` | Báo cáo từng giai đoạn (PHASE_0, 0B, DEMO_0_1/0_2/0_3), `qa/`, `HANDOFF_0_4.md` |
| `third_party/` | doctest 2.4.11, nlohmann/json 3.11.3 (MIT, vendored) |

## 3. Lịch sử tiến độ
| Mốc | Kết quả chính | Trạng thái |
|---|---|---|
| GĐ0 | Bộ tài liệu, research lint, dòng thời gian 31 mốc, 30 truyện | ✅ |
| GĐ0B | Đội agent; 3 cuộc tranh luận (cấu trúc → H; nhân vật → dòng họ; phản diện → Khoen); Story Bible v1.2 | ✅ |
| Demo 0.1 | ArpgCore C++ (QA đạt có điều kiện, đã sửa); khung UE5; prototype web chơi được | ✅ (UE chưa build) |
| Demo 0.2 | Fun pass: chạy nhanh, quán tính, rig có khớp + animation thủ tục, FX trúng đòn, ánh sáng; sơ đồ phím từ 7 game | ✅ |
| Demo 0.3 | Né = C, nhảy = Space, HUD phát sáng (trống đồng ulti), hành trang (B), bản đồ (M) + minimap, boss khó hơn (bot đo: +57% sát thương nhận), sửa tường vô hình | ✅ trên `main` |
| **Demo 0.4** | Cốt truyện tương tác, môi trường PBR, bản đồ 4,8×, combat 0.4, quái Blender | 🟡 **đang dở** (xem §4) |

Bản chơi thử (artifact riêng tư của PO): https://claude.ai/artifact/4PetpFm4jRtHe1UQL86ke5. Hiện là bản **0.3 build `5a29f94`**; publish lại cùng URL khi xong 0.4.

## 4. Demo 0.4 — trạng thái chi tiết
**Phản hồi PO dẫn tới 0.4:** không hiểu câu chuyện; đổi đời tẻ nhạt; đòn đánh thô, chiêu quái và boss dở; bản đồ quá bé; quái giống thú thường; map không chân thực (tham chiếu Black Myth: Wukong).

| Hạng mục | Thiết kế/dữ liệu | Code trong prototype | Ghi chú |
|---|---|---|---|
| Cốt truyện tương tác (cold open 90 s, 6 NPC + lựa chọn, nhiệm vụ "Người chưa về" 6 bước + 3 phụ, bàn giao có tương tác) | ✅ `STORY_INTEGRATION_0_4.md` v1.1, `dialogue/quests/cinematics.json` | ✅ `src/story/` (đã chạy trong smoke) | Phản biện ĐẠT CÓ ĐIỀU KIỆN, đã sửa SI-01..05 |
| Quái "yêu đầm" (Dế Cõng Đá thay cua; id kỹ thuật giữ `en_cua_cang_bun`) | ✅ `creatures_0_4.json` | 🟡 mới đổi tên hiển thị | Chưa dựng model |
| Môi trường PBR (HDRI, terrain heightmap, nước, lau/cỏ/rừng instancing, props Blender, asset CC0) | — | 🟡 phần lớn đã có (`src/env/`, `assets/`) | Thiếu ảnh trước/sau, license chưa đủ |
| Bản đồ 4,8× (`world_0_4.json`) | ✅ | 🟡 agent môi trường đang dựng theo dữ liệu | Kiểm `test/walkable.test.mjs` |
| Combat 0.4 (giáo 15 / rìu 16 đòn mới, tài nguyên "Đà", 14 nút cây chiêu; chiêu quái mới; boss 2 pha × 12 chiêu) | ✅ `design/COMBAT_0_4.md`, khối `*_0_4` trong data | ❌ chưa ghép | Đợt sau (D-026) |
| Dựng quái bằng Blender (`bpy` từ PyPI) | ✅ brief trong `creatures_0_4.json` | ❌ chưa làm | Đợt sau |
| Cổng bãi lầy cần 2/4 vệt dấu | đề xuất trong COMBAT_0_4 | ❌ | Chờ PO duyệt |

**Kết quả kiểm tra gần nhất (2026-11-08, commit `7a6d34d`):** `npm test` **157/157** đạt; `design_validate` **0 lỗi, 12 cảnh báo**; test Python đạt. **Smoke chưa xác nhận:** lượt đầy đủ gần nhất còn **trượt 6/86 kiểm tra trận boss/cạy**. Agent môi trường đang sửa `src/logic/shackle.js`, `test/boss.test.mjs`, `game/game.js` (bot cạy bằng phím có timestamp CDP) thì bị dừng giữa lượt smoke cuối, nên chưa có kết quả.

## 5. Việc làm tiếp (theo thứ tự)
1. **Smoke đạt 100%, không làm yếu kiểm tra:**
   ```
   cd prototype/web
   npm ci
   npm run build
   npm test
   npm run smoke
   ```
   - Điều tra 6 kiểm tra boss/cạy: do headless chậm (2–7 fps khi có môi trường) hay do lỗi logic (heightmap, đấu trường mới)?
   - Smoke phải chạy qua server tĩnh `test/serve.mjs` để tải được glb/hdr; tham số `SMOKE_QUERY=env=0` chỉ để chẩn đoán.
   - `envshots.mjs` cần `SHOTS_QUERY=intro=0`.
   - Còn một lỗi chập chờn: có lần smoke báo HUD đời Bương chứa từ chặn; smoke giờ in đoạn chữ bị dính.
2. Chụp ảnh trước/sau, đăng ký đủ license từng asset (`docs/ASSET_LICENSE_REGISTER.md`), soát dung lượng `dist` (≤ 40 MB; mỗi file ≤ 15 MB; trang ≤ 16 MB).
3. **Publish Demo 0.4** lên cùng URL artifact. `dist/` có thư mục `assets/`, nên publish nhiều file qua `files`. Viết `reports/DEMO_0_4_REPORT.md`. Gộp `feat/demo-0.4` → `main` (fast-forward nếu được).
4. Đợt 0.4b: ghép combat 0.4, dựng quái bằng Blender theo `creatures_0_4.json`, cổng 2/4 vệt dấu (hỏi PO).
5. Track U: PO cần build UE theo `docs/BUILD_GUIDE_UE.md` và gửi log. Code UE có các điểm `// VERIFY:`. Các tính năng 0.2–0.4 hiện **chỉ có trong prototype web**, chưa port sang UE.

## 6. Cần kiểm tra lại / chưa xác minh
- **Văn hóa** (mức B, cần người thật):
  - Khái niệm "thành tinh".
  - Motif sao trên mặt trống ở HUD (D-024).
  - Dải chàm buộc sào.
  - Vè và hò mới (cần người viết vè).
  - Tên NPC.
  - Danh sách tham vấn nơi thờ (Đền Hùng, Phù Đổng, Ba Vì, Quán Thánh, Phủ Tây Hồ, Linh Lang, Mẫu Âu Cơ).
- Nguồn nghiên cứu chỉ đọc qua trích đoạn tìm kiếm; chưa đối chiếu Lĩnh Nam chích quái bản gốc (wikisource bị chặn mạng).
- Phím của 7 game tham chiếu chưa đối chiếu với menu thật.
- Chưa có số FPS thật; chưa thử tay cầm thật.
- **Track U chưa từng build.**
- Pháp lý: nhãn hiệu tên game, EULA UE, Steam AI disclosure, Nghị định 147/2024 (chưa tra).
- Một số hằng số tạm trong code prototype chưa có trong dữ liệu (ghi trong README).

## 7. Cách làm việc đã thống nhất
- Theo `CLAUDE.md`:
  - Người viết khác người duyệt (`historian-verifier` cho nội dung, `qa-lead` cho code).
  - Không bịa nguồn hay số liệu.
  - Không nói "xong" khi chưa build và test.
  - Dữ liệu chỉ **thêm** trường mới (khối `*_0_x`), không đổi hay xóa trường cũ, vì ArpgCore C++ đọc dữ liệu.
- **Git:**
  - Làm trên nhánh `feat/*`, commit message tiếng Anh, có trailer `Co-Authored-By`.
  - Asset nhị phân đi qua **Git LFS**.
  - **Commit và push thường xuyên**: stop-hook yêu cầu, và phiên hay bị ngắt.
- **Hạn mức:** chạy nhiều agent song song làm hết hạn mức 5 giờ rất nhanh. Chạy tối đa 1–2 agent; commit WIP trước khi agent dừng.
- **Môi trường cloud** riêng `GAME-AAA---VietNam-version`:
  - Mạng giới hạn, có thêm: `api.polyhaven.com`, `dl.polyhaven.org`, `cdn.polyhaven.com`, `ambientcg.com`, `lfs.github.com`.
  - Có npm, PyPI (`bpy` 5.2.x để chạy Blender headless).
  - Không có GPU, Windows, UE.
  - Playwright và Chromium có sẵn (`require('playwright')`; không chạy `playwright install`).
- **Lệnh kiểm tra nhanh:**
  ```
  python3 tools/research_tool.py lint
  python3 tools/design_validate.py
  python3 -m unittest discover -s tests
  cmake -S game/Source/ArpgCore -B /tmp/b -G Ninja && cmake --build /tmp/b && ctest --test-dir /tmp/b
  cd prototype/web && npm test
  ```

## Cập nhật QA 2026-11-08 — sau bàn giao

Đã xử lý blocker smoke boss/cạy: commit `9f6a426` giữ đồng hồ cạy đồng bộ timestamp phím khi render >0,5 giây; smoke chờ đúng trạng thái UI và server trả 204 cho favicon. **Smoke mới 86/86 đạt với PBR/asset thật**, 159/159 test web, 102/102 test Python, validator 0 lỗi/12 cảnh báo. 8 asset LFS có SHA-256 khớp L-023…L-030; dist 15,27 MiB. Kết quả này thay thế ghi chú smoke chưa xác nhận ở trên. Xem `reports/qa/QA_DEMO04_PRY_CLOCK.md`.

Chưa Publish game, chưa gộp main. Việc tiếp theo: ảnh so sánh môi trường trước/sau và chuẩn bị bản phát hành để PO xem; combat 0.4/model quái vẫn thuộc đợt sau.

## Cập nhật gói xem 2026-11-09

Đã chụp 2 cặp ảnh graybox/PBR cùng bản đồ 0.4 (Bến Sậy, đấu trường boss; High), tạo trang so sánh thanh kéo và ZIP chơi thử kèm license/checksum. Kiểm tra ảnh, gallery, CRC/SHA-256 ZIP và URL asset đạt. Không sửa logic và không chạy lại smoke dài đã đạt. Xem `reports/DEMO_0_4_REPORT.md` (từ reports/ dùng `DEMO_0_4_REPORT.md`). Gói xuất tại `/workspace/demo04-review/`; chưa Publish game/chưa gộp main. Bước tiếp: PO xem gói, chọn bản để phát hành; combat mới/model quái vẫn thuộc đợt sau.

## Kế hoạch sản xuất đề xuất 2026-11-10

PO xác nhận có **30–40 giờ/tuần**. Đã lập `docs/production/ROADMAP_TO_RELEASE_V1.md`, WBS 60 task và lịch vai theo phase (CSV); thêm `.claude/agents/project-manager.md`. PM là phiên chính, xuyên suốt P0–P14, một worker hoạt động và reviewer tuần tự. Baseline đề xuất bắt đầu 16/11/2026, mẫu 15–20 phút 04/04/2027, vùng Lợn Lòi 30/05/2027, cửa sổ bản đủ cuối 2028–đầu 2029. **Chưa duyệt scope/ngân sách art/cố vấn, chưa khởi động phase; ngày là forecast có điều kiện, không là cam kết phát hành.** Không nhầm vùng mở đầu với cả Long Biên/Hồ Tinh hoặc Game 1. Đọc roadmap và actual mới nhất trước khi giao việc.

## Thực thi P0/P1 2026-11-10

PO đã yêu cầu tiến hành, xác nhận30–40h/tuần và cóUE+VisualStudioC++ trênWindows. Đã có brief mẫu `design/P0_VERTICAL_SLICE_BRIEF.md`, scope/asset/risk register và `docs/production/PM_STATUS_2026_11_10.md`. Đãreviewtĩnh và sửa finding; chưa là mẫuUE chạy được. Helper `tools/ue/Build-Project.ps1` + `P1_WINDOWS_BUILD_HANDOFF.md` + `P1_COMPATIBILITY_MATRIX.md` chờ PO chạy Windows/gửi result.json/build.log. Cloud không cópwsh/UE/GPU, **P1 runtime vẫnblocked**, chưapin5.7 theo bằng chứng, chưabuild/cook/package. Ưu tiên tiếp: xử lýlog thật; không lặp lại hỏi đãcàiUE/VS chưa. Chưa rõversion thực tế/ngân sáchasset. KhôngPublish/merge main.

### Máy Windows: đường dẫn UE đã tìm thấy

PO cung cấp `D:\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe`; dùng EngineRoot `D:\UE_5.8`. Script build có tùy chọn `-AllowUnverifiedEngine` để thử UE5 minor khác association5.7 mà không sửa project; vẫn cần đọc Build.version và log compile. Không hỏi lại vị trí cài UE hoặc dùng đường dẫn ví dụ D:\Epic Games. Chưa có bằng chứng build/runtime UE5.8.

### Build Windows đầu tiên 2026-11-11

Đã nhận result.json/build.log từ PO: UE5.8.4, VS18.11.12328.437, MSVC14.51.36260, SDK10.0.26100.0; Editor target commit2d311a3 buildfailed exit6. Lỗi chặn: FerryEnemy.cpp208 dùng RealDt ngoài scope TickAi. Đã sửa truyền GameDt+RealDt qua declaration/definition/call, giữ nhịp cạy worldtime; testcore3suite HitStop/Shackle/BossEncounter đạt, cần rebuildWindows. Xem PM_STATUS_2026_11_11.md. Không hỏi lại càiUE/VS, không coi warningcompiler là nguyên nhân C2065. UE runtime/package chưa xác minh.

### Rebuild Windows thứ hai 2026-11-11

Commitde1dc3e: RealDt compileerror đãhết, tớiDLLlink còn5LNK2019 FArpgConfig FindWeapon/FindMoveset/FindDifficulty/FindEnemy/FindBoss. Đã thêmARPGCORE_API từngmethod trongConfig.h; địnhnghĩađãcó trongConfig.cpp. ChờrebuildUE5.8.4 để xácnhậnlink, chưaEditorrun/cook/package. Khôngyêucầucài lạiUE/VS.

### Editor build UE đạt — 2026-11-11

PO logcommit24d40a9: UE5.8.4, ProjectFerryEditor Win64Development **Succeeded exit0**. ArpgCore/ProjectFerry/ProjectFerryEditor DLL đãlink; RealDt và5lookupLNK đãhết. **Không yêu cầu build lại chỉ vì cập nhật docs.** Tiếp: mở existinguproject bằng D:\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe, kiểm logdata, chạy scriptgrayboxtrongEditor rồiPIE. Mapgrayboxold chỉđểtestnền, chưaUE0.5/art/fullwebport. Runtime/Gamecook/package chưađạt, associationvẫn5.7, compilerwarningpreferredversionkhôngblock.
