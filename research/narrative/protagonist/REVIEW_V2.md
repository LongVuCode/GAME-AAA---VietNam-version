# Phản biện LINEAGE_DESIGN_V2 (nhà Vảy bến Lau)

Người duyệt: `historian-verifier` (AI) kiêm kiểm tra nhất quán thiết kế · Ngày: 2026-11-03
Đối tượng: `research/narrative/protagonist/LINEAGE_DESIGN_V2.md`.
Đối chiếu với: `CRITIQUE_PLAYER.md`, `CRITIQUE_FEASIBILITY.md`, `CRITIQUE_CULTURE.md` (đã tính đính chính V-01), `research/expert/GAME1_LORE_DOSSIER.md` (bản sửa 1), `GAME1_LORE_DOSSIER_REVIEW.md`, `research/data/myths.json`, `research/narrative/debate/VERDICT.md`, `R3_JUDGE_CULTURE.md` (J-01…J-06), `STORY_STRUCTURE_STUDY.md` (QT-xx), `docs/GDD.md`.

**Giới hạn.** Không tra nguồn ngoài trong lần duyệt này. Các ý về tượng thờ đền Quán Thánh và thuật ngữ lóng là **hiểu biết sẵn có, chưa tra nguồn**, đánh dấu "cần đối chiếu". Kết luận có giá trị tối đa mức **B**. `python3 tools/research_tool.py lint`: 0 lỗi, 7 cảnh báo cũ (không liên quan V2; V2 không sửa dữ liệu).

---

## 1. Bảng đối chiếu mã: xử lý thật hay chỉ tuyên bố?

| Mã V2 | Trạng thái | Ghi chú |
|---|---|---|
| C-Q1, C-R1, G-02 | Một phần | Có "vua dạy dân", "Lạc dân", nhà chỉ giữ mẫu. **Thiếu** luật nguồn mẫu xăm (hoa văn Đông Sơn; cấm irezumi, sak yant, mẫu dân tộc thiểu số; không vẽ hình Lạc Long Quân). Xem R2-08 |
| C-Q2, V-01 | Đạt | Long Biên → Đông Hải cùng đời, thứ tự tự do |
| C-Q3 | **Hình thức** | Luật mùa cạn không tách được mô-típ Thủy Tinh. Mâu thuẫn động cơ: "chỉ là cái răng" (§2) và "vì đói và vì cái răng" (§4). Xem R2-02, R2-15 |
| C-R7 | **Vi phạm** | Kết luận của CRITIQUE_CULTURE là "không thuồng luồng ở ch.4", nhưng V2 đặt Thuồng luồng chúa ở đầu chương 4. Xem R2-01 |
| C-Q4 | **Hình thức** | Chỉ đổi tên "Thế tổ" thành "Đòn nhà". Cao trào vẫn giữ cấu trúc của V1: đến mốc chuyển pha thì ra đòn của Sào rồi của Đá, kèm vè. Xem R2-05 |
| C-Q5 | Một phần | Đã đổi Lau thành Nứa. Thiếu câu "không vay mẫu xăm mặt của dân tộc cụ thể" |
| C-R2, C-R3, C-R8 | Đạt | |
| C-R5, C-R9 | Đạt | |
| C-R6 | Một phần | Có "không đền thật". Không xử lý việc hub và trận cuối nằm đúng vùng Đầm Xác Cáo/Hồ Tây (R2-04). G-04 (tham vấn đền Quán Thánh) không có trong §8 |
| P-1 | Đạt, nhưng xung đột F-3.2 | Xem R2-11 |
| P-2 | Một phần | Có boss "Cá-rắn đầu đàn". Lỗ hổng gốc ("Sào chơi DLC mang cây kỹ năng cuối game") chỉ được xử lý bằng "đồng bộ cấp", **không** xử lý nhánh Vảy và đòn của Đá/Nứa. Xem R2-10 |
| P-3 | Đạt về P, nhưng bằng cách vi phạm C-R7 | Hai yêu cầu P-3 và C-R7 thực sự xung đột. V2 tự phân xử, không trình PO (CLAUDE.md §6) |
| P-4, P-5, P-7, P-8 | Đạt | |
| P-6, V-19 | **Hình thức** | Từ "chế tác" chỉ có trong bảng §6, nội dung không có. Bốn Bảo khí chỉ có số thứ tự, không có tên, công dụng hay vật liệu. Phạm vi tối thiểu chỉ có 3 món. Xem R2-12 |
| F-1 | Một phần | Có mask UV. **Thiếu** lồng tiếng 3 nhân vật × vi/en và tiếng gồng nam/nữ; cổng §7 chỉ kiểm tra bộ giáo trên mesh nữ (R2-13) |
| F-2 | Một phần | Có `ch2_done` và Hồi kết thuộc phạm vi tối thiểu. Không đối chiếu với **sàn trễ nặng của VERDICT** (chỉ Long Biên + Phù Đổng). Xem R2-09 |
| F-3 | **Hình thức** ở 3/7 ý | Ý "Thế tổ đổi theo kịch bản, không đổi tự do" bị §3 phủ định ("hai ô vũ khí đổi nhanh"). "Rết có phương án lùi" chỉ có trong bảng. Thiếu "tiếng gồng dùng chung" |
| V-03, V-04, V-05 | Đạt | |
| V-08 | Đạt về trống | Nhưng "rào tre" (cùng một hành động cứu viện trong văn bản) bị biến thành vũ khí chống thủy quái. Xem R2-03 |
| V-11 | Bỏ sót | "Long Biên" là tên hành chính đời sau, chưa có ghi chú Codex |
| J-01 | Chưa kiểm được | Tướng tiên phong chưa có tên, chưa có tạo hình. Xem R2-06 |
| C2, C4, C5, C6 (VERDICT) | Bỏ sót một phần | §7 chỉ có C5 (giờ công). Thiếu C4 (spike nước dâng, cần cho ch.1 và ch.4), spike thuyền của C5 cho ch.2, và C2 (tham vấn Đền Hùng/Ba Vì, Đền Mẫu Âu Cơ Hiền Lương) |

---

## 2. Bảng phát hiện

| ID | Mức | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|---|
| R2-01 | **Chặn** | Chương 4 (Ba Vì) mở bằng cảnh Thuồng luồng chúa phá bến và cướp Răng vẽ. V2 lập luận rằng cảnh này ở "địa điểm khác, mùa khác" nên Ba Vì vẫn "sạch". Nhưng mọi luật hiện hành đều cấm **theo chương**, không theo bản đồ | VERDICT C3: "kẻ thù của chương Ba Vì không là sinh vật nước"; M028 `note`: "Không dùng thuồng luồng làm kẻ thù trong chương Ba Vì"; dossier §7.3 "không được xuất hiện ở chương Ba Vì"; CRITIQUE_CULTURE §3 "không thuồng luồng ở ch.4"; V2 dòng 43, 67 | Lấy phương án dự phòng của chính V2 làm **mặc định**: chuyển cảnh cướp Răng vẽ về cuối chương 3 (đời Đá, mùa cạn). Chương 4 không có phản diện. Muốn giữ cách hiểu "theo bản đồ" thì phải được PO và cố vấn văn hóa chấp thuận bằng văn bản, ghi vào DECISION_LOG |
| R2-02 | Nghiêm trọng | "Luật mùa cạn" **không tách** phản diện khỏi mô-típ Thủy Tinh, chỉ đảo pha. Người chơi sẽ trải qua: quái nước (cạn) → lũ Thủy Tinh (mùa lũ) → quái nước (cạn năm sau). Hai thế lực nước thành hai nửa của **cùng một chu kỳ nước hằng năm**. Đây chính là khung "hằng năm" của M006. Thêm nữa, Hồi kết là "mùa cạn **năm sau**", tức ngay sau mùa lũ Ba Vì | M006 `summary` "hằng năm Thủy Tinh vẫn dâng nước báo thù"; V2 dòng 8, 19, 68; CRITIQUE_CULTURE Q3 | Bỏ khung theo mùa: phản diện xuất hiện theo **động cơ** (cái răng, lãnh thổ), không theo nhịp nước. Hồi kết cách lũ Ba Vì một khoảng không xác định, không gọi là "năm sau". Codex nêu gốc của nó một cách tích cực (giao long hại người đánh cá, M028) thay vì ghi "không thuộc Thủy Tinh": nhắc tên Thủy Tinh tức là tự gợi ra liên tưởng. Giữ câu hỏi bác bỏ khi tham vấn |
| R2-03 | Nghiêm trọng | Cao trào dùng **rào cọc tre học ở Ba Vì** để ghim thân thủy quái. Theo văn bản, dân chân núi dựng rào tre để **cứu viện Tản Viên chống Thủy Tinh**. Đem chính kỹ thuật ấy ra hạ một thủy quái khổng lồ là dựng lại hình ảnh "dân Ba Vì đánh thủy tộc": V-08 bị lách qua đường khác | Dossier §6.1 (đề thi ghi nguồn LNCQ, Kim Đồng 2019: "làm hàng rào thưa bằng tre để đón đỡ… để cứu viện"); M006 `gameplay`; V2 dòng 46, 77 | Không lấy kỹ thuật pha 2 từ Ba Vì. Dùng nghề nhà (sào, thuyền, lưới, cọc bến của chính bến Lau) hoặc đồ Nứa tự chế. Ở Ba Vì, rào tre chỉ là hành động cứu người, không thành kỹ năng chiến đấu mang về |
| R2-04 | Nghiêm trọng | Hub bến Lau và trận cuối nằm trên **map chương 1**, tức rừng đầm Long Biên. Theo M003, sau chương 1 nơi này sụt thành **Đầm Xác Cáo, về sau là Hồ Tây**, vùng có đền Quán Thánh, Phủ Tây Hồ (thờ Mẫu, M024 `high`) và chùa Trấn Quốc. (a) Tượng Huyền Thiên Trấn Vũ ở Quán Thánh có **rùa và rắn** dưới kiếm; trong Đạo giáo, rùa và rắn là "nhị tướng" của Trấn Vũ (*hiểu biết sẵn có, cần đối chiếu*). Trận hạ một thủy quái thân rắn ngay vùng này có thể bị đọc là chiếm vai "trấn yêu" của Trấn Vũ, hoặc giết vật tùy tùng của ngài. (b) V2 chỉ ghi rủi ro "Vừa" và "không đền thật": chưa thực thi G-04 (thêm Quán Thánh vào QT-16 nếu bối cảnh Hồ Tây vào tiếp thị). Tên game "Bến Vảy" lại đưa hub lên làm bộ mặt sản phẩm. (c) Mâu thuẫn cảnh quan: sau chương 1, hang đã sụt thành "đầm sâu", trong khi Hồi kết là "bãi bùn, nước ngang mức lội" | M003 `summary`, `variants`, `note`, `worship_sites`; dossier §3.2–3.3, G-04; V2 dòng 48, 116 | Đặt bến Lau ở một **khúc sông [SÁNG TẠO] tách khỏi Đầm Xác Cáo** (có thể dùng lại tài nguyên map nhưng đổi địa danh, không nằm ở vùng hồ). Nếu vẫn ở vùng Long Biên: thêm đền Quán Thánh và Phủ Tây Hồ vào QT-16, tạo hình phản diện không gợi bộ rùa–rắn, và ghi rõ quan hệ giữa bến với Đầm Xác Cáo. Đối chiếu tượng thờ Quán Thánh |
| R2-05 | Nghiêm trọng | Q4 chỉ được xử lý bằng cách đổi tên. Cao trào: "Lúc chuyển pha có đòn kết theo kịch bản bằng đòn của Sào, rồi của Đá; vè vang lên". Đây là cấu trúc "Thế tổ" của V1 (mỗi pha một tổ, theo kịch bản), chỉ bỏ hiệu ứng sáng. Lần lượt dùng đòn của từng người đã khuất, có vè làm nền, đúng ở cao trào: vẫn dễ đọc thành tổ tiên nhập. Thạp: "đời sau mở ra nghe câu vè". Nếu tiếng phát ra khi mở thạp thì thành tiếng người khuất từ vật chứa | CRITIQUE_CULTURE Q4; V1 §2B "Cao trào"; V2 dòng 64, 77, 55 | Đòn kết dùng **đòn của chính Nứa** (tổ hợp học qua vè). Không gọi tên Sào/Đá, không bóng hình, không hồi tưởng trong lúc đánh. Vè do một **NPC còn sống, có mặt trên bến** hát; mở thạp chỉ hiện mục Codex hoặc văn bản, không phát giọng hát |
| R2-06 | Nghiêm trọng | Boss chương 3 "tướng tiên phong, tên trung tính" **chưa có tên**, nên không kiểm được J-01. Ngoài ra: (a) chưa nói đó là người hay yêu ma (QT-08: "giặc" là đạo quân yêu ma [SÁNG TẠO]); (b) Bảo khí 3 chế tác từ chiến lợi phẩm của tướng này, nên tên, mô tả và tạo hình Bảo khí cũng phải theo luật "không Ân, không mô-típ Thương, không chữ Hán"; (c) "người chơi hạ tướng giặc" ở vùng Phù Đổng/Sóc trùng với nghi lễ sống **"chém tướng giặc"** (đền Sóc) và vai "nữ tướng" (hội trận Phù Đổng) mà G-08 cấm mô phỏng; (d) mục Codex của boss không được ghi "tướng nhà Ân", vì LNCQ không chép tướng tiên phong nào, đây là [SÁNG TẠO] | R3_JUDGE_CULTURE J-01, J-02; dossier §5.2, §5.3, §8, G-08; STORY_STRUCTURE_STUDY QT-08; V2 dòng 38–39 | Đặt tên [SÁNG TẠO] ngay trong V2 và đưa vào `naming_review`. Tướng là yêu ma, có giáp/thú cưỡi bằng đá, xương, lông, gỗ. Trận đấu không kết bằng chém đầu, không có nữ tướng, không đặt gần đền Phù Đổng/Sóc. Codex tách hai đoạn: "Theo truyền thuyết: giặc Ân (LNCQ)" và "Phần hư cấu: tướng X". Tên Bảo khí 3 cũng phải qua duyệt |
| R2-07 | Nghiêm trọng | Ở chương 1, Lạc Long Quân "**đem thủy tộc** dâng nước" diệt Hồ Tinh, trong khi cùng chương đó phản diện là một giao long/thuồng luồng. Logic M028 lại là thủy tộc "tưởng là đồng loại" khi người vẽ "hình Long Quân dạng thủy quái" (theo một số bản). Thiết kế có thể ngụ ý phản diện là **đồng loại hay thuộc hạ của Quốc Tổ**, hoặc Lạc Long Quân không cai quản nổi thủy tộc của mình | M003 `summary`; M028 `summary`, `variants`; dossier §7.1; V2 dòng 27–29 | Ghi rõ trong V2 và Codex: phản diện là giao long hoang [SÁNG TẠO], không thuộc thủy tộc của Lạc Long Quân. Tạo hình **không có nét rồng** (sừng, râu, vảy rồng). Trong cutscene chương 1, thủy tộc của Lạc Long Quân phải khác hẳn về hình ảnh. Hỏi cố vấn khi tham vấn Đền Hùng |
| R2-08 | Nghiêm trọng | V2 không có luật về **nội dung mẫu xăm**. Thiếu ba điều: (a) mẫu theo hoa văn Đông Sơn [SÁNG TẠO]; (b) cấm irezumi, sak yant và mẫu (kể cả mẫu xăm mặt) của dân tộc thiểu số cụ thể; (c) không vẽ hình Lạc Long Quân (một số bản nói vẽ "hình Long Quân dạng thủy quái"), vì như vậy thành hình thần được thờ trao sức mạnh qua nhánh Vảy | CRITIQUE_CULTURE Q1, Q5; dossier §7.2, G-10; M028 `variants` | Thêm vào §3, hàng "Hình xăm": mẫu chỉ là thủy quái/hình học Đông Sơn [SÁNG TẠO], không hình rồng-thần, có danh sách cấm. Codex ghi "không có bằng chứng khảo cổ trực tiếp về hình xăm" |
| R2-09 | Nghiêm trọng | V2 tự định lại sàn phạm vi. VERDICT: "khi trễ nặng thì chỉ còn Long Biên và Phù Đổng". V2: "chương 4 rút thành đoạn tuyến tính, không cắt Hồi kết". Ở sàn của VERDICT, Nứa, Răng vẽ, Hồi kết và việc hạ phản diện đều mất, nên VERDICT "phản diện bị hạ ở chương cuối" và P-3 không đạt. V2 không nêu xung đột này | VERDICT §3; CRITIQUE_FEASIBILITY §2 "Rủi ro: sàn 1–3 mất Lau và Hồi kết"; V2 dòng 19–21 | Trình PO một trong hai cách: (a) nâng sàn thành Long Biên + Phù Đổng + Hồi kết rút gọn; hoặc (b) thiết kế bản kết dự phòng cho sàn hai chương (Đá hạ phản diện ở cuối chương 3). Ghi vào DECISION_LOG |
| R2-10 | Nghiêm trọng | Kế thừa khi chương 2 thành DLC chưa đủ. (a) Nhánh Vảy chỉ mở từ chương 3 (vì "đời Sào chưa có"), nhưng Sào trong DLC dùng cây kỹ năng chung, "giữ 100%", nên sẽ có nhánh Vảy: sai niên đại theo chính luật của V2. (b) "Người sau giữ đòn của mọi đời trước" chỉ chạy một chiều; Sào trong DLC không được có rìu (Đá) hay dao đôi (Nứa), V2 không nói. (c) Bảo khí 2 nhận sau khi phá đảo thì vào thạp nào, có hiện ở save đã xong không? (d) Nếu chương 2 là "tùy chọn" trong bản gốc: khi đã chuyển sang Đá thì còn quay lại được không? | CRITIQUE_PLAYER §2 (DLC mang cây kỹ năng cuối game); CRITIQUE_FEASIBILITY §2.3; V2 dòng 34, 54, 61–62 | Đặc tả "hồ sơ ký ức" cho DLC: khóa nhánh Vảy và vũ khí của đời sau, đồng bộ cả **điểm theo nhánh** chứ không chỉ cấp. Bảo khí 2 vào thạp ở save hiện tại kèm cờ. Nêu rõ chương 2 trong bản gốc là "trước lần bàn giao đầu tiên hoặc chọn từ menu ký ức" |
| R2-11 | Nghiêm trọng | Mâu thuẫn P-1 với F-3.2 bị bảng §6 che đi: F-3.2 yêu cầu "đổi theo kịch bản, không cho đổi tự do", còn §3 cho "hai ô vũ khí đổi nhanh" (đổi tự do). Bảng ghi cả hai là "đạt". Thêm nữa, Nứa có 3 họ vũ khí (sào, rìu, dao đôi) mà chỉ có 2 ô, nên không rõ đổi thế nào | CRITIQUE_FEASIBILITY §3.2; GDD dòng 39; V2 dòng 54, 92, 100 | Chọn một và ghi lý do: đổi tự do (chi phí: cả 3 bộ chiêu phải chạy trên mọi mesh) hoặc đổi theo kịch bản. Quy định cách chọn 2/3 vũ khí của Nứa |
| R2-12 | Nhẹ | Bảo khí: số danh nghĩa là 4, phạm vi tối thiểu chỉ có 3 (Bảo khí 2 thuộc chương 2). Số thứ tự để lại một lỗ trong thạp/UI. Không món nào có tên, vật liệu hay công dụng. Từ "chế tác" (V-19) không có trong nội dung | VERDICT §3; V2 dòng 30, 34, 39, 45, 96 | Đặt tên theo boss, không đánh số. Ghi vật liệu (đồng/răng/xương, không sắt) và công dụng. Thạp hiển thị theo đời, không theo số |
| R2-13 | Nhẹ | Cổng §7.2 chỉ thử "bộ giáo trên mesh nữ". Nứa (nữ) còn kế thừa **rìu** của Đá, làm trên mesh nam trong slice. Feasibility yêu cầu cả 3 bộ chiêu chạy trên mesh người cuối. Thiếu lồng tiếng 3 nhân vật × vi/en | CRITIQUE_FEASIBILITY §1 ("Thế tổ buộc cả 3 bộ chiêu phải chạy được trên mesh Lau"); V2 dòng 105 | Cổng 2: rìu trên mesh nữ, và nếu đổi tự do thì cả dao đôi trên mesh nam. Thêm dòng chi phí thoại |
| R2-14 | Nhẹ | Cổng §7 thiếu C4 (spike nước dâng: chương 1 có Lạc Long Quân dâng nước, chương 4 có lũ) và spike thuyền của C5 cho chương 2 | VERDICT §4 C4, C5; V2 §7 | Thêm vào §7 hoặc dẫn chiếu |
| R2-15 | Nhẹ | Động cơ phản diện tự mâu thuẫn: "chỉ là cái răng" và "vì đói và vì cái răng" | V2 dòng 48 và 68 | Thống nhất (bỏ "vì đói", vì đói theo mùa lại kéo về R2-02) |
| R2-16 | Nhẹ | Lệch niên đại nội bộ: nhánh Vảy và tục vẽ mình "đời Sào chưa có", nhưng (a) nhà đã tên "Vảy" từ đời Sào; (b) răng lấy ở chương 1 đã được gọi là "Răng **vẽ**"; (c) hàng "Hình xăm" cho "1 hình mới/đời", tức Sào cũng có hình. Thêm nữa, việc "đời Sào chưa có" chỉ là một lựa chọn: Hùng Vương thứ nhất là con Lạc Long Quân, và dossier §9.2 ghi không rõ hai chương thời Lạc Long Quân xảy ra trước hay sau khi có Hùng Vương thứ nhất | V2 dòng 6–7, 27, 56, 61; dossier §9.2; M028 `variants` (Trần Trọng Kim: "Hùng Vương thứ nhất") | Chọn một: (a) tục có từ đời Sào, nhánh Vảy mở từ đầu; hoặc (b) giữ mở ở chương 3, nhưng đổi tên nhà và răng ở chương 1–2 (ví dụ "răng thù"; nhà có tên "Vảy" từ đời Đá), Sào không có hình xăm. Ghi [SÁNG TẠO] cho lựa chọn |
| R2-17 | Nhẹ | Quy tắc "mọi thứ không ghi nhãn khác là [SÁNG TẠO]" vô tình gắn nhãn [SÁNG TẠO] cho các chi tiết truyền thuyết không có nhãn trong §2 (Lạc Long Quân ném sắt nung, ngựa sắt, Sơn Tinh dời núi) | V2 dòng 3, 29, 33, 38, 44 | Ghi [HUYỀN THOẠI] cạnh mã M00x ở từng chi tiết truyền thuyết |
| R2-18 | Nhẹ | "Cá-rắn đầu đàn" lấy từ **tên trong văn bản của chính Ngư Tinh** (魚蛇之精, tinh cá-rắn). Dễ đọc thành "người chơi tự hạ một Ngư Tinh", làm mờ công của Lạc Long Quân | Dossier §4.1; V2 dòng 34 | Đổi tên khác gốc (ví dụ thủy quái [SÁNG TẠO] tay sai). Tạo hình khác Ngư Tinh. Codex ghi rõ là hư cấu |
| R2-19 | Nhẹ | Cảnh kết: "Nứa dùng Răng vẽ vẽ mẫu cho một đứa trẻ", trong khi §5 tả kỹ thuật là "**châm** mực". Cảnh xăm kim cho trẻ em dễ gây phản cảm ở một số thị trường hoặc cơ quan xếp hạng | V2 dòng 72, 79 | Cảnh trẻ em chỉ **vẽ** mực (đúng văn bản "vẽ mình"). Không cho thấy kim hay chảy máu |
| R2-20 | Nhẹ | V2 thay "Cõi Trống" bằng bến Lau nhưng không liệt kê các phần GDD phải sửa: điểm kỹ năng "từ đền thờ" (trái Q4: không dùng bàn thờ làm điểm nâng cấp), Boss Rush và lấy lại manh mối ở "Cõi Trống", nhánh *Linh*, slice có "phù lực (Thủy)" (dễ đọc là sức thủy tộc của Lạc Long Quân). Nhánh *Trống* chưa có luật "không đánh vào nước" khi dùng ở chương 4 và Hồi kết | GDD dòng 27, 58, 82, 96, 112; M003 `gameplay`; V-08 | Thêm mục "Tài liệu phải cập nhật" (GDD §3, §4, slice). Nhánh Trống là nhịp chiến đấu, không gắn trống báo, không hiệu ứng nước |
| R2-21 | Nhẹ | Dùng chữ cái của mã lẫn lộn: V2 định nghĩa "F-" là CRITIQUE_FEASIBILITY, nhưng §10 lại dùng "F-18", mã của `STORY_STRUCTURE_REVIEW`. Các mã P-1…P-9, F-2.4, F-3.5, C-Q/C-R là do V2 tự đặt; các file phản biện không có các mã này | V2 dòng 3, 128; STORY_STRUCTURE_REVIEW dòng 51 | Ghi bảng quy đổi (ví dụ P-n = CRITIQUE_PLAYER §3 mục n) và đổi "F-18" thành "SSR F-18" |
| R2-22 | Nhẹ | Chưa ghi tuổi thọ phản diện: nó sống từ thời Lạc Long Quân tới đời Hùng thứ 18, theo dossier §9.2 là "hàng thế kỷ đến cả nghìn năm". Hub "nhà, thuyền, trống lớn dần" cũng trải qua cùng khoảng ấy. Tên "Ba Đời Giữ Bến" ngụ ý ba đời liền nhau | Dossier §9.2 ("không thể là cha → con", Codex chỉ nói "nhiều đời sau"); V2 §0, §9 | Codex [SÁNG TẠO]: giao long sống lâu. Thoại và vè dùng "nhiều đời sau", không đếm đời |
| R2-23 | Nhẹ | V-11 bị bỏ sót: "Long Biên" là tên hành chính đời sau, nhưng dùng làm tên chương mà không có ghi chú | Review V-11 | Codex: "tên gọi theo LNCQ, là địa danh đời sau" |
| R2-24 | Nhẹ | Miếu [SÁNG TẠO] ở hub chưa nói thờ ai. Nếu thờ thủy thần hoặc thuồng luồng thì đụng M028 `note` (có thể có làng thờ thuồng luồng, chưa xác minh) | M028 `note`; dossier §7.3 | Ghi rõ: miếu không thờ thần có thật, không thờ thủy quái; không có tượng |
| R2-25 | Nhẹ | Tên nhân vật "Đá": trong tiếng lóng hiện đại, "đá" là ma túy đá ("chơi đá") và còn nghĩa "đá" (bỏ người yêu). Rủi ro thấp nhưng dễ thành meme | Hiểu biết sẵn có, cần đối chiếu | Đưa vào `naming_review`, cân nhắc tên một tiếng khác (ví dụ theo nghề đò) |

### Tên game (§9)

| ID | Mức | Tên | Rủi ro | Đề xuất |
|---|---|---|---|---|
| N-01 | Nghiêm trọng | **Mùa Cạn** | (a) Bỏ dấu (URL Steam, hashtag, tên file) thành "Mua Can", dễ đọc là "mua cần", nghĩa lóng là mua cần sa (*hiểu biết sẵn có, cần đối chiếu*). (b) Đưa chu kỳ nước theo mùa lên làm thương hiệu, trong khi chính chu kỳ này là chỗ yếu của R2-02, nên tiếp thị sẽ khuếch đại liên tưởng với lũ Thủy Tinh. (c) Chung chung, khó phân biệt, chưa tra trùng | Loại |
| N-02 | Nhẹ | **Ba Đời Giữ Bến** | "Ba đời" theo nghĩa thường dùng là ông–cha–con, trái với "nhiều đời người" (R2-22). Dài, dịch khó, không gợi quái vật hay hành động (C6) | Chỉ dùng làm tagline, không làm tên |
| N-03 | Nhẹ | **Bến Vảy** | Bỏ dấu thành "Ben Vay" (dễ đọc "bên váy"). Gắn thương hiệu vào hub vùng Long Biên/Hồ Tây (R2-04, G-04). Tiếng Anh nhạt | Giữ trong danh sách nếu xử lý R2-04; tra trùng |
| N-04 | Nhẹ | **Răng Vẽ** | "Vẽ" có nghĩa phụ "vẽ chuyện, bày vẽ". Bỏ dấu thành "Rang Ve", mơ hồ. Tiếng Anh vụng ("Drawing Tooth"). Phụ thuộc R2-16 (tên răng ở đời chưa có tục vẽ) | Ứng viên chấp nhận được nếu sửa R2-16; cần tên tiếng Anh riêng |
| N-05 | Nhẹ | **Vè Nhà Vảy** | Vè là thể loại dân gian, thường mang giọng kể kèm châm biếm hay hài hước (vè nói ngược…), lệch giọng với action RPG. Gần như không dịch được. Không gợi hành động | Không dùng làm tên chính |
| N-06 | Nhẹ | Tất cả | Chưa tra nhãn hiệu, tên miền, tên trên Steam; chưa có phụ đề "huyền thoại" theo QT-11; chưa kiểm tra "bến Lau" có trùng địa danh thật không | Làm theo NAMING_AND_PROTAGONIST (luật sư SHTT) và `naming_review` |

---

## 3. Các điểm đạt (không cần sửa)

- Không gán huyết thống Lạc Long Quân hay Hùng Vương; dòng họ là Lạc dân, không họ Hán-Việt (G-02, dossier §9.3).
- Lạc Long Quân, Gióng, Sơn Tinh, Thủy Tinh không bị đánh, không thoại tự do. Đòn kết liễu Hồ Tinh và Ngư Tinh thuộc thần; khối sắt và ngựa sắt không vào tay người chơi (QT-07, J-02, J-05). Âu Cơ và Mị Nương không xuất hiện.
- Dị bản Huyền Thiên chỉ ở Codex (G-04, phần dị bản). "Giặc Ân" chỉ ở Codex (J-01, phần nguyên tắc).
- Trống ở Ba Vì chỉ để báo và cứu người (V-08). Kẻ thù trong khu Ba Vì là "Rết lớn" thú bị nước dồn (C-R3, dossier §8). Trống gỗ bịt da (C-R9). Thạp ở kho (C-R5).
- Đông Hải và luật bản địa hóa theo D-016. Mốc Hùng 6/18 ghi "theo nhiều bản kể" (V-03). Tục vẽ mình ghi "vua (Hùng Vương theo nhiều bản kể)" (K6).
- Không chạm danh sách loại trừ (RESEARCH_PROTOCOL §7): không nội chiến, không Chăm Pa/Khmer, không Triệu Đà, không sau 1858, không mê tín gắn dân tộc. Rủi ro lấy mẫu xăm của dân tộc thiểu số còn để ngỏ (R2-08).
- Thứ tự cốt truyện và thứ tự sản xuất khớp VERDICT và F-2.4 (Long Biên → Phù Đổng → Ba Vì + Hồi kết → Đông Hải).

---

## 4. Kết luận

**KHÔNG ĐẠT** ở dạng hiện tại (giá trị tối đa mức B; mức A cần cố vấn sử học người thật ký).

- Lý do chặn: **R2-01** vi phạm điều kiện bắt buộc VERDICT C3 và M028 `note`, bằng cách diễn giải lại "chương Ba Vì" thành "phần Ba Vì".
- Sửa rẻ: lấy phương án dự phòng của chính V2 (chuyển cảnh cướp răng về cuối chương 3) làm mặc định.

Sau khi sửa R2-01, bản thiết kế lên **ĐẠT CÓ ĐIỀU KIỆN** nếu xử lý thêm:
1. R2-02 và R2-03: bỏ khung theo mùa nước; không mang rào tre Ba Vì vào cao trào.
2. R2-04: dời hub khỏi vùng Đầm Xác Cáo/Hồ Tây, hoặc thêm đền Quán Thánh và Phủ Tây Hồ vào QT-16.
3. R2-05: bỏ cấu trúc "đòn từng tổ" ở cao trào.
4. R2-06: đặt tên và tạo hình tướng tiên phong; tránh mô phỏng "chém tướng giặc".
5. R2-07, R2-08: tách phản diện khỏi thủy tộc của Lạc Long Quân; ra luật nội dung mẫu xăm.
6. R2-09 đến R2-11: trình PO các xung đột còn mở (sàn phạm vi; cách đổi vũ khí); đặc tả hồ sơ DLC.
7. Loại tên "Mùa Cạn" (N-01).

Các mục Nhẹ sửa cùng V3.
