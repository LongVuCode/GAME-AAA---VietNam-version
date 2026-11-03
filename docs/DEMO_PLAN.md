# Kế hoạch Demo 0.1

Mục tiêu: có **bản demo đầu tiên chơi được** để bắt đầu vòng test liên tục (D-013), và đồng thời dựng nền cho bản Unreal Engine 5.

## Giới hạn thật (đọc trước)
- Môi trường AI là container Linux, **không có GPU, không có Unreal Editor**. AI viết được code UE5 nhưng **không build hay chạy được** bản UE. Phần này PO build trên máy RTX 5050.
- Vì vậy Demo 0.1 có **hai track song song**, dùng chung luật và dữ liệu:

| Track | Là gì | Chạy ở đâu | Mục đích |
|---|---|---|---|
| **W: Prototype web** | Graybox góc nhìn thứ ba chạy trên trình duyệt (three.js), một khu của chương Long Biên | Mở link là chơi | Thử **nhịp chơi** (combat, cạy khoen, bàn giao đời) và thu ý kiến **ngay hôm nay**. Không phải đồ họa đích; sẽ bỏ khi bản UE thay thế được |
| **U: Unreal Engine 5** | Project C++ (các module `ArpgCore` / `ProjectFerry` / `ProjectFerryEditor` (tên mã nội bộ, trung tính)), script Python tạo graybox trong editor, hướng dẫn build | Máy PO (Windows, RTX 5050) | Nền cho vertical slice thật |
| **Lõi chung** | `ArpgCore`: C++20 thuần, có test (doctest); dữ liệu thiết kế `design/data/*.json` có schema và validator | Build và test ngay trong CI/container | Một nguồn luật duy nhất; Track W đọc chung file dữ liệu cân bằng |

## Phạm vi nội dung Demo 0.1 (lát cắt của `ch_longbien`)
- **Nhân vật:** Cói, cùng một đoạn bàn giao ngắn sang đời sau để chứng minh cơ chế kế thừa.
- **Combat:** đòn nhẹ/nặng, combo, né (i-frame), parry, thanh Thế (stagger), Nhịp trống, đòn kết cạy khoen, hit-stop, lock-on.
- **Kẻ địch:** 2–3 loại quái thường, cùng mini-boss/boss **Lợn Lòi Đầm** đeo mảnh khoen (2 pha, kết bằng cạy).
- **Hệ thống:** 2 vũ khí, chế tác 1 Bảo khí từ vật liệu boss, một chuỗi bí mật nhỏ có gợi ý, Codex có nhãn nội dung, chuỗi hiển thị vi/en.
- **Không có trong 0.1:** trận Hồ Tinh (thần kết liễu, cần set-piece nước dâng: spike C4), lồng tiếng, nhạc thật, đồ họa đích.

## Tiêu chí nghiệm thu (đo được)
| Hạng mục | Tiêu chí |
|---|---|
| ArpgCore | Build với `-Wall -Wextra -Werror` trên g++ và clang++; 100% test đạt; độ phủ dòng ≥ 80% (gcov) |
| Dữ liệu thiết kế | Validator 0 lỗi; mọi chuỗi hiển thị có cả `vi` và `en`; mọi mục nội dung có nhãn |
| Prototype web | Smoke test tự động (Playwright): game khởi động không lỗi console, kịch bản bot hạ được một quái thường, màn Codex mở được; có ảnh chụp làm bằng chứng |
| Track U | Code nằm trong repo, có hướng dẫn build. **Chỉ được báo "đã build" khi có log build từ máy PO** |
| Văn hóa | Story Bible v1.1 qua phản biện, không còn lỗi Chặn; nội dung trong demo khớp Story Bible |

## Quy trình
Agent chuyên môn làm việc → agent review khác vai → người điều phối chạy lại test, rồi commit và push lên `feat/demo-0.1` → cuối cùng nộp báo cáo GĐ demo và dừng chờ duyệt.
