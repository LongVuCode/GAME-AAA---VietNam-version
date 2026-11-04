// Every UI string key referenced by the prototype source exists in strings.json with vi + en, and
// everything shown in Bương's era (Hùng Vương 6) passes that era's forbidden-word rule (SB-02, SB11-01).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA } from '../src/data.js';
import { forbiddenHits, eraTags } from '../src/logic/lineage.js';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = (d) => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? files(join(d, f)) : f.endsWith('.js') ? [join(d, f)] : []));
const ui = DATA.strings.ui;

function referencedKeys() {
  const keys = new Set();
  for (const f of files(src)) {
    const s = readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\b(?:t|T|i18n\.t|this\.t)\('([a-z0-9_]+)'/g)) keys.add(m[1]);
    for (const m of s.matchAll(/data-t="([a-z0-9_]+)"/g)) keys.add(m[1]);
    for (const m of s.matchAll(/'((?:ctl|tut|fb|legend|obj|prompt|msg|set|pry|hint|craft|codex_label|speaker|key)_[a-z0-9_]+)'/g)) keys.add(m[1]);
  }
  // Keys built at run time: split axis action names (act_*), option values (opt_val_*), remap messages.
  for (const id of ['move_up', 'move_left', 'move_down', 'move_right', 'camera_left', 'camera_right', 'camera_up', 'camera_down', 'lock_prev', 'lock_next']) keys.add(`act_${id}`);
  for (const o of DATA.controls.accessibility_options) for (const v of [...(o.values ?? [])]) if (!['s', 'm', 'l', 'xl'].includes(v)) keys.add(`opt_val_${v}`);
  for (const k of ['remap_press', 'remap_press_pad', 'remap_reserved', 'remap_fixed', 'remap_conflict', 'remap_done', 'tut2_move', 'tut2_parry', 'tut2_unparryable', 'tut2_lock', 'tut2_drum', 'prompt_call_name_press']) keys.add(k);
  // dynamic keys
  for (const id of ['npc_tho_duc_lang', 'npc_nguoi_gia_ben', 'narration_ve']) keys.add(`speaker_${id}`);
  keys.add(DATA.codex.fixed_notice);
  return [...keys].filter((k) => !['pry_beat', 'pry_release', 'pry_beat_window_add_s', 'hint_npc'].includes(k));
}

test('all referenced UI keys exist with non-empty vi and en', () => {
  const missing = referencedKeys().filter((k) => !ui[k] || !ui[k].vi || !ui[k].en);
  assert.deepEqual(missing, []);
});

test('no hard-coded Vietnamese display text in game source (strings go through strings.json)', () => {
  const vnChars = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  for (const f of files(join(src, 'game'))) {
    const lines = readFileSync(f, 'utf8').split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.includes('/*'));
    // Content-label enum values (data ids such as 'SÁNG TẠO') are not display text.
    const labels = /'(SỬ LIỆU-TRANH LUẬN|SỬ LIỆU|HUYỀN THOẠI|CỔ TÍCH|SÁNG TẠO)'/g;
    const bad = lines.filter((l) => vnChars.test(l.replace(/\/\/.*$/, '').replace(labels, '')));
    assert.deepEqual(bad, [], f);
  }
});

test("everything shown in Bương's era passes the era's forbidden-word rule", () => {
  const tags = eraTags(DATA.lineage, 'era_hung_vuong_6');
  assert.ok(tags.includes('khoen'));
  const L = DATA.lineage;
  const shown = [];
  // handoff steps + their dialogue lines
  for (const st of L.handoff.steps) {
    if (st.text) shown.push(st.text);
    if (st.line_ref) shown.push(DATA.strings.dialogue.find((d) => d.id === st.line_ref).text);
  }
  shown.push(L.thap.name, L.thap.description);
  for (const t of L.tools) shown.push(t.name, t.description);
  for (const n of L.skill_tree.nodes) shown.push(n.name, n.description);
  for (const b of L.skill_tree.branches) shown.push(b.name);
  for (const h of L.house_moves) shown.push(h.name, h.description);
  for (const c of L.characters.filter((x) => x.id === 'chr_buong')) shown.push(c.name, c.description);
  for (const w of DATA.weapons.weapons) shown.push(w.name, w.description, w.drum_burst.name, w.drum_burst.description, ...w.moves.map((m) => m.name));
  for (const it of DATA.items.items.filter((i) => i.inheritable_via || i.category === 'consumable')) shown.push(it.name, it.description, it.effect_text);
  shown.push(DATA.enemies.enemies.find((e) => e.id === 'en_cua_cang_bun').name);
  // UI keys used in the Bương flow (HUD, practice, handoff cards, end screen, menus)
  const buongUi = ['obj_practice', 'obj_end', 'msg_practice_done', 'msg_swap', 'prompt_continue', 'prompt_open_thap', 'prompt_swap_weapon',
    'handoff_receive_tool', 'handoff_skills', 'handoff_slot2', 'handoff_gen_label', 'thap_empty', 'demo_end', 'demo_replay_memory',
    'btn_to_title', 'btn_feedback', 'hud_health', 'hud_the', 'hud_drum', 'hud_drum_ready', 'hud_heal_charges', 'skills_title', 'skills_points',
    'zone_bai_song', 'speaker_npc_nguoi_gia_ben', 'speaker_narration_ve', 'msg_enemy_fled', 'msg_skill_points', 'prompt_finish_normal',
    'msg_guard_break', 'msg_perfect_parry', 'msg_parry', 'msg_perfect_dodge', 'msg_heal_none', 'msg_respawn', 'you_fell'];
  for (const k of buongUi) shown.push(ui[k]);
  const bad = shown.map((o) => [o, forbiddenHits(o, tags)]).filter(([, h]) => h.length);
  assert.deepEqual(bad, []);
});

test('the after-pry verse is only allowed outside Hùng 6; the floor verse is used for Bương', () => {
  const ve = DATA.strings.dialogue.find((d) => d.id === 'dlg_04_ve_after_pry');
  assert.ok(!ve.allowed_eras.includes('era_hung_vuong_6'));
  const floor = DATA.strings.dialogue.find((d) => d.id === 'dlg_06_ve_floor');
  assert.equal(floor.era, 'era_hung_vuong_6');
  assert.deepEqual(forbiddenHits(floor.text, eraTags(DATA.lineage, 'era_hung_vuong_6')), []);
});

test('codex: no entry that uses Hùng 6 forbidden words can unlock in Hùng 6 (game rule mirrors SB11-17)', () => {
  const tags = eraTags(DATA.lineage, 'era_hung_vuong_6');
  const kh = DATA.codex.entries.find((e) => e.id === 'cx_khoen');
  assert.ok(forbiddenHits([kh.title, kh.text], tags).length > 0, 'cx_khoen would be refused in Hùng 6');
});
