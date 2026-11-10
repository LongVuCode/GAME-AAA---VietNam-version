# P1 — lần build Unreal đầu trên Windows

Trạng thái: chuẩn bị thực thi; **chưa có log build UE**, script PowerShell chưa được chạy trong Windows ở phiên cloud này. PO xác nhận đã cài UE và Visual Studio C++; phiên bản thực tế chưa biết. Project hiện khai báo EngineAssociation `5.7`, đây chưa phải phiên bản đã được chứng minh tương thích/pin.

## Lấy đúng source và chạy

Từ checkout repo hiện có trên Windows (không ghi đè thay đổi cá nhân):

```powershell
git status --short
git fetch origin
git switch feat/demo-0.4
git pull --ff-only origin feat/demo-0.4
git lfs pull
powershell -NoProfile -File .\tools\ue\Build-Project.ps1 -PreflightOnly
powershell -NoProfile -File .\tools\ue\Build-Project.ps1
```

Nếu có thay đổi cá nhân hoặc Git báo lỗi, dừng bước đổi nhánh/pull, bảo toàn file rồi gửi lỗi; không reset/force. Không cần chạy lại npm để build UE.

Nếu engine không ở thư mục mặc định, thêm tham số, ví dụ:

```powershell
powershell -NoProfile -File .\tools\ue\Build-Project.ps1 -EngineRoot 'D:\Epic Games\UE_5.7'
```

Script kiểm UE version, VS có workload MSVC và build Editor target, không đổi `.uproject`, không cài phần mềm, không cần admin. Nếu engine khác 5.7, gửi phiên bản để đối chiếu trước; script dừng thay vì tự convert. Nếu PowerShell chặn script, gửi thông báo policy; không cần tắt policy toàn máy.

## Đầu ra cần gửi lại

Trong `build\ue-onboarding\<run-id>\` (được gitignore):
- `result.json`: commit/UE/VS/target/status/exit code.
- `build.log`: toàn bộ output compile, nếu đã chạy build.

Log có thể chứa đường dẫn máy cá nhân; kiểm nội dung trước khi gửi. Không gửi môi trường/token/credential file. Nếu preflight dừng trước tạo report thì gửi nguyên thông báo lỗi và phiên bản UE đang có.

Exit 0 ở preflight chỉ chứng minh tìm được công cụ; exit 0 ở build chỉ chứng minh compile target. P1 vẫn cần mở Editor, tạo/chạy graybox, kiểm input, rồi cook/package và chạy bản đóng gói. Theo `docs/BUILD_GUIDE_UE.md`, script map `game/Content/Python/build_graybox_longbien.py` chạy bên trong Unreal Editor, không chạy bằng Python hệ thống. PM sẽ xử lý từng log và cấp bước tiếp, không ghi P1 Done chỉ từ preflight.

## Các bước PM thực hiện sau log đầu

1. Kiểm commit/engine/VS và lỗi đầu tiên thực sự trong log.
2. Sửa nhỏ theo chẩn đoán, QA review, chạy lại đúng target trên Windows.
3. Khi compile đạt: mở editor/chạy map, quay 30–60 giây đi/đánh mục tiêu.
4. Sau đó xác nhận map startup và cook/package target Game; không tự package level chưa tạo.
5. Lưu log/capture và plugin matrix; lúc đó mới đề xuất pin engine và đóng gate P1.
