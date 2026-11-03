# Game Design Document — v0.1 (tên làm việc: HỒN TRỐNG)

> Trạng thái: BẢN NHÁP GIAI ĐOẠN 0. Các con số cân bằng là **giả định thiết kế**, sẽ được tinh chỉnh qua playtest.

## 1. Tầm nhìn
Action RPG góc nhìn thứ ba, đưa người chơi đi **từ huyền thoại tới lịch sử** của Việt Nam. Game có combat nặng ký, nhịp nhàng, theo nhịp trống đồng, và có Codex giúp người chơi phân biệt sử, truyền thuyết và hư cấu.

### Trụ cột (pillars)
1. **Nhịp trống**: combat xoay quanh nhịp điệu (parry, né, tích nhịp, bung tuyệt kỹ), có trọng lượng và có hit-stop.
2. **Tôn kính và chính xác**: mọi chi tiết đều có nhãn và nguồn. Thần thánh và anh hùng được thể hiện trang nghiêm.
3. **Thời đại sống**: mỗi chương là một thời đại riêng, với vũ khí, kiến trúc, quái vật và âm nhạc của thời đó.
4. **Bí ẩn văn hóa**: các chuỗi bí mật dựa trên tri thức văn hóa thật.

### Học nguyên lý (không sao chép)
- *God of War (2018+)*: máy quay liền mạch, quan hệ nhân vật làm động lực, vũ khí có cảm giác nặng.
- *Black Myth: Wukong*: boss nhiều pha có bản sắc thần thoại, kho quái phong phú, mỹ thuật dựa trên di tích thật.
- *Sekiro / Elden Ring*: thanh tư thế và parry, khu bán mở có lối tắt.

Toàn bộ nhân vật, câu chuyện và asset là sáng tác độc lập.

## 2. Cấu trúc
- 9 chương tuyến tính (xem `research/STORY_SHORTLIST.md`).
- Mỗi chương có:
  - 1 khu **bán mở** (khoảng 1–2 km² có thể đi lại; con số giả định), với làng, đền, hang, nhiệm vụ phụ và bí mật.
  - 1–2 đoạn tuyến tính để kể set-piece.
  - Boss chính (2–3 pha) và 2–4 mini-boss.
- **Khung truyện [SÁNG TẠO]**: Đồng lập lời thề với thần Đồng Cổ. Mỗi lần ngủ dài, giữa các chương có "Cõi Trống", một hub tâm linh để nâng cấp, xem Codex và trò chuyện với hồn trống.
- Thời lượng mục tiêu: chương 1 khoảng 2–3 giờ; cả game khoảng 25–35 giờ (giả định).

## 3. Combat
| Thành phần | Thiết kế |
|---|---|
| Đòn nhẹ / nặng | Chuỗi đòn nhẹ 4–5 nhịp; đòn nặng có thể gồng (charge) và gây nhiều thương tổn tư thế |
| Combo | Chuỗi đòn rẽ nhánh theo độ trễ giữa các lần nhấn (L-L-pause-H...) và theo hướng di chuyển |
| Né | Có i-frame (giả định 0.2s). Né đúng lúc (perfect dodge) thì tích Nhịp |
| Parry ("Đỡ nhịp") | Cửa sổ parry khoảng 150ms (giả định). Parry thành công tích Nhịp và gây sát thương tư thế cho địch. Có đòn không thể parry (báo hiệu bằng ánh đỏ đồng **và** âm thanh, không chỉ dựa vào màu) |
| Thanh tư thế / Stagger | Địch có thanh **Thế**. Khi thanh đầy địch bị choáng, mở ra đòn kết liễu (kiểu hành quyết, có tùy chọn giảm bạo lực) |
| Thanh Nhịp trống | Đầy 4 nấc thì tung **Hồi trống**: tuyệt kỹ của vũ khí đang dùng |
| Thế võ / vũ khí | Mỗi thời kỳ mở thêm vũ khí. Có thể đổi nhanh giữa 2 vũ khí trong trận |
| Phép thần thoại ("Phù lực") | Tiêu Linh khí: **Thủy lực** (gốc Rồng, Lạc Long Quân), **Sơn lực** (gốc Tiên/Tản Viên: dựng vách đá), **Lôi lực** (trống, sấm). Nguồn gốc ghi trong Codex; phần phép cụ thể gắn nhãn [SÁNG TẠO] |
| Game feel | Hit-stop theo khối lượng đòn (khoảng 40–120ms), camera shake có giới hạn (tắt được), âm thanh nhiều lớp (đồng, gỗ, da), VFX hoa văn Đông Sơn, rung tay cầm |
| AI | Địch phối hợp theo token (tối đa N địch tấn công cùng lúc), có telegraph rõ ràng |
| Boss | 2–3 pha; mỗi pha thêm cơ chế mới (ví dụ: Hồ Tinh pha 1 giả dạng người, pha 2 hiện hình cáo dùng ảo ảnh, pha 3 nước dâng nên phải đánh trên mặt nước dâng). Có checkpoint trước boss |

### Bảng vũ khí theo thời kỳ (tóm tắt)
| Thời kỳ | Vũ khí (cơ sở) | Nhãn |
|---|---|---|
| Văn Lang – Âu Lạc | Rìu xéo đồng, giáo đồng, dao găm cán tượng người, nỏ | [SỬ LIỆU] hiện vật Đông Sơn (ARC_DS). Kỹ năng gắn với vũ khí là [SÁNG TẠO] |
| Bắc thuộc – Ngô | Giáo, đao, khiên mây, cung | Cần nghiên cứu ở GĐ1 |
| Lý – Trần | Đao, kiếm, giáo, nỏ, cung; giáp vảy | Cần nghiên cứu (tham khảo hiện vật Hoàng thành) |
| Lê sơ | Đao, giáo, súng hỏa mai sơ khai (?) | **[CHƯA XÁC MINH]**, chưa dùng |

## 4. Trang bị và tiến trình
- **Loại**: Vũ khí, Giáp (đầu, thân, tay, chân), Ngọc (gắn lỗ), Bùa (phụ kiện, gắn với phong tục; nội dung tín ngưỡng phải qua cố vấn).
- **Độ hiếm**: Thường → Tốt → Quý → Hiếm → Huyền thoại → Thần khí (chỉ có ở chuỗi bí mật).
- **Nâng cấp**: +1…+10 bằng nguyên liệu theo vùng. **Chế tác** ở lò rèn, đền và lò đúc đồng.
- **Set bonus**: bộ 2/4 món (ví dụ: "Bộ Lạc tướng").
- **Cây kỹ năng**: 3 nhánh. *Võ* (combo, tư thế), *Trống* (Nhịp, Hồi trống), *Linh* (phù lực, hồi phục). Điểm kỹ năng nhận từ lên cấp và từ đền thờ (khám phá).
- **Quy tắc thời kỳ**: mỗi món đồ có `era` và `label`. Món fantasy phải ghi [SÁNG TẠO]. Đồ của thời trước vẫn dùng được (như di vật), nhưng mỗi thời đại lại có nguyên liệu và công thức mới.

## 5. Sự kiện động
- **Set-piece kịch bản**: lũ phá hang Hồ Tinh, nước dâng ở Ba Vì, thủy triều rút ở Bạch Đằng, ải Chi Lăng.
- **Sự kiện ngẫu nhiên có điều kiện**: do Director chọn từ bảng dữ liệu theo vùng, thời gian, thời tiết và tiến độ. Ví dụ:
  - Bà lão thử lòng (mô-típ cổ tích).
  - Thuồng luồng quấy bến sông.
  - Đoàn buôn bị phục kích.
  - Chim thần "may túi ba gang".
  - Mỗi sự kiện có `cooldown`, `weight` và `prereq`.
- **Lựa chọn**: chỉ ảnh hưởng chi tiết nhỏ (NPC sống hay chết, phần thưởng, thoại, kết cục nhiệm vụ phụ). **Mọi sự kiện lịch sử đã xác minh luôn diễn ra như sử chép**, và điều này được kiểm tra bằng test dữ liệu.

## 6. Cơ chế ẩn — Chuỗi Thần khí
| Thần khí | Chương | Manh mối văn hóa (ví dụ) | Canon |
|---|---|---|---|
| Tre đằng ngà | 3 | Lần theo các "ao vết chân ngựa", làng Cháy; cắt tre đúng thời điểm theo lịch nông | M005 |
| Nỏ thần | 5 | Giải đố đường xoắn ốc của Loa Thành; tìm vuốt Kim Quy | M008 |
| Gươm Thuận Thiên | 9 | Lưới cá (lưỡi gươm) + cây đa (chuôi gươm), hai nửa ghép lại | M014 dị bản 1 |
| Móng rồng (phụ) | 6 | Lần theo đường bay của rồng trên đầm | M015 |
| Đàn thần (phụ) | nhiệm vụ cổ tích | Chuỗi Thạch Sanh | M018 |

**Chống softlock:**
1. Chuỗi bí mật là đồ thị trạng thái nằm trong dữ liệu. Có test tự động kiểm tra mọi node đều đi tới được từ mọi trạng thái hợp lệ và không có vật phẩm manh mối nào bị tiêu hao vĩnh viễn.
2. Manh mối đã bỏ lỡ có thể lấy lại ở "Cõi Trống" hoặc khi quay lại vùng cũ (chương nào cũng quay lại được).
3. Không có điểm "không quay lại được" nào khóa mất một bí mật.

**Gợi ý 3 tầng:** Ông đồ / hồn trống gợi ý mơ hồ → gợi ý rõ hướng → chỉ thẳng vị trí. Người chơi chủ động hỏi, có tùy chọn tắt.

**Cân bằng thần khí:**
- Sát thương cơ bản bằng vũ khí Huyền thoại cùng cấp, cộng thêm **cơ chế độc nhất có đánh đổi**. Ví dụ: Tre đằng ngà có tầm đánh rộng và bỏ qua giáp, nhưng không parry được. Nỏ thần xuyên mục tiêu nhưng nạp chậm.
- Thần khí nâng cấp theo cùng hệ thống với đồ thường.
- Ở New Game+, thần khí có thể "thức tỉnh" thêm 1 cấp.

## 7. Hệ thống bổ sung đề xuất
- **Codex / Thư viện** (bắt buộc), sinh từ dữ liệu nghiên cứu. Có biểu tượng nhãn, nguồn và các dị bản.
- **Độ khó**: 4 mức sẵn có, cộng tùy chỉnh chi tiết (cửa sổ parry, sát thương nhận vào, tốc độ địch, hỗ trợ nhắm).
- **Trợ năng**: phụ đề tùy chỉnh (cỡ chữ, nền), chế độ mù màu, tắt rung lắc camera, giữ thay vì nhấn liên tục, remap phím đầy đủ, âm thanh báo hướng đòn, giảm hiệu ứng nhấp nháy.
- **New Game+**, **Photo mode**, **Thử thách boss** (Boss Rush ở Cõi Trống), **lưu đa slot cộng autosave**, **thống kê, thành tựu**.
- **Âm nhạc tương tác** theo pha boss, dùng chất liệu nhạc cụ dân tộc (cần nhạc sĩ thật).
- **Bản địa hóa** vi/en ngay từ đầu; lồng tiếng Việt.

## 8. Chương 1 — Vertical slice: "Đầm Xác Cáo"
- **Bối cảnh**: Long Biên cổ, rừng đầm và hang đá vôi [HUYỀN THOẠI M003]. Kiến trúc nhà sàn mái cong theo hoa văn trống đồng [SỬ LIỆU ARC_DS], được giản lược cho thời huyền thoại [SÁNG TẠO].
- **Mạch truyện**:
  - Dân làng mất tích.
  - Đồng (thợ săn kiêm lạc tướng trẻ) điều tra, phát hiện yêu cáo giả dạng người.
  - Lập lời thề với thần Đồng Cổ.
  - Đánh Hồ Tinh pha 1–2.
  - Pha 3: Lạc Long Quân dâng nước phá hang; người chơi sống sót và đánh những đòn cuối dưới sự hỗ trợ của thần, còn công diệt yêu thuộc về Lạc Long Quân theo canon.
  - Kết chương: Đồng chìm vào giấc ngủ của lời thề.
- **Nội dung đích**:
  - 1 khu bán mở.
  - 6 loại quái thường, 2 mini-boss, 1 boss 3 pha.
  - 2 vũ khí (giáo đồng, rìu xéo), 1 phù lực (Thủy).
  - 1 chuỗi bí mật nhỏ (chứng minh hệ thống).
  - 3 nhiệm vụ phụ, 2 sự kiện ngẫu nhiên.
  - Khoảng 25 mục Codex.
