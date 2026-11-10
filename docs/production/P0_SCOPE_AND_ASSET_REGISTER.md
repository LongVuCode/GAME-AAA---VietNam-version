# P0 — phạm vi triển khai và đầu vào asset

Ngày: 2026-11-10. PM: phiên chính. Căn cứ: PO yêu cầu “tiến hành làm”, có 30–40h/tuần và đã cài UE + Visual Studio C++. Phiên bản engine/toolchain chưa xác nhận. Khởi động sớm P0 từ hôm nay; baseline 16/11 giữ nguyên để so sánh, chưa tự rút ngắn ngày final.

## Phạm vi được đưa vào làm trước

- Sản phẩm gần nhất: mẫu UE chơi 15–20 phút, Bến Sậy → cứu người → mở lối tắt. Đây không phải toàn vùng/chương.
- Mẫu phải có một Cói, một quái, hai vai NPC dùng chung nền rig (Năn và người gánh lau) và một cụm cảnh đủ làm chuẩn, input/combat/quest/checkpoint/save tối thiểu.
- Sau mẫu mới mở rộng vùng Lợn Lòi 90–180 phút; full game nhiều chương vẫn là mục tiêu dài hạn, không tự cộng nội dung lịch sử/DLC.
- Giữ canon và giới hạn đã chốt. Tọa độ map mới có thể thiết kế lại; không sửa map 0.4 trong lúc chuẩn bị UE.
- Không tự mua asset, thuê dịch vụ, cài Unreal ở cloud, phát hành hoặc merge main. Ngân sách chưa xác nhận; không dùng việc này chặn những bước thiết kế/chuẩn bị/build đã được giao.

## Asset register cho mẫu — không phải danh sách đã mua/đã hoàn thành

| ID nội bộ | Asset/đầu ra | Hiện có | Cách làm trước | Owner | Gate |
|---|---|---|---|---|---|
| SAMPLE-CHAR-01 | Cói: model/material/rig | Rig primitive web, chưa đạt mẫu | Brief silhouette/trang phục và yêu cầu rig; khảo sát asset có quyền chỉnh/tự làm/thuê, PO chọn trước mua | tech-art-perf + PO/artist | Người liền mạch, chân/tay/vũ khí tiếp xúc đúng trong UE |
| SAMPLE-ENEMY-01 | Dế Cõng Đá | Brief creatures_0_4, hình legacy chưa đạt | Làm đúng silhouette chân xẻng/lưng đá; không đổi tên cua rồi coi xong | tech-art-perf + PO/artist | Model/rig/animation/collision/LOD và defeat không giết |
| SAMPLE-NPC-01 | Năn ở Bến Sậy và người gánh lau — hai vai | Thoại/primitive | Tái dùng skeleton và animation nền, khác silhouette/trang phục; không cần asset riêng hoàn toàn | narrative + tech-art | Vai/thoại rõ, không dịch chuyển bất hợp lý theo quest |
| SAMPLE-ENV-01 | Bến, bờ đê, đường cao/lối tắt | GLB/texture PBR và L-023…L-030 | Import thử một gói có license, chỉnh scale/material/collision trong UE; chưa giả định meshopt GLB web import trực tiếp hoàn hảo | tech-art-perf | Đọc được lối, collision/nav/camera không cản, đo VRAM |
| SAMPLE-ANIM-01 | Đi/chạy/dừng/giáo/né/đỡ/tương tác/hit | Pose thủ tục web | Chọn rig rồi kiểm retarget/animation nguồn có license; sửa contact trước tăng số chiêu | animator + tech-art | Video gameplay, không chỉ preview skeleton |
| SAMPLE-AUDIO-01 | Bước chân/giáo/bùn/ambient và cue quái | WebAudio tổng hợp | Dùng nguồn âm có quyền hoặc thu riêng; một bộ mẫu nhỏ, không VO đầy đủ | tech-art + audio/PO | Nghe phân biệt chất liệu và cue, không clipping rõ |

Mọi source mới phải đi vào ASSET_LICENSE_REGISTER trước commit file asset; nguồn không rõ quyền thì không import vào gói phát hành. Không dùng ảnh AI làm asset phát hành theo luật repo.

## Rủi ro và owner đang theo dõi

| ID | Rủi ro | Owner | Trạng thái / bước gỡ |
|---|---|---|---|
| P0-R1 | Engine/VS có cài nhưng chưa rõ version/tương thích | UE engineer + PO | Chạy preflight/build; chưa pin 5.7 chỉ vì uproject ghi 5.7 |
| P0-R2 | Không có Windows/GPU trong cloud | PM + PO | Chuẩn bị script, PO chạy trên máy có UE; chờ log thật, không giả build |
| P0-R3 | Nguồn lực model/animation/ngân sách chưa chốt | tech-art + PO | Chuẩn bị brief/asset audit, chưa mua/thuê; chỉ chặn sản xuất asset hoàn chỉnh khi tới gate |
| P0-R4 | Tái diễn map rộng nhưng lạc/chán | game-designer | Mẫu graph nhỏ, playtest người mới trước art toàn vùng |
| P0-R5 | Nhầm NPC/canon/thời kỳ | narrative/verifier | Canon matrix và reviewer độc lập; mới chỉ [SÁNG TẠO] |
| P0-R6 | Lịch dài hạn bị hiểu là cam kết | PM | Giữ baseline và forecast; cập nhật actual sau P1/P4 |
