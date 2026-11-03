# Phản biện Story Bible v1 và Nghiên cứu tên game

Người duyệt: `historian-verifier` (AI), kiêm kiểm tra nhất quán thiết kế · Ngày: 2026-11-03

**Đối tượng:**
- A. `research/narrative/STORY_BIBLE_V1.md`
- B. `research/narrative/NAMING_STUDY.md`

**Đối chiếu với:**
- `CLAUDE.md`, `docs/RESEARCH_PROTOCOL.md`
- `debate/VERDICT.md` (§3 đã sửa theo D-017; C1–C6) và `villain_debate/VERDICT.md` (đã chốt; V1–V9)
- `villain_debate/R3_JUDGE_*.md`, `protagonist/REVIEW_V3.md` (R3-01…R3-17, N3-01…N3-05), `protagonist/REVIEW_V2.md` (R2-04, R2-07, R2-18), `protagonist/CRITIQUE_CULTURE.md` (R9)
- `research/expert/GAME1_LORE_DOSSIER.md` cùng `_REVIEW.md`, `research/data/myths.json`

**Giới hạn:**
- Nguồn ngoài chỉ tra qua **trích đoạn WebSearch**, chưa đọc toàn văn. Không tìm thấy không có nghĩa là không có.
- Nhận định về phương âm và tiếng lóng là hiểu biết sẵn có, **cần thử đọc với người bản ngữ** ở ba miền.
- Kết luận có giá trị tối đa **mức B**. Mức A cần cố vấn sử học người thật ký.

**Lint:** `python3 tools/research_tool.py lint` cho **0 lỗi, 7 cảnh báo** (T002, T009, T017, T019, T029, T031, M016). Đây là các cảnh báo cũ về dòng nguồn, không liên quan Story Bible. Story Bible không sửa dữ liệu. Điều kiện C1 đã có trong dữ liệu: `worshipped` có luật lint ở `tools/research_tool.py:73-81`; M001, M005, M007, M015 đã bỏ việc trao thần khí; M015 đã là `high`.

---

## 1. Đối chiếu điều kiện: xử lý thật hay chỉ tuyên bố?

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| V1 | **Đạt** | Chốt được vớt từ vực sông. Không mộ, không hài cốt, không khuôn. Riêng "Thạp nhà" xem SB-08 |
| V2 | **Hình thức, hở ở sàn** | `ch_phudong` không có mảnh. Nhưng `ch_ben` ở cấu hình sàn và cutscene nấu chảy của K1-nhẹ đưa khoen vào ngay đời Gióng (SB-02). Bảo khí "Vòng Xương Thú" lại là một chiếc vòng trong chương cấm khoen (SB-06). Cơ chế ma lực của khoen chưa định nghĩa, nên vẫn dễ bị đọc là bùa yểm (SB-03) |
| V3 | **Đạt** | Rết bị hạ trước lũ, mảnh cắm giữa hai đốt lưng, không chung khung hình với thần |
| V4 | **Đạt** | Lái đò làm khoen; thợ đúc làng đúc Mũi Sào và nấu chảy mảnh |
| V5 | **Một phần** | Đã đổi rig sang Lợn Lòi Đầm và Rết Lớn (VERDICT đã ghi nhận). Nhưng slice chỉ có Lợn Lòi, **không có Rết**, nên câu "slice chứng minh V5" là nói quá (SB-04) |
| V6 | **Một phần** | Lợn Lòi và Hồ Tinh dùng chung skeleton. **Gấu Già**, boss cuối và là boss của trailer, không có trong slice (SB-04) |
| V7 | **Đạt về thủ tục** | `ch_ben` chỉ làm sau khi có giờ công chương 1 và graybox hub; có phương án lùi K1-nhẹ. Nhưng bản lùi ở sàn vướng V2 (SB-02) |
| V8 | **Đạt** | Có câu một dòng và có đo trong slice. Chưa ghi rõ câu hỏi bác bỏ "gợi phe vị thần nào?" trong playtest slice (SB-16) |
| V9 | **Đạt** | Khoen là `binding_item`, có test softlock, có cố vấn nghề đúc |
| C1 | **Đạt** (dữ liệu) | Xem phần Lint ở đầu |
| C2 | **Phần lớn đạt** | Danh sách đã bổ sung Hiền Lương, Nội Bình Đà, Quán Thánh, Phủ Tây Hồ, dân tộc học, nghề đúc. **Thiếu nơi thờ Linh Lang** (giao long Hồ Tây) (SB-01) |
| C3 | **Đạt** | "Giặc Ân" chỉ ở Codex; Ba Vì không có sinh vật nước; Hùng Vương không lộ mặt |
| C4 | **Hình thức** | Slice có nước dâng nhưng không nhắc lại ngưỡng (VRAM ≤ 7 GB, hitch ≤ 50 ms, RTX 5050) và phương án lùi "chỉ cutscene" (SB-04) |
| C5 | **Một phần** | Có giờ công chương 1. Spike thuyền thiếu ngưỡng "game feel ≥ 4/5 và cổng hiệu năng" (SB-04) |
| C6 | **Một phần** | Có câu hỏi "cướp công". Trailer lại dựa vào Gấu Già, trong khi `ch_ben` có thể bị V7 cắt (SB-16) |
| R3-01, R3-02, R3-17, N3-01, N3-02 | **Đạt** | Đã cắt M004, Rễ Cuồng, Cán Lõi. Riêng danh sách cập nhật M004 bị sai (SB-13) |
| R3-03 | **Đạt, còn đuôi** | Đã cắt Mộc Tinh. Trống ở hub chưa ghi là trống gỗ bịt da (CRITIQUE_CULTURE R9, SB-08) |
| R3-04 | **Một phần** | Các thú rừng–núi (Rết ở Ba Vì, Gấu vào rừng) vẫn đặt cạnh "người sông". Tham vấn chỉ hỏi chung chung (SB-11) |
| R3-05, R3-06, R3-09, R3-13, R3-14, R3-15, R3-16 | **Đạt** | |
| R3-07 | **Đạt về chi phí, tái phát R2-04** | Hub là một cell ngay trong map chương 1, nhìn ra "lòng đầm, về sau là Hồ Tây" (SB-01) |
| R3-08 | **Đạt** | Ngân sách ≤ 0,3, ghi rõ ĐỀ XUẤT |
| R3-10 | **Đạt** | Đã ghi "xương thú" và câu Codex trung tính |
| R3-11 | **Đạt về chữ** | Không còn cáo, đã đổi tên Cá Ó Gai. Nhưng giao long ở vùng Hồ Tây đụng Linh Lang (SB-01); dáng cá ó gần "cá-rắn" (SB-10) |
| R3-12 | **Một phần** | Xem SB-13 |

---

## 2. Bảng phát hiện, phần A: Story Bible

| ID | Mức | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|---|
| SB-01 | **Chặn** (chỉ chặn việc chốt bố cục hub và slice) | **Hub đặt sát Hồ Tây, làm tái phát R2-04.** **(a)** §3 đặt hub là "cell ở mép sông của chính map chương 1", có "đồi che lòng đầm (về sau là Hồ Tây, M003)". Về địa lý trong truyện, bến Lau nằm ngay bờ sông cạnh Hồ Tây, tức vùng Quảng An–Nghi Tàm–Yên Phụ, nơi có Phủ Tây Hồ và gần Quán Thánh. Câu Codex "bến Lau không ở Hồ Tây ngày nay" vì thế chỉ đúng nửa. Trận cuối `ch_ben` cũng diễn ra ở đây, đúng điều R2-04 cảnh báo. R3-07 chỉ đề xuất **dùng lại tài nguyên map nhưng đổi địa danh**, không đề xuất dùng lại chính vị trí. **(b)** Phát hiện mới: theo thần tích Linh Lang Đại Vương (một trong Tứ trấn Thăng Long, đền Voi Phục), mẹ ngài thụ thai khi tắm ở Hồ Tây và bị giao long quấn; ngài hóa giao long hoặc thuồng luồng bơi ra Hồ Tây; một số bản còn nói ngài là con Long Quân (trích đoạn). Trong khi đó, slice ở chính vùng này có **"giao long dáng cá sấu"** và **mini-boss "giao long đầu đàn"**, còn hub có sự kiện **"thuồng luồng quấy bến"**. Người chơi giết giao long ngay hồ của một thần giao long đang được thờ. Luật "không quái thân rắn hay rùa" (R2-04) chỉ né được tạo hình, không né được tên gọi và vùng đất. **(c)** Theo M003, đầm chỉ hình thành **sau khi** Lạc Long Quân dâng nước phá hang. Hub nhìn ra "lòng đầm" ngay từ đầu chương 1 là trái truyện | Story Bible §3 (Hub), §5, §6; REVIEW_V2 R2-04; M003 `summary`, `worship_sites`; hatinh.gov.vn (Linh Lang); thanglong.chinhphu.vn (Voi Phục); baomoi.com (thẻ "rắn thần"); vinwonders.com (Phủ Tây Hồ, bán đảo Quảng An) | **(1)** Hub là một level riêng dựng từ bộ asset của chương 1 (đúng ý R3-07, chi phí gần như nhau). Trong truyện, hub ở "khúc sông xuôi, cách đầm nhiều ngày đò" [SÁNG TẠO], không nhìn thấy đầm. Bỏ câu "về sau là Hồ Tây". **(2)** Trong `ch_longbien` và hub, không dùng tên "giao long" hay "thuồng luồng". Đổi thành thú [SÁNG TẠO] (ví dụ "sấu đầm"), Codex ghi hư cấu. Chuyển sự kiện "thuồng luồng quấy bến" sang vùng sông của `ch_phudong`, hoặc chỉ cho xảy ra ở hub khi hub đã tách khỏi vùng hồ. **(3)** Thêm vào C2 nơi thờ Linh Lang (đền Voi Phục và các đền Linh Lang quanh Hồ Tây; danh sách đền cần tra). **(4)** Đối chiếu thần tích Linh Lang trước khi chốt quái chương 1 |
| SB-02 | **Nghiêm trọng** | **Luật áp theo ID chương, nên chính `ch_ben` thành lỗ lách luật.** §5 viết: "`ch_ben` là chương riêng, nên luật áp theo chương không bị lách." Thực tế là ngược lại. Vì là chương riêng, `ch_ben` không chịu luật V2 của `ch_phudong` hay luật C3 của `ch_bavi`. **(a)** Ở cấu hình sàn (`finale_after = ch_phudong`), Bương đánh Gấu Già đeo khoen **ngay sau chương Gióng, cùng đời Hùng Vương thứ 6**. Đây đúng là điều giám khảo Văn hóa muốn tránh: thú mang kim loại trong thời ngựa sắt. **(b)** K1-nhẹ ở sàn: "sau boss cuối của bản ship có cutscene nấu chảy mảnh". Boss cuối khi đó là Giáp Xương, nên mảnh khoen xuất hiện **trong chính `ch_phudong`**, trái cả chữ của V2. **(c)** Sự kiện thuồng luồng chỉ "tắt khi đang ở `ch_bavi`". Sang `ch_ben`, ngay sau lũ, nó bật lại, nên thủy quái xuất hiện trong không khí hậu lũ của Thủy Tinh | Story Bible §3 (Vảy), §4 (K1-nhẹ), §5; R3_JUDGE_CULTURE §2 (mảnh ở Phù Đổng gợi ngựa sắt); VERDICT phản diện V2 | Áp luật theo **đời và theo chương liền kề**, không chỉ theo ID. Thêm trường `era` và `follows_chapter` vào dữ liệu, kèm test. **(a)** Ở sàn, `ch_ben` phải cách `ch_phudong` một quãng thời gian có kịch bản ("nhiều năm sau"), có cảnh mở ở hub, không có hình ảnh Gióng, ngựa hay tre. Cần giám khảo Văn hóa hoặc cố vấn ký. **(b)** K1-nhẹ ở sàn: cutscene nấu chảy đặt ở hub sau quãng thời gian đó, không gắn với `ch_phudong`. **(c)** Tắt sự kiện thuồng luồng từ khi mở `ch_bavi` tới hết game |
| SB-03 | **Nghiêm trọng** | **Cơ chế "ma lực" của khoen chưa được định nghĩa.** Một khoen đồng đúc vụng mà làm thú nghe lời, làm thú hóa dữ qua nhiều đời, và "giữ con gấu không chết được" từ thời Lạc Long Quân đến đời Nứa. Như vậy khoen có phép, nhưng tài liệu không nói phép từ đâu ra. Khoảng trống này để người chơi tự lấp bằng **bùa, yểm, thầy phù thủy**, tức đúng mô-típ V2 muốn tránh. Nó cũng khiến đồ đúc mang tà lực, đụng V4 và V9. Thêm một lỗ logic: mảnh "trôi theo sông", nhưng boss Ba Vì là rết trên núi, ở **thượng nguồn** so với một bến gần Hồ Tây | Story Bible §1, §4; VERDICT phản diện V2, V4; R3_JUDGE_CULTURE §0; vị trí Ba Vì ở thượng nguồn sông Hồng (hiểu biết sẵn có) | Ghi một luật [SÁNG TẠO] trong một câu, không có bùa, chú hay chữ. Ví dụ: "khoen trói ý muốn của thú bằng chính nỗi sợ và cơn đau; vật không có phép, cái ác là ý muốn sở hữu của người đeo". Codex ghi thẳng: "không phải bùa, không ai yểm". Thêm cách mảnh lan đi: thú nuốt phải, chim tha, lũ cuốn ngược. Tránh mọi hình thức buôn bán (lớp "phường" đã bị loại). Nếu giữ chi tiết gấu sống qua nhiều đời: Codex ghi [SÁNG TẠO] và hỏi cố vấn |
| SB-04 | **Nghiêm trọng** | **Slice không chứng minh được những gì §6 nói.** **(a)** V5 cần **2 rig**: Lợn Lòi và Rết. Slice chỉ có Lợn Lòi. Rết, với nhiều đốt và mảnh cắm giữa hai đốt, là rig rủi ro nhất. **(b)** V6 nói "các boss bốn chân (Cáo, Gấu hoặc Lợn Lòi, thú đầu tiên)". Gấu là thú đi cả bàn chân và có thể đứng thẳng, nhưng không có trong slice. **(c)** C4 không nhắc lại ngưỡng đo và phương án lùi. **(d)** Spike thuyền (C5) thiếu ngưỡng. **(e)** Rig cá ó (dẹt, bơi) là loại rig thứ ba, nằm ngoài cả V5 lẫn V6 | Story Bible §6 "Slice chứng minh", §7; VERDICT phản diện V5, V6; VERDICT cấu trúc C4, C5; R3_JUDGE_FEASIBILITY §2 | Tách **spike map GĐ2**, nằm ngoài slice: graybox Rết với thao tác cạy, và Gấu chạy trên họ skeleton bốn chân (locomotion và tư thế đứng). Sửa §6 thành: slice chứng minh **C4, C6, V8, P-8, C5 (giờ công)**, cùng V5 và V6 **trên Lợn Lòi**. Chép nguyên ngưỡng của C4 và C5 vào §7. Đưa rig cá ó vào spike thuyền |
| SB-05 | **Nghiêm trọng** (cần PO) | **Ranh giới "không có trận đánh người" (D-017) còn mờ.** **(a)** Slice có "người bị mê **khống chế** không sát thương": dù không gây sát thương, người chơi vẫn đánh người. **(b)** Giáp Xương là yêu ma **hình người, đi bộ, mặc giáp**, cầm đầu đội tiền đạo của "giặc", và Codex đặt ngay cạnh mục "giặc Ân". **(c)** Quái thường của `ch_phudong` chưa được liệt kê, nên rất dễ thành lính dáng người | Story Bible §5 `ch_phudong`, §6; VERDICT cấu trúc §3 (sửa D-017); R3-10 | Người bị mê: giải bằng **tương tác phi chiến đấu** (phá ảo ảnh, gọi tên, kéo ra), không dùng nút đánh. Giáp Xương: dáng phi nhân rõ ràng (khung thú, bò hoặc chồm), không cầm vũ khí người. Liệt kê quái `ch_phudong` và cấm quái dáng lính. PO định nghĩa "trận đánh người" (câu PO số 2) |
| SB-06 | Nhẹ | **Luật Bảo khí tự mâu thuẫn.** §2 ghi "Bảo khí chỉ làm từ phần thú tự rụng khi được cạy". Nhưng **Vòng Xương Thú** lấy từ Giáp Xương, không được cạy mà rã thành tro. **Nanh Đầm** lấy từ "nanh gãy", không phải "tự rụng". Ngoài ra, tên "**Vòng**" đặt cho một vật trong đúng chương cấm khoen | Story Bible §2, §5; VERDICT phản diện §3 (Bảo khí) | Viết lại luật: "boss được cạy cho phần tự rụng; boss không được giải thoát cho phần còn lại sau khi rã". Đổi "Vòng Xương Thú" thành tên không có vòng hay khoen (ví dụ "Tấm Xương Thú"). Đổi "nanh gãy" thành "nanh rụng sau khi được cạy" |
| SB-07 | Nhẹ | **Gấu đeo khoen gợi gấu nuôi lấy mật.** Hình ảnh một con gấu bị người bắt, đeo vòng kim loại để "giữ bến" gợi ngay chuyện nuôi nhốt gấu lấy mật. Hà Nội từng là điểm nóng: năm 2021 có 161 trên 346 cá thể nuôi nhốt (theo ENV, trích đoạn). Lớp "phường" đã bị loại chính vì gợi buôn động vật hoang dã. Ở đây liên tưởng có thể tích cực (giải cứu), nhưng là vấn đề thời sự, và trailer lại dùng Gấu Già | VERDICT phản diện §2; R3_JUDGE_CULTURE §2; baophapluat.vn ("Nuôi nhốt gấu lấy mật: Hà Nội vẫn là 'điểm nóng'"); tuoitre.vn (Trung tâm Cứu hộ Gấu Tam Đảo) | Không lồng sắt, không vết thương vùng bụng, không chi tiết mật. Thêm vào tham vấn câu hỏi: "Gấu Già có gợi gấu nuôi lấy mật không, và có nên dùng nó trên trailer không?". Cân nhắc đổi loài cho thú đầu tiên, miễn là vẫn chung họ skeleton bốn chân |
| SB-08 | Nhẹ | **Mũi Sào, Thạp, trống: có hợp thời không?** **(a)** Nông cụ đồng có thật trong văn hóa Đông Sơn: rìu, lưỡi cày và thuổng đồng ở di chỉ Phôi Phối–Bãi Cọ, Hà Tĩnh (trích đoạn). Vậy kết "lưỡi cày, thuổng đồng" có cơ sở. **(b)** Mũi Sào bịt đồng hợp lý trong thế giới game, nhưng **chưa tra** được hiện vật Đông Sơn tương ứng. Vấn đề lớn hơn là niên đại: Cói sống thời Lạc Long Quân, **trước** Văn Lang. Gán cho thời này đồ đúc đồng mang dáng Đông Sơn (Mũi Sào, giáo đồng, rìu xéo, thạp) là ngụ ý thời Lạc Long Quân và Văn Lang chính là Đông Sơn (J-06). Theo hồ sơ, bằng chứng đúc đồng bản địa rõ nhất chỉ có từ giai đoạn Đồng Đậu. **(c)** Thạp đồng từng được dùng **làm quan tài**: thạp Hợp Minh (Yên Bái) còn bộ xương một em bé (trích đoạn). "Thạp nhà" đựng vật truyền đời vì thế nằm sát luật V1. **(d)** Trống lớn dần ở hub chưa ghi chất liệu | baolaocai.vn (thạp Hợp Minh); vietnamnews.vn (Bảo tàng Hà Tĩnh, 35 hiện vật); dossier §9.1; CRITIQUE_CULTURE R9; LINEAGE_DESIGN_V2 (rủi ro J-06) | Codex của Mũi Sào và nông cụ ghi: "[SÁNG TẠO]; thế giới game dùng mỹ thuật Đông Sơn; theo khảo cổ, nghề đúc Đông Sơn có niên đại…; thời truyền thuyết không đồng nhất với một văn hóa khảo cổ". Thạp nhà: làm bằng gốm hoặc đồng trơn, không bao giờ nhắc mai táng. Trống hub: **trống gỗ bịt da**, không mặt trời, không chim Lạc. Đối chiếu ARC_DS về bịt cán đồng |
| SB-09 | Nhẹ | "Đấu ở bến đò làng [SÁNG TẠO], xa đền Phù Đổng và đền Sóc", nhưng chương lại tên Phù Đổng, và làng Phù Đổng nằm bên sông Đuống (hiểu biết sẵn có, cần đối chiếu). Người chơi sẽ hiểu bến đò này là bến của chính làng Phù Đổng, tức gần đền | Story Bible §5 `ch_phudong`; dossier §5.2 | Đặt tên làng [SÁNG TẠO] riêng ("một làng ven sông, cách Phù Đổng…"). Codex ghi rõ đây không phải làng Phù Đổng |
| SB-10 | Nhẹ | **Cá Ó Gai.** Tra nhanh không thấy tục thờ cá ó hay cá đuối; chỉ thấy cá Ông (cá voi) và "cá bà". Nhưng cá ó có đuôi dài như roi, dễ gợi "cá-rắn" (魚蛇) của chính Ngư Tinh, tức lặp lại lỗi R2-18. Cá dẹt đánh trên sàn thuyền neo cũng là bài toán animation riêng | vjol.info.vn, hoianheritage.net (tín ngưỡng cá Ông); REVIEW_V2 R2-18; M002 | Đuôi ngắn, thân dẹt rõ, không có đoạn thân dài. Codex ghi [SÁNG TẠO]. Khi tham vấn vùng biển, hỏi thêm về tục kiêng cá đuối và cá ó ở địa phương (chưa tra) |
| SB-11 | Nhẹ | **Thờ gấu, lợn lòi, rết (§9 Story Bible):** tra nhanh **không thấy** tục thờ riêng ở người Kinh. Lợn chỉ xuất hiện như lễ vật trong các lễ hội: La Phù (thờ Tịnh Quốc Tam Lang, tướng thời Hùng Vương) và Ném Thượng. Gấu: chưa tra tô-tem của các dân tộc thiểu số. Rết: không thấy truyện nào về Tản Viên diệt rết. Còn lại rủi ro R3-04: Rết là sinh vật của rừng núi, phá làng ở chân núi Tản Viên ngay trước lũ, nên có thể bị đọc là "thú của núi thánh" | vietnamnet.vn (La Phù, Ném Thượng); vnexpress.net và baophapluat.vn (thờ hổ, chó đá; không có gấu); kết quả tìm "Tản Viên rết": không thấy | Chưa phải lý do để bỏ boss. Ghi vào §9 là "**tra nhanh không thấy, chưa loại trừ**". Hỏi cố vấn dân tộc học về tô-tem gấu và lợn rừng ở miền núi phía Bắc. Thêm câu bác bỏ khi tham vấn Ba Vì: "Rết có bị đọc là thú của núi Tản hay phe Sơn Tinh không?" |
| SB-12 | Nhẹ | **Logline.** Qua phép thử **một câu** về hình thức (một câu, ba vế). Nhưng: **(a)** thiếu cao trào (người lặp lỗi, con thú đầu tiên), nên đọc như một tiền đề hơn là một xung đột; **(b)** không bán quái vật (C6); **(c)** cụm "khoen **đồng**" đưa chữ "đồng" lên câu tiếp thị, trái nguyên tắc của NAMING_STUDY (tránh "đồng" vì V4, V9); **(d)** §1 viết "Ba đời nhà bến Lau", có thể bị hiểu là bà, mẹ, con, trái G-02 ("chỉ nói nhiều đời sau"). Câu V8 thì đạt | Story Bible §1, §2; NAMING_STUDY §5; VERDICT C6 | Gợi ý: "Qua nhiều đời, một nhà đò bến Lau cạy những mảnh khoen vỡ khỏi các quái thú hóa dữ, cho tới khi một người cùng bến tìm lại chiếc chốt cũ và định trói con thú đầu tiên." Đổi "Ba đời" thành "ba người, nhiều đời cách nhau" |
| SB-13 | Nhẹ | **Danh sách cập nhật (R3-12) sai hoặc thiếu.** **(a)** M004 không có chữ "Rễ Cuồng". Việc thật sự cần làm là ghi M004 `gameplay` là "không dùng ở Game 1". **(b)** Hồ sơ §8 còn dòng "Cáo con" (trái R3-11), "Mộc Tinh con" và "kẻ cướp lợi dụng lũ (người)" (trái D-017). **(c)** §10 ghi "V5 cần người điều phối ghi nhận", nhưng VERDICT đã ghi rồi | `grep` trên `myths.json`; dossier dòng 198–206; VERDICT phản diện V5 | Sửa danh sách cho đúng. Cập nhật dữ liệu theo quy trình người viết khác người duyệt |
| SB-14 | Nhẹ | **Thứ tự sản xuất.** `ch_ben` đứng thứ 3, trước `ch_bavi` (phạm vi tối thiểu), dù `ch_ben` vẫn còn chờ PO. Việc này hợp với cấu hình sàn, nhưng là dùng ngân sách cho phần chưa duyệt trước phần đã cam kết | Story Bible §5; VERDICT cấu trúc §3 | Đưa vào câu PO số 3 |
| SB-15 | Nhẹ | Tên chương "Đầm Xác Cáo" gọi theo kết quả của chính chương (đầm thành hình sau khi Hồ Tinh chết). Làm tên chương thì chấp nhận được, nhưng là tiết lộ trước | M003 | Codex ghi "tên gọi về sau" (gộp với SB-01 (c)) |
| SB-16 | Nhẹ | **Trailer và playtest.** Trailer bán Gấu Già, trong khi `ch_ben` có thể bị V7 cắt; và Giáp Xương, thuộc chương nhạy cảm cao. Playtest slice chưa ghi câu bác bỏ "gợi phe vị thần nào?" | Story Bible §6, §7; VERDICT phản diện V7, V8 | Trailer chỉ dùng nội dung trong phạm vi sàn và chỉ làm sau C2. Thêm câu bác bỏ của V8 vào kịch bản playtest slice |

---

## 3. Bảng phát hiện, phần B: Nghiên cứu tên game

### 3.1 Kiểm tra trùng (WebSearch, 2026-11-03; chỉ là sơ bộ)

| Truy vấn | Kết quả |
|---|---|
| "Ferrykeepers" / "The Ferrykeeper" game | Không thấy game nào. Gần nhất vẫn là *The Ferryman* (itch.io), board game *The Ferrymen* (2015), *Ferry Forge*. Khớp với NAMING_STUDY |
| "Beasts Unbound" Steam | Không thấy trùng chính xác. Có các tên gần: *BEAST*, *Beast Brigade*, *They Are Beasts* |
| "người giữ bến" | Không thấy tác phẩm nào cùng tên. Tên gần nhất là phim và tiểu thuyết *Bến không chồng*, khác nghĩa |
| "Khoen" (tiếng Thái) | Tộc **Tai Khün** (ไทเขิน, Kengtung, Shan) có tên tiếng Thái viết là เขิน. Theo quy tắc RTGS (hiểu biết sẵn có, chưa tìm được nguồn ghi đúng chữ "Khoen"), เขิน chuyển tự thành "khoen". Ngoài ra, เขิน cũng là tính từ thông dụng nghĩa là "ngượng, thẹn" (hiểu biết sẵn có) |

Không thay thế tra cứu nhãn hiệu chính thức (Cục SHTT, USPTO, EUIPO, WIPO).

### 3.2 Phát hiện

| ID | Mức | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|---|
| NB-01 | Nhẹ (Nghiêm trọng nếu "KHOEN" đứng một mình) | **"KHOEN" trùng tên một tộc người và một từ tiếng Thái.** Tên ứng viên #15 *KHOEN: The Ferrykeepers* đưa "Khoen" lên làm chữ thương hiệu quốc tế. Có thể trùng cách chuyển tự tên tộc Tai Khün (ไทเขิน), và trong tiếng Thái lại là từ "ngượng, thẹn". NAMING_STUDY chỉ xét nhầm lẫn với khèn/khaen | en.wikipedia.org/wiki/Khün_language; wikiwand Tai Khün; quy tắc RTGS (hiểu biết sẵn có) | Không dùng "KHOEN" làm chữ thương hiệu quốc tế. #2 chỉ dùng "Khoen Vỡ" ở bản `vi` nên rủi ro thấp. Nhờ người nói tiếng Thái kiểm tra |
| NB-02 | Nhẹ | **Phương âm giọng Nam bị đánh giá thiếu.** NAMING_STUDY tự đặt tiêu chí T4 có tính gộp gi/d/v, nhưng chỉ áp cho "giữ". Ở giọng Nam, "v" đọc như "d/gi", và thanh hỏi với ngã gộp làm một. Vì vậy "**Khoen Vỡ**" nghe gần "**khoen dở**" (dở = kém, tệ), và cả tên #2 có thể nghe thành "Người **Dữ** Bến: Khoen **Dở**". Dễ thành meme kiểu "game dở". Bỏ dấu "Khoen Vo" thì vô hại | NAMING_STUDY §2 dòng #2; hiểu biết sẵn có, cần thử đọc | Thử đọc ba giọng có hỏi riêng câu này. Phụ đề `vi` dự phòng không chứa âm v/d (ví dụ "Mảnh Khoen", nhưng phải cân với luật "không đếm mảnh") |
| NB-03 | Nhẹ | **Độ khớp với Story Bible.** "Giữ bến" chính là **động cơ của cả hai kẻ gây lỗi**: người làm khoen đeo khoen cho gấu non "để giữ bến"; người lặp lỗi muốn "thú giữ bến để khỏi canh đêm". Tên "Người Giữ Bến" vì thế có thể là chủ đề rất hay (người phải tự giữ bến, không trói thú làm thay), nhưng cũng có thể được hiểu là nói về kẻ gây lỗi. Story Bible chưa khai thác ý này. Phụ đề EN *Beasts Unbound* có hai nghĩa ("được giải thoát" hoặc "sổng ra"); với C6 thì có lợi | Story Bible §4; NAMING_STUDY §5 | Nếu chọn #1 hoặc #2: thêm vào Story Bible một câu chủ đề (ví dụ "giữ bến bằng tay mình, không bằng khoen"), và thoại cuối dùng cụm này. Giữ "đồng" và "Ring" ngoài tên. Thống nhất logline (SB-12) |
| NB-04 | Nhẹ | **Đối chiếu điểm.** Tôi chấm lại độc lập (bảng 3.3). Thứ hạng đầu không đổi; #15 và #1 giảm điểm. Mọi chênh lệch đều dưới 5 điểm, nên ba tên vẫn coi như ngang nhau. Giới hạn "một agent chấm" của NAMING_STUDY vẫn còn: tôi cũng là AI | §3.3 | PO chọn sau buổi thử đọc ba giọng, không chỉ dựa vào điểm |
| NB-05 | Nhẹ | "Nguoi Giu Ben" khi bỏ dấu là vô hại. Nhưng "Người Giữ Bến" là cụm từ thông dụng, khó chiếm kết quả tìm kiếm (T7). Lại đã có một action RPG thần thoại Việt đi trước (*Purge Of Evil*) | NAMING_STUDY §3 | Bản `vi` cần phụ đề để tìm kiếm được. Ưu tiên #2 hơn #1 |

### 3.3 Chấm lại độc lập (cùng thang T1–T7 của NAMING_STUDY)

| # | Tên | T1 | T2 | T3 | T4 | T5 | T6 | T7 | **Tổng** | NAMING_STUDY |
|---|---|---|---|---|---|---|---|---|---|---|
| 2 | Người Giữ Bến: Khoen Vỡ / *The Ferrykeepers: Beasts Unbound* | 5 | 3 | 4 | **3** (NB-02) | 4 | 4 | 4 | **78** | 81 |
| 15 | Khoen: Người Giữ Bến / *KHOEN: The Ferrykeepers* | 5 | 2 | 5 | 4 | **3** (NB-01) | 3 | **3** | **74** | 79 |
| 1 | Người Giữ Bến / *The Ferrykeepers* | 3 | 3 | 5 | **4** ("dữ") | 5 | 3 | **2** (cụm thông dụng) | **73** | 78 |

---

## 4. Kết luận

**A. Story Bible v1: KHÔNG ĐẠT ở dạng hiện tại.** Giá trị tối đa mức B.
- Bản này xử lý **thật** phần lớn các điều kiện: V1, V3, V4, V9, C1, C3 và đa số mã R3. Nó không chỉ tuyên bố.
- Lý do chặn là **SB-01**. Hub và trận cuối được đặt lại sát Hồ Tây, làm tái phát R2-04, đồng thời lộ ra xung đột mới với tín ngưỡng Linh Lang (giao long Hồ Tây) ngay trong vertical slice. Lỗi này chỉ chặn việc **chốt bố cục hub và slice**. Cách sửa rẻ: hub thành level riêng dựng từ cùng bộ asset, và đổi tên quái chương 1.
- Sau khi sửa SB-01, bản lên **ĐẠT CÓ ĐIỀU KIỆN** nếu xử lý thêm:
  - SB-02: luật theo đời và chương liền kề; bản sàn và K1-nhẹ không đưa khoen vào đời Gióng.
  - SB-03: một câu luật cho cơ chế khoen, không có bùa yểm.
  - SB-04: spike Rết và Gấu tách khỏi slice; chép lại ngưỡng của C4 và C5.
  - SB-05: PO định nghĩa "trận đánh người".
- Các mục Nhẹ sửa trong v2.
- Không thấy lựa chọn nào của người chơi làm thay đổi sự kiện lịch sử đã xác minh. Không có nội dung `[SỬ LIỆU]` mới.

**B. Nghiên cứu tên game: ĐẠT CÓ ĐIỀU KIỆN.**
- Khuyến nghị "**Người Giữ Bến: Khoen Vỡ**" / *The Ferrykeepers: Beasts Unbound* vẫn đứng đầu sau khi chấm lại. Tra lại không thấy trùng.
- Điều kiện:
  1. Thử đọc ba giọng, kiểm riêng "Khoen Vỡ" nghe thành "khoen dở" và "Giữ" thành "Dữ" (NB-02).
  2. Loại #15 nếu "KHOEN" làm chữ thương hiệu quốc tế (NB-01).
  3. Luật sư SHTT tra nhãn hiệu (N-06 vẫn mở).
  4. Story Bible thêm câu chủ đề "giữ bến" và sửa logline cho khớp với tên (NB-03, SB-12).

---

## 5. Cần PO quyết

Gom theo CLAUDE.md §6, mỗi câu kèm đề xuất mặc định.

1. **Vị trí hub bến Lau** (SB-01).
   - **Mặc định:** hub là level riêng dựng từ bộ asset chương 1. Trong truyện, hub ở khúc sông xuôi, không nhìn thấy đầm hay Hồ Tây.
   - Quái chương 1 không mang tên giao long hay thuồng luồng.
   - Thêm nơi thờ Linh Lang vào danh sách tham vấn C2.
2. **Định nghĩa "trận đánh người" của D-017** (SB-05).
   - **Mặc định:** cấm cả đối thủ hình người (kể cả yêu ma dáng người cầm vũ khí) và việc khống chế người bằng nút đánh.
   - Người bị mê được giải bằng tương tác phi chiến đấu.
   - Giáp Xương mang dáng phi nhân.
3. **`ch_ben` ở cấu hình sàn và thứ tự sản xuất** (SB-02, SB-14).
   - **Mặc định:** vẫn làm `ch_ben` sau khi qua V7. Ở sàn, `ch_ben` phải có quãng thời gian cách hẳn chương Gióng và cần giám khảo Văn hóa hoặc cố vấn ký.
   - K1-nhẹ ở sàn: cutscene nấu chảy đặt ở hub, không đặt trong `ch_phudong`.
   - Ba Vì (phạm vi tối thiểu) vẫn được ưu tiên ngân sách trước `ch_ben`.
4. **Cơ chế khoen và Gấu Già** (SB-03, SB-07).
   - **Mặc định:** khoen không có phép riêng; ghi một câu luật [SÁNG TẠO], Codex ghi "không phải bùa".
   - Giữ loài gấu, nhưng thêm câu hỏi tham vấn về liên tưởng gấu nuôi lấy mật.
   - Không đưa Gấu Già lên trailer cho tới khi `ch_ben` qua V7.
5. **Tên game** (NB-01…NB-03).
   - **Mặc định:** "Người Giữ Bến: Khoen Vỡ" / *The Ferrykeepers: Beasts Unbound* là ứng viên chính; "Người Giữ Bến" làm dự phòng.
   - Loại "KHOEN" làm chữ thương hiệu quốc tế.
   - Chốt sau buổi thử đọc ba giọng và sau khi luật sư SHTT tra nhãn hiệu.

---

## 6. Nguồn đã tra

Chỉ đọc trích đoạn WebSearch, chưa đọc toàn văn. Các nguồn này **không dùng làm căn cứ canon**.

- Linh Lang và Hồ Tây:
  - https://hatinh.gov.vn/vi/bai-viet/những-điều-it-biết-về-đức-thanh-linh-lang-của-“tứ-trấn”-thăng-long-xưa
  - https://thanglong.chinhphu.vn/english/voi-phuc-the-western-guardian-temple-of-ancient-thang-long-110191.htm
  - https://baophapluat.vn/huyen-thoai-den-cay-que-post355352.html
  - https://www.tapchinghiencuuphathoc.vn/2pdf/thang-long-ha-noi-va-cac-bien-the-cua-hinh-anh-rong-trong-phat-giao
- Phủ Tây Hồ (bán đảo Quảng An): https://vinwonders.com/vi/wonderpedia/news/phu-tay-ho-ha-noi/
- Thờ hổ, chó đá (không thấy tục thờ gấu):
  - https://vnexpress.net/nguoi-viet-xua-da-tho-cho-da-3035161.html
  - https://baophapluat.vn/huyen-bi-than-ho-post432625.html
- Cá Ông, cá bà (không thấy tục thờ cá ó):
  - https://vjol.info.vn/rsr/article/view/85512
  - https://hoianheritage.net/en/specialised-exchanges/research-exchange/the-whale-cult-ca-ong-in-the-belief-life-of-coastal-communities-in-da-nang-in-the-contemporary-context-34.html
- Lễ hội có lợn:
  - https://vietnamnet.vn/en/la-phu-village-preserves-communal-house-pig-procession-festival-523483.html
  - https://news.tuoitre.vn/vietnam-province-ignores-public-outcry-to-enact-pig-slaughter-ritual-pics-1035015.htm
- Tản Viên (không thấy truyện diệt rết): https://lsvn.vn/thang-long-tu-tran-nhung-dieu-chua-biet-a23770.html ; https://wikipedia.com/wiki/S%C6%A1n_Tinh
- Gấu nuôi lấy mật:
  - https://baophapluat.vn/nuoi-nhot-gau-lay-mat-ha-noi-van-la-diem-nong-post400188.html
  - https://tuoitre.vn/hoi-sinh-nhung-chu-gau-bi-nuoi-nhot-lay-mat-20171008094428805.htm
- Thạp đồng làm quan tài (Hợp Minh): https://baolaocai.vn/am-vang-tieng-vong-ngan-nam-post883993.html
- Nông cụ đồng Đông Sơn (Hà Tĩnh): https://vietnamnews.vn/life-style/418581/museum-excavates-35-precious-items.html
- Tai Khün:
  - https://en.wikipedia.org/wiki/Kh%C3%BCn_language
  - https://www.wikiwand.com/en/articles/Tai_Kh%C3%BCn
- Kiểm tra trùng tên:
  - https://brainloaf.itch.io/the-ferryman
  - https://rawg.io/games/ferry-forge
  - https://www.themoviedb.org/movie/558192 (*Bến không chồng*)
