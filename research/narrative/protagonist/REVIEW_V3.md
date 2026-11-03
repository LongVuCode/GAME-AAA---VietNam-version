# Phản biện LINEAGE_DESIGN_V3 (người bến Lau, phản diện Rễ Cuồng)

Người duyệt: `historian-verifier` (AI), kiêm kiểm tra nhất quán thiết kế · Ngày: 2026-11-03
Đối tượng: `research/narrative/protagonist/LINEAGE_DESIGN_V3.md`.
Đối chiếu với:
- `REVIEW_V2.md` (R2-01…R2-25, N-01…N-06)
- `CRITIQUE_PLAYER.md`, `CRITIQUE_FEASIBILITY.md`, `CRITIQUE_CULTURE.md`
- `research/expert/GAME1_LORE_DOSSIER.md` (§2.1, §6, §7, §8, §12.16) và `GAME1_LORE_DOSSIER_REVIEW.md` (V-07, V-10, V-11, V-19)
- `research/data/myths.json` (M002–M006, M024, M028)
- `research/narrative/debate/VERDICT.md`, `docs/GDD.md`, `docs/RESEARCH_PROTOCOL.md`

**Giới hạn.**
- Lần này có tra nguồn ngoài, nhưng **chỉ qua trích đoạn WebSearch**. WebFetch không truy cập được `vi.wikipedia.org` và `mythic-pages.pages.dev` (host không phân giải trong phiên này).
- Mọi chi tiết về Mộc tinh truyện dưới đây đều **lấy từ blog, trang tổng hợp và một bài nghiên cứu (Đặng Tiến), chưa đối chiếu bản dịch LNCQ**. Chúng chỉ đủ để báo động, chưa đủ để làm canon.
- Ý kiến về tiếng lóng và phương âm là **hiểu biết sẵn có, cần đối chiếu** với người bản ngữ ở nhiều vùng.
- Kết luận có giá trị tối đa mức **B**.
- `python3 tools/research_tool.py lint`: **0 lỗi, 7 cảnh báo** (T002, T009, T017, T019, T029, T031, M016; cảnh báo cũ về dòng nguồn, không liên quan V3). V3 không sửa dữ liệu.

---

## 1. Tra nhanh Mộc tinh truyện (M004): V3 có trái truyền thuyết không?

Các trích đoạn tìm kiếm cho thấy những điểm sau. Tất cả **cần đối chiếu LNCQ**.

| Điểm | Theo trích đoạn | Hệ quả cho V3 |
|---|---|---|
| Loài cây, địa điểm | **Cây chiên đàn** khổng lồ, sống hơn nghìn năm, ở **Phong Châu** (vietmyth.vn; slideshare "LNCQ bình giải") | V3 cấm đa, đề, gạo, si nhưng bỏ sót chính chiên đàn (đàn hương, gỗ dùng làm hương và tượng thờ). Phong Châu là đất kinh đô Văn Lang, vùng Đền Hùng |
| Cách Lạc Long Quân đánh | Sau khoảng trăm ngày giao chiến, Lạc Long Quân **dùng trống và chiêng (nhạc khí) làm Mộc tinh khiếp sợ** (vietsuluoc, gamek, violet, trungcoly) | Cao trào "dân kéo dây chão theo nhịp trống, giật bật bộ rễ" tái hiện **chính phương pháp của thần**, và người chơi làm trọn việc thần chỉ làm được một nửa. Xem R3-03 |
| Diệt hay đuổi | **Đa số trích đoạn kể là đuổi**: Mộc tinh "thua chạy" về **tây nam**, thành **quỷ Xương Cuồng** (thuvien4u, vietsuluoc, mythic-pages). Một bản kể cho thiếu nhi lại nói **Lạc Long Quân cùng Kinh Dương Vương** chặt cây và yêu chết theo | Luật "hạt rơi trước khi Lạc Long Quân trừ nó" của V3 bỏ sót Kinh Dương Vương. Theo bản "đuổi", thân chính của yêu **vẫn sống** suốt thời gian game diễn ra |
| Sau khi chạy | Xương Cuồng đòi **tế người hằng năm**. Theo một trích đoạn, các đời Hùng Vương bắt **"người thuộc tộc người trong núi"** để tế vào 30 tháng Chạp. Về sau, đạo sĩ phương Bắc **Văn Du Tường** dựng lầu, bày tạp kỹ để dụ Xương Cuồng ra rồi chém nó (gamek, violet, huvi.wordpress) | Chi tiết này chạm **danh sách loại trừ** (RESEARCH_PROTOCOL §7: mê tín gắn kỳ thị một dân tộc cụ thể). Trong khi đó §6 lại buộc Codex ghi đủ dị bản. Xem R3-02 |
| Liên hệ khác | Theo bài của Đặng Tiến: LNCQ chép **Nhâm Ngao** bị thần Xương Cuồng vật chết, còn Toàn thư nói Nhâm Ngao phạm thổ thần. Đặng Tiến đọc Xương Cuồng là ẩn dụ thần Hổ (diendan.org) | Nhâm Ngao gắn với Triệu Đà/Nam Việt, cũng nằm trong **danh sách loại trừ**. Codex M004 không được đi theo nhánh này |

**Kết luận phần 1.**
- V3 **không trái** cốt truyện LNCQ ở ý "một mầm yêu thoát ra trước trận Phong Châu".
- Nhưng V3 chọn phương án (b) trên dữ liệu **mức C** mà **không tra nguồn**, dù dossier §12.16 đã đặt việc tra nguyên văn làm điều kiện tiên quyết.
- Tra nhanh lộ ra ba vấn đề V3 không biết: (1) trống chiêng là vũ khí của thần chống Mộc tinh; (2) truyện nối tiếp Xương Cuồng có tục tế người "tộc người trong núi" và nhánh Nhâm Ngao; (3) tên "Rễ Cuồng" gần như gọi thẳng tên "Xương Cuồng".

---

## 2. Đối chiếu R2: xử lý thật hay chỉ tuyên bố?

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| R2-01 | **Đạt** | Ba Vì không có thủy quái. Sự kiện thủy quái ở hub tắt khi đang mở chương Ba Vì. Còn hở: kỹ năng bị động của nhánh Vảy trong vùng lũ (R3-09) |
| R2-02 | **Đạt** | Bỏ khung theo mùa, động cơ không gắn nước. Nhưng phản diện loài đất/rừng tạo ra một đối xứng mới với Sơn Tinh (R3-04) |
| R2-03 | Đạt về rào tre; **hở về trống** | Rào tre chỉ còn để cứu người. Nhưng cao trào lại dùng **nhịp trống** chống yêu cây, đúng cách Lạc Long Quân đuổi Mộc tinh (R3-03) |
| R2-04 | **Đạt** | Hub dời ra khúc sông [SÁNG TẠO], chương 1 không có rắn hay rùa, có tham vấn Quán Thánh và Phủ Tây Hồ. Chi phí map mới chưa được tính (R3-07) |
| R2-05 | **Đạt** | Chỉ dùng đòn của nhân vật đang chơi; người hát vè là NPC còn sống; Thạp không phát tiếng |
| R2-06 | **Phần lớn đạt** | Đã có tên, tạo hình, cách kết trận và Codex hai đoạn. Còn thiếu: tên chưa qua `naming_review`; "xương" là xương gì; Codex đặt hai đoạn cạnh nhau dễ ngụ ý "Ân = yêu ma" (R3-10) |
| R2-07 | **Đạt** | Phản diện là cây; giao long mang dáng cá sấu |
| R2-08 | **Đạt, thiếu một tiêu chí** | Có danh sách cấm. Chưa có tiêu chí phân biệt "thủy quái cách điệu" với "Long Quân dạng thủy quái" (R3-14) |
| R2-09 | **Đạt về thủ tục** | Đã ghi rõ "ĐỀ XUẤT – cần PO duyệt". Chưa nêu chi phí làm lại khi chuyển từ cấu hình sàn sang cấu hình đủ (R3-08) |
| R2-10 | **Đạt** | Có hồ sơ ký ức: đồng bộ điểm từng nhánh, khóa Vảy và vũ khí đời sau, cờ `ch2_done` |
| R2-11 | **Đạt, sinh lỗ mới** | Chọn đổi tự do, có phương án lùi. Nhưng Cói chỉ có một họ vũ khí, và Cán Lõi không rõ là vũ khí hay vật phẩm nhiệm vụ (R3-06) |
| R2-12 | **Đạt** | Bảo khí có tên, vật liệu, công dụng; đúc đồng, không sắt; xếp theo đời |
| R2-13, R2-14 | **Đạt** | Cổng 2 kiểm cả 3 bộ chiêu trên 2 mesh; có cổng 6 và spike thuyền |
| R2-15 | **Hình thức** | "Động cơ duy nhất: đòi lại lõi". Nhưng ở chương 1, Rễ Cuồng phá bến **trước khi** bị chặt lõi, nên động cơ của lần tấn công đầu không có (R3-05) |
| R2-16 | **Đạt** | Vảy và tên "nhà Vảy" bắt đầu từ chương 3; vật truyền đời là Cán Lõi |
| R2-17…R2-24 | Đạt | Riêng R2-20 chỉ **một phần**: danh sách cập nhật còn thiếu nhiều mục (R3-12) |
| R2-25 | Đạt | "Đá" đổi thành "Bương". Tên mới xem R3-13 |
| N-01 | Đạt | "Mùa Cạn" đã bị loại |
| N-06 | **Chưa làm** | Vẫn chưa tra nhãn hiệu. Tên game mới có rủi ro riêng (mục 4) |

---

## 3. Bảng phát hiện

| ID | Mức | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|---|
| R3-01 | **Nghiêm trọng** | Tên **"Rễ Cuồng"** (tên phản diện, đồng thời là ứng viên tên game) mang ba rủi ro. **(a)** Phần lớn giọng miền Trung và miền Nam không phân biệt thanh hỏi và thanh ngã, nên khi nói, "Rễ Cuồng" nghe như **"Rể Cuồng"** (chàng rể hóa cuồng). Đây gần như là biệt danh của **Thủy Tinh**, kẻ cầu hôn bị từ chối trong truyện kén rể M006. Như vậy chính cái tên dựng lại vấn đề Thủy Tinh mà V3 vừa gỡ. **(b)** "Cuồng" gần như gọi thẳng tên **Xương Cuồng**, tên của Mộc tinh sau khi chạy, gắn với tục tế người (R3-02). **(c)** Khi bỏ dấu, "Re Cuong" có thể đọc thành "rẻ cuồng"; trong cách nói phổ biến, "cuồng" còn đi với "fan cuồng", "cuồng dâm". Bản tiếng Anh *Rootrage*: "root" là tiếng lóng tình dục ở Úc và New Zealand, đọc gần như "road rage", và đã có một game jam tên "RootRage" | M006 `summary` (kén rể); trích đoạn Xương Cuồng ở §1; globalgamejam.org/node/93949; phương âm và tiếng lóng: hiểu biết sẵn có, cần đối chiếu | **Loại "Rễ Cuồng"** cả làm tên phản diện lẫn tên game. Đặt tên mới không chứa "Cuồng" và không đồng âm với "rể" hay "rẽ". Đưa tên mới qua `naming_review` và thử đọc với người nói giọng Bắc, Trung, Nam |
| R3-02 | **Chặn** (chỉ chặn việc chốt (b) làm mặc định) | Phản diện được nối phả hệ với M004, nên Codex buộc phải có mục Mộc Tinh. Theo trích đoạn, truyện nối tiếp có: Xương Cuồng đòi tế người, vua Hùng bắt **"người thuộc tộc người trong núi"** để tế; và nhánh Nhâm Ngao gắn với Triệu Đà. Cả hai đều thuộc **danh sách loại trừ** (RESEARCH_PROTOCOL §7). Trong khi đó §6 buộc Codex ghi đủ dị bản. Luật của V3 ("không nhắc hướng Mộc Tinh chạy tới") chỉ né được chữ "tây nam", không né được tên Xương Cuồng, vốn nằm ngay trong tên phản diện. Thêm nữa: dị bản Kinh Dương Vương (một vị cũng được thờ) bị bỏ sót, và theo bản "đuổi", thân chính của yêu vẫn sống suốt game. Toàn bộ lựa chọn dựa trên dữ liệu mức C, không tra nguồn | M004 (`verification: C`, `canon: "Chờ đối chiếu"`); dossier §12.16; V3 §1, §9 ("Không tra nguồn ngoài"); trích đoạn ở §1 | Trước khi chốt (b): **(1)** đối chiếu nguyên văn Mộc tinh truyện; ghi cây, kết cục, vai trò Kinh Dương Vương, đoạn Xương Cuồng, đoạn Văn Du Tường. **(2)** PO cùng cố vấn quyết một trong hai: cắt quan hệ phả hệ (phản diện là "cây yêu" [SÁNG TẠO] thuần, không phải hạt của Mộc Tinh, Codex không nhắc M004); hoặc giữ quan hệ nhưng ghi ngoại lệ §6: Codex M004 chỉ kể đến trận Phong Châu, bỏ đoạn tế người và nhánh Nhâm Ngao, ghi vào DECISION_LOG. **(3)** Nếu giữ quan hệ: viết luật "trước trận Phong Châu" thay cho "trước khi Lạc Long Quân trừ nó", và cập nhật M004 (`summary`, `variants`, `note`, `canon`). **Đề xuất mặc định: cắt quan hệ phả hệ** |
| R3-03 | **Nghiêm trọng** | Trong LNCQ (theo trích đoạn), Lạc Long Quân đuổi Mộc tinh bằng **trống và chiêng**. V3 lại dựng cao trào bằng việc dân kéo dây chão **theo nhịp trống** (nhánh Trống) để giật bật bộ rễ. Cùng lúc đó, tên game ứng viên là "Trống Bến", và GDD có thanh Nhịp/Hồi trống làm trụ cột. Hệ quả: người chơi dùng chính phương pháp của thần và **làm trọn** việc mà thần chỉ đuổi được (nếu giữ quan hệ với Mộc Tinh). Có thể bị đọc là "người phàm hơn Quốc Tổ", trái với tinh thần mô hình "người chơi phá Thế, thần kết liễu" | Trích đoạn ở §1; V3 §3 "Trận bến" bước 2; GDD §3 (Nhịp trống), §1 (tên làm việc "HỒN TRỐNG") | Nếu cắt quan hệ (R3-02) thì rủi ro giảm mạnh, chỉ còn mức trùng mô-típ. Nếu giữ: pha 2 dùng **nghề đò** (dây chão, hò kéo, mái chèo) và không có trống; nhánh Trống chỉ để đánh nhịp chiến đấu bình thường. Codex nêu thẳng: "trống chiêng là cách Lạc Long Quân đuổi Mộc tinh; game không tái hiện". Không dùng "Trống Bến" làm tên game |
| R3-04 | **Nghiêm trọng** | Đối xứng mới với Sơn Tinh. V3 ghép một nhà **sông nước** (đò; Vảy giả làm thủy tộc) với một phản diện **đất/rừng** (rễ trồi lên từ đất, "rút xuống đất"). Ở chương Ba Vì, cảnh mở là yêu rừng tấn công người sông, sau đó Sơn Tinh dời núi chống Thủy Tinh. Người xem có thể đọc nhà người chơi đứng phe Nước và phản diện đứng phe Núi, tức Sơn Tinh. Vấn đề gốc là M028: vua giải thích "giống ở núi và giống ở nước khác nhau". Đối lập người nước với yêu núi rừng, cộng thêm Xương Cuồng gắn với "tộc người trong núi", dễ trượt thành đối lập miền xuôi với miền núi. Mị Nương còn được một số truyền thống coi là mẹ của **Mẫu Thượng Ngàn** (bà chúa rừng núi, M024 `high`), nên yêu rừng ngay cửa chương Ba Vì nằm sát vùng tín ngưỡng này | M006, M024, M028 `summary`; GAME1_LORE_DOSSIER_REVIEW V-07; V3 §3 chương 4 và §1 | **(a)** Tạo hình Rễ Cuồng: rễ, gỗ mục, nấm; **không** đá, đồi, đất dâng, không cảnh "núi mọc"; không xuất hiện cùng khung hình với cutscene Sơn Tinh. **(b)** Cân nhắc **bỏ cảnh mở ở chương 4**: Nứa gặp phản diện lần đầu ở Trận bến, sau khi lũ rút và ở bến xa Ba Vì. Ở cấu hình đủ, giữ vết rìu chương 3 làm móc nối. **(c)** Thoại và Codex không gọi phản diện là "của rừng" hay "của núi". **(d)** Khi tham vấn Ba Vì và cố vấn thờ Mẫu, hỏi câu bác bỏ: "phản diện có bị đọc là phe Sơn Tinh hoặc là con của rừng thiêng không?" |
| R3-05 | Nhẹ | R2-15 được xử lý về hình thức nhưng lại hở ở chỗ khác. "Động cơ duy nhất: đòi lại lõi", trong khi ở chương 1 Rễ Cuồng "còn non" phá bến **trước khi** Cói chặt lõi. Lần tấn công đầu không có động cơ | V3 §1 "Luật", §3 chương 1 | Ghi rõ động cơ trước khi mất lõi (ví dụ: rễ non hút nước ở chân bến, làm sập bến; **không** gắn mùa, không ăn thịt người), hoặc đổi cảnh mở: bến tình cờ đóng cọc trúng gốc nó |
| R3-06 | Nhẹ | Cán Lõi không nhất quán. **(a)** Là "cán sào truyền đời", nhưng đổi vũ khí tự do; nếu Nứa không mang sào thì lấy gì để "cắm Cán Lõi vào lõi"? **(b)** Cói chỉ có một họ vũ khí (sào) cho hai ô. **(c)** Cói "chặt được lõi" bằng sào, mà sào là vũ khí cùn hoặc đâm | V3 §3 chương 1, §4 "Đổi vũ khí", Trận bến bước 3 | Chọn một: Cán Lõi là **vật phẩm nhiệm vụ** (không phải vũ khí, không có chỉ số), hoặc là phần cố định của sào mà mọi đời đều mang. Cho Cói một ô phụ (ví dụ dao găm của slice) hoặc ghi rõ ô thứ hai khóa đến chương 3. Đổi động từ: Cói **bẻ hoặc cạy** lõi bằng sào, hoặc dùng dao |
| R3-07 | **Nghiêm trọng** | Chi phí bị lệch. Dời hub ra khúc sông mới làm **mất khoản tiết kiệm "dùng lại map chương 1"**, vốn là lý do chi phí của bến Lau (CRITIQUE_PLAYER §3.5, CRITIQUE_FEASIBILITY §1 "Hồi kết dùng lại map thì rẻ"). V3 không nêu map hub mới. Trận bến còn thêm: ván bến phá được, đám đông NPC kéo dây đồng bộ, xúc tu rễ (chuỗi xương động hoặc vật lý), và 2 cấu hình. Câu "rẻ hơn về rig" chưa có căn cứ | V3 §0, §1 bảng "Chi phí rig", §6 cổng 7 | Thêm dòng chi phí "map hub/bến mới", hoặc ghi rõ dùng lại tài nguyên map chương 1 nhưng đổi địa danh (đúng gợi ý R2-04). Cổng 7 phải đo được: số xương xúc tu, số NPC kéo dây, ngân sách hiệu năng (theo C4). Bỏ khẳng định "rẻ hơn" cho tới khi có spike |
| R3-08 | Nhẹ | Trận bến mô-đun (đã ghi cần PO). Nhưng: **(a)** làm ở thứ tự 3 với Bương, rồi khi có chương 4 thì phải làm lại (đổi sang Nứa, thêm một pha, chương 3 đổi từ "hạ" sang "để lại vết rìu"). Đây là chi phí làm hai lần, chưa ghi. **(b)** Chưa có mục DECISION_LOG hay câu hỏi gửi PO | V3 §2; VERDICT §3 (sàn phạm vi); CLAUDE.md §6 | Ghi chi phí làm lại. Chuyển thành câu hỏi PO (mục 5). Nếu được duyệt, ghi DECISION_LOG kèm cờ `finale_after` |
| R3-09 | Nhẹ | Nhánh Vảy ở chương Ba Vì. Sự kiện thủy quái đã tắt, nhưng các kỹ năng bị động "thủy quái do dự" và "đi qua vùng nước có quái" có thể hiện UI hoặc có hiệu ứng trong vùng **lũ của Thủy Tinh**. Như vậy là ngụ ý trong nước lũ có thủy quái | V3 §1 "Nhánh Vảy"; M006 `gameplay` ("Kẻ thù của chương KHÔNG là sinh vật nước") | Luật dữ liệu: chương Ba Vì không có volume "nước có quái"; kỹ năng bị động của Vảy không hiện thông báo hay VFX ở đó. Thêm test dữ liệu |
| R3-10 | Nhẹ | Giáp Xương. **(a)** "Giáp bằng xương", "thú xương", và Bảo khí "Vòng Xương" làm từ "mảnh xương": chưa rõ xương gì. Nếu là xương người thì nặng về bạo lực và xếp hạng tuổi. **(b)** Codex đặt "Theo truyền thuyết: giặc Ân" ngay cạnh "Phần hư cấu: Giáp Xương, yêu ma cầm đầu toán tiền đạo", dễ ngụ ý "người Ân = yêu ma". CLAUDE.md §3 yêu cầu quân xâm lược được thể hiện là quân đội hoặc tướng lĩnh, không biếm họa sắc tộc. **(c)** Tên chưa qua `naming_review`. Ghép với "Rễ Cuồng" thì ra đúng "Xương Cuồng". **(d)** Hội trận Phù Đổng diễn ra ở bãi; trận đấu ở bến đò làng không được dựng như hội trận (cờ, phường áo, đội hình) | V3 §3 chương 3, §4 bảng Bảo khí; dossier §5.2–5.3; CLAUDE.md §3 | Ghi "xương thú". Codex thêm câu: "đạo quân yêu ma là hư cấu của game, không mô tả dân tộc hay triều đại nào". Đổi một trong hai tên để không ghép thành "Xương Cuồng". Thêm "không dựng đội hình hay trang phục hội trận" vào luật chương 3 |
| R3-11 | Nhẹ | "Cáo Đầu Bầy" lặp lại đúng lỗi R2-18 (boss tự thắng trùng loài với boss huyền thoại) ở chương 1: một con cáo đầu đàn bị người chơi hạ trong chương Hồ Tinh, dễ đọc thành "người chơi hạ một Hồ Tinh". Chương Đông Hải thì có "Đuối Đen": "đuối" còn có nghĩa yếu sức, và gợi "chết đuối". VERDICT ghi "không có combat bơi" nhưng V3 không nhắc lại | V3 §3 chương 1–2; REVIEW_V2 R2-18; VERDICT §3 | Cáo Đầu Bầy: một đuôi, thú thuần, không biến hình, không ảo ảnh của riêng nó; Codex ghi hư cấu. Cân nhắc đổi tên "Đuối Đen" (ví dụ theo gai đuôi). Ghi "không combat bơi" vào chương 2 |
| R3-12 | Nhẹ | Danh sách cập nhật (R2-20) còn thiếu: **(a)** `myths.json` **M028 `gameplay`** vẫn ghi "phản diện xuyên suốt 'Thuồng luồng chúa'"; dossier §7.3 và hàng §8 cũng vậy. **(b)** GDD §5 (sự kiện "thuồng luồng quấy bến" cần `prereq` tắt ở Ba Vì); §6 dòng 82 (lấy lại manh mối ở "Cõi Trống"); §7 (Boss Rush ở Cõi Trống); §4 (nhánh *Linh* → *Vảy*; chế tác ở "lò rèn, đền", trái V-19 và Q4); §1 (tên làm việc "HỒN TRỐNG" gợi hồn/tâm linh); §2 ("9 chương") | `myths.json` M028; GDD dòng 27, 61–66, 82, 96, 55–57; V3 §6 | Bổ sung các mục trên vào "Cần cập nhật". Cập nhật dữ liệu theo quy trình (người viết khác người duyệt) |
| R3-13 | Nhẹ | Tên nhân vật. V3 §0 nói "tên theo cây bờ nước", nhưng **bương** và **nứa** là tre, nứa vùng đồi rừng trung du và miền núi, gắn với nhà sàn và đồ dùng của nhiều dân tộc miền núi (hiểu biết sẵn có, cần đối chiếu). Vậy là trái với khung "người bến", và trong bối cảnh R3-02, R3-04 lại thêm một liên tưởng "núi". Tiếng lóng: không thấy nghĩa xấu. Bỏ dấu: "Coi" (coi/còi), "Buong" (buông/buồng), "Nua" (nữa/nửa) đều vô hại. "Bương" là tre và xuất hiện ở chương Gióng, nơi có tre đằng ngà; rủi ro thấp | V3 §0; hiểu biết sẵn có | Sửa lý do đặt tên ("cây cỏ quen thuộc") hoặc đổi sang cây thật sự ở bờ nước (sậy, lác, bần, vẹt…). Đưa vào `naming_review` |
| R3-14 | Nhẹ | Luật mẫu xăm cho phép "thủy quái cách điệu", nhưng M028 có dị bản "hình Long Quân dạng thủy quái" và "hình rồng ở ngực, bụng, chân". Chưa có tiêu chí phân biệt | M028 `variants`; V3 §5 | Thêm tiêu chí tạo hình: không sừng, không râu, không vảy rồng, không móng vuốt rồng; mỗi mẫu qua duyệt |
| R3-15 | Nhẹ | Danh sách tham vấn C2 còn thiếu: **Đình–đền Nội Bình Đà** (thờ Lạc Long Quân, có trong `worship_sites` M002–M004); nơi thờ **Kinh Dương Vương** nếu giữ quan hệ với M004 (chưa tra nơi thờ); cố vấn **dân tộc học/cộng đồng miền núi** (Xương Cuồng); tham vấn về chiên đàn/đàn hương nếu giữ loài cây. Thứ tự C2 (tham vấn xong trước trang Steam và trailer) chưa được nhắc lại cạnh dòng "C6: trailer bán…" | M002–M004 `worship_sites`; VERDICT C2; V3 §6 | Bổ sung danh sách. Ghi "trailer chỉ làm sau khi xong C2" |
| R3-16 | Nhẹ | Đánh số chương lệch giữa các tài liệu. Trong VERDICT, chương 2 là Phù Đổng và chương 4 là Đông Hải; trong V3, chương 2 là Đông Hải và chương 3 là Phù Đổng. Các cờ `ch2_done`, `finale_after = ch3 \| ch4` và câu "làm ngay sau chương 3" vì vậy hiểu được hai cách | VERDICT §3; V3 §2, §4 | Dùng ID chuỗi ổn định (`ch_longbien`, `ch_donghai`, `ch_phudong`, `ch_bavi`) trong dữ liệu và cờ; thêm bảng quy đổi số chương |
| R3-17 | Nhẹ | Loài cây gốc theo LNCQ (theo trích đoạn) là **chiên đàn**, gỗ đàn hương dùng làm hương và tượng thờ. Danh sách cấm của V3 bỏ sót loài này. Nếu giữ quan hệ phả hệ thì Cán Lõi là gỗ chiên đàn | Trích đoạn ở §1; V3 §1 | Rễ Cuồng không xác định loài, không có mùi hay khói hương, không dùng gỗ thơm làm vật liệu. Thêm chiên đàn vào danh sách tránh về tạo hình |

---

## 4. Tên game (V3 §7)

| ID | Mức | Tên | Rủi ro | Đề xuất |
|---|---|---|---|---|
| N3-01 | **Nghiêm trọng** | **Rễ Cuồng** | Xem R3-01: nghe thành "Rể Cuồng" (gợi Thủy Tinh) ở giọng Trung và Nam; gọi thẳng tên Xương Cuồng (tế người, R3-02); "Re Cuong" khi bỏ dấu; *Rootrage* dính tiếng lóng Úc/New Zealand và đã có game jam trùng tên | **Loại** |
| N3-02 | Nghiêm trọng | **Cán Lõi** | Bỏ dấu thành "Can Loi", dễ đọc là **"cạn lời"**, tiếng lóng mạng rất phổ biến (nghĩa: "hết nói nổi"), nên rất dễ thành meme. "Cán" còn có nghĩa "cán qua" (xe cán). Tiếng Anh khó dịch. Không bán được quái vật (C6) | **Loại** |
| N3-03 | Nhẹ | **Trống Bến** | "Trống" còn nghĩa là trống rỗng ("bến trống"); bỏ dấu thành "Trong Ben" hoặc "Trông Ben". Đưa trống lên làm thương hiệu sẽ: kéo về **trống đồng** (J-06, M013) trong ảnh tiếp thị; khuếch đại trống, thứ dân dùng cứu viện Tản Viên (V-08); trùng cách Lạc Long Quân đuổi Mộc tinh (R3-03). *Landing Drum* vụng. Không bán được quái vật (C6) | Không dùng làm tên chính |
| N3-04 | Nhẹ | **Người Giữ Bến** | An toàn nhất về nghĩa và khi bỏ dấu. Nhưng chung chung, không bán được quái vật (C6), chưa tra trùng tên. Trong tiếng Anh, "ferrykeeper" là từ ghép ít gặp | Ứng viên mặc định, **kèm phụ đề** gợi quái vật/huyền thoại (QT-11). Tra nhãn hiệu và Steam |
| N3-05 | Nhẹ | Tất cả và "bến Lau" | Chưa tra nhãn hiệu (N-06 vẫn mở). Tìm kiếm không thấy địa danh "bến Lau"; gần nhất là **bến Âu Lâu (Yên Bái)**, di tích thời kháng chiến (sau 1858, ngoài phạm vi). Rủi ro thấp | Ghi kết quả vào `naming_review`; luật sư SHTT tra trùng |

---

## 5. Các quyết định cần PO

Gom 5 câu theo CLAUDE.md §6, mỗi câu kèm đề xuất mặc định.

1. **Phản diện có nối phả hệ với Mộc Tinh (M004) không?**
   - **Mặc định: không.** Phản diện là "cây yêu" [SÁNG TẠO] thuần, Codex không nhắc M004; vẫn giữ cây làm loài phản diện.
   - Nếu PO muốn giữ quan hệ phả hệ: phải đối chiếu nguyên văn Mộc tinh truyện trước, và duyệt câu 2.
2. **Có cho phép ngoại lệ RESEARCH_PROTOCOL §6 với M004 không?** (chỉ cần nếu câu 1 chọn giữ)
   - Ngoại lệ: Codex chỉ kể đến trận Phong Châu, bỏ đoạn Xương Cuồng tế "tộc người trong núi" và nhánh Nhâm Ngao, vì cả hai thuộc danh sách loại trừ §7.
   - **Mặc định: có.** Ghi vào DECISION_LOG, kèm chữ ký cố vấn.
3. **"Trận bến" mô-đun và sàn phạm vi.** Có thêm Trận bến vào cả hai sàn của VERDICT (`finale_after = ch_phudong | ch_bavi`), chấp nhận chi phí làm lại khi đổi cấu hình, không?
   - **Mặc định: có**, kèm điều kiện cổng 7 (spike boss rễ) đạt trước.
4. **Nghề nhà.** VERDICT §5 đề xuất dòng họ **thợ đúc**; V2 và V3 dùng **nhà đò**, còn lò đúc thuộc làng.
   - **Mặc định: giữ nhà đò.** Bảo khí đúc ở lò làng.
   - Sửa GDD §4 ("lò rèn, đền") và ghi lệch so với VERDICT vào DECISION_LOG.
5. **Danh sách tên game.**
   - **Mặc định:** loại "Rễ Cuồng" và "Cán Lõi"; "Trống Bến" chỉ làm tên dự phòng; "Người Giữ Bến" kèm phụ đề làm ứng viên chính.
   - Tên phản diện mới phải qua thử đọc ba giọng Bắc, Trung, Nam.

---

## 6. Kết luận

**KHÔNG ĐẠT** ở dạng hiện tại (giá trị tối đa mức B; mức A cần cố vấn sử học người thật ký).

- V3 đã xử lý **thật** phần lớn phát hiện của REVIEW_V2. R2-01 đến R2-14 và R2-16 đều có nội dung cụ thể, không chỉ tuyên bố. Riêng R2-15 và R2-20 mới đạt một phần.
- Lý do chặn là **R3-02**. Phương án (b) được chọn trên dữ liệu M004 mức C mà không tra nguồn. Tra nhanh cho thấy truyện nối tiếp (Xương Cuồng) chạm danh sách loại trừ, và RESEARCH_PROTOCOL §6 lại buộc Codex ghi đủ dị bản. Lỗi này chỉ chặn việc **chốt Rễ Cuồng làm mặc định**, không chặn phần còn lại của thiết kế.
- Cách sửa rẻ nhất: cắt quan hệ phả hệ với Mộc Tinh (câu PO số 1) và đổi tên phản diện (R3-01).

Sau đó bản thiết kế lên **ĐẠT CÓ ĐIỀU KIỆN** nếu xử lý thêm:
1. R3-01, N3-01, N3-02: đổi tên phản diện; loại "Rễ Cuồng" và "Cán Lõi" khỏi danh sách tên game.
2. R3-03: cao trào không dùng trống (nhất là khi còn giữ quan hệ với Mộc Tinh).
3. R3-04: tạo hình không mang chất núi/đất; cân nhắc bỏ cảnh mở ở chương Ba Vì; thêm câu hỏi bác bỏ khi tham vấn Ba Vì và cố vấn thờ Mẫu.
4. R3-07: tính chi phí map hub và Trận bến.
5. PO trả lời các câu ở mục 5.

Các mục Nhẹ sửa cùng V4.

---

## 7. Nguồn đã tra (trích đoạn WebSearch, chưa đọc toàn văn)

- Quỷ Xương Cuồng, vi.wikipedia: https://vi.wikipedia.org/wiki/Qu%E1%BB%B7_X%C6%B0%C6%A1ng_Cu%E1%BB%93ng (WebFetch bị chặn)
- Mộc Tinh (truyện cây chiên đàn thành tinh): https://vietmyth.vn/en/entries/moc-tinh/
- Đặng Tiến, "Cọp, từ Mộc Tinh đến ông Ba Mươi": https://www.diendan.org/phe-binh-nghien-cuu/cop-tu-moc-tinh-111en-ong-ba-muoi
- Dẫn nhập phân tích LNCQ: https://thuvien4u.com/linh-nam-chich-quai/dan-nhap-phan-tich-linh-nam-chich-quai/
- https://vietsuluoc.blogspot.com/2016/12/lac-long-quan-giet-moc-tinh.html
- http://trungcoly.blogspot.com/2012/02/lac-long-quan-diet-moc-tinh-tai-phong.html
- https://gamek.vn/giai-thoai-ly-ky-ve-quy-thanh-xuong-cuong-va-tuc-hien-te-cua-nguoi-viet-co-20200513110512716.chn
- https://anh135689999.violet.vn/entry/than-tich-nuoc-nam-cuoc-chien-voi-quy-xuong-cuong-yeu-quai-manh-nhat-nuoc-nam-13585588.html
- https://huvi.wordpress.com/2018/05/17/than-xuong-cuong-va-thanh-khong-lo/
- mythic-pages (tóm tắt: trăm ngày, chạy về tây nam, Văn Du Tường): https://mythic-pages.pages.dev/en/entries/ngu-tinh (WebFetch bị chặn)
- RootRage (Global Game Jam): https://v3.globalgamejam.org/node/93949
- Bến Âu Lâu: https://travelviet.net/en/relics/yen-bai-74/historical-relic-of-ben-au-lau

Các nguồn trên phần lớn là blog và trang tổng hợp, nên **không dùng làm căn cứ canon**. Mọi chi tiết phải đối chiếu bản dịch LNCQ (RESEARCH_PROTOCOL §5) trước khi vào dữ liệu.
