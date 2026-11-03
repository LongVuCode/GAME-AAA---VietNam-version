# Ghi chú phát hành thương mại (Steam và các nền tảng khác)

> Mọi điểm dưới đây ghi từ hiểu biết sẵn có, **CHƯA tra lại điều khoản hiện hành** (ngày ghi: 2026-11-03). Luật sư hoặc người phụ trách phải xác nhận trước khi hành động.

| Hạng mục | Nội dung cần kiểm tra | Trạng thái |
|---|---|---|
| Unreal Engine EULA | Phí bản quyền (royalty) theo doanh thu vượt ngưỡng, ngoại lệ với doanh thu qua Epic Games Store, nghĩa vụ báo cáo | Chưa tra |
| Steam Direct | Phí đăng ký mỗi sản phẩm, quy trình review, trang "Coming soon", Steam Playtest | Chưa tra |
| Công khai nội dung do AI tạo | Steam yêu cầu khai báo nội dung AI tạo sinh. Dự án dùng AI agent viết code, tài liệu và có thể cả lore, nên **phải khai báo trung thực** | Chưa tra chi tiết |
| Phân loại độ tuổi | Bảng câu hỏi nội dung của Steam; IARC cho các store khác (Epic, Microsoft Store); GOG có quy trình riêng | Chưa tra |
| Quy định Việt Nam về trò chơi điện tử | Game bán qua Steam có cần giấy phép hoặc thủ tục gì tại Việt Nam không, nội dung lịch sử có bị ràng buộc gì không | **CHƯA XÁC MINH**, cần luật sư |
| Nhãn hiệu tên game | Tra cứu ở Việt Nam (Cục Sở hữu trí tuệ), USPTO/EUIPO, Steam | Chưa làm (tên đang tạm hoãn) |
| License plugin | NVIDIA DLSS/Streamline, AMD FidelityFX, Intel XeSS: điều khoản phân phối, yêu cầu ghi công/logo | Chưa tra |
| Bản địa hóa | vi và en tối thiểu khi ra mắt; cân nhắc zh/ja/ko sau | Kế hoạch |
| Giá, hoàn tiền, cập nhật | Chính sách hoàn tiền 2 giờ của Steam ảnh hưởng thiết kế demo/thời lượng | Chưa tra |

## Hệ quả với thiết kế và quy trình
- Ghi lại nguồn gốc của mọi asset và mọi đoạn nội dung do AI tạo (đã có `ASSET_LICENSE_REGISTER.md`; bổ sung cột "AI-generated: có/không").
- Nên có một **demo** (Steam Next Fest) từ vertical slice.
- Codex minh bạch sử/huyền thoại/hư cấu cũng là cách giảm rủi ro truyền thông khi phát hành tại Việt Nam.
