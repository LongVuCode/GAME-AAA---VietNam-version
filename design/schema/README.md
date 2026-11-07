# Schema dữ liệu thiết kế — Demo 0.1

Nguồn dữ liệu duy nhất cho ArpgCore, prototype web và UE5 (D-020). Kiểm bằng `python3 tools/design_validate.py`; test ở `tests/test_design.py`.

## Quy ước chung
| Quy ước | Nội dung |
|---|---|
| Đơn vị | Khóa kết thúc `_s` là **giây** (riêng `_deg_s` là độ/giây); `_mps2` là m/s²; `_deg` là **độ** (0–360); `_m` là mét; `_mps` là mét/giây; `_mult`, `_ratio` là hệ số (1.0 = không đổi) |
| Chuỗi hiển thị | Object `{"vi": str, "en": str}`, cả hai khác rỗng, không khóa khác. Các khóa `name`, `description`, `text`, `title`, `narrative`, `effect_text`, `text_extra` **bắt buộc** là chuỗi hiển thị |
| Nhãn | `label` ∈ `SỬ LIỆU`, `SỬ LIỆU-TRANH LUẬN`, `HUYỀN THOẠI`, `CỔ TÍCH`, `SÁNG TẠO`. `CHƯA XÁC MINH` bị chặn trong dữ liệu game |
| Nguồn | `sources`: ID trong `research/data/sources.json`. Nhãn sử/huyền thoại/cổ tích cần ≥ 1 nguồn; `SỬ LIỆU` cần 2 dòng nguồn độc lập (lỗi), `SỬ LIỆU-TRANH LUẬN` thiếu thì cảnh báo. `research_ref(s)`: ID trong `myths.json` hoặc `timeline.json` |
| ID | Tiếng Anh/không dấu, duy nhất toàn bộ dữ liệu. Khóa bắt đầu bằng `_` là ghi chú, bỏ qua |
| Số liệu | Mọi con số là **giả định thiết kế**, chờ playtest |

## `combat_tuning.json`
| Khối | Trường chính |
|---|---|
| `input` | `buffer_s`, `combo_pause_threshold_s` (khoảng dừng để rẽ nhánh), `hold_threshold_s` |
| `movement` | `walk_speed_mps`, `run_speed_mps`, `mud_speed_mult`, `shallow_water_speed_mult`. **0.2:** `sprint_speed_mps`, `sprint_requires_move_input_ratio`, `sprint_the_regen_mult` (0 = Thế ngừng hồi khi chạy nhanh; không có thanh sức riêng), `sprint_allowed_while_locked_on`, `sprint_breaks_strafe`, `guard_walk_speed_mps`, `lock_on_strafe_speed_mps`, `accel_mps2`, `decel_mps2`, `sprint_accel_mps2`, `sprint_decel_mps2`, `sprint_stop_skid_after_s`, `sprint_stop_skid_s`, `{idle,run,sprint,guard}_turn_rate_deg_s` (độ/giây; khóa kết thúc `_s` nên validator chỉ kiểm ≥ 0), `pivot_turn_threshold_deg`, `pivot_turn_s`, `stride_{walk,run,sprint}_m` (nhịp chân = tốc độ / sải), `lean_into_turn_max_deg`, `lean_on_accel_max_deg`, `jump_enabled` (= false), `contextual_vault {enabled, max_height_m, max_gap_m, duration_s, auto_from_sprint}` |
| `player` | `hp_max`, `the_max`, `the_regen_per_s`, `the_regen_delay_s`, `guard_break_stun_s`, `hitstun_light_s`, `hitstun_heavy_s` |
| `dodge` | `duration_s`, `iframe_start_s`, `iframe_duration_s`, `perfect_dodge_window_s` (≤ i-frame), `recovery_s`, `distance_m`. **0.2:** `direction_mode`, `neutral_dodge` (`backstep`), `backstep_distance_m`, `sprint_dodge_distance_m`, `ease_out_exponent`, `snap_facing_on_start`, `max_chain`, `chain_extra_recovery_s`, `surface_vfx {mud, shallow, ground}` |
| `guard` | `damage_reduction`, `parry_window_s`, `perfect_parry_window_s` (≤ parry), `parry_enemy_the_damage`, `perfect_parry_enemy_the_damage`, `perfect_parry_counter_window_s` |
| `enemy_the_defaults` | Giá trị mặc định khi enemy không ghi đè |
| `drum_rhythm` | `segments` (= 4), `points_per_segment`, `gain.{hành động}`, `loss_on_hit_taken`, `decay_delay_s`, `decay_per_s`, `drum_burst_cost_segments` |
| `hit_stop` | `light_s`, `medium_s`, `heavy_s`, `finisher_s`, `pry_beat_s`, `pry_release_s` (0–0,2 s) |
| `lock_on` | `max_distance_m`, `acquire_cone_deg`, `break_distance_m`, `switch_cone_deg`, `soft_lock_cone_deg`, `toggle_mode_default` |
| `pry` | `beats` (= 3), `bpm`, `beat_window_s`, `hold_option`, `hold_duration_per_beat_s`, `miss_retries_per_beat`, `on_fail`, `silence_after_s`. **0.2:** `camera_distance_m`, `camera_orbit_per_beat_deg`, `camera_push_per_beat_m`, `release_time_scale`, `release_slowmo_s` |
| `enemy_ai` | `max_simultaneous_attackers`, `max_delayed_attacks_per_moveset`, `unparryable_telegraph`. **0.2:** `token_wait_ring_m`, `circle_when_waiting`, `flank_angle_deg`, `token_priority`, `offscreen_attack_extra_windup_s`, `offscreen_attack_requires_audio_cue`, `attack_selection`, `repeat_weight_mult`, `max_same_attack_in_row`, `player_the_ratio_at_least` (Thế tích lũy của người chơi, gần vỡ), `player_near_break_aggression_mult` |
| `camera_shake` | `enabled_default`, `max_amplitude`, `light_amplitude`, `heavy_amplitude`. **0.2:** `medium_amplitude`, `duration_s`, `directional`, `frequency_hz` |
| `attack_motion` (0.2) | `hit_detection` (`swept_over_active`), `magnetism_max_m`, `magnetism_stop_gap_m`, `reaim_turn_rate_deg_s`, `reaim_until`, `whiff_extra_recovery_s`, `sprint_attack_min_sprint_s` |
| `weapon_swap` (0.2) | `allowed_states[]`, `swap_time_s`, `swap_attack_window_s`, `keeps_chain` |
| `hit_react` (0.2) | `flinch_{light,medium,heavy}_s`, `knockback_{light,medium,heavy,finisher}_m`, `knockback_duration_s`, `flinch_cancels_windup`, `hit_flash_s`, `stagger_enter_pose_s`, `player_knockback_{light,heavy}_m`, `player_knockdown_get_up_s`, `player_knockdown_iframes` |
| `finisher` (0.2) | Đòn kết quái thường (không giết): `normal_duration_s`, `player_invulnerable`, `contact_time_scale`, `contact_slowmo_s`, `camera_orbit_deg`, `camera_distance_m`, `camera_fov_deg`, `camera_return_s` |
| `feel` (0.2) | `{perfect_parry,perfect_dodge,the_break}_time_scale` + `_slowmo_s`, `fov_base_deg`, `fov_sprint_add_deg`, `fov_heavy_hit_kick_deg`, `fov_kick_return_s`, `camera_{,sprint_,lock_on_,boss_}distance_m`, `camera_follow_lag_s`, `rumble_{light,heavy,perfect_parry}_{strength,s}`, `min_feedback_layers_per_hit` |
| `tuning_changes_0_2` | `changes[] {file, path, from, to, reason, pinned_by?}`: đề xuất đổi giá trị **chưa áp dụng**; áp cùng lúc với mã 0.2 và sửa test ghi ở `pinned_by` |
| `healing` | `item_id` (→ items), `charges`, `heal_ratio`, `use_time_s` |
| `difficulty` | `default`; `presets[4]`: `id`, `name`, `description`, `damage_taken_mult`, `damage_dealt_mult`, `enemy_speed_mult`, `parry_window_mult`, `telegraph_time_mult`, `pry_auto`, `aim_assist`; `custom_ranges.{khóa}: {min,max,step}` |
| `accessibility.options[]` | `id`, `name`, `type` (`bool`/`enum`/`range`/`action`), `values`, `default` |

## `weapons.json` → `weapons[]`
`id`, `name`, `description`, `label`, `basis {label, sources, research_ref, note}` (cơ sở hiện vật), `era`, `owner_character` (→ lineage), `slot`, `codex_ref` (→ codex).
- `moves[]`: `id`, `name`, `input` (`L`, `H`, `L,L,pause,H`, `dodge,L`, `perfect_parry,L`), `chain_index` (0 = ngoài chuỗi), `damage`, `the_damage`, `startup_s`, `active_s`, `recovery_s`, `combo_window_s`, `hit_weight` (`light`/`medium`/`heavy` → `hit_stop`), `range_m`, `arc_deg`, `requires_skill?` (→ skill), `charge? {max_level, time_per_level_s, damage_mult_per_level, level_2_requires_skill}`.
- `drum_burst` (Hồi trống): `id`, `name`, `description`, `label`, `hits`, `damage_total`, `the_damage_total`, `duration_s`, `super_armor`, `invulnerable`, `hit_weight`.
- **0.2, `moves[].motion`** (`label` = `SÁNG TẠO`): `lunge_m` (bước tới trong startup), `lunge_start_s`, `lunge_per_charge_level_m?`, `self_move_after_m?` (âm = lùi), `self_drift_m?`, `target_react` (`flinch`/`push`/`push_side`/`push_up`/`pull`/`spin_push`), `target_knockback_m` (âm = kéo về phía người đánh), `trail` (kiểu vệt; `none` = tắt), `hitbox` (`line`/`arc`/`circle`), `ground_impact?`, `charge_armor_from_level?`, `charge_armor_max_weight?`, `anticipation`/`active`/`follow_through` (mô tả cho animator, chuỗi nội bộ, không hiển thị).
- **0.2, cấp vũ khí:** `motion_style {label, stance, basis_note}`, `sprint_attack {label, base_move, extra_lunge_m, the_damage_mult, anticipation, active, follow_through}`, `swap_attack {…cùng dạng, không có extra_lunge_m}`, `drum_burst_motion {label, step_per_hit_m, anticipation, active, follow_through}`, `trail_default`. Không thêm `moves[]` mới vì loader ArpgCore chỉ hiểu các `input` ở trên.

## `enemies.json`
`enemies[]`: `id`, `name`, `description`, `label`, `type` (`beast`/`insect`/`spirit`/`illusion`; **`human` bị cấm**), `species_family` (bị chặn theo chương, ví dụ `ch_longbien` cấm `fox`, `giao_long`, `thuong_luong`, `snake`, `turtle`, `crocodile`, `reptile`, `lizard`), `skeleton_family`, `rank` (`normal`/`elite`/`boss`), `chapter`, `zones`, `hp`, `the_max`, `the_regen_per_s`, `the_regen_delay_s`, `stagger_duration_s`, `interrupt_threshold` (sát thương Thế tối thiểu để giật), `defeat_behavior` (`flee`/`dissipate`/`pry_then_walk_away`), `drops[] {item, count, chance}`.
- `attacks[]`: `id`, `name`, `damage`, `player_the_damage`, `hits?`, `windup_s`, `hold_s?` (đòn trễ), `active_s`, `recovery_s`, `parryable` (bool), `guardable`, `delayed`, `range_m`, `cooldown_s`, `dodge_hint`, `telegraph {visual, audio, color_cue}`. Đòn không parry được có sát thương phải có `color_cue` khác `none`, cùng âm thanh.
- **0.2, mọi `attacks[]`:** `shape` (`melee`/`charge`/`aoe`/`rear_arc`/`projectile`, thay bộ CHARGE/AOE cứng trong prototype), `player_knockback_m`, `player_knockdown?`; đòn mới có thể có `since`, `self_move_m`, `projectile_speed_mps`, `exposed_neck_the_mult`, `exposed_side_arc_deg`, `_purpose`.
- **0.2, `behavior`:** `move_speed_mps`, `radius_m`, `aggro_radius_m`, `ambush_aggro_radius_m?`, `leash_radius_m`, `turn_rate_deg_s`, `preferred_range_m`, `sidestep_locomotion?`, `circle {enabled, speed_mps, dir_change_s {min,max}}`, `retreat_after_attack_chance`, `retreat_distance_m`, `retreat_then_prefers?`, `group_role` (`anchor`/`flanker`/`zone_control`/`solo`), `on_own_the_high? {the_ratio_at_least, action, front_damage_mult, duration_s}`, `rear_punish? {attack, player_in_rear_s, rear_arc_deg}`, `punish_chase?`, `keep_away_attack?`, `reposition_burrow?`, `hit_react {knockback_mult, flinch_mult, flinch_min_weight?, additive_flinch_only?}`, `finisher_motion?`, `flee_style`. Thay hằng `PROTO` trong `prototype/web/src/logic/proto.js`.
- **0.2, `attacks_0_2[]`** (quái thường): đòn đề xuất, cùng dạng `attacks[]`; gộp vào `attacks[]` khi mã 0.2 dùng chúng (quái thường dùng toàn bộ `attacks[]` làm bộ chiêu).
- Boss: `phases[] {id, name, narrative, enter {type, conditions}, moveset[], speed_mult, telegraph_time_mult, the_max}`, `hp_floor`, `finish`. **0.2:** đòn boss mới nằm trong `attacks[]` (ArpgCore kiểm) nhưng chỉ vào trận qua `phases[].moveset_add_0_2[]`; `phases[].transition_set_piece_0_2 {id, label, duration_s, replaces_transition_beat, boss_invulnerable, player_control, camera, camera_skippable, beats[], arena_change}`.
- **0.2, gốc `encounters_0_2 {groups[] {id, zone, members[] {enemy, count}, teaches}}`**: nhóm giao tranh thay `SPAWNS` cứng.
- `khoen` (chỉ trên boss trong danh sách cho phép của validator; cấm ở `ch_phudong`): `binding_item` (= true), `feature_flag`, `socket`, `crack_stages`, `crack_on`, `pry_condition {khoen_cracks_at_least, state}`, `pry_beats` (= `pry.beats`), `on_pry_success {outcome, drops, sets_flag, shard_handling}`, `fallback_when_disabled` (bắt buộc, V9).
- `non_combat_encounters[]` (người bị mê): `combat` = false, `targetable_by_attacks` = false, `interaction`, `hold_s`, `on_success {dispels, grants_skill_points, sets_flag}`.

## `items.json`
- `rarities[] {id, name, order, allowed_in_demo?}`.
- `items[]`: `id`, `category` (`consumable`/`material`/`bao_khi`), `name`, `description`, `label`, `rarity`, `unique?`, `era?`, `source {kind: starting|gather|village_gift|shed_after_pry|remains_after_dissolve|crafted|secret_reward, …}`, `effect`, `effect_text?`, `upgrade_levels?`, `inheritable_via?`, `codex_ref?`. Không có item nào từ khoen. Bảo khí phải được chế từ vật liệu `shed_after_pry` hoặc `remains_after_dissolve`.
- `recipes[]`: `id`, `type` (`craft`/`upgrade`), `station`, `inputs[] {item, count}`, `output {item, count}`, `target?`, `to_level?`, `craft_time_s`.
- `stations[]`: `id`, `name`, `label`, `level`, `npc`.

## `lineage.json`
- `eras[] {id, name, label, sources, chapters[], forbidden_content_tags}`: thời đại; `khoen` trong `forbidden_content_tags` làm validator chặn chữ "khoen"/"collar" trong mọi object có `era` thuộc đời đó hoặc `chapter(s)` thuộc các chương của đời đó, cùng văn bản hiện ra khi bàn giao sang đời đó (Thạp, công cụ, vật kế thừa) (SB-02).
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
`id`, `title`, `label`, `sources[]` (rỗng nếu `SÁNG TẠO`), `research_refs[]`, `text`, `text_extra?` + `text_extra_unlock?` (→ chuỗi bí mật), `hidden_in_eras[]` (bắt buộc chứa mọi đời cấm khoen nếu mục nhắc tới khoen), `verification?`, `review_status`, `notes?`.

## `strings.json`
`ui {key: {vi, en}}`; `dialogue[] {id, speaker, trigger, era, label, form?, text}`.

## Demo 0.3 (`design/DEMO_0_3_DESIGN.md`)
Chỉ thêm khối; ArpgCore không đọc các khối dưới. Validator kiểm cả `controls.json`, `skills.json`, `map.json`.
| File | Khối |
|---|---|
| `combat_tuning.json` | `movement.jump_enabled` = true; `movement.jump {height_m, min_height_m, time_to_apex_s, gravity_mps2, takeoff_speed_mps, fall_gravity_mult, release_cut_ratio, air_control_ratio, coyote_time_s, jump_buffer_s, allowed_from[], iframes=false, air_dodge/guard/heal/skills, airborne_avoids_shapes[], charge_hits_airborne_below_m, air_attacks{…}, landing{…}}`; `dodge_cancel_0_3`, `riposte_0_3`, `drum_burst_cinematic_0_3`, `hud_0_3` (khóa HUD, ngưỡng màu máu), `boss_rules_0_3 {max_feints_per_phase, feint_requires_distinct_audio, min_windup_s_{un,}parryable_in_combo, max_combo_steps}` |
| `controls.json` | `scheme_0_3 {pinned_by[], actions_replace[] (thay cả object cùng id), actions_add[], pad_presets_replace[], kbm_presets[] {overrides{action:[keys]}, set_options?}, key_names_add, browser_unsafe_kbm[], accessibility_add[]}`. Hành động mới có thể có `opens_tab` (→ strings.ui), `pad.modifier` + `pad.follows` (giữ nút bổ trợ + nút của hành động khác), `shares_input_with_hold` (cặp bấm/giữ cùng nút). Validator gộp và kiểm trùng phím, phím cấm |
| `items.json` | `rarities[].color_hex/color_token/corner_notches`; `rarity_rules_0_3 {reserved_hex[], min_hue_distance_deg}`; `gear_0_3 {slots[] {id, accepts: weapon/armor/trinket/bao_khi, unlock}, stat_defs[], armor_formula, pieces[] {id, kind, slot, set?, rarity, era, basis, stats{stat_def: số}, upgrade_category, source {kind, map_ref?}}, sets[] {pieces[], bonuses[] {count, effect, effect_text}}, upgrades {max_plus, costs{category:[{to_plus, inputs[]}]}}, compare_ui}`. Đồ mặc/đeo nằm ngoài `items[]` vì ArpgCore chỉ hiểu category consumable/material/bao_khi |
| `weapons.json` | `air_moves_0_3[]` (input `air,L` / `air,H`, cùng dạng `moves[]`, `plunge`, `shockwave_*`), `drum_burst_0_3 {beat_interval_s, shockwave_per_hit, final_hit, camera_script[]}`, `skills_0_3[]` (→ skills.json) |
| `enemies.json` | quái thường: `drops[].chance` ∈ (0, 1]. Boss: đòn mới trong `attacks[]` (`shape` thêm `ring_wave`, `feint`/`feint_of`, `mud_trail`, `second_pass`), `combos_0_3[] {steps[] {attack, windup_mult, gap_s, riposte_on_perfect_parry?, branch_if_player_behind?}}`, `phases[].moveset_add_0_3[]`, `combos_add_0_3[]`, `phase2_0_3 {speed_mult_0_3, telegraph_time_mult_0_3, removes_from_moveset_0_3[], arena_change_0_3 {stakes_emerge[]}, tusk_lock_0_3}`, `behavior_0_3`, `difficulty_0_3 {preset_id: …}` (đủ 4 mức), `targets_0_3`. Validator: ≤ 1 đòn trễ và ≤ 1 đòn giả mỗi pha; đòn giả khác âm; sàn báo hiệu trong chuỗi; bước chuỗi thuộc bộ chiêu của pha |
| `skills.json` | `rules {slots_per_weapon, max_level, inputs[], currency}`, `currencies[]`, `xp_sources[] {kind, enemy?/chain?/ref?, xp}`, `skills[] {id, weapon, slot, input = skill_<slot>, era?, name, description, label, unlock {kind start/xp}, levels[1..max] {cost_xp (bậc 1 = 0), cooldown_s > 0, effect, effect_text}}` |
| `map.json` | `levels[] {bounds}`, `icons[]`, `zones[] {shapes[] rect/circle}` (tên trùng `secrets.locations`), `paths[]`, `landmarks[] {icon, x, z, world_point? (→ POINTS trong world.js, validator so tọa độ), fast_travel?}`, `discovery_points[]`, `chests[] {contents[]}`, `environment_secrets[] {reward}`, `fog`, `fast_travel`, `world_map`, `minimap`. Điểm `new_in_0_3` phải nằm trong vùng của nó |

## Demo 0.4 combat và thế giới (`design/COMBAT_0_4.md`)
Chỉ thêm khối; ArpgCore không đọc. Validator: `check_demo_0_4`, `check_world_0_4` (test `Combat04`). `world_0_4.json` là file tùy chọn của bundle (`OPTIONAL_FILES`).
| File | Khối |
|---|---|
| `combat_tuning.json` | `input_0_4 {tokens[], direction_threshold_ratio, pause_s, perfect_*_followup_window_s}` (ngữ pháp input của `moves_0_4`); `momentum_0_4` (Đà: `pips`, `gain`, `decay_*`, `spend`); `movement_0_4 {sprint_build, sprint_start_burst, sprint_pivot_skid, slide, landing_roll}`; `dodge_0_4.variants[] {id, when, distance_m, duration_s, iframe_*_s, recovery_s}`; `traversal_0_4 {mantle, ledge_drop, climb, pole_vault, balance, wade}`; `hit_feel_0_4`; `enemy_ai_0_4.archetypes`; `boss_rules_0_4 {min_moves_per_phase, min_new_moves_total, max_unparryable_ratio_per_phase, min_punish_window_s_unparryable, max_delayed_per_phase, max_feints_per_phase}` |
| `weapons.json` | `weapons[].moves_0_4[]`: như `moves[]` + `chain`, `chain_step`, `hits`, `unlock` (`start` hoặc id `skills.move_unlocks_0_4`), `label`, `era?` (rìu: `era_hung_vuong_6`), `da_cost?` (`all`/1..pips), `motion {lunge_m, lunge_start_s, target_react (thêm trip), target_knockback_m, hitbox, trail, hit_stop, anticipation, active, follow_through, ground_impact?}`. `input` là token cách bằng dấu phẩy, kết bằng `L`/`H`/`hold_H`. `chains_0_4[] {id, name, label, inputs, steps[] (id đòn hoặc "pause"), alt_steps?, kind light/light_pause/heavy/mixed/legacy}`: ≥ 3 chuỗi chơi được, có 1 chuỗi nặng, ≥ 2 đòn điều kiện. `skills_0_4[]` → `skills.skills_0_4` |
| `skills.json` | `rules_0_4 {known_per_weapon_max, equipped_slots, swap_where}`; `skills_0_4[]` (như `skills[]`, `slot: any`, `unlock {kind: xp, cost_xp > 0, requires_point? → world_0_4}`); `move_unlocks_0_4[] {id, weapon, name, description, label, moves[], cost_xp, prereqs[]}` (không vòng); `xp_sources_0_4[]` |
| `enemies.json` | Quái thường: `attacks_0_4[]` (như `attacks[]` + `shape` ∈ SHAPES_0_4, `punish_window_s`, `anim {anticipation, active, follow_through}`, `label`), `moveset_0_4[]` (≥ 3, ≤ 1 đòn trễ), `concept_0_4 {archetype, monster_flavor, trick, lore_kind}`, `weak_points_0_4[]` (≥ 1), `behavior_0_4 {enrage, group, environment, camouflage?, crust?}`, `lore_kind`, `description_0_4?`. Boss: `attacks_0_4[]` (≥ 10; đòn không đỡ được có sát thương cần `punish_window_s` ≥ 0,8; `passes`/`pass_windup_s` ≥ sàn), `phases_0_4[] {id, name, narrative, enter, moveset[] (≥ 8, ≤ 60% không đỡ được, ≤ 1 trễ, ≤ 1 giả), combos[], set_piece?}`, `combos_0_4[]` (luật sàn báo hiệu như 0.3), `set_pieces_0_4[]`, `behavior_0_4`, `arena_0_4.hummocks[]` (trong sân), `identity_0_4`, `difficulty_0_4` (đủ 4 mức). Gốc: `enemies_0_4[]` quái thường mới (luật loài/chương, không người, không khoen, `zones` → vùng `world_0_4`) |
| `world_0_4.json` (mới) | `bounds`, `legacy_map`, `spawn`, `regions[] {id, kind zone/corridor, legacy?, shapes[] rect/circle/polygon, height_m, surface, name? (vùng mới bắt buộc)}`, `hub_regions[]`, `blockers[]` (tường lau), `water[]` (`walkable: false` = nước sâu, không bơi), `heightmap {cell_m, noise, features[] hill/ridge/plateau/basin/slope}`, `paths[] {kind main/side/shortcut, points[]}`, `points[] {id, kind, x, z, region, legacy?, name?, requires_traversal?}` (mọi id `POINTS` của `world.js` phải có cùng tọa độ), `landmarks_visual[]`, `spawns[]`, `progression.boss_gates`, `pacing {reference_speed_mps, max_gap_s, near_path_m, interest_kinds}`, `targets {area_ratio_min, area_ratio_max}`. Validator raster 2 m: tỉ lệ diện tích so với vùng legacy, mọi điểm tới được từ `player_start`, đường nằm trên đất đi được, khoảng trống trên đường chính/phụ ≤ `max_gap_s` |
| `map.json` | `map_0_4 {world_ref, level_bounds_0_4, icons_add[], zones[] {region_ref}, landmarks[], discovery_points[], chests[], environment_secrets[], minimap, world_map, fast_travel}`: `world_point` → `world_0_4.points`, tọa độ và vùng phải khớp |
