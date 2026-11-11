# P1 — ma trận tương thích trước build đầu

Ngày: 2026-11-10. Trạng thái: **chưa xác minh trên UE**. Nguồn hiện tại: game/ProjectFerry.uproject, các Target.cs/Build.cs và xác nhận PO đã cài UE + VS C++. Bảng này không pin phiên bản thay cho log build.

| Thành phần | Bằng chứng hiện có | Cần xác minh | Owner |
|---|---|---|---|
| UE | uproject khai báo 5.7, chưa chạy | Phiên bản thực tế/patch; build/cook/package | UE engineer + PO |
| Visual Studio/MSVC/SDK | PO đã cài VS C++, chưa biết version | vswhere, UBT compiler/SDK diagnostics | UE engineer + PO |
| C++20 ArpgCore | Standalone có test; UE module đọc vendored headers | UE compiler flags/no-exception path và liên kết module | UE engineer + QA |
| ProjectFerryEditor target | Type Editor; Latest build settings/include order | UBT của bản thực tế hỗ trợ và compile sạch | UE engineer + QA |
| ProjectFerry Game target | Type Game | Build Development Win64 và package sau Editor run | UE engineer + QA |
| EnhancedInput | Plugin bật, module được khai báo | Input context và mapping hoạt động khi PIE/package | UE engineer + QA |
| PythonScriptPlugin | Bật cho Editor | Chạy script tạo map bên trong editor; không đưa vào runtime package | UE engineer + QA |
| EditorScriptingUtilities | Bật cho Editor | API tạo map của bản đang dùng, world startup đúng | UE engineer + QA |
| DLSS/FSR/XeSS | Không khai báo trong project hiện tại | Chưa yêu cầu cho lần build nền; trước tích hợp phải đối chiếu bản/plugin/license thật | tech-art-perf |
| GLB/texture web | Có asset + license | Import/format/material/scale/collision và LOD trong UE; chưa chứng minh trực tiếp | tech-art-perf |

Thứ tự: preflight → Editor compile → Editor run/map/input → Game build/cook/package → chạy package → đo baseline. Không dùng “preflight passed” hoặc “CMake passed” làm bằng chứng UE ready. Nếu lỗi, dùng log lỗi đầu thật để sửa; không tự hạ phiên bản hoặc sửa project hàng loạt.

## Bằng chứng cập nhật 2026-11-11

PO buildcommit24d40a9 bằngUE5.8.4/VS18.11.12328.437: ProjectFerryEditor Win64Development compile/link đạt, exit0. Các module ArpgCore/ProjectFerry/ProjectFerryEditor đãlink. Ma trận runtime/plugin API tạo map/Game cook-package vẫnchưa xácminh; đây không phải blanketpinUE5.8.4. EngineAssociationchưađổi.
