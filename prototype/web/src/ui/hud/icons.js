// icons.js - inline SVG icons of the HUD (drawn here, no external images). All shapes are
// [SÁNG TẠO] graybox placeholders: simplified weapon silhouettes after the weapon basis in
// weapons.json (spear with a leaf blade; asymmetric "rìu xéo" axe), not copies of any artefact.

/** Bronze gradient used by the icons (one <defs> per icon so each SVG stands alone). */
const defs = (id) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#ffe7b0"/><stop offset="0.45" stop-color="#d9a35a"/><stop offset="1" stop-color="#8a5a2b"/></linearGradient></defs>`;

export const WEAPON_ICONS = {
  // Spear: long shaft bottom-left -> top-right, leaf blade with midrib, socket rings.
  spear: `<svg viewBox="0 0 64 64" aria-hidden="true">${defs('gSp')}
    <path d="M8 58 L38 28" stroke="#3a2614" stroke-width="7" stroke-linecap="round"/>
    <path d="M8 58 L38 28" stroke="#d2a86e" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M34 30 C35 18 45 9 59 5 C56 19 47 29 34 30 Z" fill="url(#gSp)" stroke="#2a1a0c" stroke-width="1.4"/>
    <path d="M36 28 L57 7" stroke="#7a4c22" stroke-width="1.3"/>
    <path d="M30 31 l4.5 4.5 M33 28 l4.5 4.5" stroke="#ffe7b0" stroke-width="2.2"/>
  </svg>`,
  // Asymmetric axe (rìu xéo): short shaft, slanted blade whose edge sweeps down to one side.
  axe: `<svg viewBox="0 0 64 64" aria-hidden="true">${defs('gAx')}
    <path d="M14 58 L42 12" stroke="#3a2614" stroke-width="7" stroke-linecap="round"/>
    <path d="M14 58 L42 12" stroke="#d2a86e" stroke-width="3.4" stroke-linecap="round"/>
    <path d="M33 22 L41 27 C46 30 52 36 54 46 C46 44 38 40 31 33 C29 30 30 25 33 22 Z" fill="url(#gAx)" stroke="#2a1a0c" stroke-width="1.4"/>
    <path d="M33.5 24 C40 30 46 36 51 43" stroke="#fff1cc" stroke-width="1.1" fill="none" opacity="0.8"/>
    <path d="M30 20 l7 4.5 M28.5 22.5 l7 4.5" stroke="#ffe7b0" stroke-width="1.6"/>
  </svg>`,
};

/** weapons.json id -> icon (fallback by slot: 1 spear, 2 axe). */
export function weaponIconFor(weapon) {
  if (!weapon) return WEAPON_ICONS.spear;
  if (/riu|axe/.test(weapon.id)) return WEAPON_ICONS.axe;
  if (/giao|spear/.test(weapon.id)) return WEAPON_ICONS.spear;
  return weapon.slot === 2 ? WEAPON_ICONS.axe : WEAPON_ICONS.spear;
}

/** Leaf-wrapped rice (Nắm cơm lá): rice triangle in a leaf with a tie. */
export const HEAL_ICON = `<svg viewBox="0 0 32 32" aria-hidden="true">
  <path d="M5 22 C6 12 12 6 16 5 C20 6 26 12 27 22 C21 27 11 27 5 22 Z" fill="#3f8f3a" stroke="#173d16" stroke-width="1.2"/>
  <path d="M16 5 C15 12 15 19 16 26" stroke="#9fd77f" stroke-width="1" fill="none"/>
  <path d="M10 21 L16 10 L22 21 Z" fill="#f4efe0" stroke="#b7ab8f" stroke-width="0.8"/>
  <path d="M5.5 18 C12 20.5 20 20.5 26.5 18" stroke="#c9a06a" stroke-width="1.8" fill="none"/>
</svg>`;

/** Heartbeat line: shown with the red health tier so low health is not read by colour only. */
export const HEARTBEAT_ICON = `<svg viewBox="0 0 32 16" aria-hidden="true"><path d="M1 9 H9 L11.5 3 L15 14 L18 6 L20 9 H31" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`;

/** Bronze ring for the boss khoen notches; `cracked` adds a jagged split and a glint (catches light,
 *  does not glow: ART_DIRECTION 3.4/3.5). */
export function khoenIcon(cracked) {
  return `<svg viewBox="0 0 28 28" aria-hidden="true">
    <circle cx="14" cy="14" r="9.5" fill="none" stroke="#2a2016" stroke-width="5.5"/>
    <circle cx="14" cy="14" r="9.5" fill="none" stroke="${cracked ? '#b07e46' : '#4e6a57'}" stroke-width="3.6"/>
    <circle cx="14" cy="14" r="9.5" fill="none" stroke="${cracked ? '#ffd98f' : '#7c9a86'}" stroke-width="0.9" stroke-dasharray="6 4" opacity="0.7"/>
    ${cracked ? '<path d="M17 2.5 L14.5 8 L18 10.5 L13.5 15" fill="none" stroke="#120c06" stroke-width="2.4" stroke-linejoin="round"/><path d="M17 2.5 L14.5 8 L18 10.5 L13.5 15" fill="none" stroke="#ffe2a6" stroke-width="0.8" stroke-linejoin="round"/>' : ''}
  </svg>`;
}

/** Generic skill glyphs (skills.json may name one in `icon`); unknown -> monogram. */
export const SKILL_ICONS = {
  thrust: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M5 27 L25 7 M19 6 L26 6 L26 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  sweep: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M6 22 C9 10 22 7 27 12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M22 8 L27 12 L21 15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  spin: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 6 A10 10 0 1 1 6.5 13" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/><path d="M4 8 L6.5 13 L11.5 11" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"/></svg>',
  guard: '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 L26 8 C26 18 22 24 16 28 C10 24 6 18 6 8 Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/></svg>',
  drum: '<svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>',
};
