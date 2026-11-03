// ui.js - DOM HUD and screens. Every visible string comes from strings.json (ui/dialogue), codex.json
// or another design data {vi, en} object via i18n.
import { CONTROL_ROWS } from './input.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export const LABEL_KEYS = {
  'SỬ LIỆU': 'codex_label_su_lieu', 'SỬ LIỆU-TRANH LUẬN': 'codex_label_su_lieu_tranh_luan',
  'HUYỀN THOẠI': 'codex_label_huyen_thoai', 'CỔ TÍCH': 'codex_label_co_tich', 'SÁNG TẠO': 'codex_label_sang_tao',
};
// Label icons: distinct SHAPES (not just colors).
const LABEL_ICONS = {
  'SỬ LIỆU': '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 6h6M5 9h6" stroke="currentColor"/></svg>',
  'SỬ LIỆU-TRANH LUẬN': '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 13L13 3" stroke="currentColor" stroke-width="2"/></svg>',
  'HUYỀN THOẠI': '<svg viewBox="0 0 16 16"><path d="M1 10c2-3 4-3 6 0s4 3 6 0 2-2 2-2" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="4" r="2" fill="currentColor"/></svg>',
  'CỔ TÍCH': '<svg viewBox="0 0 16 16"><path d="M8 1l2 5h5l-4 3 2 6-5-4-5 4 2-6-4-3h5z" fill="currentColor"/></svg>',
  'SÁNG TẠO': '<svg viewBox="0 0 16 16"><path d="M8 1l7 7-7 7-7-7z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8" cy="8" r="2" fill="currentColor"/></svg>',
};

export class UI {
  constructor(root, game) {
    this.root = root; this.g = game; this.i18n = game.i18n;
    this.toastTimers = []; this.subT = 0; this.centerT = 0; this.screen = null; this.screenName = null;
    this.build();
    this.i18n.onChange(() => { this.applyI18n(); if (this.screenName && this.rerender) this.rerender(); });
  }
  t(k, v) { return this.i18n.t(k, v); }
  loc(o) { return this.i18n.loc(o); }

  build() {
    const hud = h(`<div id="hud" class="layer hidden">
      <div class="tl"><div class="zone" id="zone"></div><div class="obj" id="obj"></div></div>
      <div class="tr"><div id="fps" class="hidden"></div><div id="build" class="dim"></div></div>
      <div id="bossbar" class="hidden">
        <div class="name"><b id="bossname"></b><span id="bossphase" class="dim"></span></div>
        <div class="bar hp boss"><i id="bosshp"></i></div>
        <div class="barlabel"><span data-t="hud_the"></span></div>
        <div class="bar the"><i id="bossthe"></i></div>
        <div class="cracks" id="cracks"><span data-t="hud_khoen_cracks"></span><span class="crack"></span><span class="crack"></span><span class="crack"></span></div>
      </div>
      <div class="bl">
        <div class="hudrow"><span id="weapon"></span><span class="dim" id="slot"></span></div>
        <div class="barlabel"><span data-t="hud_health"></span><span id="hptext"></span></div>
        <div class="bar hp"><i id="hp"></i></div>
        <div class="barlabel"><span data-t="hud_the"></span></div>
        <div class="bar the"><i id="the"></i></div>
        <div class="barlabel"><span data-t="hud_drum"></span><span id="drumready"></span></div>
        <div class="drum" id="drum"><span><i></i></span><span><i></i></span><span><i></i></span><span><i></i></span></div>
        <div class="hudrow"><span><span data-t="hud_heal_charges"></span> × <b id="heals"></b> <span class="kbd">H</span></span><span id="points" class="dim"></span></div>
      </div>
      <div id="markers"></div>
      <div id="prompt" class="hidden"></div>
      <div id="pry" class="hidden"></div>
      <div id="toasts"></div>
      <div id="center-msg"></div>
      <div id="subs"></div>
    </div>`);
    this.root.appendChild(hud);
    this.fadeEl = h('<div id="fade" class="layer"></div>'); this.root.appendChild(this.fadeEl);
    this.hud = hud;
    const q = (id) => hud.querySelector(`#${id}`);
    this.el = { zone: q('zone'), obj: q('obj'), fps: q('fps'), build: q('build'), boss: q('bossbar'), bossname: q('bossname'), bossphase: q('bossphase'),
      bosshp: q('bosshp'), bossthe: q('bossthe'), cracks: q('cracks'), weapon: q('weapon'), slot: q('slot'), hp: q('hp'), hptext: q('hptext'), the: q('the'),
      drum: q('drum'), drumready: q('drumready'), heals: q('heals'), points: q('points'), markers: q('markers'), prompt: q('prompt'), pry: q('pry'),
      toasts: q('toasts'), center: q('center-msg'), subs: q('subs') };
    this.el.build.textContent = this.g.buildId;
    this.markerPool = new Map();
    this.applyI18n();
  }

  applyI18n() {
    for (const n of this.root.querySelectorAll('[data-t]')) n.textContent = this.t(n.dataset.t);
    document.documentElement.lang = this.i18n.lang;
    document.title = this.t('game_title');
  }

  applySettings(s) {
    const sizes = { s: '16px', m: '20px', l: '26px', xl: '32px' };
    document.documentElement.style.setProperty('--sub-size', sizes[s.acc.acc_subtitle_size] ?? '20px');
    document.documentElement.style.setProperty('--sub-bg', String(s.acc.acc_subtitle_bg));
    this.root.classList.toggle('reduce-flash', !!s.acc.acc_reduce_flash);
    this.el.fps.classList.toggle('hidden', !s.showFps);
  }

  showHud(on) { this.hud.classList.toggle('hidden', !on); }

  // ------------------------------------------------------------- HUD
  updateHud(s) {
    const e = this.el;
    e.hp.style.width = `${(100 * s.hp / s.hpMax).toFixed(1)}%`;
    e.hptext.textContent = `${Math.ceil(s.hp)} / ${s.hpMax}`;
    e.the.style.width = `${(100 * s.the).toFixed(1)}%`;
    const segs = e.drum.children;
    for (let i = 0; i < 4; i++) segs[i].firstChild.style.width = `${(100 * s.drum[i]).toFixed(0)}%`;
    e.drum.classList.toggle('ready', s.drumReady);
    e.drumready.textContent = s.drumReady ? `${this.t('hud_drum_ready')} [R]` : '';
    e.heals.textContent = s.heals;
    e.weapon.textContent = s.weaponName; e.slot.textContent = s.slotText;
    e.points.textContent = s.points;
    e.zone.textContent = s.zone; e.obj.textContent = s.objective;
    if (s.fps != null) e.fps.textContent = `FPS ${s.fps}`;
    if (s.boss) {
      e.boss.classList.remove('hidden');
      e.bossname.textContent = s.boss.name; e.bossphase.textContent = s.boss.phase;
      e.bosshp.style.width = `${(100 * s.boss.hp).toFixed(1)}%`;
      e.bossthe.style.width = `${(100 * s.boss.the).toFixed(1)}%`;
      e.cracks.classList.toggle('hidden', !s.boss.showCracks);
      const cs = e.cracks.querySelectorAll('.crack');
      cs.forEach((c, i) => c.classList.toggle('on', i < s.boss.cracks));
    } else e.boss.classList.add('hidden');
  }

  /** list: [{ id, sx, sy, visible, tele, locked, hp, the, showBars }] */
  updateMarkers(list) {
    const seen = new Set();
    for (const m of list) {
      seen.add(m.id);
      let el = this.markerPool.get(m.id);
      if (!el) {
        el = h('<div class="mk"><div class="tg hidden"></div><div class="mini"><div class="bar hp"><i></i></div><div class="bar the"><i></i></div></div><div class="lock hidden"></div></div>');
        this.el.markers.appendChild(el); this.markerPool.set(m.id, el);
      }
      el.style.display = m.visible ? '' : 'none';
      if (!m.visible) continue;
      el.style.left = `${m.sx}px`; el.style.top = `${m.sy}px`;
      const tg = el.firstChild;
      tg.className = m.tele ? `tg ${m.tele} pulse` : 'tg hidden';
      const mini = el.children[1];
      mini.style.display = m.showBars ? '' : 'none';
      mini.children[0].firstChild.style.width = `${(100 * m.hp).toFixed(0)}%`;
      mini.children[1].firstChild.style.width = `${(100 * m.the).toFixed(0)}%`;
      el.children[2].classList.toggle('hidden', !m.locked);
    }
    for (const [id, el] of this.markerPool) if (!seen.has(id)) { el.remove(); this.markerPool.delete(id); }
  }

  prompt(text, progress = null) {
    const p = this.el.prompt;
    if (!text) { p.classList.add('hidden'); this.promptText = null; return; }
    p.classList.remove('hidden');
    const key = `${text}|${progress != null}`;
    if (this.promptText !== key) {
      p.innerHTML = `${text}${progress != null ? '<span class="prog"><i></i></span>' : ''}`;
      this.promptText = key;
    }
    if (progress != null) p.querySelector('.prog i').style.width = `${(100 * progress).toFixed(0)}%`;
  }

  toast(text, seconds = 3) {
    const el = h(`<div class="toast">${esc(text)}</div>`);
    this.el.toasts.appendChild(el);
    while (this.el.toasts.children.length > 5) this.el.toasts.firstChild.remove();
    setTimeout(() => el.remove(), seconds * 1000);
  }

  subtitle(speaker, text, seconds) {
    this.el.subs.innerHTML = text ? `<span class="line">${speaker ? `<span class="speaker">${esc(speaker)}:</span>` : ''}${esc(text)}</span>` : '';
    this.subT = seconds ?? 0;
  }
  center(text, seconds = 2) { this.el.center.textContent = text ?? ''; this.centerT = seconds; }
  fade(on) { this.fadeEl.style.opacity = on ? '1' : '0'; }

  tick(dt) {
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.el.subs.innerHTML = ''; }
    if (this.centerT > 0) { this.centerT -= dt; if (this.centerT <= 0) this.el.center.textContent = ''; }
  }

  /** s: null | { beats, hit, slotFrac (0..1, 1 = far), hold, holdProgress, auto, msg } */
  pryWidget(s) {
    const p = this.el.pry;
    if (!s) { p.classList.add('hidden'); this.pryBuilt = false; return; }
    p.classList.remove('hidden');
    if (!this.pryBuilt) {
      p.innerHTML = `<div class="ring"><div class="target"></div><div class="shrink"></div></div><div class="pips"></div><div class="hold hidden"><i></i></div><div class="msg"></div>`;
      this.pryBuilt = true;
    }
    const sh = p.querySelector('.shrink');
    const size = 60 + 80 * Math.max(0, Math.min(1, s.slotFrac));
    sh.style.width = sh.style.height = `${size}px`;
    sh.style.display = s.hold ? 'none' : '';
    p.querySelector('.pips').innerHTML = Array.from({ length: s.beats }, (_, i) => `<span class="pip${i < s.hit ? ' on' : ''}"></span>`).join('');
    const hold = p.querySelector('.hold'); hold.classList.toggle('hidden', !s.hold);
    if (s.hold) hold.firstChild.style.width = `${(100 * s.holdProgress).toFixed(0)}%`;
    p.querySelector('.msg').textContent = s.msg;
  }

  // ------------------------------------------------------------- screens
  get open() { return !!this.screen; }
  close() {
    if (this.screen) this.screen.remove();
    this.screen = null; this.screenName = null; this.rerender = null;
    this.g.onScreenClosed?.();
  }
  _screen(name, html, { solid = false } = {}) {
    if (this.screen) this.screen.remove();
    this.screen = h(`<div class="screen${solid ? ' solid' : ''}" data-screen="${name}"><div class="panel">${html}</div></div>`);
    this.root.appendChild(this.screen); this.screenName = name;
    return this.screen;
  }
  _bind(sel, fn) { for (const b of this.screen.querySelectorAll(sel)) b.addEventListener('click', (e) => { this.g.sfx.ui(); fn(e, b); }); }

  labelBadge(label) {
    return `<span class="label-badge" data-label="${esc(label)}">${LABEL_ICONS[label] ?? ''}<span>${esc(this.t(LABEL_KEYS[label]))}</span></span>`;
  }

  showTitle() {
    this.rerender = () => this.showTitle();
    const g = this.g;
    this._screen('title', `
      <h1>${esc(this.t('game_title'))}</h1>
      <p class="notice"><b>${esc(this.t('intro_proto_notice'))}</b></p>
      <p>${esc(this.t('intro_internal'))}</p>
      <h3>${esc(this.t('intro_content_label'))}</h3>
      <p>${esc(this.t('intro_content_text'))}</p>
      <p>${this.labelBadge('SÁNG TẠO')} ${this.labelBadge('HUYỀN THOẠI')} ${this.labelBadge('SỬ LIỆU-TRANH LUẬN')}</p>
      <p class="dim">${esc(this.t('codex_notice_level_b'))}</p>
      <p class="dim">${esc(this.t('intro_audio_note'))}</p>
      <div class="row">
        <button class="primary" data-act="start">${esc(this.t('menu_new_game'))}</button>
        <button data-act="controls">${esc(this.t('controls_title'))}</button>
        <button data-act="feedback">${esc(this.t('btn_feedback'))}</button>
        <button data-act="lang">${esc(this.t('menu_language'))}: ${esc(this.t(this.i18n.lang === 'vi' ? 'lang_en' : 'lang_vi'))}</button>
      </div>
      <p class="dim">${esc(this.t('fb_build'))}: ${esc(g.buildId)}</p>`, { solid: true });
    this._bind('[data-act=start]', () => g.startGame());
    this._bind('[data-act=controls]', () => this.showControls(() => this.showTitle()));
    this._bind('[data-act=feedback]', () => this.showFeedback(() => this.showTitle()));
    this._bind('[data-act=lang]', () => g.setLang(this.i18n.lang === 'vi' ? 'en' : 'vi'));
  }

  controlsHtml() {
    const keyLabel = (k) => k.split(' ').map((w) => (w.startsWith('@') ? esc(this.t(w.slice(1))) : esc(w))).join(' ');
    const rows = CONTROL_ROWS.map(([k, s]) => `<tr><td><span class="kbd">${keyLabel(k)}</span></td><td>${esc(this.t(s))}</td></tr>`).join('');
    return `<table class="controls">${rows}</table>
      <h3>${esc(this.t('legend_title'))}</h3>
      <p><span class="tg parryable" style="display:inline-grid;vertical-align:middle"></span> ${esc(this.t('legend_parryable'))}</p>
      <p><span class="tg delayed" style="display:inline-grid;vertical-align:middle"></span> ${esc(this.t('legend_delayed'))}</p>
      <p><span class="tg unparryable" style="display:inline-block;vertical-align:middle"></span> ${esc(this.t('legend_unparryable'))}</p>
      <p class="dim">${esc(this.t('ctl_gamepad_note'))}</p>`;
  }

  showControls(back) {
    this.rerender = () => this.showControls(back);
    this._screen('controls', `<h2>${esc(this.t('controls_title'))}</h2>${this.controlsHtml()}<div class="row"><button data-act="back">${esc(this.t('btn_back'))}</button></div>`);
    this._bind('[data-act=back]', () => (back ? back() : this.close()));
  }

  feedbackInfo() {
    const g = this.g, n = navigator;
    return [`build: ${g.buildId}`, `ua: ${n.userAgent}`, `lang: ${this.i18n.lang}`, `screen: ${screen.width}x${screen.height} @${devicePixelRatio}`,
      `viewport: ${innerWidth}x${innerHeight}`, `gl: ${g.glInfo ?? '?'}`, `difficulty: ${g.settings.difficulty}`,
      `playtime_s: ${Math.round(g.playTime ?? 0)}`, `progress: ${[...(g.gen?.flags ?? [])].join(',') || '-'}`, `fps_avg: ${g.fpsAvg ?? '-'}`].join('\n');
  }

  showFeedback(back) {
    this.rerender = () => this.showFeedback(back);
    const qs = ['fb_q1', 'fb_q2', 'fb_q3', 'fb_q4', 'fb_q5'].map((k) => `<li>${esc(this.t(k))}</li>`).join('');
    this._screen('feedback', `<h2>${esc(this.t('feedback_title'))}</h2>
      <p>${esc(this.t('feedback_text'))}</p>
      <h3>${esc(this.t('feedback_questions_title'))}</h3><ol>${qs}</ol>
      <h3>${esc(this.t('fb_build'))} / ${esc(this.t('fb_browser'))}</h3>
      <textarea class="copy" readonly>${esc(this.feedbackInfo())}</textarea>
      <div class="row"><button data-act="copy">${esc(this.t('feedback_copy'))}</button><button data-act="back">${esc(this.t('btn_back'))}</button></div>`);
    this._bind('[data-act=copy]', (e, b) => {
      const ta = this.screen.querySelector('textarea'); ta.select();
      const done = () => { b.textContent = this.t('feedback_copied'); };
      try { navigator.clipboard.writeText(ta.value).then(done, () => { document.execCommand?.('copy'); done(); }); } catch { done(); }
    });
    this._bind('[data-act=back]', () => (back ? back() : this.close()));
  }

  showPause(tab = 'settings') {
    this.rerender = () => this.showPause(this.pauseTab);
    this.pauseTab = tab;
    const g = this.g;
    const tabs = [['settings', 'menu_settings'], ['skills', 'skills_title'], ['journal', 'journal_title'], ['codex', 'menu_codex'],
      ['controls', 'controls_title'], ['feedback', 'btn_feedback']];
    const body = tab === 'settings' ? this.settingsHtml() : tab === 'skills' ? this.skillsHtml() : tab === 'journal' ? this.journalHtml()
      : tab === 'codex' ? this.codexHtml() : tab === 'controls' ? this.controlsHtml() : '';
    this._screen('pause', `<h2>${esc(this.t('ctl_menu'))}</h2>
      <div class="tabs">${tabs.map(([id, k]) => `<button data-tab="${id}" class="${id === tab ? 'on' : ''}">${esc(this.t(k))}</button>`).join('')}</div>
      <div class="tabbody">${body}</div>
      <div class="row"><button class="primary" data-act="resume">${esc(this.t('menu_continue'))}</button><button data-act="quit">${esc(this.t('menu_quit'))}</button></div>`);
    this._bind('[data-tab]', (e, b) => (b.dataset.tab === 'feedback' ? this.showFeedback(() => this.showPause('settings')) : this.showPause(b.dataset.tab)));
    this._bind('[data-act=resume]', () => g.resume());
    this._bind('[data-act=quit]', () => g.quitToTitle());
    if (tab === 'settings') this.bindSettings();
    if (tab === 'skills') this.bindSkills(() => this.showPause('skills'));
    if (tab === 'codex') this.bindCodex(() => this.showPause('codex'));
  }

  settingsHtml() {
    const g = this.g, s = g.settings, tun = g.data.combat;
    const presets = tun.difficulty.presets;
    const cur = presets.find((p) => p.id === s.difficulty);
    const opt = (v, label, sel) => `<option value="${esc(v)}"${sel ? ' selected' : ''}>${esc(label)}</option>`;
    const r = tun.difficulty.custom_ranges, c = g.diff;
    const slider = (key, label, val) => `<label><span>${esc(this.t(label))}: <b data-val="${key}">${(+val).toFixed(2)}</b></span><input type="range" data-custom="${key}" min="${r[key].min}" max="${r[key].max}" step="${r[key].step}" value="${val}" ${s.difficulty === 'custom' ? '' : 'disabled'}></label>`;
    const acc = tun.accessibility.options.map((o) => {
      const v = s.acc[o.id];
      if (o.type === 'bool') return `<label><span>${esc(this.loc(o.name))}</span><input type="checkbox" data-acc="${o.id}" ${v ? 'checked' : ''}></label>`;
      if (o.type === 'enum') return `<label><span>${esc(this.loc(o.name))}</span><select data-acc="${o.id}">${o.values.map((x) => opt(x, x.toUpperCase(), x === v)).join('')}</select></label>`;
      if (o.type === 'range') return `<label><span>${esc(this.loc(o.name))}</span><input type="range" data-acc="${o.id}" min="${o.min}" max="${o.max}" step="0.05" value="${v}"></label>`;
      return `<label><span>${esc(this.loc(o.name))}</span><span class="dim">${esc(this.t('set_not_in_proto'))}</span></label>`;
    }).join('');
    return `<div class="settings">
      <h3>${esc(this.t('menu_language'))}</h3>
      <label><span>${esc(this.t('menu_language'))}</span><select data-set="lang">${opt('vi', this.t('lang_vi'), this.i18n.lang === 'vi')}${opt('en', this.t('lang_en'), this.i18n.lang === 'en')}</select></label>
      <h3>${esc(this.t('menu_difficulty'))}</h3>
      <label><span>${esc(this.t('menu_difficulty'))}</span><select data-set="difficulty">${presets.map((p) => opt(p.id, this.loc(p.name), p.id === s.difficulty)).join('')}${opt('custom', this.t('set_custom'), s.difficulty === 'custom')}</select></label>
      <p class="dim">${esc(cur ? this.loc(cur.description) : this.t('set_custom_desc'))}</p>
      ${slider('parry_window_s', 'set_parry_window', c.parryWindowS)}
      ${slider('damage_taken_mult', 'set_damage_taken', c.damageTaken)}
      ${slider('enemy_speed_mult', 'set_enemy_speed', c.enemySpeed)}
      ${slider('telegraph_time_mult', 'set_telegraph', c.telegraphMult)}
      <label><span>${esc(this.t('set_pry_auto'))}</span><input type="checkbox" data-custom="pry_auto" ${c.pryAuto ? 'checked' : ''} ${s.difficulty === 'custom' ? '' : 'disabled'}></label>
      <label><span>${esc(this.t('set_aim_assist'))}</span><input type="checkbox" data-custom="aim_assist" ${c.aimAssist ? 'checked' : ''} ${s.difficulty === 'custom' ? '' : 'disabled'}></label>
      <h3>${esc(this.t('menu_accessibility'))}</h3>
      ${acc}
      <h3>${esc(this.t('menu_settings'))}</h3>
      <label><span>${esc(this.t('set_show_fps'))}</span><input type="checkbox" data-set="showFps" ${s.showFps ? 'checked' : ''}></label>
      <label><span>${esc(this.t('set_hints'))}</span><input type="checkbox" data-set="hints" ${s.hints ? 'checked' : ''}></label>
      <label><span>${esc(this.t('set_volume'))}</span><input type="range" data-set="volume" min="0" max="1" step="0.05" value="${s.volume}"></label>
      <label><span>${esc(this.t('set_camera_sens'))}</span><input type="range" data-set="sens" min="0.3" max="2" step="0.05" value="${s.sens}"></label>
    </div>`;
  }

  bindSettings() {
    const g = this.g, root = this.screen;
    for (const el of root.querySelectorAll('[data-set]')) {
      el.addEventListener('change', () => {
        const k = el.dataset.set;
        const v = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
        if (k === 'lang') g.setLang(v); else g.updateSettings({ [k]: v });
        if (k === 'difficulty') this.showPause('settings');
      });
    }
    for (const el of root.querySelectorAll('[data-acc]')) {
      el.addEventListener('change', () => g.updateSettings({ acc: { [el.dataset.acc]: el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value } }));
    }
    for (const el of root.querySelectorAll('[data-custom]')) {
      el.addEventListener('input', () => {
        const k = el.dataset.custom;
        g.updateSettings({ custom: { [k]: el.type === 'checkbox' ? el.checked : +el.value } });
        const lab = root.querySelector(`[data-val="${k}"]`); if (lab) lab.textContent = (+el.value).toFixed(2);
      });
    }
  }

  skillsHtml() {
    const g = this.g, tree = g.data.lineage.skill_tree, st = g.gen.skills;
    let html = `<p>${esc(this.t('skills_points'))}: <b>${st.points}</b></p>`;
    for (const b of tree.branches) {
      html += `<h3>${esc(this.loc(b.name))}</h3>`;
      if (!b.available_in_demo) { html += `<p class="dim">${esc(this.t('skills_locked_branch'))}</p>`; continue; }
      for (const n of tree.nodes.filter((x) => x.branch === b.id)) {
        const owned = st.has(n.id);
        const pre = n.prereqs.filter((p) => !st.has(p)).map((p) => this.loc(tree.nodes.find((x) => x.id === p).name));
        html += `<div class="skill"><div><b>${esc(this.loc(n.name))}</b> <span class="dim">(${n.cost})</span><br><span class="dim">${esc(this.loc(n.description))}</span>
          ${pre.length ? `<br><span class="dim">${esc(this.t('skill_prereq', { name: pre.join(', ') }))}</span>` : ''}</div>
          <div>${owned ? `<span>${esc(this.t('skill_owned'))}</span>` : `<button data-skill="${n.id}" ${st.canBuy(n.id) ? '' : 'disabled'}>${esc(this.t('skill_buy'))}</button>`}</div></div>`;
      }
    }
    if (g.gen.houseMoves.length) {
      const hm = g.data.lineage.house_moves.find((x) => x.id === g.gen.houseMoves[0]);
      html += `<h3>${esc(this.loc(hm.name))}</h3><p class="dim">${esc(this.loc(hm.description))}</p>`;
    }
    return html;
  }
  bindSkills(refresh) {
    this._bind('[data-skill]', (e, b) => { if (this.g.buySkill(b.dataset.skill)) refresh(); });
  }

  journalHtml() {
    const g = this.g;
    let html = '';
    if (g.secretVisible()) {
      const ch = g.secret.chain;
      html += `<h3>${esc(this.loc(ch.name))}</h3><p class="dim">${esc(this.loc(ch.description))}</p>`;
      const clues = g.secret.clueList();
      html += clues.length ? `<div class="cards">${clues.map((c) => `<div class="card"><b>${esc(this.loc(c.name))}</b> ${this.labelBadge(c.label)}<br>${esc(this.loc(c.text))}</div>`).join('')}</div>`
        : `<p class="dim">${esc(this.t('journal_empty'))}</p>`;
    }
    html += `<h3>${esc(this.t('journal_inventory'))}</h3>`;
    const items = g.data.items.items;
    const mats = items.filter((i) => g.inv.count(i.id) > 0);
    html += mats.length ? `<ul>${mats.map((i) => `<li>${esc(this.loc(i.name))} × ${g.inv.count(i.id)} — <span class="dim">${esc(this.loc(i.description))}</span></li>`).join('')}</ul>` : `<p class="dim">${esc(this.t('journal_empty'))}</p>`;
    const bk = Object.entries(g.gen.owned);
    if (bk.length) {
      html += `<h3>${esc(this.t('journal_bao_khi'))}</h3>`;
      for (const [id, o] of bk) {
        const it = items.find((i) => i.id === id);
        html += `<div class="card"><b>${esc(this.loc(it.name))}</b> +${o.level - 1} ${this.labelBadge(it.label)}<br>${esc(this.loc(it.description))}<br><span class="dim">${esc(this.loc(it.effect_text))}</span></div>`;
      }
    }
    return html;
  }

  codexHtml(sel) {
    const g = this.g, entries = g.data.codex.entries;
    const selected = sel ?? this.codexSel ?? entries.find((e) => g.codexUnlocked(e.id))?.id;
    this.codexSel = selected;
    const list = entries.map((e) => {
      const un = g.codexUnlocked(e.id);
      return `<button data-cx="${e.id}" class="${e.id === selected ? 'on' : ''}" ${un ? '' : 'disabled'}>${un ? LABEL_ICONS[e.label] ?? '' : ''}<span>${esc(un ? this.loc(e.title) : this.t('codex_locked'))}</span></button>`;
    }).join('');
    const e = entries.find((x) => x.id === selected);
    let detail = '';
    if (e && g.codexUnlocked(e.id)) {
      detail = `<h2>${esc(this.loc(e.title))}</h2><p>${this.labelBadge(e.label)}</p><p>${esc(this.loc(e.text))}</p>`;
      if (e.text_extra && g.codexExtraUnlocked(e)) detail += `<h3>${esc(this.t('codex_extra_unlocked'))}</h3><p>${esc(this.loc(e.text_extra))}</p>`;
      if (e.sources.length) detail += `<p class="dim">${esc(this.t('codex_sources'))}: ${e.sources.map(esc).join(', ')}${e.research_refs?.length ? ` (${e.research_refs.map(esc).join(', ')})` : ''}</p>`;
      if (e.verification) detail += `<p class="dim">${esc(this.t('codex_verification', { v: e.verification }))}</p>`;
      if (e.review_status?.startsWith('pending')) detail += `<p class="dim">${esc(this.t('codex_review_pending'))}</p>`;
    }
    return `<p class="notice" data-codex-notice>${esc(this.t(g.data.codex.fixed_notice))}</p><div class="codex"><div class="list">${list}</div><div class="detail">${detail}</div></div>`;
  }
  bindCodex(refresh) {
    this._bind('[data-cx]', (e, b) => { this.codexSel = b.dataset.cx; refresh(); });
  }

  showCodex() {
    this.rerender = () => this.showCodex();
    this._screen('codex', `<h2>${esc(this.t('menu_codex'))}</h2>${this.codexHtml()}<div class="row"><button data-act="back">${esc(this.t('btn_close'))}</button></div>`);
    this.bindCodex(() => this.showCodex());
    this._bind('[data-act=back]', () => this.g.resume());
  }
  showJournal() {
    this.rerender = () => this.showJournal();
    this._screen('journal', `<h2>${esc(this.t('journal_title'))}</h2>${this.journalHtml()}<div class="row"><button data-act="back">${esc(this.t('btn_close'))}</button></div>`);
    this._bind('[data-act=back]', () => this.g.resume());
  }
  showSkills() {
    this.rerender = () => this.showSkills();
    this._screen('skills', `<h2>${esc(this.t('skills_title'))}</h2>${this.skillsHtml()}<div class="row"><button data-act="back">${esc(this.t('btn_close'))}</button></div>`);
    this.bindSkills(() => this.showSkills());
    this._bind('[data-act=back]', () => this.g.resume());
  }

  showHints() {
    this.rerender = () => this.showHints();
    const g = this.g, name = this.loc(g.secret.chain.hint_giver.name);
    const txt = this.hintText ?? '';
    this._screen('hints', `<h2>${esc(this.t('hint_ask'))}</h2><p class="dim">${esc(name)}</p>
      ${g.settings.hints ? `<div class="row"><button data-tier="1">${esc(this.t('hint_tier_1'))}</button><button data-tier="2">${esc(this.t('hint_tier_2'))}</button><button data-tier="3">${esc(this.t('hint_tier_3'))}</button></div>` : `<p>${esc(this.t('msg_hints_off'))}</p>`}
      <p class="card" data-hint>${esc(txt)}</p>
      <div class="row"><button data-act="toggle">${esc(this.t(g.settings.hints ? 'hint_disable' : 'hint_enable'))}</button><button data-act="back">${esc(this.t('btn_close'))}</button></div>`);
    this._bind('[data-tier]', (e, b) => { const t = g.secret.hint(+b.dataset.tier); this.hintText = t ? this.loc(t) : this.t('msg_no_hints'); this.showHints(); });
    this._bind('[data-act=toggle]', () => { g.updateSettings({ hints: !g.settings.hints }); this.showHints(); });
    this._bind('[data-act=back]', () => { this.hintText = null; g.resume(); });
  }

  showCraft() {
    this.rerender = () => this.showCraft();
    const g = this.g, items = g.data.items;
    const st = items.stations[0];
    const nm = (id) => this.loc(items.items.find((i) => i.id === id)?.name);
    const cards = items.recipes.map((r) => {
      const miss = g.recipeMissing(r);
      const ins = r.inputs.map((i) => `${esc(nm(i.item))} × ${i.count} <span class="dim">(${r.type === 'upgrade' && i.item === r.target ? (g.gen.owned[i.item] ? 1 : 0) : g.inv.count(i.item)})</span>`).join(', ');
      return `<div class="card"><b>${esc(nm(r.output.item))}</b>${r.type === 'upgrade' ? ` → +${r.to_level - 1}` : ''}<br><span class="dim">${esc(this.t('craft_inputs'))}:</span> ${ins}
        <div class="row"><button data-rcp="${r.id}" ${miss.length ? 'disabled' : ''}>${esc(this.t(r.type === 'upgrade' ? 'craft_upgrade' : 'craft_button'))}</button>${miss.length ? `<span class="dim">${esc(this.t('craft_missing'))}</span>` : ''}</div></div>`;
    }).join('');
    this._screen('craft', `<h2>${esc(this.loc(st.name))}</h2><div class="cards">${cards}</div><div class="row"><button data-act="back">${esc(this.t('btn_close'))}</button></div>`);
    this._bind('[data-rcp]', (e, b) => { g.craftRecipe(b.dataset.rcp); if (this.screenName === 'craft') this.showCraft(); });
    this._bind('[data-act=back]', () => g.resume());
  }

  showConfirm(title, lines, onYes, onNo) {
    this.rerender = null;
    this._screen('confirm', `<h2>${esc(title)}</h2>${lines.length ? `<h3>${esc(this.t('handoff_incomplete'))}</h3><ul>${lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
      <div class="row"><button class="primary" data-act="yes">${esc(this.t('btn_confirm'))}</button><button data-act="no">${esc(this.t('btn_cancel'))}</button></div>`);
    this._bind('[data-act=yes]', () => onYes());
    this._bind('[data-act=no]', () => onNo());
  }

  /** Handoff / text card (full screen). body: html-safe string built by caller via esc. */
  showCard(name, innerHtml, buttonKey, onNext) {
    this.rerender = null;
    this._screen(name, `${innerHtml}<div class="row"><button class="primary" data-act="next">${esc(this.t(buttonKey))}</button></div>`, { solid: true });
    this._bind('[data-act=next]', () => onNext());
  }
  esc(s) { return esc(s); }
}
