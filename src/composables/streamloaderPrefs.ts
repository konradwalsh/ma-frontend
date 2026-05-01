/**
 * streamloaderPrefs.ts
 *
 * Centralized reactive accessors for streamloader-fork UI toggles.
 *
 * All keys live under the `frontend.settings.streamloader.*` localStorage
 * namespace so they round-trip cleanly with the existing FrontendConfig
 * persistence pattern (see FrontendConfig.vue) and stay separate from
 * upstream Music Assistant settings — keeps merge surface low.
 *
 * Why a custom event instead of pulling in @vueuse/useStorage:
 *   - We want the toggles in the new Streamloader settings page to update
 *     the consumer components LIVE without a reload, and consumer renders
 *     happen across many components (sidebar / home rail / track thumbs).
 *   - localStorage's native `storage` event only fires across DIFFERENT
 *     tabs, not within the same tab. We dispatch a synthetic
 *     `streamloader-prefs:changed` window event on every write so all
 *     refs created by `useStreamloaderPref` re-read in the same tick.
 */
import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";

const PREFIX = "frontend.settings.streamloader.";
const CHANGE_EVENT = "streamloader-prefs:changed";

export interface StreamloaderPrefDefaults {
  showLibraryStats: boolean;
  showSourceBadge: boolean;
  showActivityPulse: boolean;
  showRecentlyDownloaded: boolean;
  announceQueueChanges: boolean;
}

// All-on by default — these features are the whole point of the fork. Users
// who want a quieter UI flip them off in the new Streamloader settings page.
export const DEFAULT_STREAMLOADER_PREFS: StreamloaderPrefDefaults = {
  showLibraryStats: true,
  showSourceBadge: true,
  showActivityPulse: true,
  showRecentlyDownloaded: true,
  announceQueueChanges: true,
};

const storageKey = (key: keyof StreamloaderPrefDefaults): string =>
  `${PREFIX}${key}`;

const readBool = (
  key: keyof StreamloaderPrefDefaults,
  fallback: boolean,
): boolean => {
  const raw = localStorage.getItem(storageKey(key));
  if (raw === null) return fallback;
  return raw !== "false";
};

/**
 * Read a single streamloader boolean preference as a Ref<boolean> that
 * stays in sync across all components in the same tab. Returns the bare
 * ref so it auto-unwraps cleanly when destructured into a `<script
 * setup>` top-level binding (`const enabled = useStreamloaderPref(...)`
 * + `<div v-if="enabled">`). Use `setStreamloaderPref` to mutate.
 */
export function useStreamloaderPref(
  key: keyof StreamloaderPrefDefaults,
): Ref<boolean> {
  const fallback = DEFAULT_STREAMLOADER_PREFS[key];
  const valueRef = ref<boolean>(readBool(key, fallback));

  const refresh = () => {
    const next = readBool(key, fallback);
    if (next !== valueRef.value) valueRef.value = next;
  };

  // Listen for both cross-tab (`storage`) and same-tab (custom) updates so
  // a toggle flipped in the settings page reaches every consumer component
  // immediately, not just after navigation/reload.
  const onStorage = (ev: StorageEvent) => {
    if (ev.key === storageKey(key)) refresh();
  };
  const onLocalChange = (ev: Event) => {
    const detail = (ev as CustomEvent<{ key: string }>).detail;
    if (!detail || detail.key === storageKey(key)) refresh();
  };

  onMounted(() => {
    window.addEventListener("storage", onStorage);
    window.addEventListener(CHANGE_EVENT, onLocalChange);
  });
  onBeforeUnmount(() => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, onLocalChange);
  });

  return valueRef;
}

/**
 * Imperative setter — write through to localStorage and broadcast so all
 * `useStreamloaderPref` refs (in this tab) refresh on the next tick.
 * Standalone (not returned from the composable) so it can be called
 * outside of a setup() context if needed.
 */
export function setStreamloaderPref(
  key: keyof StreamloaderPrefDefaults,
  next: boolean,
): void {
  localStorage.setItem(storageKey(key), next ? "true" : "false");
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: { key: storageKey(key) } }),
  );
}

/**
 * Synchronous read for non-reactive call sites (e.g. early bootstrap or
 * imperative checks inside event handlers). Component templates should
 * prefer `useStreamloaderPref` so the UI re-renders on toggle.
 */
export function readStreamloaderPref(
  key: keyof StreamloaderPrefDefaults,
): boolean {
  return readBool(key, DEFAULT_STREAMLOADER_PREFS[key]);
}
