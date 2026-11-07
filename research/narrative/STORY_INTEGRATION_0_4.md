# Story Integration Pass 0.4

`narrative-researcher` (AI), 2026-11-07. **ĐỀ XUẤT**, chờ `historian-verifier`, PO. Mức B. Mới là [SÁNG TẠO] trừ chỗ ghi [HUYỀN THOẠI].

Dữ liệu: `dialogue.json`, `quests.json`, `cinematics.json` (mới); `codex.json` +4 mục; `strings.json` +33 khóa; không xóa khóa cũ.

## 0. Tóm tắt

Câu chuyện 0.3 nằm trong Codex, không nằm trong lúc chơi. Bản này thêm:
- cảnh mở 90 s có câu hỏi kịch tính (em trai Cói mất tích);
- 6 NPC có tên, lựa chọn nhẹ;
- nhiệm vụ chính 6 bước, mỗi bước hé một phần nguồn ác;
- 3 nhiệm vụ phụ; barks khi đánh, Ghì nanh, cạy;
- bàn giao đời có thao tác tay và câu hỏi mở;
- quái thường thành **yêu đầm**.

**Câu "rắc rối ở đầm" mới** (V8, bản demo):
> Con lợn lòi già mắc lưỡi bẫy đúc từ đồng khoen cũ; đau quá nó phá đầm, làm yêu đầm thức giấc và người cắt lau lạc trong sương.

## 1. Chẩn đoán

| # | Triệu chứng | Chỗ cụ thể |
|---|---|---|
| D1 | Không có mở đầu: một câu thoại rồi 5 toast phím | `game.js` `startGame()` dòng 228–233 |
| D2 | Mục tiêu không có tên người, Cói không có lý do riêng | `objective()` dòng 1193–1199: "Tìm người đi cắt lau chưa về" |
| D3 | Lời giải nguồn ác chỉ ở Codex và chuỗi bí mật tùy chọn | `cx_khoen.text_extra` mở bằng `sec_lo_bo_hoang` (`optional: true`) |
| D4 | Cả game 7 câu thoại; NPC câm, không tên | `strings.dialogue` `dlg_01…07`; `buildNpcs()` |
| D5 | Vè (nơi nói rõ nhất) chỉ hiện 9 s sau khi cạy | `dlg_04_ve_after_pry`, `say(…, 9)` |
| D6 | Bàn giao là chuỗi thẻ chữ, không có gì để mất hay chờ | `lineage.handoff.steps` |
| D7 | Không có dấu vết thần trong trải nghiệm, sương ảo không giải thích | Hồ Tinh chỉ ở `cx_ho_tinh` |
| D8 | Quái là thú thường phóng to | `enemies.json`: "Cua đầm cỡ lớn" |

## 2. Nguồn ác hiện ra qua chơi

| Lúc | Người chơi biết thêm | Bắt buộc |
|---|---|---|
| Cảnh mở | Lợn lòi phá đầm; lời đồn "thành tinh"; bà Mơ: "Con thú nào dữ cũng có cớ" | Có |
| Bước 1 | Vệt cày bùn, cây có vết ten đồng ngang tầm cổ, cọc bẫy gãy | Có |
| Bước 2 | Đót: lưỡi bẫy nhà, "đồng cũ đúc lại", mắc ở cổ | Có |
| Bước 3 | Nghệ: "Nó cứ cọ cổ vào gốc cây, kêu như khóc" | Có |
| Boss | Thấy lưỡi bẫy; 3 cọc bẫy cũ; cạy; vè; "cong như khúc vòng gãy" | Có |
| Bước 6 | Bác Gianh nói nguồn ác trong 3 câu, kể cả "không phải bùa" | Có |
| Lò bỏ hoang | Chuỗi bí mật cũ | Tùy chọn |

**Hai lớp tách bạch** (trả lời câu 2, 3):
- *Lớp người:* lưỡi bẫy, con thú đau. Người chơi sửa.
- *Lớp truyền thuyết* [HUYỀN THOẠI M003]: sương từ hang đá phía tây, giọng giống người thân gọi người vào sâu. Chỉ Lạc Long Quân trị được; Cói chỉ gọi người về.

Thần không thoại, không hiện hình; công lớn của thần được dân nhắc ba lần (cảnh mở, `cv_mo_after_rescue`, ông Vầu). Quái không thuộc phe thần nào; nhà đò không cướp công.

## 3. Cảnh mở 90 giây (`cin_cold_open`)

| Shot | Giây | Hình và thoại |
|---|---|---|
| 1 | 0–6 | Đen, tiếng lợn lòi rống xa; thẻ "Thời Lạc Long Quân, theo lời kể" |
| 2 | 6–18 | Đò về Bến Sậy lúc hoàng hôn, bà Mơ cầm đuốc hò "Lau đầm trắng xóa mênh mông / Ai đưa người lạc qua sông đêm này"; "Ba đêm nay nó phá đầm." |
| 3 | 18–30 | Thuyền nan lật, bó lau trôi; Cói móc lên chiếc nón buộc dải chàm: "Nón của thằng Nghệ." |
| 4 | 30–40 | Cận cảnh Cói buộc dải chàm vào cổ tay; nhạc ngừng |
| 5–6 | 40–64 | Năn bùn tới gối chạy ra: Nghệ chạy vào bãi lau, sương lên; "Người ta bảo nó thành tinh." / "Con thú nào dữ cũng có cớ." |
| 7 | 64–76 | Lia về bắc: sương trên bãi lau, khối đá tối của hang, không sinh vật; "Việc nhà đò là đưa người về." |
| 8 | 76–85 | Bà Mơ trao giáo: `dlg_01` "Bến này giữ bằng tay người, con ạ." / "Con đi tìm em." |
| 9 | 85–90 | Camera vào sau lưng Cói. **Mục tiêu:** "Lần theo vệt lợn lòi qua Đầm nông" |

**Câu hỏi kịch tính:** "Nghệ ở đâu, và cái gì làm con lợn lòi phá đầm?" Nghệ là em trai, bà Mơ là bà nội. Bỏ qua được; toast phím dời ra sau cảnh.

## 4. NPC, nhiệm vụ, môi trường

### 4.1 NPC [SÁNG TẠO]
Tên theo cây cỏ làng, như Cói/Bương/Nứa. Đã loại (tự kiểm, chưa tra nguồn):
- "Vối": bỏ dấu thành "Voi".
- "Lác": gần "Lạc", và là tên một bệnh da.
- "Sắn": cây du nhập muộn.
- "Dong": tiếng lóng xấu trong tiếng Anh.

| ID | Tên, vai | Lựa chọn (chỉ đổi chi tiết) |
|---|---|---|
| `npc_ba_lai_do` | **Bà Mơ**, bà lái đò, bà nội Cói và Nghệ | — |
| `npc_nghe` | **Nghệ**, em trai Cói, người bị mê | "đuổi nó đi" hoặc "xem cái gì làm nó đau": đổi lời Cói ở bãi lầy |
| `npc_nan` | **Năn**, bạn Nghệ, đau chân ở Bến Sậy | hỏi đường hoặc an ủi; giữ hoặc trả chuông |
| `npc_dot` | **Chú Đót**, thợ săn, bẫy truyền từ đời ông | trách: Đót gửi lưỡi bẫy; thông cảm: Đót tự lên lò |
| `npc_tho_duc_lang` | **Bác Gianh**, thợ đúc, người nói nguồn ác | "có phải bùa?" hoặc "ai đúc?" (người đúc là lái đò, V4) |
| `npc_nguoi_gia_ben` | **Ông Vầu**, người giữ bến già, đời Bương | — |
| `npc_be_sim` | **Bé Sim**, cháu nhiều đời của Nghệ; giọng phụ, chỉ hát và hỏi | — |

Lựa chọn chỉ đặt cờ `flag_choice_*` (validator kiểm), mọi nhánh hội tụ về cùng bước; không đổi sự kiện truyền thuyết.

### 4.2 Nhiệm vụ chính "Người chưa về"

| Bước | Mục tiêu | Lý do |
|---|---|---|
| 1 | Lần theo vệt lợn lòi qua Đầm nông | Nghệ chạy cùng hướng |
| 2 | Hỏi chú Đót về cái bẫy gãy | Con thú mang theo gì? |
| 3 | Gọi Nghệ ra khỏi sương ở Bãi lau | Có giọng gọi cậu vào sâu |
| 4 | Theo dấu con lợn lòi về Bãi lầy lò cũ | Còn đau thì còn phá |
| 5 | Hạ Thế con lợn lòi, cạy thứ đang cứa cổ nó | Gỡ ra thì nó yên |
| 6 | Mang lưỡi bẫy về lò đúc làng ở bến Lau | Đồng đúc sai thì đúc lại |

Tiếp theo là `q_handoff_dai_cham` (khắc vết lên Mũi Sào). Khóa `obj_0_4_*` thay cho `obj_find_villager` và các khóa liền sau; khóa cũ giữ nguyên.

Khi giữ nút gọi tên, Cói gọi ba nấc: "Nghệ!", "Nghệ ơi, chị đây!", "Về thôi, về ăn cơm, bà chờ ở bến!".

### 4.3 Nhiệm vụ phụ (2 bước mỗi cái)
- **Giỏ của Năn** (`chest_bai_lau`): giữ chuông thì có Chuông đồng nhỏ; trả chuông thì Năn hát vè ở bến, có thêm kinh nghiệm.
- **Bẫy nhà chú Đót:** nhổ 3 bẫy còn giương (`trap_dot_1..3`), đưa lưỡi cho bác Gianh. Thưởng Codex `cx_luoi_bay_nha_dot`: lỗi truyền qua đồ vật, việc sửa lỗi cũng vậy.
- **Bọc đồ của Nghệ** (`es_go_kho`): đôi vòng tay Nghệ đổi bằng ba bó lau làm quà cho chị.

### 4.4 Môi trường, vè, barks
- **Điểm kể chuyện mới** (`quests.new_points`, có kiểm nằm trong vùng): thuyền lật (chỉ trong cảnh), bó lau và liềm bỏ lại, cây vết ten đồng (không máu), ổ bùn bị xới có Ụ Bùn "thở".
- **Boss khi đứng yên** cọ cổ vào cọc.
- **Vè do NPC hát:** hò của bà Mơ (mới); Năn hát `dlg_04` (đời Lạc Long Quân); bé Sim hát vè bản sàn `dlg_06` (đời Hùng 6).
- **Barks Cói:**
  - quái bỏ chạy: "Về ổ đi!"; Ụ Bùn tan: "Ngủ tiếp đi.";
  - sắp gục: "Chưa được… Nghệ còn chờ.";
  - Ghì nanh: "Suỵt… Yên nào." rồi "Được rồi."; trượt: "Ối!";
  - cạy: "Một… Hai… Ba!"; lệch nhịp: "Lại nào. Theo trống.";
  - sau cạy: "Đi đi. Không ai buộc mày nữa."

## 5. Bàn giao đời (`cin_handoff` 114 s, `cin_demo_hook` 36 s)

1. **Nghi thức, người chơi giữ nút:** Cói khắc vết đầu tiên ("Một vết. Cho con lợn lòi già."), rồi buộc dải chàm của Nghệ vào cán sào ("Buộc lại cho nhớ.").
2. **Thời gian trôi bằng mùa nước**, khung cố định trên bến, mỗi mùa một câu vè bản sàn:
   - nước ngập bậc bến rồi rút;
   - lau trổ bông, mái gianh thay;
   - đò cũ nằm trên bãi không người.

   Cói già đi qua bóng hoàng hôn, rồi vắng hẳn. Đó là phần **mất mát**, kể bằng hình.
3. **Đời Bương:** ông Vầu trao Mũi Sào, người chơi lắp cán tre mới.
   - Bé Sim: "Con lợn lòi thành tinh ạ?" Ông Vầu: "Không. Nó đau thôi. Bà tổ làm cho nó hết đau." Câu hỏi của cảnh mở được trả lời sau nhiều đời.
   - Sim: "Không có bà Cói gọi ông tổ Nghệ ra khỏi sương thì không có nhà mình." Việc người chơi làm thành lý do dòng họ còn.
   - Bương buộc dải chàm mới, nói đúng câu của Cói.
4. **Truyền thuyết qua lời kể** [HUYỀN THOẠI M003]: "Lạc Long Quân dâng nước phá hang đá… Việc lớn là của thần. Việc nhà mình là đưa người qua sông."
5. **Người chơi giữ:** Nghề nhà, giáo, Nanh Đầm trong Thạp, Mũi Sào có vết của Cói, tục dải chàm (`cx_dai_cham`). Sau đó chạy các bước cũ: Thạp, Nghề nhà, ô 2, tập rìu.
6. **Câu hỏi mở:**
   - Sương sớm bên kia sông, nhiều giọng gọi "Đò ơi!", bóng người gánh gồng.
   - Ông Vầu: "Có chuyện lớn ở thượng nguồn. Sang đi con. Bến mình có đò."
   - Thẻ "Còn tiếp: đời Bương".

   Dẫn sang việc Bương đưa dân tản cư, không nhắc tên giặc.

Chuỗi đời Hùng 6 không có chữ khoen/mảnh/chốt/gấu/nấu chảy. Validator kiểm theo `era` từng shot và từng hội thoại, và chặn shot đời Hùng 6 dùng lại vè có chữ khoen.

## 6. Quái có tính chất quái vật: yêu đầm

### 6.1 Khái niệm [SÁNG TẠO]
**"Thành tinh" = sống quá lâu.** Theo trích đoạn (chưa đối chiếu LNCQ), ba yêu Lạc Long Quân trừ đều là loài sống lâu:
- Ngư Tinh "sống lâu đời thành tinh";
- Mộc Tinh là cây chiên đàn khoảng nghìn năm;
- Hồ Tinh là cáo sống lâu trong hang đá (dossier §3.1).

Yêu đầm là cua, bọ ngựa già và ụ bùn nằm lâu tới mức đầm mọc lên mình chúng. Chúng chỉ giữ ổ; thua thì bỏ về bùn.

**Loại nghĩa "oán khí":** nếu nỗi đau hay khoen sinh ra yêu thì khoen có phép, trái SB-03.

**Ranh giới:**
- không ăn người, không hóa người, không ảo thuật (khác Hồ Tinh);
- không gỗ, không cây (khác "Mộc Tinh con", đã bỏ ở SB-13);
- không dáng lính, không đi hàng lối, không phun nước (khác quân thủy tộc của Thủy Tinh);
- không đặt tên có đuôi "Tinh".

**Lợn Lòi Đầm không thành tinh.** Lời đồn nói vậy, sự thật là nó đau. Đây là điểm xoay của câu chuyện.

**Rủi ro cua:** theo trích đoạn, đoàn rước Thủy Tinh trong thơ Nguyễn Nhược Pháp có "cua đỏ" (chưa đối chiếu). Vì vậy cua không màu đỏ, không giáp, chỉ ở chương thời Lạc Long Quân. Phương án lùi: Bọ Hung Bùn, dùng cùng rig.

### 6.2 Brief tạo hình (cho agent 3D)

**Cua Càng Bùn**
- Silhouette: mai như tảng đá nghiêng về trước, rộng 1,4 m, cao 0,7 m; càng phải to gấp đôi càng trái.
- Vật liệu: đá rêu nứt, vỏ ốc bám, rễ lau lòi ở khe mai.
- Điểm nhấn: càng gai như gốc lau; 6–8 đốm sáng vàng xanh như đom đóm trên các cuống mắt.
- Chuyển động: đi ngang giật cục; giơ càng thì rơi bùn; thua thì xoay rồi chui xuống bùn.
- Từ khóa: **đá rêu · càng gai · mắt đom đóm**. Cấm: đỏ, giáp, đi thành hàng.

**Bọ Ngựa Lau**
- Silhouette: lúc đứng im là một bụi lau; cao 1,4 m, chồm lên 2,0 m.
- Vật liệu: thân bó lau khô có đốt; cánh lá lau rách; bờm bông lau trên đầu tam giác.
- Điểm nhấn: càng như lưỡi liềm bằng bẹ lau hóa sừng (không xương); mắt có vòng đốm mờ.
- Chuyển động: đung đưa theo gió rồi bật lên; bỏ chạy thì để lại bông lau bay.
- Từ khóa: **lau khô · lưỡi liềm · đứng im như bụi**.

**Ụ Bùn**
- Silhouette: khối bùn đáy loe, cao 2,2 m, rộng 2,5 m; không tay, không thân người.
- Vật liệu: bùn quện rễ lau, rễ súng, vỏ ốc, sỏi.
- Điểm nhấn: bọt khí phập phồng như thở; lỗ hang cua phân bố ngẫu nhiên, trong có ánh đom đóm. **Không xếp thành mặt.**
- Chuyển động: trườn, lăn, đập cột bùn; khi tan thì sụp, đom đóm bay lên.
- Từ khóa: **bùn thở · rễ lau · lỗ đom đóm**. Cấm: gỗ, mặt, lễ vật.

**Lợn Lòi Đầm (boss)**
- Silhouette: vai cao 2,2 m, dài 3,5 m ("to bằng con trâu"); bờm dựng; đầu nghiêng về bên lành.
- Vật liệu: lông bện bùn khô thành thừng, lau và cỏ năn mắc trong lông; một mắt đục, nước mắt bùn.
- Điểm nhấn: nanh trái gãy cụt, nanh phải cong vàng. **Lưỡi bẫy đồng ten xanh** ở cổ sát vai trái, quanh đó da trụi, sưng sẫm, không máu; dây mây đứt của bẫy Đót quấn cổ.
- Chuyển động: đi lệch; đứng yên thì cọ cổ; pha 2 run rẩy, khuỵu; sau khi được cạy thì lắc mình, nanh nứt rụng, đi vào lau.
- Từ khóa: **khổng lồ · bùn bện · đau lệch**. Cấm: lưỡi bẫy phát sáng, có chữ hay hoa văn Đông Sơn; vết thương mở.

**Điều chỉnh so với gợi ý của PO**, theo luật đã chốt:
- Ụ Bùn không có "mặt" (Story Bible §5).
- "Khoen gỉ đâm vào vai" đổi thành lưỡi bẫy đồng có ten, mắc ở cổ (đồng không gỉ như sắt; khớp `cx_lon_loi_dam`).
- Bọ ngựa dùng bẹ lau hóa sừng thay "lưỡi hái xương", để giữ nhãn không máu me.

Cua ở bãi sông đời Bương: biến thể non, không mai đá (SB11-13).

## 7. Dữ liệu và kiểm tra

**Validator** (`tools/design_validate.py`): `FILES` thêm 3 file; hàm mới `check_story_0_4` kiểm:
- nhãn và `era`; người nói tồn tại; nhân vật được thờ không có thoại;
- lựa chọn chỉ đặt `flag_choice_*`;
- `line_ref` tồn tại, và vè chỉ dùng lại trong đúng đời;
- nhiệm vụ chính 4–6 bước, mỗi bước có `why`; `objective` trùng `strings.ui` và ≤ 60 ký tự;
- điều kiện trỏ tới điểm, vùng, công thức, boss có thật; điểm mới nằm trong vùng; thưởng trỏ tới `skills`, `items`, `codex`;
- shot liền mạch, tổng thời lượng khớp; cảnh mở ≤ 90 s và có mục tiêu chính; cảnh nào cũng bỏ qua được;
- id không trùng.

Kiểm "đời Hùng 6 sạch khoen" cũ tự áp lên 3 file mới. +14 test (`StoryIntegration04`).

**Đã chạy (2026-11-07):**
- `design_validate`: 0 lỗi, 2 cảnh báo cũ (`basis` vũ khí);
- `unittest discover`: 81/81;
- prototype `node --test`: 126/126;
- `research_tool.py lint`: 0 lỗi.

**Codex thêm:**
- `cx_yeu_dam` [SÁNG TẠO], tham chiếu M002, M003;
- `cx_luoi_bay_nha_dot` [SÁNG TẠO];
- `cx_suong_bai_lau` [HUYỀN THOẠI] M003, LNCQ, tách phần sáng tạo;
- `cx_dai_cham` [SÁNG TẠO], mở ở đời Hùng 6.

## 8. Bàn giao (không tự sửa)

- **Agent code:** đọc `cinematics.json`, `quests.json` (cho `objective()`), `dialogue.json`; thêm `quests.new_points` vào `POINTS`; dời toast `tut2_*` ra sau cảnh mở; thay `handoff.steps` theo `replaces_handoff_steps`.
- **Agent `enemies.json`:** đổi `description` của 3 quái thường theo §6; thêm `lore_kind: "yeu_dam"`; thêm idle "cọ cổ" cho boss.
- **PO:** cho Nghệ là em trai Cói và là tổ tiên của Bương? Mặc định: có.

## 9. Cần `historian-verifier` duyệt

1. "Thành tinh" theo nghĩa sống lâu, và cách viết trong `cx_yeu_dam`.
2. Cách dân gọi "Lạc Long Quân" / "Long Quân" trong `ln_mo_03`, `ln_ho_b9` (tóm M003): đủ trang trọng chưa?
3. Mô-típ "giọng giống người thân gọi vào sương" gắn với Hồ Tinh "hóa người/vật bắt người": có lệch M003?
4. Cua có bị đọc thành quân thủy tộc không (§6.1)?
5. Câu "Bà tổ làm cho nó hết đau" ở đời Hùng 6: có tính là "lời đồn về khoen" (SB11-01)? Mặc định: không, vì không nhắc vật.
6. Hò mới của bà Mơ và việc NPC hát vè cũ: cần người viết vè người thật.
7. Tục dải chàm: có trùng tục tang, tục thờ nào? (Chưa tra nguồn.)
8. Tên NPC: chuyển `naming_review`.

## 10. Nhãn và nguồn

| Mục | Nhãn | Nguồn |
|---|---|---|
| NPC, thoại, nhiệm vụ, cảnh, yêu đầm, dải chàm | [SÁNG TẠO] | — |
| Hồ Tinh, hang đá, nước dâng | [HUYỀN THOẠI] M003 | LNCQ, chưa đối chiếu nguyên văn |
| "Thành tinh" do sống lâu | nền dân gian cho [SÁNG TẠO] | Trích đoạn: en.wikipedia.org/wiki/Vietnamese_mythology; mythic-pages.pages.dev/en/entries/ho-tinh; dossier §3.1 |
| "Cua đỏ" của Thủy Tinh | rủi ro, chưa xác minh | Trích đoạn: en.wikipedia.org/wiki/Sơn_Tinh_–_Thủy_Tinh; loigiaihay.com (trang soạn văn, không học thuật) |

**Chưa xác minh:** nguyên văn LNCQ (M002, M003, Mộc Tinh); thơ Nguyễn Nhược Pháp; tục dải chàm; phương âm tên NPC. Không có mục [CHƯA XÁC MINH] nào trong dữ liệu game.
