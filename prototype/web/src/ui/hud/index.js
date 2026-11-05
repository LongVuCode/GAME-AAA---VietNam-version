// ui/hud - Demo 0.3 combat HUD (DOM + CSS + one small canvas for the drum face).
//
//   const hud = createHud(root, data, controls, i18n);
//   hud.update(state, realDt);          // every playing frame (real time; nothing redraws if unchanged)
//   hud.applySettings(acc);             // acc_reduce_flash, acc_hud_minimal, acc_hud_scale, acc_subtitle_size (text)
//   hud.setSkills([{ id, name, icon?, action?, locked? }, ...]);  // 2 Thế võ slots (skills.json)
//   hud.setCooldown(id, t01, secondsLeft?);  // t01: 1 = just used, 0 = ready; seconds shown below 5 s
//   hud.setCinematic(on);               // hide everything (drum_burst_cinematic_0_3.hud_hidden)
//   hud.popup(x, y, value, kind); hud.pickup(text); hud.minimapSlot  // top-left mount point (~180 px)
//
// Layout, state fields and data keys: src/ui/hud/README.md. Every string comes from strings.json;
// thresholds/rates from combat_tuning.hud_0_3 (hudTuningFrom).
import { createI18n } from '../../logic/i18n.js';
import { hpTier, hpColor, rgb, ChipBar, drumGauge, DrumFaceState, SkillCooldowns, HudVisibility, hudTextScale, hudTuningFrom, cooldownText, clamp01 } from './logic.js';
import { weaponIconFor, HEAL_ICON, HEARTBEAT_ICON, khoenIcon, SKILL_ICONS } from './icons.js';
import { DrumFace, raysDataUrl } from './drumFace.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const mixc = (c, to, u) => c.map((v, i) => Math.round(v + (to[i] - v) * u));
const DRUM_PX = 112;
const POP_S = 0.8;

export function createHud(root, data, controls, i18n = createI18n(data.strings)) {
  return new Hud(root, data, controls, i18n);
}

export class Hud {
  constructor(root, data, controls, i18n) {
    this.root = root; this.data = data; this.controls = controls; this.i18n = i18n;
    this.t = (k, v) => i18n.t(k, v);
    const T = this.tun = hudTuningFrom(data);
    this.chip = new ChipBar(1, T); this.bossChip = new ChipBar(1, T);
    this.drum = new DrumFaceState(T); this.cooldowns = new SkillCooldowns(); this.vis = new HudVisibility(T);
    this.acc = {}; this.time = 0; this.drawAcc = 1; this.last = {}; this.skills = []; this.bossIntro = 0; this.bossOn = false;
    this._build();
    i18n.onChange?.(() => { this._applyI18n(); this.last = {}; this._renderSkills(); });
  }

  _build() {
    const el = h(`<div class="hud3">
      <div class="h-minimap-slot" aria-hidden="true"></div>
      <div class="h-track"><div class="h-zone"></div><div class="h-obj"></div><div class="h-points"></div></div>
      <div class="h-boss hidden" aria-live="off">
        <div class="h-bname"><span class="orn"></span><b></b><span class="orn r"></span></div>
        <div class="h-bphase"></div>
        <div class="h-bar h-bosshp"><i class="chip"></i><i class="fill"></i><b class="tick phase"></b></div>
        <div class="h-bossrow"><div class="h-bar h-bossthe"><i class="fill"></i></div>
          <div class="h-cracks"><span class="lbl" data-t="hud_khoen_cracks"></span><span class="k"></span><span class="k"></span><span class="k"></span></div></div>
      </div>
      <div class="h-pickups"></div>
      <div class="h-player bl">
        <div class="h-skills"><div class="h-skill empty" data-i="0"></div><div class="h-skill empty" data-i="1"></div></div>
        <div class="h-weapon"><div class="ico"></div><div class="other"></div><b class="plus"></b><div class="h-slotkeys"></div></div>
        <div class="h-bars">
          <div class="h-hprow"><span class="lbl" data-t="hud_health"></span><span class="beat">${HEARTBEAT_ICON}</span><span class="low" data-t="hud_low_health"></span><span class="num"></span></div>
          <div class="h-hpwrap"><i class="h-hppulse"></i><div class="h-hpglow" data-tier="ok"><div class="h-bar h-hp"><i class="chip"></i><i class="fill"></i><i class="edge"></i><b class="tick t50"></b><b class="tick t10"></b></div></div></div>
          <div class="h-therow"><div class="h-theglow"><div class="h-bar h-the"><i class="fill"></i></div></div><span class="lbl" data-t="hud_the"></span></div>
          <div class="h-heal"><span class="ico">${HEAL_ICON}</span><span class="nm" data-t="hud_heal_charges"></span><b class="n"></b><span class="kbd"></span></div>
        </div>
      </div>
      <div class="h-drum" data-full="0">
        <div class="halo"></div><div class="rays"></div><div class="wave"></div>
        <canvas></canvas>
        <div class="h-drumlbl"><span class="kbd"></span><span class="nm"></span></div>
      </div>
      <div class="h-meta"><span class="fps hidden"></span><span class="build"></span></div>
      <div class="h-pops"></div>
    </div>`);
    this.root.appendChild(el);
    this.el = el;
    const q = (s) => el.querySelector(s);
    this.e = {
      track: q('.h-track'), zone: q('.h-zone'), obj: q('.h-obj'), points: q('.h-points'),
      boss: q('.h-boss'), bname: q('.h-bname b'), bphase: q('.h-bphase'), bhp: q('.h-bosshp .fill'), bchip: q('.h-bosshp .chip'),
      bthe: q('.h-bossthe .fill'), cracks: q('.h-cracks'), crackEls: [...el.querySelectorAll('.h-cracks .k')],
      wother: q('.h-weapon .other'), wplus: q('.h-weapon .plus'), drumName: q('.h-drumlbl .nm'), bphaseTick: q('.h-bosshp .phase'),
      player: q('.h-player'), skills: [...el.querySelectorAll('.h-skill')], weapon: q('.h-weapon'), wico: q('.h-weapon .ico'), slotkeys: q('.h-slotkeys'),
      hp: q('.h-hpglow'), hpPulse: q('.h-hppulse'), hpFill: q('.h-hp .fill'), hpEdge: q('.h-hp .edge'), hpChip: q('.h-hp .chip'), hpNum: q('.h-hprow .num'), hprow: q('.h-hprow'),
      the: q('.h-theglow'), theFill: q('.h-the .fill'), heal: q('.h-heal'), healN: q('.h-heal .n'), healKey: q('.h-heal .kbd'),
      drum: q('.h-drum'), drumKey: q('.h-drumlbl .kbd'), canvas: q('.h-drum canvas'),
      fps: q('.h-meta .fps'), build: q('.h-meta .build'), pickups: q('.h-pickups'), pops: q('.h-pops'),
    };
    this.minimapSlot = q('.h-minimap-slot');
    this.face = new DrumFace(this.e.canvas, DRUM_PX);
    try { q('.h-drum .rays').style.backgroundImage = `url(${raysDataUrl()})`; } catch { /* no 2D canvas: no rays */ }
    this.pops = Array.from({ length: 10 }, () => { const d = h('<div class="h-pop"><span></span><i></i></div>'); this.e.pops.appendChild(d); return { d, t: 0, x: 0, y: 0, k: '' }; });
    this.popIdx = 0;
    this._applyI18n();
    this._renderSkills();
    this.e.crackEls.forEach((k) => { k.innerHTML = khoenIcon(false); });
    this.face.draw({ level: 0, segs: [0, 0, 0, 0], full: false, t: 0, slosh: 0, pulse: 0 });
    const T = this.tun;
    el.style.setProperty('--crit-period', `${(1 / T.critPulseHz).toFixed(3)}s`);
    el.style.setProperty('--ready-period', `${(1 / T.readyPulseHz).toFixed(3)}s`);
    el.style.setProperty('--ready-flash', `${Math.max(0.15, T.skillReadyFlashS).toFixed(2)}s`);
    if (T.bossPhaseMarker != null) this.e.bphaseTick.style.left = `${(100 * T.bossPhaseMarker).toFixed(1)}%`;
    else this.e.bphaseTick.remove();
  }

  _applyI18n() {
    for (const n of this.el.querySelectorAll('[data-t]')) n.textContent = this.t(n.dataset.t);
    this.e.drumName.textContent = this.t(this.drum.full ? this.tun.drumReadyKey : this.tun.drumLabelKey);
  }

  setBuildId(id) { this.e.build.textContent = id; }

  applySettings(acc = {}) {
    this.acc = acc;
    this.el.classList.toggle('reduce-flash', !!acc.acc_reduce_flash);
    this.el.style.setProperty('--hud-fs', String(hudTextScale(acc.acc_subtitle_size)));
    const sc = Number(acc.acc_hud_scale); // controls.json acc_hud_scale (HUD and minimap size)
    this.el.style.setProperty('--hud-scale', String(Number.isFinite(sc) && sc > 0 ? sc : 1));
  }
  /** Hide the whole HUD (Drum Burst cinematic, cut-scenes). */
  setCinematic(on) { this.el.classList.toggle('cinematic', !!on); }

  // ------------------------------------------------------------- skills (API for gameplay)
  /** list: up to 2 entries { id, name ({vi,en} | string), icon? (SKILL_ICONS key), action? (controls id, e.g. skill_1), locked? }. */
  setSkills(list = []) { this.skills = list.slice(0, 2); this._renderSkills(); }
  /** t01 = remaining cooldown fraction (1 just used -> 0 ready); secondsLeft (optional) shows a number below hud_0_3.skills.show_seconds_below_s. */
  setCooldown(id, t01, secondsLeft = null) {
    const becameReady = this.cooldowns.set(id, t01);
    const i = this.skills.findIndex((s) => s.id === id);
    if (i < 0) return;
    const slot = this.e.skills[i], v = this.cooldowns.get(id);
    slot.style.setProperty('--cd', v.toFixed(3));
    slot.classList.toggle('cooling', v > 0);
    const sec = slot.querySelector('.sec');
    if (sec) sec.textContent = v > 0 && secondsLeft != null ? cooldownText(secondsLeft, this.tun.skillSecondsBelowS) : '';
    if (becameReady) { slot.classList.remove('ready'); void slot.offsetWidth; slot.classList.add('ready'); }
  }
  _renderSkills() {
    this.e.skills.forEach((slot, i) => {
      const s = this.skills[i];
      slot.classList.toggle('empty', !s);
      if (!s) { slot.innerHTML = '<div class="dia"></div>'; slot.removeAttribute('title'); return; }
      const name = typeof s.name === 'string' ? s.name : this.i18n.loc(s.name);
      const icon = SKILL_ICONS[s.icon] ?? `<span class="mono">${esc((name || '?').slice(0, 1).toUpperCase())}</span>`;
      const g = s.action ? this.controls?.glyphText?.(s.action) ?? '' : '';
      const key = g === '—' ? '' : g; // unbound / unknown action: no key badge
      slot.classList.toggle('locked', !!s.locked);
      slot.innerHTML = `<div class="dia"></div><div class="cd"></div><div class="si">${s.locked ? SKILL_ICONS.lock : icon}</div><b class="sec"></b>${key && !s.locked ? `<span class="kbd">${esc(key)}</span>` : ''}`;
      slot.title = name;
      slot.dataset.skill = s.id;
      slot.style.setProperty('--cd', this.cooldowns.get(s.id).toFixed(3));
    });
  }

  // ------------------------------------------------------------- feedback (numbers, streaks, pickups)
  /** Floating Thế number + slash streak at a screen point. kind: '' | 'break' | 'neck'. */
  popup(x, y, value, kind = '') {
    if (!(value > 0) && !kind) return;
    const p = this.pops[this.popIdx++ % this.pops.length];
    p.t = POP_S; p.x = x + (Math.random() - 0.5) * 30; p.y = y + 10; p.k = kind;
    p.d.className = `h-pop on ${kind}`;
    p.d.style.transform = `translate(${p.x.toFixed(0)}px, ${p.y.toFixed(0)}px) scale(0.6)`; p.d.style.opacity = '1';
    p.d.firstChild.textContent = kind === 'break' ? this.t('pop_the_break') : `+${value}`;
    p.d.lastChild.style.setProperty('--rot', `${(-35 + Math.random() * 25).toFixed(0)}deg`);
    this.popsActive = true;
  }
  _tickPops(dt) {
    if (!this.popsActive) return;
    let any = false;
    for (const p of this.pops) {
      if (p.t <= 0) continue;
      p.t -= dt; any = true;
      if (p.t <= 0) { p.d.className = 'h-pop'; continue; }
      const u = 1 - p.t / POP_S, s = u < 0.12 ? 0.6 + u / 0.12 * 0.6 : 1.2 - Math.min(0.2, (u - 0.12) * 0.6);
      p.d.style.transform = `translate(${p.x.toFixed(0)}px, ${(p.y - 46 * u).toFixed(0)}px) scale(${s.toFixed(2)})`;
      p.d.style.opacity = (1 - u * u * u).toFixed(2);
    }
    this.popsActive = any;
  }
  /** Item pickup notice (bottom-left, above the player cluster). */
  pickup(text) {
    const n = h(`<div class="h-pick"><span class="ico">${HEAL_ICON.replace('viewBox', 'class="leaf" viewBox')}</span><span>${esc(text)}</span></div>`);
    this.e.pickups.appendChild(n);
    while (this.e.pickups.children.length > 4) this.e.pickups.firstChild.remove();
    setTimeout(() => n.classList.add('out'), 3200);
    setTimeout(() => n.remove(), 3800);
    this.vis.poke();
  }

  // ------------------------------------------------------------- per frame
  _set(key, v, fn) { if (this.last[key] !== v) { this.last[key] = v; fn(v); } }

  /**
   * state: { hp, hpMax, the (0..1), drum ([4] 0..1) or drumPoints/drumSegPoints, drumReady, heals,
   *   weapon (weapons.json entry) | weaponId, weaponName, slot, slots, zone, objective, points, fps,
   *   combat (bool), boss: null | { name, phase, hp, the, cracks, showCracks } }
   * realDt: real seconds since the last call (0 = just refresh).
   */
  update(s, realDt = 0) {
    const dt = Math.max(0, Math.min(0.25, realDt || 0)), e = this.e, rf = !!this.acc.acc_reduce_flash;
    this.time += dt;
    this._tickPops(dt);
    // --- health
    const T = this.tun;
    const ratio = clamp01(s.hp / (s.hpMax || 1));
    if (ratio < this.chip.value - 1e-6) this.vis.poke();
    this.chip.set(ratio); this.chip.tick(dt);
    const tier = hpTier(ratio, T);
    this._set('tier', tier, (v) => { e.hp.dataset.tier = v; e.hprow.dataset.tier = v; e.hpPulse.classList.toggle('on', v === 'crit'); });
    this._set('hpc', ratio.toFixed(3), () => {
      const c = hpColor(ratio, T);
      e.hp.style.setProperty('--hc', rgb(c));
      e.hp.style.setProperty('--hcl', rgb(mixc(c, [255, 255, 255], 0.55)));
      e.hp.style.setProperty('--hcd', rgb(mixc(c, [0, 0, 0], 0.45)));
      e.hp.style.setProperty('--hcg', rgb(c, 0.75));
      e.hpFill.style.transform = `scaleX(${ratio.toFixed(4)})`;
      e.hpEdge.style.left = `${(100 * ratio).toFixed(2)}%`;
    });
    this._set('chip', this.chip.chip.toFixed(3), (v) => { e.hpChip.style.transform = `scaleX(${v})`; });
    this._set('heal', this.chip.healT > 0, (v) => e.hp.classList.toggle('healing', v));
    this._set('hpnum', `${Math.ceil(s.hp)} / ${s.hpMax}`, (v) => { e.hpNum.textContent = v; });
    // --- Thế
    const the = clamp01(s.the);
    this._set('the', the.toFixed(3), () => { e.theFill.style.transform = `scaleX(${the.toFixed(4)})`; });
    this._set('thehot', the >= 0.7, (v) => e.the.classList.toggle('hot', v));
    this._set('therest', T.theOnlyWhenActive && the <= 0.001, (v) => e.the.parentElement.classList.toggle('rest', v));
    // --- weapon + slots
    const weapon = s.weapon ?? this.data.weapons?.weapons?.find((w) => w.id === s.weaponId);
    const wid = weapon?.id ?? s.weaponName;
    this._set('weapon', wid, () => {
      e.wico.innerHTML = weaponIconFor(weapon);
      e.weapon.title = s.weaponName ?? '';
      e.weapon.classList.remove('swap'); void e.weapon.offsetWidth; e.weapon.classList.add('swap');
      this.vis.poke();
    });
    // other slot weapon (small) + upgrade "+N" (hud_0_3.weapon_icon.shows)
    this._set('wother', s.otherWeapon?.id ?? '', () => { e.wother.innerHTML = s.otherWeapon ? weaponIconFor(s.otherWeapon) : ''; });
    this._set('wplus', s.weaponPlus > 0 ? `+${s.weaponPlus}` : '', (v) => { e.wplus.textContent = v; });
    const g1 = this.controls?.glyphText?.('weapon_slot_1') ?? '1', g2 = this.controls?.glyphText?.('weapon_slot_2') ?? '2';
    this._set('slots', `${s.slots ?? 1}|${s.slot ?? 0}|${g1}|${g2}`, () => {
      e.slotkeys.innerHTML = (s.slots ?? 1) > 1 ? `<span class="kbd${(s.slot ?? 0) === 0 ? ' on' : ''}">${esc(g1)}</span><span class="kbd${s.slot === 1 ? ' on' : ''}">${esc(g2)}</span>` : '';
    });
    // --- heal item
    this._set('heals', s.heals, (v) => { e.healN.textContent = `× ${v}`; e.heal.classList.toggle('none', !(v > 0)); });
    this._set('healkey', this.controls?.glyphText?.('heal') ?? s.healKey ?? '', (v) => { e.healKey.textContent = v; });
    // --- drum face
    const gauge = s.drumPoints != null ? drumGauge(s.drumPoints, s.drumSegPoints, 4, 4)
      : { segs: (s.drum ?? [0, 0, 0, 0]).slice(), level: (s.drum ?? []).reduce((a, b) => a + b, 0) / 4, full: !!s.drumReady };
    const ev = this.drum.set(gauge);
    if (ev) {
      e.drum.dataset.full = this.drum.full ? '1' : '0';
      e.drumName.textContent = this.t(this.drum.full ? T.drumReadyKey : T.drumLabelKey);
      e.drum.classList.remove('filled', 'spent'); void e.drum.offsetWidth; e.drum.classList.add(ev);
      this.vis.poke();
    }
    this._set('burstkey', this.controls?.glyphText?.('drum_burst') ?? s.burstKey ?? '', (v) => { e.drumKey.textContent = v; });
    const moving = this.drum.tick(dt);
    this.drawAcc += dt;
    const segsKey = gauge.segs.map((x) => x.toFixed(2)).join(',');
    const needDraw = this.last.segs !== segsKey || moving || (this.drum.animating && this.drawAcc >= 1 / 30);
    if (needDraw && !this.hiddenDrum) {
      this.last.segs = segsKey; this.drawAcc = 0;
      const pulse = rf ? 0.35 : 0.5 + 0.5 * Math.sin(this.time * 4.2);
      this.face.draw({ level: this.drum.shown, segs: gauge.segs, full: this.drum.full, t: this.time * (rf ? 0.5 : 1), slosh: this.drum.slosh, pulse });
      this.draws = (this.draws ?? 0) + 1;
    }
    // --- objective tracker, meta
    this._set('zone', s.zone ?? '', (v) => { e.zone.textContent = v; });
    this._set('obj', s.objective ?? '', (v) => { e.obj.textContent = v; e.obj.classList.toggle('hidden', !v); });
    this._set('points', s.points ?? '', (v) => { e.points.textContent = v; });
    this._set('fps', s.fps ?? null, (v) => { e.fps.classList.toggle('hidden', v == null); if (v != null) e.fps.textContent = `FPS ${v}`; });
    // --- boss
    this._boss(s.boss, dt);
    // --- minimal HUD
    const show = this.vis.tick(dt, { minimal: !!this.acc.acc_hud_minimal, combat: !!s.combat, boss: !!s.boss, hpRatio: ratio, drumFull: this.drum.full });
    this._set('show', show, (v) => { e.player.classList.toggle('faded', !v); e.drum.classList.toggle('faded', !v); });
    this.hiddenDrum = !show;
  }

  _boss(b, dt) {
    const e = this.e;
    if (!b) {
      if (this.bossOn) { this.bossOn = false; e.boss.classList.add('hidden'); e.boss.classList.remove('enter'); this.el.classList.remove('boss-on'); }
      return;
    }
    if (!this.bossOn) {
      this.bossOn = true; this.bossIntro = 0; this.bossChip = new ChipBar(0);
      e.boss.classList.remove('hidden'); e.boss.classList.remove('enter'); void e.boss.offsetWidth; e.boss.classList.add('enter');
      this.el.classList.add('boss-on'); this.last.bhp = null;
    }
    this.bossIntro = Math.min(1, this.bossIntro + dt / 0.9);
    const ease = 1 - (1 - this.bossIntro) ** 3;
    const hp = clamp01(b.hp) * ease;
    this.bossChip.set(hp); this.bossChip.tick(dt);
    this._set('bname', b.name, (v) => { e.bname.textContent = v; });
    this._set('bphase', b.phase ?? '', (v) => { e.bphase.textContent = v; });
    this._set('bhp', hp.toFixed(4), () => { e.bhp.style.transform = `scaleX(${hp.toFixed(4)})`; });
    this._set('bchip', this.bossChip.chip.toFixed(3), (v) => { e.bchip.style.transform = `scaleX(${v})`; });
    this._set('bthe', clamp01(b.the).toFixed(3), (v) => { e.bthe.style.transform = `scaleX(${v})`; });
    this._set('bcracks', `${b.showCracks ? 1 : 0}|${b.cracks}`, () => {
      e.cracks.classList.toggle('hidden', !b.showCracks);
      e.crackEls.forEach((k, i) => {
        const on = i < b.cracks;
        if (k.dataset.on !== String(on)) { k.innerHTML = khoenIcon(on); k.dataset.on = String(on); if (on) { k.classList.remove('crack'); void k.offsetWidth; k.classList.add('crack'); } }
      });
    });
  }

  /** Test/debug read-out (also used by test/smoke.mjs through __demo.hud()). */
  debugState() {
    return { hpTier: this.e.hp.dataset.tier, hpColor: this.e.hp.style.getPropertyValue('--hc'), chip: this.chip.chip, drumFull: this.drum.full,
      drumAttr: this.e.drum.dataset.full, drumLevel: this.drum.level, draws: this.draws ?? 0, bossVisible: this.bossOn,
      playerVisible: !this.e.player.classList.contains('faded'), skills: this.skills.map((x) => x.id) };
  }
}
