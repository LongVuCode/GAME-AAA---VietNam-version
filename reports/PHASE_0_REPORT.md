# Báo cáo Giai đoạn 0: Tiền sản xuất, nền tảng và nghiên cứu đợt 1
Ngày: 2026-11-03 · Trạng thái: **DỪNG chờ duyệt**

## 1. Tóm tắt yêu cầu (theo cách tôi hiểu)
1. Action RPG góc nhìn thứ ba, chất lượng nhắm tới AAA, chạy trên Windows 10/11 64-bit, phục vụ giải trí.
2. Nội dung chỉ lấy từ thần thoại, truyền thuyết, cổ tích và lịch sử Việt Nam (tới hết thời phong kiến; cận - hiện đại nằm ngoài phạm vi).
3. Độ chính xác là ưu tiên số một: mỗi sự kiện cần ≥2 nguồn độc lập, có gắn nhãn, nội dung chưa xác minh không vào game, và có Codex phân biệt sử, truyền thuyết, hư cấu.
4. Cốt truyện tuyến tính theo chương, khu bán mở, boss nhiều pha.
5. Combat có chiều sâu (đòn nhẹ/nặng, né, parry, tư thế, combo, phép thần thoại) và game feel tốt.
6. Trang bị đúng thời kỳ, có độ hiếm, nâng cấp, chế tác, set và cây kỹ năng.
7. Có sự kiện động, nhưng lựa chọn không được viết lại lịch sử.
8. Có chuỗi bí mật dựa trên văn hóa thật để lấy thần khí, kèm chống softlock, có gợi ý và không phá cân bằng.
9. Đồ họa UE5 có preset từ Thấp tới Cực cao, hỗ trợ DLSS/FSR/XeSS/TSR, mọi chỉ tiêu hiệu năng phải đo thật.
10. Làm vertical slice trước, chia giai đoạn có nghiệm thu, code sạch, data-driven, có test, dùng Git LFS và chỉ dùng asset có license.

**Điểm mơ hồ và rủi ro:**
- (a) Chưa rõ ngân sách, nhân sự, có bán thương mại hay không.
- (b) **Tôi không build hay benchmark được UE5** trong môi trường hiện tại (container Linux, không GPU, không có UE Editor). Cần máy Windows của anh/chị.
- (c) "≥2 nguồn độc lập" khó đạt với thời Bắc thuộc sớm và Tây Sơn, vì nhiều sự kiện chỉ có chính sử Việt, mà các bộ này lại kế thừa nhau.
- (d) Tôi **chưa đối chiếu bản gốc hay bản dịch theo số trang**. Toàn bộ nghiên cứu đợt này ở mức B/C (xem §3).
- (e) "AAA" với đội nhỏ là bất khả thi về nội dung; khả thi là một chương ở chất lượng đích.

## 2. Đã làm
| Hạng mục | File |
|---|---|
| Luật làm việc | `CLAUDE.md` |
| Kế hoạch, roadmap, tiêu chí nghiệm thu, danh sách phần cần người thật | `docs/PLAN.md` |
| GDD v0.1 (combat, trang bị, sự kiện, chuỗi thần khí, chống softlock, trợ năng, vertical slice) | `docs/GDD.md` |
| Tech spec (chọn engine, ma trận plugin, kiến trúc, settings, benchmark, PSO) | `docs/TECH_SPEC.md` |
| Quy trình nghiên cứu (nhãn, dòng nguồn, mức xác minh A/B/C, dị bản, độ nhạy cảm) | `docs/RESEARCH_PROTOCOL.md` |
| Decision log (8 quyết định), risk register (11 rủi ro), asset/license register | `docs/` |
| Danh mục 34 nguồn có phân dòng | `research/data/sources.json` |
| Dòng thời gian 31 mốc (Hồng Bàng tới 1858) | `research/data/timeline.json` → `research/generated/TIMELINE.md` |
| Danh mục 30 truyện, có dị bản và canon | `research/data/myths.json` → `research/generated/MYTH_CATALOG.md` |
| Chấm điểm 11 ứng viên cốt truyện, đề xuất xương sống 9 chương | `research/STORY_SHORTLIST.md` |
| Tên game và phương án nhân vật chính | `docs/NAMING_AND_PROTAGONIST.md` |
| Công cụ lint/render dữ liệu nghiên cứu, kèm 10 unit test | `tools/research_tool.py`, `tests/test_research.py` |
| Repo Git, LFS (`.gitattributes` cho uasset, umap, ảnh, âm thanh) | |

## 3. Bằng chứng
```
$ python3 tools/research_tool.py lint
lint: 0 error(s), 7 warning(s)
$ python3 -m unittest discover -s tests
Ran 10 tests ... OK
```
7 cảnh báo là **cố ý**: chúng đánh dấu các mục mới chỉ có một dòng nguồn (T002, T009, T017, T019, T029, T031, M016) và cần bổ sung nguồn khác dòng ở GĐ1.

**Về độ tin cậy, nói thẳng:**
- Mọi mục đang ở mức **B** (khớp với hiểu biết về nội dung của nguồn, chưa đối chiếu số trang) hoặc **C**.
- `consulted=false` cho toàn bộ 34 nguồn.
- Chưa có mục nào được phép vào game (test `test_nothing_is_in_game_yet` kiểm tra điều này).
- Một số chi tiết tôi đã chủ động ghi "cần đối chiếu", ví dụ: năm phát hiện kho mũi tên Cổ Loa, năm hội nghị Diên Hồng, tên các truyện trong Lĩnh Nam chích quái theo từng dị bản, văn bản sớm nhất của truyền thuyết trả gươm.

## 4. Kết quả chính
- **Shortlist** (điểm /100): Hồng Bàng – tam yêu 93 · Gióng / Sơn Tinh 91 · Lam Sơn 88 · cổ tích (nội dung phụ) 88 · Cổ Loa 86 · Trần – Nguyên 85.
- **Xương sống đề xuất**: 9 chương, từ Hồ Tinh tới cảnh trả gươm (1428).
- **Nhân vật chính khuyến nghị**: P1, "Đồng" [SÁNG TẠO], người lập lời thề với thần Đồng Cổ và thức dậy qua các thời đại. Nhân vật này không bao giờ giành công của nhân vật sử hay thần thánh.
- **Tên khuyến nghị**: **HỒN TRỐNG — Lời Thề Đồng Cổ**.
- **Vertical slice**: Chương 1 "Đầm Xác Cáo", boss Hồ Tinh 3 pha.

## 5. Chưa làm
- Chưa đối chiếu bản dịch theo số trang; chưa có cố vấn sử học.
- Chưa pin phiên bản UE. Chưa xác nhận plugin DLSS/FSR/XeSS cho 5.7.
- Chưa tạo project UE và chưa có code C++. Đây là việc của GĐ1, và cần máy Windows.
- Chưa tra cứu nhãn hiệu tên game.
- Chưa nghiên cứu sâu vũ khí và trang phục từng thời kỳ (mới có Văn Lang ở mức sơ bộ).

## 6. Rủi ro nổi bật
R-01 (sai sử), R-02 (tín ngưỡng), R-04 (phạm vi), R-05 (AI không build được UE). Xem `docs/RISK_REGISTER.md`.

## 7. Bước tiếp (GĐ1, sau khi được duyệt)
1. Pin phiên bản UE theo ma trận plugin.
2. Tạo project UE và các module `ArpgCore` / `HonTrong` / `HonTrongEditor`, cùng CI.
3. Viết `ArpgCore` (posture, damage, parry window) kèm GoogleTest.
4. Đối chiếu số trang cho mọi mục của Chương 1.
5. Art bible Văn Lang.
6. Tra cứu nhãn hiệu.

## 8. Câu hỏi cần anh/chị quyết (kèm mặc định của tôi)
1. **Phần cứng và nhân lực**: Anh/chị có máy Windows (GPU RTX hoặc tương đương, cài UE5) để build và benchmark không? Có đội hoặc ngân sách thuê người không? *Mặc định: tôi viết code, dữ liệu và test; anh/chị build và chạy benchmark rồi gửi log/CSV lại.*
2. **Phạm vi Game 1**: Từ Hồng Bàng tới 1428, với Hai Bà Trưng và Tây Sơn để làm DLC? *Mặc định: đồng ý như vậy.*
3. **Nhân vật chính và tên**: Duyệt P1 "Đồng" và tên "HỒN TRỐNG"? Nhân vật nam hay nữ? *Mặc định: duyệt cả hai, nhân vật nam (có thể đổi mà không ảnh hưởng hệ thống).*
4. **Vertical slice**: Chương 1 Hồ Tinh (an toàn, thuần huyền thoại) hay một chương lịch sử như Bạch Đằng 1288 (gây ấn tượng hơn nhưng rủi ro hơn)? *Mặc định: Chương 1 Hồ Tinh.*
5. **Mục đích phát hành**: Phi thương mại/cá nhân hay bán thương mại (ảnh hưởng tới EULA, license asset, pháp lý)? *Mặc định: đang chuẩn bị theo hướng thương mại để không phải làm lại.*

Nguồn đã tra cứu trên web cho phần kỹ thuật:
- [Unreal Engine 5.7 Released (Epic forum)](https://forums.unrealengine.com/t/unreal-engine-5-7-released/2673913)
- [UE 5.7 release notes](https://dev.epicgames.com/documentation/unreal-engine/unreal-engine-5-7-release-notes)
- [KitGuru: UE 5.6 gets DLSS 4 plugin](https://www.kitguru.net/gaming/joao-silva/unreal-engine-5-6-gets-dlss-4-plugin/)
- [Neowin: DLSS 4 plugin for UE5](https://www.neowin.net/amp/nvidia-releases-dlss-4-plugin-for-unreal-engine-5-offering-multi-frame-generation-and-more/)
