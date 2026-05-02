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
  showFloatingHealthPill: boolean;
}

// All-on by default — these features are the whole point of the fork. Users
// who want a quieter UI flip them off in the new Streamloader settings page.
//
// `showFloatingHealthPill` is the exception: it defaults OFF because the
// provider status is now surfaced as a small dot next to the "streamloader"
// sidebar item. The floating top-right pill remains an opt-in for users who
// preferred the older always-visible badge.
export const DEFAULT_STREAMLOADER_PREFS: StreamloaderPrefDefaults = {
  showLibraryStats: true,
  showSourceBadge: true,
  showActivityPulse: true,
  showRecentlyDownloaded: true,
  announceQueueChanges: true,
  showFloatingHealthPill: false,
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

/* ──────────────────────────────────────────────────────────────────────
   String-valued preferences
   ──────────────────────────────────────────────────────────────────────
   Boolean toggles cover most of the streamloader UX knobs, but a few
   features need an enum — e.g. `media_display_kind` (vinyl / cd /
   cassette / none) — so the album-cover companion can be swapped from
   the streamloader settings page WITHOUT a window reload. Same custom-
   event broadcast pattern as the boolean helper above keeps consumers
   in lockstep across the same tab. */

export type MediaDisplayKind =
  | "vinyl"
  | "vinyl-photo"
  | "cd"
  | "cassette"
  | "none";

export interface StreamloaderStringPrefDefaults {
  media_display_kind: MediaDisplayKind;
}

export const DEFAULT_STREAMLOADER_STRING_PREFS: StreamloaderStringPrefDefaults =
  {
    // Default to vinyl so the existing visual + behaviour is preserved
    // for everyone who hasn't explicitly picked a different kind. The
    // existing `vinyl_display_mode` (hover / always / spinning) still
    // applies — kind is the *what*, mode is the *how*.
    media_display_kind: "vinyl",
  };

const stringStorageKey = (key: keyof StreamloaderStringPrefDefaults): string =>
  `${PREFIX}${key}`;

const readString = <K extends keyof StreamloaderStringPrefDefaults>(
  key: K,
  fallback: StreamloaderStringPrefDefaults[K],
  validValues: ReadonlyArray<StreamloaderStringPrefDefaults[K]>,
): StreamloaderStringPrefDefaults[K] => {
  const raw = localStorage.getItem(stringStorageKey(key));
  if (raw === null) return fallback;
  // Defensive cast through unknown — allows the runtime-validated string
  // to satisfy the narrowed enum type without `any`.
  return (validValues as ReadonlyArray<string>).includes(raw)
    ? (raw as unknown as StreamloaderStringPrefDefaults[K])
    : fallback;
};

const MEDIA_DISPLAY_KIND_VALUES: ReadonlyArray<MediaDisplayKind> = [
  "vinyl",
  "vinyl-photo",
  "cd",
  "cassette",
  "none",
];

/**
 * Reactive Ref<MediaDisplayKind> that stays in sync across components in
 * the same tab and across tabs. Same lifecycle pattern as
 * `useStreamloaderPref` — listens for both the `storage` event (cross-
 * tab) and the synthetic `streamloader-prefs:changed` event (same-tab).
 */
export function useMediaDisplayKind(): Ref<MediaDisplayKind> {
  const fallback = DEFAULT_STREAMLOADER_STRING_PREFS.media_display_kind;
  const valueRef = ref<MediaDisplayKind>(
    readString("media_display_kind", fallback, MEDIA_DISPLAY_KIND_VALUES),
  );

  const refresh = () => {
    const next = readString(
      "media_display_kind",
      fallback,
      MEDIA_DISPLAY_KIND_VALUES,
    );
    if (next !== valueRef.value) valueRef.value = next;
  };

  const onStorage = (ev: StorageEvent) => {
    if (ev.key === stringStorageKey("media_display_kind")) refresh();
  };
  const onLocalChange = (ev: Event) => {
    const detail = (ev as CustomEvent<{ key: string }>).detail;
    if (!detail || detail.key === stringStorageKey("media_display_kind"))
      refresh();
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

export function setMediaDisplayKind(next: MediaDisplayKind): void {
  localStorage.setItem(stringStorageKey("media_display_kind"), next);
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, {
      detail: { key: stringStorageKey("media_display_kind") },
    }),
  );
}

/**
 * Synchronous read for non-reactive call sites (e.g. mounting-time
 * snapshots in InfoHeader / PlayerFullscreen).
 */
export function readMediaDisplayKind(): MediaDisplayKind {
  return readString(
    "media_display_kind",
    DEFAULT_STREAMLOADER_STRING_PREFS.media_display_kind,
    MEDIA_DISPLAY_KIND_VALUES,
  );
}
