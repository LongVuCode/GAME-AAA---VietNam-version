# Phán quyết tranh luận cấu trúc cốt truyện (D-012)

Người điều phối: phiên chính · Ngày: 2026-11-03 · Trạng thái: **ĐỀ XUẤT, chờ Product Owner chốt**

## 1. Diễn biến
| Vòng | Nội dung | File |
|---|---|---|
| Nghiên cứu | Báo cáo gốc khuyến nghị D (92đ); phản biện chấm lại D ≈ B, kết luận ĐẠT CÓ ĐIỀU KIỆN | `../STORY_STRUCTURE_STUDY.md`, `../STORY_STRUCTURE_REVIEW.md` |
| 1: Mở đầu | Ba bên biện hộ D (Khung Quyển), B (Tách riêng), A-gọn (Kết hợp thu gọn) | `R1_D.md`, `R1_B.md`, `R1_A.md` |
| 2: Phản bác | Cả 3 bên tự hội tụ về phương án lai **H**; bên A-gọn rút đề xuất cho Game 1 | `R2_*.md` |
| 3: Giám khảo | 3 giám khảo độc lập chấm điểm, cả 3 đều chọn H có điều kiện | `R3_JUDGE_*.md` |

## 2. Điểm của giám khảo (mỗi giám khảo dùng thang riêng)
| Ứng viên | Sử học – Văn hóa (/15) | Người chơi – Thị trường (/20) | Khả thi (/20) |
|---|---|---|---|
| **H (lai)** | 10, lên 11 khi chốt F-01 | **13** | 13, lên **16** khi sắp lại thứ tự chương |
| B thuần | 10 | 12 | 10 |
| D thuần (đã sửa) | **11** | 12 | 12 |
| A-gọn | 7 | 11 | 15 (nhưng phụ thuộc cố vấn chưa có) |

Cả ba giám khảo cùng chọn **H**. Hai giám khảo cảnh báo có hiện tượng **đồng thuận dễ dãi (groupthink)**. Các điều kiện ở §4 là phần bù cho những gì vòng 2 đã bỏ qua.

## 3. Phương án H (bản tổng hợp)
- **Bên ngoài (theo B):** Game 1 là sản phẩm độc lập. Trang Steam chỉ giới thiệu là "action RPG thần thoại Việt", không hứa phần tiếp theo.
- **Bên trong (theo D):** dữ liệu có sẵn `reality_mode`, `worshipped`, `earliest_text_century`. Phần lịch sử tương lai phải qua cổng nội bộ và mở màn ở Dạ Trạch, chỉ khi T009 có dòng nguồn thứ hai và Game 1 đã ra mắt.
- **Nội dung Game 1:** 4 chương chế độ `MYTH`:
  1. Long Biên / Hồ Tinh
  2. Phù Đổng / Gióng
  3. Ba Vì / Sơn Tinh – Thủy Tinh
  4. Đông Hải / Ngư Tinh (tên chương đổi theo D-016)

  Đây là **thứ tự sản xuất 1 → 3 → 4 → 2** theo đánh số chương cũ (Giám khảo Khả thi). Phạm vi tối thiểu gồm Long Biên, Phù Đổng và Ba Vì; khi trễ nặng thì chỉ còn Long Biên và Phù Đổng. Chương biển là chương cuối hoặc thành DLC; không có combat bơi.
- **Quyền lực của người chơi (Giám khảo Người chơi):**
  - Không có thần khí của thần được thờ trong túi đồ. Thay vào đó là **"Bảo khí" [SÁNG TẠO]**, rèn từ chiến lợi phẩm của boss người chơi tự hạ.
  - **"Ân phù"** của thần chỉ có hiệu lực trong set-piece.
  - Hình xăm thủy quái (M028) là nhánh kỹ năng.
- **Boss:**
  - Chương nào cũng có ít nhất 1 boss [SÁNG TẠO] mà người chơi tự thắng trọn.
  - Có một phản diện xuyên suốt [SÁNG TẠO], ví dụ Thuồng luồng chúa (gốc M028), bị người chơi hạ ở chương cuối.
  - Boss huyền thoại (Hồ Tinh, Ngư Tinh) theo mô hình "người chơi phá Thế, thần kết liễu". Mô hình này phải qua playtest với câu hỏi bác bỏ: "có thấy bị cướp công không?".

## 4. Điều kiện bắt buộc (tổng hợp, chưa đạt thì H vẫn ở trạng thái KHÔNG ĐẠT)
| # | Điều kiện | Nguồn |
|---|---|---|
| C1 | Sửa dữ liệu trước khi thiết kế chương: thêm `worshipped` (mặc định `true`) kèm luật lint; sửa trường `gameplay` của M001, M005, M007, M015 (bỏ việc trao thần khí cho người chơi); nâng M015 lên độ nhạy cảm `high` | Văn hóa |
| C2 | Tuyển cố vấn sử học và tham vấn các nơi thờ (Đền Hùng, Phù Đổng/Sóc Sơn, Ba Vì) là điều kiện của **chính Game 1**, phải xong trước khi mở trang Steam và làm trailer | Văn hóa |
| C3 | "Giặc Ân" chỉ xuất hiện trong Codex; kẻ thù của chương Ba Vì không là sinh vật nước (để Thủy Tinh không thành ác nhân); Hùng Vương và Lạc Long Quân không có thoại tự do | Văn hóa |
| C4 | Spike nước dâng trước GĐ4: hang 3 mức nước, boss cùng 4 địch, preset Cao 1080p trên RTX 5050, VRAM đỉnh ≤ 7 GB, không hitch > 50 ms. Trượt thì nước dâng chỉ diễn ra trong cutscene | Khả thi |
| C5 | Đo giờ công thật của chương 1 trước khi mở chương tiếp theo. Chương biển chỉ vào sản xuất khi spike thuyền đạt cổng hiệu năng và game feel ≥ 4/5 | Khả thi |
| C6 | Trailer và ảnh bìa bán quái vật và trận boss; playtest vertical slice có câu hỏi bác bỏ về "cướp công" | Người chơi |

## 5. Bất đồng còn mở: phải do PO quyết
**Nhân vật chính: một người xuyên suốt hay mỗi chương một người?**
- Giám khảo Người chơi: muốn **một nhân vật xuyên suốt** để tiến trình không bị reset. Đề xuất Codex ghi "thời gian huyền thoại không tuyến tính".
- Giám khảo Văn hóa: muốn **dòng họ, mỗi chương một người**, và bác "phi niên đại" vì chính truyền thuyết ghi rõ Gióng thuộc đời Hùng Vương thứ 6, còn Sơn Tinh – Thủy Tinh thuộc đời thứ 18 (M005, M006).
- **Đề xuất dung hòa của người điều phối:** dùng dòng họ thợ đúc, mỗi chương một người, nhưng **tiến trình được kế thừa**. Cây kỹ năng là "kỹ nghệ dòng họ", Bảo khí và hình xăm truyền lại cho đời sau, chỉ đổi ngoại hình và giọng nói. Cách này giữ được tính chính xác niên đại mà người chơi không mất tiến trình. Điểm này sẽ được làm rõ khi làm lại phần nhân vật chính.
