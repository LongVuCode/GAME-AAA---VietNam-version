# CLAUDE.md — Luật làm việc của dự án (codename: ĐỒNG CỔ)

> Đây là file luật. Mọi agent hoặc thành viên phải đọc file này trước khi làm việc. Nếu luật mâu thuẫn với yêu cầu tức thời, phải hỏi Product Owner, không tự ý bỏ qua.

## 1. Ngôn ngữ
- Trao đổi, tài liệu, lore và chuỗi hiển thị dùng **tiếng Việt có dấu**. Chuỗi hiển thị bắt buộc đi qua hệ thống localization (String Table / `.po`), hỗ trợ `vi` (gốc) và `en`.
- Code, tên biến, tên asset, commit message và tên nhánh dùng **tiếng Anh**.

## 2. Tính trung thực
- Không bịa nguồn, niên đại, trích dẫn hay số liệu benchmark.
- Nếu chưa tra được bản gốc thì ghi rõ "chưa đối chiếu bản gốc".
- Chỉ được nói "xong" khi đã build, chạy test và có bằng chứng (log, ảnh chụp, CSV).
- Số liệu hiệu năng chỉ được ghi khi đã đo trên phần cứng thật, kèm cấu hình máy, build và commit hash.

## 3. Nội dung lịch sử và văn hóa (xem `docs/RESEARCH_PROTOCOL.md`)
- Mọi mục nội dung phải có một nhãn: `[SỬ LIỆU]`, `[SỬ LIỆU-TRANH LUẬN]`, `[HUYỀN THOẠI]`, `[CỔ TÍCH]`, `[SÁNG TẠO]` hoặc `[CHƯA XÁC MINH]`.
- Nội dung `[CHƯA XÁC MINH]` **không được** vào game. Việc này do `tools/research_tool.py lint` kiểm tra tự động.
- `[SỬ LIỆU]` cần ít nhất 2 nguồn thuộc **2 dòng nguồn độc lập**. Ví dụ, Toàn thư và Cương mục cùng một dòng, vì Cương mục kế thừa Toàn thư.
- Muốn đưa vào game (`game_use: in_game`), nội dung phải đạt mức xác minh **A**: đã đối chiếu bản dịch hoặc bản gốc có số trang và được chuyên gia sử học duyệt.
- Không bêu xấu nhân vật lịch sử. Không biếm họa thần thánh đang được thờ. Không kỳ thị dân tộc nào. Quân xâm lược được thể hiện là quân đội hoặc tướng lĩnh, không phải biếm họa sắc tộc.
- Lựa chọn của người chơi không được thay đổi sự kiện lịch sử đã xác minh.
- Giai đoạn cận - hiện đại (từ 1858) nằm ngoài phạm vi, trừ khi Product Owner phê duyệt.

## 4. Kỹ thuật
- Engine: Unreal Engine 5. Phiên bản chỉ được pin sau khi kiểm tra ma trận tương thích plugin (`docs/TECH_SPEC.md` §2).
- Logic thuần (combat math, loot, crafting, quest/secret state machine) đặt trong module C++ `ArpgCore`, **không phụ thuộc UObject**, có unit test chạy được ngoài engine.
- Data-driven: chỉ số, vật phẩm, kỹ năng và chuỗi bí mật nằm trong DataTable/DataAsset (nguồn JSON/CSV có schema). Không hard-code.
- Git + LFS. Nhánh `main` luôn build được. Làm việc trên nhánh `feat/*`, `fix/*`, `research/*`. Commit message tiếng Anh, dạng `area: summary`.
- File nhị phân (`.uasset`, `.umap`, ảnh, âm thanh, model) đi qua LFS (xem `.gitattributes`).

## 5. Asset và license
- Asset, nhạc, font hay plugin chỉ được dùng khi license rõ ràng. Phải ghi vào `docs/ASSET_LICENSE_REGISTER.md` **trước** khi commit.
- Asset do AI tạo sinh chỉ dùng làm placeholder, gắn tag `PLACEHOLDER_AI` và không được phát hành.
- Học **nguyên lý** từ các game AAA (God of War, Black Myth: Wukong...). Không sao chép cốt truyện, thiết kế, nhân vật, asset hay UI.

## 6. Quy trình giai đoạn
- Mỗi giai đoạn có tiêu chí nghiệm thu đo được (`docs/PLAN.md`).
- Hết giai đoạn thì nộp báo cáo vào `reports/PHASE_<n>_REPORT.md` theo mẫu: Đã làm / Chưa làm / Bằng chứng / Rủi ro / Bước tiếp. Sau đó **DỪNG** chờ duyệt.
- Mỗi quyết định lớn được ghi vào `docs/DECISION_LOG.md`. Mỗi rủi ro mới được ghi vào `docs/RISK_REGISTER.md`.
- Chỉ hỏi Product Owner khi gặp quyết định lớn. Mỗi lần gom tối đa 5 câu, kèm đề xuất mặc định.

## 7. Lệnh hữu ích
```
python3 tools/research_tool.py lint      # kiểm tra nhãn, nguồn, luật in_game
python3 tools/research_tool.py render    # sinh research/generated/*.md từ JSON
python3 -m unittest discover -s tests    # chạy test
```
