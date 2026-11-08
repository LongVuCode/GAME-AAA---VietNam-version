# Ghi chú bàn giao — Demo 0.4 (trạng thái dở dang)
Ngày: 2026-11-08 · Nhánh: `feat/demo-0.4` (chưa gộp vào `main`; `main` đang ở Demo 0.3 + bản sửa tường vô hình)

## Đã xong (đã commit)
- Thiết kế: `research/narrative/STORY_INTEGRATION_0_4.md` (đã qua phản biện và sửa), `design/COMBAT_0_4.md`, `design/data/world_0_4.json` (bản đồ 4,8×), `creatures_0_4.json` (Dế Cõng Đá thay cua), `dialogue/quests/cinematics.json`.
- Code: ghép cốt truyện (`prototype/web/src/story/`: cold open, NPC + lựa chọn, nhiệm vụ, bàn giao); môi trường PBR (`src/env/`, asset CC0 trong `prototype/web/assets/` qua Git LFS).

## Đang dở
- **Smoke test còn trượt 6 kiểm tra trận boss/cạy** (tính đến lượt chạy đầy đủ gần nhất). Agent môi trường đang sửa `src/logic/shackle.js`, `test/boss.test.mjs`, `game/game.js` (bot cạy bằng phím có timestamp). Cần: smoke 100%, chạy qua server tĩnh `test/serve.mjs` để tải được glb/hdr.
- Chưa chụp ảnh trước/sau, chưa đăng ký đủ license từng asset trong `docs/ASSET_LICENSE_REGISTER.md`.

## Việc tiếp theo (theo D-026)
1. Sửa smoke cho đạt 100%: `cd prototype/web && npm ci && npm run build && npm test && npm run smoke`; `python3 tools/design_validate.py`.
2. Publish lên artifact cũ https://claude.ai/artifact/4PetpFm4jRtHe1UQL86ke5 (dist có `assets/` → publish nhiều file), gộp `feat/demo-0.4` vào `main`.
3. Đợt sau: ghép combat 0.4 (`design/COMBAT_0_4.md`) và dựng quái bằng Blender (`bpy` từ PyPI) theo `creatures_0_4.json`.

## Môi trường
Môi trường cloud riêng `GAME-AAA---VietNam-version` mở thêm: api/dl/cdn.polyhaven.com, ambientcg.com, lfs.github.com.
