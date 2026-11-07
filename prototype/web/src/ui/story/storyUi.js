// ui/story/storyUi.js - DOM layer of the 0.4 story systems (src/story/director.js drives it):
// letterbox + black card + subtitles for cut-scenes, hold-to-skip and hold-to-act prompts, the named
// dialogue box with choices, the quest tracker (inside the HUD's top-right track), quest banners and the
// diamond markers above NPCs who have something new to say. Every string comes from strings.json or a
// {vi, en} data object through i18n; subtitle size / background follow acc_subtitle_size / acc_subtitle_bg
// (--sub-size, --sub-bg set by game/ui.js).
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const h = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export class StoryUi {
  constructor(root, game) {
    this.g = game; this.i18n = game.i18n;
    this.el = h(`<div class="story-layer">
      <div class="st-npcmarks"></div>
      <div class="st-black hidden"><p class="st-card"></p></div>
      <div class="st-bars hidden"><i class="top"></i><i class="bot"></i></div>
      <div class="st-subs"></div>
      <div class="st-hold hidden"><span class="txt"></span><span class="bar"><i></i></span></div>
      <div class="st-skip hidden"><span class="txt"></span><span class="ring"><i></i></span></div>
      <div class="st-banner hidden"><small></small><b></b><span></span></div>
      <div class="st-dialog hidden"><div class="nm"></div><div class="tx"></div><ol class="ch"></ol><div class="hint"></div></div>
    </div>`);
    root.appendChild(this.el);
    const q = (s) => this.el.querySelector(s);
    this.e = { marks: q('.st-npcmarks'), black: q('.st-black'), card: q('.st-card'), bars: q('.st-bars'), subs: q('.st-subs'), hold: q('.st-hold'), holdTxt: q('.st-hold .txt'), holdBar: q('.st-hold .bar i'),
      skip: q('.st-skip'), skipTxt: q('.st-skip .txt'), skipRing: q('.st-skip .ring i'), banner: q('.st-banner'), dlg: q('.st-dialog'), dlgName: q('.st-dialog .nm'), dlgText: q('.st-dialog .tx'), dlgCh: q('.st-dialog .ch'), dlgHint: q('.st-dialog .hint') };
    this.subT = 0; this.cardT = 0; this.bannerT = 0; this.markPool = new Map();
    // Quest tracker lives in the HUD's top-right track (hidden with the HUD in cut-scenes / Drum Burst).
    const track = game.ui.hudView?.e?.track;
    this.tracker = h('<div class="h-quest"><div class="qt"></div><div class="qw"></div><div class="qs"></div></div>');
    this.trackerTitle = h('<div class="h-qtitle"></div>');
    if (track) { track.insertBefore(this.trackerTitle, track.querySelector('.h-obj')); track.insertBefore(this.tracker, track.querySelector('.h-points')); }
    this.lastTracker = '';
  }
  t(k, v) { return this.i18n.t(k, v); }

  // ------------------------------------------------------------- cut-scene
  cinematic(on) {
    this.el.classList.toggle('cin', !!on);
    this.e.bars.classList.toggle('hidden', !on);
    if (!on) { this.black(false); this.hold(null); this.skip(null); this.subtitle('', ''); this.card(null); }
  }
  black(on) { this.e.black.classList.toggle('hidden', !on); }
  card(text, seconds = 4) { this.e.card.textContent = text ?? ''; this.e.card.classList.toggle('on', !!text); this.cardT = text ? seconds : 0; }
  /** Subtitle (cut-scene or bark). speaker: display name or ''. song: italic verse. */
  subtitle(speaker, text, seconds = 3, song = false) {
    this.e.subs.innerHTML = text ? `<span class="line${song ? ' song' : ''}">${speaker ? `<span class="speaker">${esc(speaker)}</span>` : ''}${esc(text)}</span>` : '';
    this.subT = text ? seconds : 0;
    this.lastSub = text ? { speaker, text } : null;
  }
  /** Hold prompt for an interactive shot: { text (html-safe glyph + label), progress } or null. */
  hold(s) {
    this.e.hold.classList.toggle('hidden', !s);
    if (!s) return;
    if (this._holdHtml !== s.html) { this.e.holdTxt.innerHTML = s.html; this._holdHtml = s.html; }
    this.e.holdBar.style.width = `${(100 * s.progress).toFixed(0)}%`;
  }
  skip(s) {
    this.e.skip.classList.toggle('hidden', !s);
    if (!s) return;
    if (this._skipTxt !== s.text) { this.e.skipTxt.textContent = s.text; this._skipTxt = s.text; }
    this.e.skip.classList.toggle('active', s.progress > 0);
    this.e.skipRing.style.width = `${(100 * s.progress).toFixed(0)}%`;
  }

  // ------------------------------------------------------------- banners (quest started / done)
  banner(small, title, line = '', seconds = 4) {
    const b = this.e.banner;
    b.children[0].textContent = small; b.children[1].textContent = title; b.children[2].textContent = line;
    b.classList.remove('hidden'); b.classList.remove('in'); void b.offsetWidth; b.classList.add('in');
    this.bannerT = seconds;
  }

  // ------------------------------------------------------------- dialogue box
  /** s: null | { name, text, choices?: [label], focus, hint (html-safe) } */
  dialog(s) {
    const d = this.e;
    d.dlg.classList.toggle('hidden', !s);
    if (!s) { this._dlgKey = null; return; }
    const key = `${s.name}|${s.text}|${(s.choices ?? []).join('|')}|${s.hint}`;
    if (this._dlgKey !== key) {
      this._dlgKey = key;
      d.dlgName.textContent = s.name ?? ''; d.dlgName.classList.toggle('hidden', !s.name);
      d.dlgText.textContent = s.text ?? '';
      d.dlgText.classList.toggle('hidden', !s.text);
      d.dlgCh.innerHTML = (s.choices ?? []).map((c, i) => `<li><button data-choice="${i}"><span class="kbd">${i + 1}</span>${esc(c)}</button></li>`).join('');
      for (const b of d.dlgCh.querySelectorAll('[data-choice]')) b.addEventListener('click', () => this.onChoice?.(+b.dataset.choice));
      d.dlgHint.innerHTML = s.hint ?? '';
    }
    [...d.dlgCh.querySelectorAll('[data-choice]')].forEach((b, i) => b.classList.toggle('focus', i === s.focus));
  }

  // ------------------------------------------------------------- quest tracker (HUD top-right)
  /** s: null | { title, step, prog, why, side: [{ title, objective, prog }] } (the objective itself is the HUD's .h-obj). */
  setTracker(s) {
    const key = JSON.stringify(s);
    if (key === this.lastTracker) return;
    const changed = this.lastTracker && s && JSON.parse(this.lastTracker || 'null')?.step !== s.step;
    this.lastTracker = key;
    this.trackerTitle.textContent = s?.title ?? '';
    this.trackerTitle.classList.toggle('hidden', !s?.title);
    const q = this.tracker;
    q.classList.toggle('hidden', !s);
    if (!s) return;
    q.querySelector('.qt').textContent = s.prog ?? '';
    q.querySelector('.qw').textContent = s.why ? `${this.t('quest_why')}: ${s.why}` : '';
    q.querySelector('.qs').innerHTML = (s.side ?? []).map((x) => `<div class="side"><b>${esc(x.title)}</b><span>${esc(x.objective)}${x.prog ? ` (${esc(x.prog)})` : ''}</span></div>`).join('');
    if (changed) { const o = q.parentElement?.querySelector('.h-obj'); if (o) { o.classList.remove('new'); void o.offsetWidth; o.classList.add('new'); } }
  }

  // ------------------------------------------------------------- NPC markers
  /** list: [{ id, sx, sy, visible }] diamond above NPCs with something new to say. */
  marks(list) {
    const seen = new Set();
    for (const m of list) {
      seen.add(m.id);
      let el = this.markPool.get(m.id);
      if (!el) { el = h('<i class="st-mark"></i>'); this.e.marks.appendChild(el); this.markPool.set(m.id, el); }
      el.style.display = m.visible ? '' : 'none';
      if (m.visible) { el.style.left = `${m.sx.toFixed(0)}px`; el.style.top = `${m.sy.toFixed(0)}px`; }
    }
    for (const [id, el] of this.markPool) if (!seen.has(id)) { el.remove(); this.markPool.delete(id); }
  }

  tick(dt) {
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) { this.e.subs.innerHTML = ''; this.lastSub = null; } }
    if (this.cardT > 0) { this.cardT -= dt; if (this.cardT <= 0) this.card(null); }
    if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) this.e.banner.classList.add('hidden'); }
  }
}
