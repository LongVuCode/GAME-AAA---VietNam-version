# Realistic06 — dựng level mới trên Windows

Trạng thái: source và asset prototype đã chuẩn bị, **chưa xác nhận compile/import/PIE trong UE 5.8**. Đây chưa phải bản realistic hoàn chỉnh để phát hành.

## Chạy một lần

Lưu công việc và đóng Unreal Editor. Trong PowerShell:

```powershell
cd C:\dev\project-ferry
git switch feat/demo-0.4
git pull --ff-only origin feat/demo-0.4
git lfs pull
powershell -NoProfile -File .\tools\ue\Build-RealisticLevel.ps1 -EngineRoot 'D:\UE_5.8' -AllowUnverifiedEngine
```

Lệnh cuối build C++ mới, rồi mở Editor và tự chạy importer. Không cần tự chạy hai script graybox/Sample05 cũ. Không đổi association 5.7; 5.8 vẫn là compatibility trial.

Chờ Output Log có dòng **`[realistic06] READY /Game/Maps/L_BenSay_Realistic06`**, shader/asset import xong rồi mới nhấn Play. Nếu script báo lỗi thì dừng ở lỗi đó; không coi map còn mở là kết quả mới. Import không tự chạy được: Tools → Execute Python Script → `C:\dev\project-ferry\game\Content\Python\build_realistic_level_0_6.py`.

Map phải mang tên **L_BenSay_Realistic06**. Nó dùng save `FerryRealistic06_v1`, không lấy save đã hoàn thành của Sample05. Importer chỉ thay actor do nó sở hữu trong map này; giữ nguyên hai map cũ. Import có thể lặp lại; FBX clip riêng để tên asset ổn định. Cấu hình startup/default map chỉ đổi sau khi tạo và lưu level thành công.

## Những gì cần thấy và thử

- Địa hình liền 1.200 × 1.000 m, đường đất, sông, cây có lá, đá có texture, nhà sàn và lò bỏ hoang; không phải các tấm sàn và cầu vồng khối tròn.
- Cói và quái có mesh/rig tùy chỉnh. Log `realistic06: custom visual ready` phải hiện; nếu log báo `proxy retained`, asset chưa vào đúng và chưa đạt kiểm tra này.
- Hỏi Năn → gò cây sung hoặc đường bãi cạn → cứu người gánh lau → hạ cầu → giải thoát Lợn Lòi → trở lại Năn. Có hai lối đến người gánh lau; cầu là đường tắt, boss là điều kiện kết thúc.
- J mở nhật ký; E/F tương tác; chuột trái/phải đánh nhẹ/nặng; Space né; Q đỡ; E bắt đầu cạy và bấm đúng ba nhịp hiển thị. Đây là giải thoát thú, không đánh người.
- Thoát Play rồi Play lại: giữ tiến trình và boss đã giải thoát không xuất hiện lại. Console `FerrySampleReset` đặt lại **save của map đang chơi**. Chỉ dùng khi muốn thử lại từ đầu.

Diện tích không đồng nghĩa 1–3 giờ nội dung. Thời lượng, độ dễ tìm đường, collision cầu/ford, góc xoay và scale rig, skin, clip chân, chữ tiếng Việt, ánh sáng và FPS vẫn phải kiểm thực tế. Foliage được instancing và giới hạn khoảng vẽ; chưa có số liệu RTX 5050.

## Gửi kết quả

Nếu build lỗi: `build\ue-onboarding\<thư mục mới nhất>\result.json` và `build.log`.

Nếu import/Play lỗi: `C:\dev\project-ferry\game\Saved\Logs\Realistic06-import.log`, ảnh toàn cửa sổ có tên map, và mô tả bước gây lỗi. Sau khi mở Editor theo cách khác, log nằm ở `game\Saved\Logs\ProjectFerry.log`.

Source preview ở `reports/art/realistic06/` là render Blender của geometry và bố trí thực; chưa phải hình Unreal. Nhân vật/quái vẫn cách điệu và mang nhãn `PLACEHOLDER_AI`, chưa dùng thương mại. Không Publish hoặc merge main trong gói này.
