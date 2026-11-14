# Realistic06 — xác minh source ngày 14/11/2026

Kết luận reviewer `realistic_qa`: **ĐẠT CÓ ĐIỀU KIỆN để bàn giao source prototype cho Windows kiểm thử. Chưa nghiệm thu màn chơi hoàn chỉnh.**

## Bằng chứng đã có

- `python3 -m unittest discover -s tests`: 110 test đạt. Sau thay đổi art/layout cuối, chạy lại 4 test mới: đạt. Kiểm checksum, localization/marker/save, ID quái tồn tại, độ dốc hai lối đi, mép cầu, skin và dữ liệu chuyển động GLB phân biệt, material/texture và bounds.
- ArpgCore: 19/19 CTest đạt trong `/tmp/ferry-realistic-core`; không đổi thuật toán combat lõi trong gói này. Hai executable portable Sample05/Realistic06 progress được compile/chạy riêng; reviewer xác nhận lại. Không nhầm CTest này với UE build.
- `python3 tools/research_tool.py lint`: 0 lỗi, 7 cảnh báo nguồn cũ. `python3 tools/design_validate.py`: 0 lỗi, 12 cảnh báo cũ.
- `verify_realistic_art.py` nhập lại 4 FBX tĩnh và 20 FBX animation riêng bằng bpy 5.3; bounds khớp manifest, có UV, đủ xương, clip có 37 frame và pose signature riêng. Kết quả: `REALISTIC06_ART_CHECK.json`. Đây là kiểm định dạng/geometry, không đánh giá animation đẹp hoặc đúng combat timing trong UE.
- `git diff --check`: đạt. Nhị phân theo Git LFS, license L-031…L-033 đăng ký trước commit.

## Finding đã sửa

Texture GLB WebP/PNG và cơ chế lazy packed-image từng làm FBX thiếu ảnh; converter hiện trích PNG buffer trực tiếp, manifest phải có màu cho vỏ cây/lá/đá/nhà. Copy mesh data trước bake để không làm các object glTF dùng chung geometry bị scale chồng. Bounds tính trực tiếp từ vertex. Tên material được chuẩn hóa cho UObject. Mỗi motion xuất một FBX để import lại đúng tên.

Boss chuyển state qua EnterState để phát động tác choáng/cạy; target panel tránh nhiệm vụ trên HUD; E cạy không bị sample interaction chặn. Slot06 độc lập05; milestone chỉ nhận outcome Freed, không nhận Fled; reset/load khôi phục gate. Nhật ký đổi hướng dẫn theo landmark06, bỏ chi tiết nón không có trên mesh.

## Bằng chứng hình ảnh

`../art/realistic06/landing_source_preview.png` và `region_source_preview.png`: render Cycles CPU từ các FBX và bố trí source thực, không phải ảnh UE hay concept được dùng thay screenshot. Ảnh character ở `game/ArtSource/Characters/character_contact_sheet.png` và `coi_detail.png`.

Nhìn trực tiếp: hình học có chi tiết hơn primitive nhưng vẫn cách điệu; môi trường còn thưa, chưa siêu realistic. Terrain 1,2 km² và 4.168 placements không chứng minh độ hấp dẫn, thời lượng hoặc FPS. Nhân vật/quái/địa hình thủ tục mang nhãn PLACEHOLDER_AI, nội bộ, chưa được phát hành.

## Chưa xác minh

UE 5.8.4 compile, API Python importer/LOD/foliage, tên asset khi FBX nhập thật, skeleton orientation/scale, foot contact/skin/hit contact, collision cầu và bãi cạn, chữ/ánh sáng, quest boss cạy thực tế, save/restart trong PIE, FPS/VRAM RTX 5050 và cook/package. Các guard importer sẽ báo lỗi thay vì im lặng gán nhầm clip; chúng chưa thay thế một lần chạy UE.

Bước tiếp bắt buộc để đóng đợt: chạy `tools/ue/Build-RealisticLevel.ps1`, nhận READY ở đúng L_BenSay_Realistic06, hoàn thành vòng nhiệm vụ và kiểm load lại. Hướng dẫn: `docs/production/REALISTIC06_WINDOWS_HANDOFF.md`.
