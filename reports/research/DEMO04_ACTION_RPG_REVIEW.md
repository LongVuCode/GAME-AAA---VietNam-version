# Đánh giá nghiên cứu Demo 0.4 — action RPG rubric v1

Ngày: 2026-11-10 (Asia/Saigon). Tác giả đánh giá: Codex. Trạng thái: **đánh giá chuyên gia sơ bộ theo bằng chứng hiện có; phần khảo sát cộng đồng chưa hoàn thành vì truy cập bị chặn**.

## 1. Kết luận thẳng

Demo 0.4 là prototype kiểm chứng luật chơi đã đi được tới cuối, chưa phải một action RPG hoàn thiện đủ chất lượng để đem bán hoặc quảng bá ngang những game dẫn đầu. Điểm yếu lớn nhất là chất lượng hành trình và phần hiện thân của thế giới: bố cục, dẫn đường, khám phá, nhịp, người và quái. Điểm mạnh là bộ khung luật/kiểm tra và ý tưởng giải thoát boss gắn gia đình chèo đò. Không lấy công sức đã bỏ ra, bản sắc Việt hoặc test pass để nâng điểm trải nghiệm.

Tôi đã tham gia làm bản sửa và báo cáo trước, nên có xung đột lợi ích tiềm tàng. Việc dùng rubric công khai giúp kiểm tra lại cách chấm nhưng không biến đây thành đánh giá độc lập. Phải có người ngoài chơi và chấm lại trước kết luận phát hành.

## 2. Đối tượng, bằng chứng và điều không được nhận vơ

- Chấm **bản web Demo 0.4** có mã ứng dụng `9f6a426`, gói bàn giao nguồn `0a7a47f`; HEAD sau đó chủ yếu là tài liệu. Không chấm bản artifact cũ main `5a29f94` như thể nó là 0.4.
- Không cộng điểm cho proposal 0.5, combat *_0_4 chưa ghép, model Blender chưa dựng hoặc module Unreal chưa build.
- V: ảnh Bến Sậy/đấu trường High và ảnh graybox cùng góc ở `/workspace/demo04-review/images`; đã xem trong các lượt chuẩn bị gói.
- P: phản hồi trực tiếp của PO sau chơi, 8 vấn đề trong hội thoại. Đây là một người chơi biết dự án, không đại diện cộng đồng và không phải khảo sát nhiều người.
- C: source/data/tests đang có, đặc biệt world_0_4, quests, game/input/audio, anim/rig/creatures và smoke.
- T: log smoke `/tmp/smoke04-verified.log` kết thúc 86/86; QA_DEMO04_PRY_CLOCK và DEMO_0_4_REPORT: 159 web, 102 Python, validator 0 lỗi/12 cảnh báo. Đây là kết quả đã ghi nhận trước, không phải test mới chạy cho bài review.
- Không có phiên tự chơi thủ công mới có đồng hồ bấm giờ, không có listening test mới, không có khảo sát mạng xã hội đã thu được, không có đo input/VRAM/FPS máy người dùng. Tôi không tự nhận đã chơi trọn 1–3 giờ như người dùng.

## 3. Thang điểm và quy tắc chấm

Mỗi tiêu chí có 5 thành phần, **mỗi thành phần 0–10**, tổng tối đa **50**. Trọng số trong từng tiêu chí bằng nhau. Điểm phản ánh mức biểu hiện trong bản demo so với mục tiêu chất lượng trải nghiệm, không phải mức hoàn thành checklist, công sức hay ngân sách studio.

| Điểm thành phần | Mốc neo |
|---:|---|
| 0 | Bằng chứng cho thấy vắng hoàn toàn hoặc không sử dụng được; không dùng 0 thay cho thiếu dữ liệu |
| 1–2 | Mới phác thảo, yếu rõ, hay cản trải nghiệm |
| 3–4 | Có chức năng nhưng thô/hạn chế; khoảng cách lớn tới mức phát hành thuyết phục |
| 5–6 | Đủ dùng, tương đối nhất quán, còn thiếu chiều sâu hoặc polish |
| 7–8 | Mạnh, nhiều tình huống kiểm chứng, phần lớn hỗ trợ tốt trải nghiệm |
| 9–10 | Xuất sắc, nhất quán cả hành trình, được đối chiếu độc lập; không phải chỉ một screenshot đẹp |

Tổng tiêu chí: 0–9 rất yếu; 10–19 yếu/prototype; 20–29 có nền nhưng thiếu; 30–39 tốt; 40–44 rất mạnh; 45–50 xuất sắc. Đây là rubric làm riêng cho dự án, **không phải chuẩn ngành được công nhận**, không tuyên bố được rút từ dữ liệu Reddit/Steam chưa tải được.

Độ tin cậy C/M/T = cao/vừa/thấp trong tập bằng chứng này. Cao không có nghĩa đại diện thị trường. Các số nguyên để nêu rõ phán đoán, không phải phép đo chính xác tới 1 điểm; chênh 1–2 điểm không có ý nghĩa xếp hạng chắc chắn. Khi bằng chứng chưa đủ, dùng NC, không quy thành 0.

## 4. Bảng điểm 24 tiêu chí có thể đánh giá sơ bộ

Cột năm số tương ứng năm thành phần được giải nghĩa ở mục 5. Tránh so sánh 28 điều khiển với 27 kỹ thuật như một phép đo cùng đơn vị vật lý.

| # | Tiêu chí | Năm điểm /10 | Tổng /50 | Tin cậy |
|---:|---|---|---:|:---:|
| 1 | Vòng lặp chơi cốt lõi | 4 / 4 / 3 / 4 / 3 | **18** | M |
| 2 | Điều khiển và độ đáp ứng | 7 / 6 / 5 / 5 / 5 | **28** | M |
| 3 | Cảm giác chiến đấu | 4 / 5 / 4 / 4 / 3 | **20** | T |
| 4 | Kẻ địch và bố trí encounter | 3 / 3 / 2 / 2 / 2 | **12** | M |
| 5 | Thiết kế boss | 5 / 4 / 4 / 4 / 3 | **20** | M |
| 6 | Cân bằng và đường cong học | 4 / 3 / 3 / 3 / 2 | **15** | T |
| 7 | Chiều sâu RPG/build | 5 / 4 / 3 / 3 / 3 | **18** | M |
| 8 | Phần thưởng và kinh tế | 3 / 3 / 2 / 2 / 2 | **12** | M |
| 9 | Bố cục level và kết nối | 3 / 2 / 2 / 2 / 1 | **10** | C |
| 10 | Dẫn đường và khả năng đọc không gian | 3 / 3 / 2 / 2 / 2 | **12** | C |
| 11 | Khám phá và phát hiện | 2 / 3 / 2 / 2 / 1 | **10** | C |
| 12 | Thiết kế nhiệm vụ | 4 / 3 / 3 / 2 / 2 | **14** | C |
| 13 | Cốt truyện và truyền đạt | 6 / 4 / 4 / 3 / 3 | **20** | M |
| 14 | NPC và hội thoại | 4 / 3 / 3 / 3 / 2 | **15** | M |
| 15 | Kể chuyện qua môi trường | 3 / 3 / 2 / 2 / 2 | **12** | M |
| 16 | Nhịp chơi và thời lượng có giá trị | 2 / 2 / 2 / 2 / 1 | **9** | C |
| 17 | Môi trường và art direction | 4 / 4 / 3 / 3 / 3 | **17** | C |
| 18 | Chất lượng nhân vật người | 2 / 1 / 1 / 2 / 1 | **7** | C |
| 19 | Thiết kế hình quái | 2 / 2 / 1 / 2 / 2 | **9** | C |
| 20 | Animation và trình diễn | 3 / 3 / 3 / 3 / 2 | **14** | M |
| 21 | Âm thanh và âm nhạc | 3 / 3 / 2 / 2 / 2 | **12** | T |
| 22 | UI và trợ năng hiện có | 6 / 5 / 5 / 4 / 4 | **24** | M |
| 23 | Độ tin cậy kỹ thuật trong phạm vi demo | 7 / 6 / 5 / 5 / 4 | **27** | M |
| 24 | Bản sắc thể hiện trong bản chơi | 6 / 5 / 4 / 4 / 3 | **22** | M |

**Tổng mô tả: 377/1.200, trung bình khoảng 15,7/50 trên 24 tiêu chí đã chấm.** Không chuyển thành điểm Steam/Metacritic, phần trăm người hài lòng hay xác suất thành công. Các tiêu chí có giao thoa (ví dụ layout–navigation–exploration); tổng ngang trọng số này chỉ là bảng điều khiển phát triển, chưa được xác thực như chỉ số tâm lý. Không dùng tổng thay cho nhìn các điểm chặn riêng.

Không có điểm “tiềm năng” để bù điểm hiện tại. Bản sắc 22/50 không có nghĩa một concept mới được cộng điểm hơn trải nghiệm thực tế; chỉ ghi nhận yếu tố đã thể hiện.

## 5. Giải thích từng điểm và việc cần chứng minh

### 1. Vòng lặp chơi cốt lõi: 18/50

- Thành phần theo thứ tự: Mục tiêu, hành động, phản hồi, động lực tiếp tục, độ biến đổi. Điểm: 4 + 4 + 3 + 4 + 3.
- Nhận xét: Có đánh/nhặt/mở khóa/boss nhưng phản hồi PO cho thấy động lực khám phá chưa rõ; chuỗi thao tác tồn tại chưa thành một hành trình lôi cuốn.
- Bằng chứng: quests.json; smoke; PO.
- Để nâng điểm: Mỗi vòng 10 phút phải trả lời được: muốn gì, làm gì, học được gì, vì sao đi tiếp.

### 2. Điều khiển và độ đáp ứng: 28/50

- Thành phần theo thứ tự: Ánh xạ, phản hồi input, buffer/cancel, camera, tùy chỉnh. Điểm: 7 + 6 + 5 + 5 + 5.
- Nhận xét: Có remap, preset, buffer và lock-on được test; chưa có đo input-to-photon hoặc thử tay cầm thật. Không kết luận cảm giác ngang Sekiro từ code.
- Bằng chứng: controls.test.mjs; combat.test.mjs.
- Để nâng điểm: Đo input trên máy thật, video camera/target ở góc hẹp; giữ remap.

### 3. Cảm giác chiến đấu: 20/50

- Thành phần theo thứ tự: Trọng lượng, va chạm, tiếp xúc animation, phản ứng, tính liền mạch. Điểm: 4 + 5 + 4 + 4 + 3.
- Nhận xét: Hit-stop và nhiều lớp FX có thật; người/quái hình học và motion thủ tục khiến độ thuyết phục tiếp xúc còn hạn chế. Chưa có phiên nghe/chơi thủ công mới.
- Bằng chứng: smoke; anim; PO.
- Để nâng điểm: Làm một combo/né/đỡ trên rig hoàn chỉnh trước khi thêm 30 chiêu.

### 4. Kẻ địch và bố trí encounter: 12/50

- Thành phần theo thứ tự: Vai trò, phối hợp, địa hình, biến đổi, điểm yếu đọc được. Điểm: 3 + 3 + 2 + 2 + 2.
- Nhận xét: Các vai quái và token đánh đã có; số tình huống thể hiện chưa đủ phong phú, hình quái chưa truyền được vai trò. Thiết kế 0.4 chưa ghép không được tính.
- Bằng chứng: enemyAi; boss tests; HANDOFF.
- Để nâng điểm: Dựng ba encounter dùng cùng quái nhưng yêu cầu quyết định khác nhau.

### 5. Thiết kế boss: 20/50

- Thành phần theo thứ tự: Báo hiệu, học quy luật, tiến triển pha, kết nối truyện, cao trào. Điểm: 5 + 4 + 4 + 4 + 3.
- Nhận xét: Boss có chuỗi đòn/đổi pha/cạy, giải thoát là điểm khác biệt; smoke dùng hook setup không chứng minh trận đánh tự nhiên cân bằng.
- Bằng chứng: smoke 86/86; boss.test.mjs.
- Để nâng điểm: Playtest lần đầu không debug, ghi tử vong/đòn khó đọc; dựng hình và animation riêng.

### 6. Cân bằng và đường cong học: 15/50

- Thành phần theo thứ tự: Dạy cơ chế, tăng độ khó, phản hồi thất bại, công bằng, kiểm chứng. Điểm: 4 + 3 + 3 + 3 + 2.
- Nhận xét: Có thông số/khó dễ; thiếu mẫu người chơi để biết dễ vì quen hay do AI đơn giản. Không chấm khó cao là hay.
- Bằng chứng: difficulty; tuning; PO.
- Để nâng điểm: Cho 5 người mới chơi, ghi chỗ hiểu sai thay vì chỉ tăng HP.

### 7. Chiều sâu RPG/build: 18/50

- Thành phần theo thứ tự: Lựa chọn, synergies, đánh đổi, tiến triển, khác biệt lối chơi. Điểm: 5 + 4 + 3 + 3 + 3.
- Nhận xét: Có hai vũ khí, kỹ năng, trang bị và XP; chưa chứng minh build khác nhau tạo cách giải quyết khác nhau qua một hành trình đủ dài.
- Bằng chứng: inventory tests; skills data.
- Để nâng điểm: Chứng minh hai build chơi khác nhau trong cùng encounter, không chỉ khác damage.

### 8. Phần thưởng và kinh tế: 12/50

- Thành phần theo thứ tự: Công dụng, dự báo, nhịp thưởng, cân đối nguồn, gắn khám phá. Điểm: 3 + 3 + 2 + 2 + 2.
- Nhận xét: Có crafting và vật liệu, nhưng phản hồi nhặt đồ không hiểu mục đích là lỗi giá trị cảm nhận; không thể gọi loot table có dữ liệu là kinh tế tốt.
- Bằng chứng: crafting tests; PO.
- Để nâng điểm: Cho người chơi thấy nhu cầu/công dụng trước khi bắt tìm vật liệu.

### 9. Bố cục level và kết nối: 10/50

- Thành phần theo thứ tự: Tuyến, vòng/lối tắt, địa hình, mục đích vùng, kết nối nhiệm vụ. Điểm: 3 + 2 + 2 + 2 + 1.
- Nhận xét: Map đi được và nối thông; quy tắc giữ tọa độ cũ làm phần mở rộng bao quanh tuyến chính. PO thấy tuyến tới boss và không gian chưa thú vị.
- Bằng chứng: world_0_4; COMBAT_0_4 §6; walkable; PO.
- Để nâng điểm: Thiết kế lại graph nhiệm vụ và level, cho graybox playtest trước art.

### 10. Dẫn đường và khả năng đọc không gian: 12/50

- Thành phần theo thứ tự: Landmark, ngã rẽ, mục tiêu HUD, liên kết lời chỉ, phục hồi khi lạc. Điểm: 3 + 3 + 2 + 2 + 2.
- Nhận xét: HUD quest/minimap tồn tại nhưng PO vẫn không biết đi đâu; phải hạ điểm kết quả, không lấy sự hiện diện HUD thay cho hiệu quả.
- Bằng chứng: PO; screenshot; smoke UI.
- Để nâng điểm: Test không hướng dẫn: 4/5 người tự tới mốc đầu; ghi chỗ chạy vòng.

### 11. Khám phá và phát hiện: 10/50

- Thành phần theo thứ tự: Tò mò, khám phá có nghĩa, ngạc nhiên, payoff, tự chọn đường. Điểm: 2 + 3 + 2 + 2 + 1.
- Nhận xét: Rương/điểm nhìn/bí mật có thật, nhưng chưa tạo mạng phát hiện làm thay đổi hiểu biết và hành trình; diện tích không phải thước đo khám phá.
- Bằng chứng: world data; PO.
- Để nâng điểm: Mỗi nhánh cho một hiểu biết/cách chơi/lối nối mới; bỏ nhánh chỉ có vật nhặt vô nghĩa.

### 12. Thiết kế nhiệm vụ: 14/50

- Thành phần theo thứ tự: Động cơ, biến đổi hành động, lựa chọn, hậu quả, gắn thế giới. Điểm: 4 + 3 + 3 + 2 + 2.
- Nhận xét: Tuyến 6 bước và nhiệm vụ phụ đã tích hợp; các cờ/thoại hội tụ nhiều hơn thay đổi trải nghiệm, người chơi vẫn cảm thấy chạy-nhặt.
- Bằng chứng: quests; story smoke; PO.
- Để nâng điểm: Dựng chặng cứu người/mở đường có hậu quả nhìn được, không chỉ đổi objective.

### 13. Cốt truyện và truyền đạt: 20/50

- Thành phần theo thứ tự: Tiền đề, nhân quả, truyền đạt qua chơi, tiết chế, payoff. Điểm: 6 + 4 + 4 + 3 + 3.
- Nhận xét: Cói–Nghệ, khoen gây đau và giải thoát có mạch; ý tưởng tốt hơn cách truyền đạt hiện tại. Chưa được cộng điểm cho toàn saga chưa làm.
- Bằng chứng: STORY_INTEGRATION; cinematic smoke; PO.
- Để nâng điểm: Hỏi người chơi trước boss: vì sao tới đây, boss đau vì gì, muốn làm gì?

### 14. NPC và hội thoại: 15/50

- Thành phần theo thứ tự: Cá tính, mục đích, hội thoại, phản ứng, đời sống. Điểm: 4 + 3 + 3 + 3 + 2.
- Nhận xét: NPC có tên/choices và bàn giao đời; model/animation và thay đổi sinh hoạt chưa đủ làm họ thành người sống trong cảnh.
- Bằng chứng: dialogue; story smoke; screenshot.
- Để nâng điểm: Một NPC có công việc và phản ứng theo quest trước khi thêm nhiều cây thoại.

### 15. Kể chuyện qua môi trường: 12/50

- Thành phần theo thứ tự: Dấu tích, khả năng suy luận, gắn địa điểm, phản ứng, thống nhất. Điểm: 3 + 3 + 2 + 2 + 2.
- Nhận xét: Có thuyền lật/vết bẫy/đồ bỏ lại trong thiết kế; cảnh vẫn thiên về rải tài sản và trigger đọc mô tả, PO cảm thấy trống.
- Bằng chứng: quests.new_points; screenshot; PO.
- Để nâng điểm: Dựng một cụm cảnh mà người chơi suy ra sự kiện trước khi đọc chữ.

### 16. Nhịp chơi và thời lượng có giá trị: 9/50

- Thành phần theo thứ tự: Luân phiên, khoảng lặng, cao trào, thời lượng hữu ích, tôn trọng thời gian. Điểm: 2 + 2 + 2 + 2 + 1.
- Nhận xét: PO thấy ngắn và đơn điệu; chưa đo thời gian người mới. Không chấm thấp chỉ vì dưới 1–3 giờ, mà vì thiếu hành trình nội dung có sức nặng.
- Bằng chứng: PO; scope demo; handoff.
- Để nâng điểm: Ghi timeline hành động/chạy/đọc/chết; cắt filler trước khi thêm thời lượng.

### 17. Môi trường và art direction: 17/50

- Thành phần theo thứ tự: Bố cục, vật liệu, ánh sáng, chi tiết có nghĩa, nhất quán. Điểm: 4 + 4 + 3 + 3 + 3.
- Nhận xét: PBR/HDRI/cây cỏ nâng cảnh rõ so graybox; terrain/props/thảm cây và nhân vật chưa hòa thành chuẩn hình ảnh thuyết phục. Trống về ý nghĩa không đồng nghĩa không có polygon.
- Bằng chứng: 2 cặp ảnh; envshots logs; PO.
- Để nâng điểm: Một cảnh hoàn chỉnh có foreground/midground/background và hoạt động sống.

### 18. Chất lượng nhân vật người: 7/50

- Thành phần theo thứ tự: Silhouette, anatomy/model, vật liệu, mặt/tay, tích hợp. Điểm: 2 + 1 + 1 + 2 + 1.
- Nhận xét: Rig dùng khối/hình học, không phải nhân vật hoàn thiện; ảnh xác nhận lệch giữa môi trường PBR và người primitive. Đây là thiếu sản xuất asset thật.
- Bằng chứng: anim/rig.js; ảnh; PO.
- Để nâng điểm: Hoàn thiện Cói từ model đến animation ở camera thật.

### 19. Thiết kế hình quái: 9/50

- Thành phần theo thứ tự: Đặc trưng, anatomy/model, vật liệu, chuyển động, khớp vai trò. Điểm: 2 + 2 + 1 + 2 + 2.
- Nhận xét: Brief Dế Cõng Đá giàu ý tưởng nhưng hình đang dùng legacy primitive/cua; không cộng điểm concept chưa dựng thành model.
- Bằng chứng: creatures_0_4; anim/creatures; PO.
- Để nâng điểm: Một quái hoàn thiện với silhouette, hành vi và âm thanh riêng.

### 20. Animation và trình diễn: 14/50

- Thành phần theo thứ tự: Locomotion, combat, chuyển trạng thái, tương tác, staging. Điểm: 3 + 3 + 3 + 3 + 2.
- Nhận xét: Có rig khớp, IK và pose thủ tục; chưa có độ mềm/chuyển động/biểu cảm của asset hoàn thiện. Test toán IK không đồng nghĩa animation đẹp.
- Bằng chứng: anim; animation tests; ảnh.
- Để nâng điểm: Sửa contact, foot planting, hand grip và pose chuyển trước hiệu ứng điện ảnh.

### 21. Âm thanh và âm nhạc: 12/50

- Thành phần theo thứ tự: Thông tin, chất liệu, không gian, nhạc/cảm xúc, phối âm. Điểm: 3 + 3 + 2 + 2 + 2.
- Nhận xét: WebAudio tổng hợp đủ báo hiệu prototype; chưa có đánh giá nghe trực tiếp mới hoặc bộ âm hoàn thiện. Điểm thấp độ tin cậy, không kết luận mix chi tiết bị lỗi.
- Bằng chứng: game/audio.js; README.
- Để nâng điểm: Thử Foley/vũ khí/vật liệu/âm môi trường mẫu, rồi listening test trên tai nghe/loa.

### 22. UI và trợ năng hiện có: 24/50

- Thành phần theo thứ tự: Thông tin, phân cấp, tương tác, trợ năng, nhất quán. Điểm: 6 + 5 + 5 + 4 + 4.
- Nhận xét: Có HUD, map, remap, option, localization; UI đôi khi nhiều thông báo giữa màn hình, định hướng chưa hiệu quả. Không được coi option trong JSON là chứng nhận trợ năng.
- Bằng chứng: ảnh; controls/UI tests; PO.
- Để nâng điểm: Giảm chồng chữ, ưu tiên mục tiêu; test chữ/độ tương phản/tay cầm và người có nhu cầu trợ năng.

### 23. Độ tin cậy kỹ thuật trong phạm vi demo: 27/50

- Thành phần theo thứ tự: Luật, luồng hoàn thành, lỗi biên, asset/build, tái lập. Điểm: 7 + 6 + 5 + 5 + 4.
- Nhận xét: 159 web/102 Python/86 smoke và checksum là bằng chứng mạnh hơn phần khác; vẫn là một môi trường browser, bot có hook/god mode, chưa đủ chấm ổn định thương mại.
- Bằng chứng: QA report; smoke log; manifest.
- Để nâng điểm: Ma trận máy, phiên thủ công không hook, stress/save tests trước điểm cao hơn.

### 24. Bản sắc thể hiện trong bản chơi: 22/50

- Thành phần theo thứ tự: Chủ đề, cơ chế gắn chủ đề, mỹ thuật, nhân vật, khác biệt. Điểm: 6 + 5 + 4 + 4 + 3.
- Nhận xét: Chèo đò/Mũi Sào/nhịp trống/giải thoát tạo nét riêng; hình primitive và chuỗi quest chưa truyền tải ngang sức mạnh concept. Không đánh đồng với độ đúng lịch sử.
- Bằng chứng: story; boss; art docs; ảnh.
- Để nâng điểm: Biến thao tác nghề và đời sống thành hành động xuyên suốt, không chỉ thay tên/vỏ Việt.

## 6. Bốn tiêu chí chưa đủ dữ liệu — NC/50

| Tiêu chí | Vì sao chưa chấm | Cần gì để chấm |
|---|---|---|
| Hiệu năng và khả năng mở rộng | FPS 4–6 trong smoke là SwiftShader CPU, không thể suy ra RTX 5050 hoặc máy thị trường | Build mục tiêu, cấu hình máy, frame-time median/p95/p99, hitch, VRAM, resolution và quality, hành trình lặp lại |
| Save/load và độ bền tiến trình | Source đọc settings localStorage và kế thừa trong phiên chưa chứng minh persistent save toàn nhiệm vụ | Thoát/mở lại ở từng chặng, chết/đổi vùng, save cũ/hỏng, kiểm vật phẩm/NPC/cờ không mất hoặc nhân đôi |
| Độ bền/giá trị chơi lại sau lần đầu | Chưa có playthrough lặp với build khác hoặc người chơi độc lập | Hai lượt khác lựa chọn/build; ghi tình huống thực sự thay đổi, không chỉ thoại/cosmetic |
| Độ xác thực văn hóa/lịch sử khi quảng bá | Nhãn/validator không thay cố vấn người thật; nhiều nội dung là sáng tạo có chủ đích | Danh mục claim có nguồn, phân biệt sáng tạo và phục dựng, review chuyên gia phạm vi cụ thể |

**24/28 tiêu chí có điểm sơ bộ; 4/28 NC.** Không đưa NC vào mẫu số điểm tổng. Không vì thiếu dữ liệu mà kết luận tốt hoặc tệ. Nếu một hệ thống được xác nhận không có trong scope bản phát hành yêu cầu nó, lần review sau có thể chấm 0; hiện chưa đủ kiểm tra để làm vậy.

## 7. So sánh trực tiếp với các game tham chiếu

Đây là so sánh thiết kế định tính từ hiểu biết nền về trò chơi, **không phải kết quả khảo sát cộng đồng mới**, không phải tôi đã chạy song song cả 5 game trong phiên này. Chọn tiêu chuẩn theo khía cạnh; không coi một game thắng tất cả. Không chấm 50 mặc định cho game nổi tiếng, không trích % Steam/số giải/thời lượng chưa truy cập được.

| Game | Mặt dùng làm mốc | Demo 0.4 đang cách ở đâu | Bài học phù hợp và điều không nên bắt chước máy móc |
|---|---|---|---|
| **Elden Ring** | Liên kết landmark–tò mò–đường rẽ–phát hiện, build và lựa chọn đường | Demo có điểm nhìn/rương nhưng thiếu chuỗi tự phát hiện khiến người chơi muốn tự đi; phải dựa nhiều vào trigger/nhặt | Dựng một landmark thấy sớm và 2 đường tiếp cận có payoff khác nhau. Không sao chép kích thước thế giới hoặc cách giấu thông tin quá mức |
| **Sekiro: Shadows Die Twice** | Ngôn ngữ combat tập trung, posture, học nhịp, đọc animation | Demo có Thế/đỡ nhịp/cạy nhưng model, contact animation và chất lượng dạy chưa đỡ được cơ chế | Hoàn thiện một vòng đỡ–phá Thế–kết thúc rõ ràng. Không hạ điểm Sekiro vì ít build: nó chọn chiều sâu khác, không phải rubric mọi game bắt buộc rộng loot |
| **Nioh 2** | Synergy build, hệ thống vũ khí/tài nguyên và mastery | Demo có skills/gear nhưng chưa chứng minh lựa chọn tạo chiến thuật khác nhau, economy còn là nguồn vật liệu | Thử hai build và đánh đổi thật trong cùng nội dung. Không thêm menu/chỉ số dày trước khi cơ chế lõi dễ hiểu |
| **Black Myth: Wukong** | Silhouette quái, animation, cảnh/vật liệu/âm thanh phục vụ hành trình boss | Khoảng cách rất lớn ở người/quái/animation và tính thống nhất hình ảnh; PBR terrain không thể bù nhân vật hộp | Một quái và một cảnh hoàn thiện, xem cả chuyển động. Không hiểu “nhiều boss/Unreal” là công thức tự động tạo chất lượng |
| **The Witcher 3** | Động cơ quest, nhân vật có nhu cầu, điều tra và hệ quả | Demo có tiền đề Cói–Nghệ nhưng quest chưa biến thế giới và hành trình đủ mạnh, NPC chưa có đời sống | Học quan hệ nguyên nhân–hành động–hậu quả trong một quest nhỏ. Không coi mọi hội thoại dài hoặc nhiều lựa chọn là sâu; không dùng nó làm chuẩn riêng duy nhất cho posture combat |

**So sánh sản phẩm hiện tại:** Demo chưa ở cùng mức hoàn thiện trải nghiệm với bất kỳ game tham chiếu nào trong các mặt trên. Nhận xét này không có nghĩa không thể làm game indie tốt; nó có nghĩa không nên tiếp tục gọi bản hiện tại “gần AAA” hoặc coi tăng map/đổi engine là đủ. Một phong cách low-poly cố ý vẫn có thể tốt; điểm thấp ở đây vì hình ảnh hiện tại chưa đạt chuẩn nhất quán và mục tiêu sản phẩm mà PO đã nêu, không phải vì polygon ít tự thân là xấu.

### Đối chiếu theo 8 câu hỏi dùng được ngay

1. **Tại một ngã rẽ có lý do muốn đi cả hai phía không?** Demo: dữ liệu có nhánh nhưng phản hồi PO không thấy mục đích. Mốc Elden Ring: mối quan hệ landmark–phát hiện. Kiểm bằng người chơi chọn đường và giải thích lý do, không đếm số nhánh.
2. **Người chơi có nhận ra lỗi của mình sau khi trúng đòn không?** Demo: có telegraph nhưng hình/motion primitive; chưa đo. Mốc Sekiro: học tín hiệu/nhịp. Quay video deaths, phân biệt “không biết vì sao trúng” với “biết nhưng bấm sai”.
3. **Hai build có đổi quyết định không?** Demo: chưa đủ chứng minh. Mốc Nioh 2/Elden Ring. Đổi vũ khí/stat nhưng vẫn spam một hành động không tính là đa dạng có ý nghĩa.
4. **Quái có nhận ra được chỉ qua silhouette và chuyển động không?** Demo: Dế concept khác hình legacy. Mốc Wukong. Không thể dùng lore text để bù thiếu model/hành vi.
5. **Quest có một điều bất ngờ nhân quả, không chỉ phần thưởng cuối không?** Demo: tiền đề có tiềm năng, hành trình còn mỏng. Mốc Witcher 3. Cho người thử kể lại quest mà không nhắc tên vật nhặt.
6. **Môi trường cho biết ai sống ở đây và chuyện gì xảy ra không?** Demo: có asset và điểm kể chuyện nhưng cảm nhận trống vẫn mạnh. So cảnh theo dấu sử dụng, props có chức năng và phản ứng thế giới; không so tổng số mesh.
7. **Sau 20 phút có muốn tự đi tiếp không?** Demo: chưa có mẫu độc lập. Đây là câu hỏi mở, không tự suy ra từ bot đi hết màn. So một phiên thật với cùng điều kiện, không dùng trailer đẹp làm đối chứng gameplay.
8. **Sau chết/load, người chơi có được tôn trọng thời gian không?** Demo: NC về save bền; chuẩn phải bao gồm phục hồi tiến trình. Không chấm bằng việc một phiên không crash.

## 8. Nghiên cứu mạng xã hội: tình trạng và cách hoàn thành đúng

### Những gì đã thực hiện trong phiên

Ngày 2026-11-10 đã thử HTTPS đọc các nguồn dưới; tất cả trả `Tunnel connection failed: 403 Forbidden`. Không có bài/quote/review nào được thu thành công. Không có cơ sở nói “Reddit đồng ý”, “đa số Steam chê” hoặc “rubric trên mạng chấm thế này”.

- Steam Elden Ring, AppID 1245620: https://store.steampowered.com/appreviews/1245620?json=1&filter=all&language=all&purchase_type=all&num_per_page=20
- Steam Sekiro, AppID 814380: https://store.steampowered.com/appreviews/814380?json=1&filter=all&language=all&purchase_type=all&num_per_page=20
- Reddit patientgamers, truy vấn action RPG: https://www.reddit.com/r/patientgamers/search.json?q=action%20rpg&restrict_sr=on&sort=relevance&limit=10
- Nguồn học thuật tham khảo phương pháp MDA (không phải mạng xã hội): https://users.cs.northwestern.edu/~hunicke/MDA.pdf — cũng bị 403, chưa được đọc trong phiên.

Các link dưới chỉ là mục tiêu thu thập thêm, chưa truy cập/xác minh nội dung hoặc số điểm hiện hành:
- Nioh 2: https://store.steampowered.com/app/1325200/
- Black Myth: Wukong: https://store.steampowered.com/app/2358720/
- The Witcher 3: https://store.steampowered.com/app/292030/
- Game nghiên cứu bổ sung: r/truegaming, r/gamedesign và subreddit từng game; chỉ chọn thread có lập luận cụ thể, không coi upvote là kiểm nghiệm thiết kế.

### Quy trình khảo sát đề xuất, chưa phải dữ liệu đã có

1. Khóa ngày và phiên bản game, lưu URL/ID, ngày review, thời gian chơi do nền tảng cung cấp nếu có, ngôn ngữ, nguồn mua nếu công khai. Không lấy dữ liệu cá nhân ngoài những gì cần cho trích nguồn.
2. Vòng tiết kiệm đầu: 4 game mốc (Elden Ring, Sekiro, Nioh 2, Wukong), mỗi game 10 review positive + 10 negative có nội dung, tổng 80. Chọn theo quy tắc công khai có cả gần đây và hữu ích, không chỉ review khớp quan điểm; có thể mở rộng sau khi kiểm mã hóa.
3. Thêm khoảng 12 thread thảo luận dài Reddit, chia exploration/combat/quest/art/pacing. Thread là đơn vị nguồn; không tính hàng trăm comment cùng thread là hàng trăm mẫu độc lập. Tách post chính, phản biện và trải nghiệm người viết.
4. Mã hóa câu nhận xét vào tiêu chí, chiều khen/chê, tình huống, mức ảnh hưởng (bất tiện/cản tiến trình/lý do bỏ game), bản vá và thời gian chơi. Giữ trích đoạn ngắn đúng nguyên văn kèm URL; paraphrase phải ghi rõ.
5. Hai người chấm thử chung 10 review, chỉnh codebook khi bất đồng. Chỉ sau đó mới tóm tắt chủ đề lặp và ngoại lệ. Không gọi rubric đã “validated” nếu chỉ có một người hoặc chưa có playtest.
6. Mẫu 50/50 positive/negative có chủ đích để tìm vấn đề, **không ước lượng tỷ lệ hài lòng toàn người mua**. Reddit/Steam tự chọn mẫu, review bombing, bản vá, fandom và khác biệt ngôn ngữ đều có thể làm lệch.
7. Kết quả phải trình cả luận điểm trái chiều: ví dụ người thích không marker và người cần dẫn đường; không biến sở thích thành quy luật toàn thể. Mỗi tiêu chí báo số nguồn thực sự hỗ trợ/phản đối trong mẫu, không bịa tỷ lệ toàn cộng đồng.
8. Kiểm rubric với Demo bằng người ngoài chưa biết dự án; cộng đồng bàn về game A không trực tiếp chứng minh điểm game B. Sửa thang neo bằng hành vi quan sát được, không kéo điểm demo để khớp game được thích.

Để hoàn tất phần này cần truy cập đọc các host `store.steampowered.com`, `www.reddit.com` (và `reddit.com` nếu có redirect). Nguồn học thuật cần `users.cs.northwestern.edu`. Chưa thay đổi cấu hình mạng của môi trường trong task này. Có thể dùng các URL/bài xuất từ người dùng nếu quyền truy cập phù hợp; không cần và không yêu cầu token cá nhân.

## 9. Phê bình sản phẩm: điều đang làm sai về thứ tự ưu tiên

### 9.1 Bằng chứng kỹ thuật đang mạnh hơn bằng chứng trải nghiệm

86 smoke pass có nghĩa bot hoàn thành các điều kiện mà bài test yêu cầu. Smoke còn dùng teleport, cấp setup tài nguyên, god/debug hook hoặc ép trạng thái ở các đoạn đã ghi; do đó không chứng minh route lần đầu tự nhiên, economy, difficulty hay enjoyment. Không có lỗi console không có nghĩa game hay; test layout nối thông không có nghĩa bố cục hiểu được.

### 9.2 Tài liệu thiết kế đang đi trước phần thể hiện quá xa

Có brief quái, combat mới và art direction chưa phải có nội dung đó trong bản chơi. Người dùng nhìn và tương tác với mesh/animation thực tế. Phải nghiệm thu asset ở camera thật, không lấy khối *_0_4 trong JSON làm bằng chứng hoàn thành 0.4.

### 9.3 Mở rộng diện tích không sửa được hành trình

Giữ tuyến cũ rồi bọc thêm vùng làm chi phí nội dung tăng mà không đảm bảo quest sử dụng vùng mới. Đường chính/điểm nhìn/đồ nhặt cần trở thành graph phát hiện và nhân quả. Nếu PO vẫn hỏi “tôi đi đâu và tại sao?”, đó là lỗi thiết kế cần sửa trước số lượng foliage.

### 9.4 Mục tiêu 1–3 giờ hiện là yêu cầu, không phải kết quả

Không có đo toàn bộ phiên người chơi mới để chấm thời lượng chính xác. Người chơi có thể hoàn thành một game ngắn mà vẫn hài lòng; bản này bị chê vì hành trình chưa có sức nặng. Tăng đoạn chạy, collectibles hoặc HP để đạt giờ chỉ che vấn đề. Đề xuất 0.5 chưa được chứng minh và không được tính ngược vào điểm 0.4.

### 9.5 Unreal là năng lực sản xuất, không là phép nâng điểm

Web không tự làm game tệ; primitive không tự cấm một art style đẹp. Nhưng mục tiêu PO là người/quái/cảnh chi tiết, trong khi pipeline hiện chưa sản xuất được chúng. UE chỉ có ích khi một sample được build/chạy, có model/rig/animation/vật liệu/lighting/camera và performance budget thật. Hiện Unreal chưa build, mức sẵn sàng chuyển engine thấp dù lõi C++ có test.

## 10. Ưu tiên sửa và bằng chứng cần có để tăng điểm

| Mức | Việc | Lý do | Bằng chứng dừng/đi tiếp |
|---|---|---|---|
| P0 | Một tuyến 15–20 phút không cần người làm chỉ đường | Layout/navigation/exploration đều dưới 15; sửa ba trụ cột này trước mở map | 5 người mới, ≥4 biết mục tiêu và tự tới mốc đầu; ghi lý do chọn nhánh và chỗ lạc |
| P0 | Hoàn thiện một Cói và một quái trên camera gameplay | Người 7/quái 9 làm mọi cảnh, quest và combat mất sức thuyết phục | Video chạy/đánh/đỡ/tương tác; không gãy khớp, người/quái có silhouette và vật liệu nhất quán |
| P0 | Một quest có hành động và hậu quả nhìn thấy | Hiện có nhiều trạng thái hơn trải nghiệm nhân quả | Người chơi kể được phát hiện mới và nhìn ra thế giới thay đổi, không chỉ đọc cờ hoàn thành |
| P1 | Một boss/encounter thử thủ công không hook | Test hiện không chứng minh công bằng và cảm giác đánh | Video chết/thắng lần đầu, giải thích được vì sao trúng; tuning dựa trên nhiều người |
| P1 | Một cụm môi trường có đời sống và âm thanh mẫu | Đặt thêm cây không chữa cảm giác vô hồn | Xem/hear cảnh có chức năng, đường đi đọc được, props không cản camera |
| P1 | Save/load và hiệu năng máy thật | NC là rủi ro phát hành, không phải điểm bỏ qua vĩnh viễn | Phiên đóng/mở, death/load, quest order; build mục tiêu có log và frame-time |
| P2 | Mở rộng vùng, thêm nhánh, thêm build | Chỉ hữu ích sau vòng nhỏ chơi hay | Lượt 20 phút có người muốn chơi tiếp; có số liệu nội dung, không chỉ diện tích |

Không đầu tư ngay hàng loạt NPC/chiêu/quái. Không chạy lại smoke dài khi chỉ sửa tài liệu review. Không mua asset trước khi chốt chuẩn mẫu, license và ngân sách. Không tuyên bố 40/50 cho một tiêu chí chỉ vì thêm một feature; phải kiểm lại đủ 5 thành phần.

## 11. Kế hoạch chấm lại có thể tái lập

- Giữ phiên bản game, máy và bài chơi cố định. Ghi đúng bản build người chơi nhận, không nhầm artifact main và ZIP 0.4.
- Hai người độc lập dùng 5 thành phần/tiêu chí, ghi bằng chứng trước khi nhìn điểm nhau. Nếu lệch >8/50, xem video/tình huống rồi ghi lý do; không lặng lẽ lấy trung bình để che bất đồng.
- Thử người mới và người quen action RPG tách nhóm; có người cần hỗ trợ dẫn đường/điều khiển. Với mẫu 5 người chỉ trình kết quả mô tả, chưa suy rộng thị trường.
- Timeline gồm chơi/chạy/đọc/chết/retry/AFK; đánh dấu đoạn vui/chán/bối rối do người chơi nêu. Không diễn giải mọi đường vòng là exploration thành công.
- Chấm lại đúng tiêu chí bị tác động. Giữ cột điểm cũ, điểm mới, evidence và reviewer; không sửa lịch sử điểm để tạo tiến bộ giả.
- Chỉ tổng hợp điểm sản phẩm thương mại khi các NC quan trọng được kiểm và đã có phiên chơi độc lập. Không đưa điểm nghiên cứu nội bộ lên store như điểm báo chí.

## 12. Phán quyết và hành động

**Hiện tại:** phù hợp tiếp tục R&D/prototype, chưa có căn cứ gọi là bản action RPG đạt chất lượng phát hành thương mại theo mục tiêu đã nêu. Chưa nên mở rộng scope thành thế giới mở dài nhiều giờ hoặc công bố ngang AAA.

**Điều đáng giữ:** luật Thế/đỡ/nhịp, giải thoát boss, gia đình chèo đò, hệ thống dữ liệu và test, một phần HUD/remap, bộ asset môi trường đã có license.

**Điều phải xây lại:** bố cục và dẫn đường theo nhiệm vụ, nội dung khám phá có mục đích, pipeline người/quái/animation, cách thế giới phản ứng. Không cần xóa toàn repo để sửa những phần này.

Bài này là review, không sửa gameplay, không duyệt proposal 0.5 thay PO, không thay bản đã Publish. Phần chấm sơ bộ đã có; phần rubric dựa trên khảo sát mạng xã hội vẫn chưa hoàn tất do 403 và phải được ghi nhận là công việc còn thiếu.
