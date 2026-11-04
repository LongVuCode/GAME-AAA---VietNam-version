# Định hướng mỹ thuật (Art Direction) — v0.1

`tech-art-perf` (AI), 2026-11-04. **ĐỀ XUẤT**, chờ PO và `historian-verifier`. Bám Story Bible v1.2, `DEMO_0_1_DESIGN.md`, `TECH_SPEC.md`. Mã màu là gợi ý; **không có số FPS** (chưa đo).

## 1. Tầm nhìn và trụ cột

**Tầm nhìn.** Một châu thổ có thật trong cảm giác: bùn có trọng lượng, lau có gió, sương có độ dày. Người và đồ vật mang dáng hiện vật Đông Sơn, không phải "fantasy châu Á chung chung". Thần thoại không rực sáng: nó ẩn trong sương và tầm xa. Cảm xúc chủ đạo là lao động lặng lẽ của người giữ bến: khung hình ưu tiên khoảng lặng, chân trời thấp, ánh sáng tự nhiên.

| # | Trụ cột | Thực hành |
|---|---|---|
| P1 | **Hiện thực cách điệu theo hiện vật Đông Sơn** | Tỷ lệ, vật liệu, ánh sáng hiện thực. Cách điệu chỉ ở hoa văn hình học (vòng tròn tiếp tuyến, chữ S, răng cưa) trên đồ vật, UI, hình xăm |
| P2 | **Sông nước – sương – lau sậy** | Nước nông, bùn, lau là "nhân vật thứ hai". Khu nào cũng có chuyển động nền |
| P3 | **Ánh sáng tự nhiên theo mùa** | Mùa cạn: nắng xiên, lau vàng. Mùa nước: trời đục, sương dày. Không có nguồn sáng "phép" |
| P4 | **Đồng ấm, sắt lạnh, đỏ đồng là nguy hiểm** | Đồ của người là đồng ấm, xỉn. Vật thần thoại (sắt, dossier §9.1) xám lạnh. Đỏ đồng chỉ dành cho đòn không Đỡ được |
| P5 | **Đọc được trước, đẹp sau** | Silhouette quái tách khỏi nền lau ở mọi điều kiện sáng; HUD tối giản |

**Nguyên lý học được (không sao chép):**
- *Black Myth: Wukong*: chất liệu dựa trên vật thật (scan, bề mặt có tuổi); bộ quái khác nhau rõ về silhouette.
- *God of War*: camera gần vai tạo sự thân mật; tương phản tỷ lệ người và thú; báo hiệu đòn ít màu nhưng nhất quán.
- *Ghost of Tsushima*: thiên nhiên chuyển động để dẫn đường và tạo cảm xúc; mảng màu lớn; HUD biến mất khi không cần.

## 2. Nguồn tham chiếu văn hóa

Nguồn trong `sources.json` đều `consulted: false`, nên **tối đa mức B**; chỉ là tham chiếu hình, không phải nội dung Codex.

| Chủ đề | Dùng cho họa sĩ | Nhãn | Nguồn |
|---|---|---|---|
| Trống Ngọc Lũ | Bảo vật quốc gia, Bảo tàng Lịch sử Quốc gia; hoa văn hình học và hình người, thú | [SỬ LIỆU] (B) | ARC_DS, LSVN15; https://baotanglichsu.vn/en/Articles/1004/19804/vietnams-national-treasure-ngoc-lu-bronze-drum.html |
| Người hóa trang lông chim, thuyền | Mũ lông chim cao, váy hoặc khố; đầu chim ở mũi thuyền | [SỬ LIỆU] (B); số thuyền, số chim chưa đối chiếu | ARC_DS; https://en.wikipedia.org/wiki/Ngoc_Lu_drum |
| Chim bay ("chim Lạc") | Chim mỏ dài bay quanh vành trống | [SỬ LIỆU] (B); tên gọi: chưa tra nguồn | ARC_DS |
| Nhà sàn mái cong | Mái cong hình thuyền; nhà mái tròn có thể là kho thóc | [SỬ LIỆU] (B) | ARC_DS; https://en.wikipedia.org/wiki/Dong_Son_drum |
| Vũ khí đồng | Rìu lưỡi xéo; giáo mũi lá có họng tra cán; dao găm cán tượng người (khố, váy, trang sức); dao Làng Vạc chuôi "rắn ngậm chân voi" | [SỬ LIỆU-TRANH LUẬN] theo T002 (B) | ARC_DS, LSVN15; dossier §7.2, §9.1 |
| Tượng hai người cõng nhau thổi khèn | Tỷ lệ thân, tư thế, trang sức | [SỬ LIỆU] (B) | ARC_DS; https://news.laodong.vn/du-lich/kham-pha/tuong-hai-nguoi-cong-nhau-thoi-khen-bao-vat-phat-lo-tu-mo-co-thanh-hoa-1550444.html |
| Đồ nghề đúc | Khuôn hai mang sa thạch, nồi nấu đất nung, ống bễ, lò | [SỬ LIỆU] (B) | dossier §9.1; ARC_CL |
| Cảnh quan châu thổ | Bãi bồi, đầm nông, lau sậy, bờ đất thấp | [SÁNG TẠO] | (chưa tra nguồn) |

**Phải SÁNG TẠO (không có hiện vật):**
- Màu áo, chất vải: đề xuất vải gai, vỏ cây, nhuộm nâu đất, chàm, vàng lá.
- Kiểu tóc đời thường: búi, quấn khăn. Câu "cắt tóc vẽ mình" là sách Trung Hoa, chưa đối chiếu, và "Việt" ở đó không đồng nhất với Lạc Việt.
- Hình xăm (dossier §7.2): dùng hoa văn hình học, thuyền, thủy quái cách điệu. **Cấm** chim Lạc, mặt trời trung tâm, hình vị được thờ, irezumi, sak yant, tā moko, chữ.
- Mũ lông chim chỉ dùng trong cảnh lễ.

**Luật tránh:**
1. Không áo giao lĩnh, mái ngói đầu đao, giáp vảy, kimono kiểu Trung Hoa hay Nhật.
2. Không lồng đèn đỏ, rồng sừng râu, sóng ukiyo-e, chữ Hán.
3. Không đền, miếu, di tích thật; không bò sát, rắn, rùa, cáo ở `ch_longbien` và hub.
4. Khoen thô, **không hoa văn Đông Sơn**, không phát sáng (V9).
5. Thạp là gốm thô, trơn. Hub dùng trống **gỗ bịt da**, không có trống đồng.
6. Codex luôn có câu mỹ thuật của Story Bible §2 (J-06).

## 3. Khung hình mẫu

**3.1 Bến Lau buổi sớm (hub)**
- **Bố cục:** chân trời ở 1/3 dưới; bến tre chạy chéo vào giữa; ba nhà sàn làm khối tối bên phải; sông mờ vào sương.
- **Màu:** sương `#D8DACB`, nước `#8C998B`, lau khô `#C6AE78`, gỗ `#5C452F`, mái rạ `#9A8355`, nắng `#F1C78A`, bóng `#3B4A50`.
- **Ánh sáng:** mặt trời thấp, ngược sáng; rim vàng trên mái và lau; fill trời xanh xám.
- **Khí quyển:** height fog dày sát nước; khói bếp thành vệt nghiêng.
- **Vật liệu:** tre bóng chỗ tay cầm; gốm thạp in vết ngón tay.
- **Chuyển động:** đò khẽ lắc, lau rạp, cò bay thấp, mặt trống rung khi gõ.

**3.2 Đầm nông khi chiến đấu** (địa danh hư cấu, không phải Hồ Tây)
- **Bố cục:** khoảng nước ngang mắt cá làm sân, tường lau cao hơn đầu bao quanh. Lau có khe để Bọ Ngựa vồ ra. Camera thấp.
- **Màu:** nước đục `#6A694D`, bùn `#47392A`, lau `#7C884E`, trời `#A6ACA5`. Cói mặc chàm `#2E3D5B`, giáo đồng `#B5864A`. Đỏ đồng báo hiệu `#C64E29` dùng độc quyền.
- **Ánh sáng:** trời mây, bóng mềm; quái có rim từ sky light để tách khỏi lau.
- **Vật liệu:** bùn khuấy đục quanh chân (decal, flowmap); lau dính bùn tới gối.
- **Chuyển động:** lau tách khi đi qua, bọt bùn nổi, nước tóe khi né.

**3.3 Trận Lợn Lòi Đầm**
- **Bố cục:** sân tròn r≈18 m; ba vũng lầy tối là vùng cấm nhìn rõ từ xa. Lò bỏ hoang đổ nát làm mốc. Thú đầu thấp như khối tam giác nặng.
- **Màu:** bùn khô `#6E5A42`, vũng lầy `#2F2820`, lông `#2A231F`, nanh `#D9CDB2`, khoen gỉ `#4E6A57`, mép đồng lộ `#B07E46`, trời chiều `#C7A27A`.
- **Ánh sáng:**
  - Pha 1: nắng chiều xiên qua mây, tương phản mạnh.
  - Pha 2: mây che, gió lặng, sương bốc, màu giảm bão hòa. Ánh sáng kể nỗi đau.
- **Khoen:**
  - Lưỡi bẫy đúc vụng mắc ở cổ.
  - Ba nấc nứt là hình học thật (mesh swap, mask), không phải UI. Vết nứt lộ đồng mới bắt sáng specular, **không emissive**.
  - Vết thương: lông bết, sưng; không máu tràn.
- **Chuyển động:** lầy dội sóng khi thú dậm; lau mép sân rạp theo Càn lầy.

**3.4 Cảnh cạy khoen**
- **Camera:** góc 3/4 thấp sau vai Cói, tiêu cự hẹp, DOF nông. Ba nhịp, mỗi nhịp đẩy vào một chút. Rung nhẹ, tắt được.
- **Ánh sáng:** một khe mây rọi đúng cổ thú. Mỗi nhịp, vết nứt bắt thêm sáng nhờ đổi góc rim; không nhấp nháy.
- **Nhả cạy:** 3 s im lặng, camera đứng yên. Gió quay lại, mây hở, grade ấm lên một nấc. Nanh rơi xuống bùn; thú đi vào lau ở hậu cảnh.

**3.5 HUD/UI**
- **Bố cục:** tối giản, ở góc, ẩn ngoài chiến đấu. Hoa văn chỉ làm đường viền.
- **Thành phần:** máu và Thế là dải mảnh mép răng cưa. Nhịp trống là 4 cung của vòng tròn tiếp tuyến. Không UI đếm khoen.
- **Màu:** nền than `#1D1B19` (alpha), ngà `#E7DEC7`, đất nung `#8A5A3B`, đồng xỉn `#9B7A4E`; đỏ đồng `#C64E29` chỉ để cảnh báo.
- **Biểu tượng:** chưa dùng chim Lạc hay mặt trời trung tâm làm logo/icon khi chưa hỏi `historian-verifier`.
- **Font:** đủ dấu tiếng Việt (ặ, ữ, ỹ). Ví dụ Be Vietnam Pro, OFL; cần kiểm lại license và ghi register.
- **Trợ năng:** báo hiệu bằng cả hình dạng, không chỉ màu.

## 4. Nhân vật và quái

Người tỷ lệ hiện thực (khoảng 7–7,5 đầu). Chi tiết dày ở mặt, tay, vũ khí. Mỗi nhân vật đọc được bằng một đường silhouette. Trang phục đều [SÁNG TẠO].

| | Silhouette | Vật liệu, chi tiết |
|---|---|---|
| **Cói** (nữ) | Thẳng, mảnh như lau; giáo 2,6 m và Mũi Sào tạo đường chéo | Áo cộc vải gai chàm, váy quấn, khăn tóc; không xăm; bùn ở bắp chân |
| **Bương** (nam) | Vai rộng, trọng tâm thấp; rìu xéo lệch một bên | Khố, mình trần, xăm hình học (nhánh Vảy), dây mây cổ tay |
| **Nứa** (nữ) | Gọn, hai dao làm hai điểm sáng | Áo gai sẫm, nhiều mảnh vá |
| **Mũi Sào** | Bịt đồng đầu sào | Đồng mòn bóng chỗ tì; vết khắc tăng theo số thú được giải |
| **Lợn Lòi Đầm** | Lưng gù cao, đầu thấp, nanh cong; cao hơn người | Bờm cứng, bùn đóng mảng, nanh nứt; khoen đồng thô, gỉ xanh, mép vỡ sắc |
| **Cua Càng Bùn** | Rộng, thấp, mai trước như khiên; càng giơ là báo hiệu | Mai trước sẫm, nhám; hông sáng hơn để người chơi biết đánh hông |
| **Bọ Ngựa Lau** | Cao ngang vai, mảnh, dọc; lẫn trong lau | Màu lau úa có sọc; lộ ra nhờ chuyển động và rim |
| **Ụ Bùn** | Khối bùn hai chân, **không mặt, không thân người**; rễ lau lòi ra | Bùn nhỏ giọt (vertex offset), nứt khi khô; sụp thành bùn khi thua |
| **Người bị mê** | Người làng đứng im (không phải quái) | Sương ảo nhạt, không mặt quỷ |

## 5. Công nghệ UE5 trên RTX 5050 8 GB

Phiên bản chưa pin; mục "cần kiểm chứng" phải thử trên bản đã pin.

| Hạng mục | Đề xuất |
|---|---|
| GI | **Lumen phần mềm** mặc định; Lumen phần cứng là tùy chọn |
| Hình học | **Nanite** cho đất, đá, nhà, lò. Nanite displacement cho bùn: cần kiểm chứng |
| Bóng | **Virtual Shadow Maps**; lau dày làm tăng chi phí, phải đo |
| Vật liệu | Material truyền thống trước. **Substrate**: trạng thái trên bản pin cần kiểm chứng, chỉ đánh giá sau. Bùn ướt hòa địa hình bằng Runtime Virtual Texture |
| Nước | **Shader tự viết trên mesh phẳng** (đục, flowmap, gợn) cho đầm; Water plugin chỉ thử cho sông ở hub. Không combat bơi |
| Lau sậy | **PCG** rải lau (production-ready ở 5.7). **Nanite Foliage** còn *Experimental* ở 5.7: chỉ thử, chưa phụ thuộc. Nguồn: https://www.unrealengine.com/news/unreal-engine-5-7-is-now-available ; https://digitalproduction.com/2025/11/12/unreal-engine-5-7-foliage-pcg-and-in-editor-ai/ |
| Khí quyển | Height Fog + Volumetric Fog; Local Fog Volume cho sương ảo |
| Người | **MetaHuman** làm nền mặt và rig cho dân làng. Ba nhân vật chính cần họa sĩ chỉnh mặt, tóc. Theo trang Epic, từ UE 5.6 MetaHuman thuộc Unreal Engine EULA (https://www.unrealengine.com/eula/mhc ; https://www.metahuman.com/license): **phải đọc toàn văn**. Rủi ro: mặt mặc định lệch phong cách, trang phục phải làm riêng, LOD nặng VRAM |
| Animation | **Motion Matching** cho locomotion người (đánh giá ở GĐ2); combat keyframe; Control Rig IK cho chân thú trên bùn; motion warping cho cạy. Thú bốn chân phải keyframe |

**Ngân sách VRAM:** preset Cao ≤ 7 GB (mục tiêu, chưa đo). Khi vượt, giảm theo thứ tự:
1. Texture streaming pool.
2. Mật độ lau.
3. Độ phân giải volumetric fog.
4. VSM page pool.
5. LOD MetaHuman.

Tỷ lệ chia chỉ được ghi sau khi chạy harness TECH_SPEC §5. Texture 4K chỉ cho mặt nhân vật chính; còn lại 2K và trim sheet hoa văn dùng chung.

## 6. Pipeline cho solo dev + AI

| AI hỗ trợ được | Cần người thật hoặc mua |
|---|---|
| Script dựng graybox, blockout đúng tỷ lệ | **Concept art**: họa sĩ có hợp đồng chuyển nhượng quyền. Đây là phần quyết định "chất Việt" |
| Shader nước, bùn, lau; master material | **Model nhân vật, quái**: họa sĩ 3D, hoặc base mesh thú có license rõ |
| PCG graph rải lau, đá, đường mòn | **Animation, mocap**: diễn viên hoặc animator; AI chỉ làm sạch, retarget |
| Control Rig IK, lắc lau, nhấp nhô đò | **Texture cao cấp**: Megascans/Fab cho đất, đá, gỗ; đồ đồng cần người làm riêng |
| Sequencer cảnh cạy, đường bay benchmark | Duyệt bằng mắt trên máy thật; âm thanh thu thật hoặc thư viện có license |

**Asset có license:**
- Fab Standard License và Megascans: đọc toàn văn EULA (https://www.fab.com/cla). Kiểm điều kiện thương mại, ngưỡng doanh thu (forum có nhắc, chưa xác nhận) và asset cũ theo Epic Content License (chỉ dùng trong UE).
- Asset Fab chỉ dùng cho vật liệu tự nhiên, không dùng cho kiến trúc hay trang phục.
- Ghi register trước khi commit.

**Asset AI:**
- Chỉ làm placeholder, gắn tag `PLACEHOLDER_AI`, đặt trong `Content/Placeholder/`. Validator chặn tag này khi cook bản phát hành.
- Khai báo trên Steam theo form hiện hành: nội dung "pre-generated" có trong game hoặc marketing phải khai (https://www.pcgamer.com/software/ai/steam-updates-ai-disclosure-form-to-specify-that-its-focused-on-ai-generated-content-that-is-consumed-by-players-not-efficiency-tools-used-behind-the-scenes/). Phải đọc văn bản Steamworks gốc.

**Ước lượng tương đối:**
- Lớn nhất: concept art và animation.
- Thứ ba: model nhân vật.
- Rẻ nhất: môi trường, nhờ PCG, Megascans và shader do AI viết.

## 7. Lộ trình graybox → đích

| Bước | Nội dung | Tiêu chí |
|---|---|---|
| **0. Graybox** (hiện tại) | Khối màu phẳng | Chơi hết vòng Demo 0.1 |
| **1. Blockout có tỷ lệ** | Người 1,7 m, giáo 2,6 m, lau cao hơn đầu, sân boss r 18 m, nhà sàn đúng chiều cao | Ở mọi điểm thấy mốc định hướng; lock-on 15 m không bị lau che; chụp 5 khung theo §3 |
| **2. Look-dev một khung** (đầm nông §3.2) | Nước, bùn, lau PCG, sương, ánh sáng; một Cua hoàn thiện; Cói placeholder | Người ngoài đội nhận ra "Đông Sơn, không Trung Hoa hay Nhật"; `historian-verifier` không có lỗi Chặn; CSV benchmark preset Cao trên RTX 5050, VRAM đỉnh ≤ 7 GB; không hitch PSO > 50 ms |
| **3. Vertical slice** | `ch_longbien` và hub ở chất lượng đích. Cói, Lợn Lòi Đầm do người làm; cảnh cạy và HUD hoàn chỉnh | 0 asset `PLACEHOLDER_AI` trong bản cook; mọi asset có trong register; đủ CSV Thấp → Cao; playtest đọc được báo hiệu không cần màu |

**Rủi ro đề xuất ghi `RISK_REGISTER.md`:** vượt 8 GB do lau + VSM + fog; Nanite Foliage experimental; MetaHuman lệch phong cách; thiếu họa sĩ am hiểu Đông Sơn.
