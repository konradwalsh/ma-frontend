// Shared vue-i18n mock helpers for component tests.
//
// Background: vue-i18n's `useI18n()` throws "Need to install with `app.use`
// function" when called outside an installed plugin. Several Streamloader
// components were updated mid-batch to call `useI18n()` for translated
// strings, which broke the existing tests that mount them directly without
// installing the plugin. Rather than wire the real i18n plugin into every
// test (which would couple tests to the live translation file and pull in
// a lot of Vuetify/intlify side-effects), we mock `vue-i18n` with a
// translator that resolves keys against a snapshot of `en.json`.
//
// Use `vueI18nMock` in a `vi.mock("vue-i18n", vueI18nMock)` call, or
// reach for `translate(key, params)` in custom mocks.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

type Params = Record<string, unknown> | undefined;

// We can't `import` en.json directly because @intlify/unplugin-vue-i18n
// pre-compiles it into AST nodes (each leaf becomes
// `{ source: "...", body: {...} }`), which makes a key-walk return
// objects instead of strings. Read the raw JSON off disk so the test
// translator sees the original string values.
const __dirname = dirname(fileURLToPath(import.meta.url));
const enPath = resolve(__dirname, "../src/translations/en.json");
const en: Record<string, unknown> = JSON.parse(readFileSync(enPath, "utf-8"));

// Walk a dotted key path through the translation tree. Returns the key
// itself if the path doesn't resolve to a string — that way assertions
// against the raw key still surface obvious typos in tests.
const resolveKey = (key: string): string => {
  const parts = key.split(".");
  let cursor: unknown = en;
  for (const part of parts) {
    if (cursor && typeof cursor === "object" && part in (cursor as object)) {
      cursor = (cursor as Record<string, unknown>)[part];
    } else {
      return key;
    }
  }
  return typeof cursor === "string" ? cursor : key;
};

// vue-i18n style {placeholder} interpolation — enough for test purposes.
const interpolate = (template: string, params: Params): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = (params as Record<string, unknown>)[name];
    return value === undefined || value === null ? `{${name}}` : String(value);
  });
};

export const translate = (key: string, params?: Params): string =>
  interpolate(resolveKey(key), params);

// Drop-in factory for `vi.mock("vue-i18n", vueI18nMock)`.
export const vueI18nMock = () => ({
  useI18n: () => ({
    t: (key: string, params?: Params) => translate(key, params),
    te: (_key: string) => true,
  }),
});
