# Báo cáo Demo 0.1
Ngày: 2026-11-03 · Nhánh: `feat/demo-0.1` · Trạng thái: **DỪNG chờ duyệt**

**Chơi thử (prototype web, trang riêng tư):** https://claude.ai/artifact/4PetpFm4jRtHe1UQL86ke5 (build `b942f4c`)

## 1. Đã làm
| Hạng mục | Kết quả | Vị trí |
|---|---|---|
| Story Bible v1.2 | Đã qua 2 lượt phản biện, không còn lỗi Chặn | `research/narrative/STORY_BIBLE_V1_2.md` |
| Thiết kế và dữ liệu demo | Tài liệu thiết kế, schema, 8 file dữ liệu vi/en, validator (chặn softlock, chặn quái là người, chặn từ "khoen" ở đời Hùng 6) | `design/`, `tools/design_validate.py` |
| **ArpgCore** (C++20, không phụ thuộc engine) | Combat, Thế, Nhịp trống, khoen/cạy, kế thừa, chế tác, đồ thị bí mật; đọc thẳng dữ liệu thiết kế | `game/Source/ArpgCore/` |
| QA ArpgCore | Kết luận ĐẠT CÓ ĐIỀU KIỆN; 3 lỗi Nghiêm trọng đã sửa, kèm test hồi quy | `reports/qa/QA_ARPGCORE_DEMO01.md` |
| **Track W: prototype web** | Chơi được trọn lát cắt: Cói đánh quái thường, boss Lợn Lòi Đầm 2 pha kết bằng cạy khoen 3 nhịp, chế tác Nanh Đầm, chuỗi bí mật có gợi ý, bàn giao sang Bương, Codex có nhãn, vi/en, độ khó, trợ năng | `prototype/web/` |
| **Track U: khung UE5** | Project `ProjectFerry`: nhân vật, combat, khoen, quái, HUD, script Python dựng level graybox, hướng dẫn build | `game/`, `docs/BUILD_GUIDE_UE.md` |

## 2. Bằng chứng (người điều phối đã tự chạy lại)
| Kiểm tra | Kết quả |
|---|---|
| ArpgCore, g++ 13.3 và clang++ 18.1, `-Wall -Wextra -Wpedantic -Werror` | 0 cảnh báo; CTest **19/19** đạt trên cả hai compiler |
| ArpgCore, độ phủ dòng `Private/` (gcov) | **99,1%** (2291/2312), số do kỹ sư đo; QA đo lại độc lập ra 99,1% ở bản trước khi sửa lỗi |
| ArpgCore, gcc ASan + UBSan | 0 lỗi (QA và kỹ sư đo) |
| Test Python (research và design) | Toàn bộ đạt |
| `tools/design_validate.py` | 0 lỗi, 2 cảnh báo (cơ sở hiện vật T002 mới có 1 dòng nguồn) |
| Prototype web, unit test (`node --test`) | **39/39** |
| Prototype web, smoke test (Playwright, bot chơi trọn từ màn mở đầu tới màn kết) | **31/31**: không lỗi console, không gọi mạng, không thiếu chuỗi, không lộ từ khoen/mảnh/chốt ở đời Bương |
| Ảnh chụp | 17 ảnh; người điều phối đã xem màn mở đầu và màn cạy khoen: hiển thị đúng, chữ có dấu đúng |

## 3. Chưa đạt / giới hạn trung thực
- **Track U chưa được build trong Unreal.** Môi trường AI không có Windows, GPU hay UE. Còn khoảng 10 điểm `VERIFY:` về API (guide §14). Track U chỉ được coi là xong khi có log build từ máy PO.
- **Không có số liệu hiệu năng.** FPS đo trong headless chạy bằng đồ họa phần mềm, không đại diện cho máy thật.
- **Prototype web là graybox:** hình khối cơ bản, âm thanh tổng hợp, chưa có animation thật, chưa lưu tiến trình, chưa đổi phím. Bản tiếng Anh mới là nháp. Một số tham số AI (tốc độ, bán kính) còn tạm, chưa có trong dữ liệu.
- **Mọi nội dung văn hóa vẫn ở mức B.** Chưa có người thật thẩm định; hai bài vè cần một người viết vè thật đọc lại.
- **Còn mở cho designer:** diễn giải #8 (thời lượng né); các trường còn thiếu trong schema (ArpgCore README §5).

## 4. Rủi ro
- Code UE có thể cần sửa ở các điểm `VERIFY:` khi build lần đầu.
- Cảm giác combat chưa được kiểm chứng với người chơi thật.
- Khoen có thể bị đọc thành bùa trấn yểm (đã có luật giảm thiểu, chờ tham vấn).
- R-12: thay cố vấn người thật bằng AI.

## 5. Cần PO
1. **Chơi thử** prototype qua link ở đầu báo cáo, rồi gửi nhận xét: cảm giác combat, nhịp cạy, độ khó, câu chuyện có dễ hiểu không. Màn mở đầu có nút "Phản hồi". Muốn mời người khác test thì chia sẻ qua menu Share của trang; trang đang ở chế độ riêng tư.
2. **Build Track U** theo `docs/BUILD_GUIDE_UE.md` trên máy RTX 5050, rồi gửi lại log build, `UnrealBuildTool\Log.txt` và `game\Saved\Logs\`.
3. **Gộp vào `main`:** mở pull request cho các nhánh `feat/agent-team-and-story-research` và `feat/demo-0.1`? *Mặc định: có.*
4. **Mở mạng** cho `vi.wikipedia.org` và `vi.wikisource.org`, nếu muốn agent đọc được toàn văn nguồn.

## 6. Bước tiếp (sau phản hồi)
- Sửa prototype theo nhận xét playtest.
- Sửa code UE theo log build của PO.
- Chạy spike nước dâng (C4) và spike cạy trên Rết/Gấu (V5, V6).
- Designer chốt các diễn giải còn mở.
- Bắt đầu art bible cho đồ họa đích.
