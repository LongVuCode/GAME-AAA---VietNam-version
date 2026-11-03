# Báo cáo Giai đoạn 0B: Đội agent, cấu trúc cốt truyện, nhân vật, phản diện, tên game
Ngày: 2026-11-03 · Nhánh: `feat/agent-team-and-story-research` · Trạng thái: **DỪNG chờ duyệt**

## 1. Đã làm
| Hạng mục | Kết quả | File |
|---|---|---|
| Đội agent | 7 vai, mỗi sản phẩm do một agent khác review | `.claude/agents/`, `docs/AGENT_TEAM.md` |
| Ghi nhận quyết định PO | Máy RTX 5050, solo dev, bán thương mại, chiến lược demo và playtest | `docs/DECISION_LOG.md` (D-009 → D-017), `docs/PLAN.md`, `docs/COMMERCIAL_RELEASE.md` |
| Cấu trúc cốt truyện | Nghiên cứu, phản biện, tranh luận 3 vòng, 3 giám khảo. **Đã chốt phương án H** | `research/narrative/debate/` |
| Dữ liệu tín ngưỡng | 30/30 truyện có cờ `worshipped` và `player_can_wield`; lint chặn tự động việc trao vật của thần được thờ cho người chơi | `research/data/`, `tools/research_tool.py` |
| Hồ sơ chuyên gia | Hồ sơ cho 4 chương, đã qua phản biện và sửa 19 lỗi | `research/expert/` |
| Nhân vật chính | Dòng họ nhà Vảy, qua 3 phiên bản và 3 lượt phản biện | `research/narrative/protagonist/` |
| Phản diện | Học nguyên lý từ Elden Ring, tranh luận 3 vòng. **Đã chốt Khoen Thuần (K1+)** | `research/design/`, `research/narrative/villain_debate/` |
| Story Bible v1 và đề xuất vertical slice | Bản hợp nhất; phản biện kết luận **KHÔNG ĐẠT** (1 lỗi Chặn) | `research/narrative/STORY_BIBLE_V1.md`, `REVIEW_STORY_BIBLE_V1.md` |
| Tên game | 15 ứng viên; phản biện kết luận **ĐẠT CÓ ĐIỀU KIỆN** | `research/narrative/NAMING_STUDY.md` |

## 2. Bằng chứng
- `python3 tools/research_tool.py lint`: 0 lỗi, 7 cảnh báo (các mục mới có một dòng nguồn, chờ bổ sung).
- `python3 -m unittest discover -s tests`: 14/14 đạt.
- Toàn bộ biên bản tranh luận, phản biện và phán quyết đã nằm trên GitHub.

## 3. Chưa làm / giới hạn trung thực
- **Mọi nội dung vẫn ở mức xác minh B hoặc C.** Các agent chỉ đọc được trích đoạn tìm kiếm, không đọc được toàn văn, vì mạng chặn `vi.wikipedia.org` và `vi.wikisource.org`. Chưa có người thật thẩm định (R-12).
- **Chưa tra nhãn hiệu chính thức cho tên game.**
- **Chưa có code Unreal, chưa có spike nào chạy.** Mọi con số chi phí và hiệu năng đều là giả định.
- **Story Bible v1 chưa đạt.** Cần một lượt sửa sau khi anh/chị quyết §5.

## 4. Rủi ro nổi bật
- Khoen có thể bị đọc thành bùa trấn yểm (SB-03).
- Thao tác cạy chưa được kiểm chứng kỹ thuật.
- Tên game giống người đi trước, hoặc chưa đăng ký được nhãn hiệu.
- Thay cố vấn người thật bằng AI (R-12).

## 5. Cần PO quyết (gom từ phản biện Story Bible; kèm mặc định của người điều phối)
| # | Câu hỏi | Mặc định đề xuất |
|---|---|---|
| Q1 | **Vị trí hub:** hiện hub là một cell trên map chương 1, nhìn ra vùng Hồ Tây. Vùng này gần đền thờ Linh Lang, một vị thần gốc giao long. | Hub thành **level riêng dựng từ cùng bộ asset**, ở một khúc sông hư cấu xa Hồ Tây. Đổi quái "giao long" của chương 1 sang loài khác |
| Q2 | **"Trận đánh người" gồm những gì?** Có tính cả người bị mê khống chế và yêu ma hình người (Giáp Xương) không? | **Cấm** đánh người thật, kể cả người bị mê (chỉ cho cạy hoặc đánh ngất bằng cơ chế không gây chết). Yêu ma hình người **được phép**, nhưng không mặc trang phục của bất kỳ phe lịch sử nào |
| Q3 | **Trận cuối (`ch_ben`) khi phải cắt về phạm vi sàn 2 chương** | Bỏ `ch_ben` khỏi bản sàn. Bản sàn kết thúc ở chương Phù Đổng, không có gấu và không nấu khoen trong chương đó (tuân V2) |
| Q4 | **Khoen lấy phép từ đâu?** | Khoen **không có phép**: con thú hóa dữ vì đau và vì bị trói buộc, không vì bùa. Mảnh khoen được người mang đi (buôn, bẫy), không trôi theo sông |
| Q5 | **Tên game** | Chốt **"Người Giữ Bến"**, tên tiếng Anh *The Ferrykeepers*. Phụ đề để sau (tránh "Khoen Vỡ" vì giọng Nam nghe thành "khoen dở"). Thuê luật sư tra nhãn hiệu trước khi mở trang Steam |

Thêm:
- **Mở mạng:** thêm `vi.wikipedia.org` và `vi.wikisource.org` vào Allowed domains của môi trường, để các agent đọc được toàn văn Lĩnh Nam chích quái.
- **Gộp nhánh:** mở pull request gộp nhánh này vào `main`? *Mặc định: có, sau khi anh/chị duyệt báo cáo này.*

## 6. Bước tiếp (sau khi PO trả lời)
1. Agent cốt truyện sửa Story Bible thành v1.1 theo §5, rồi qua phản biện.
2. Chốt vertical slice là chương Long Biên. Bổ sung một spike riêng cho Rết và Gấu, vì slice không chứng minh được V5 và V6 (SB-04).
3. Bắt đầu **Giai đoạn 1** (`docs/PLAN.md`): pin phiên bản Unreal, dựng khung dự án, `ArpgCore` kèm test, và hướng dẫn build trên máy RTX 5050.
