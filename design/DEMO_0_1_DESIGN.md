# Thiết kế Demo 0.1 — lát cắt `ch_longbien`

`game-designer` (AI), 2026-11-03. **ĐỀ XUẤT**, chờ `qa-lead`. Bám `docs/DEMO_PLAN.md`, **Story Bible v1.2**, D-017, D-018, V1–V9. Demo **nội bộ** (SB11-14), văn hóa tối đa mức B. Dữ liệu: `design/data/*.json`; schema: `design/schema/README.md`. **Mọi con số là giả định cho tới khi playtest.**

## 1. Vòng chơi
**Mục tiêu (15–25 phút, giả định):** Cói chèo đò tới Bến Sậy tìm người đi cắt lau chưa về, gọi tỉnh người bị mê, giải thoát Lợn Lòi Đầm bằng cạy, về bến Lau chế Nanh Đầm, rồi bàn giao sang Bương.

**Vòng lớn:**
1. Bến Sậy: học điều khiển trên Cua Càng Bùn; bà lái đò nói câu mở màn.
2. Đầm nông, bãi lau: quái thường; nhặt dây mây; mở lối tắt về bến.
3. Gọi tỉnh người bị mê (giữ nút, không đánh): +1 điểm nghề.
4. Chuỗi bí mật (tùy chọn): vết bẫy → đồng vụn → lò bỏ hoang.
5. Boss Lợn Lòi Đầm: 2 pha, cạy khoen 3 nhịp, khoảng lặng, vè; nanh rụng.
6. Lên đò về **hub bến Lau** (level riêng): thợ đúc làng nấu mảnh; Cói chế Nanh Đầm, cất vào Thạp.
7. Bàn giao sang Bương, thử rìu ở bãi sông, vè bản sàn, hết demo.

**Chết:** về bếp lửa gần nhất, không mất gì. Có bếp lửa ngay trước boss.

## 2. Bản đồ graybox
Mọi địa danh là [SÁNG TẠO]; không hồ lớn, đền, miếu hay mô phỏng di tích; không phải Hồ Tây.

```
            [Z4 BÃI LẦY]  boss, tròn r≈18 m, 3 vũng lầy
                  │ bếp lửa trước boss
 [Z3 LÒ BỎ HOANG]─┤
 (bí mật)         │
        └──── [Z2 BÃI LAU]  Bọ Ngựa Lau; người bị mê
                  │      ╲ lối tắt ───────┐
              [Z1 ĐẦM NÔNG] Cua, Ụ Bùn    │
                  │                       │
              [Z0 BẾN SẬY] ◄──────────────┘  bếp lửa; ĐÒ ==> HUB

[HUB BẾN LAU] level riêng, cách đầm nhiều ngày đò: lò làng,
Thạp gốm, trống gỗ bịt da, bãi sông. Không thấy đầm.
```
Kích thước giả định: Z0 30 × 25 m, Z1 60 × 40 m, Z2 50 × 50 m, Z3 20 × 20 m. Trước boss có 3 dấu vết (N5): vết nanh, cọc bẫy gãy dính lông bờm, lối lau rạp.

## 3. Combat (`combat_tuning.json`)
| Thành phần | Thiết kế |
|---|---|
| Đòn nhẹ | Chuỗi 3 nhịp; nhịp 4 mở bằng kỹ năng *Nối đòn*. Input buffer 0,15 s |
| Đòn nặng | Gồng 2 mức (mức 2 cần *Gồng sức*); sát thương Thế lớn |
| Combo rẽ nhánh | Nhẹ, nhẹ, **dừng ≥ 0,35 s**, nặng → đòn nhánh; né rồi nhẹ → đòn lướt |
| Né | 0,45 s; i-frame từ 0,05 s, dài 0,20 s; né hoàn hảo trong 0,10 s đầu (+30 Nhịp) |
| Đỡ / Đỡ nhịp | Đỡ giảm 70% sát thương, tốn Thế. Đỡ nhịp 0,15 s; hoàn hảo 0,06 s (mở phản đòn) |
| Thế | Người chơi 100, hồi 20/s sau 1 s; vỡ thì choáng 1,2 s. Thế địch đầy thì choáng 2–3,5 s, mở đòn kết |
| Nhịp trống | **4 nấc** × 100. Nhẹ 8, nặng 15, Đỡ nhịp 25, hoàn hảo 40, né hoàn hảo 30, phá Thế 50; trúng đòn mất 30 (giữ nấc đầy) |
| Hồi trống | Đủ 4 nấc: tuyệt kỹ vũ khí, siêu giáp; kỹ nghệ, không phải phép hay sức thần (M013) |
| Hit-stop | nhẹ 0,04 s; vừa 0,07; nặng 0,10; đòn kết 0,12; nhịp cạy 0,08; nhả cạy 0,12 |
| Lock-on | 15 m, nón 60°; mất khi > 20 m hoặc khuất 1,5 s |
| AI | Tối đa 2 địch đánh cùng lúc; mỗi bộ chiêu tối đa 1 đòn trễ (N7) |
| Báo hiệu | Mọi đòn có **hình + tiếng**; đòn không Đỡ được thêm ánh đỏ đồng, rung, hình dạng riêng |
| Hồi máu | Nắm cơm lá: 4 lần, hồi 40%, dùng mất 1 s; nạp ở bếp lửa |

**Cạy khoen 3 nhịp:**
- Khoen đủ 3 vết nứt và boss đang choáng thì hiện "Cạy"; Cói tì Mũi Sào vào cổ (motion warping tới socket `neck`).
- Trống 84 bpm; mỗi nhịp có cửa sổ ±0,15 s, hit-stop 0,08 s, vết nứt sáng dần.
- Hụt thì thử lại nhịp đó 2 lần; hụt nữa thì con thú vùng ra, hồi nửa Thế, khoen giữ 3 nấc.
- Trợ năng: giữ nút thay bấm; mức "Nghe chuyện" cạy tự động.
- Nhả cạy: hit-stop 0,12 s, rồi **3 s im lặng**.

## 4. Vũ khí (`weapons.json`)
Dáng vũ khí theo hiện vật Đông Sơn (cơ sở T002 [SỬ LIỆU-TRANH LUẬN], ARC_DS; **mới có 1 dòng nguồn, mức B**). Món vũ khí trong game, chiêu thức và Hồi trống là [SÁNG TẠO].

| | Giáo đồng (Cói, ô 1) | Rìu xéo (Bương, ô 2) |
|---|---|---|
| Chất | Tầm 2,6 m, nhanh, Thế vừa | Tầm 1,8 m, chậm, Thế mạnh |
| Chuỗi nhẹ | Đâm thẳng → Đâm rút → Quét cán (→ Đâm xoáy) | Bổ xéo → Bổ ngược → Chặt xuống (→ Xoay rìu) |
| Nặng / Nhánh / Phản | Phóng mũi / Chống giáo hất / Phản mũi | Bổ gồng / Móc lưỡi / Phản rìu |
| Hồi trống | **Mũi trống dồn**: 4 mũi theo 4 nhịp | **Bổ trống rền**: 3 nhát theo 3 nhịp |

Cói chỉ có 1 ô; rìu đến khi Bương mở ô 2.

## 5. Quái thường (`enemies.json`)
- Tất cả [SÁNG TẠO]. Không người, cáo, bò sát, hay tên giao long/thuồng luồng (D-018, SB-01).
- **Không con nào mang khoen** (v1.2 §5). Cua và bọ ngựa bị đánh động khỏi hang ổ khi Lợn Lòi Đầm, đau vì mảnh khoen, càn phá đầm. Chúng đánh để tự vệ, hết sức thì **trốn**.
- Ụ Bùn là yêu đầm vốn ngủ trong bùn, thức dậy khi đầm bị xới tung. Khoen không sinh ra nó. Không mặt, không thân người, không gọi là thần đất.

| Quái | Loại | Dạy | Đòn chính |
|---|---|---|---|
| **Cua Càng Bùn** | thú | Đỡ nhịp; đánh hông (mai trước giảm 40%) | Kẹp càng, Kẹp đôi; *Ủi ngang* (không Đỡ được) |
| **Bọ Ngựa Lau** | côn trùng | Né hoàn hảo; đọc đòn trễ | Chém đôi; *Vồ phục* từ lau (không Đỡ được); Rình chém (đòn trễ) |
| **Ụ Bùn** | yêu (tinh anh) | Đòn nặng phá Thế; tránh vùng lầy | Đập bùn; *Lan bùn* (chậm 0,6 × trong 3 s) |

**Người bị mê** (không phải quái, SB-05): không khóa mục tiêu, không trúng đòn; giữ "Gọi tên" 2 s (bị đánh trúng mất nửa tiến độ); thành công thì về bến, +1 điểm nghề.

## 6. Boss: Lợn Lòi Đầm
- [SÁNG TẠO]; dùng họ skeleton bốn chân chung (V6). HP 2000, Thế 320.
- Nó đã giật đứt một cái bẫy; lưỡi bẫy đúc vụng từ mảnh khoen còn mắc ở cổ.
- **Khoen không có phép:** con thú hóa dữ vì đau và bị trói.

**Pha 1, Đe dọa:** Hất nanh, Quật đầu đôi (Đỡ được); **Càn lầy** (không Đỡ được: cào móng 3 lần, rống trầm, ánh đỏ đồng); Dậm lầy (đòn trễ duy nhất); Ủi bùn.

**Chuyển pha** khi khoen nứt 2 nấc **hoặc** HP ≤ 50%: con thú khuỵu, dụi cổ xuống bùn, mảnh lóe (3 s, vẫn trong gameplay). Cói: "Ai trói mày thế này?"

**Pha 2, Lộ nỗi đau** (tốc độ 0,85 ×, báo hiệu 1,25 ×, Thế 260): Giãy đau; **Càn khuỵu** (kết bằng vấp 1,5 s); Rống đau (không sát thương, một nhịp thở kể chuyện); Hất nanh chậm.

**Khoen và kết trận:**
- Khoen có 3 nấc nứt; mỗi lần phá Thế nứt thêm 1.
- Lần phá Thế thứ 3, hoặc khi HP chạm sàn 1 (buộc choáng), mở cạy. **Trận luôn kết bằng cạy**; con thú không chết.
- Sau cạy: nanh tự rụng, con thú đi vào lau, vè vang lên.
- Mảnh không thành vật phẩm, không UI đếm (V9); thợ đúc nấu nó.
- **Tắt khoen (K0, cờ `feature_khoen`):** kết bằng một cú đẩy; con thú chạy vào lau, vẫn rụng nanh.

## 7. Chế tác: Nanh Đầm (`items.json`)
- Ở **lò đúc làng** (hub), trong đời Cói. Đúc đồng rồi ghép; không rèn, không sắt.
- **Công thức:** Nanh rụng ×1 (`shed_after_pry`) + Đồng lò làng ×1 (thợ đúc tặng) + Dây mây ×2 → **Nanh Đầm** (*Marsh Fang*) [SÁNG TẠO], Hiếm. Đòn nặng và đòn nhánh +15% sát thương Thế.
- **Nâng cấp:** Sáp ong cũ (thưởng bí mật) + Dây mây ×1, lên +20%.
- Thợ đúc khi nấu mảnh: "Đồng đúc sai thì đúc lại, thành lưỡi cày cho ruộng."
- Không Thần khí. Validator chặn Bảo khí thiếu phần tự rụng (SB-06) và vật phẩm từ khoen.

## 8. Chuỗi bí mật "Lò bỏ hoang" (`secrets.json`)
Manh mối là ghi chép trong sổ tay, **không bao giờ mất**. Không có chữ trên vật (V2).
1. **Vết bẫy:** cọc bẫy gãy ở đầm nông **hoặc** ở cổng bãi lầy (hai nguồn thay thế).
2. **Đồng vụn:** theo hàng cọc vào bãi lau, thấy một lưỡi bẫy còn nguyên, đúc lại từ đồng vụn, mép cong như khúc vòng bị bẻ.
3. **Lò:** trong 4 mảnh miệng lò, chọn mảnh khớp đường cong. Chọn sai không bị phạt.
4. **Hốc lò:** nhận Sáp ong cũ; mục Codex "Khoen" mở thêm đoạn "Mảnh không tự trôi đi; người mang nó đi."

**Gợi ý 3 tầng:** hỏi bà lái đò (người chơi chủ động, tắt được): mơ hồ → chỉ hướng → chỉ thẳng.

**Chống softlock:**
- Mọi vùng quay lại được trước bàn giao.
- Hộp xác nhận bàn giao liệt kê việc còn dở.
- "Ký ức: chơi lại đời Cói" giữ trạng thái chuỗi theo dòng họ.
- Chuỗi chỉ chạy ở đời Cói vì có nội dung khoen.
- Validator duyệt mọi trạng thái: node nào cũng tới được, luôn còn đường tới node cuối, manh mối không bị tiêu hao.

## 9. Bàn giao và kế thừa (`lineage.json`)
**Thứ tự:**
1. Thẻ chữ "Nhiều đời sau".
2. "Nhiều đời trước có người giữ bến này. Giờ đến lượt con."
3. Mở **Thạp nhà** (gốm thô, trơn, miệng rộng; chỉ hiện chữ).
4. Nhận **Mũi Sào** với cán tre mới.
5. Cây kỹ năng giữ nguyên.
6. Mở ô 2 (rìu xéo).
7. Bãi sông: hình nộm rơm và 2 Cua Càng Bùn (SB11-13). Mục tiêu: đổi vũ khí ít nhất 1 lần. Không thua được.
8. Vè bản sàn, rồi Bương nói "Giữ bến bằng tay mình."

| Kế thừa | Quy tắc |
|---|---|
| Cây kỹ năng (*Nghề nhà*) | Giữ 100%. Võ 4 nút, Trống 4 nút; Vảy khóa tới `ch_phudong`. Điểm: khởi đầu 2, người bị mê +1, giải thoát boss +2, Bương +1 |
| Đòn nhà | **Chống sào** [SÁNG TẠO]: sau Đỡ nhịp hoàn hảo, bấm nặng để đẩy bật (55 Thế). Dùng với mọi vũ khí; học khi giải thoát boss |
| Thạp | Bảo khí xếp theo đời; đời sau trang bị được (giả định); không nhắc mai táng |
| Vũ khí, Mũi Sào | Bương giữ giáo, thêm rìu. Mũi Sào là công cụ, không chiếm ô, không chỉ số |

**Luật đời (SB-02, SB11-01):**
- Nội dung đời Hùng Vương thứ 6 không chứa "khoen", "mảnh", "chốt", kể cả từ `en` tương ứng.
- Mục Codex "Khoen" mở ở đời Cói và đọc lại được về sau, nhưng không mục khoen nào mở ở đời Hùng 6 (SB11-17).

## 10. Codex (`codex.json`) và thoại
| Mục | Nhãn | Nguồn |
|---|---|---|
| Bến Lau | [SÁNG TẠO] | — (hư cấu, không ở Hồ Tây) |
| Khoen | [SÁNG TẠO] | — ("không phải bùa, không ai yểm") |
| Lợn Lòi Đầm | [SÁNG TẠO] | — |
| Mũi Sào | [SÁNG TẠO] | — (câu mỹ thuật Đông Sơn; niên đại khảo cổ chưa đối chiếu) |
| Giáo đồng và rìu xéo | [SÁNG TẠO] (SB11-07) | Cơ sở T002, ARC_DS, LSVN15: **mới có 1 dòng nguồn, mức B** |
| Hồ Tinh | [HUYỀN THOẠI] | LNCQ (M003); dị bản Huyền Thiên Trấn Vũ; "Long Biên", "Đầm Xác Cáo" là tên về sau |

Màn Codex luôn hiện dòng "Nội dung văn hóa chưa qua chuyên gia duyệt (mức B)".

**Thoại** (`strings.json`) lấy nguyên văn v1.2 §7: 5 câu; vè sau cạy (chỉ đời Lạc Long Quân, Hùng 18); vè bản sàn cho đời Bương; câu chủ đề rút gọn. Hai bài vè cần người thật đọc lại.

## 11. Độ khó và trợ năng
| Mức | Sát thương nhận | Cửa sổ Đỡ nhịp | Khác |
|---|---|---|---|
| Nghe chuyện | 0,4 × | 2,0 × | Địch chậm 0,85 ×, báo hiệu 1,3 ×, cạy tự động |
| **Chèo đò** (mặc định) | 1,0 × | 1,0 × (0,15 s) | — |
| Ngược nước | 1,4 × | 0,8 × | Tắt hỗ trợ nhắm |
| Thác dữ | 1,8 × | 0,67 × | Báo hiệu **không** rút ngắn |

**Tùy chỉnh:** cửa sổ Đỡ nhịp 0,10–0,30 s; sát thương nhận 0,25–2,0 ×; tốc độ địch 0,8–1,1 ×; báo hiệu 1,0–1,5 ×; cạy tự động.

**Trợ năng:** cỡ/nền phụ đề; báo hiệu bằng hình dạng; tắt rung camera; giảm nhấp nháy; giữ nút khi cạy; lock-on bật/tắt hoặc giữ; âm báo hướng đòn; đổi phím.

## 12. Giả định (cốt truyện, chọn phương án an toàn)
1. Bộ quái chuẩn là Cua Càng Bùn, Bọ Ngựa Lau, Ụ Bùn (D-023, v1.2 §5).
2. Người bị mê bị giữ bởi "sương ảo". Đây chỉ là VFX, không phải quái.
3. Bến Sậy và các NPC là tên tạm, cần `naming_review`.
4. Bản `en` là nháp theo thuật ngữ SB11-16 (*Lau Landing*, *Pole-tip*, *Marsh Fang*, *Family Jar*, *Family Craft*).
5. Mảnh tới con lợn qua bẫy của thợ săn; thợ săn không xuất hiện.
6. Chế tác và nấu mảnh diễn ra trong đời Cói, trước bàn giao.
7. "Mở thạp chỉ hiện chữ" được hiểu là ràng buộc trình bày; đời sau vẫn trang bị được Bảo khí.
8. Thú thường bỏ chạy thay vì chết; Ụ Bùn sụp lại thành bùn.

## 13. Giả định cần playtest
- **Số liệu:** cửa sổ Đỡ nhịp 0,15/0,06 s; i-frame 0,20 s; cạy 84 bpm ±0,15 s; HP boss 2000, Thế 320/260; tốc độ tích Nhịp.
- **Thời lượng:** 15–25 phút. Hạ boss lần đầu ở mức Chèo đò: đích 3–6 phút, 2–4 lần chết.
- **Boss:**
  - Pha 2 có đọc ra "nỗi đau" không?
  - Khoảng lặng 3 s có quá dài không?
  - Phạt khi cạy hụt (hồi nửa Thế) nặng hay nhẹ?
  - Chuyển pha bằng HP 50% có làm người chơi bỏ qua cơ chế khoen không?
- **Bí mật:** ≥ 30% người chơi tìm ra mà không cần gợi ý; câu đố khớp hình có rõ không.
- **Bàn giao:** "mất mát hay háo hức?"
- **Câu hỏi bắt buộc (v1.2 §6):**
  - Tóm nguồn ác trong một câu (đạt ≥ 2/3).
  - "Có gợi phe vị thần nào không?"
  - "Có thấy bị cướp công không?"
- **Mức Nghe chuyện:** có đi hết được mà không cần Đỡ nhịp không?
