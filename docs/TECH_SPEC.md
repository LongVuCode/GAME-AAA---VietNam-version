# Technical Specification — v0.1

## 1. Chọn engine: Unreal Engine 5
| Tiêu chí | UE5 | Unity 6 | Godot 4 | Engine tự viết |
|---|---|---|---|---|
| Đồ họa AAA (GI, hình học khổng lồ) | Nanite, Lumen, VSM có sẵn | HDRP tốt nhưng phải tự ghép nhiều | Chưa đạt | Không khả thi |
| Thế giới lớn | World Partition, HLOD, Data Layers | Phải tự làm | Hạn chế | — |
| Combat / animation | GAS, Motion Matching, Control Rig, IK | Có, rời rạc | Cơ bản | — |
| Plugin upscaler (DLSS/FSR/XeSS) | Có plugin chính thức từ cả 3 hãng | Có | Một phần | — |
| Chi phí | 5% doanh thu vượt ngưỡng (**cần kiểm tra điều khoản EULA hiện hành**) | Theo gói thuê bao | Miễn phí | — |

**Quyết định: UE5** (D-001). Ứng viên phiên bản là **UE 5.7.x** (phát hành tháng 11/2025, bản mới nhất mà tôi xác nhận được qua tìm kiếm ngày 03/11/2026).

## 2. Ma trận tương thích — BẮT BUỘC kiểm tra trước khi pin phiên bản
| Thành phần | Trạng thái đã biết (03/11/2026) | Việc cần làm ở GĐ1 |
|---|---|---|
| UE 5.7.x | Đã phát hành; có báo cáo lỗi ở các bản vá 5.7.2/5.7.3 (một số crash khi mở dự án có plugin FSR) | Xác định bản vá ổn định nhất; kiểm tra có bản 5.8 hay chưa |
| NVIDIA DLSS 4 plugin (SR, FG, MFG, RR, DLAA, Reflex) | Nguồn tôi tìm được (giữa năm 2025) ghi hỗ trợ UE 5.2–5.6. **Chưa xác nhận hỗ trợ 5.7** | Kiểm tra NVIDIA Developer; nếu chưa hỗ trợ 5.7 thì cân nhắc pin 5.6 |
| AMD FSR (FidelityFX) plugin | Có plugin UE. **Chưa xác nhận phiên bản và crash trên 5.7** | Kiểm tra GPUOpen |
| Intel XeSS plugin | **Chưa xác nhận** | Kiểm tra Intel |
| TSR / TAA / FXAA / MSAA | Có sẵn trong engine | — |

Tiêu chí pin: cả 3 plugin upscaler đều build và chạy được, và bản đo smoke test không crash qua 30 phút.

## 3. Kiến trúc mã
```
Source/
  ArpgCore/         # C++ thuần, không UObject: combat math, posture, damage, loot roll,
                    # crafting, secret-chain graph, event director. Unit test: GoogleTest (chạy CI Linux/Windows)
  ProjectFerry/     # Game module (tên mã nội bộ): Character, GAS abilities, AI (StateTree), UI (CommonUI), SaveGame
  ProjectFerryEditor/ # Validators: data asset lint, secret-graph reachability, localization coverage
Content/Data/       # DataTables (nguồn JSON/CSV có schema, import tự động)
tools/              # Pipeline Python: research lint, codex export, benchmark parser
```
- **Gameplay Ability System** cho kỹ năng, hiệu ứng và chỉ số.
- **Enhanced Input** để remap phím.
- **StateTree** cho AI.
- **Motion Matching** cho locomotion (đánh giá ở GĐ2).
- **Codex**: export từ `research/data/*.json` sang DataTable. Chỉ những mục có `game_use=in_game` mới được export.
- **Localization**: dùng Localization Dashboard của UE (gather/export `.po`). Tiếng Việt là ngôn ngữ gốc, có thêm tiếng Anh. Font phải hỗ trợ đầy đủ dấu tiếng Việt (kiểm tra các ký tự như ặ, ữ, ỹ).

## 4. Đồ họa và cài đặt
- **Preset**: Thấp / Trung bình / Cao / Rất cao / Cực cao / Tùy chỉnh. Ánh xạ tới Scalability groups (ViewDistance, AA, Shadow, GI, Reflection, PostProcess, Texture, Effects, Foliage, Shading) cộng các CVar riêng.
- **Tùy chỉnh**:
  - Upscaler (TSR / DLSS / FSR / XeSS / Tắt) và mức chất lượng.
  - DLAA. Frame Generation (DLSS FG/MFG, FSR FG).
  - NVIDIA Reflex.
  - Khử răng cưa: TSR / TAA / FXAA / SMAA (SMAA cần plugin hoặc tự viết, **cần đánh giá**).
  - Ray tracing: Lumen phần cứng hay phần mềm, phản xạ.
  - HDR, giới hạn FPS, VSync, chế độ màn hình (toàn màn hình / không viền / cửa sổ), độ phân giải, FOV.
  - Motion blur, chromatic aberration (tắt được).
- **Tự nhận diện phần cứng**: lần chạy đầu đọc thông tin GPU, VRAM, CPU, RAM, kết hợp `Scalability::BenchmarkQuality` của UE, rồi đề xuất preset và upscaler phù hợp.
- **Chỉ tiêu cấu hình (GIẢ ĐỊNH, chưa đo)**:

| Mục tiêu | Phần cứng tham chiếu (dự kiến) | Thiết lập | Chỉ tiêu |
|---|---|---|---|
| Tối thiểu | GPU DX12 SM6, 6GB VRAM (khoảng lớp GTX 1660 / RX 5600) | Thấp, 1080p, upscaler Performance | ≥ 30 FPS, 1% low ≥ 24 |
| Khuyến nghị | khoảng lớp RTX 3060 / RX 6700 | Cao, 1440p, upscaler Quality | ≥ 60 FPS |
| Cao cấp | khoảng lớp RTX 4080 hoặc mới hơn | Cực cao, 4K, DLSS Quality + FG | ≥ 60 FPS gốc (trước FG) |

  Các con số trên **phải được đo lại** trên máy thật bằng harness ở §5.

## 5. Hiệu năng và benchmark
- **Harness**: một map benchmark với camera bay theo đường cố định (Sequencer) cộng một kịch bản combat tự động. Dùng `-csvprofile`, `stat unit`, Unreal Insights. Script Python tổng hợp FPS trung bình, 1% low, 0.1% low, phân bố frame time, VRAM đỉnh và stutter (frame > 2× median).
- **PSO**: bật PSO precaching kết hợp bundled PSO cache. Có màn hình biên dịch shader lần đầu. Chỉ tiêu: không có hitch > 50ms do PSO trên đường bay benchmark sau lần chạy đầu.
- **Streaming**: World Partition (kích thước cell được tinh chỉnh), HLOD, ngân sách texture streaming theo VRAM.
- **LOD / culling**: Nanite cho mesh tĩnh; foliage và skeletal mesh dùng LOD hoặc Nanite foliage (**đánh giá trên phiên bản đã pin**); HZB occlusion.
- **Ngân sách VRAM**: Thấp ≤ 4.5GB, Cao ≤ 8GB, Cực cao ≤ 12GB (giả định).
- Kết quả benchmark lưu ở `reports/bench/<date>_<gpu>_<preset>.csv`, kèm commit hash.

## 5b. Máy phát triển của dự án (D-010): RTX 5050, 8 GB VRAM
- **Làm được trên máy này:** chạy UE5 Editor (Nanite/Lumen), build và cook bản Windows, đo preset Thấp → Cao ở 1080p/1440p, thử DLSS SR/DLAA/FG/Reflex trên phần cứng NVIDIA thế hệ mới. *Việc hỗ trợ Multi Frame Generation trên RTX 5050 cần xác nhận lại trên trang NVIDIA.*
- **8 GB VRAM là giới hạn thật** cho cả Editor lẫn game:
  - Ngân sách preset "Cao" nên giữ ≤ 7 GB.
  - Đặt World Partition cell nhỏ, giới hạn texture streaming pool.
  - Dùng Lumen phần mềm làm mặc định.
- **KHÔNG chứng minh được trên máy này:** 4K Cực cao, GPU AMD/Intel (FSR/XeSS vẫn chạy được trên NVIDIA nhưng không đại diện cho phần cứng của hãng khác), máy yếu hơn mức tối thiểu. Phương án: thuê GPU cloud theo giờ để đo, hoặc nhờ tester ngoài, hoặc dùng Steam Playtest. Bảng chỉ tiêu §4 sẽ ghi "chưa đo" cho những cấu hình này.
- **Cần hỏi thêm khi bắt đầu GĐ1:** CPU, RAM (khuyến nghị ≥ 32 GB cho UE5) và dung lượng SSD trống (Engine và DerivedDataCache cần hàng trăm GB).

## 6. Build, CI, kiểm thử
- Git + LFS (file lock cho `.uasset`/`.umap`). Nhánh `main` được bảo vệ.
- **CI**:
  - Linux runner: research lint, test Python, test GoogleTest của ArpgCore.
  - Windows runner có GPU (máy của dự án hoặc self-hosted): BuildCookRun, automation tests (Functional Tests), smoke benchmark.
- **Giới hạn hiện tại của AI**: môi trường AI là container Linux không có GPU, không có UE Editor. AI viết được code, dữ liệu, test logic và cấu hình; **không** build, cook hay benchmark UE được. Những việc này phải chạy trên máy Windows của dự án (xem câu hỏi Q1 trong báo cáo).
