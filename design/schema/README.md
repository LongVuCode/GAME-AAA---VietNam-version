# Schema dữ liệu thiết kế — Demo 0.1

Nguồn dữ liệu duy nhất cho ArpgCore, prototype web và UE5 (D-020). Kiểm bằng `python3 tools/design_validate.py`; test ở `tests/test_design.py`.

## Quy ước chung
| Quy ước | Nội dung |
|---|---|
| Đơn vị | Khóa kết thúc `_s` là **giây**; `_deg` là **độ** (0–360); `_m` là mét; `_mps` là mét/giây; `_mult`, `_ratio` là hệ số (1.0 = không đổi) |
| Chuỗi hiển thị | Object `{"vi": str, "en": str}`, cả hai khác rỗng, không khóa khác. Các khóa `name`, `description`, `text`, `title`, `narrative`, `effect_text`, `text_extra` **bắt buộc** là chuỗi hiển thị |
| Nhãn | `label` ∈ `SỬ LIỆU`, `SỬ LIỆU-TRANH LUẬN`, `HUYỀN THOẠI`, `CỔ TÍCH`, `SÁNG TẠO`. `CHƯA XÁC MINH` bị chặn trong dữ liệu game |
| Nguồn | `sources`: ID trong `research/data/sources.json`. Nhãn sử/huyền thoại/cổ tích cần ≥ 1 nguồn; `SỬ LIỆU` cần 2 dòng nguồn độc lập (lỗi), `SỬ LIỆU-TRANH LUẬN` thiếu thì cảnh báo. `research_ref(s)`: ID trong `myths.json` hoặc `timeline.json` |
| ID | Tiếng Anh/không dấu, duy nhất toàn bộ dữ liệu. Khóa bắt đầu bằng `_` là ghi chú, bỏ qua |
| Số liệu | Mọi con số là **giả định thiết kế**, chờ playtest |

## `combat_tuning.json`
| Khối | Trường chính |
|---|---|
| `input` | `buffer_s`, `combo_pause_threshold_s` (khoảng dừng để rẽ nhánh), `hold_threshold_s` |
| `movement` | `walk_speed_mps`, `run_speed_mps`, `mud_speed_mult`, `shallow_water_speed_mult` |
| `player` | `hp_max`, `the_max`, `the_regen_per_s`, `the_regen_delay_s`, `guard_break_stun_s`, `hitstun_light_s`, `hitstun_heavy_s` |
| `dodge` | `duration_s`, `iframe_start_s`, `iframe_duration_s`, `perfect_dodge_window_s` (≤ i-frame), `recovery_s`, `distance_m` |
| `guard` | `damage_reduction`, `parry_window_s`, `perfect_parry_window_s` (≤ parry), `parry_enemy_the_damage`, `perfect_parry_enemy_the_damage`, `perfect_parry_counter_window_s` |
| `enemy_the_defaults` | Giá trị mặc định khi enemy không ghi đè |
| `drum_rhythm` | `segments` (= 4), `points_per_segment`, `gain.{hành động}`, `loss_on_hit_taken`, `decay_delay_s`, `decay_per_s`, `drum_burst_cost_segments` |
| `hit_stop` | `light_s`, `medium_s`, `heavy_s`, `finisher_s`, `pry_beat_s`, `pry_release_s` (0–0,2 s) |
| `lock_on` | `max_distance_m`, `acquire_cone_deg`, `break_distance_m`, `switch_cone_deg`, `soft_lock_cone_deg`, `toggle_mode_default` |
| `pry` | `beats` (= 3), `bpm`, `beat_window_s`, `hold_option`, `hold_duration_per_beat_s`, `miss_retries_per_beat`, `on_fail`, `silence_after_s` |
| `enemy_ai` | `max_simultaneous_attackers`, `max_delayed_attacks_per_moveset`, `unparryable_telegraph` |
| `healing` | `item_id` (→ items), `charges`, `heal_ratio`, `use_time_s` |
| `difficulty` | `default`; `presets[4]`: `id`, `name`, `description`, `damage_taken_mult`, `damage_dealt_mult`, `enemy_speed_mult`, `parry_window_mult`, `telegraph_time_mult`, `pry_auto`, `aim_assist`; `custom_ranges.{khóa}: {min,max,step}` |
| `accessibility.options[]` | `id`, `name`, `type` (`bool`/`enum`/`range`/`action`), `values`, `default` |

## `weapons.json` → `weapons[]`
`id`, `name`, `description`, `label`, `basis {label, sources, research_ref, note}` (cơ sở hiện vật), `era`, `owner_character` (→ lineage), `slot`, `codex_ref` (→ codex).
- `moves[]`: `id`, `name`, `input` (`L`, `H`, `L,L,pause,H`, `dodge,L`, `perfect_parry,L`), `chain_index` (0 = ngoài chuỗi), `damage`, `the_damage`, `startup_s`, `active_s`, `recovery_s`, `combo_window_s`, `hit_weight` (`light`/`medium`/`heavy` → `hit_stop`), `range_m`, `arc_deg`, `requires_skill?` (→ skill), `charge? {max_level, time_per_level_s, damage_mult_per_level, level_2_requires_skill}`.
- `drum_burst` (Hồi trống): `id`, `name`, `description`, `label`, `hits`, `damage_total`, `the_damage_total`, `duration_s`, `super_armor`, `invulnerable`, `hit_weight`.

## `enemies.json`
`enemies[]`: `id`, `name`, `description`, `label`, `type` (`beast`/`insect`/`spirit`/`illusion`; **`human` bị cấm**), `species_family` (bị chặn theo chương, ví dụ `ch_longbien` cấm `fox`, `giao_long`, `thuong_luong`, `snake`, `turtle`, `crocodile`, `reptile`, `lizard`), `skeleton_family`, `rank` (`normal`/`elite`/`boss`), `chapter`, `zones`, `hp`, `the_max`, `the_regen_per_s`, `the_regen_delay_s`, `stagger_duration_s`, `interrupt_threshold` (sát thương Thế tối thiểu để giật), `defeat_behavior` (`flee`/`dissipate`/`pry_then_walk_away`), `drops[] {item, count, chance}`.
- `attacks[]`: `id`, `name`, `damage`, `player_the_damage`, `hits?`, `windup_s`, `hold_s?` (đòn trễ), `active_s`, `recovery_s`, `parryable` (bool), `guardable`, `delayed`, `range_m`, `cooldown_s`, `dodge_hint`, `telegraph {visual, audio, color_cue}`. Đòn không parry được có sát thương phải có `color_cue` khác `none`, cùng âm thanh.
- Boss: `phases[] {id, name, narrative, enter {type, conditions}, moveset[], speed_mult, telegraph_time_mult, the_max}`, `hp_floor`, `finish`.
- `khoen` (chỉ trên boss trong danh sách cho phép của validator; cấm ở `ch_phudong`): `binding_item` (= true), `feature_flag`, `socket`, `crack_stages`, `crack_on`, `pry_condition {khoen_cracks_at_least, state}`, `pry_beats` (= `pry.beats`), `on_pry_success {outcome, drops, sets_flag, shard_handling}`, `fallback_when_disabled` (bắt buộc, V9).
- `non_combat_encounters[]` (người bị mê): `combat` = false, `targetable_by_attacks` = false, `interaction`, `hold_s`, `on_success {dispels, grants_skill_points, sets_flag}`.

## `items.json`
- `rarities[] {id, name, order, allowed_in_demo?}`.
- `items[]`: `id`, `category` (`consumable`/`material`/`bao_khi`), `name`, `description`, `label`, `rarity`, `unique?`, `era?`, `source {kind: starting|gather|village_gift|shed_after_pry|remains_after_dissolve|crafted|secret_reward, …}`, `effect`, `effect_text?`, `upgrade_levels?`, `inheritable_via?`, `codex_ref?`. Không có item nào từ khoen. Bảo khí phải được chế từ vật liệu `shed_after_pry` hoặc `remains_after_dissolve`.
- `recipes[]`: `id`, `type` (`craft`/`upgrade`), `station`, `inputs[] {item, count}`, `output {item, count}`, `target?`, `to_level?`, `craft_time_s`.
- `stations[]`: `id`, `name`, `label`, `level`, `npc`.

## `lineage.json`
- `eras[] {id, name, label, sources, forbidden_content_tags}`: thời đại; `khoen` trong `forbidden_content_tags` làm validator chặn chữ "khoen" trong mọi văn bản hiện ra ở đời đó (SB-02).
- `characters[] {id, name, description, label, generation, era, chapters, weapon_slots, start_weapons, …}`.
- `tools[]` (Mũi Sào): `occupies_weapon_slot` = false, `has_stats` = false.
- `house_moves[]` (Đòn nhà): `learned_by`, `unlock`, `input`, số liệu đòn, `inheritable`.
- `thap`: `material` = `gom`, `funerary_reference` = false.
- `skill_tree {branches[], nodes[] {id, branch, name, description, label, cost, prereqs[], effect}}`: prereq phải tồn tại và không vòng.
- `skill_point_sources[]`, `inheritance {…}`, `handoff {from, to, level, trigger, steps[] {id, kind, …}}`.

## `secrets.json`
- `locations[] {id, name, revisitable, revisit_via}`: node đặt ở nơi không quay lại được là lỗi.
- `chains[]`: `id`, `name`, `description`, `label`, `scope`, `hint_giver`, `clues[] {id, name, text, label, kind, consumable=false}`, `nodes[] {id, is_start?, is_end?, location, action, requires {all[], any[]}, grants[], hints[3] {tier 1..3, text}, reward?, puzzle?}`.
- Ngữ nghĩa: một node làm được khi có đủ manh mối `requires.all` và ít nhất một trong `requires.any`. Manh mối không bao giờ mất. Validator duyệt **toàn bộ** không gian trạng thái (tập node đã xong): mọi node phải tới được từ start, và từ mọi trạng thái tới được vẫn còn đường tới node end.

## `codex.json` → `entries[]`
`id`, `title`, `label`, `sources[]` (rỗng nếu `SÁNG TẠO`), `research_refs[]`, `text`, `text_extra?` + `text_extra_unlock?` (→ chuỗi bí mật), `review_status`, `notes?`.

## `strings.json`
`ui {key: {vi, en}}`; `dialogue[] {id, speaker, trigger, label, form?, text}`.
