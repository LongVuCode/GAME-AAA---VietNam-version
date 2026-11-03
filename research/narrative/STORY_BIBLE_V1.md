# Story Bible Game 1 — v1

`narrative-researcher` (AI), 2026-11-03. **ĐỀ XUẤT**, chờ `historian-verifier` và PO. Tối đa mức B. Tên game tạm: **[TÊN GAME]**.

Hợp nhất LINEAGE_DESIGN_V3, villain_debate/VERDICT (K1+), REVIEW_V3, dossier. Truyền thuyết ghi [HUYỀN THOẠI] kèm mã; phần còn lại là [SÁNG TẠO]. Mọi tên riêng là tên tạm, qua `naming_review` và thử đọc ba giọng.

## 1. Logline và tóm tắt

**Logline.** Qua nhiều đời, một nhà lái đò ở bến Lau cạy từng mảnh khoen đồng khỏi những con thú hóa dữ, sửa lỗi của một người cùng bến, trong khi các thần lập nên kỳ tích của truyền thuyết.

**Nguồn ác trong một câu (phép thử V8):** *Một lái đò đúc vụng bộ khoen đồng để bắt thú nghe lời; khoen vỡ, các mảnh làm thú hóa dữ qua nhiều đời.*

**Tóm tắt.**
- Thời Lạc Long Quân, một lái đò bến Lau đúc vụng bộ khoen bắt thú giữ bến; khoen vỡ, mảnh trôi theo sông, chốt chìm xuống vực (§4).
- Ba đời nhà bến Lau đưa người qua sông và chứng kiến truyền thuyết. Công lớn thuộc về thần (Lạc Long Quân diệt Hồ Tinh, Ngư Tinh; Gióng phá giặc; Sơn Tinh chống lũ). Người chơi cứu người, tự hạ những con thú mang mảnh khoen rồi cạy mảnh để giải thoát chúng.
- Đời cuối, một người cùng bến vớt được chốt và định thuần con thú đầu tiên, tức là lặp lại cái lỗi xưa.
- Kết: người chơi giải thoát con thú đầu tiên; người lặp lỗi bị dân giữ lại; thợ đúc làng nấu chảy chốt và mảnh thành nông cụ. **Game 1 không có trận đánh người.**

## 2. Luật thể hiện (checklist)

**Thần, nơi thờ, truyền thuyết**
- [ ] Lạc Long Quân, Gióng, Sơn Tinh, Thủy Tinh: không điều khiển, không thoại tự do, không bị đánh. Hùng Vương không lộ mặt. Âu Cơ và Mị Nương chỉ ở Codex (J-05).
- [ ] Hồ Tinh và Ngư Tinh theo mô hình "người chơi phá Thế, thần kết liễu"; playtest hỏi "có thấy bị cướp công không?" (C6).
- [ ] Không có thần khí trong túi đồ. Bảo khí chỉ làm từ **phần thú tự rụng khi được cạy**. Ân phù chỉ có trong set-piece.
- [ ] Không combat ở đền thật; không mô phỏng Hội Gióng (QT-09, G-08). "Giặc Ân" chỉ ở Codex; không mô-típ Thương, chữ Hán (J-01).

**Khoen (V1–V9)**
- [ ] Không mộ, không hài cốt, không đập "khuôn đá hai mang"; chốt được vớt từ vực sông (V1).
- [ ] `ch_phudong` không có mảnh. Khoen không phải cọc, không có chữ, không gọi là "trấn", "yểm", "ách" (V2).
- [ ] Boss Ba Vì khổ vì mảnh, đánh **trước** lũ (V3).
- [ ] Không có mảnh trên Hồ Tinh hay Ngư Tinh. Người làm khoen là lái đò; thợ đúc làng là người nấu chảy (V4).
- [ ] Khoen thô, không hoa văn Đông Sơn, không dáng vòng tay hay lục lạc thật. Mảnh không cho sức mạnh, không làm nguyên liệu, không UI đếm; là `binding_item` tắt được, có test softlock (V9).

**Nước, địa danh**
- [ ] `ch_bavi`: không sinh vật nước, không volume "nước có quái", Vảy không hiện UI/VFX; trống chỉ để báo, cứu người; rào tre không thành kỹ năng (C3, R3-09, V-08).
- [ ] Không combat bơi. Bản `en` giữ tên "Đông Hải"; không có bản đồ biển đảo hiện đại (V-05).
- [ ] `ch_longbien`: không có cáo nào ngoài Hồ Tinh, không quái thân rắn hay rùa (R3-11, R2-04).
- [ ] Codex: Long Biên, Phong Châu là địa danh đời sau (V-11); mốc Hùng 6/18 "theo nhiều bản kể".
- [ ] Dòng họ là Lạc dân: không huyết thống thần hay vua, không họ Hán-Việt; chỉ nói "nhiều đời sau" (G-02).

## 3. Dòng họ: nhà bến Lau

| Đời | Tên | Chương | Vũ khí riêng |
|---|---|---|---|
| 1 | **Cói** (nữ) | `ch_longbien`, `ch_donghai` | Giáo đồng (bộ của slice) |
| 2 | **Bương** (nam) | `ch_phudong` (và `ch_ben` ở sàn) | Rìu xéo (bộ của slice) |
| 3 | **Nứa** (nữ) | `ch_bavi`, `ch_ben` | Dao đôi (bộ mới duy nhất) |

**Kiểm tra tên (R3-13):** bỏ dấu "Coi", "Buong", "Nua" vô hại, không thấy nghĩa lóng. Sửa lý do đặt tên thành **"cây cỏ quen thuộc của làng"** (bương, nứa là tre vùng đồi). Rủi ro "liên tưởng núi" chỉ có khi đi kèm phản diện núi–rừng (R3-04), nên giữ tên.

**Vật truyền đời: Mũi Sào** (thay Cán Lõi)
- Bịt đồng đầu sào do thợ đúc làng thời Cói đúc; mỗi đời lắp cán tre mới; mỗi con thú được giải thoát để lại một vết khắc (N4).
- Là **công cụ**: không chiếm ô vũ khí, không chỉ số, đời nào cũng mang; dùng để cạy và chống đò (R3-06). Không làm từ mảnh khoen.

**Kế thừa**
- **Nghề nhà** (cây kỹ năng): *Võ*, *Trống* (nhịp chiến đấu), *Vảy*; giữ 100%. Cấp nhân vật nối tiếp. Điểm kỹ năng đến từ việc giúp làng.
- **Vũ khí:** đổi tự do giữa 2 ô, chọn ở giá vũ khí của bến. Cói chỉ có ô 1; ô 2 mở từ đời Bương. Nếu cổng 2 trượt: khóa thành "vũ khí riêng + vũ khí của đời trước".
- **Thạp nhà:** đặt ở kho; Bảo khí xếp theo đời; mở thạp chỉ hiện chữ Codex.
- **Hub bến Lau** (R3-07): một cell ở mép sông của **chính map chương 1**, dùng lại asset.
  - Bến quay ra sông, đồi che lòng đầm (về sau là Hồ Tây, M003): không thấy hồ, không đền, không miếu. Nhà, thuyền, trống lớn dần qua Data Layer. Codex: "bến Lau hư cấu, không ở Hồ Tây ngày nay".
- **Nhánh Vảy** (M028 [HUYỀN THOẠI]: vua dạy dân vẽ mình hình thủy quái):
  - Thu còn **3 nút bị động** (thủy quái do dự; giảm sát thương từ thủy quái; đi qua vùng nước có quái) cộng hình xăm thẩm mỹ.
  - Mở ở `ch_phudong`, khi làng nhờ nhà vẽ và giữ mẫu; từ đó làng gọi là "nhà Vảy". Cói không có hình xăm.
  - Dùng với giao long sông ở `ch_phudong`, sự kiện "thuồng luồng quấy bến" ở hub (tắt khi đang ở `ch_bavi`), NG+. Không liên quan khoen. Nếu cổng 1 trượt: chỉ còn Codex và hình thẩm mỹ.
- **Luật mẫu xăm:**
  - Dùng hoa văn hình học Đông Sơn (vòng tròn tiếp tuyến, chữ S, răng cưa), thuyền, thủy quái cách điệu (ARC_DS, T002 [SỬ LIỆU-TRANH LUẬN]).
  - Thủy quái trong mẫu không sừng, râu, vảy hay móng vuốt rồng (R3-14). Mỗi mẫu qua duyệt.
  - Cấm: hình nhân vật được thờ; mặt trời trung tâm; chim Lạc; irezumi, sak yant, tā moko; mẫu (kể cả xăm mặt) của bất kỳ dân tộc nào; chữ viết.
  - Trẻ em chỉ được vẽ mực.

## 4. Nguồn ác: Khoen Thuần
- **Lịch sử.** Thời Cói, một lái đò bến Lau mất con vì thú dữ, đúc vụng **khoen cổ có chốt** ở lò tự đắp, đeo cho một con gấu non để giữ bến. Gấu hóa điên; ông đập vỡ khoen rồi qua đời (không có mộ trong game). Mảnh trôi đi, cắm vào thú khác qua nhiều đời; chốt chìm xuống vực. Con gấu vào rừng; vòng khoen sót trên cổ giữ nó không chết được.
- **Người làm khoen.** Không cầu xin hay thách thức thần nào. Lỗi của ông là muốn **sở hữu ý muốn** của thú. Ông là lái đò, không phải thợ đúc (V4).
- **Người lặp lỗi.** Người cùng bến ở đời cuối, muốn có thú giữ bến để khỏi canh đêm (không gắn lũ, mùa). Vớt chốt bằng sào (không lưới), tra vào vòng khoen của con gấu già. Không đánh, không trang phục vùng miền; cuối game bị dân giữ lại, góp tay nấu chốt.
- **Hiện diện:** `ch_longbien` (lò bỏ hoang, boss mang mảnh, câu vè); `ch_donghai` và `ch_bavi` (boss mang mảnh); `ch_phudong` **không có trong vùng chương** (V2), chỉ có lời đồn ở hub giữa hai chương; `ch_ben` (con thú đầu tiên).
- **Kết.** Gấu Già được giải thoát, chậm rãi vào rừng (không cảnh chết). Thợ đúc làng nấu chốt và mảnh thành lưỡi cày, thuổng đồng. Mũi Sào nhận vết khắc cuối; mẫu Vảy được vẽ mực lên tay một đứa trẻ.
  - **K1-nhẹ** (nếu V7 trượt): không có `ch_ben`. Sau boss cuối của bản ship có cutscene nấu chảy mảnh, nên nguồn ác vẫn được hóa giải ở chương cuối.
- **Cơ chế cạy.** Pha 1 thú đe dọa; pha 2 lộ nỗi đau, đòn chậm hơn (N6). Mỗi lần phá Thế, khoen nứt một nấc. Thế đầy thì **cạy bằng Mũi Sào**: ba nhịp theo Trống, hit-stop, khoảng lặng; có tùy chọn giữ nút. Kỹ thuật là đòn kết GDD §3 (một animation người chơi, một phản ứng mỗi rig, motion warping tới socket).

## 5. Từng chương

Dữ liệu và cờ chỉ dùng ID (R3-16).

| ID | Cốt truyện | Số ở VERDICT cấu trúc | Sản xuất | Phạm vi |
|---|---|---|---|---|
| `ch_longbien` | 1 | 1 | 1 | Tối thiểu, sàn |
| `ch_donghai` | 2 (cùng đời) | 4 | 5 | Cuối hoặc DLC |
| `ch_phudong` | 3 | 2 | 2 | Tối thiểu, sàn |
| `ch_bavi` | 4 | 3 | 4 | Tối thiểu |
| `ch_ben` | Cuối | — | 3, khi qua V7 | **ĐỀ XUẤT – cần PO duyệt** |

- `ch_ben` là **chương riêng**, nên luật áp theo chương (V2, C3) không bị lách.
- Cờ `finale_after = ch_phudong | ch_bavi`. Hai cấu hình chỉ khác nhân vật, cutscene mở và vài câu thoại; ngân sách ≤ 0,3 chỉ số chương (giả định; R3-08).

**`ch_longbien` — Đầm Xác Cáo (Cói; tìm người mất tích)**
- **Truyền thuyết** [HUYỀN THOẠI M003]: Cói cứu người bị mê, phá ảo ảnh, dồn Hồ Tinh qua pha 1–2. Lạc Long Quân dâng nước phá hang ở pha 3. Ân phù: đứng vững trên nước.
- **Boss: Lợn Lòi Đầm**, cùng họ skeleton bốn chân với Hồ Tinh. Pha 1 càn qua bãi lầy; pha 2 khuỵu xuống. Cạy mảnh ở cổ.
- **Set-piece:** nước dâng (C4).
- **Bảo khí: Nanh Đầm**, từ nanh gãy, chuôi đồng; tăng sát thương Thế.
- **Codex:** M003 cùng dị bản Huyền Thiên Trấn Vũ (G-04); "Lò bỏ hoang"; "Long Biên".

**`ch_donghai` — Đông Hải (Cói)**
- **Truyền thuyết** [HUYỀN THOẠI M002]: Lạc Long Quân ném khối sắt nung; Cói giữ thuyền neo, dụ yêu; không chạm sắt.
- **Boss: Cá Ó Gai** (đổi tên từ "Đuối Đen", R3-11). Đánh trên sàn thuyền neo. Cạy mảnh ở gai đuôi.
- **Bảo khí: Gai Ó**, từ gai tự rụng, khâu đồng; gây tê.
- **DLC:** hồ sơ ký ức Cói. Điểm từng nhánh đồng bộ về mốc cuối chương 1; khóa Vảy và ô 2; bộ đồ cố định là giáo, Nanh Đầm, giáp chương 1. Cờ `ch_donghai_done`.
- **Codex:** địa danh trong truyện chưa xác định tương ứng nay. Không tạo hình cá voi (tín ngưỡng Cá Ông, chưa tra nguồn).

**`ch_phudong` — Phù Đổng (Bương; chở dân tản cư)**
- **Truyền thuyết** [HUYỀN THOẠI M005]: Gióng phá giặc chỉ ở cảnh xa có kịch bản, một ngựa, không va chạm. Set-piece: Bương chèo đò.
- **Boss: Giáp Xương.** Yêu ma tiền đạo, giáp bằng **xương thú**, đá, lông, gỗ; đi bộ; không khoen.
  - Đấu ở bến đò làng [SÁNG TẠO], xa đền Phù Đổng và đền Sóc; không dựng đội hình hội trận.
  - Pha 1: giáp bong dần theo mỗi lần phá Thế. Pha 2: lộ khung, đánh nhanh.
  - Rìu phá lõi giáp, yêu rã thành tro. Không chém đầu.
- **Bảo khí: Vòng Xương Thú**; tăng chịu Thế khi Đỡ nhịp.
- **Vảy mở**; có giao long sông.
- **Codex** (R3-10): "Theo truyền thuyết: giặc Ân (LNCQ)" / "Phần hư cấu: Giáp Xương; đạo quân yêu ma là hư cấu, không mô tả dân tộc hay triều đại nào".

**`ch_bavi` — Ba Vì (Nứa; đò nhà lên chở dân chân núi)**
- **Boss (trước lũ): Rết Lớn.** Mảnh cắm giữa hai đốt lưng; nó phá đường làng từ trước khi lũ về. Pha 1 quấn, cắn; pha 2 co mình run. Cạy giữa hai đốt.
  - Lùi nếu trượt V5: **Lợn Lòi Núi**, bộ chiêu khác Lợn Lòi Đầm (lệch N8).
- **Lũ** [HUYỀN THOẠI M006]: Sơn Tinh dời núi trong cutscene. Nứa dựng rào tre, dẫn dân lên cao, đánh trống báo. Không quái, không Vảy. Rết không chung khung hình với thần.
- **Bảo khí: Giáp Vỏ Rết**, từ vỏ lột, ghép tấm đồng; giảm choáng.

**`ch_ben` — Trận bến (Nứa, hoặc Bương ở sàn)**
- **Boss: Gấu Già** (họ bốn chân). Pha 1 điên, càn; pha 2 kiệt sức. Cạy chốt ở gáy.
- Không đám đông, không ván phá được, không thuyền vật lý. Không có Bảo khí.

## 6. Vertical slice

**Đề xuất: toàn bộ `ch_longbien`, cộng một đoạn bàn giao ở hub (10–15 phút, giả định).**

**Nội dung** (giả định): 1 khu rừng đầm cộng cell hub; 4 loại quái (thú đầm, giao long dáng cá sấu, ảo ảnh Hồ Tinh, người bị mê khống chế không sát thương); 1 mini-boss giao long đầu đàn; 2 boss (Lợn Lòi Đầm, Hồ Tinh 3 pha).
- **Hệ thống bắt buộc:** Đỡ nhịp, Thế, Nhịp trống; đòn cạy; chế tác ở lò làng; Thạp; Codex có nhãn; Ân phù; Data Layer chuyển đời; telemetry.
- **Bàn giao:** hub sang đời Bương; mở Thạp; trao Mũi Sào; giữ cây kỹ năng; Bương thử rìu. Không có nội dung Phù Đổng.

**Slice chứng minh:** V5 (cạy trên rig bốn chân), V6 (chung skeleton), C4 (nước dâng), V8 (phép thử một câu), C6 ("cướp công"), P-8 (bàn giao), C5 (giờ công chương 1, điều kiện V7).

**Đã loại:** `ch_phudong` (nhạy cảm cao, không khoen, phải tham vấn trước); `ch_bavi` (rủi ro Thủy Tinh, lũ lớn); `ch_ben` (bị V7 chặn, thiếu bối cảnh).

## 7. Cổng, tham vấn, cập nhật

**Cổng trước `ch_phudong`:** (1) mask xăm trên 2 mesh, chung UV; (2) ba bộ chiêu trên cả 2 mesh; (3) VRAM đo bằng harness, có CSV và commit hash; (4) giờ công chương 1; (5) phép thử bàn giao; (6) C4; (7) V5, V6.

Spike thuyền (C5) làm trước `ch_donghai`.

**Tham vấn C2**, xong trước trang Steam và trailer:
- Đền Hùng; Đền Mẫu Âu Cơ Hiền Lương; **Đình–đền Nội Bình Đà**;
- Phù Đổng/Sóc; Ba Vì, Đền Và; Quán Thánh; Phủ Tây Hồ;
- **cố vấn dân tộc học** (mẫu xăm; thông điệp "thả thú"); cố vấn nghề đúc đồng (V9).

Câu hỏi bác bỏ: gợi phe vị thần nào? khoen gợi trấn yểm hay bôi xấu nghề đúc? bến Lau bị liên hệ với các đền ở Hồ Tây? Trailer bán Hồ Tinh, Giáp Xương, Gấu Già đeo khoen.

**Tài liệu phải cập nhật (R3-12)**, qua người duyệt:
- `myths.json`: M028 `gameplay` (bỏ "Thuồng luồng chúa"); M004 (bỏ Rễ Cuồng).
- Dossier §7.3, §8.
- GDD §1 (tên làm việc), §2 ("9 chương", Cõi Trống), §3 (bỏ Phù lực), §4 (*Linh* → *Vảy*; lò đúc làng), §5 (`prereq`), §6 (Bảo khí), §7 (Boss Rush ở hub), §8 (slice).

## 8. Rủi ro còn lại
| Rủi ro | Mức | Xử lý |
|---|---|---|
| Spike cạy (V5) trượt | Vừa | Đổi rig; trượt cả hai thì về K0 (tắt dữ liệu mảnh) |
| Khoen bị đọc là trấn yểm hoặc bôi xấu nghề đúc | Vừa | V2, V4; câu hỏi bác bỏ |
| Bị so với Elden Ring | Vừa | Cạy, mảnh không cho sức mạnh, không đếm |

## 9. Chưa xác minh
Nguyên văn M002, M003, M005, M006, M028; mốc Hùng Vương 6/18; ai dạy tục vẽ mình; gấu, lợn lòi, rết có được thờ không (tra trước khi chốt boss); tín ngưỡng Cá Ông; tượng ở Quán Thánh; nông cụ đồng Đông Sơn (đối chiếu ARC_DS); tiếng lóng và phương âm.

## 10. Đối chiếu
| Mã | Xử lý |
|---|---|
| R3-01, R3-02, R3-17, N3-01, N3-02 | Bỏ Rễ Cuồng, Cán Lõi và mọi liên hệ với M004 |
| R3-03…R3-05 | Không Mộc Tinh, trống chỉ là nhịp (VERDICT phản diện §3); phản diện là đồ người làm; động cơ rõ |
| R3-06 | Mũi Sào là công cụ; Cói chỉ có ô 1 |
| R3-07 | Hub là cell trong map chương 1; `ch_ben` theo ràng buộc khả thi |
| R3-08 | Hai cấu hình rẻ; ĐỀ XUẤT cần PO |
| R3-09…R3-16 | Luật dữ liệu `ch_bavi`; xương thú và câu Codex; không cáo, Cá Ó Gai, không bơi; §7; sửa lý do tên; tiêu chí xăm; Nội Bình Đà và cố vấn dân tộc học; ID chuỗi |
| V1 | Vực sông; không mộ, không khuôn |
| V2 | `ch_phudong` không có mảnh; `ch_ben` là chương riêng |
| V3 | Rết bị hạ trước lũ |
| V4 | Lái đò làm khoen; thợ đúc làng nấu chảy; không mảnh trên Hồ Tinh, Ngư Tinh |
| V5 | Spike trên Lợn Lòi Đầm và Rết. Thay "Cáo Đầu Bầy" theo R3-11; cần người điều phối ghi nhận |
| V6 | Chung một họ skeleton bốn chân |
| V7 | `ch_ben` chỉ làm sau giờ công chương 1 và graybox hub; lùi về K1-nhẹ |
| V8 | Câu ở §1; đo trong slice |
| V9 | `binding_item`, test softlock; cố vấn nghề đúc |
