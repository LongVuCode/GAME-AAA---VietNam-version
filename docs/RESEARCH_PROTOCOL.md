# Quy trình nghiên cứu và xác minh (Research Protocol)

Phiên bản 0.1. Người phụ trách: Lead Narrative/Historian (AI) cùng Cố vấn sử học (người thật, **chưa tuyển**).

## 1. Mục tiêu
Mọi chi tiết lịch sử hoặc văn hóa xuất hiện trong game phải truy được về nguồn, có nhãn độ tin cậy và đã qua người thật thẩm định trước khi phát hành.

## 2. Nhãn nội dung
| Nhãn | Ý nghĩa | Được vào game? |
|---|---|---|
| `[SỬ LIỆU]` | Sự kiện hoặc nhân vật có ≥2 nguồn thuộc ≥2 dòng nguồn độc lập và không có tranh luận lớn về nội dung cốt lõi | Có (khi đạt mức A) |
| `[SỬ LIỆU-TRANH LUẬN]` | Có thật nhưng niên đại, chi tiết hoặc cách diễn giải còn tranh luận. Game thể hiện phần đồng thuận, Codex nêu các quan điểm | Có (khi đạt mức A, có ghi chú Codex) |
| `[HUYỀN THOẠI]` | Truyền thuyết hoặc thần thoại có văn bản ghi chép (Lĩnh Nam chích quái, Việt điện u linh...) hoặc gắn với tín ngưỡng | Có, gắn nhãn huyền thoại trong Codex |
| `[CỔ TÍCH]` | Truyện cổ tích dân gian | Có |
| `[SÁNG TẠO]` | Phần hư cấu của đội phát triển | Có, Codex ghi rõ là hư cấu |
| `[CHƯA XÁC MINH]` | Chưa tìm được nguồn đủ tin cậy | **Không** |

## 3. Dòng nguồn (lineage)
Hai nguồn chỉ được tính là "độc lập" khi thuộc hai dòng khác nhau:
- `VN_ANNALS`: chính sử Việt (Đại Việt sử lược, Toàn thư, Cương mục, Đại Nam thực lục...). Lưu ý các bộ này kế thừa nhau.
- `CN_ANNALS`: chính sử Trung Hoa (Sử ký, Hậu Hán thư, Tống sử, Nguyên sử, Minh thực lục...). Đây là nguồn từ phía đối phương nên phải đọc có phê phán.
- `PRIMARY_DOC`: văn bản đương thời (Chiếu dời đô, Hịch tướng sĩ, Bình Ngô đại cáo, văn bia).
- `ARCHAEOLOGY`: khảo cổ học, hiện vật bảo tàng.
- `INSTITUTIONAL`: hồ sơ của UNESCO hoặc cơ quan di sản (dùng cho lễ hội, tín ngưỡng, di sản).
- `MODERN_SCHOLARSHIP`: công trình sử học hiện đại. Đây là phân tích chứ không phải bằng chứng gốc độc lập, nên **không** được ghép với chính dòng nguồn mà nó dựa vào để đủ điều kiện `[SỬ LIỆU]`.
- `FOLK_COMPILATION`: tuyển tập dân gian có hệ thống.
- `LITERARY`: tác phẩm văn học hoặc tiểu thuyết lịch sử (Truyền kỳ mạn lục, Hoàng Lê nhất thống chí). Không dùng làm bằng chứng lịch sử.

## 4. Mức xác minh
- **C**: mới là ghi nhận ban đầu.
- **B**: nội dung khớp với hiểu biết đã có về các nguồn đã nêu, nhưng **chưa đối chiếu bản dịch hoặc bản gốc theo số trang**. *Toàn bộ dữ liệu Giai đoạn 0 đang ở mức B hoặc C.*
- **A**: đã đối chiếu bản dịch chuẩn (ghi rõ NXB, năm, tập, trang) **và** được cố vấn sử học (người thật) ký duyệt.
- Luật: `game_use = in_game` đòi hỏi mức A. Luật này được lint kiểm tra tự động.

## 5. Bản dịch chuẩn đề xuất để đối chiếu (cần mua hoặc truy cập ở Giai đoạn 1)
- Đại Việt sử ký toàn thư: bản dịch của Viện Khoa học Xã hội Việt Nam (Viện Sử học), NXB Khoa học Xã hội. *Cần xác nhận lần tái bản sẽ dùng.*
- Khâm định Việt sử thông giám cương mục: bản dịch của Viện Sử học, NXB Giáo dục. *Cần xác nhận.*
- Lĩnh Nam chích quái: có nhiều bản dịch, cần chọn một bản dịch chuẩn và ghi rõ dị bản (bản Vũ Quỳnh/Kiều Phú...).
- Kho tàng truyện cổ tích Việt Nam: Nguyễn Đổng Chi.
- Lịch sử Việt Nam (bộ 15 tập), Viện Sử học, NXB Khoa học Xã hội, 2017.
> Các thông tin xuất bản trên được ghi từ hiểu biết sẵn có, **chưa kiểm tra thư mục thư viện**. Cần xác nhận trước khi trích dẫn.

## 6. Dị bản → "Canon của game"
Với truyền thuyết có nhiều dị bản, cần ghi đủ các dị bản, chọn một bản canon và nêu lý do theo thứ tự ưu tiên:
1. Văn bản cổ nhất hoặc phổ biến nhất.
2. Tôn trọng tín ngưỡng địa phương.
3. Phù hợp gameplay.

Các dị bản còn lại được đưa vào Codex.

## 7. Độ nhạy cảm
- `low`: không có vấn đề.
- `med`: cần cách thể hiện cẩn trọng.
- `high`: cần cố vấn chuyên môn hoặc cộng đồng duyệt, hạn chế thể hiện trực tiếp.
- `exclude`: không đưa vào game.

Danh sách loại trừ mặc định:
- Các cuộc nội chiến (Trịnh-Nguyễn, Lê-Mạc).
- Xung đột với Chăm Pa và Khmer (Nam tiến).
- Tranh luận chính thống về Triệu Đà/Nam Việt.
- Giai đoạn từ 1858.
- Các mê tín gắn kỳ thị với một dân tộc cụ thể (ví dụ: "ma lai", "ma cà rồng" vùng cao).

## 8. Quy trình đưa một mục vào game
1. Tạo mục trong `research/data/*.json` (mức C).
2. Gắn nguồn và dòng nguồn, chạy `lint` (mức B).
3. Đối chiếu bản dịch, ghi số trang vào `citations`.
4. Cố vấn sử học duyệt, ghi `reviewed_by` (mức A).
5. Đặt `game_use=in_game`. Mục Codex được sinh từ dữ liệu này.

## 9. Codex trong game
Mỗi mục Codex hiển thị:
- Biểu tượng nhãn (màu và hình, không chỉ dựa vào màu, để hỗ trợ người mù màu).
- Tóm tắt.
- "Theo sử liệu..." / "Theo truyền thuyết..." / "Phần hư cấu của game...".
- Danh sách nguồn.
- Các dị bản (nếu có).

Dữ liệu Codex được sinh trực tiếp từ JSON nghiên cứu, nên chỉ có một nguồn sự thật.
