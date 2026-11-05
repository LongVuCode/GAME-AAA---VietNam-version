// ui/inventory/icons.js - line icons (inline SVG, currentColor) for pack slots, gear, items and Thế võ.
// Plain geometric drawings of the objects themselves [SÁNG TẠO]; no icon of another game is copied.

const svg = (body, vb = 48) => `<svg viewBox="0 0 ${vb} ${vb}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const ITEM_ICONS = {
  // weapons
  wp_giao_dong: svg('<path d="M10 38 L34 14"/><path d="M34 14 L40 6 L42 8 L36 16 Z" fill="currentColor"/><path d="M14 31 l3 3"/>'),
  wp_riu_xeo: svg('<path d="M14 40 L30 16"/><path d="M27 12 C34 8 42 12 42 20 C38 18 33 19 30 22 Z" fill="currentColor" fill-opacity=".35"/>'),
  // armor
  ar_khan_gai: svg('<path d="M10 26 C10 14 38 14 38 26"/><path d="M9 26 C16 22 32 22 39 26 C32 30 16 30 9 26 Z"/><path d="M38 26 l5 6 M37 28 l2 8"/>'),
  ar_ao_gai_cham: svg('<path d="M17 8 L24 13 L31 8 L41 14 L37 22 L33 20 L33 40 L15 40 L15 20 L11 22 L7 14 Z"/><path d="M15 30 H33" stroke-dasharray="2 3"/>'),
  ar_vong_tay_ong: svg('<rect x="10" y="12" width="10" height="24" rx="4"/><rect x="28" y="12" width="10" height="24" rx="4"/><path d="M10 18 H20 M10 30 H20 M28 18 H38 M28 30 H38"/>'),
  ar_quan_chan_vo_cay: svg('<path d="M14 8 V36 L10 42 H20 V8"/><path d="M28 8 V42 H38 L34 36 V8"/><path d="M14 16 L20 19 M14 24 L20 27 M28 16 L34 19 M28 24 L34 27"/>'),
  // trinkets
  tr_chuong_dong_nho: svg('<path d="M24 8 v4"/><path d="M14 34 C14 20 17 12 24 12 C31 12 34 20 34 34 Z"/><path d="M11 34 H37"/><circle cx="24" cy="39" r="2.5" fill="currentColor"/>'),
  tr_chuoi_hat_dat: svg('<circle cx="24" cy="10" r="3"/><circle cx="34" cy="14" r="3"/><circle cx="38" cy="24" r="3"/><circle cx="34" cy="34" r="3"/><circle cx="24" cy="38" r="3"/><circle cx="14" cy="34" r="3"/><circle cx="10" cy="24" r="3"/><circle cx="14" cy="14" r="3"/>'),
  // bảo khí + materials + consumables
  bk_nanh_dam: svg('<path d="M14 40 C14 22 22 10 38 8 C30 16 26 26 24 40 Z" fill="currentColor" fill-opacity=".3"/><path d="M14 40 H24"/>'),
  mat_nanh_rung: svg('<path d="M16 40 C16 24 24 12 36 10 C30 18 27 28 26 40 Z"/>'),
  mat_day_may: svg('<ellipse cx="24" cy="24" rx="14" ry="9"/><ellipse cx="24" cy="24" rx="8" ry="4"/><path d="M38 24 l4 8"/>'),
  mat_dong_lo_lang: svg('<path d="M10 32 L18 16 L34 14 L40 28 L28 36 Z" fill="currentColor" fill-opacity=".25"/>'),
  mat_sap_ong_cu: svg('<path d="M24 8 L36 15 V31 L24 38 L12 31 V15 Z"/><path d="M24 16 L30 20 V28 L24 32 L18 28 V20 Z"/>'),
  mat_thiec_song: svg('<path d="M8 30 L16 20 H38 L40 30 Z"/><path d="M8 30 H40 V34 H8 Z" fill="currentColor" fill-opacity=".3"/>'),
  mat_soi_gai: svg('<path d="M10 36 C18 28 18 18 12 10"/><path d="M18 38 C26 28 26 18 20 10"/><path d="M26 38 C34 28 34 18 28 10"/><path d="M8 24 H34"/>'),
  it_nam_com_la: svg('<path d="M8 30 L24 12 L40 30 L24 38 Z"/><path d="M24 12 V38"/><path d="M8 30 L40 30" stroke-dasharray="3 3"/>'),
  it_cu_sung: svg('<ellipse cx="22" cy="30" rx="12" ry="8"/><path d="M28 23 C30 16 34 12 40 10"/><path d="M18 28 h2 M24 32 h2"/>'),
  it_la_ngai: svg('<path d="M12 38 C12 20 22 10 38 10 C38 26 28 38 12 38 Z"/><path d="M12 38 L30 18"/>'),
};

export const SLOT_ICONS = {
  weapon_1: ITEM_ICONS.wp_giao_dong, weapon_2: ITEM_ICONS.wp_riu_xeo, head: ITEM_ICONS.ar_khan_gai, body: ITEM_ICONS.ar_ao_gai_cham,
  hands: ITEM_ICONS.ar_vong_tay_ong, legs: ITEM_ICONS.ar_quan_chan_vo_cay, trinket_1: ITEM_ICONS.tr_chuong_dong_nho, trinket_2: ITEM_ICONS.tr_chuoi_hat_dat,
  bao_khi: ITEM_ICONS.bk_nanh_dam,
};

export const LOCK_ICON = svg('<rect x="13" y="22" width="22" height="16" rx="2"/><path d="M17 22 V16 C17 8 31 8 31 16 V22"/>');

/** Thế võ emblems: a diamond frame with a motion glyph per art. */
export const SKILL_ICONS = {
  sk_giao_cam_sao_vot: '<path d="M14 36 C18 20 26 14 34 12"/><path d="M34 12 L30 30"/><path d="M27 33 l3 -3 3 3"/>',
  sk_giao_quet_song: '<path d="M12 26 A12 12 0 1 0 24 14"/><path d="M24 14 l-4 -3 M24 14 l-3 4"/>',
  sk_riu_bo_don_cay: '<path d="M16 34 L30 16"/><path d="M28 12 C34 10 38 14 37 20 L31 19 Z"/><path d="M12 38 H36"/>',
  sk_riu_moc_thuyen: '<path d="M14 30 C14 20 22 14 32 16"/><path d="M32 16 l-2 6 M32 16 l-6 -1"/><path d="M12 36 H22"/>',
};
export function skillEmblem(id) {
  return `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M24 2 L46 24 L24 46 L2 24 Z" stroke-width="1.6" opacity=".7"/>${SKILL_ICONS[id] ?? '<circle cx="24" cy="24" r="6"/>'}</svg>`;
}

/** Rank pips as small diamonds: filled up to `level` of `max`. */
export function rankDiamonds(level, max, cls = '') {
  return `<span class="pk-dia ${cls}">${Array.from({ length: max }, (_, i) => `<i class="${i < level ? 'on' : ''}"></i>`).join('')}</span>`;
}
