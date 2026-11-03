# Asset & License Register

## License được chấp nhận
- CC0; CC-BY 4.0 (kèm ghi công trong credits).
- Fab Standard License (lưu ý: một số asset chỉ được dùng trong UE, **cần đọc điều khoản của từng asset**).
- Asset tự sản xuất hoặc đặt hàng (có hợp đồng chuyển nhượng quyền).
- Plugin của hãng (NVIDIA/AMD/Intel): theo license SDK của từng hãng. Phải lưu bản license vào `legal/`.

## Không chấp nhận
- Asset rip từ game khác.
- Asset không rõ nguồn.
- Asset có điều khoản "non-commercial" (trừ placeholder nội bộ, và phải gắn tag).
- Asset AI tạo sinh trong bản phát hành.

## Bảng đăng ký
| ID | Asset | Loại | Nguồn / URL | License | Ngày | Dùng ở đâu | AI tạo? | Tag | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|
| L-001 | doctest 2.4.11 (`third_party/doctest/`) | Thư viện test C++ | https://github.com/doctest/doctest (tag v2.4.11), SHA-256 `44faa038…` | MIT | 2026-11-03 | Test ArpgCore (không ship trong game) | Không | | Kèm `LICENSE.txt` |
| L-002 | nlohmann/json 3.11.3 (`third_party/nlohmann/`) | Thư viện JSON C++ | https://github.com/nlohmann/json (tag v3.11.3), SHA-256 `9bea4c80…` | MIT | 2026-11-03 | ArpgCore đọc dữ liệu thiết kế | Không | | Kèm `LICENSE.MIT`; nếu ship thì ghi credit |
| L-003 | three.js r169 (npm `three@0.169.0`, `prototype/web/`) | Thư viện đồ họa JS (WebGL) | https://github.com/mrdoob/three.js (npm `three@0.169.0`, ghim trong `prototype/web/package-lock.json`) | MIT | 2026-11-03 | Prototype web Track W: bundle vào `prototype/web/dist/index.html` (không commit `node_modules/`, `dist/`) | Không | | Bản bundle giữ dòng ghi chú bản quyền MIT trong HTML; esbuild 0.24.0 (MIT) chỉ là công cụ build, không ship |

> Cột "AI tạo?" phục vụ việc khai báo nội dung AI với Steam (xem `COMMERCIAL_RELEASE.md`).
