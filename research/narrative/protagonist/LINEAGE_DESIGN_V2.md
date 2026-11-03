# Thiết kế nhân vật chính — V2: nhà Vảy bến Lau

`narrative-researcher` (AI), 2026-11-03. **ĐỀ XUẤT**, chờ `historian-verifier` và PO. Tối đa mức B. Tiếp thu `CRITIQUE_CULTURE` (mã **C-**), `CRITIQUE_PLAYER` (**P-**), `CRITIQUE_FEASIBILITY` (**F-**), `GAME1_LORE_DOSSIER_REVIEW` (**V-**). Mọi thứ không ghi nhãn khác là **[SÁNG TẠO]**.

## 0. Tóm tắt
- **Chủ tiến trình là nhà Vảy và bến Lau**, không phải từng người. Ba đời: Sào (nữ), Đá (nam), Nứa (nữ).
- Nhà Vảy là **Lạc dân chèo đò**. Khi vua dạy dân vẽ mình chống thủy quái (M028 [HUYỀN THOẠI]: "vua (Hùng Vương theo nhiều bản kể)"), nhà này **vẽ và giữ mẫu cho cả làng**, không độc quyền tục chung, không mang huyết thống Lạc Long Quân hay Hùng Vương.
- **Luật mùa cạn:** Thuồng luồng chúa **chỉ xuất hiện vào mùa cạn, ở vùng bến Lau**; không bao giờ xuất hiện trong mùa lũ, ở Ba Vì hay ở biển khơi. Luật này giải mâu thuẫn P-3 và C-Q3 (§4).

## 1. Thứ tự cốt truyện và thứ tự sản xuất
V-01: hai chương thời Lạc Long Quân chỉ cần cùng một đời; giữ Long Biên trước để slice khép trọn.

| Cốt truyện | Thời điểm (truyền thống) | Người | Sản xuất | Phạm vi |
|---|---|---|---|---|
| 1. Long Biên / Hồ Tinh | Thời Lạc Long Quân | Sào | 1 | Tối thiểu |
| 2. Đông Hải / Ngư Tinh | Cùng đời | Sào | 4 | Tùy chọn/DLC, cờ `ch2_done` |
| 3. Phù Đổng / Gióng | Hùng Vương thứ 6 (theo nhiều bản kể, V-03) | Đá | 2 | Tối thiểu |
| 4. Ba Vì | Hùng Vương thứ 18 (như trên) | Nứa | 3 | Tối thiểu |
| Hồi kết: Mùa cạn | Mùa cạn năm sau | Nứa | 3 | **Tối thiểu** (F-2.4) |

- Khi trễ: chương 4 rút thành đoạn tuyến tính, **không cắt** Hồi kết.
- "Đông Hải": lý do là văn phong LNCQ. Bản `en` giữ "Đông Hải" kèm chú thích, không "East Sea"/"South China Sea"; không bản đồ biển đảo hiện đại (V-05, V-04).

## 2. Từng chương

**Ch. 1 — Long Biên (Sào).**
- **Phản diện:** mở chương (mùa cạn), Thuồng luồng chúa tấn công đò. Sào bẻ được một răng của nó trong set-piece; răng thành **"Răng vẽ"**, vật truyền đời.
- **Truyền thuyết:** Sào cứu người bị mê, phá ảo ảnh, dồn Hồ Tinh qua pha 1–2. **Lạc Long Quân dâng nước diệt yêu** (M003), người chơi chỉ có "Ân phù" trong set-piece. Dị bản Huyền Thiên chỉ ở Codex (G-04).
- **Boss tự thắng:** Thuồng luồng đầu đàn → Bảo khí 1.

**Ch. 2 — Đông Hải (Sào, tùy chọn).**
- **Phản diện:** thoáng thấy ở cửa sông, quay lại vì không vào nước mặn.
- **Truyền thuyết:** Sào giữ thuyền neo ven bờ, dụ yêu ngoi lên, phá vây cá-rắn con. Lạc Long Quân ném khối sắt nung trong cutscene; người chơi **không chạm** khối sắt (C-R2).
- **Boss tự thắng trọn:** **Cá-rắn đầu đàn** (gốc "tinh cá-rắn", M002) → Bảo khí 2. Nếu thành DLC: "vè kể lại thời trẻ của Sào", chọn từ menu, đồng bộ cấp.

**Ch. 3 — Phù Đổng (Đá).**
- **Vì sao Đá ở đó:** đò nhà Vảy chở dân tản cư.
- **Truyền thuyết:** set-piece chèo đò; **một** ngựa sắt lao qua ở cảnh xa có kịch bản, không va chạm (C-R8). Gióng không thoại. Combat chỉ ở làng [SÁNG TẠO]. "Giặc Ân" chỉ ở Codex (J-01, J-02).
- **Boss tự thắng:** tướng tiên phong, tên trung tính → Bảo khí 3.
- **Phản diện:** mùa cạn, phục kích đò **độc lập với giặc**, vồ bất cứ ai trên nước (C-R7). Đá chỉ thoát được, để lại **vết rìu** trên mõm nó.

**Ch. 4 — Ba Vì (Nứa).**
- **Phản diện:** mở chương ở **bến Lau, mùa cạn**: Thuồng luồng chúa (mang sẵn vết rìu) phá bến, **cướp lại Răng vẽ**. Nứa ngược sông lên chân Tản Viên lấy tre nứa dựng lại bến.
- **Truyền thuyết:** ở Ba Vì, mùa lũ, **không có thuồng luồng, không dấu vết, không quái nước** (J-03). Nứa dựng rào tre, dẫn dân lên cao. Trống chỉ để **báo và cứu người**, không "đánh vào nước", không trợ lực bên nào (V-08). Sơn Tinh dời núi chỉ trong cutscene; Thủy Tinh là thế lực tự nhiên.
- **Boss tự thắng:** **"Rết lớn"**, thú bị nước dồn (C-R3) → Bảo khí 4.
- Nứa học **rào cọc tre** của dân chân núi; dùng lại ở Hồi kết.

**Hồi kết — Mùa cạn (Nứa).** Ở bến Lau (map chương 1, Data Layer "mùa cạn": bãi bùn, nước ngang mức lội). Động cơ phản diện **chỉ là cái răng**; Codex ghi nó không thuộc Thủy Tinh.

## 3. Hệ thống kế thừa
| Thành phần | Truyền lại | Riêng |
|---|---|---|
| **Nghề nhà** (cây kỹ năng) | Ba nhánh *Võ*, *Trống*, *Vảy*; điểm, nút, cấp giữ 100% | — |
| **Đòn nhà** | Người sau giữ đòn của mọi đời trước; hai ô vũ khí đổi nhanh (GDD §3) | Sào: sào chèo (dùng lại bộ giáo). Đá: rìu xéo (bộ của slice). Nứa: dao đôi (bộ mới duy nhất; lùi về giáo nếu trễ) |
| **Thạp nhà** | Thạp dáng Đông Sơn (ARC_DS), đặt **ở kho, không ở bàn thờ**. Cuối chương, người cũ **cất** Bảo khí vào; đời sau mở ra nghe câu vè gắn với món đồ | — |
| **Hình xăm** | Mask theo UV, mỗi kênh RGBA một hình, tối đa 4 hình; emissive là tham số; giáp không che vùng xăm | 1 hình mới/đời |
| **Bến Lau** (hub thay Cõi Trống) | Nhà, thuyền, trống lớn dần (Data Layer); miếu [SÁNG TẠO] không có chức năng, không đền thật | — |
| **Trống báo bến** | Gỗ bịt da; mỗi đời đổi texture vành; không hình mặt trời, không chim Lạc | — |

- **Nhánh Vảy theo logic truyện:** thủy quái do dự vì nhận lầm đồng loại; giảm sát thương từ thủy quái; ẩn mình qua vùng nước. Không phóng phép rồng.
- **Nhánh Vảy mở ở chương 3** (nếu tục do vua Hùng dạy thì đời Sào chưa có). Lần đổi người đầu tiên vì thế kèm một nhánh mới (giảm mất mát); thời điểm mở là cờ dữ liệu.
- **`ch2_done`:** chương 2 chỉ thêm Bảo khí 2, một câu vè, một biến thể đòn chèo. Không điều kiện bắt buộc nào tính nội dung chương 2.
- **Đòn nhà là nghề**, do thầy của đời đó dạy lại theo vè. Không xuất thần, không bóng ma, hình xăm không tự sáng khi đổi đòn.

## 4. Mâu thuẫn P-3 với C-Q3/C-R7: cách giải
- **P-3 (phản diện mọi chương):** đạt. Nó có mặt ở ch. 1 (bị bẻ răng), ch. 2 (cửa sông), ch. 3 (phục kích, ăn vết rìu), ch. 4 (cướp Răng vẽ) và Hồi kết.
- **C-R7, J-03 (Ba Vì sạch):** đạt. Cảnh của phản diện trong chương 4 tách sang **địa điểm khác** (bến Lau) và **mùa khác** (cạn). Phần Ba Vì không có một dấu vết nào.
- **C-Q3 (trùng mô-típ "Thủy Tinh dâng nước báo thù hằng năm"):** **luật mùa cạn** đảo ngược mô-típ: nó đến khi nước **rút**, vì đói và vì cái răng.
- **Câu hỏi bác bỏ khi tham vấn:** "Có liên tưởng Thuồng luồng chúa với Thủy Tinh không?" Nếu có, dời cảnh cướp răng về cuối chương 3.

## 5. Sợi dây cảm xúc và cao trào
- **Răng vẽ:** nhà Vảy dùng răng kẻ thù để châm mực vẽ mẫu cho làng qua nhiều đời. Văn bản chỉ nói "vẽ mình"; việc châm là [SÁNG TẠO].
- **Vết sẹo:** răng gãy (Sào), vết rìu (Đá): chiến tích của đời trước hiện trên thân kẻ thù.
- **Vè nhà Vảy:** một giọng hát NPC (F-3.5). **Công lớn luôn thuộc thần**, công giữ bến thuộc người.
- **Cao trào**, người chơi tự thắng trọn:
  1. Pha bãi bùn: nhánh Vảy khiến nó do dự; đánh vào răng gãy.
  2. Pha rào cọc tre (học ở Ba Vì) ghim thân nó. Lúc chuyển pha có đòn kết theo kịch bản bằng đòn của Sào, rồi của Đá; vè vang lên.
  3. Giành lại Răng vẽ, buộc lên đầu sào, ra đòn kết.
- **Kết:** Nứa dùng Răng vẽ vẽ mẫu cho một đứa trẻ. Cao trào **cá nhân**, không đua quy mô với cảnh hai thần.

## 6. Đối chiếu phản biện
| Mã | Xử lý |
|---|---|
| C-Q1, C-R1 | Nhà vẽ và giữ mẫu cho làng; vua dạy dân |
| C-Q2, V-01 | Đông Hải cùng đời, Long Biên trước |
| C-Q3, C-R7 | Luật mùa cạn; Hồi kết mùa cạn; Ba Vì sạch (§4) |
| C-Q4 | "Đòn nhà" thay "Thế tổ"; không hồn nhập |
| C-Q5 | Lau → **Nứa**; Codex ghi tên Nôm đơn là quy ước cổ tích |
| C-R2, C-R3, C-R8 | Không chạm sắt nung; "Rết lớn"; một ngựa, không va chạm |
| C-R5, C-R6, C-R9 | Thạp nhà ở kho; hub không đền thật; trống gỗ bịt da |
| G-02 | Lạc dân; "con Rồng cháu Tiên" chỉ theo nghĩa tập thể |
| P-1 | Đòn nhà cộng dồn, đổi nhanh |
| P-2 | Cá-rắn đầu đàn; DLC đồng bộ cấp |
| P-3 | §4 |
| P-4, P-5 | Cất vào Thạp; bến Lau là hub |
| P-6 | 4 Bảo khí "chế tác", không "rèn" (V-19) |
| P-7, P-8 | Chèo đò tản cư; playtest bàn giao (§7) |
| F-1 | Mask UV, chung bố cục UV |
| F-2 | `ch2_done`; Hồi kết tối thiểu; DLC là ký ức có đồng bộ cấp |
| F-3 | Dùng lại bộ chiêu; đòn kết theo kịch bản; boss cuối dùng rig đầu đàn phóng to; Rết có phương án lùi; một giọng hát; tối đa 4 hình; trống đổi texture |
| V-04, V-05 | Đông Hải, không bản đồ hiện đại |

## 7. Cổng go/no-go trước khi làm Đá
1. Mask xăm chạy trên **cả hai** mesh, chung bố cục UV.
2. Animation dùng chung không xuyên thân ở chiêu chính; bộ giáo chạy được trên mesh nữ.
3. VRAM tăng thêm **đo bằng harness** (TECH_SPEC §5), có CSV và commit hash.
4. Đo giờ công thật chương 1 (C5).
5. Playtest bàn giao "mất mát hay háo hức?". Nếu đa số chọn "mất mát", làm lại cảnh bàn giao.

## 8. Rủi ro còn lại
| Rủi ro | Mức | Xử lý |
|---|---|---|
| Ai dạy tục vẽ mình, vào lúc nào | Vừa | Cờ mở nhánh Vảy; đối chiếu LNCQ/TT |
| Luật mùa cạn vẫn bị đọc thành phe Thủy Tinh | Vừa | Câu hỏi bác bỏ; tham vấn Ba Vì |
| Rig thân rắn của boss cuối | Cao (chi phí) | Spike sớm |
| Bến Lau gần Hồ Tây; đền Quán Thánh | Vừa | Không đền thật; `naming_review` |
| Thạp và trống dáng Đông Sơn ở thời Lạc Long Quân | Thấp–vừa | Codex tách khỏi khảo cổ (J-06, V-09) |
| Gióng ở cảnh xa vẫn là thần được thờ | Vừa | Tham vấn Phù Đổng/Sóc (QT-16) |

## 9. Ý tưởng tên game (chưa chốt, qua `naming_review`)
1. **"Bến Vảy":** nơi chốn (hub) cộng tục vẽ mình (tiến trình).
2. **"Ba Đời Giữ Bến":** chính hook P-9; nói rõ cấu trúc dòng họ.
3. **"Răng Vẽ":** vật vừa là vết thù vừa là công cụ nghề; lạ tai, gây tò mò.
4. **"Mùa Cạn":** đưa luật thiết kế thành hình ảnh; quái nước đến khi nước rút.
5. **"Vè Nhà Vảy":** chiến tích người chơi thành truyền khẩu.

## 10. Chưa xác minh và nguồn
- Chưa xác minh: người dạy tục vẽ mình (V-K6); nguyên văn mốc Hùng Vương 6/18 (V-03); việc thờ Thủy Tinh (F-18); kỹ thuật vẽ hay châm mực (dossier §7.2).
- Nguồn: M002, M003, M005, M006, M028; ARC_DS; `research/expert/GAME1_LORE_DOSSIER*.md`; `CRITIQUE_*.md`. Không tra nguồn ngoài.
