# Thiết kế Demo 0.1 — lát cắt `ch_longbien`

`game-designer` (AI), 2026-11-03. **ĐỀ XUẤT**, chờ `qa-lead` và playtest. Bám `docs/DEMO_PLAN.md`, Story Bible v1.1 §7, D-017, D-018, V1–V9. Số liệu nằm trong `design/data/*.json` (schema: `design/schema/README.md`). **Mọi con số là giả định thiết kế cho tới khi playtest.**

## 1. Vòng chơi
**Mục tiêu (15–25 phút, giả định):** Cói chèo đò tới Bến Sậy tìm người đi cắt lau chưa về, gọi tỉnh người bị mê, giải thoát Lợn Lòi Đầm bằng cạy, về bến Lau chế Nanh Đầm, rồi bàn giao sang Bương.

**Vòng nhỏ (30–90 giây):** dò đường → gặp quái → đọc báo hiệu → Đỡ nhịp/né để tích Nhịp → phá Thế → đòn kết → nghỉ lửa hoặc đi tiếp.

**Vòng lớn:**
1. Bến Sậy: học điều khiển trên Cua Càng Bùn; bà lái đò nói câu mở màn.
2. Đầm nông, bãi lau: quái thường; nhặt dây mây; mở lối tắt về bến.
3. Gọi tỉnh người bị mê (giữ nút, không đánh): +1 điểm nghề.
4. Chuỗi bí mật (tùy chọn): vết bẫy → đồng vụn → lò bỏ hoang.
5. Boss Lợn Lòi Đầm: 2 pha, cạy khoen 3 nhịp, khoảng lặng, vè. Nanh rụng.
6. Lên đò về **hub bến Lau** (level riêng): thợ đúc làng nấu mảnh, Cói chế Nanh Đầm, cất vào Thạp.
7. Bàn giao: "Nhiều đời sau" → Bương → Thạp, Mũi Sào, cây kỹ năng → thử rìu với 2 Cua Càng Bùn → hết demo.

**Chết:** về bếp lửa gần nhất, không mất gì; quái thường hồi sinh. Có checkpoint ngay trước boss (`cp_cong_lau`).

## 2. Bản đồ graybox
Mọi địa danh trong vùng là [SÁNG TẠO]. Không có hồ lớn, đền, miếu, cây đa thờ hay mô phỏng di tích nào. Đầm ở đây là "rừng đầm phía tây" chung chung, không phải Hồ Tây.

```
                 [Z4 BÃI LẦY LÒ CŨ]  đấu trường boss, tròn r≈18 m
                   cọc tre đổ, 3 vũng lầy (chậm 0,75), không vật cản cao
                          │  cổng lau (cp_cong_lau: bếp lửa)
   [Z3 LÒ BỎ HOANG]──────┤
   lò đất sụp, 4 mảnh    │
   miệng lò (bí mật)     │
          │         [Z2 BÃI LAU]  lau cao ngang vai, tầm nhìn 6–8 m
          └─────────│  Bọ Ngựa Lau phục; người bị mê; dây mây ×4
                    │         ╲
                    │          ╲ lối tắt (mở từ phía trong) ──┐
              [Z1 ĐẦM NÔNG]  nước ngang mắt cá (không bơi)    │
              Cua Càng Bùn, Ụ Bùn; cọc bẫy gãy; dây mây ×2   │
                    │                                         │
              [Z0 BẾN SẬY] ◄──────────────────────────────────┘
              bếp lửa nghỉ; đò; bà lái đò; ===> [ĐÒ] ===> HUB
                                                        (level riêng)
[HUB BẾN LAU] khúc sông xuôi, cách đầm nhiều ngày đò: lò đúc làng,
kho có Thạp gốm, trống gỗ bịt da, bãi tập ven sông. Không thấy đầm.
```

| Vùng | Kích thước (giả định) | Vai trò |
|---|---|---|
| Z0 Bến Sậy | 30 × 25 m | Hướng dẫn, nghỉ, gợi ý |
| Z1 Đầm nông | 60 × 40 m | Dạy Đỡ nhịp, đánh hông; Ụ Bùn dạy đòn nặng |
| Z2 Bãi lau | 50 × 50 m | Dạy né hoàn hảo; tương tác gọi tên |
| Z3 Lò bỏ hoang | 20 × 20 m | Kể chuyện bằng môi trường; câu đố |
| Z4 Bãi lầy | r ≈ 18 m | Boss |

Trước boss có 3 dấu vết (N5): vết nanh cày bờ đất, cọc bẫy gãy dính lông bờm, lối lau rạp về phía lò.

## 3. Combat (`combat_tuning.json`)
| Thành phần | Thiết kế |
|---|---|
| Đòn nhẹ | Chuỗi 3 nhịp; nhịp 4 mở bằng kỹ năng *Nối đòn*. Input buffer 0,15 s |
| Đòn nặng | Gồng 2 mức (mức 2 cần *Gồng sức*); sát thương Thế lớn |
| Combo rẽ nhánh | Nhẹ, nhẹ, **dừng ≥ 0,35 s**, nặng → đòn nhánh riêng của mỗi vũ khí; né rồi nhẹ → đòn lướt |
| Né | 0,45 s; i-frame từ 0,05 s, kéo dài 0,20 s; né hoàn hảo nếu đòn trúng trong 0,10 s đầu i-frame (+30 Nhịp) |
| Đỡ / Đỡ nhịp | Giữ đỡ giảm 70% sát thương, tốn Thế người chơi. Cửa sổ Đỡ nhịp 0,15 s (+25 Nhịp, 20 Thế địch); hoàn hảo 0,06 s (+40 Nhịp, 40 Thế địch, mở phản đòn 0,6 s) |
| Thế | Người chơi 100, hồi 20/s sau 1 s; vỡ thì choáng 1,2 s. Địch có Thế riêng; đầy thì choáng 2–3,5 s, mở đòn kết |
| Nhịp trống | **4 nấc** × 100 điểm. Nhận: nhẹ 8, nặng 15, Đỡ nhịp 25, hoàn hảo 40, né hoàn hảo 30, phá Thế 50. Trúng đòn mất 30 nhưng giữ nấc đầy; 6 s không nhận thì tụt phần lẻ 10/s |
| Hồi trống | Đủ 4 nấc: tuyệt kỹ của vũ khí, siêu giáp, không bất tử. Là kỹ nghệ theo nhịp, không phải phép, không phải sức của thần Đồng Cổ (M013) |
| Hit-stop | nhẹ 0,04 s; vừa 0,07; nặng 0,10; đòn kết 0,12; nhịp cạy 0,08; nhả cạy 0,12. Áp cho cả hai bên |
| Lock-on | Bắt trong 15 m, nón 60°; mất khi > 20 m hoặc khuất 1,5 s; gạt cần > 0,6 để đổi mục tiêu; soft-lock 30° khi tắt |
| AI | Tối đa 2 địch tấn công cùng lúc (token); mỗi bộ chiêu tối đa 1 đòn trễ (N7) |
| Báo hiệu | Mọi đòn có **hình + tiếng**. Đòn không Đỡ được có thêm ánh đỏ đồng, rung tay cầm và hình dạng riêng (không chỉ màu) |
| Hồi máu | Nắm cơm lá: 4 lần, hồi 40%, dùng mất 1 s; nạp lại ở bếp lửa |

**Cạy khoen 3 nhịp:** khi khoen đủ 3 vết nứt và boss đang choáng, hiện "Cạy". Cói tì Mũi Sào vào cổ con thú (motion warping tới socket `neck`). Trống gõ 84 bpm; mỗi nhịp có cửa sổ ±0,15 s; mỗi nhịp có hit-stop 0,08 s và vết nứt sáng dần. Hụt thì được thử lại nhịp đó 2 lần; hụt nữa thì con thú vùng ra, hồi một nửa Thế, khoen vẫn giữ 3 nấc. Trợ năng: giữ nút 0,5 s mỗi nhịp; mức "Nghe chuyện" cạy tự động. Người chơi bất tử khi đang cạy. Nhả cạy: hit-stop 0,12 s, rồi **3 s im lặng**, không nhạc.

## 4. Vũ khí (`weapons.json`)
Dáng vũ khí theo hiện vật Đông Sơn (T002 [SỬ LIỆU-TRANH LUẬN], ARC_DS; **mới có 1 dòng nguồn, mức B**). Chiêu thức, chỉ số và Hồi trống là [SÁNG TẠO]. Codex ghi: thời truyền thuyết không đồng nhất với một văn hóa khảo cổ (SB-08).

| | Giáo đồng (Cói, ô 1) | Rìu xéo (Bương, ô 2) |
|---|---|---|
| Chất | Tầm 2,6 m, nhanh, Thế vừa | Tầm 1,8 m, chậm, Thế mạnh |
| Chuỗi nhẹ | Đâm thẳng → Đâm rút → Quét cán (→ Đâm xoáy) | Bổ xéo → Bổ ngược → Chặt xuống (→ Xoay rìu) |
| Nặng | Phóng mũi (gồng) | Bổ gồng |
| Nhánh | Chống giáo hất | Móc lưỡi (móc bằng lưỡi lệch) |
| Phản | Phản mũi | Phản rìu |
| Hồi trống | **Mũi trống dồn**: 4 mũi theo 4 nhịp | **Bổ trống rền**: 3 nhát theo 3 nhịp |

Cói chỉ có 1 ô (Story Bible). Rìu chỉ xuất hiện ở đoạn bàn giao, nơi Bương mở ô 2 và đổi giữa giáo kế thừa và rìu. Bản web có cờ debug cho phép Cói dùng rìu khi playtest, mặc định tắt.

## 5. Quái thường (`enemies.json`)
Tất cả [SÁNG TẠO]. Không người, không cáo, không bò sát, không tên giao long/thuồng luồng (D-018, SB-01). Thú hết sức thì **bỏ chạy**, không cảnh chết, đúng chủ đề "giữ bến bằng tay mình".

| Quái | Loại | Dạy kỹ năng | Đòn chính |
|---|---|---|---|
| **Cua Càng Bùn** | thú | Đỡ nhịp; đánh hông (mai trước giảm 40% sát thương) | Kẹp càng, Kẹp đôi; *Ủi ngang* (không Đỡ được, né ngang) |
| **Bọ Ngựa Lau** | côn trùng | Né hoàn hảo; đọc đòn trễ | Chém đôi; *Vồ phục* từ lau (không Đỡ được); Rình chém (đòn trễ duy nhất) |
| **Ụ Bùn** | yêu (tinh anh) | Đòn nặng phá Thế; tránh vùng lầy | Đập bùn; *Lan bùn* (vùng chậm 0,6 × trong 3 s) |

**Người bị mê** (không phải quái): đứng trong làn sương ảo ở bãi lau. Không khóa mục tiêu được, không trúng đòn. Giữ "Gọi tên" 2 s; bị đánh trúng thì mất một nửa tiến độ. Thành công: sương tan, người ấy về Bến Sậy, +1 điểm nghề (SB-05).

## 6. Boss: Lợn Lòi Đầm
[SÁNG TẠO]; họ skeleton bốn chân dùng chung (V6). Nó đã giật đứt một cái bẫy; lưỡi bẫy đúc vụng từ đồng của khoen vỡ còn mắc ở cổ. **Khoen không có phép:** con thú hóa dữ vì đau và vì bị trói (v1.1 §4). HP 2000, Thế 320.

**Pha 1, Đe dọa:** Hất nanh (Đỡ được), Quật đầu đôi (Đỡ được), **Càn lầy** (không Đỡ được: cào móng 3 lần, rống trầm, ánh đỏ đồng; né ngang), Dậm lầy (đòn trễ duy nhất), Ủi bùn (đỡ được, không Đỡ nhịp; né xuyên qua).

**Chuyển pha** khi khoen nứt 2 nấc **hoặc** HP ≤ 50%: con thú khuỵu, dụi cổ xuống bùn, mảnh lóe lên (3 s, vẫn trong gameplay). Cói nói: "Ai trói mày thế này?"

**Pha 2, Lộ nỗi đau:** tốc độ 0,85 ×, báo hiệu dài hơn 1,25 ×, Thế 260. Giãy đau (3 nhịp, Đỡ được), **Càn khuỵu** (ngắn, kết bằng vấp 1,5 s, tức là cơ hội đánh), Rống đau (không sát thương, đẩy lùi 2 m: một nhịp thở kể chuyện), Hất nanh chậm.

**Khoen:** 3 nấc nứt; mỗi lần phá Thế nứt thêm 1. Lần phá Thế thứ 3 (hoặc khi HP chạm sàn 1, buộc choáng) thì mở cạy. **Kết luôn bằng cạy**, con thú không chết. Sau cạy: nanh tự rụng (`mat_nanh_rung`), con thú đi vào lau; bà lái đò hát vè. Mảnh không thành vật phẩm: Cói mang về cho thợ đúc làng nấu (chỉ là cờ truyện, không UI đếm, V9).
**Tắt khoen (K0, cờ `feature_khoen`):** cú đẩy kết thúc, con thú chạy vào lau, vẫn rụng nanh.

## 7. Chế tác: Nanh Đầm (`items.json`)
- **Lò đúc làng** ở hub, trong đời Cói. Đúc đồng rồi ghép; không rèn, không sắt.
- **Công thức:** Nanh rụng ×1 (từ boss, `shed_after_pry`) + Đồng lò làng ×1 (thợ đúc tặng) + Dây mây ×2 (nhặt ở đầm, lau) → **Nanh Đầm** [SÁNG TẠO], Hiếm: đòn nặng và đòn nhánh +15% sát thương Thế.
- **Nâng cấp** bằng Sáp ong cũ (thưởng bí mật) + Dây mây ×1: lên +20%.
- Thợ đúc nói khi nấu mảnh: "Đồng đúc sai thì đúc lại, thành cái cuốc cho ruộng."
- Không có Thần khí. Validator chặn Bảo khí không có phần thú tự rụng (SB-06) và mọi vật phẩm từ khoen.

## 8. Chuỗi bí mật: "Lò bỏ hoang" (`secrets.json`)
Chuỗi 4 bước (v1.1 §7). Manh mối là ghi chép trong sổ tay, **không bao giờ mất**. Không có chữ trên vật (V2). Câu đố là khớp hình.
1. **Vết bẫy:** xem cọc bẫy gãy ở đầm nông **hoặc** ở cổng bãi lầy (2 nguồn thay thế).
2. **Đồng vụn:** theo hàng cọc vào bãi lau, thấy một lưỡi bẫy còn nguyên. Đó là đồng vụn đúc lại, mép cong như khúc vòng bị bẻ.
3. **Lò bỏ hoang:** trong 4 mảnh miệng lò, chọn mảnh có đường cong khớp mép lưỡi bẫy. Chọn sai không bị phạt.
4. **Hốc lò:** nhận Sáp ong cũ, và mục Codex "Khoen" mở thêm đoạn: "Mảnh không tự trôi đi; người mang nó đi."

**Gợi ý 3 tầng** (hỏi bà lái đò, người chơi chủ động, tắt được): mơ hồ → chỉ hướng → chỉ thẳng; mỗi bước đều có đủ 3 tầng.

**Chống softlock:**
- Mọi vùng quay lại được trước khi bàn giao.
- Khi bàn giao, hộp xác nhận liệt kê việc còn dở.
- Sau bàn giao, "Ký ức: chơi lại đời Cói" giữ trạng thái chuỗi theo dòng họ.
- Chuỗi khóa trong đời Cói vì có nội dung khoen.
- Validator duyệt mọi trạng thái: mọi node đi tới được từ start; từ mọi trạng thái tới được vẫn còn đường tới node cuối; không manh mối nào bị tiêu hao.

## 9. Bàn giao và kế thừa (`lineage.json`)
**Thứ tự:**
1. Thẻ chữ "Nhiều đời sau".
2. Người già ở bến: "Nhiều đời trước có người giữ bến này. Giờ đến lượt con."
3. Bương mở **Thạp nhà** (gốm, chỉ hiện chữ).
4. Bương nhận **Mũi Sào** với cán tre mới.
5. Màn cây kỹ năng giữ nguyên điểm.
6. Mở ô 2 (rìu xéo).
7. Bãi tập: 2 Cua Càng Bùn; mục tiêu là đổi vũ khí ít nhất 1 lần; không có trạng thái thua.
8. Hết demo.

| Kế thừa | Quy tắc |
|---|---|
| Cây kỹ năng (Nghề nhà) | Giữ 100%. Võ 4 nút, Trống 4 nút; nhánh Vảy khóa tới `ch_phudong`. Điểm: khởi đầu 2, người bị mê +1, giải thoát boss +2, Bương +1 |
| Đòn nhà | **Chống sào** [SÁNG TẠO]: sau Đỡ nhịp hoàn hảo, bấm nặng để đẩy bật đối thủ (55 Thế). Dùng với mọi vũ khí; học khi giải thoát boss; đời sau giữ |
| Thạp | Bảo khí xếp theo đời. Đời sau trang bị được (giả định). Không nhắc mai táng |
| Vũ khí | Bương giữ giáo của Cói và thêm rìu |
| Mũi Sào | Công cụ: không chiếm ô, không chỉ số. Mỗi thú được giải thoát để lại một vết khắc |

**Luật đời (SB-02):** mọi nội dung thuộc đời Hùng Vương thứ 6 không có chữ "khoen". Vì vậy:
- Mô tả Nanh Đầm, Thạp, Mũi Sào không nhắc khoen.
- Mục Codex "Khoen" ẩn trong đời Bương.
- Validator kiểm luật này.

## 10. Codex (`codex.json`, 6 mục)
| Mục | Nhãn | Nguồn |
|---|---|---|
| Bến Lau | [SÁNG TẠO] | — (địa danh hư cấu, không ở Hồ Tây) |
| Khoen | [SÁNG TẠO] | — ("không phải bùa, không ai yểm") |
| Lợn Lòi Đầm | [SÁNG TẠO] | — |
| Mũi Sào | [SÁNG TẠO] | — (kèm câu mỹ thuật Đông Sơn) |
| Giáo đồng và rìu xéo | [SỬ LIỆU-TRANH LUẬN] | ARC_DS, LSVN15 (T002); 1 dòng nguồn, mức B |
| Hồ Tinh | [HUYỀN THOẠI] | LNCQ (M003); dị bản Huyền Thiên Trấn Vũ; "Long Biên", "Đầm Xác Cáo" là tên về sau |

Thoại và vè: 5 câu lấy nguyên văn Story Bible v1.1 §7 (`strings.json`).

## 11. Độ khó và trợ năng
| Mức | Sát thương nhận | Cửa sổ Đỡ nhịp | Khác |
|---|---|---|---|
| Nghe chuyện | 0,4 × | 2,0 × | Địch chậm 0,85 ×, báo hiệu dài 1,3 ×, cạy tự động |
| **Chèo đò** (mặc định) | 1,0 × | 1,0 × (0,15 s) | — |
| Ngược nước | 1,4 × | 0,8 × | Tắt hỗ trợ nhắm |
| Thác dữ | 1,8 × | 0,67 × | Báo hiệu **không** rút ngắn |

**Tùy chỉnh:**
- Cửa sổ Đỡ nhịp 0,10–0,30 s.
- Sát thương nhận 0,25–2,0 ×.
- Tốc độ địch 0,8–1,1 ×.
- Thời gian báo hiệu 1,0–1,5 ×.
- Cạy tự động; hỗ trợ nhắm.

**Trợ năng tối thiểu:**
- Cỡ và nền phụ đề.
- Báo hiệu bằng hình dạng, không chỉ màu.
- Tắt rung camera; giảm nhấp nháy.
- Giữ nút thay bấm nhịp khi cạy.
- Lock-on kiểu bật/tắt hoặc giữ.
- Âm thanh báo hướng đòn.
- Đổi phím.

## 12. Giả định (cốt truyện, chọn phương án an toàn)
1. Quái thường theo chỉ đạo điều phối: Cua Càng Bùn, Bọ Ngựa Lau, Ụ Bùn. Không dùng bộ Rái Đầm, Lợn Rừng Non, Bóng Mê của v1.1 §7; Story Bible sẽ được sửa theo dữ liệu này.
2. Người bị mê bị giữ bởi "sương ảo" (chỉ là VFX, không phải quái). Đây là ảnh hưởng của Hồ Tinh, nhưng demo không nói rõ.
3. Bến Sậy, bà lái đò, người đi cắt lau, người già ở bến là tên và vai tạm [SÁNG TẠO], cần qua `naming_review`.
4. Bản dịch `en` của 5 câu thoại là bản nháp.
5. Mảnh khoen tới con lợn qua bẫy của thợ săn (v1.1 §4). Thợ săn không xuất hiện.
6. Chế tác và nấu mảnh diễn ra ở hub **trong đời Cói**, trước bàn giao. Bàn giao không nhắc khoen.
7. Đời sau trang bị được Bảo khí trong Thạp. Story Bible chỉ nói "mở thạp chỉ hiện chữ"; ở đây hiểu đó là ràng buộc trình bày.
8. Bãi tập của Bương dùng Cua Càng Bùn ở mép sông hub. Không bò sát, không khoen.
9. Thú thường bỏ chạy thay vì chết (giọng điệu "thả thú"). Riêng Ụ Bùn sụp thành bùn.

## 13. Giả định cần playtest
- Mọi con số trong `design/data/*.json`, đặc biệt: cửa sổ Đỡ nhịp 0,15/0,06 s; i-frame 0,20 s; nhịp cạy 84 bpm ±0,15 s; HP boss 2000 và Thế 320/260; tốc độ tích Nhịp.
- Thời lượng 15–25 phút, và thời gian hạ boss lần đầu ở mức Chèo đò (đích 3–6 phút, khoảng 2–4 lần chết).
- Pha 2 có đọc ra "nỗi đau" không; khoảng lặng 3 s có quá dài không.
- Cạy hụt thì phạt "hồi một nửa Thế": nặng hay nhẹ?
- Chuyển pha bằng HP 50% có làm người chơi bỏ qua cơ chế khoen không.
- Người chơi có tìm ra chuỗi bí mật không cần gợi ý không (đích ≥ 30%); câu đố khớp hình có rõ không.
- Bàn giao: "mất mát hay háo hức?"; đổi vũ khí có trơn không.
- Câu hỏi bắt buộc (v1.1 §6):
  - Tóm nguồn ác trong một câu (đạt ≥ 2/3).
  - "Có gợi phe vị thần nào không?"
  - "Có thấy bị cướp công không?"
- Mức Nghe chuyện có thật sự đi hết được không cần Đỡ nhịp không.
