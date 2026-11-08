# Demo 0.4 — bản chuẩn bị để xem

Ngày: 2026-11-09 (Asia/Saigon). Nhánh: `feat/demo-0.4`. Mã nguồn gói xem: `0a7a47f` (bao gồm bản sửa `9f6a426`). Chưa Publish game và chưa gộp main.

## Đã làm

- Cốt truyện tương tác, nhiệm vụ, hội thoại, bàn giao Cói → Bương; môi trường PBR và bản đồ mở rộng theo dữ liệu đã có trên nhánh.
- Khắc phục lệch nhịp cạy khi render chậm và chờ UI trong smoke; xem `qa/QA_DEMO04_PRY_CLOCK.md`.
- Chụp 2 cặp ảnh Bến Sậy/đấu trường boss bằng `test/envshots.mjs`, cùng góc camera 1280×720, High. Graybox (`env=0`) và PBR (`env` mặc định) đều trên bản đồ 0.4; không phải ảnh đối chiếu 0.3/0.4. HUD/thông báo vẫn có trong ảnh, không chỉnh sửa ảnh.
- Tạo trang so sánh độc lập có thanh kéo, ảnh nhúng sẵn; tạo ZIP chơi thử có HTML + 8 asset + license + README + manifest/checksum.

## Bằng chứng

- QA trước bước đóng gói: 159/159 test web, 102/102 test Python, smoke 86/86 với PBR thật; validator 0 lỗi/12 cảnh báo.
- Bước này không sửa logic/dependency/test nên không chạy lại các bộ test dài. Chỉ rebuild để đóng gói tại commit bàn giao.
- Hai lượt chụp: không lỗi/cảnh báo console, không request ngoài server nội bộ. PBR state ready; terrain, lau, cỏ, props, nature và HDRI đều loaded.
- Trang so sánh: 4 ảnh tải đủ, thanh kéo được kiểm tra ở mức 75%.
- ZIP kiểm tra CRC và SHA-256 của cả 12 file nguồn; trang HTML và 8 URL asset trong gói trả HTTP 200.
- Dist 15,27 MiB/9 file, file lớn nhất HDRI 4,36 MiB; đạt ngưỡng tổng 40 MB, từng file 15 MB, trang 16 MB. ZIP khoảng 13 MB. Asset khớp license L-023…L-030.

## Gói để xem trong workspace

- `/workspace/demo04-review/review.html`: so sánh độc lập (mở trực tiếp được).
- `/workspace/demo04-review/demo-0.4-review.zip`: gói chơi; giải nén, chạy HTTP server theo README, không mở game bằng file://.
- `/workspace/demo04-review/SHA256SUMS.txt`, `manifest.json`: checksum và commit nguồn.
- Ảnh gốc: `/workspace/demo04-review/images/`.
- Log chụp: `/tmp/envshots-after.log`, `/tmp/envshots-before.log`.

Các file xuất nằm ngoài Git. Có thể tái tạo từ repo bằng `npm ci && npm run build`, rồi chạy `test/envshots.mjs` với `SHOTS_ONLY=ben,arena`, `SHOTS_QUERY=intro=0` (PBR) hoặc `SHOTS_QUERY=intro=0&env=0` (graybox), cùng chất lượng High. Dùng Playwright/Chromium hệ thống như hướng dẫn môi trường; không tải thêm browser.

## Chưa làm / giới hạn

- Chưa có nhận xét của PO về hình ảnh/cảm giác chơi; ảnh SwiftShader không chứng minh hiệu năng RTX 5050 hoặc FPS mục tiêu.
- Combat 0.4, model quái Blender và cổng bãi lầy 2/4 vệt dấu chưa triển khai (đợt sau; cổng cần PO quyết định).
- Unreal chưa từng build. Chưa Publish lên artifact, chưa phát hành thương mại.
- 12 cảnh báo validator còn nguyên; các giới hạn văn hóa, pháp lý và xác minh người thật trong AI_CONTEXT vẫn áp dụng.

## Bước tiếp

PO xem gói chơi và hai góc so sánh; sau khi chọn bản để phát hành, đưa toàn bộ `dist/index.html` và `dist/assets/` lên nơi phục vụ web (không chỉ một file HTML). Sau đó kiểm chứng bản đã đưa lên trước khi gộp main/ghi nhận phát hành. Công cụ xuất bản artifact Claude cũ không có trong phiên này.
