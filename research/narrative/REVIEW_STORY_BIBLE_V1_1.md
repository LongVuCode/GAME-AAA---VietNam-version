# Phản biện Story Bible v1.1

Người duyệt: `historian-verifier` (AI), kiêm kiểm tra nhất quán thiết kế · Ngày: 2026-11-03

**Đối tượng:** `research/narrative/STORY_BIBLE_V1_1.md` (gọi tắt là SB; số dòng theo bản hiện tại)

**Đối chiếu với:**
- `CLAUDE.md`, `docs/DECISION_LOG.md` (D-017, D-018, D-021), `reports/PHASE_0B_REPORT.md` (Q1–Q5)
- `villain_debate/VERDICT.md` (§3, V1–V9), `REVIEW_STORY_BIBLE_V1.md` (SB-01…SB-16, NB-03), `STORY_BIBLE_V1.md`
- `docs/DEMO_PLAN.md`, `design/data/enemies.json`, `design/data/weapons.json`
- `research/data/myths.json`, `research/data/sources.json`

**Giới hạn:**
- Nguồn ngoài chỉ tra qua **trích đoạn WebSearch**, chưa đọc toàn văn. Không tìm thấy không có nghĩa là không có.
- Nhận định về sắc thái từ ngữ ("bóng", "mê") là suy luận từ hiểu biết sẵn có cộng trích đoạn. **Cần thử đọc với người bản ngữ**.
- Kết luận có giá trị tối đa **mức B**. Mức A cần cố vấn sử học người thật ký.

**Lint:** `python3 tools/research_tool.py lint` cho **0 lỗi, 7 cảnh báo** (T002, T009, T017, T019, T029, T031, M016). Đây vẫn là các cảnh báo cũ về dòng nguồn, nhưng **T002 liên quan trực tiếp** tới Codex mục 5 của Demo 0.1 (xem SB11-07). SB không sửa file dữ liệu nào.

---

## 1. Các phát hiện của bản review trước: xử lý thật hay chỉ tuyên bố?

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| SB-01 | **Đạt, còn đuôi** | Hub là level riêng ở "khúc sông xuôi, cách đầm nhiều ngày đò", không thấy đầm hay Hồ Tây (dòng 68–69). Đã bỏ câu "về sau là Hồ Tây". Chương 1 và hub không có giao long, thuồng luồng hay bò sát (dòng 44). Linh Lang đã vào danh sách C2 (dòng 168). **Đuôi:** đề xuất (4) "đối chiếu thần tích Linh Lang trước khi chốt quái chương 1" chưa làm (§9 vẫn ghi chưa xác minh), trong khi quái Demo đã chốt (SB11-12) |
| SB-02 | **Đạt về chữ, hở ở kết sàn** | Có `era` và `follows_chapter` kèm test; đời Hùng 6 sạch khoen (dòng 40); sàn bỏ `ch_ben`; tắt thủy quái từ `ch_bavi`. Nhưng kết sàn đặt ở hub **đời Bương** lại dùng "vè chủ đề" và câu chủ đề, cả hai đều chứa chữ "khoen" (SB11-01) |
| SB-03 | **Đạt** | Có luật cơ chế một câu, "không phải bùa, không ai yểm", mảnh do người mang (dòng 34–35, 80–82). Hệ quả kéo theo là kết đổi từ "con thú đầu tiên" sang "một con thú mới" nhưng chưa ghi vào Decision Log (SB11-02) |
| SB-04 | **Đạt** | §6 sửa đúng phạm vi chứng minh; Rết và Gấu tách thành spike; chép ngưỡng C4, C5, V5; rig cá ó gộp vào spike thuyền |
| SB-05 | **Đạt** | Người bị mê được giải bằng nút "gọi tên"; Giáp Xương dáng chồm, khung thú; đã liệt kê quái `ch_phudong`. SB chặt hơn mặc định Q2 của báo cáo 0B (SB11-15) |
| SB-06 | **Đạt** | Luật Bảo khí hai vế; "Tấm Xương Thú"; "nanh rụng sau khi được cạy" |
| SB-07 | **Đạt** | Không lồng sắt, không vết thương bụng, không chi tiết mật; có câu hỏi tham vấn; không đưa Gấu lên trailer khi chưa qua V7. Đổi tên "Gấu Già" thành "Gấu Lớn" |
| SB-08 | **Phần lớn đạt** | Có câu mỹ thuật J-06; Thạp bằng gốm, không gắn mai táng; trống gỗ bịt da. Còn thiếu vế niên đại khảo cổ trong câu Codex (SB11-10); Thạp gốm cần ràng buộc dáng (SB11-11) |
| SB-09 | **Đạt** | Làng Bãi Nổi [SÁNG TẠO]; Codex ghi "không phải làng Phù Đổng". Tra nhanh không thấy làng thật nào tên "Bãi Nổi" (xem §3) |
| SB-10 | **Đạt** | Cá Ó Gai thân dẹt, đuôi ngắn; tục kiêng cá ó, cá đuối nằm trong §9 |
| SB-11 | **Đạt** | §9 ghi "rết (chưa loại trừ)"; có câu bác bỏ về rết và phe Sơn Tinh (dòng 170); tô-tem gấu, lợn rừng đưa vào tham vấn |
| SB-12 | **Đạt** | Logline mới không có "đồng", dùng "ba người, cách nhau nhiều đời". Logline nói "trói **một con thú mới**", khác VERDICT (SB11-02) |
| SB-13 | **Đạt về danh sách, thiếu một mục** | Đã sửa M004, M028, dossier §8, ghi chú V5. Thiếu: `design/data/enemies.json` lệch SB (SB11-03); thiếu mục Decision Log cho thay đổi "thú đầu tiên" (SB11-02). Dữ liệu vẫn chưa được cập nhật (đúng, vì phải qua người duyệt) |
| SB-14 | **Đạt** | Thứ tự sản xuất: `ch_bavi` = 3, `ch_ben` = 4 (sau V7) |
| SB-15 | **Đạt** | "Tên gọi về sau" có trong luật §2 và Codex mục 6 |
| SB-16 | **Đạt** | Trailer chỉ dùng phạm vi sàn, làm sau C2; playtest slice có câu "gợi phe vị thần nào?" |
| NB-03 | **Đạt, nhưng vướng sàn** | Có câu chủ đề "Giữ bến bằng tay mình, không bằng khoen" và lời giải thích vì sao tên game đứng về phía nhà bến. Nhưng câu này chứa "khoen" nên không dùng được ở kết sàn đời Bương (SB11-01) |

## 2. Áp dụng D-018 (và D-021)

| Mục | Kết quả | Ghi chú |
|---|---|---|
| Q1: hub xa Hồ Tây | **Đạt** | Level riêng, "khúc sông xuôi", không thấy đầm; Codex ghi địa danh hư cấu; không miếu, không bò sát |
| Q1: không giao long, thuồng luồng, bò sát ở chương 1 và hub | **Đạt** | Dòng 44; `enemies.json` cũng ghi đúng luật này trong `_note`. Rái Đầm có rủi ro riêng, xem SB11-06 |
| Q2: không đánh người thật | **Đạt** | Kể cả người bị mê; người lặp lỗi không bị đánh; yêu ma hình người không mặc trang phục phe lịch sử, và SB còn cấm thêm "quái dáng lính" |
| Q3: bản sàn bỏ `ch_ben` | **Đạt, hở một điểm** | Bỏ `ch_ben`; kết ở `ch_phudong`, không gấu, không nấu chảy; D-021 đã ghi nhận "hóa giải một phần". Điểm hở: vè và câu kết chứa "khoen" ở đời Hùng 6 (SB11-01) |
| Q4: khoen không có phép, mảnh do người mang | **Đạt** | Luật cơ chế một câu; các đường đi của mảnh đều do người (bẫy, mũi xiên, đồng vụn đổi lên vùng trên); không buôn thú, không "phường" |
| Q5: tên tạm | **Đạt** | "Người Giữ Bến" / *The Ferrykeepers*, không có phụ đề |

## 3. Kiểm tra chi tiết mới (tín ngưỡng, vật được thờ, nhãn)

| Chi tiết | Nhãn | Kết quả tra nhanh | Đánh giá |
|---|---|---|---|
| Rái Đầm | [SÁNG TẠO] (nhãn chung, dòng 5) | Không thấy tục thờ rái cá; kết quả chỉ ra tục thờ cá Ông. **Nhưng** có một trích đoạn (Đại Đoàn Kết) kể mẹ Đinh Bộ Lĩnh thụ thai với một thủy thần hiện hình rái cá. Mới có 1 nguồn, chưa đối chiếu | SB11-06 (Nhẹ); SB11-05 (vấn đề chủ đề) |
| Lợn Rừng Non | [SÁNG TẠO] | Lợn rừng không có tục thờ riêng (kết quả review trước: lợn chỉ là lễ vật ở La Phù, Ném Thượng) | Không vướng tín ngưỡng; vướng chủ đề (SB11-05) |
| Bóng Mê | [SÁNG TẠO] | "Bóng mê" không có trong từ điển (tra không thấy). "Bóng" là cách gọi dân gian của **hầu bóng / đồng bóng** (lên đồng, Đạo Mẫu); "bóng ma" là ma | SB11-04 (Nghiêm trọng, sửa rẻ) |
| Gấu Lớn | [SÁNG TẠO] | Như SB-07, SB-11; tô-tem gấu chưa tra | Đạt, giữ tham vấn |
| Làng Bãi Nổi | [SÁNG TẠO], có ghi rõ | Không thấy làng hay thôn thật nào tên này. "Bãi nổi" là danh từ chung; gần nhất là các "làng nổi" ở bãi giữa sông Hồng (tuoitre.vn), liên tưởng yếu | Đạt |
| Thạp gốm | [SÁNG TẠO] | Chum, vò gốm cũng từng dùng làm quan tài (mộ chum Sa Huỳnh; hiểu biết sẵn có, cần đối chiếu); thạp gốm hoa nâu là đồ Lý–Trần | SB11-11 (Nhẹ) |
| Trống gỗ bịt da | [SÁNG TẠO] | Không mặt trời, không chim Lạc, không dùng làm đòn đánh vào nước (M006) | Đạt |
| Vè lục bát | [SÁNG TẠO] | Câu 8 cuối sai luật bằng trắc | SB11-08 (Nhẹ) |
| Codex 6 mục | Có nhãn đủ | Mục 5 [SỬ LIỆU-TRANH LUẬN] dựa trên T002, mà T002 chỉ có 1 dòng nguồn; Mục 6 dùng M003 (`worshipped: true`, mức B) | SB11-07, SB11-14 |

---

## 4. Bảng phát hiện

| ID | Mức | Vấn đề | Bằng chứng | Đề xuất |
|---|---|---|---|---|
| SB11-01 | **Nghiêm trọng** (ảnh hưởng Demo) | **Kết sàn và đoạn hub đời Bương đưa "khoen" vào đời Hùng 6, trái chính luật §2 của SB.** §2 cấm khoen, mảnh và **lời đồn về khoen** ở `ch_phudong` "cùng phần hub đời Bương". Thế nhưng kết sàn "ở hub chỉ có vè chủ đề và Mũi Sào", trong khi vè chủ đề (§7 mục 4) có chữ "khoen" ở cả câu 1 và câu 4, và §1 quy định "câu thoại cuối dùng cụm" *"Giữ bến bằng tay mình, không bằng khoen"*. Đây đúng là lỗ SB-02 tái phát dưới dạng lời thoại. Demo 0.1 cũng có đoạn bàn giao ở hub đời Bương (mở Thạp, trao Mũi Sào): nếu chữ hiện khi mở Thạp hay mô tả Nanh Đầm nhắc tới "cạy khoen" thì vi phạm luật ngay trong Demo | SB dòng 15, 40, 66, 88, 151–155; VERDICT phản diện V2; D-018 Q3; REVIEW v1 SB-02 | **(1)** Kết sàn dùng câu ngắn "Giữ bến bằng tay mình." (đã có sẵn ở dòng 87), và một bản vè sàn không chứa "khoen" hay "mảnh". **(2)** Mọi chuỗi hiện trong hub đời Bương (Thạp, mô tả Bảo khí, thoại bàn giao) có cờ `era`, và test dữ liệu chặn từ khóa "khoen/mảnh/chốt". **(3)** Ghi rõ Codex có tính là "lời đồn" không (SB11-17) |
| SB11-02 | **Nghiêm trọng** (thủ tục) | **Kết của bản đủ lệch VERDICT đã chốt mà chưa ghi Decision Log.** VERDICT §3 (D-017): "Đời cuối… vớt chiếc chốt… để **thuần lại con thú đầu tiên**", và "Kết: **giải thoát con thú đầu tiên**". SB v1 vẫn giữ ý này (Gấu Già). SB v1.1 đổi thành "định trói **một con thú mới**" (Gấu Lớn đeo khoen đúc lại từ chốt). Đây là hệ quả hợp lý của D-018 Q4 (khoen không phép thì không giữ thú sống qua nhiều đời), nhưng không có trong §10, D-018 hay D-021. V6 vẫn ghi "thú đầu tiên" | SB dòng 10, 20, 82, 87; STORY_BIBLE_V1 dòng 16–17, 75; VERDICT phản diện §3, V6; DECISION_LOG D-017, D-018, D-021 | Ghi một mục Decision Log (đề xuất: "kết bản đủ giải thoát một con thú mới bị trói bằng khoen đúc lại từ chốt; hệ quả D-018 Q4"), để PO có thể đảo. Thêm dòng vào §10 của SB. Sửa chữ V6 thành "boss bốn chân của `ch_ben`" |
| SB11-03 | **Nghiêm trọng** (ảnh hưởng Demo) | **Quái thường của Demo trong SB khác hẳn dữ liệu thiết kế đã viết.** SB §5 và §7: Rái Đầm, Lợn Rừng Non, Bóng Mê. `design/data/enemies.json` (nguồn dữ liệu Track W và U đọc chung): **Cua Càng Bùn, Bọ Ngựa Lau, Ụ Bùn**. Chỉ boss Lợn Lòi Đầm là khớp. DEMO_PLAN đặt tiêu chí nghiệm thu "nội dung trong demo khớp Story Bible". Danh sách cập nhật §8 của SB không nhắc tới `enemies.json` | SB dòng 102, 143; `design/data/enemies.json` (`en_cua_cang_bun`, `en_bo_ngua_lau`, `en_u_bun`); DEMO_PLAN §Tiêu chí, dòng "Văn hóa" | Chọn **một** bộ quái và đồng bộ qua người duyệt. **Đề xuất:** lấy bộ trong `enemies.json` làm chuẩn cho Demo 0.1 và sửa SB §5, §7. Bộ này không có thú có vú non, có một yêu đầm hư cấu (Ụ Bùn), và tránh luôn SB11-04, SB11-05, SB11-06. Nếu giữ bộ của SB thì phải sửa `enemies.json` và xử lý ba mục đó |
| SB11-04 | **Nghiêm trọng** (sửa rẻ; ảnh hưởng Demo) | **Tên "Bóng Mê" dễ gợi hầu bóng, lên đồng và hồn ma.** "Bóng" là cách gọi dân gian của **hầu bóng / đồng bóng**, tức nghi lễ lên đồng của tín ngưỡng thờ Mẫu (UNESCO ghi danh). "Mê" lại gần với trạng thái nhập đồng. Ngoài ra "bóng ma" có nghĩa là ma. Chương này đặt ở vùng Hồ Tây, nơi có **Phủ Tây Hồ** (thờ Mẫu, đã nằm trong danh sách C2). Người chơi chém "Bóng Mê" ở cạnh một phủ Mẫu có thể bị đọc là đánh người hầu đồng, hoặc đánh vong hồn. Thêm nữa, hình dạng chỉ được định nghĩa bằng phủ định ("không hình người, không hình cáo"), nên mỹ thuật dễ trượt thành bóng người hay bóng ma | SB dòng 102, 143; wikipedia "Lên đồng"; baophapluat.vn và chogia.vn ("hầu đồng còn gọi là lên đồng, hầu bóng"; "'Bóng' là cách gọi dân gian của 'đồng bóng'"); tra "bóng mê" không thấy mục từ | Đổi tên, không dùng các chữ "bóng, hồn, vong, ma, đồng, cốt, nhập". Ví dụ: **"Sương Mê"**, "Ảo Ảnh Lau". Định nghĩa hình dạng bằng khẳng định (sương, lau, ánh nước), không mặt, không thân người, không áo, không tiếng hát chầu văn. Thêm câu hỏi bác bỏ khi tham vấn Phủ Tây Hồ |
| SB11-05 | **Nghiêm trọng** (ảnh hưởng Demo và V8) | **Quái thường là thú bình thường (kể cả thú non), làm loãng nguồn ác và chủ đề.** Luật cơ chế nói thú hóa dữ **vì đau và bị trói bởi khoen**. Nhưng Rái Đầm và Lợn Rừng Non không mang khoen mà vẫn tấn công, rồi bị người chơi giết. Lợn Rừng Non lại cùng loài với boss (lợn lòi chính là lợn rừng; "rig boss thu nhỏ"), tức người chơi giết đàn lợn con rồi mới "giải thoát" lợn mẹ hay lợn đầu đàn. Như vậy câu trả lời một dòng của V8 dễ thành "thú trong đầm vốn dữ", và hình ảnh giết thú non khó hợp với thông điệp giải thoát | SB dòng 34, 80, 102; VERDICT phản diện V8; enemies.json `_note` | Quái thường nên là **yêu đầm hư cấu** hoặc sinh vật không gợi lòng thương (như bộ trong `enemies.json`). Nếu muốn giữ thú có vú, cho chúng một lý do rõ ràng (hoảng vì bẫy) và cho xua đuổi chứ không giết. Bỏ "Lợn Rừng Non" |
| SB11-06 | Nhẹ | **Rái cá có thể đụng truyền thuyết sinh Đinh Bộ Lĩnh.** Một trích đoạn kể mẹ Đinh Bộ Lĩnh thụ thai với một thủy thần hiện hình rái cá. Mô-típ này giống hệt mô-típ Linh Lang (thủy thần dạng thú, người mẹ, dòng nước) từng gây lỗi Chặn SB-01. Đinh Tiên Hoàng đang được thờ ở Hoa Lư, và có thể nằm trong phạm vi Game 1 nếu D-003 (tới năm 1428) được khôi phục. Hiện mới có **1 nguồn, chưa đối chiếu**. Không vùng, không tên, không tình tiết nào trùng, nên rủi ro thấp | daidoanket.vn ("Biểu tượng rồng kỳ bí nhất trong văn hóa Việt", trích đoạn); tra "Đinh Tiên Hoàng rái cá Thiên Nam ngữ lục" không xác nhận được; tra "thờ rái cá" chỉ thấy cá Ông | Ghi vào §9 SB: "rái cá và truyền thuyết Đinh Bộ Lĩnh: chưa xác minh". Nếu giữ Rái Đầm: không tạo hình hay gọi là "thần nước", không đặt cạnh nhân vật nữ đang tắm. Nếu theo SB11-03 dùng bộ `enemies.json` thì mục này tự hết |
| SB11-07 | **Nghiêm trọng** (nhãn; ảnh hưởng Demo) | **Codex mục 5 mang nhãn [SỬ LIỆU-TRANH LUẬN] mà nguồn chưa đủ chuẩn.** Lint cảnh báo T002 chỉ có một dòng nguồn (ARCHAEOLOGY). `weapons.json` dẫn thêm LSVN15, nhưng LSVN15 thuộc `MODERN_SCHOLARSHIP`, mà theo D-007 công trình hiện đại không tính là dòng độc lập. ARC_DS lại đang `consulted: false` | Lint WARN T002; `sources.json` (ARC_DS, LSVN15); `weapons.json` `basis`; SB dòng 163; D-007 | Đổi Codex mục 5 thành: "[SÁNG TẠO] vũ khí trong game; dáng lấy cảm hứng từ hiện vật Đông Sơn (T002, chưa đối chiếu bản gốc; niên đại còn tranh luận)". Hoặc giữ nhãn sau khi T002 có thêm một dòng nguồn độc lập. Không để Codex ghi một nhãn mà lint đang cảnh báo |
| SB11-08 | Nhẹ (ảnh hưởng Demo) | **Vè lục bát sai luật ở câu cuối.** Ba câu đầu đúng luật và vần (rừng/chừng; êm/đêm; đêm/thèm). Câu 8 cuối "Giữ **bến** bằng **tay**, chẳng thèm khoen ai" đảo bằng trắc: chữ 2 "bến" là trắc (phải bằng), chữ 4 "tay" là bằng (phải trắc). Người nghe quen lục bát sẽ thấy câu bị vấp. "Chẳng thèm khoen ai" cũng hơi gượng | SB dòng 152–155; luật lục bát (hiểu biết sẵn có) | Ví dụ: "**Tay người giữ bến, chẳng thèm khoen ai**" (người B, bến T, thèm B huyền, ai B ngang; "thèm" vẫn bắt vần với "đêm"). Bản sàn dùng vè khác, không có "khoen" (SB11-01). Nhờ người viết vè người thật đọc lại |
| SB11-09 | Nhẹ (ảnh hưởng Demo) | **Nông cụ không khớp nhau.** §4 viết mảnh được nấu thành "lưỡi cày, thuổng" (có trích đoạn hiện vật Đông Sơn ở Hà Tĩnh), còn thoại thợ đúc §7 mục 3 lại nói "thành **cái cuốc**". Cuốc đồng chưa được tra | SB dòng 86, 150; REVIEW v1 SB-08(a) | Sửa thoại thành "thành lưỡi cày cho ruộng" |
| SB11-10 | Nhẹ | Câu Codex mỹ thuật có vế J-06 nhưng thiếu vế "theo khảo cổ, nghề đúc Đông Sơn có niên đại…" mà SB-08 đề xuất. Không có vế này, người đọc vẫn có thể hiểu thời Lạc Long Quân dùng đồ đồng Đông Sơn là có thật | SB dòng 48; REVIEW v1 SB-08 | Thêm vế niên đại khi ARC_DS đã được tra; trong lúc chờ thì ghi "niên đại theo khảo cổ: chưa đối chiếu" |
| SB11-11 | Nhẹ | **Thạp gốm.** Đổi sang gốm là đúng hướng, nhưng chum, vò gốm cũng từng dùng làm quan tài (mộ chum, nổi bật ở Sa Huỳnh; hiểu biết sẵn có, cần đối chiếu), và thạp gốm hoa nâu là đồ thời Lý–Trần, lệch thời | SB dòng 66; REVIEW v1 SB-08(c) | Ràng buộc mỹ thuật: thạp gốm thô, trơn, miệng rộng, đặt ở kho; không dáng chum có nắp úp; không hoa nâu Lý–Trần |
| SB11-12 | Nhẹ | SB-01 đề xuất (4) chưa làm: thần tích Linh Lang vẫn "chưa xác minh" (§9) mà quái chương 1 đã được chốt cho Demo. Hiện quái không có bò sát hay giao long nên rủi ro còn lại thấp | SB dòng 168, 184; REVIEW v1 SB-01 (4) | Chấp nhận cho Demo nội bộ. Phải đối chiếu trước khi chốt slice |
| SB11-13 | Nhẹ (ảnh hưởng Demo) | **"Rái Đầm" ở hub.** Bương đánh 2 Rái Đầm ở hub, mà hub "cách đầm nhiều ngày đò". Tên quái gắn với đầm xuất hiện ở hub làm mờ chính ranh giới SB-01 vừa dựng | SB dòng 69, 145 | Quái thử vũ khí ở hub dùng tên gắn với sông hoặc bãi (ví dụ dùng Cua Càng Bùn hay Bọ Ngựa Lau ở "bến sậy"), hoặc cho đánh hình nộm rơm luyện tập |
| SB11-14 | Nhẹ (ảnh hưởng Demo) | **Mức xác minh khi đem Demo cho người ngoài chơi.** Theo DEMO_PLAN, Track W là "mở link là chơi, thu ý kiến ngay hôm nay". Demo hiện Codex [HUYỀN THOẠI] M003 (`worshipped: true`, mức B) và [SỬ LIỆU-TRANH LUẬN] T002. SB ghi "Demo là bản nội bộ, chưa mức A", nhưng chưa định nghĩa "nội bộ" là những ai | SB dòng 5; DEMO_PLAN Track W; CLAUDE.md §3 (in_game cần mức A); `myths.json` M003 | Giới hạn người nhận link (danh sách playtest có hẹn trước). Đặt dòng chữ trong màn Codex: "Nội dung văn hóa chưa qua chuyên gia duyệt (mức B)". Không dùng bản này cho demo Steam công khai (D-013) khi chưa đạt mức A |
| SB11-15 | Nhẹ (ngoài SB) | Hai văn bản lệch nhau về Q2. D-018 ghi "cấm đánh người thật (kể cả người bị mê)", còn mặc định Q2 trong báo cáo 0B ghi "chỉ cho cạy hoặc **đánh ngất** bằng cơ chế không gây chết". SB theo bản chặt hơn, nên SB đúng | DECISION_LOG D-018; PHASE_0B_REPORT dòng 38 | Người điều phối ghi chú vào báo cáo 0B rằng D-018 là bản có hiệu lực |
| SB11-16 | Nhẹ | **Chưa có bảng thuật ngữ `en`.** SB không định tên `en` cho Khoen, Mũi Sào, Nanh Đầm, Bến Lau. `enemies.json` đang dịch "mảnh khoen đồng" thành "a bronze collar". "Collar" dễ gợi vòng cổ chó hay vòng cổ nô lệ, và đưa "bronze" vào chuỗi hiển thị (SB-12 chỉ cấm ở tiếp thị) | `enemies.json` `boss_lon_loi_dam.description.en`; DEMO_PLAN yêu cầu chuỗi `vi/en` | Thêm bảng thuật ngữ vi/en vào SB; cân nhắc "shackle-ring" hoặc giữ phiên âm "khoen" kèm chú giải; người đọc bản ngữ tiếng Anh kiểm tra |
| SB11-17 | Nhẹ | Chưa định nghĩa Codex có tính là "lời đồn về khoen" ở đời Bương không. Codex mục 2 "Khoen" đã mở từ đời Cói, nên vẫn đọc được trong hub đời Bương | SB dòng 40, 160 | Ghi luật: Codex là giao diện ngoài truyện, được phép; nhưng không **mở mục mới** nào về khoen trong đời Hùng 6 |

---

## 5. Demo 0.1: đối chiếu với `docs/DEMO_PLAN.md`

| Hạng mục DEMO_PLAN | SB §7 | Kết quả |
|---|---|---|
| Lát cắt `ch_longbien`, không Hồ Tinh, không nước dâng | "Lát cắt nhỏ… chưa có Hồ Tinh và nước dâng" | **Khớp** |
| Cói cùng đoạn bàn giao sang đời sau | Bàn giao ở hub sang Bương; không nội dung Phù Đổng | **Khớp**. DEMO_PLAN chỉ nói "một khu" của Long Biên, chưa nói có thêm hub; §8 của SB đã liệt kê việc cập nhật DEMO_PLAN |
| 2 vũ khí | Giáo (Cói) và rìu xéo (Bương, ô 2) | **Khớp** với `weapons.json` (`wp_giao_dong` slot 1 `chr_coi`; `wp_riu_xeo` slot 2 `chr_buong`) |
| 2–3 loại quái thường | Rái Đầm, Lợn Rừng Non, Bóng Mê | **Khớp số lượng, lệch dữ liệu** (SB11-03); tên và loài có vấn đề (SB11-04, -05, -06, -13) |
| Boss Lợn Lòi Đầm 2 pha, kết bằng cạy | Có | **Khớp** với `enemies.json` (`ph1_de_doa`, `ph2_noi_dau`) |
| Chế tác 1 Bảo khí | Nanh Đầm | **Khớp** |
| Chuỗi bí mật nhỏ có gợi ý | Vết bẫy, đồng vụn, lò bỏ hoang | **Khớp**; đúng luật "mảnh do người mang" |
| Codex có nhãn | 6 mục, đều có nhãn | **Khớp về hình thức**; mục 5 có nhãn chưa đủ chuẩn (SB11-07) |
| Chuỗi vi/en | SB chưa có thuật ngữ en | Thiếu (SB11-16) |
| Tiêu chí "Story Bible v1.1 không còn lỗi Chặn" | — | **Đạt**: bản review này không có lỗi Chặn |
| Tiêu chí "nội dung trong demo khớp Story Bible" | — | **Chưa đạt** cho tới khi xử lý SB11-03 |

**Việc phải làm trước khi build nội dung Demo 0.1** (theo thứ tự ưu tiên):
1. SB11-03: thống nhất bộ quái giữa SB và `enemies.json` (đề xuất lấy `enemies.json`). Làm xong mục này thì SB11-04, -05, -06 cũng hết, hoặc phải sửa từng mục nếu giữ bộ của SB.
2. SB11-01: chuỗi hiện trong hub đời Bương (Thạp, mô tả Nanh Đầm, thoại bàn giao) không chứa khoen, mảnh hay chốt; có test.
3. SB11-07: sửa nhãn Codex mục 5.
4. SB11-14: định nghĩa nhóm playtest và đặt dòng chữ "mức B" trong Codex.
5. Nhẹ, nên sửa luôn vì rẻ: SB11-08 (vè), SB11-09 (cuốc → lưỡi cày), SB11-13 (quái ở hub), SB11-16 (tên en của khoen).

---

## 6. Kết luận

**Story Bible v1.1: ĐẠT CÓ ĐIỀU KIỆN.** Giá trị tối đa mức B.

- Bản này xử lý **thật**, không chỉ tuyên bố, toàn bộ SB-01…SB-16 và NB-03. Lỗi Chặn SB-01 đã được gỡ: hub là level riêng xa Hồ Tây, chương 1 và hub không có giao long, thuồng luồng hay bò sát. D-018 được áp đúng cả năm mục; D-021 đã ghi nhận việc hóa giải một phần ở bản sàn.
- **Không có lỗi Chặn.** Có 6 lỗi Nghiêm trọng:
  - SB11-01: chữ "khoen" ở kết sàn và hub đời Bương, trái luật §2 của chính SB.
  - SB11-02: kết bản đủ bỏ "con thú đầu tiên" mà chưa ghi Decision Log.
  - SB11-03: bộ quái Demo lệch `enemies.json`.
  - SB11-04: tên "Bóng Mê".
  - SB11-05: giết thú thường và thú non làm loãng nguồn ác.
  - SB11-07: nhãn Codex mục 5.
- Cả 6 mục đều sửa rẻ: đổi chữ, đổi tên, đồng bộ dữ liệu, thêm một dòng Decision Log. Không cần đổi cấu trúc.
- **Điều kiện:**
  - Với Demo 0.1: xử lý mục 1–4 ở §5.
  - Trước khi chốt slice: SB11-02 (cần PO ghi nhận) và SB11-12.
  - Các mục Nhẹ còn lại sửa ở v1.2.
- Không thấy lựa chọn nào của người chơi làm thay đổi sự kiện lịch sử đã xác minh. SB không có nội dung [SỬ LIỆU] mới. Không có thần đang được thờ nào bị đánh, bị điều khiển hay bị biếm họa.

---

## 7. Nguồn đã tra

Chỉ đọc trích đoạn WebSearch, chưa đọc toàn văn. Các nguồn này **không dùng làm căn cứ canon**.

- Rái cá và Đinh Bộ Lĩnh: https://daidoanket.vn/bieu-tuong-rong-ky-bi-nhat-trong-van-hoa-viet-10274647.html (1 nguồn; chưa xác nhận được qua Thiên Nam ngữ lục hay sử liệu)
- Không thấy tục thờ rái cá; chỉ thấy tục thờ cá Ông: https://vjol.info.vn/rsr/article/view/85512 ; https://vjol.info.vn/rsr/article/view/126145
- Hầu bóng, lên đồng, "đồng bóng":
  - https://en.wikipedia.org/wiki/L%C3%AAn_%C4%91%E1%BB%93ng
  - https://baophapluat.vn/thanh-hien-nhap-hon-qua-nghi-le-hau-dong-post220272.html
  - https://chogia.vn/hau-dong-la-gi-nguoi-co-can-hau-dong-la-nhu-the-nao-49920/
  - https://hoatieu.vn/phap-luat/hau-dong-la-gi-hau-dong-co-phai-me-tin-di-doan-214575
- "Bóng mê": không thấy mục từ; "bóng ma": https://wiki.neonvagabond.xyz/content/wiktionary_en_all_nopic_2024-05/A/b%C3%B3ng_ma
- "Bãi Nổi": không thấy làng thật; gần nhất là https://tuoitre.vn/nhung-phan-nguoi-ben-cau-long-bien-731060.htm (làng nổi bãi giữa sông Hồng) và https://baonghean.vn/en/mua-bu-ro-o-bai-noi-song-lam-10097780.html
- "Bến Lau": không thấy địa danh trùng; gần nhất là bến Âu Lâu (Yên Bái): https://travelviet.net/en/relics/yen-bai-74/historical-relic-of-ben-au-lau
