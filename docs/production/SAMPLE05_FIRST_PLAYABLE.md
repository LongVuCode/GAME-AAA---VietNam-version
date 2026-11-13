# Mẫu Bến Sậy 0.5 — lượt triển khai bố cục/tương tác đầu tiên

Trạng thái: **Editor target đã compile/link trên Windows; chưa xác minh tạo level và runtime của mẫu**. Đây chưa phải gate P4 hoàn tất, chưa xác nhận thời lượng15–20phút, chưa model Cói/Dế hoàn thiện. Mục tiêu lượt này là thay đổi có thể chơi: tuyến mới, mục tiêu, giúp người, hậu quả và lối tắt, thay vì chỉ sửa màu map cũ.

## Có gì mới

- Level riêng `/Game/Maps/L_BenSay_Sample05`; không thay startup map/graybox cũ.
- Bến có mái nghỉ/cầu gỗ, gò cây sung ba thân, hai nhánh bờ cao/bãi thấp, bờ đê có người mắc ván và cầu quay về. Layout/marker/palette/text lấy từ `design/data/ue_sample_0_5.json`.
- Nói chuyện Năn → quan sát gò → đi một nhánh → giúp người → hạ cầu → trở về Năn. Có thể cứu trước khi nhận thoại; không bắt đi cả hai nhánh hoặc farm quái.
- E hoặc F tương tác; HUD mục tiêu, gợi ý gần mục tiêu, phụ đề có xuống dòng. Text runtime vi/en; bảng chỉ dẫn thế giới lượt này hiển thị vi.
- Giúp người làm vật cản biến mất/người đổi vị trí; mở cầu làm lối đi có collision; load dựng lại thế giới tương ứng stage.
- Save riêng `FerrySample05_v1`, schema/stage kiểm giới hạn, báo nếu save lỗi; giữ milestone sau chết/thoát, không ghi đè save hỏng/phiên bản không hiểu trừ reset rõ ràng.
- Rơi khỏi mép map đưa về checkpoint để tránh softlock của blockout.

## Chưa có — không cộng thành hoàn thành P4

- Nhân vật điều khiển và quái vẫn dùng hình placeholder hiện có; NPC chỉ là silhouette ghép hình để định vị vai. Chưa phải model/rig/animation sản xuất. Chưa nhập asset mua/AI hay tự nhận chất lượng AAA.
- Đây mới là một tương tác cứu giúp và một encounter dùng quái cũ, chưa full combat0.4, chưa boss/Hồ Tinh và không cả vùng90–180phút.
- Cảnh là blockout có bố cục/props/cây mẫu, chưa bộ môi trườngPBR/landscape đạt art target.
- Chưa đo người mới chơi, độ dài/chất lượng tuyến, vật lý/camera/nav trongUE, hiệu năng máy thật hoặc package mới.

## Chạy trên Windows

DừngPlay và đóngEditor trước build C++:

```powershell
Set-Location C:\dev\project-ferry
git pull --ff-only origin feat/demo-0.4
powershell -NoProfile -File .\tools\ue\Build-Project.ps1 -EngineRoot 'D:\UE_5.8' -AllowUnverifiedEngine
```

Nếu build lỗi, gửi result.json/build.log mới; không cần cài lạiUE/VS theo phỏng đoán. Nếu build đạt, mở project bằng:

```powershell
& 'D:\UE_5.8\Engine\Binaries\Win64\UnrealEditor.exe' 'C:\dev\project-ferry\game\ProjectFerry.uproject'
```

Tools → Execute Python Script… → chọn **file mới**:

```text
C:\dev\project-ferry\game\Content\Python\build_sample_bensay_0_5.py
```

Script mở/tạo level mới và chỉ dựng lại nhóm `Sample05/` trong level đó. Nếu đã chỉnh tay các actor trong nhóm này, lưu bản sao trước rerun. Không chạy lúcPIE. Script không dựng lại levelgraybox cũ khi nạp helper. Khi thấy `[sample05] scene ready`, bấmPlay; mong đợi `sample: active, stage=0` (hoặc stage đã lưu).

Điều khiển UE hiện tại: WASD đi, chuột nhìn, chuột trái/phải đánh, Space né, Q đỡ, Tab khóa, E/F tương tác. Đây chưa phải sơ đồ web0.4 Space=nhảy/C=né; không hướng dẫn nhầm.

Sau khi đã tạo, những lần mởEditor sau chọn Content Browser → Maps → `L_BenSay_Sample05` (startup vẫn làmapcũ). Không cần regeneratelevel mỗi lần chỉ muốn chơi lại. Muốn reset tiến trình mẫu, trong console game gõ `FerrySampleReset`; chỉ slot mẫu bị thay, không phải save game khác. Phím console theo cài đặt keyboard UE; nếu lệnh không nhận, gửi OutputLog. Không xóa thư mụcSaved toàn bộ.

## Checklist thử một lần rồi gửi kết quả

1. Spawn: đọc mục tiêu hỏiNăn, tới gần NPC có gợi ýE/F. Nói chuyện → objective đổi.
2. Đi tới sung chẻ ba → mục tiêu hướng bờ đê; chọn bờ cao hoặc bãi thấp, không cần cảhai.
3. Giúp người tại bờđê: vánđổ biếnmất/ngườiđổi vịtrí, objective yêu cầu hạ cầu.
4. Hạ cầu: đường về thực sự mở; qua cầu vềNăn → thông báo hếtmẫu.
5. StopPlay/Play lại: objective/cầu/người khớp milestone đãlưu. Một lượt khác reset rồi chọn đường còn lại.
6. Nếu chết/rơi: hồi về checkpoint đúngmilestone, không phải cứu lại sau khi đãcứu. Sau khi thoátEditor/mởlại phải testload riêng.

Gửi ảnh/video đường bạn đi và `game\Saved\Logs\ProjectFerry.log`. Nếu lạc, ghi vịtrí/mục tiêu đanghiện; đó là dữliệu thiết kế, không phải yêu cầu bạn tự đoán đườngchođúng.

## Kiểm tra tại cloud

- 106testPython đạt (gồm regressiongraybox và2testscene mới); validator0lỗi/12cảnhbáocũ.
- Testscene kiểm contractmarker/string/save slot, mapriêng và connectivity2nhánh khôngcầnbridge theofootprint2D. Không thay testcollision/navmeshUE.
- PortableC++20 progression test đạt với `-Wall -Wextra -Werror`: thứ tựthường, cứu trước, khóa cầu, lặp tươngtác/idempotence và stagebất hợp lệ. Không thay testUSaveGame/UHT/runtime.
- Script dry-run báo130mesh/10marker hợp lệ. Reviewtĩnh độc lập; tấtcả UE API vàcảmgiácchơi vẫn chờ log/bằngchứng máyPO.

## Bổ sung dẫn đường 2026-11-13 — source chờ kiểm tra Windows

- **J** mở/đóng nhật ký để đọc lại mục tiêu và chỉ dẫn theo milestone hiện tại. Thiết kế là tạm dừng thế giới khi mở để người chơi đọc không bị đánh; cần kiểm pause/input thực tế trongUE. Nhật ký không đổi stage hoặc format save.
- Nội dung giải thích rõ hai đường vòng qua nước và không bắt làm cảhai; sau cứu chỉ cách tới cọc kéo và vềNăn.
- Có nhãnNăn và cọc/tay kéo/dây cạnhmarker cầu, thay vì yêu cầu tìm một điểm tươngtác vôhình. Không thay modelplayer/quái bằng assetfinal.
- Scene hiện133mesh/10marker; dryrun và2testdata/localization/connectivity đạt; testportable progression vẫnđạt. Không chạy lạifullsmokeweb khôngbịảnhhưởng. Các kếtquả này không chứngminh C++/pause/HUD đã chạy trongUE.

Kiểm thêm: mởJ khi gầnquái rồiđóngJ, xácnhậnworlddừng/tiếptụcđúng; textkhôngtrànmàn; mapgrayboxcũ khôngbịJpause; đọcnhật ký khôngthaytiếntrình; sauchết/load đọcđúngmốc. Nếu C++buildfail gửi logtrước, khôngcầntựđoán hoặc cài lạitoolchain.

## Bằng chứng build 2026-11-13

PO gửi result.json/build.log của commit `e09f79a23eae8568b18a74662ed85b10ffdb4447`: UE5.8.4, VS18.11.12328.437, ProjectFerryEditor Win64Development **Succeeded/exit0**,67.42giây tronglog. Điều này xácminh C++/UHT/link của mẫu+nhật ký; chưachứngminh Pythonbuilder/chơi/save/Jpause/Gamepackage. Bước tiếp chạyfilebuilderMỚI trongEditor, khôngbuildlại chỉvìdocs.

## Kiểm chứng runtime đầu tiên 2026-11-13

PO đã tạo level133mesh/10marker và đi đủ6stage. Một lượt từ0→5 mất~95,5giây, nên **chưa đạt mẫu15–20phút**. J đã ghi mởvớiownpause; Stop/Play lại khôi phụcstage5. Chưa testsave quaEditorrestart hoặc toàn bộ pause/deathcases. Ảnh vẫn cóplayer hìnhtrụ: mẫu art chưađạt.

BảnPython sửa kếtiếp dùngSun/SkyLightMovable vàtắtprecomputedlighting tronglevelmới (khôngtắtmessagecảnhbáo); chữ3DchỉgiữởEditor vì font/layout khôngđọcđược tronggame, HUD/Jvẫnvi/en. DừngPlay,pull,chạy lại `build_sample_bensay_0_5.py`; khôngC++buildlại. Cảnh/lighting sau sửa vẫncầnảnhUE đểxácnhận.
