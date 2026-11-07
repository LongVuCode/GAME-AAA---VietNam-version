# Story Integration Pass 0.4 (v1.1, sửa theo phản biện)

`narrative-researcher` (AI), 2026-11-07. **ĐỀ XUẤT**, chờ `historian-verifier`, PO. Mức B. Mới là [SÁNG TẠO] trừ chỗ ghi [HUYỀN THOẠI]. v1.1 sửa theo `REVIEW_STORY_INTEGRATION_0_4.md` (bảng SI ở §10).

Dữ liệu: `dialogue.json`, `quests.json`, `cinematics.json`, `creatures_0_4.json` (mới); `codex.json` +4 mục; `strings.json` thêm khóa, sửa câu 3 vè `dlg_04`; `lineage.json` ghi chú `ho_07_trial`. Không sửa `enemies.json`.

## 0. Tóm tắt

Câu chuyện 0.3 nằm trong Codex, không nằm trong lúc chơi. Bản này thêm:
- cảnh mở 90 s có câu hỏi kịch tính (em trai Cói mất tích);
- 6 NPC có tên cộng một giọng trẻ con, lựa chọn nhẹ;
- nhiệm vụ chính 6 bước, mỗi bước hé một phần nguồn ác;
- 3 nhiệm vụ phụ; barks;
- bàn giao đời có thao tác tay và câu hỏi mở;
- quái thường thành **yêu đầm**; cua được thay bằng **Dế Cõng Đá**.

**Đáp án chấm V8:** giữ câu của Story Bible §1:
> "Một lái đò đúc vụng bộ khoen để bắt thú giữ bến; khoen vỡ, người đời sau mang mảnh đi làm bẫy, làm hàng, và thú mắc mảnh thì đau mà hóa dữ."

**Câu cho demo:**
> Con lợn lòi già mắc lưỡi bẫy đúc lại từ khoen cũ, thứ khoen một lái đò xưa đúc vụng để bắt thú giữ bến thay mình; đau quá nó phá đầm, làm yêu đầm thức giấc.

Phiếu playtest chấm riêng hai ý: "người muốn thú giữ bến thay mình" và "không phải bùa". Sương (lớp Hồ Tinh) **không** nằm trong câu này.

## 1. Chẩn đoán

| # | Triệu chứng | Chỗ cụ thể |
|---|---|---|
| D1 | Không có mở đầu: một câu thoại rồi 5 toast phím | `game.js` `startGame()` dòng 228–233 |
| D2 | Mục tiêu không có tên người, Cói không có lý do riêng | `objective()` dòng 1193–1199 |
| D3 | Lời giải nguồn ác chỉ ở Codex và chuỗi bí mật tùy chọn | `cx_khoen.text_extra`, `sec_lo_bo_hoang` (`optional`) |
| D4 | Cả game 7 câu thoại; NPC câm, không tên | `strings.dialogue`; `buildNpcs()` |
| D5 | Vè chỉ hiện 9 s sau khi cạy | `dlg_04_ve_after_pry`, `say(…, 9)` |
| D6 | Bàn giao là chuỗi thẻ chữ | `lineage.handoff.steps` |
| D7 | Không có dấu vết thần; sương ảo không giải thích | Hồ Tinh chỉ ở `cx_ho_tinh` |
| D8 | Quái là thú thường phóng to | `enemies.json` "Cua đầm cỡ lớn" |

## 2. Nguồn ác hiện ra qua chơi

| Lúc | Người chơi biết thêm | Bắt buộc |
|---|---|---|
| Cảnh mở | Lợn lòi phá đầm; lời đồn "thành tinh"; bà Mơ: "Nó có thành tinh đâu. Con thú nào dữ cũng có cớ." | Có |
| Bước 1 | Vệt cày bùn, cây vết ten đồng ngang tầm cổ, cọc bẫy gãy | Có |
| Bước 2 | Đót: lưỡi bẫy nhà, "đồng cũ đúc lại", mắc ở cổ | Có |
| Bước 3 | Nghệ: "Nó cứ cọ cổ vào gốc cây, kêu như khóc" | Có |
| Boss | Lưỡi bẫy; 3 cọc bẫy cũ; cạy; vè; "cong như khúc vòng gãy" | Có |
| Bước 6 | Bác Sung: khoen đúc "để trói thú, bắt thú giữ bến thay mình"; câu chung cho mọi nhánh: "không phải bùa, không ai yểm" | Có |
| Lò bỏ hoang | Chuỗi bí mật cũ | Tùy chọn |

**Hai lớp tách bạch:**
- *Lớp người:* lưỡi bẫy, con thú đau. Người chơi sửa.
- *Lớp truyền thuyết* [HUYỀN THOẠI M003]: sương từ hang đá phía tây, giọng giống người thân gọi vào sâu. Cói chỉ gọi người về.

Thần không thoại, không hiện hình. Tên thần được dân nhắc **2 lần**:
- `ln_mo_03`: "chỉ Long Quân trị được". Đây là lần duy nhất nói tới công trừ yêu.
- `ln_ho_b9`: "Lạc Long Quân dâng nước phá hang".

Cảnh mở chỉ nói "thứ ở hang ấy không phải việc nhà đò".

## 3. Cảnh mở 90 giây (`cin_cold_open`)

| Shot | Giây | Hình và thoại |
|---|---|---|
| 1 | 0–6 | Đen, tiếng lợn lòi rống xa; thẻ "Thời Lạc Long Quân, theo lời kể" |
| 2 | 6–18 | Đò về Bến Sậy, bà Mơ cầm đuốc hò "Lau đầm trắng xóa mênh mông / Ai đưa người lạc qua sông đêm này" |
| 3 | 18–30 | Thuyền nan lật; Cói móc lên chiếc **nón đan thô** buộc dải chàm: "Nón của thằng Nghệ." |
| 4 | 30–40 | Cói gỡ dải chàm, **buộc lên đầu cán sào** để Nghệ nhận ra đò chị; không buộc lên người |
| 5–6 | 40–64 | Năn kể Nghệ chạy vào bãi lau, sương lên; "Người ta bảo nó thành tinh." / "Nó có thành tinh đâu…" |
| 7 | 64–76 | Lia về tây bắc: sương trên bãi lau, khối đá của hang ở phía tây, không sinh vật |
| 8 | 76–85 | Bà Mơ trao giáo: `dlg_01` / "Con đi tìm em." |
| 9 | 85–90 | Vào camera chơi. **Mục tiêu:** "Lần theo vệt lợn lòi qua Đầm nông" |

**Câu hỏi kịch tính:** "Nghệ ở đâu, và cái gì làm con lợn lòi phá đầm?" Bỏ qua được; toast phím dời ra sau cảnh.

## 4. NPC, nhiệm vụ, môi trường

### 4.1 NPC [SÁNG TẠO], chờ `naming_review`

| ID | Tên, vai | Lựa chọn (chỉ đổi chi tiết) |
|---|---|---|
| `npc_ba_lai_do` | **Bà Mơ**, bà lái đò, bà nội Cói và Nghệ | — |
| `npc_nghe` | **Nghệ**, em trai Cói, người bị mê | "đuổi nó đi" hay "xem cái gì làm nó đau" |
| `npc_nan` | **Năn**, bạn Nghệ, đau chân ở Bến Sậy | hỏi đường hay an ủi; giữ hay trả chuông |
| `npc_dot` | **Chú Đót**, thợ săn, bẫy truyền từ đời ông | trách hay thông cảm |
| `npc_tho_duc_lang` | **Bác Sung**, thợ đúc (đổi từ Gianh) | "có phải bùa?" hay "ai đúc?" (người đúc là lái đò, V4) |
| `npc_nguoi_gia_ben` | **Ông Vầu**, người giữ bến già, đời Bương | — |
| `npc_be_ke` | **Bé Kê**, cháu nhiều đời của Nghệ, giọng phụ (đổi từ Sim) | — |

Lựa chọn chỉ đặt cờ `flag_choice_*` (validator kiểm), mọi nhánh hội tụ về cùng bước, không đổi sự kiện truyền thuyết.

Liên tưởng tên cần chuyển `naming_review`, theo SI-12:
- "Mơ" bỏ dấu gần "mo" (thầy mo).
- "Năn" bỏ dấu thành "Nan".
- "Vầu" gần "vẩu".
- "Sung" bỏ dấu gần "súng".

### 4.2 Nhiệm vụ chính "Người chưa về"

| Bước | Mục tiêu | Lý do |
|---|---|---|
| 1 | Lần theo vệt lợn lòi qua Đầm nông | Nghệ chạy cùng hướng |
| 2 | Hỏi chú Đót về cái bẫy gãy | Con thú mang theo gì? |
| 3 | Gọi Nghệ ra khỏi sương ở Bãi lau | Có giọng gọi cậu vào sâu |
| 4 | Theo dấu con lợn lòi về Bãi lầy lò cũ | Còn đau thì còn phá |
| 5 | Hạ Thế con lợn lòi, cạy thứ đang cứa cổ nó | Gỡ ra thì nó yên |
| 6 | Mang lưỡi bẫy về lò đúc làng ở bến Lau | Đồng đúc sai thì đúc lại |

Tiếp theo là `q_handoff_dai_cham`. Ba nấc gọi tên: "Nghệ!", rồi "Nghệ ơi, chị đây!", rồi "Nghệ! Nhìn dải chàm trên sào chị kìa, đi về phía chị!". Câu cuối là câu thực dụng, đã bỏ "về ăn cơm" (SI-01).

### 4.3 Nhiệm vụ phụ
- **Giỏ của Năn:** trả chuông thì Năn hát vè. Vè là bài Năn **tự đặt** sau khi nghe chuyện ở lò, nên chỉ hát sau bước 6.
- **Bẫy nhà chú Đót:** nhổ 3 bẫy, đưa lưỡi cho bác Sung; thưởng `cx_luoi_bay_nha_dot`.
- **Bọc đồ của Nghệ:** đôi vòng tay ở `es_go_kho`.

### 4.4 Môi trường, vè, barks
- **Điểm kể chuyện** (`quests.new_points`): thuyền lật; bó lau, liềm bỏ lại; cây vết ten đồng; ổ bùn bị xới.
- **Boss** đứng yên thì cọ cổ.
- **Vè:**
  - hò bà Mơ (mới);
  - `dlg_04`: câu 3 sửa "đêm đêm" thành "Sào nhà cạy mảnh **một đêm**" (vẫn đúng luật: nhà B, mảnh T, đêm B, vần êm/đêm);
  - vè bản sàn do bé Kê hát.
- **Barks Cói:**
  - "Về ổ đi!"; "Chưa được… Nghệ còn chờ.";
  - Ghì nanh: "Suỵt… Yên nào.";
  - cạy: "Một… Hai… Ba!";
  - sau cạy: "Đi đi. Không ai buộc mày nữa."

## 5. Bàn giao đời (`cin_handoff` 114 s, `cin_demo_hook` 36 s)

1. **Nghi thức, người chơi giữ nút:** Cói khắc vết đầu tiên lên bịt đồng ("Một vết. Cho con lợn lòi già."). Rồi Cói buộc chặt lại dải chàm trên cán ("Buộc lên sào, cho nhớ đường về.").
2. **Thời gian trôi bằng mùa nước**, mỗi mùa một câu vè bản sàn:
   - nước lên rồi rút;
   - lau trổ bông; Cói già **trao sào và buộc dải chàm mới cho người trẻ** (người còn sống buộc cho người nhận, SI-02);
   - đò cũ nằm trên bãi.

   Cói vắng hẳn. Đó là phần **mất mát**, kể bằng hình.
3. **Đời Bương:** người chơi lắp cán tre mới.
   - Bé Kê: "Con lợn lòi thành tinh ạ?" Ông Vầu: "Không. Nó đau thôi. Bà tổ làm cho nó hết đau."
   - Kê: "Không có bà Cói gọi ông tổ Nghệ ra khỏi sương thì không có nhà mình."
   - **Ông Vầu buộc dải chàm mới cho Bương**: "Buộc lại cho nhớ việc đưa người về."

   Dải chàm trơn, không thêu, không đặt cạnh Thạp hay chỗ thờ.
4. **Truyền thuyết qua lời kể** [HUYỀN THOẠI M003]: ông Vầu **nhìn mặt nước**, không nhìn thượng nguồn (SI-15). "Lạc Long Quân dâng nước phá hang đá… Việc lớn là của thần. Việc nhà mình là đưa người qua sông."
5. **Người chơi giữ:** Nghề nhà, giáo, Nanh Đầm, Mũi Sào có vết của Cói, tục dải chàm (`cx_dai_cham`). Mục Codex ghi rõ: "không phải lễ giữ vía hay lễ tang của tộc người nào".
6. **Câu hỏi mở:** bờ bên kia có nhiều giọng gọi "Đò ơi!". Ông Vầu: "Có chuyện lớn ở thượng nguồn. Sang đi con. Bến mình có đò." Thẻ cuối: "Còn tiếp: đời Bương".

Chuỗi đời Hùng 6 không có khoen/mảnh/chốt/gấu/nấu chảy, và nay chặn thêm "lưỡi bẫy", "đồng cũ", "mắc ở cổ" (SI-10).

## 6. Quái có tính chất quái vật: yêu đầm

### 6.1 Khái niệm [SÁNG TẠO]
**"Thành tinh"** = vật sống hoặc vật nằm quá lâu trong bùn, lâu tới mức đầm mọc lên mình nó. Chúng chỉ giữ ổ; thua thì bỏ về bùn.

- **Không dùng nghĩa "oán khí"**, vì như vậy khoen sẽ có phép (SB-03).
- **Cơ sở** (chỉ ghi trong `notes`, không ra chữ hiển thị, SI-05):
  - Hồ Tinh "sống hơn ngàn năm" có trích đoạn;
  - Ngư Tinh, Mộc Tinh chưa kiểm chứng;
  - ý "vật già hóa tinh" phổ biến ở Đông Á, không gắn với vị thần nào.
- **Ranh giới:**
  - không ăn người, không hóa người, không ảo thuật;
  - không có thân bằng cỏ hay gỗ: lau chỉ **bám** ngoài vỏ (SI-14);
  - không dáng lính, không đi hàng, không phun;
  - không có tên đuôi "Tinh".
- **Lợn Lòi Đầm không thành tinh: nó đau.**

**Thay cua (SI-03).** Rủi ro bị đọc theo hai chiều: cua có trong đoàn của Thủy Tinh (thơ Nguyễn Nhược Pháp, theo trích đoạn), và cua có thể bị đọc là thủy tộc của Long Quân. Con thay thế là **Dế Cõng Đá** [SÁNG TẠO]:
- Dế dũi đào đất ẩm, không phải loài nước, không thấy gắn với thần (chưa tra nguồn).
- Không dùng tên trần "Dế Trũi" (nhân vật của Tô Hoài), không dùng "Bọ Hung".
- Id kỹ thuật `en_cua_cang_bun` giữ nguyên (`legacy_id`). Rig `crab_small` dùng lại được.
- Trận tập ở hub đời Bương dùng biến thể **Dế Dũi Bãi Sông** (`variant` trong `ho_07_trial`): con non, không phải yêu đầm (SB11-13).

### 6.2 Brief tạo hình: nguồn sự thật là `creatures_0_4.json`

Agent 3D và designer combat dùng chung file này (SI-13). Tóm tắt:

| Quái | Rig | Chi | Chi trước | 3 từ khóa |
|---|---|---|---|---|
| **Dế Cõng Đá** (id cũ `en_cua_cang_bun`) | `crab_small` | 10 = 2 chân xẻng + 4 chân thật + 4 "chân bùn" (vỏ lột cũ dính lại) | 2 xẻng sừng 4 răng, dài 0,55 m, lưỡi rộng 0,35 m, ≈ 40% thân dài 1,4 m; không phải kìm cua | lưng đá · xẻng sừng · chân lột xác |
| **Bọ Ngựa Lau** | `insect_mantis` | 6 | 2 lưỡi liềm vỏ cứng, dài 0,9 m | lau bám · lưỡi liềm · đứng im như bụi |
| **Ụ Bùn** | `blob_biped_nonhuman` | **2 chân** ngắn, lộ tối đa 0,5 m dưới váy bùn, không khớp gối hay hông kiểu người | **0 tay cố định**; khi đánh nhô 1–2 cột bùn dài 1,2 m, dày 0,4 m, không ở vị trí vai | bùn thở · rễ lau · lỗ đom đóm |
| **Lợn Lòi Đầm** | `quadruped_shared` | 4 | — (nanh phải 0,45 m, nanh trái gãy) | khổng lồ · bùn bện · đau lệch |

**Dế Cõng Đá**, chi tiết:
- Silhouette: thấp, rộng như một tảng đá biết bò (1,4 × 1,1 × 0,6 m). Mép trước tảng đá rêu (1,2 × 0,9 m) chìa ra như mái hiên.
- Điểm sáng: 6–8 đốm nấm phát sáng vàng xanh dọc mép đá, nhấp nháy khi giận. Bụng vàng nhạt chỉ lộ khi lật ngửa.
- Chuyển động: bò ngang giật cục, giữ mặt đá về phía người chơi; chui bùn bằng xẻng; thua thì đào xoáy xuống bùn.
- Cấm: kìm cua, màu đỏ/cam, đứng hai chân, phun, cánh bay.
- `attack_display` đổi tên hiển thị các đòn id cũ: "Bổ xẻng", "Bổ xẻng đôi", "Ủi đá", "Xẻng xoay".

**Lợn Lòi Đầm:** không có vải chàm trên con thú (SI-01).

## 7. Dữ liệu và kiểm tra

**Validator** (`tools/design_validate.py`), `check_story_0_4` (như v1.0) cộng `check_creatures_0_4`. Hàm mới kiểm:
- `enemy_ref` tồn tại; rig trùng `skeleton_family`;
- tên không có từ cua/tôm/rắn/rùa/cáo/giao long/thuồng luồng/"Dế Trũi", không đuôi "Tinh", không trùng tên quái khác;
- tên đòn không có "phun" hay "càng";
- brief đủ 6 trường và đúng 3 từ khóa; số chi cộng đúng;
- không có yêu đầm ở đời Hùng 6;
- `variant` của `ho_07_trial` tồn tại.

`TAG_WORDS` chặn thêm "lưỡi bẫy", "đồng cũ", "mắc ở cổ" ở đời Hùng 6.

**Test:** `StoryIntegration04` có 21 test (thêm 7 cho các mục SI).

**Đã chạy (2026-11-07, sau sửa):**
- `design_validate`: 0 lỗi, 2 cảnh báo cũ;
- `unittest discover`: 102/102;
- prototype `node --test`: 126/126.

## 8. Bàn giao (không tự sửa)

- **Agent code:**
  - đọc `cinematics.json`, `quests.json`, `dialogue.json`;
  - lấy tên, mô tả và `attack_display` từ `creatures_0_4.json` theo `enemy_ref` và `variant`;
  - thêm `quests.new_points` vào `POINTS`;
  - mirror 3 từ chặn mới vào `src/logic/lineage.js`.
- **Designer combat (`enemies.json`):**
  - đổi `name`, `description`, `concept_0_4.monster_flavor` theo `creatures_0_4.json`;
  - dùng "Ụ Bùn 2 chân ngắn, không tay".
- **PO:**
  - có cho Nghệ là tổ tiên của Bương không? (mặc định: có);
  - có duyệt thay cua bằng Dế Cõng Đá không? (mặc định: có).

## 9. Còn chờ người duyệt

1. Dế Cõng Đá: kiểm liên tưởng tín ngưỡng hay văn học (chưa tra nguồn).
2. Dải chàm: hỏi cố vấn C2 và tham vấn cộng đồng (SI-01, SI-02).
3. Ba bài vè: cần người viết vè người thật. Vế "chẳng thèm khoen ai" còn gượng.
4. Tên NPC: `naming_review` (SI-12).
5. Cách gọi "Long Quân" trong lời dân đời Cói: chưa đối chiếu LNCQ.

## 10. Sửa theo phản biện

| Mã | Xử lý |
|---|---|
| SI-01 | Dải chàm buộc lên đầu sào (`co_s04`); nấc gọi 3 thực dụng; `cx_dai_cham` ghi "không phải lễ giữ vía hay lễ tang" |
| SI-02 | Người sống buộc cho người nhận (`ho_s05`, `ho_s12`, `ln_ho_b8` của ông Vầu) |
| SI-03 | Cua thay bằng Dế Cõng Đá (`creatures_0_4.json`); `ho_07_trial` dùng biến thể non |
| SI-04 | Đáp án V8 là câu Story Bible; câu demo bỏ vế sương; thêm `ln_gi_04c` "không phải bùa" chung mọi nhánh |
| SI-05, 06 | `cx_yeu_dam` bỏ LNCQ, bỏ `research_refs`, bỏ chữ "phe"; định nghĩa "sống hoặc nằm quá lâu" |
| SI-07 | "Nó có thành tinh đâu." |
| SI-08 | Sửa §2 (tên thần 2 lần); `ln_mo_03` dùng "Long Quân" |
| SI-10 | Thêm từ chặn đời Hùng 6 và test |
| SI-11 | "một đêm"; Năn tự đặt vè, hát sau bước 6 |
| SI-12 | Gianh thành Sung, Sim thành Kê |
| SI-13, 14 | Một nguồn sự thật cho tạo hình; mantis "lau bám" |
| SI-15, 16, 17 | Ông Vầu nhìn mặt nước; sửa số NPC và hướng tây; nón đan thô |
| SI-09 | Giữ nguyên (đạt) |

## 11. Nhãn và nguồn

| Mục | Nhãn | Nguồn |
|---|---|---|
| NPC, thoại, nhiệm vụ, cảnh, yêu đầm, Dế Cõng Đá, dải chàm | [SÁNG TẠO] | — |
| Hồ Tinh, hang đá, nước dâng | [HUYỀN THOẠI] M003 | LNCQ, chưa đối chiếu nguyên văn |
| "Cua đỏ" trong đoàn Thủy Tinh | rủi ro (thơ 1933, LITERARY) | loigiaihay.com (trích đoạn); en.wikipedia.org/wiki/Sơn_Tinh_–_Thủy_Tinh |
| Hồ Tinh sống lâu | nền cho `notes` | hoatieu.vn; en.wikipedia.org/wiki/Hồ_ly_tinh (trích đoạn) |
| Buộc chỉ cổ tay giữ vía (để tránh) | tham chiếu rủi ro | baovanhoa.vn, danviet.vn, baolaocai.vn, laodong.vn (theo REVIEW) |

**Chưa xác minh:**
- nguyên văn LNCQ;
- thơ Nguyễn Nhược Pháp (bản in);
- dế dũi trong tín ngưỡng;
- tục dải chàm;
- phương âm tên NPC.

Không có mục [CHƯA XÁC MINH] nào trong dữ liệu game.
