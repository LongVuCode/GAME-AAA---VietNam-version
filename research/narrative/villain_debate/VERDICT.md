# Phán quyết tranh luận PHẢN DIỆN cho Game 1

Người điều phối: phiên chính · Ngày: 2026-11-03 · Trạng thái: **ĐỀ XUẤT, chờ PO chốt**

## 1. Diễn biến
| Bước | Nội dung | File |
|---|---|---|
| Bối cảnh | Phản diện xuyên suốt thất bại 3 lần: thủy quái (v1, v2) và cây yêu (v3), vì luôn bị đọc thành phe của thần được thờ | `../protagonist/REVIEW_V2.md`, `REVIEW_V3.md` |
| Nghiên cứu | Học nguyên lý boss và phản diện từ Elden Ring: phản diện là hệ quả của lỗi do người gây ra; đánh để giải thoát | `../../design/ELDEN_RING_BOSS_VILLAIN_PRINCIPLES.md` |
| Vòng 1–2 | Bốn khung: K0 (không có phản diện), K1 (Khoen Thuần), K2 (Phường Lột), K4 (K1 + K2). Cả bốn hội tụ về ý "cạy để giải thoát" của K1 | `R1_*.md`, `R2_*.md` |
| Vòng 3 | Ba giám khảo độc lập chấm điểm | `R3_JUDGE_*.md` |

## 2. Điểm của giám khảo
| Ứng viên | Văn hóa (/15) | Người chơi (/20) | Khả thi (/20) | Lựa chọn của giám khảo |
|---|---|---|---|---|
| **K1+ "người lặp lỗi"** | 11, lên 12 nếu sửa | 15 | 14 | **Văn hóa chọn**; Người chơi lấy làm phương án lùi; Khả thi lấy làm bản nâng cấp có cổng |
| K1-nhẹ | 11 | 12 | **18** | Khả thi chọn làm mặc định |
| K4 gọn | 8 | **16** | 11 | Người chơi chọn; Văn hóa và Khả thi đều loại |
| K2 cuối | 8 | 13 | 11 | Không ai chọn |
| K0 | **13** | 9 | 17 | Văn hóa và Khả thi lấy làm phương án lùi cuối cùng |

**Kết luận của người điều phối:** **K1+ là ứng viên duy nhất cả ba giám khảo đều chấp nhận.** K4 bị hai trên ba giám khảo loại, vì đánh người vừa tốn kém, vừa có lớp "phường" gợi chuyện buôn động vật hoang dã sang phương Bắc.

## 3. Phương án đề xuất: "K1+ đã sửa", xây trên nền K1-nhẹ
- **Nguồn ác [SÁNG TẠO]:**
  - Thời Sào, một người bến đúc vụng một bộ khoen đồng để bắt thú nghe lời.
  - Khoen vỡ, các mảnh cắm vào thú qua nhiều đời và khiến chúng hóa dữ.
  - Đời cuối, một người cùng bến **vớt chiếc chốt khoen gốc từ vực sông** (không đào mộ) để thuần lại con thú đầu tiên, tức là lặp lại lỗi của người xưa.
- **Boss:** mỗi chương có một boss thú bị mảnh khoen hành hạ.
  - Pha 1: con thú đe dọa người chơi. Pha 2: lộ ra nỗi đau của nó.
  - Khoen nứt dần mỗi lần phá Thế của thú.
  - Đòn kết là **cạy bằng sào**, ba nhịp theo trống, có hit-stop, rồi một khoảng lặng.
- **Đa dạng:** không phải trận nào cũng là giải thoát. Ví dụ tướng yêu ở chương Phù Đổng vẫn rã thành tro.
- **Bảo khí:** chỉ làm từ phần thú tự rụng ra khi được cạy. Mảnh khoen **không bao giờ** cho người chơi thêm sức mạnh, và không có giao diện đếm mảnh.
- **Kết:** giải thoát con thú đầu tiên. Người lặp lỗi bị dân làng giữ lại, không có trận đánh người. Chốt khoen được nấu chảy thành nông cụ ở lò làng.

### Điều kiện bắt buộc
| # | Điều kiện | Nguồn |
|---|---|---|
| V1 | Không đào mộ, không đập "khuôn đá hai mang" (đây là loại hiện vật khảo cổ thật) | Văn hóa |
| V2 | Chương Phù Đổng không có mảnh khoen. Khoen không phải cọc đóng xuống đất, không khắc chữ, không gọi là "trấn", "yểm" hay "ách" (tránh mô-típ trấn yểm, vốn gắn với chuyện quan phương Bắc trong dân gian) | Văn hóa |
| V3 | Boss Ba Vì khổ vì mảnh khoen, không vì lũ của Thủy Tinh | Văn hóa |
| V4 | Mảnh không cắm trên Hồ Tinh hay Ngư Tinh. Người làm khoen là một lái đò đúc vụng, còn thợ đúc của làng là người nấu chảy mảnh, để nghề đúc không bị bôi xấu | K1, Văn hóa |
| V5 | Spike 1 (GĐ2): thao tác cạy trên 2 rig (Cáo Đầu Bầy, Rết Lớn); không xuyên mesh ở 3 góc camera; khoen bám đúng socket; giờ công mỗi rig ≤ 1,5 × một đòn hành quyết thường (hệ số là giả định). Trượt thì đổi rig; trượt cả hai thì về K0 | Khả thi |
| V6 | Spike 2: các boss bốn chân (Cáo, Gấu hoặc Lợn Lòi, thú đầu tiên) dùng chung một họ skeleton | Khả thi |
| V7 | Phần "người lặp lỗi" và cảnh kết (bản K1+) chỉ làm sau khi đã có giờ công thật của chương 1 và graybox hub. Trượt thì ship bản K1-nhẹ, vì đó là tập con nên không phải làm lại | Khả thi |
| V8 | Phép thử sau chương 1: ≥ 2/3 người chơi tóm được nguồn ác trong một câu. Câu hỏi bác bỏ: "có gợi phe của vị thần nào không?" | Người chơi, K1 |
| V9 | Mảnh khoen là dữ liệu tắt được, có test chống softlock. Cố vấn (C2) xác nhận khoen không bôi xấu nghề đúc | Khả thi, Văn hóa |

**Lùi:** trượt điều kiện hoặc bị tham vấn bác thì về **K0** (đã sửa boss Ba Vì), không sang K4 hay K2.

## 4. Cần PO quyết
1. Chốt **K1+ đã sửa** (nền K1-nhẹ, lùi về K0)?
2. **Sửa VERDICT §3** của tranh luận cấu trúc: đổi "phản diện xuyên suốt bị người chơi hạ ở chương cuối" thành "nguồn ác xuyên suốt được hóa giải ở chương cuối; không có trận đánh người trong Game 1".
3. Bất đồng còn mở: giám khảo Người chơi muốn có trùm người (K4) cho trailer. Đề xuất: **không đưa vào Game 1**, để dành cho phần sau nếu tham vấn và spike đều cho phép.
