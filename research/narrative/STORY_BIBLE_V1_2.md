# Story Bible Game 1 — v1.2 (sửa nhỏ từ v1.1)

`narrative-researcher` (AI), 2026-11-03. **ĐỀ XUẤT**, chờ `historian-verifier`. Tối đa mức B.

Tên tạm "Người Giữ Bến" / *The Ferrykeepers* (D-018). Truyền thuyết ghi [HUYỀN THOẠI] kèm mã; còn lại [SÁNG TẠO]. Tên riêng qua `naming_review`. Demo là bản nội bộ, chưa mức A (định nghĩa "nội bộ" ở §7, SB11-14). v1.2 chỉ sửa theo `REVIEW_STORY_BIBLE_V1_1.md` (bảng SB11 ở cuối).

## 1. Logline, chủ đề, tóm tắt

**Logline** (SB-12):
> Qua nhiều đời, một nhà đò bến Lau cạy những mảnh khoen vỡ khỏi các quái thú hóa dữ, cho tới khi một người cùng bến tìm lại chiếc chốt cũ và định trói một con thú mới để giữ bến thay mình.

"Một con thú mới" (thay "con thú đầu tiên" của VERDICT phản diện §3) là **lệch VERDICT, chờ PO ghi nhận ở D-022** (SB11-02); là hệ quả của D-018 (khoen không phép).

**Chủ đề** (NB-03):
> **"Giữ bến bằng tay mình, không bằng khoen."**

Hai kẻ gây lỗi đều muốn thú *giữ bến thay mình*; nhà bến Lau giữ bến bằng sức người, nên tên game đứng về phía nhà bến. Câu thoại cuối dùng cụm này. **Ở đời Hùng 6 (kết sàn, hub đời Bương) chỉ dùng bản rút gọn "Giữ bến bằng tay mình."**, không có "khoen" (SB11-01).

**Nguồn ác trong một câu** (phép thử V8):
> Một lái đò đúc vụng bộ khoen để bắt thú giữ bến; khoen vỡ, người đời sau mang mảnh đi làm bẫy, làm hàng, và thú mắc mảnh thì đau mà hóa dữ.

**Tóm tắt.** Nhà bến Lau là **ba người, cách nhau nhiều đời** (Cói, Bương, Nứa), đưa người qua sông, chứng kiến truyền thuyết mà công lớn thuộc về thần. Người chơi cứu người, tự hạ thú mang mảnh khoen rồi cạy mảnh; thợ đúc làng nấu mảnh thành nông cụ. Bản đủ kết bằng giải thoát con gấu bị người lặp lỗi trói (§4). **Không có trận đánh người.**

## 2. Luật thể hiện (checklist)

**Thần và nơi thờ**
- [ ] Lạc Long Quân, Gióng, Sơn Tinh, Thủy Tinh không điều khiển, không thoại tự do, không bị đánh; Hùng Vương không lộ mặt; Âu Cơ, Mị Nương chỉ ở Codex.
- [ ] Hồ Tinh, Ngư Tinh: "người chơi phá Thế, thần kết liễu" (C6). Không thần khí trong túi đồ; Ân phù chỉ trong set-piece.
- [ ] Không combat ở đền thật; không mô phỏng Hội Gióng (QT-09, G-08). "Giặc Ân" chỉ ở Codex; không mô-típ Thương, không chữ Hán.

**Không đánh người (SB-05, D-018)**
- [ ] Không kẻ địch là người thật, kể cả người bị mê (giải bằng **tương tác phi chiến đấu**: giữ nút "gọi tên", kéo ra khỏi ảo ảnh). Người lặp lỗi không bị đánh.
- [ ] Yêu ma hình người được phép nhưng không mặc trang phục phe lịch sử nào; không quái dáng lính.

**Khoen (V1–V9, D-018)**
- [ ] **Khoen không có phép.** Thú hóa dữ vì đau và vì bị trói. Codex ghi: "không phải bùa, không ai yểm" (SB-03).
- [ ] Mảnh lan đi **do người mang** (đồng vụn, lưỡi bẫy), không trôi theo sông; không buôn thú hay phần cơ thể thú, không "phường".
- [ ] Không mộ, hài cốt, đập khuôn (V1); khoen không là cọc, không chữ, không gọi "trấn/yểm/ách" (V2); không mảnh trên Hồ Tinh, Ngư Tinh; thợ đúc làng nấu chảy (V4); khoen thô, không hoa văn Đông Sơn, không cho sức mạnh, không UI đếm; `binding_item` tắt được, test softlock (V9).

**Luật theo đời và chương liền kề (SB-02)**
- [ ] Mỗi chương có trường `era` và `follows_chapter`, kèm test dữ liệu.
- [ ] **Đời Hùng Vương thứ 6** (`ch_phudong`, cùng phần hub đời Bương): không có khoen, mảnh, lời đồn về khoen, gấu hay cảnh nấu chảy. Mọi chuỗi hiển thị ở đời này (thoại, vè, mô tả Bảo khí, chữ khi mở Thạp) có cờ `era`; test dữ liệu chặn từ khóa "khoen/mảnh/chốt" (SB11-01). Mô tả Bảo khí viết trung tính theo đời (ví dụ Nanh Đầm: "nanh lợn lòi rụng lại ở bãi lầy, gắn chuôi đồng").
- [ ] Codex là giao diện ngoài truyện nên mục "Khoen" mở từ đời Cói vẫn đọc được, nhưng **không mở mục mới** nào về khoen ở đời Hùng 6 (SB11-17).
- [ ] Từ khi mở `ch_bavi` tới hết game: không thủy quái, không volume "nước có quái"; Vảy không hiện UI hay VFX (C3, R3-09).

**Vùng Hồ Tây (SB-01, D-018)**
- [ ] `ch_longbien` và hub: không tên "giao long", "thuồng luồng", không bò sát, rắn, rùa (tín ngưỡng Linh Lang Đại Vương); không cáo ngoài Hồ Tinh; không sự kiện "thuồng luồng quấy bến". Codex: "Đầm Xác Cáo", "Long Biên" là tên gọi về sau (SB-15, V-11).

**Khác**
- [ ] Không combat bơi; `en` giữ "Đông Hải", không bản đồ hiện đại. Mốc Hùng 6/18 "theo nhiều bản kể". Dòng họ là Lạc dân, không huyết thống thần/vua (G-02).
- [ ] Mỹ thuật: Codex ghi "thế giới game dùng mỹ thuật Đông Sơn; thời truyền thuyết không đồng nhất với một văn hóa khảo cổ; niên đại theo khảo cổ: chưa đối chiếu" (J-06, SB-08, SB11-10).

## 3. Nhà bến Lau

| Người | Chương | Vũ khí riêng |
|---|---|---|
| **Cói** (nữ) | `ch_longbien`, `ch_donghai` | Giáo (bộ của slice); chỉ có 1 ô |
| **Bương** (nam) | `ch_phudong` | Rìu xéo (bộ của slice); mở ô 2 |
| **Nứa** (nữ) | `ch_bavi`, `ch_ben` | Dao đôi (bộ mới duy nhất) |

Tên đặt theo "cây cỏ quen thuộc của làng". Khi bỏ dấu đều vô hại.

**Mũi Sào** (vật truyền đời)
- Bịt đồng đầu sào do thợ đúc làng thời Cói đúc; mỗi đời lắp cán tre mới; mỗi thú được giải thoát để lại một vết khắc. Là công cụ (không ô, không chỉ số), dùng để cạy và chống đò. Codex kèm câu mỹ thuật ở §2.

**Kế thừa**
- **Nghề nhà** (cây kỹ năng): *Võ*, *Trống* (nhịp chiến đấu), *Vảy*; giữ 100%. Cấp nối tiếp. Điểm kỹ năng đến từ việc giúp làng.
- **Vũ khí:** đổi tự do giữa 2 ô; người sau giữ vũ khí của người trước.
- **Thạp nhà:** **gốm thô, trơn, miệng rộng**, đặt ở kho; không dáng chum có nắp úp, không hoa nâu Lý–Trần; không bao giờ gắn với mai táng (SB-08, SB11-11). Bảo khí xếp theo đời; mở thạp chỉ hiện chữ.

**Hub bến Lau** (SB-01, D-018)
- **Level riêng** dựng từ bộ asset chương 1, ở "khúc sông xuôi, cách đầm nhiều ngày đò"; không thấy đầm hay Hồ Tây; Codex: địa danh hư cấu. Nhà, thuyền, **trống gỗ bịt da** lớn dần qua Data Layer. Không miếu, không bò sát. Chi phí: một level nhỏ dùng chung kit.

**Nhánh Vảy** (M028 [HUYỀN THOẠI]: vua dạy dân vẽ mình hình thủy quái)
- Mở ở `ch_phudong`, khi làng nhờ nhà vẽ và giữ mẫu nên gọi là "nhà Vảy" (Cói không có hình xăm). 2 nút bị động (thủy quái do dự; giảm sát thương) cộng hình xăm thẩm mỹ; chỉ có hiệu lực với Cá Ngạnh Sông và ở NG+. Thấy thừa hoặc cổng mask trượt thì hạ thành thẩm mỹ cộng Codex.

**Mẫu xăm**
- Dùng hoa văn hình học Đông Sơn (vòng tròn tiếp tuyến, chữ S, răng cưa), thuyền, thủy quái cách điệu không sừng, râu, vảy hay móng vuốt rồng (ARC_DS, T002 [SỬ LIỆU-TRANH LUẬN]).
- Cấm: hình nhân vật được thờ; mặt trời trung tâm, chim Lạc; irezumi, sak yant, tā moko; mẫu của bất kỳ dân tộc nào; chữ viết.
- Trẻ em chỉ được vẽ mực.

## 4. Khoen Thuần
- **Luật cơ chế** (một câu, [SÁNG TẠO]): *khoen chỉ là đồng đúc vụng; nó làm thú đau và trói thú, và chính cơn đau cùng sự trói buộc làm thú hóa dữ; cái ác là ý muốn bắt thú giữ bến thay mình.*
- **Người làm khoen:** lái đò, không phải thợ đúc; không cầu hay thách thần nào.
- **Đường đi của mảnh** (người mang): Lợn Lòi Đầm giật đứt bẫy của thợ săn, mảnh mắc ở cổ; Cá Ó Gai mang mũi xiên gãy của dân chài ở gai đuôi; Rết Lớn kẹt lưỡi bẫy làm từ đồng vụn đổi lên vùng trên; Gấu bị người lặp lỗi đeo khoen đúc lại từ chốt cũ.
- **Người lặp lỗi:** người cùng bến đời Nứa, muốn thú giữ bến để khỏi canh đêm; vớt chốt bằng sào (không lưới). Bị dân giữ lại, góp tay nấu chốt; không đánh, không trang phục vùng miền.
- **Hiện diện:** `ch_longbien` (lò bỏ hoang, boss mang mảnh, vè); `ch_donghai`, `ch_bavi` (boss mang mảnh); `ch_phudong` **không có gì** (đời Hùng 6); `ch_ben` (gấu, người lặp lỗi).
- **Cạy:** pha 1 thú đe dọa, pha 2 lộ nỗi đau; mỗi lần phá Thế khoen nứt một nấc; Thế đầy thì cạy bằng Mũi Sào, ba nhịp theo Trống, hit-stop, khoảng lặng (có tùy chọn giữ nút). Kỹ thuật: đòn kết GDD §3, motion warping tới socket.
- **Nấu chảy:** mảnh được nấu thành lưỡi cày, thuổng ngay trong đời của nó (nông cụ đồng Đông Sơn có cơ sở, theo trích đoạn).
- **Kết bản đủ** (`ch_ben`, đời Hùng 18): con gấu, **một con thú mới** (lệch VERDICT, chờ PO ghi nhận ở D-022), được giải thoát, bước vào rừng. Chốt được nấu chảy. Câu cuối: "Giữ bến bằng tay mình, không bằng khoen."
- **Kết bản sàn** (D-018): kết ở `ch_phudong`, không gấu, không nấu chảy. Hóa giải dừng ở "mảnh đời Cói đã được nấu", chốt còn dưới vực; kết ở hub đời Bương chỉ có **vè bản sàn** (§7, không chứa "khoen", "mảnh", "chốt"), Mũi Sào và câu "Giữ bến bằng tay mình." (SB11-01). PO chấp nhận ở D-018, D-021 (lệch chữ VERDICT §3).

## 5. Chương

| ID | Cốt truyện | `era` | Sản xuất (SB-14) | Phạm vi |
|---|---|---|---|---|
| `ch_longbien` | 1 | Lạc Long Quân | 1 | Tối thiểu, sàn |
| `ch_donghai` | 2 | Lạc Long Quân | 5 | Cuối/DLC |
| `ch_phudong` | 3 | Hùng Vương 6 | 2 | Tối thiểu, **kết của sàn** |
| `ch_bavi` | 4 | Hùng Vương 18 | 3 | Tối thiểu |
| `ch_ben` | 5 | Hùng Vương 18, "một thời gian sau", không gắn mùa | 4, sau V7 | Chỉ bản đủ |

**`ch_longbien` — Đầm Xác Cáo (Cói)**
- **Truyền thuyết** [HUYỀN THOẠI M003]: Cói giải người bị mê, phá ảo ảnh, dồn Hồ Tinh qua pha 1–2. Lạc Long Quân dâng nước phá hang ở pha 3. Ân phù: đứng vững trên nước.
- **Quái** (theo `design/data/enemies.json`, D-023; SB11-03): **Cua Càng Bùn** (cua đầm cỡ lớn), **Bọ Ngựa Lau** (bọ ngựa cao ngang vai người), **Ụ Bùn** (yêu đầm hư cấu: ụ bùn và rễ lau tự đứng dậy).
  - **Liên hệ nguồn ác** (SB11-05): không con nào mang khoen. Lợn Lòi Đầm, đau vì lưỡi bẫy mắc ở cổ, càn phá bãi lầy; cua, bọ ngựa bị đánh động khỏi hang ổ nên tấn công để tự vệ, hết sức thì trốn, không bị giết. Ụ Bùn là yêu đầm vốn ngủ trong bùn, thức dậy khi đầm bị xới tung; **khoen không sinh ra nó** (khoen không phép). Vì vậy câu V8 vẫn đứng: cái gây xáo trộn là con thú mang mảnh.
  - Ụ Bùn: không mặt, không thân người, không gọi là thần đất hay thổ thần; Codex ghi [SÁNG TẠO].
- **Boss: Lợn Lòi Đầm.** Pha 1 càn qua bãi lầy; pha 2 khuỵu xuống. Cạy mảnh ở cổ.
- **Bảo khí: Nanh Đầm**, từ nanh **rụng sau khi được cạy**, chuôi đồng; tăng sát thương Thế.

**`ch_donghai` — Đông Hải (Cói)**
- **Truyền thuyết** [HUYỀN THOẠI M002]: Lạc Long Quân ném khối sắt nung; Cói giữ thuyền neo, dụ yêu, không chạm sắt.
- **Boss: Cá Ó Gai.** Thân dẹt, **đuôi ngắn**, khác "cá-rắn" của Ngư Tinh (SB-10); đánh trên sàn thuyền neo; cạy ở gai đuôi.
- **Bảo khí: Gai Ó**, từ gai tự rụng; gây tê.
- **DLC:** hồ sơ ký ức Cói (đồng bộ điểm; khóa Vảy, ô 2; bộ đồ giáo, Nanh Đầm, giáp ch. 1).

**`ch_phudong` — Phù Đổng (Bương)**
- **Truyền thuyết** [HUYỀN THOẠI M005]: Gióng phá giặc ở cảnh xa có kịch bản (một ngựa, không va chạm); Bương chèo đò đưa dân tản cư. Đánh ở làng **Bãi Nổi** [SÁNG TẠO], Codex ghi "không phải làng Phù Đổng" (SB-09). Quái: Yêu Xương Con (đi chồm), Cá Ngạnh Sông; không quái dáng lính.
- **Boss: Giáp Xương.** Yêu ma dáng **chồm, khung thú**, giáp bằng xương thú, đá, lông, gỗ; không cầm vũ khí người; không khoen. Giáp bong theo mỗi lần phá Thế; kết bằng rã thành tro, không chém đầu.
- **Bảo khí: Tấm Xương Thú** (SB-06), từ phần còn lại sau khi rã.
- **Codex:** "Theo truyền thuyết: giặc Ân (LNCQ)" / "Phần hư cấu: đạo quân yêu ma, không mô tả dân tộc hay triều đại nào".

**`ch_bavi` — Ba Vì (Nứa)**
- **Boss trước lũ: Rết Lớn.** Pha 1 quấn, cắn; pha 2 co mình run; cạy giữa hai đốt lưng. Lùi nếu spike trượt: Lợn Lòi Núi. Quái: Rết Con, Ong Đất.
- **Lũ** [HUYỀN THOẠI M006]: Sơn Tinh dời núi trong cutscene. Nứa dựng rào tre, dẫn dân lên cao, đánh trống báo. Không quái, không Vảy.
- **Bảo khí: Giáp Vỏ Rết**, từ vỏ lột sau khi được cạy.

**`ch_ben` — Trận bến (Nứa).** Boss **Gấu Lớn** (họ bốn chân, có tư thế đứng): pha 1 điên, pha 2 kiệt sức, cạy khoen ở gáy. Không lồng sắt, không vết thương bụng, không chi tiết mật (SB-07); không đám đông, không ván phá, không thuyền vật lý; không Bảo khí.

**Luật Bảo khí** (SB-06): boss được cạy cho **phần tự rụng sau khi được cạy**; boss không được giải thoát (yêu ma) cho **phần còn lại sau khi rã**. Chế tác ở lò làng: đúc đồng rồi ghép; không rèn, không sắt.

## 6. Vertical slice và spike

**Slice: `ch_longbien`**, cộng một đoạn bàn giao ở hub.
- **Slice chứng minh** (SB-04): C4, C6, V8, P-8, C5 (giờ công thật chương 1), và **V5, V6 chỉ trên Lợn Lòi**. Chữ V6 áp cho Game 1 đọc là "boss bốn chân của `ch_ben`" thay "thú đầu tiên" (SB11-02, D-022).
- **Playtest slice:** tóm nguồn ác một câu (đạt ≥ 2/3); "gợi phe vị thần nào?" (SB-16); "bị cướp công?"; "đổi người: mất mát hay háo hức?".

**Spike GĐ2, tách khỏi slice:** (1) Rết (V5, rig thứ hai) graybox kèm cạy giữa hai đốt; (2) Gấu (V6) trên họ skeleton bốn chân, cả locomotion và tư thế đứng; (3) Cá Ó Gai gộp vào spike thuyền.

**Ngưỡng đo** (chép từ VERDICT; số đo kèm CSV và commit hash):
- **V5:** không xuyên mesh ở 3 góc camera; khoen bám socket suốt bộ chiêu; giờ công mỗi rig ≤ 1,5 × đòn hành quyết thường (giả định). Trượt thì đổi rig; trượt cả hai thì về K0.
- **C4:** hang 3 mức nước, boss cùng 4 địch, preset Cao 1080p, RTX 5050; VRAM đỉnh ≤ 7 GB; không hitch > 50 ms. Trượt thì nước dâng chỉ trong cutscene.
- **C5:** đo giờ công thật chương 1; chỉ mở chương mới khi quỹ còn ≥ chỉ số × công ch. 1 × 1,5 (giả định). Chương biển chỉ vào sản xuất khi spike thuyền đạt cổng như C4 và game feel ≥ 4/5.

## 7. Demo 0.1 (theo `docs/DEMO_PLAN.md`)

Lát cắt nhỏ của `ch_longbien`, chưa có Hồ Tinh và nước dâng.
- Cói cầm giáo; quái Cua Càng Bùn, Bọ Ngựa Lau, Ụ Bùn (`enemies.json`); boss Lợn Lòi Đầm 2 pha, kết bằng cạy; chế tác Nanh Đầm; 1 người bị mê (giữ nút "gọi tên").
- **Chuỗi bí mật nhỏ:** vết bẫy → đồng vụn → lò bỏ hoang; thưởng nguyên liệu nâng Nanh Đầm cộng Codex.
- **Bàn giao:** hub sang đời Bương; mở Thạp; trao Mũi Sào; giữ cây kỹ năng. Bương mở ô 2 (rìu) và đánh hình nộm rơm luyện tập cùng 2 Cua Càng Bùn ở bãi sông (không quái gắn tên "đầm" ở hub, SB11-13) để thử đổi giữa giáo kế thừa và rìu: đây là 2 vũ khí DEMO_PLAN yêu cầu. Không có nội dung Phù Đổng.

**Thoại và vè tối thiểu** [SÁNG TẠO]:
1. Bà lái đò, khi mở màn: "Bến này giữ bằng tay người, con ạ."
2. Cói, khi thấy mảnh trên cổ Lợn Lòi: "Ai trói mày thế này?"
3. Thợ đúc làng, khi nấu mảnh: "Đồng đúc sai thì đúc lại, thành lưỡi cày cho ruộng." (SB11-09)
4. Vè, sau khi cạy (lục bát; chỉ dùng ở đời Lạc Long Quân và Hùng 18; câu cuối sửa luật bằng trắc theo SB11-08):
   > Ai đem khoen trói thú rừng
   > Thú đau hóa dữ, bến chừng chẳng êm
   > Sào nhà cạy mảnh đêm đêm
   > Tay người giữ bến, chẳng thèm khoen ai

   **Vè bản sàn** (đời Bương, không có khoen; SB11-01):
   > Bến này ai giữ đêm ngày
   > Sào tre một cán, đôi tay chẳng rời
   > Nhiều đời nối bước không lơi
   > Tay người giữ bến, người ơi nhớ lời

   Cả hai bài cần người viết vè người thật đọc lại.
5. Bàn giao, với Bương: "Nhiều đời trước có người giữ bến này. Giờ đến lượt con."

**Nhóm "nội bộ" (SB11-14):** chỉ người trong danh sách playtest có hẹn trước nhận link Track W; không đăng công khai, không dùng làm demo Steam (D-013) khi chưa đạt mức A. Màn Codex có dòng cố định: "Nội dung văn hóa chưa qua chuyên gia duyệt (mức B)".

**Thuật ngữ vi/en (đề xuất, SB11-16; chờ người đọc bản ngữ tiếng Anh):** Khoen → *khoen* (chú giải "binding ring"; tránh "collar" và "bronze" trong chuỗi hiển thị) · Mũi Sào → *Pole-tip* · Nanh Đầm → *Marsh Fang* · Bến Lau → *Lau Landing* · Thạp nhà → *Family Jar* · Nghề nhà → *Family Craft* · cạy → *pry*.

**Codex tối thiểu (6 mục):**
1. **Bến Lau** [SÁNG TẠO]: địa danh hư cấu.
2. **Khoen** [SÁNG TẠO]: "không phải bùa, không ai yểm; thú hóa dữ vì đau và bị trói".
3. **Lợn Lòi Đầm** [SÁNG TẠO]: con thú mắc lưỡi bẫy. (Không thêm mục cho quái thường; nếu thêm thì gắn [SÁNG TẠO].)
4. **Mũi Sào** [SÁNG TẠO]: kèm câu mỹ thuật Đông Sơn.
5. **Giáo đồng và rìu xéo** [SÁNG TẠO]: vũ khí trong game, dáng lấy cảm hứng từ hiện vật Đông Sơn (T002 [SỬ LIỆU-TRANH LUẬN]: **mới có 1 dòng nguồn, mức B**; chưa đối chiếu bản gốc; niên đại còn tranh luận) (SB11-07).
6. **Hồ Tinh** [HUYỀN THOẠI] (M003, LNCQ): Lạc Long Quân diệt yêu; ghi dị bản Huyền Thiên Trấn Vũ; tên "Đầm Xác Cáo" là tên về sau.

## 8. Tham vấn, trailer, cập nhật

**Tham vấn C2:** Đền Hùng; Đền Mẫu Âu Cơ Hiền Lương; Nội Bình Đà; **nơi thờ Linh Lang** (đền Voi Phục và các đền quanh Hồ Tây, cần tra); Quán Thánh; Phủ Tây Hồ; Phù Đổng/Sóc; Ba Vì, Đền Và; cố vấn dân tộc học (mẫu xăm, tô-tem gấu và lợn rừng); cố vấn nghề đúc.

**Câu hỏi bác bỏ:** gợi phe vị thần nào? khoen gợi trấn yểm hay bôi xấu nghề đúc? Ụ Bùn có bị đọc là thần đất không (Phủ Tây Hồ, cố vấn)? gấu gợi gấu nuôi lấy mật (SB-07)? rết bị đọc là thú núi Tản, phe Sơn Tinh (SB-11)?

**Trailer** (SB-16): sau C2; chỉ nội dung phạm vi sàn (Hồ Tinh, Lợn Lòi Đầm, Giáp Xương); không Gấu khi `ch_ben` chưa qua V7.

**Tài liệu phải cập nhật** (SB-13), qua người duyệt:
- `myths.json`: M004 `gameplay` thành "không dùng ở Game 1"; M028 `gameplay` bỏ "Thuồng luồng chúa".
- Dossier §8: bỏ "Cáo con", "Mộc Tinh con", "kẻ cướp lợi dụng lũ (người)"; §7.3.
- GDD §1–2 (tên tạm, 4 chương cộng `ch_ben`, hub), §3 (bỏ Phù lực), §4 (*Vảy*, lò làng), §5 (bỏ sự kiện thuồng luồng), §6 (Bảo khí), §7 (Boss Rush ở hub), §8 (slice).
- `DEMO_PLAN`: 2 vũ khí qua đoạn bàn giao; nhóm "nội bộ" (§7).
- `design/data/strings.json`: thay vè cũ bằng hai bài ở §7; `codex.json` `cx_bronze_weapons`: đổi nhãn theo SB11-07; `enemies.json`: `en.description` của khoen không dùng "collar", "bronze" (SB11-16); `lineage.json`: thêm từ khóa "mảnh", "chốt" vào `forbidden_content_tags` của `era_hung_vuong_6`. (V5 đã được VERDICT ghi nhận.)

## 9. Rủi ro và chưa xác minh

**Rủi ro:** spike cạy trượt (về K0); khoen đọc thành trấn yểm; so với Elden Ring; gấu gợi lấy mật; sàn hóa giải chưa trọn; Vảy mỏng.

**Chưa xác minh:** thần tích Linh Lang, danh sách đền (chấp nhận cho Demo nội bộ; phải đối chiếu trước khi chốt slice, SB11-12); nguyên văn M002, M003, M005, M006, M028; tô-tem gấu, lợn rừng; rết (chưa loại trừ); kiêng cá ó, cá đuối; bịt cán đồng; phương âm (NB-02).

## 10. Đối chiếu
| Mã | Xử lý |
|---|---|
| SB-01 | Hub level riêng xa đầm; ch. 1 và hub không bò sát, không tên giao long/thuồng luồng; tham vấn Linh Lang |
| SB-02 | `era`, `follows_chapter` có test; đời Hùng 6 sạch khoen; sàn bỏ `ch_ben`; tắt thủy quái từ `ch_bavi` |
| SB-03 | Khoen không phép (§4); mảnh do người mang |
| SB-04 | §6: phạm vi chứng minh, spike, ngưỡng |
| SB-05 | §2; Giáp Xương dáng chồm; liệt kê quái |
| SB-06 | Luật Bảo khí §5; Tấm Xương Thú |
| SB-07 | Ràng buộc tạo hình, tham vấn, không trailer |
| SB-08 | Câu mỹ thuật; Thạp gốm; trống gỗ |
| SB-09…SB-11 | Làng Bãi Nổi; Cá Ó đuôi ngắn, thân dẹt; "chưa loại trừ" và câu hỏi tham vấn |
| SB-12…SB-15 | Logline mới, không "đồng", "ba người, cách nhau nhiều đời"; sửa danh sách cập nhật; `ch_bavi` trước `ch_ben`; "tên gọi về sau" |
| SB-16 | Trailer theo phạm vi sàn, làm sau C2; thêm câu hỏi bác bỏ V8 |
| NB-03 | Câu chủ đề §1 |

## 11. Đối chiếu REVIEW v1.1 (SB11)
| Mã | Xử lý |
|---|---|
| SB11-01 | Đời Hùng 6 không có chữ "khoen/mảnh/chốt": kết sàn dùng vè bản sàn và câu "Giữ bến bằng tay mình."; cờ `era` cộng test từ khóa; mô tả Bảo khí trung tính (§1, §2, §4, §7) |
| SB11-02 | Giữ "một con thú mới", ghi "lệch VERDICT, chờ PO ghi nhận ở D-022" (§1, §4); V6 đọc là "boss bốn chân của `ch_ben`" (§6) |
| SB11-03 | Bộ quái theo `enemies.json` (D-023): Cua Càng Bùn, Bọ Ngựa Lau, Ụ Bùn; bỏ Rái Đầm, Lợn Rừng Non, Bóng Mê (§5, §7) |
| SB11-04 | Hết theo SB11-03 ("Bóng Mê" đã bỏ) |
| SB11-05 | Quái thường không mang khoen, bị đánh động bởi con thú mang mảnh, hết sức thì trốn; Ụ Bùn không do khoen sinh ra (§5) |
| SB11-06 | Hết theo SB11-03 (bỏ Rái Đầm) |
| SB11-07 | Codex mục 5 thành [SÁNG TẠO], ghi T002 "mới có 1 dòng nguồn, mức B" (§7); cập nhật `codex.json` (§8) |
| SB11-08 | Câu cuối vè: "Tay người giữ bến, chẳng thèm khoen ai" (§7) |
| SB11-09 | "Cái cuốc" đổi thành "lưỡi cày" (§7) |
| SB11-10 | Thêm vế "niên đại theo khảo cổ: chưa đối chiếu" (§2) |
| SB11-11 | Thạp gốm thô, trơn, miệng rộng; không dáng chum nắp úp, không hoa nâu (§3) |
| SB11-12 | Chấp nhận cho Demo nội bộ; đối chiếu Linh Lang trước khi chốt slice (§9) |
| SB11-13 | Hub dùng hình nộm rơm và Cua Càng Bùn ở bãi sông (§7) |
| SB11-14 | Định nghĩa nhóm "nội bộ" và dòng "mức B" trong Codex (§7) |
| SB11-15 | Ngoài SB: người điều phối ghi chú báo cáo 0B rằng D-018 có hiệu lực |
| SB11-16 | Bảng thuật ngữ vi/en đề xuất (§7); sửa `en` trong `enemies.json` (§8) |
| SB11-17 | Codex là giao diện ngoài truyện; không mở mục khoen mới ở đời Hùng 6 (§2) |
