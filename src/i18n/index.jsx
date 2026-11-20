import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ar from './ar.js';
import en from './en.js';
import { getSettings, saveSettings } from '../lib/storage.js';

const DICTS = { ar, en };
const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => getSettings().lang || 'ar');

  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang;
    html.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const setLang = useCallback((l) => {
    saveSettings({ lang: l });
    setLangState(l);
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
      return s;
    },
    [lang],
  );

  /** Pick a localized field: pick(obj, 'name') -> obj.nameAr / obj.nameEn */
  const pick = useCallback(
    (obj, base = 'name') => {
      if (!obj) return '';
      const ar = obj[`${base}Ar`] ?? obj.ar;
      const en = obj[`${base}En`] ?? obj.en;
      return (lang === 'ar' ? ar || en : en || ar) || '';
    },
    [lang],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, pick, dir: lang === 'ar' ? 'rtl' : 'ltr', toggle: () => setLang(lang === 'ar' ? 'en' : 'ar') }),
    [lang, setLang, t, pick],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export const useI18n = () => useContext(I18nContext);
