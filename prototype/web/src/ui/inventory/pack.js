// ui/inventory/pack.js - the Pack screen ("Hành trang", B; DEMO_0_3_DESIGN §3.2): tabs Equipment |
// Items | Skills | Map | Journal | Codex (Q/E or LB/RB). Equipment: slot grid on the left (rarity
// colour + corner notches, +N), items that fit the selected slot, the character in 3D on the right
// (drag to rotate, closer on the Head slot), the stat table below it and a detail panel with the
// compare arrows (better: up arrow, jade; worse: down arrow, ivory underlined, never red-bronze) and
// the upgrade cost. Skills: Thế võ list + detail (rank diamonds per level, cooldown, rank-up with
// Kinh nghiệm) and the old Nghề nhà tree. Journal / Codex keep the old screens' content.
// Mouse, keyboard and pad. The game is paused while the Pack is open.
import { computeStats, compareStats, formatStat, pieceDef, pieceStats } from '../../logic/inventory.js';
import { ITEM_ICONS, SLOT_ICONS, LOCK_ICON, skillEmblem, rankDiamonds } from './icons.js';
import { CharacterPreview } from './preview.js';
import { MapView } from '../map/mapView.js';
import { POINTS } from '../../game/world.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const TABS = ['equipment', 'items', 'skills', 'map', 'journal', 'codex'];
const TAB_KEYS = { equipment: 'tab_equipment', items: 'tab_items', skills: 'tab_skills', map: 'tab_map', journal: 'tab_journal', codex: 'tab_codex' };
const SLOT_GROUPS = [['inv_group_weapons', ['weapon_1', 'weapon_2']], ['inv_group_armor', ['head', 'body', 'hands', 'legs']], ['inv_group_trinkets', ['trinket_1', 'trinket_2', 'bao_khi']]];
const UNLOCK_HINT = { character_weapon_slots_2: 'inv_unlock_weapon_2', flag_villager_saved: 'inv_unlock_trinket_2' };
const REASON_KEYS = { station: 'inv_upgrade_where', materials: 'inv_reason_materials', max: 'inv_upgrade_max', not_upgradeable: 'inv_reason_not_upgradeable', not_owned: 'inv_reason_not_owned' };
const FURNACE_RANGE_M = 6;
const CRAFT = '__craft';

export class Pack {
  constructor(game, ui03) {
    this.g = game; this.u = ui03; this.ui = game.ui; this.p = game.progress;
    this.t = (k, v) => game.i18n.t(k, v); this.loc = (o) => game.i18n.loc(o);
    this.tab = 'equipment'; this.slot = 'body'; this.hover = null; this.filter = 'all'; this.itemSel = null; this.art = null;
    this.el = null; this.preview = null; this.mapView = null; this._nav = { held: false, t: 0 };
  }
  get isOpen() { return !!this.el && this.ui.screen === this.el; }
  get gear() { return this.g.data.items.gear_0_3; }

  // ---------------------------------------------------------------- open / close
  open(tab = 'equipment') {
    const g = this.g;
    if (g.mode === 'playing') { g.mode = 'paused'; g.input.exitLock(); }
    if (this.ui.screen && this.ui.screen !== this.el) this.ui.screen.remove();
    this.tab = TABS.includes(tab) ? tab : 'equipment';
    if (!this.el || !this.isOpen) {
      this.el = document.createElement('div');
      this.el.className = 'screen pack3'; this.el.dataset.screen = 'pack';
      this.ui.root.appendChild(this.el);
      this.ui.screen = this.el; this.ui.screenName = 'pack';
      this.mapView = null;
    }
    this.ui.rerender = () => this.render();
    this.hover = null;
    this.render();
    g.sfx?.ui?.();
  }
  close() { this.g.resume(); }
  switchTab(dir) { const i = TABS.indexOf(this.tab); this.tab = TABS[(i + dir + TABS.length) % TABS.length]; this.hover = null; this.render(); this.g.sfx?.ui?.(); }
  setTab(tab) { if (tab === this.tab) return; this.tab = tab; this.hover = null; this.render(); }

  // ---------------------------------------------------------------- frame shell
  render() {
    if (!this.el) return;
    const t = this.t, p = this.p, g = this.g;
    const cur = g.data.skills.currencies[0];
    const tabs = TABS.map((id) => `<button data-tab="${id}" class="${id === this.tab ? 'on' : ''}">${esc(t(TAB_KEYS[id]))}</button>`).join('');
    const uk = (a) => `<span class="kbd">${esc(this.uiKey(a))}</span>`;
    this.el.innerHTML = `<div class="pk-frame">
      <header class="pk-top">
        <div class="pk-title"><span class="pk-orn"></span><h2>${esc(t('inv_title'))}</h2></div>
        <nav class="pk-tabs">${uk('ui_tab_prev')}${tabs}${uk('ui_tab_next')}</nav>
        <div class="pk-cur"><span class="lbl">${esc(this.loc(cur.name))}</span><b data-xp>${p.xp}</b><span class="sep"></span><span class="lbl">${esc(t('skills_points'))}</span><b>${g.gen.skills.points}</b></div>
      </header>
      <main class="pk-body" data-tab="${this.tab}"></main>
      <footer class="pk-foot">${uk('ui_tab_prev')}${uk('ui_tab_next')} <span>${esc(t('inv_hint_tabs'))}</span>
        <span class="kbd">${esc(this.uiKey('ui_confirm'))}</span> <span>${esc(t('inv_hint_select'))}</span>
        <span class="kbd">${esc(this.closeKey())}</span> <span>${esc(t('inv_hint_close'))}</span>
        <button class="pk-close" data-act="close">${esc(t('btn_close'))}</button></footer>
    </div>`;
    for (const b of this.el.querySelectorAll('[data-tab]')) b.addEventListener('click', () => { this.setTab(b.dataset.tab); this.g.sfx?.ui?.(); });
    this.el.querySelector('[data-act=close]').addEventListener('click', () => this.close());
    this.body = this.el.querySelector('.pk-body');
    ({ equipment: () => this.renderEquipment(), items: () => this.renderItems(), skills: () => this.renderSkills(), map: () => this.renderMap(), journal: () => this.renderJournal(), codex: () => this.renderCodex() })[this.tab]();
    const first = this.body.querySelector('[data-nav].sel, [data-nav]');
    if (first && this.tab !== 'map' && this.g.input.device === 'pad') first.focus({ preventScroll: true });
  }
  /** Label of a ui-context input (Q/E, LB/RB, Enter, A) for the device in use. */
  uiKey(action) {
    const b = this.g.input.bindings, st = this.ui._glyphStyle();
    if (st.device === 'pad') { const i = b.desc.ui.pad[action]?.[0]; if (i != null) return this.ui.inputLabel('pad', i, st.padStyle); }
    return this.ui.inputLabel('kbm', b.desc.ui.kbm[action]?.[0]) || '—';
  }
  closeKey() { const k = this.ui.glyphText('inventory'); return k && k !== '—' ? k : this.uiKey('ui_back'); }

  // ---------------------------------------------------------------- item info
  info(id) {
    if (!id) return null;
    const g = this.g, gear = this.gear;
    const rar = (r) => g.data.items.rarities.find((x) => x.id === r) ?? null;
    const pc = pieceDef(gear, id);
    if (pc) return { id, kind: pc.kind, name: pc.name, desc: pc.description, label: pc.label, rarity: rar(pc.rarity), icon: ITEM_ICONS[id], piece: pc };
    const w = g.data.weapons.weapons.find((x) => x.id === id);
    if (w) return { id, kind: 'weapon', name: w.name, desc: w.description, label: w.label, rarity: null, icon: ITEM_ICONS[id], weapon: w };
    const it = g.data.items.items.find((x) => x.id === id);
    if (it) return { id, kind: it.category, name: it.name, desc: it.description, label: it.label, rarity: rar(it.rarity), icon: ITEM_ICONS[id], item: it, effectText: it.effect_text };
    return null;
  }
  rarityStyle(r) { return r ? `--rc:${r.color_hex}` : '--rc:#9B7A4E'; }
  notches(r) { return Array.from({ length: r?.corner_notches ?? 0 }, (_, i) => `<i class="notch c${i}"></i>`).join(''); }
  atStation() { const pl = this.g.player; return POINTS.some((pt) => pt.kind === 'furnace' && Math.hypot(pt.x - pl.x, pt.z - pl.z) <= FURNACE_RANGE_M); }

  // ---------------------------------------------------------------- Equipment tab
  renderEquipment() {
    const t = this.t, p = this.p;
    const slots = new Map(p.slots().map((s) => [s.def.id, s]));
    if (!slots.get(this.slot)?.unlocked) this.slot = 'body';
    const tile = (id) => {
      const s = slots.get(id), inf = this.info(s.item);
      const locked = !s.unlocked;
      const title = locked ? t(UNLOCK_HINT[s.def.unlock] ?? 'inv_slot_locked') : inf ? this.loc(inf.name) : t('inv_empty_slot');
      return `<button class="pk-slot ${locked ? 'locked' : ''} ${inf ? '' : 'empty'} ${id === this.slot ? 'sel' : ''}" data-slot="${id}" data-nav style="${this.rarityStyle(inf?.rarity)}" title="${esc(title)}">
        <span class="ic">${locked ? LOCK_ICON : inf?.icon ?? SLOT_ICONS[id]}</span>${this.notches(inf?.rarity)}
        ${s.plus ? `<b class="plus">+${s.plus}</b>` : ''}<span class="nm">${esc(this.loc(s.def.name))}</span></button>`;
    };
    const groups = SLOT_GROUPS.map(([k, ids]) => `<div class="pk-group"><h4>${esc(t(k))}</h4><div class="pk-row">${ids.map(tile).join('')}</div></div>`).join('');
    this.body.innerHTML = `<div class="pk-eq">
      <section class="pk-left">${groups}<div class="pk-cands"></div></section>
      <section class="pk-fig"><div class="pk-figbox"><div class="pk-figbg"></div></div><div class="pk-figtip">${esc(t('inv_rotate_character'))}</div><div class="pk-setline"></div><div class="pk-stats"></div></section>
      <section class="pk-detail"></section></div>`;
    if (!this.preview) this.preview = new CharacterPreview();
    this.body.querySelector('.pk-figbox').appendChild(this.preview.canvas);
    this.preview.setFocus(this.slot === 'head' ? 'head' : 'body');
    for (const b of this.body.querySelectorAll('[data-slot]')) {
      b.addEventListener('click', () => { if (b.classList.contains('locked')) { this.u.toast(b.title); return; } this.slot = b.dataset.slot; this.hover = null; this.g.sfx?.ui?.(); this.renderEquipment(); this.body.querySelector(`[data-slot="${this.slot}"]`)?.focus({ preventScroll: true }); });
    }
    this.renderCands(); this.renderStats(); this.renderDetail(); this.renderSetLine();
  }
  renderCands() {
    const t = this.t, p = this.p, box = this.body.querySelector('.pk-cands'); if (!box) return;
    const slotDef = this.gear.slots.find((s) => s.id === this.slot);
    const cands = p.candidates(this.slot);
    const wornHere = p.slots().find((s) => s.def.id === this.slot)?.item ?? null;
    const before = p.getStats();
    const rows = cands.map((id) => {
      const inf = this.info(id);
      let delta = '';
      if (slotDef.accepts === 'armor' || slotDef.accepts === 'trinket') {
        const a = p.previewStats(this.slot, id);
        const rr = compareStats(this.gear, before.stats, a.stats).filter((r) => r.better !== null).slice(0, 2);
        delta = rr.map((r) => `<span class="${r.better ? 'up' : 'dn'}">${r.better ? '▲' : '▼'} ${esc(this.loc(r.def.name))}</span>`).join('');
      }
      const elsewhere = p.equipment.equippedIn(id);
      return `<button class="pk-cand ${id === wornHere ? 'worn' : ''}" data-cand="${id}" data-nav style="${this.rarityStyle(inf.rarity)}">
        <span class="ic">${inf.icon ?? ''}</span><span class="nm">${esc(this.loc(inf.name))}${p.plusOf(id) ? ` <b>+${p.plusOf(id)}</b>` : ''}</span>
        <span class="tag">${id === wornHere ? esc(t('inv_equipped')) : elsewhere ? esc(this.loc(this.gear.slots.find((s) => s.id === elsewhere).name)) : ''}</span><span class="dl">${delta}</span></button>`;
    }).join('');
    const canUnequip = wornHere && slotDef.accepts !== 'weapon';
    box.innerHTML = `<h4>${esc(t('inv_fits_slot', { slot: this.loc(slotDef.name) }))}</h4>
      <div class="pk-candlist">${rows || `<p class="dim">${esc(t('inv_no_candidates'))}</p>`}
      ${canUnequip ? `<button class="pk-cand unequip" data-unequip data-nav><span class="ic">${LOCK_ICON}</span><span class="nm">${esc(t('inv_unequip'))}</span><span class="tag"></span><span class="dl"></span></button>` : ''}</div>`;
    for (const b of box.querySelectorAll('[data-cand]')) {
      const show = () => { if (this.hover !== b.dataset.cand) { this.hover = b.dataset.cand; this.renderDetail(); this.renderStats(); } };
      b.addEventListener('mouseenter', show); b.addEventListener('focus', show);
      b.addEventListener('click', () => this.equip(b.dataset.cand));
    }
    const un = box.querySelector('[data-unequip]');
    if (un) {
      const show = () => { this.hover = '__none'; this.renderDetail(); this.renderStats(); };
      un.addEventListener('mouseenter', show); un.addEventListener('focus', show);
      un.addEventListener('click', () => this.unequip());
    }
    box.addEventListener('mouseleave', () => { if (this.hover) { this.hover = null; this.renderDetail(); this.renderStats(); } });
  }
  equip(id) {
    const r = this.p.equip(this.slot, id);
    if (!r.ok && r.reason !== 'fixed') { this.u.toast(this.t(`inv_reason_${r.reason}`)); return; }
    if (r.ok) { this.g.sfx?.ui?.(); this.u.toast(this.t('msg_gear_equipped', { name: this.loc(this.info(id).name) }), 2); }
    this.hover = null; this.renderEquipment();
    this.body.querySelector(`[data-cand="${id}"]`)?.focus({ preventScroll: true });
  }
  unequip() {
    const r = this.p.unequip(this.slot);
    if (!r.ok) { this.u.toast(this.t(`inv_reason_${r.reason}`)); return; }
    this.g.sfx?.ui?.(); this.hover = null; this.renderEquipment();
  }
  /** Stats shown under the character; with a hovered candidate, its effect with arrows. */
  renderStats() {
    const box = this.body?.querySelector('.pk-stats'); if (!box) return;
    const p = this.p, t = this.t, before = p.getStats();
    const after = this.hover ? (this.hover === '__none' ? p.previewStats(this.slot, null) : this.canPreview(this.hover) ? p.previewStats(this.slot, this.hover) : before) : before;
    const defs = new Map(this.gear.stat_defs.map((s) => [s.id, s]));
    const row = (label, a, b, fmt, higherBetter = true) => {
      const d = b - a, better = Math.abs(d) < 1e-9 ? null : (d > 0) === higherBetter;
      const arrow = better === null ? '' : `<span class="cmp ${better ? 'up' : 'dn'}" title="${esc(t(better ? 'cmp_better' : 'cmp_worse'))}">${better ? '▲' : '▼'}</span>`;
      return `<div class="pk-st"><span class="k">${esc(label)}</span><span class="v ${better === null ? '' : better ? 'up' : 'dn'}">${esc(fmt(b))}${arrow}</span></div>`;
    };
    const int = (v) => String(Math.round(v)), pct = (v) => `${Math.round(v * 100)}%`;
    let html = row(t('hud_health'), before.hpMax, after.hpMax, int) + row(t('hud_the'), before.theMax, after.theMax, int)
      + row(this.loc(defs.get('armor').name), before.armor, after.armor, int) + row(t('inv_damage_reduction'), before.damageReduction, after.damageReduction, pct);
    for (const s of this.gear.stat_defs) {
      if (['armor', 'hp_max_add', 'the_max_add'].includes(s.id)) continue;
      const a = before.stats[s.id], b = after.stats[s.id], neutral = s.format === 'percent_delta' ? 1 : 0;
      if (Math.abs(a - neutral) < 1e-9 && Math.abs(b - neutral) < 1e-9) continue;
      html += row(this.loc(s.name), a, b, (v) => formatStat(s, v), s.higher_is_better);
    }
    box.innerHTML = `<h4>${esc(t('inv_stats'))}</h4><div class="pk-stgrid">${html}</div>`;
  }
  canPreview(id) { const s = this.gear.slots.find((x) => x.id === this.slot); return s && (s.accepts === 'armor' || s.accepts === 'trinket') && this.p.canEquip(this.slot, id).ok; }
  renderSetLine() {
    const box = this.body?.querySelector('.pk-setline'); if (!box) return;
    box.innerHTML = this.p.setProgress().map((sp) => `<div class="pk-set"><b>${esc(this.t('inv_set_progress', { name: this.loc(sp.set.name), n: sp.count, max: sp.max }))}</b>
      ${sp.bonuses.map((b) => `<span class="${b.active ? 'on' : ''}" title="${esc(this.loc(b.effect_text))}"><i></i>${b.count}</span>`).join('')}</div>`).join('');
  }

  /** Detail panel: the hovered candidate (with comparison) or the item in the selected slot. */
  renderDetail() {
    const box = this.body?.querySelector('.pk-detail'); if (!box) return;
    const t = this.t, p = this.p;
    const wornHere = p.slots().find((s) => s.def.id === this.slot)?.item ?? null;
    const id = this.hover && this.hover !== '__none' ? this.hover : wornHere;
    const inf = this.info(id);
    const slotDef = this.gear.slots.find((s) => s.id === this.slot);
    if (!inf) { box.innerHTML = `<div class="pk-dhead" style="--rc:#9B7A4E"><h3>${esc(this.loc(slotDef.name))}</h3><p class="dim">${esc(t('inv_empty_slot'))}</p></div>`; return; }
    const plus = p.plusOf(id);
    const kindName = { armor: this.loc(slotDef.name), trinket: t('inv_group_trinkets'), weapon: t('inv_group_weapons'), bao_khi: t('inv_filter_bao_khi') }[inf.kind] ?? '';
    let html = `<div class="pk-dhead" style="${this.rarityStyle(inf.rarity)}">
      <div class="pk-dicon">${inf.icon ?? ''}${this.notches(inf.rarity)}</div>
      <div><h3>${esc(this.loc(inf.name))}${plus ? ` <b class="plus">+${plus}</b>` : ''}</h3>
      <p class="pk-dsub">${esc(kindName)}${inf.rarity ? ` · <span class="rar">${esc(t('inv_rarity', { name: this.loc(inf.rarity.name) }))}</span>` : ''}</p>${inf.label ? this.ui.labelBadge(inf.label) : ''}</div></div>`;
    // Stats / comparison.
    if (inf.piece) {
      const compare = this.hover && this.hover !== wornHere && this.canPreview(id);
      if (compare) {
        const rows = compareStats(this.gear, p.getStats().stats, p.previewStats(this.slot, id).stats);
        html += `<div class="pk-cmp"><h4>${esc(t('inv_compare_with', { name: wornHere ? this.loc(this.info(wornHere).name) : t('inv_empty_slot') }))}</h4>${rows.map((r) => this.cmpRow(r)).join('')}</div>`;
      } else {
        const st = pieceStats(this.gear, inf.piece, plus);
        html += `<div class="pk-cmp">${Object.entries(st).map(([k, v]) => { const d = this.gear.stat_defs.find((s) => s.id === k); return `<div class="pk-row2"><span>${esc(this.loc(d.name))}</span><b>${esc(formatStat(d, v))}</b></div>`; }).join('')}</div>`;
      }
    } else if (inf.weapon) {
      const ws = p.weaponStatsOf(id);
      html += `<div class="pk-cmp">${Object.entries(ws).map(([k, v]) => { const d = this.gear.stat_defs.find((s) => s.id === k); return `<div class="pk-row2"><span>${esc(this.loc(d.name))}</span><b>${esc(formatStat(d, v))}</b></div>`; }).join('')}</div>`;
      const arts = p.skillsFor(id).map((s) => `<li>${esc(this.loc(s.name))} ${rankDiamonds(p.getSkillLevel(s.id), this.g.data.skills.rules.max_level)}</li>`).join('');
      if (arts) html += `<h4>${esc(t('skill_arts_title'))}</h4><ul class="pk-arts">${arts}</ul>`;
    } else if (inf.effectText) {
      const lvl = this.g.gen.owned[id]?.level;
      html += `<p class="pk-eff">${esc(this.loc(inf.effectText))}</p>${lvl ? `<p class="dim">${esc(t('inv_upgrade_level', { n: lvl - 1 }))} · ${esc(t('inv_upgrade_where'))}</p>` : ''}`;
    }
    html += `<p class="pk-desc">${esc(this.loc(inf.desc))}</p>`;
    // Set membership.
    if (inf.piece?.set) {
      const sp = p.setProgress().find((x) => x.set.id === inf.piece.set);
      html += `<div class="pk-setd"><h4>${esc(t('inv_set_progress', { name: this.loc(sp.set.name), n: sp.count, max: sp.max }))}</h4>
        ${sp.bonuses.map((b) => `<p class="${b.active ? 'on' : 'off'}"><i></i><b>${b.count}</b> ${b.name ? `<em>${esc(this.loc(b.name))}</em> ` : ''}${esc(this.loc(b.effect_text))} <span class="dim">· ${esc(t(b.active ? 'inv_set_bonus_active' : 'inv_set_bonus_inactive'))}</span></p>`).join('')}</div>`;
    }
    // Actions: equip / unequip, upgrade.
    const actions = [];
    if (inf.piece && this.hover && this.hover !== wornHere && this.canPreview(id)) actions.push(`<button class="primary" data-act="equip">${esc(t('inv_equip'))}</button>`);
    if (p.upgradeCategory(id)) {
      const up = p.upgradeInfo(id, { atStation: this.atStation() });
      const names = (up.inputs ?? []).map((c) => { const have = up.have?.[c.item] ?? this.g.inv.count(c.item); return `<span class="${have >= c.count ? 'ok' : 'short'}">${esc(this.loc(this.info(c.item)?.name))} ${have}/${c.count}</span>`; }).join('');
      const nextLine = up.reason === 'max' ? `<p class="dim">${esc(t('inv_upgrade_max'))}</p>` : `<p class="pk-upto"><b>+${up.plus}</b> → <b>+${up.toPlus}</b> ${this.upgradePreview(inf, up.toPlus)}</p><p class="pk-cost">${esc(t('inv_upgrade_cost', { list: '' }))}${names}</p>`;
      html += `<div class="pk-up"><h4>${esc(t('inv_upgrade'))}</h4>${nextLine}${up.ok || up.reason === 'max' ? '' : `<p class="dim small">${esc(t(REASON_KEYS[up.reason] ?? 'inv_upgrade_where'))}</p>`}</div>`;
      if (up.reason !== 'max') actions.push(`<button data-act="upgrade" ${up.ok ? '' : 'disabled'}>${esc(t('inv_upgrade'))}</button>`);
    }
    if (actions.length) html += `<div class="pk-actions">${actions.join('')}</div>`;
    box.innerHTML = html;
    box.querySelector('[data-act=equip]')?.addEventListener('click', () => this.equip(id));
    box.querySelector('[data-act=upgrade]')?.addEventListener('click', () => {
      const r = p.upgrade(id, { atStation: this.atStation() });
      if (r.ok) { this.g.sfx?.pickup?.(); this.u.toast(t('msg_upgraded', { name: this.loc(inf.name), n: r.plus }), 3); }
      this.renderEquipment();
    });
  }
  cmpRow(r) {
    const t = this.t, better = r.better;
    const arrow = better === null ? '' : `<span class="cmp ${better ? 'up' : 'dn'}">${better ? '▲' : '▼'}</span>`;
    return `<div class="pk-row2 ${better === null ? '' : better ? 'up' : 'dn'}" title="${esc(t(better === null ? 'cmp_same' : better ? 'cmp_better' : 'cmp_worse'))}"><span>${esc(this.loc(r.def.name))}</span><span class="was">${esc(formatStat(r.def, r.before))}</span><b>${esc(formatStat(r.def, r.after))}</b>${arrow}</div>`;
  }
  upgradePreview(inf, toPlus) {
    if (inf.piece) {
      const a = pieceStats(this.gear, inf.piece, toPlus - 1), b = pieceStats(this.gear, inf.piece, toPlus);
      return Object.keys(b).filter((k) => Math.abs(a[k] - b[k]) > 1e-9).map((k) => { const d = this.gear.stat_defs.find((s) => s.id === k); return `<span class="up">${esc(this.loc(d.name))} ${esc(formatStat(d, b[k]))} ▲</span>`; }).join(' ');
    }
    if (inf.weapon) { const s = computeStats(this.gear, { weaponPlus: toPlus }).stats; const d = this.gear.stat_defs.find((x) => x.id === 'weapon_damage_mult'); return `<span class="up">${esc(this.loc(d.name))} ${esc(formatStat(d, s.weapon_damage_mult))} ▲</span>`; }
    return '';
  }

  // ---------------------------------------------------------------- Items tab
  renderItems() {
    const t = this.t, p = this.p, bag = p.bag;
    const filters = [['all', 'inv_filter_all'], ['consumable', 'inv_filter_consumable'], ['material', 'inv_filter_material'], ['bao_khi', 'inv_filter_bao_khi'], ['gear', 'tab_equipment']];
    const stacks = this.filter === 'gear' ? [] : bag.list(this.filter === 'bao_khi' ? 'bao_khi' : this.filter);
    const baoKhi = this.filter === 'all' || this.filter === 'bao_khi' ? Object.keys(this.g.gen.owned) : [];
    const loose = this.filter === 'all' || this.filter === 'gear' ? p.equipment.loose() : [];
    const cells = [...stacks.map((s) => ({ id: s.id, n: s.count })), ...baoKhi.map((id) => ({ id, n: 0 })), ...loose.map((id) => ({ id, n: 0 }))];
    if (!this.itemSel || !cells.some((c) => c.id === this.itemSel)) this.itemSel = cells[0]?.id ?? null;
    const grid = cells.map((c) => { const inf = this.info(c.id); return `<button class="pk-cell ${c.id === this.itemSel ? 'sel' : ''}" data-item="${c.id}" data-nav style="${this.rarityStyle(inf?.rarity)}" title="${esc(this.loc(inf?.name))}">
      <span class="ic">${inf?.icon ?? ''}</span>${this.notches(inf?.rarity)}${c.n ? `<b class="n">${c.n}</b>` : ''}</button>`; }).join('');
    this.body.innerHTML = `<div class="pk-items">
      <section class="pk-ileft"><div class="pk-chips">${filters.map(([id, k]) => `<button data-filter="${id}" data-nav class="${id === this.filter ? 'on' : ''}">${esc(t(k))}</button>`).join('')}</div>
        <div class="pk-grid">${grid || `<p class="dim">${esc(t('inv_bag_empty'))}</p>`}</div>
        <p class="dim small">${esc(t('inv_bag_capacity', { n: p.equipment.loose().length, max: p.equipment.capacity }))}</p></section>
      <section class="pk-detail pk-idetail"></section></div>`;
    for (const b of this.body.querySelectorAll('[data-filter]')) b.addEventListener('click', () => { this.filter = b.dataset.filter; this.renderItems(); this.body.querySelector(`[data-filter="${this.filter}"]`)?.focus({ preventScroll: true }); });
    for (const b of this.body.querySelectorAll('[data-item]')) {
      const sel = () => { if (this.itemSel !== b.dataset.item) { this.itemSel = b.dataset.item; for (const x of this.body.querySelectorAll('[data-item]')) x.classList.toggle('sel', x === b); this.renderItemDetail(); } };
      b.addEventListener('mouseenter', sel); b.addEventListener('focus', sel); b.addEventListener('click', sel);
    }
    this.renderItemDetail();
  }
  renderItemDetail() {
    const box = this.body.querySelector('.pk-idetail'); if (!box) return;
    const inf = this.info(this.itemSel), t = this.t;
    if (!inf) { box.innerHTML = ''; return; }
    const n = inf.item ? this.p.count(inf.id) : 0;
    const catKey = { consumable: 'inv_filter_consumable', material: 'inv_filter_material', bao_khi: 'inv_filter_bao_khi', armor: 'tab_equipment', trinket: 'inv_group_trinkets' }[inf.kind];
    let html = `<div class="pk-dhead" style="${this.rarityStyle(inf.rarity)}"><div class="pk-dicon">${inf.icon ?? ''}${this.notches(inf.rarity)}</div>
      <div><h3>${esc(this.loc(inf.name))}</h3><p class="pk-dsub">${esc(t(catKey))}${inf.rarity ? ` · <span class="rar">${esc(t('inv_rarity', { name: this.loc(inf.rarity.name) }))}</span>` : ''}</p>${inf.label ? this.ui.labelBadge(inf.label) : ''}</div></div>`;
    if (n) html += `<p class="pk-count">${esc(t('inv_count', { n, max: this.p.bag.stackMax(inf.id) }))}</p>`;
    if (inf.effectText) html += `<p class="pk-eff">${esc(this.loc(inf.effectText))}</p>`;
    if (inf.piece) html += `<div class="pk-cmp">${Object.entries(pieceStats(this.gear, inf.piece, this.p.plusOf(inf.id))).map(([k, v]) => { const d = this.gear.stat_defs.find((s) => s.id === k); return `<div class="pk-row2"><span>${esc(this.loc(d.name))}</span><b>${esc(formatStat(d, v))}</b></div>`; }).join('')}</div>`;
    html += `<p class="pk-desc">${esc(this.loc(inf.desc))}</p>`;
    if (inf.piece) html += `<div class="pk-actions"><button class="primary" data-act="toequip">${esc(t('inv_equip'))}</button></div>`;
    box.innerHTML = html;
    box.querySelector('[data-act=toequip]')?.addEventListener('click', () => {
      const slot = inf.kind === 'armor' ? inf.piece.slot : (this.p.slots().find((s) => s.def.accepts === 'trinket' && s.unlocked && !s.item)?.def.id ?? 'trinket_1');
      this.slot = slot; this.hover = inf.id; this.tab = 'equipment'; this.render();
      this.body.querySelector(`[data-cand="${inf.id}"]`)?.focus({ preventScroll: true });
    });
  }

  // ---------------------------------------------------------------- Skills tab
  renderSkills() {
    const t = this.t, p = this.p, max = this.g.data.skills.rules.max_level;
    const ws = p.weapons();
    if (!this.art || (this.art !== CRAFT && !ws.includes(p.skillDef(this.art)?.weapon))) this.art = p.skillsFor(ws[0])[0]?.id ?? CRAFT;
    const list = ws.map((w) => {
      const wd = p.weaponDef(w);
      return `<h4>${esc(this.loc(wd.name))}</h4>${p.skillsFor(w).map((s) => {
        const lv = p.getSkillLevel(s.id);
        return `<button class="pk-art ${s.id === this.art ? 'sel' : ''} ${lv ? '' : 'locked'}" data-art="${s.id}" data-nav><span class="em">${skillEmblem(s.id)}</span><span class="nm">${esc(this.loc(s.name))}</span>${lv ? rankDiamonds(lv, max) : `<span class="tag">${esc(t('skill_locked'))}</span>`}</button>`;
      }).join('')}`;
    }).join('');
    const craft = `<h4>${esc(t('skills_title'))}</h4><button class="pk-art ${this.art === CRAFT ? 'sel' : ''}" data-art="${CRAFT}" data-nav><span class="em">${skillEmblem('')}</span><span class="nm">${esc(t('skills_title'))}</span><span class="tag">${esc(t('skills_points'))}: ${this.g.gen.skills.points}</span></button>`;
    this.body.innerHTML = `<div class="pk-skills"><section class="pk-sklist"><h3>${esc(t('skill_arts_title'))}</h3>${list}${craft}</section><section class="pk-skmain"></section></div>`;
    for (const b of this.body.querySelectorAll('[data-art]')) {
      const sel = () => { if (this.art !== b.dataset.art) { this.art = b.dataset.art; for (const x of this.body.querySelectorAll('[data-art]')) x.classList.toggle('sel', x === b); this.renderSkillDetail(); } };
      b.addEventListener('click', sel); b.addEventListener('focus', sel);
    }
    this.renderSkillDetail();
  }
  renderSkillDetail() {
    const box = this.body.querySelector('.pk-skmain'); if (!box) return;
    const t = this.t, p = this.p, g = this.g;
    if (this.art === CRAFT) {
      box.innerHTML = `<div class="pk-craft">${this.ui.skillsHtml()}</div>`;
      this.ui._bind('[data-skill]', (e, b) => { if (g.buySkill(b.dataset.skill)) this.renderSkills(); });
      return;
    }
    const def = p.skillDef(this.art), info = p.getSkillInfo(this.art), max = info.maxLevel, lv = info.level;
    const input = this.ui.glyphText(def.input);
    const ranks = def.levels.map((L) => `<div class="pk-rank ${L.level === lv ? 'cur' : L.level < lv ? 'done' : 'todo'}">
      ${rankDiamonds(L.level, max)}<div><b>${esc(t('skill_rank', { n: L.level, max }))}</b> <span class="dim">· ${esc(t('skill_cooldown', { s: L.cooldown_s }))}</span><p>${esc(this.loc(L.effect_text))}</p></div></div>`).join('');
    const can = p.canRankUp(this.art);
    const cost = info.nextCost;
    const next = lv < max ? def.levels[lv] ?? def.levels[0] : null;
    const reasonKey = { xp: 'skill_not_enough_xp', weapon: 'skill_weapon_missing', max: 'skill_max' }[can.reason];
    const nearFire = POINTS.some((pt) => pt.kind === 'rest' && Math.hypot(pt.x - g.player.x, pt.z - g.player.z) <= 4);
    box.innerHTML = `<div class="pk-skgrid">
      <div class="pk-skcard">
        <div class="pk-skhead"><div class="pk-big"><b>${lv}</b><small>${esc(t('skill_rank_word'))}</small></div>
          <div class="pk-skt"><h3>${esc(this.loc(def.name))}</h3><p class="dim">${esc(t('skill_input'))}: <span class="kbd">${esc(input)}</span> · ${lv ? esc(t('skill_cooldown', { s: +info.cooldownS.toFixed(1) })) : esc(t('skill_locked'))}</p></div>
          <span class="pk-skem">${skillEmblem(def.id)}</span></div>
        <p class="pk-desc">${esc(this.loc(def.description))}</p>
        <div class="pk-ranks">${ranks}</div>
      </div>
      <div class="pk-skcard pk-sknext">
        <h4>${esc(t(lv === 0 ? 'skill_unlock' : 'skill_next_rank'))}</h4>
        ${next ? `<div class="pk-skhead"><div class="pk-big"><b>${lv + 1}</b><small>${esc(t('skill_rank_word'))}</small></div><p>${esc(this.loc(next.effect_text))}</p></div>
          <p class="pk-cost">${esc(t('skill_cost_xp', { n: cost }))} · <span class="${p.xp >= cost ? 'ok' : 'short'}">${esc(this.loc(g.data.skills.currencies[0].name))} ${p.xp}/${cost}</span></p>
          <button class="primary" data-act="rankup" ${can.ok ? '' : 'disabled'}>${esc(t(lv === 0 ? 'skill_unlock' : 'skill_rank_up'))}</button>
          ${can.ok ? '' : `<p class="dim small">${esc(t(reasonKey ?? 'skill_not_enough_xp', { name: this.loc(p.weaponDef(def.weapon)?.name) }))}</p>`}`
        : `<p class="dim">${esc(t('skill_max'))}</p>`}
        <div class="pk-respec"><button data-act="respec" ${nearFire && p.xpSpent > 0 ? '' : 'disabled'}>${esc(t('skill_respec'))}</button>${nearFire ? '' : `<p class="dim small">${esc(t('skill_respec_where'))}</p>`}</div>
      </div></div>`;
    box.querySelector('[data-act=rankup]')?.addEventListener('click', () => {
      const r = p.rankUp(this.art);
      if (r.ok) { g.sfx?.drum?.(false); this.u.toast(t('msg_skill_ranked', { name: this.loc(def.name), n: r.level }), 3); }
      this.render();
    });
    box.querySelector('[data-act=respec]')?.addEventListener('click', () => { const n = p.respec(); this.u.toast(t('skill_respec_done', { n }), 3); this.render(); });
  }

  // ---------------------------------------------------------------- Map / Journal / Codex tabs
  renderMap() {
    if (!this.mapView) { this.mapView = new MapView(this.g, this.u.explore, this.body); this.mapView.center(); }
    else { this.body.appendChild(this.mapView.el); this.mapView.renderSide(); this.mapView.renderLegend(); }
  }
  renderJournal() { this.body.innerHTML = `<div class="pk-text">${this.ui.journalHtml()}</div>`; }
  renderCodex() {
    this.body.innerHTML = `<div class="pk-text pk-codex">${this.ui.codexHtml()}</div>`;
    for (const b of this.body.querySelectorAll('[data-cx]')) { b.setAttribute('data-nav', ''); b.addEventListener('click', () => { this.ui.codexSel = b.dataset.cx; this.renderCodex(); this.body.querySelector(`[data-cx="${b.dataset.cx}"]`)?.focus({ preventScroll: true }); }); }
  }

  // ---------------------------------------------------------------- per frame while open
  tick(dt) {
    if (!this.isOpen) return;
    if (this.tab === 'equipment' && this.preview) {
      const g = this.g, pl = g.player;
      this.preview.setModel(g.gen.character, pl.weaponId ?? g.gen.weapons[pl.slot ?? 0], this.p.equipment.worn());
      this.preview.render(dt);
    }
    if (this.tab === 'map' && this.mapView) this.mapView.tick(dt);
    const xp = this.el.querySelector('[data-xp]'); if (xp && xp.textContent !== String(this.p.xp)) xp.textContent = String(this.p.xp);
  }

  /** Keyboard / pad. Returns true when the Pack consumed the frame's input. */
  nav(input, dt) {
    if (!this.isOpen) return false;
    const tabFor = { inventory: null, map: 'map', journal: 'journal', skills: 'skills', codex: 'codex' };
    if (input.ui('ui_back') || input.pressed('menu')) { this.close(); return true; }
    if (input.pressed('inventory') || this.u.consumeFallback('inventory')) { this.close(); return true; }
    for (const [a, tab] of Object.entries(tabFor)) {
      if (!tab) continue;
      if (input.pressed(a) || this.u.consumeFallback(a)) { if (this.tab === tab) this.close(); else this.setTab(tab); return true; }
    }
    if (input.ui('ui_tab_prev')) { this.switchTab(-1); return true; }
    if (input.ui('ui_tab_next')) { this.switchTab(1); return true; }
    if (this.tab === 'map' && this.mapView && this.mapView.nav(input, dt)) return true;
    // Spatial focus with WASD / arrows / D-pad / left stick (edge + repeat).
    const pads = input.pads ?? new Set(), ax = input.padAxes ?? [0, 0];
    let dx = 0, dy = 0;
    if (input.pressed('move_left') || input.pressed('camera_left')) dx = -1;
    if (input.pressed('move_right') || input.pressed('camera_right')) dx = 1;
    if (input.pressed('move_up') || input.pressed('camera_up')) dy = -1;
    if (input.pressed('move_down') || input.pressed('camera_down')) dy = 1;
    const padDir = [pads.has(14) || ax[0] < -0.6 ? -1 : pads.has(15) || ax[0] > 0.6 ? 1 : 0, pads.has(12) || ax[1] < -0.6 ? -1 : pads.has(13) || ax[1] > 0.6 ? 1 : 0];
    if (padDir[0] || padDir[1]) {
      this._nav.t -= dt;
      if (!this._nav.held || this._nav.t <= 0) { dx = dx || padDir[0]; dy = dy || padDir[1]; this._nav.t = this._nav.held ? 0.12 : 0.35; }
      this._nav.held = true;
    } else this._nav.held = false;
    if (this.tab === 'equipment' && this.preview && (pads.has(6) || pads.has(7))) this.preview.rotate((pads.has(7) ? 1 : -1) * dt * 2.5);
    if (dx || dy) this.moveFocus(dx, dy);
    if (input.ui('ui_confirm') && input.device === 'pad') { const a = document.activeElement; if (a && this.el.contains(a)) a.click(); }
    return true;
  }
  moveFocus(dx, dy) {
    const items = [...this.body.querySelectorAll('[data-nav]')].filter((e) => !e.disabled && e.offsetParent !== null);
    if (!items.length) return;
    const cur = document.activeElement && items.includes(document.activeElement) ? document.activeElement : null;
    if (!cur) { (this.body.querySelector('[data-nav].sel') ?? items[0]).focus({ preventScroll: false }); return; }
    const r0 = cur.getBoundingClientRect(), c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
    let best = null, bs = Infinity;
    for (const e of items) {
      if (e === cur) continue;
      const r = e.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2];
      const along = (c[0] - c0[0]) * dx + (c[1] - c0[1]) * dy;
      if (along <= 4) continue;
      const across = Math.abs((c[0] - c0[0]) * dy) + Math.abs((c[1] - c0[1]) * dx);
      const score = along + across * 2.2;
      if (score < bs) { bs = score; best = e; }
    }
    if (best) { best.focus({ preventScroll: false }); this.g.sfx?.ui?.(); }
  }

  /** Debug / smoke read-out. */
  debugState() {
    return { open: this.isOpen, tab: this.tab, slot: this.slot, hover: this.hover, art: this.art, stats: this.p.getStats(), map: this.mapView?.debugState() ?? null, preview: !!this.preview?.ok };
  }
}
