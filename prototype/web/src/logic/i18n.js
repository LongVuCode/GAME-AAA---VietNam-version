// i18n.js - every display string comes from strings.json / codex.json / other data {vi, en} objects.
export function createI18n(strings, initialLang = 'vi') {
  let lang = initialLang;
  const missing = new Set();
  const listeners = new Set();
  return {
    get lang() { return lang; },
    setLang(next) {
      if (next !== 'vi' && next !== 'en') throw new Error(`unsupported lang ${next}`);
      lang = next;
      for (const fn of listeners) fn(lang);
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    /** Localized UI string by key. */
    t(key, vars) {
      const entry = strings.ui[key];
      if (!entry) { missing.add(key); return `⟨${key}⟩`; }
      let s = entry[lang] ?? entry.vi;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    /** Localized value of a {vi, en} object from any data file. */
    loc(obj) {
      if (!obj) return '';
      return obj[lang] ?? obj.vi ?? '';
    },
    dialogue(id) {
      const d = strings.dialogue.find((x) => x.id === id);
      if (!d) { missing.add(`dialogue:${id}`); return null; }
      return d;
    },
    has(key) { return !!strings.ui[key]; },
    missingKeys() { return [...missing]; },
  };
}
