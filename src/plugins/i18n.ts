import { createI18n } from "vue-i18n";

import enMessages from "../translations/en.json";

/*
 * Lazy-loaded i18n setup (Streamloader bundle-split, batch ZZZ3).
 *
 * Previously every locale JSON file was bundled eagerly via the
 * `@intlify/unplugin-vue-i18n/messages` virtual module (~2.4 MB raw, ~600 KB
 * gzipped). Even after the BBB3 chunk-split that payload still loaded on
 * first paint because the import itself was synchronous.
 *
 * Now we ship only the `en` baseline at startup (it doubles as the fallback
 * locale, so it must be present synchronously for `<i18n-t>` and `t()`).
 * Every other locale lives in its own dynamically-imported chunk that is
 * fetched on-demand the first time the user (or stored preference) selects
 * it. The English-only user — i.e. the vast majority — never downloads any
 * of the other ~28 locale files.
 */

// Vite's import.meta.glob discovers every locale JSON at build time and
// generates one async chunk per file. We never call the loader for `en`
// because we already statically imported it above.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const localeModules = import.meta.glob<{ default: any }>(
  "../translations/*.json",
);

// Derive the list of available locales from the glob keys so the language
// picker in FrontendConfig.vue can populate without having to load any of
// the (heavy) locale message bodies.
const availableLocales: string[] = Object.keys(localeModules)
  .map((path) => {
    const match = path.match(/\.\.\/translations\/(.+)\.json$/);
    return match ? match[1] : null;
  })
  .filter((x): x is string => x !== null)
  .sort();

const loadedLocales = new Set<string>(["en"]);

const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: "en",
  fallbackLocale: "en",
  missingWarn: false,
  fallbackWarn: false,
  silentTranslationWarn: true,
  // Only the fallback locale is loaded synchronously. All others are
  // installed via setLocaleMessage after their async chunk resolves.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  messages: { en: enMessages as any },
});

/**
 * Dynamically load a locale's messages and install them on the i18n
 * instance. No-ops for `en` (already loaded) or any locale we've already
 * fetched in this session.
 */
async function loadLocaleMessages(locale: string): Promise<void> {
  if (!locale || loadedLocales.has(locale)) return;
  const loader = localeModules[`../translations/${locale}.json`];
  if (!loader) return;
  try {
    const mod = await loader();
    const messages = mod.default ?? mod;
    i18n.global.setLocaleMessage(locale, messages);
    loadedLocales.add(locale);
  } catch (err) {
    console.warn(`[i18n] Failed to load locale "${locale}"`, err);
  }
}

/**
 * Set the active locale, lazy-loading its message bundle first if needed.
 * Safe to call repeatedly with the same locale.
 */
async function setLocale(locale: string): Promise<void> {
  await loadLocaleMessages(locale);
  // i18n.global.locale is a Ref in legacy:false (Composition API) mode.
  (i18n.global.locale as unknown as { value: string }).value = locale;
}

// Eagerly kick off the user's preferred locale (browser default or stored
// preference). We don't await it — the UI renders against `en` first, then
// re-renders reactively once the chunk lands. The fallback chain ensures
// no missing-key flicker in the meantime.
const browserLocale = navigator.language?.split("-")[0] ?? "en";
const storedLocale = (() => {
  try {
    return localStorage.getItem("frontend.settings.language");
  } catch {
    return null;
  }
})();
const initialLocale =
  storedLocale && storedLocale !== "auto" ? storedLocale : browserLocale;
if (initialLocale && initialLocale !== "en") {
  void setLocale(initialLocale);
}

// @ts-ignore
const $t = i18n.global.t;

export { $t, i18n, loadLocaleMessages, setLocale, availableLocales };
