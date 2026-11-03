# Đội AI Agent của dự án

## 1. "Đào tạo" agent nghĩa là gì (nói thẳng)
- Không có việc fine-tune hay huấn luyện mô hình ở đây. Mỗi agent là cùng một mô hình AI chạy với **vai trò, luật và công cụ riêng**, được định nghĩa trong `.claude/agents/*.md`.
- Agent **không có trí nhớ giữa các phiên**. Thứ duy nhất được "học" và tích lũy là **kho tri thức trong repo**: luật (`CLAUDE.md`), tài liệu `docs/`, dữ liệu `research/`, checklist và test. Vì vậy "đào tạo đội" = liên tục bổ sung kho tri thức đó, cùng các test tự động bắt lỗi lặp lại.
- Agent làm nhanh nhưng **có thể sai một cách tự tin**. Do đó mỗi sản phẩm phải qua một agent khác review (người viết ≠ người duyệt), và các mốc quan trọng phải có anh/chị hoặc người thật duyệt.

## 2. Thành viên
| Agent | File | Việc chính | Ai duyệt sản phẩm |
|---|---|---|---|
| Điều phối (phiên chính) | — | Lập kế hoạch, giao việc, tổng hợp, báo cáo giai đoạn, git | Product Owner (anh/chị) |
| `narrative-researcher` | `.claude/agents/narrative-researcher.md` | Cốt truyện, lore, dị bản, canon | `historian-verifier` → PO → cố vấn sử học |
| `vn-history-folklore-expert` | `.claude/agents/vn-history-folklore-expert.md` | Chuyên gia lịch sử, truyền thuyết, cổ tích, tín ngưỡng; hồ sơ chuyên sâu; duy trì `research/data` | `historian-verifier` → PO; tối đa mức B |
| `historian-verifier` | `.claude/agents/historian-verifier.md` | Phản biện nguồn, nhãn, độ nhạy cảm | PO; mức A cần người thật |
| `game-designer` | `.claude/agents/game-designer.md` | Combat, quái/boss, trang bị, bí mật, cân bằng (dạng dữ liệu) | `qa-lead`, PO qua playtest |
| `ue-gameplay-engineer` | `.claude/agents/ue-gameplay-engineer.md` | C++ ArpgCore + UE5, test, CI | `qa-lead`; PO build trên máy thật |
| `tech-art-perf` | `.claude/agents/tech-art-perf.md` | Preset đồ họa, upscaler, PSO, benchmark | `qa-lead`; số liệu đo trên máy PO |
| `qa-lead` | `.claude/agents/qa-lead.md` | Review, chạy test, kiểm tra nghiệm thu | PO |

## 3. Quy trình một đầu việc
1. Điều phối tạo nhánh `feat/*` hoặc `research/*` và giao việc kèm tiêu chí xong.
2. Agent chuyên môn làm việc, chạy lint/test, viết tóm tắt.
3. Agent review (verifier hoặc QA) chấm ĐẠT / KHÔNG ĐẠT. Nếu không đạt thì quay lại bước 2.
4. Điều phối commit, push, mở pull request.
5. **Anh/chị duyệt** trên GitHub (và build/chơi thử nếu là code UE), sau đó merge vào `main`.

## 4. Việc AI agent KHÔNG làm thay được
| Việc | Vì sao | Đề xuất cho solo dev |
|---|---|---|
| Build, chạy và đo game UE5 | Môi trường AI không có Windows/GPU | Anh/chị chạy trên máy RTX 5050, gửi lại log và CSV (có hướng dẫn từng bước) |
| Cảm nhận game feel, playtest | Cần người chơi thật | Anh/chị cùng nhóm playtest (Steam Playtest về sau) |
| Ký duyệt sử liệu mức A | Cần chuyên môn và trách nhiệm người thật | Thuê cố vấn sử học theo chương (cộng tác viên viện/trường) |
| Pháp lý (nhãn hiệu, hợp đồng, quy định phát hành) | Cần luật sư | Tư vấn một lần trước khi mở trang Steam |
| Asset 3D cao cấp, animation, lồng tiếng, nhạc | Chất lượng và bản quyền | Asset có license (Fab), MetaHuman, thuê freelancer theo từng gói |
