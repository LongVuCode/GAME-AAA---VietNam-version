# Kế hoạch sản xuất từ Demo 0.4 tới Game 1 — baseline đề xuất v1

Ngày lập: 2026-11-10; múi giờ lịch **Asia/Saigon**. Trạng thái: **đề xuất để PO duyệt**, không tự thay PLAN/GDD/canon, không phải lịch phát hành đã cam kết. Người dùng xác nhận có **30–40 giờ/tuần**. Giữ nguyên yêu cầu tiết kiệm credits và luôn có Project Manager.

## 1. Phạm vi và tài nguyên thực tế

- Phần đã có: web 0.4 đạt 86/86 smoke, 159 test web/102 Python theo báo cáo trước; chưa phải mẫu Unreal đạt chuẩn hình ảnh. UE chưa từng build trên máy PO.
- Bốn sản phẩm khác nhau: **mẫu 15–20 phút → vùng mở đầu Lợn Lòi 90–180 phút → Long Biên hoàn chỉnh/Hồ Tinh → Game 1 đầy đủ**. Không dùng thời lượng vùng mở đầu để hứa tổng thời lượng game.
- Lịch chính dưới đây cho **bản đủ: 4 chương huyền thoại + đoạn kết ch_ben**, không các chương lịch sử/DLC/cổng multiplayer. Thứ tự sản xuất Long Biên→Phù Đổng→Ba Vì+kết→Đông Hải khác thứ tự chơi; phải ghép đúng ở P9.
- Bản sàn cũ D-018/D-021 kết tại Phù Đổng, bỏ ch_ben và cần kết riêng. Đây là phương án giảm scope cần PO chọn, không được tự thay cho bản đủ.
- Baseline giả định PO làm đều 30–40h/tuần, trung tâm khoảng 35h; có máy Windows RTX 5050 và quyền cài/build UE. Cloud chưa có GPU/UE; không giả định có worker Windows tự động.
- **Điều kiện chưa xác nhận:** ngân sách/nguồn model, animation, audio và cố vấn người thật. Nếu không có asset phù hợp/tác giả đủ chất lượng, phase art bị chặn; không dùng AI agent giả làm nhân lực nghệ thuật đã thuê.
- Lịch tính bằng tuần lịch, có review/sửa lỗi thường lệ trong phase. Nghỉ lễ/nghỉ cá nhân và hạn mức AI chưa xác nhận: PM phải cập nhật capacity trước mỗi sprint; không hứa toàn bộ ngày lễ sẽ làm việc.
- Không có phép đổi cố định từ “giờ agent” ra credits; giá phụ thuộc mô hình, context và tool. PM ghi credits thực tế khi giao diện có số liệu; nếu không thì ghi số phiên/tool/context, không bịa số credits.

## 2. PM luôn hiện diện: quyền hạn và vòng quản lý

**Phiên điều phối chính là Project Manager (`project-manager`)**. Agent khác không tự đổi scope, tích hợp toàn game, merge hoặc tự phê duyệt đầu ra của mình. PM có mặt ở đầu/cuối mỗi phiên, duyệt brief trước worker, quản lý lịch/backlog/dependency/risk/build ID/chi phí và báo cáo tuần. “Luôn có PM” là trách nhiệm xuyên suốt, không phải agent tự chạy 24/7 ngoài phiên chat.

Luồng: PO chọn ưu tiên → PM cấp task giới hạn → một worker tạo đầu ra → reviewer khác kiểm → worker sửa → PM đối chiếu evidence, tích hợp và ghi tiến độ → PO duyệt gate lớn. Reviewer không tự duyệt phần mình vừa viết; PM không thay QA bằng lời “đã xong”.

**Giới hạn chạy:** tối đa **PM + 1 sub-agent hoạt động**. Worker kết thúc/idle trước khi bật reviewer. Các vai dưới là roster trách nhiệm, không phải yêu cầu bật mọi agent song song. Người thật làm asset có thể làm bất đồng bộ nhưng PM không giao cùng file cho hai người/agent.

## 3. Roster và phân công dài hạn

| Vai | Đầu ra chịu trách nhiệm | Người duyệt | Hoạt động chính |
|---|---|---|---|
| project-manager (phiên chính) | WBS, backlog, scope, lịch, gate, report, integration/release checklist | PO | P0–P14, mỗi phiên |
| game-designer | Level graph, nhiệm vụ qua hành động, encounter/combat/build/economy, playtest hypotheses | qa-lead; PO chơi | P0,P2,P4–P11,P14 |
| narrative-researcher | Story beats, thoại, NPC, quest nhân quả, continuity/vi-en brief | historian-verifier; PO | P0,P4–P10 |
| vn-history-folklore-expert | Hồ sơ nguồn, dị bản, danh mục claim/nhãn cần xác minh | historian-verifier → cố vấn người thật khi cần | P0 mẫu; P6–P9; audit P10 |
| historian-verifier | Review độc lập lore/nguồn/tên/trang phục và giới hạn văn hóa | PO/cố vấn người thật | Khi có nội dung mới, trước đóng băng chương |
| ue-gameplay-engineer | UE/C++/data integration, input/camera/combat/save/quest/UI/package | qa-lead; PO build thật | P1–P14 theo task |
| tech-art-perf | Asset brief/import/LOD/collision/material/lighting/rig integration và benchmark | qa-lead; PO duyệt hình | P1,P3–P12 |
| qa-lead | Acceptance tests, bug severity, regression/ma trận máy và báo cáo độc lập | PM/PO | Review từng phase, chủ lực P10–P14 |
| Artist/modeler/animator **người thật hoặc asset có license** | Model/UV/PBR/rig/animation đạt mẫu, source và quyền sử dụng | tech-art-perf + PO; lore qua verifier | Mẫu P3; gói theo chương P5–P9 |
| Audio/composer/VO/localization **người thật khi cần** | Bộ âm/nhạc/VO/biên tập ngôn ngữ và license | narrative + tech-art + PO | Mẫu P4; nội dung P6–P10; khóa P12 |
| PO (30–40h/tuần) | Build/chơi/duyệt, ngân sách, quyền phát hành, làm/thuê asset theo năng lực | Quyết định cuối | Toàn dự án |
| Cố vấn văn hóa/pháp lý người thật | Đối chiếu và ký duyệt đúng phạm vi, hợp đồng/quyền | PO | Đặt lịch từ P0/P6; gate nội dung/store/RC |

Không tạo 10 agent mới chỉ để đủ chức danh. Level design thuộc game-designer; asset/audio production được tech-art-perf điều phối nhưng chất lượng asset thật không tự phát sinh từ prompt.

## 4. Lịch tổng thể có điều kiện

Khởi động giả định **16/11/2026**. Nếu PO duyệt sau ngày đó, dịch toàn bộ baseline tương ứng. Ngày kết thúc phase là hạn mục tiêu có review, không phải tuyên bố engine/nền tảng/nhà thầu chắc chắn xong. Các cổng chưa đạt sẽ chặn phase phụ thuộc.

| Phase | Công việc | Tuần | Bắt đầu | Kết thúc mục tiêu | Lead |
|---|---|---:|---|---|---|
| P0 | Khóa phạm vi và thiết lập quản trị | 1 | 16/11/2026 | 22/11/2026 | PM |
| P1 | Chứng minh Unreal chạy và đóng gói được | 2 | 23/11/2026 | 06/12/2026 | ue-gameplay-engineer |
| P2 | Nền gameplay UE và tiến trình bền vững | 4 | 07/12/2026 | 03/01/2027 | ue-gameplay-engineer |
| P3 | Chuẩn sản xuất mỹ thuật và animation | 5 | 04/01/2027 | 07/02/2027 | tech-art-perf |
| P4 | Mẫu chơi 15–20 phút có chất lượng mục tiêu | 8 | 08/02/2027 | 04/04/2027 | game-designer |
| P5 | Vùng mở đầu Lợn Lòi Đầm 90–180 phút | 8 | 05/04/2027 | 30/05/2027 | game-designer |
| P6 | Long Biên hoàn chỉnh | 12 | 31/05/2027 | 22/08/2027 | narrative-researcher |
| P7 | Phù Đổng — chương sản xuất thứ hai | 14 | 23/08/2027 | 28/11/2027 | game-designer |
| P8 | Ba Vì và đoạn kết bản đủ | 16 | 29/11/2027 | 19/03/2028 | game-designer |
| P9 | Đông Hải và ghép đúng thứ tự truyện | 14 | 20/03/2028 | 25/06/2028 | game-designer |
| P10 | Alpha — khóa tính năng/nội dung | 8 | 26/06/2028 | 20/08/2028 | ue-gameplay-engineer |
| P11 | Beta — QA, tối ưu và playtest ngoài | 8 | 21/08/2028 | 15/10/2028 | qa-lead |
| P12 | Release Candidate và duyệt phát hành | 6 | 16/10/2028 | 26/11/2028 | PM |
| P13 | Cửa sổ launch và phát hành 1.0 | 6 | 27/11/2028 | 07/01/2029 | PM |
| P14 | Ổn định sau phát hành | 8 | 08/01/2029 | 04/03/2029 | PM |

**Baseline bản đủ: khoảng 112 tuần tới hết cửa sổ launch 07/01/2029; hỗ trợ 1.0 tới 04/03/2029.** Đây là kịch bản lập kế hoạch có mức tin cậy thấp ở phần sau P5, không phải ngày phát hành công bố. Đặc biệt cửa sổ launch qua cuối năm cần cân nhắc nghỉ lễ và lịch review nền tảng, không ép ra mắt đúng ngày cuối bảng.

Dự phòng bên trong phase tích hợp: khoảng 25–35% capacity cho review/sửa/playtest, không chỉ code happy path. Ngoài ra PM giữ kịch bản rủi ro tăng 25–40% tổng lịch (khoảng cuối 07/2029 đến cuối 11/2029 cho bản đủ) nếu pipeline/asset/pháp lý chậm; đây là biên kế hoạch, chưa phải phân phối xác suất. Không có nhân lực art/cố vấn thì không có căn cứ chốt ngày final, không chỉ cộng vài tuần.

Các mốc có ích sớm: UE package P1 **06/12/2026**; mẫu hình ảnh P3 **07/02/2027**; mẫu chơi 15–20 phút P4 **04/04/2027**; vùng mở đầu P5 **30/05/2027**; Long Biên P6 **22/08/2027**. Mỗi mốc phụ thuộc gate trước, không hứa cứng khi chưa đo năng suất.

## 5. Công việc và nghiệm thu từng phase

### P0 — Khóa phạm vi và thiết lập quản trị (16/11/2026–22/11/2026)

Lead: **PM**; PM quản lý gate và lịch.

- **P0.1 — PM:** Chốt bản đủ/bản sàn, thời lượng theo vùng, baseline và ngân sách chưa xác nhận. Reviewer: PO.
- **P0.2 — game-designer:** Graph hành trình, 3 nhánh phụ ưu tiên, danh sách tính năng must/should/cut. Reviewer: qa-lead.
- **P0.3 — narrative-researcher:** Ma trận canon/đời nhân vật, câu hỏi truyện từng chặng. Reviewer: historian-verifier.
- **P0.4 — PM:** WBS, risk register, asset register, mẫu task và cổng nghiệm thu. Reviewer: PO.

**Gate:** PO duyệt phạm vi mẫu; mọi phụ thuộc có owner; không tự coi proposal 0.5 đã được phê duyệt.

### P1 — Chứng minh Unreal chạy và đóng gói được (23/11/2026–06/12/2026)

Lead: **ue-gameplay-engineer**; PM quản lý gate và lịch.

- **P1.1 — ue-gameplay-engineer:** Kiểm plugin, chọn/pin UE, build Windows từ checkout sạch. Reviewer: qa-lead.
- **P1.2 — ue-gameplay-engineer:** Package Development, đi lại/đánh mục tiêu/đọc design data tối thiểu. Reviewer: qa-lead.
- **P1.3 — tech-art-perf:** Thiết lập đo frame time/VRAM, preset khảo sát trên RTX 5050. Reviewer: qa-lead.
- **P1.4 — PM:** Tổng hợp log máy PO, chọn tiếp tục hoặc sửa nền tảng. Reviewer: PO.

**Gate:** Có log build/cook/package và video chạy trên Windows; không chấp nhận chỉ có mã cloud.

### P2 — Nền gameplay UE và tiến trình bền vững (07/12/2026–03/01/2027)

Lead: **ue-gameplay-engineer**; PM quản lý gate và lịch.

- **P2.1 — ue-gameplay-engineer:** Audit web→ArpgCore→UE: move/camera/input/lock-on/Thế/đỡ/nhịp/cạy. Reviewer: qa-lead.
- **P2.2 — ue-gameplay-engineer:** Quest state tối thiểu, save/load có version, checkpoint và restart. Reviewer: qa-lead.
- **P2.3 — game-designer:** Encounter dạy cơ chế, thông số nền và tiêu chí điều khiển. Reviewer: qa-lead.
- **P2.4 — qa-lead:** Test đảo thứ tự/chết/load, menu/vi-en/remap và bản package cuối phase. Reviewer: PM.

**Gate:** Chơi vòng ngắn không debug; save qua đóng/mở và chết; camera/input không có blocker. Không bắt làm hết combat 0.4 cùng lúc.

### P3 — Chuẩn sản xuất mỹ thuật và animation (04/01/2027–07/02/2027)

Lead: **tech-art-perf**; PM quản lý gate và lịch.

- **P3.1 — tech-art-perf:** Asset audit: tái dùng/mua/chỉnh/tạo mới, brief Cói + Dế + cảnh Bến Sậy. Reviewer: historian-verifier.
- **P3.2 — PO + artist người thật:** Chọn 2–3 silhouette, model/UV/material/rig Cói và một quái theo brief. Reviewer: tech-art-perf.
- **P3.3 — PO + animator người thật:** Bộ animation nền, tiếp xúc tay/chân/vũ khí và retarget chỉnh sửa. Reviewer: tech-art-perf.
- **P3.4 — qa-lead:** Review camera gameplay, license, collision/LOD và tải asset. Reviewer: PM.

**Gate:** Một người và một quái vượt chuẩn primitive; hoạt động trong gameplay, không chỉ render ảnh. Nếu chưa có cách làm/asset phù hợp thì phase chặn, không tự giả định đã thuê được.

### P4 — Mẫu chơi 15–20 phút có chất lượng mục tiêu (08/02/2027–04/04/2027)

Lead: **game-designer**; PM quản lý gate và lịch.

- **P4.1 — game-designer:** Thiết kế Bến→cứu người→mở lối tắt, landmark và phân nhánh. Reviewer: qa-lead.
- **P4.2 — narrative-researcher:** Một quest có động cơ/hậu quả, thoại ngắn và nhật ký. Reviewer: historian-verifier.
- **P4.3 — ue-gameplay-engineer:** Tích hợp vòng chơi, quái mẫu, NPC có hoạt động và save. Reviewer: qa-lead.
- **P4.4 — tech-art-perf:** Dựng cảnh/âm thanh mẫu, tối ưu; PO tổ chức 5 người thử độc lập. Reviewer: qa-lead.

**Gate:** Ít nhất 4/5 người hiểu mục tiêu/tới mốc đầu; ghi chỗ lạc và lý do muốn chơi tiếp; đạt chuẩn hình ảnh mẫu và đo máy thật. Trượt hai vòng sửa phải xem lại scope.

### P5 — Vùng mở đầu Lợn Lòi Đầm 90–180 phút (05/04/2027–30/05/2027)

Lead: **game-designer**; PM quản lý gate và lịch.

- **P5.1 — game-designer:** Graybox toàn vùng hai vòng, 6 chặng main/3 nhánh phụ, không giữ tọa độ cũ. Reviewer: qa-lead.
- **P5.2 — narrative-researcher:** NPC/quest/cảnh thay đổi, cứu Nghệ, dấu vết, bàn giao ngắn. Reviewer: historian-verifier.
- **P5.3 — ue-gameplay-engineer:** Boss hai pha/giải thoát, inventory/craft/map, save xuyên vùng. Reviewer: qa-lead.
- **P5.4 — tech-art-perf:** Art hóa nơi quan trọng; QA/PO thử người mới và đóng gói private build. Reviewer: qa-lead.

**Gate:** Vùng mở đầu hoàn thành tự nhiên, không debug; thời lượng báo từ playtest, không ép đủ giờ. Không được gọi đây là cả Long Biên/Hồ Tinh.

### P6 — Long Biên hoàn chỉnh (31/05/2027–22/08/2027)

Lead: **narrative-researcher**; PM quản lý gate và lịch.

- **P6.1 — vn-history-folklore-expert:** Hồ sơ nguồn chương Long Biên, nhãn và danh mục cần cố vấn. Reviewer: historian-verifier.
- **P6.2 — game-designer:** Nội dung sau vùng mở đầu, nhịp tiến triển tới Hồ Tinh và encounter/boss theo canon. Reviewer: qa-lead.
- **P6.3 — ue-gameplay-engineer:** Cơ chế đặc thù/set-piece theo thiết kế đã duyệt; save và chuyển đời. Reviewer: qa-lead.
- **P6.4 — tech-art-perf:** Asset/cảnh/âm thanh chương; PO/cố vấn và QA nghiệm thu trọn chương. Reviewer: PM.

**Gate:** Chơi hết Long Biên, không vi phạm vai trò thần/canon; kết quả cố vấn đúng phạm vi; performance không phá chuẩn mẫu.

### P7 — Phù Đổng — chương sản xuất thứ hai (23/08/2027–28/11/2027)

Lead: **game-designer**; PM quản lý gate và lịch.

- **P7.1 — narrative-researcher:** Quest/Bương/mốc truyện chương, bản sàn và điểm kết hợp lệ. Reviewer: historian-verifier.
- **P7.2 — game-designer:** Layout/encounter/tiến trình vũ khí và cơ chế đặc thù, tái dùng hệ thống. Reviewer: qa-lead.
- **P7.3 — ue-gameplay-engineer:** Tích hợp chương và kế thừa tiến trình, validator từ cấm theo đời. Reviewer: qa-lead.
- **P7.4 — tech-art-perf:** Art/animation/audio theo asset list; QA/PO playtest chương. Reviewer: PM.

**Gate:** Chương đạt mẫu và save liên chương. Gate quyết định bản đủ tiếp tục hay đề xuất bản sàn riêng; không tự coi thiếu chương là full game.

### P8 — Ba Vì và đoạn kết bản đủ (29/11/2027–19/03/2028)

Lead: **game-designer**; PM quản lý gate và lịch.

- **P8.1 — vn-history-folklore-expert:** Hồ sơ văn hóa, giới hạn Sơn Tinh–Thủy Tinh và kết truyện. Reviewer: historian-verifier.
- **P8.2 — narrative-researcher:** Arc nhân vật và ch_ben, payoff chủ đề theo quyết định đã chốt. Reviewer: historian-verifier.
- **P8.3 — ue-gameplay-engineer:** Gameplay/set-piece/boss và kết thúc theo canon, không tự cho đánh thần/người. Reviewer: qa-lead.
- **P8.4 — tech-art-perf:** Asset/FX/audio riêng, đo tải cảnh; QA/PO review chương và ending. Reviewer: PM.

**Gate:** Chương và ending chơi được; không claim kết nối toàn game trước khi Đông Hải và full-run hoàn thành.

### P9 — Đông Hải và ghép đúng thứ tự truyện (20/03/2028–25/06/2028)

Lead: **game-designer**; PM quản lý gate và lịch.

- **P9.1 — vn-history-folklore-expert:** Nguồn/địa danh/nhãn Đông Hải, soát liên tục lore. Reviewer: historian-verifier.
- **P9.2 — game-designer:** Đặc trưng khám phá/encounter và tải cảnh phù hợp ngân sách. Reviewer: qa-lead.
- **P9.3 — ue-gameplay-engineer:** Tích hợp Đông Hải; ghép thứ tự truyện Long Biên→Đông Hải→Phù Đổng→Ba Vì→kết. Reviewer: qa-lead.
- **P9.4 — qa-lead:** Full-run đầu tiên, save migration, kế thừa và chặn tiến trình. Reviewer: PM.

**Gate:** Tất cả nội dung bắt buộc đã có và nối thành một game; main/quest kết thúc không dùng debug.

### P10 — Alpha — khóa tính năng/nội dung (26/06/2028–20/08/2028)

Lead: **ue-gameplay-engineer**; PM quản lý gate và lịch.

- **P10.1 — ue-gameplay-engineer:** Sửa tích hợp, economy/build và save migration; không mở hệ mới. Reviewer: qa-lead.
- **P10.2 — game-designer:** Cân bằng xuyên chương, nhịp và bỏ nội dung thừa. Reviewer: qa-lead.
- **P10.3 — narrative-researcher:** Khóa thoại/vi-en, soát hậu quả lựa chọn và kết truyện. Reviewer: historian-verifier.
- **P10.4 — PM:** Audit asset/legal/canon; tổ chức private alpha 10–20 người khi khả thi. Reviewer: PO.

**Gate:** Feature/content complete; không blocker đã biết ở full-run; thiếu legal/nguồn được ghi là chặn, không bỏ qua.

### P11 — Beta — QA, tối ưu và playtest ngoài (21/08/2028–15/10/2028)

Lead: **qa-lead**; PM quản lý gate và lịch.

- **P11.1 — qa-lead:** Ma trận GPU/CPU/input/OS, save lâu và crash/hitch; tổng hợp severity. Reviewer: PM.
- **P11.2 — tech-art-perf:** Tối ưu frame time/VRAM/streaming/shader; benchmark build thật. Reviewer: qa-lead.
- **P11.3 — ue-gameplay-engineer:** Sửa lỗi/khả năng truy cập/UI/localization và compatibility. Reviewer: qa-lead.
- **P11.4 — PM:** Playtest 20–50 người có đồng ý dữ liệu; store preparation sau C2, duyệt license/pháp lý. Reviewer: PO.

**Gate:** Chỉ tiêu hiệu năng/độ ổn định đã chốt và đo được; không bug chặn nghiêm trọng; playtest/lore/legal đạt điều kiện tương ứng.

### P12 — Release Candidate và duyệt phát hành (16/10/2028–26/11/2028)

Lead: **PM**; PM quản lý gate và lịch.

- **P12.1 — qa-lead:** Full-run RC, clean install/uninstall, save/backup, rollback và regression. Reviewer: PM.
- **P12.2 — PM:** Checklist Steam hiện hành, hồ sơ pháp lý/license/AI disclosure/credits/vi-en. Reviewer: PO + tư vấn người thật.
- **P12.3 — tech-art-perf:** Trailer/screenshot đúng bản chạy, cấu hình tối thiểu đo thật. Reviewer: qa-lead.
- **P12.4 — PO:** Nộp store/build qua tài khoản có quyền, nhận review và sửa theo yêu cầu. Reviewer: PM.

**Gate:** RC tái lập, tài liệu/store claim đúng; nền tảng duyệt thực tế. Thời gian bên ngoài không do AI cam kết.

### P13 — Cửa sổ launch và phát hành 1.0 (27/11/2028–07/01/2029)

Lead: **PM**; PM quản lý gate và lịch.

- **P13.1 — PM:** Chốt ứng viên 1.0, lịch launch sau store approval, FAQ và kênh hỗ trợ. Reviewer: PO.
- **P13.2 — ue-gameplay-engineer:** Build phát hành/sign nếu cần, tag nguồn và gói rollback. Reviewer: qa-lead.
- **P13.3 — qa-lead:** Smoke ứng viên trên clean machine, đối chiếu checksum và entitlement. Reviewer: PM.
- **P13.4 — PO:** Go/no-go, phát hành qua công cụ có quyền; PM giám sát lỗi và hotfix. Reviewer: qa-lead.

**Gate:** Bản 1.0 được người dùng tải/chạy, có hỗ trợ và rollback; không gọi upload nội bộ là đã phát hành.

### P14 — Ổn định sau phát hành (08/01/2029–04/03/2029)

Lead: **PM**; PM quản lý gate và lịch.

- **P14.1 — qa-lead:** Triage lỗi, phân tích crash/review có nguồn và ưu tiên theo tác động. Reviewer: PM.
- **P14.2 — ue-gameplay-engineer:** Hotfix có test save backward/forward theo chính sách đã chốt. Reviewer: qa-lead.
- **P14.3 — game-designer:** Điều chỉnh balance có bằng chứng, không thay đổi phá save tùy tiện. Reviewer: qa-lead.
- **P14.4 — PM:** Postmortem, actual cost/quality, quyết định maintenance/expansion sau dữ liệu. Reviewer: PO.

**Gate:** Ổn định 1.0, đóng lỗi nghiêm trọng, công bố hỗ trợ tiếp; DLC không mặc định nằm trong scope.

## 6. Lịch làm việc của từng vai agent

Các khoảng phase ở đây là **cửa sổ được gọi làm việc**, không có nghĩa các agent đều chạy liên tục. WBS CSV ghi earliest start, checkpoint dự kiến và hạn phase; checkpoint là mốc bàn giao sơ bộ, không khẳng định task đã được estimate bằng actual. PM tách task thành các gói 1–3 phiên và đặt hạn nhỏ tại planning tuần, không giao một task 14 tuần không kiểm tra giữa chừng.

| Agent | Nhịp phiên đề xuất khi tới phase của mình | Đầu ra mỗi tuần | Hạn/checkpoint |
|---|---|---|---|
| PM | Đầu/cuối mọi phiên; planning thứ Hai, review thứ Sáu | Backlog có thứ tự, báo cáo plan/actual, risk/blocker và link evidence | Mỗi thứ Sáu trước 18:00; gate cuối phase |
| game-designer | 2–3 block/tuần ở tuần thiết kế; 1 block kiểm gameplay khi tích hợp | 1 graph/encounter/quest thiết kế có tiêu chí chơi, không chỉ prose | Trước task UE phụ thuộc; checkpoint thứ Tư; gate phase |
| narrative-researcher | 1–2 block/tuần khi cần content; dừng khi đã đủ cho sprint | Một gói beat/thoại/quest có ID, nhãn, phạm vi và hậu quả | Draft thứ Ba; verifier thứ Tư/Thứ Năm |
| vn-history-folklore-expert | 1 block hồ sơ trước mỗi nội dung văn hóa mới | Claim/source/page/status; chỉ rõ thiếu nguồn | Trước khóa thiết kế chương; không chờ RC mới báo thiếu |
| historian-verifier | 1–2 block review sau khi writer kết thúc, không đồng thời tự viết phần cần duyệt | PASS/REVISE/BLOCKED, danh mục nguồn/độ nhạy cảm | Trong 2 phiên review kế tiếp; mức A vẫn phụ thuộc người thật |
| ue-gameplay-engineer | 3–4 block/tuần ở phase code, mỗi block một thay đổi kiểm được | Một build/tính năng nhỏ + test/log và hướng dẫn PO chạy | Build tích hợp thứ Năm; không tự gom thay đổi chưa test suốt tuần |
| tech-art-perf | 2–3 block/tuần ở art/perf; 1 block hỗ trợ import khi phase code | Asset mẫu hoặc capture benchmark có config/build ID | Import mẫu thứ Tư, capture thứ Năm, review thứ Sáu |
| qa-lead | Review sau mỗi gói; 1–2 block/tuần thường, 3–4 khi QA là việc chính | Bug có repro/severity, review diff và bằng chứng gate | Trước PM integrate; không để lỗi blocker qua phase |

**Block agent** là phiên hẹp khoảng 30–60 phút làm việc/tương tác có thể ngắt, không là cam kết thời gian mô hình tính toán. Build/download/smoke dài theo dõi bằng tool, không liên tục phân tích lại log không đổi. Không cộng tất cả số block trong bảng vào cùng một tuần: PM chọn tối đa khoảng 8–12 worker/reviewer block tùy phase và credits, rồi điều chỉnh theo actual. PM dùng context tóm tắt và artifact thay cho fork cả hội thoại dài.

### Capacity của PO — kế hoạch 35h/tuần mẫu

| Việc | Giờ/tuần tham chiếu |
|---|---:|
| Build/tích hợp/debug và phối hợp worker | 12 |
| Asset/cảnh/animation: làm, nhập hoặc duyệt nhà thầu | 8 |
| Chơi thử/QA/đo hiệu năng | 6 |
| Product/design/narrative: duyệt output, quyết định | 4 |
| Planning/review, backup và dự phòng việc nhỏ | 5 |
| **Tổng** | **35** |

Đây là giờ của **một người**, không phải thêm 35 giờ trên mỗi agent. Có thể dịch tỷ lệ theo phase; PM giữ tổng 30–40h. Nếu bạn tự model toàn bộ thay vì thuê/tái dùng asset, giờ art lấy từ capacity này và lịch phải dài hơn. Credits dư không tạo thêm giờ build/chơi/duyệt của PO.

### Lịch tuần mẫu (Asia/Saigon)

- Thứ Hai: PO/PM 09:00–09:30 chọn 1–3 đầu ra, kiểm dependency; worker chính 09:30–12:00 theo task; chiều PO build/làm asset. Không mở 5 agent vì có 5 task.
- Thứ Ba: worker làm phần đang chặn; lore/design chỉ được gọi nếu task code/art cần ngay; PO kiểm đầu ra trên máy thật.
- Thứ Tư: worker bàn giao gói nhỏ; kết thúc worker rồi chạy reviewer. Nếu REVISE, sửa trước khi mở task khác.
- Thứ Năm: tích hợp build, đo/chơi/capture; PM kiểm evidence và regression phù hợp, không chạy lại suite dài vô cớ.
- Thứ Sáu: QA/PO chơi; PM 16:30–17:30 cập nhật plan/actual/chi phí/risk, chốt Done và lịch tuần sau. Thứ Bảy/Chủ Nhật để nghỉ/dự phòng theo lựa chọn của PO, không giả định làm bù bắt buộc.

Khung giờ là đề xuất để bạn tổ chức, không phải đã tạo sự kiện lịch hoặc agent tự thức dậy đúng giờ. Có thể dùng giờ khác với cùng dependency.

## 7. Lịch chi tiết bốn tuần khởi động

| Ngày | PM giao cho ai | Đầu ra cần có | Review/PO |
|---|---|---|---|
| 16/11/2026 | PM + game-designer | Scope ba mức, graph mẫu, must/cut và backlog P0 | PO chọn scope; chưa mua asset |
| 17/11 | narrative-researcher | Beats mẫu 15–20 phút và câu hỏi truyện | historian-verifier review phiên sau |
| 18/11 | historian-verifier rồi game-designer | Trả review lore; sửa graph và tiêu chí chơi | PM khóa brief P0 |
| 19/11 | tech-art-perf | Audit asset/source/license, cách làm Cói/Dế, dự toán yêu cầu nguồn lực | PO chọn tái dùng/tự làm/thuê; không coi lựa chọn là hợp đồng đã ký |
| 20/11 | PM + qa-lead | WBS/risk/acceptance checklist P1, báo cáo gate P0 | PO duyệt hoặc chỉ rõ phần phải sửa |
| 23–24/11 | ue-gameplay-engineer | Ma trận toolchain/plugin và hướng dẫn setup Windows | PO cài/build, gửi log lỗi thật |
| 25–26/11 | ue-gameplay-engineer | Sửa lỗi theo log, build project/target | qa-lead kiểm log và phạm vi build |
| 27/11 | PM + tech-art-perf | Checkpoint tuần: engine có chạy không, blocker và số giờ đã dùng | Nếu chưa chạy, ưu tiên P1, không kéo art/content vào |
| 30/11–02/12 | ue-gameplay-engineer | Package Development và gameplay/data tối thiểu | PO clean install/chạy, QA review |
| 03–04/12 | tech-art-perf rồi qa-lead | Capture baseline máy thật, regression và gate P1 | PO/PM quyết định đi P2 |
| 07–09/12 | ue-gameplay-engineer | Audit port, một vòng input/camera/move/combat | QA review thay đổi nhỏ |
| 10–11/12 | ue-gameplay-engineer rồi qa-lead | Save/checkpoint sơ bộ, test đóng/mở bước đầu | PM cập nhật estimate P2 bằng actual P1 |

Ngày cuối tuần trong bảng tổng dùng làm ranh phase, không bắt PO duyệt vào Chủ Nhật. Gate thực hiện phiên làm việc cuối tuần trước hoặc lịch PO chọn. Ngày nghỉ lễ cá nhân/thị trường phải trừ capacity lúc planning; P2 qua cuối năm có rủi ro cần ghi rõ.

## 8. Hợp đồng task và tiêu chuẩn Done

Mỗi task PM giao phải có: ID; vấn đề/người dùng bị ảnh hưởng; input và file được sửa; output/artifact; acceptance; reviewer; dependency; phạm vi loại trừ; hạn block/hạn checkpoint; chi phí quan sát; lệnh kiểm tra; cách bàn giao/rollback. Không dùng “hãy hoàn thiện chương” làm một prompt duy nhất.

Mẫu trạng thái: **Planned → Ready → Doing → Review → Rework hoặc Accepted → Integrated → Gate approved**. `Blocked` là trạng thái riêng có owner và điều kiện gỡ. “Đã viết”, “đã tạo mesh”, “đã có PID” chưa phải Done.

- Code: test đúng phạm vi + build/run ở executor phù hợp; người viết khác reviewer.
- UE: log thật và video/capture package trên máy Windows. Cloud không tự ký pass.
- Asset: source/license, model/material/rig/LOD/collision trong camera gameplay, không chỉ render.
- Quest: hiểu mục tiêu, nhân quả, thay đổi thấy được, bỏ qua/đảo thứ tự/death/load không softlock.
- Lore: nhãn/nguồn và reviewer; AI không tự nâng lên mức A.
- Gate: artifact xác định build ID, checklist, bug còn lại và PO duyệt. Nếu chưa đạt thì tiếp tục sửa/đề xuất cắt scope, không “đi tiếp rồi sửa sau” với blocker.

## 9. Quản lý đường găng, đổi lịch và giảm scope

Đường găng: **scope → UE package → gameplay/save nền → chuẩn asset/animation → mẫu chơi đạt → vùng mở đầu → chương hoàn chỉnh → các chương còn lại → alpha/beta → pháp lý/store/RC → launch**. Art và legal có thể có lead time bất đồng bộ, phải khởi động brief/hẹn lịch sớm; không tạo ngày Done giả cho đầu ra người thật chưa có.

PM đo actual hàng tuần: giờ PO, đầu ra accepted, vòng rework, task blocked, số bug reopen, chi phí nếu thấy được, reviewer/engine run thật. Sau P1 hiệu chỉnh P2/P3; sau P4/P5 hiệu chỉnh toàn lịch bằng throughput tạo asset/quest/encounter và số giờ QA thực tế. Chưa có dữ liệu thì không tuyên bố độ tin cậy cao của P6–P13.

Quy tắc:
1. Blocker build/access/asset >2 phiên: PM ghi rõ ai cần làm gì, dừng việc phụ thuộc, chuyển sang việc độc lập có giá trị.
2. Mẫu không đạt hai vòng sửa: PO/PM chọn đổi cách làm/cắt scope/đổi asset; không giải bằng bật thêm agent đại trà.
3. Dự báo trễ >1 tuần ở phase ngắn hoặc >15% phase dài: cập nhật ngày ngay trong báo cáo tuần; giữ baseline cũ để so actual, không xóa lịch sử.
4. Không nén QA để cứu ngày. Cắt đầu việc should/could, không cắt save integrity, lỗi chặn, license/canon hoặc khả năng chạy.
5. Tại P7 có thể đề xuất bản sàn Long Biên+Phù Đổng; vẫn cần ending phù hợp D-021 và alpha/beta/RC riêng. Lịch bản sàn chỉ lập sau PO chọn, không lấy ngày hoàn thành P7 làm ngày phát hành.
6. Chưa đạt C2/cố vấn/tham vấn thì chưa mở Steam page/trailer theo canon kế hoạch. Rà điều khoản hiện hành trước hành động store; tài liệu COMMERCIAL_RELEASE có phần chưa xác minh.

## 10. Các rủi ro có owner

| Rủi ro | Owner | Phải giải trước | Phương án |
|---|---|---|---|
| UE chưa build, plugin không tương thích | ue-gameplay-engineer + PO | P1 | Pin bản sau thử, log và package thật; chưa art hóa rộng |
| Chưa có model/animation đạt chuẩn hoặc ngân sách | tech-art-perf + PO | P3 | Thử license/tái dùng, người làm theo gói, giảm số asset; không tự hứa AI thay artist |
| Map rộng nhưng chán/lạc | game-designer | P4/P5 | Playtest người mới, sửa graph trước tăng diện tích |
| Scope mới thành thế giới mở vô hạn | PM | Mọi gate | Change request có ảnh hưởng lịch/asset/QA, PO chọn bỏ gì để thêm gì |
| Lore/nhãn/nguồn hoặc cố vấn chậm | narrative/verifier + PO | Trước khóa chương/C2 | Danh mục claim và lịch người thật; không gán mức A giả |
| Thiếu máy test/hiệu năng 8 GB VRAM | tech-art-perf + QA | P4, P11 | Budget scene, preset, máy người thử có cấu hình ghi lại |
| Save hỏng khi đổi phiên bản | ue-gameplay-engineer + QA | P2, P10–P12 | Version/migration/backup; test thứ tự và restore |
| License/pháp lý/AI disclosure/store review | PM + PO | C2/P12 | Người thật rà quyền; giữ thời gian sửa, không hứa lịch nền tảng |
| Credits/context cạn hoặc agent mất trạng thái | PM | Mỗi phiên | Gói nhỏ, commit/bàn giao, một worker, reviewer tuần tự, không chạy lại test vô cớ |
| PO nghỉ hoặc nhà thầu trễ | PM + PO | Planning tuần | Giảm capacity, dịch timeline phụ thuộc, không âm thầm làm lịch giả |

## 11. Output PM phải duy trì

- `PHASE_AGENT_WBS.csv`: 60 gói việc và owner/reviewer/dependency; hiện tất cả **PLANNED_NOT_STARTED**.
- `AGENT_PHASE_CALENDAR.csv`: cửa sổ hoạt động của từng vai theo phase, deadline phase; không phải lịch đã đặt trên ứng dụng.
- Báo cáo tuần: Planned/Accepted/Blocked, evidence, actual giờ/chi phí, forecast và quyết định cần PO.
- Báo cáo phase: Đã làm/Chưa làm/Bằng chứng/Rủi ro/Bước tiếp; gate chờ PO ở mốc lớn.
- Khi triển khai mới cập nhật decision/risk log chính thức theo quyết định được duyệt. Lịch đề xuất này không tự biến quyết định chưa duyệt thành canon.

## 12. Nguồn lập kế hoạch và phần chưa biết

Đã đọc AI_CONTEXT, AGENT_TEAM, PLAN, TECH_SPEC, COMMERCIAL_RELEASE, Decision Log D-012/018/021/026, proposal 0.5 và review Demo 0.4. Dùng trạng thái build/QA trong repo và thông tin PO 30–40h/tuần. PLAN cũ có “chương 2–9” không còn phù hợp cấu trúc H hiện tại; không lấy đó làm scope.

Đây là WBS và lịch kỹ thuật sơ bộ theo phụ thuộc, chưa phải ước lượng dựa trên năng suất Unreal/artist đã đo. Chưa có báo giá nhân lực, lịch cố vấn, lịch platform review hoặc nguồn credits được chốt. Không có khảo sát mạng xã hội mới trong bước này; các endpoint từng bị 403 chưa được coi là đã nghiên cứu xong. Không bịa nguồn để hợp thức hóa thời gian.

**Để baseline trở thành lịch thi hành:** PO cần duyệt scope, cách đáp ứng art/animation và giờ làm; sau P1/P4 phải tái dự báo. Xác nhận 30–40h/tuần đã có; các điều kiện còn lại chưa có. Phiên này chỉ lập kế hoạch, không khởi động 60 task hoặc tự mua/thuê/publish.

## 13. Tải công việc và độ tin cậy của estimate

WBS bổ sung dependency nội phase (build→package→benchmark; brief→model/rig→animation→import/review; quest→integration→QA), checkpoint và khoảng giờ PO. Checkpoint P0.2 ngày16/11, P0.3 ngày17/11 là draft để reviewer làm18/11; P0.4 chốt20/11, khớp lịch ngày ở mục7. PM vẫn phải tách các task có dependency dạng bàn giao từng mẫu; ngày checkpoint không cho phép bỏ qua dependency.

**Cách đọc giờ WBS:** mỗi phase có envelope PO khoảng35h × số tuần; phân bổ tham chiếu15%/35%/30%/20% cho4gói, hiển thị khoảng75–125% phân bổ để thể hiện bất định. Tổng max có thể vượt capacity35h/tuần: nếu dự báo về phía max, phải dời ngày/cắt scope, không coi PO tự làm thêm. Budget block agent là giới hạn giao việc8–12block/tuần được chia theo gói, không là số giờ tính toán hay credits đã biết. Đây là phân bổ quản trị, **chưa phải bottom-up estimate năng suất được đo**.

Ví dụ P5 có8tuần, envelope khoảng280giờ PO, đã gồm build/review/chơi và dự phòng. Điều đó chưa chứng minh đủ để làm6chặng/3nhánh/boss/art; P5 phụ thuộc mạnh vào tái dùng hệ thống và mẫu art đã đạt. Nguồn lực model/animation/audio ngoài PO ghi **TBD, NOT resourced**; P3–P9 là ngày có điều kiện. Không được dùng lịch này như lịch nhà thầu đã ký.

Trước thi hành P3, PM phải lấy actual/báo giá model+rig+animation và gói license, xác định người làm/capacity/lead time, điền effort ngoài PO và phân bố tuần. Sau P4 phải estimate lại P5–P9 từ số asset/quest/encounter × giờ làm/sửa/QA thực tế. Nếu không đủ thông tin, giữ forecast thấp tin cậy, chỉ cam kết sprint gần nhất.
