/**
 * useArtworkOverrides.ts
 *
 * Streamloader-fork addition: client-side artwork override store.
 *
 * Background — StreamloaderEditArtworkDialog (batch 32) lets the user paste
 * a URL or upload an image to override an item's auto-detected cover when
 * the upstream metadata match was wrong. Backend persistence is a follow-up;
 * for now overrides live in localStorage under `streamloader-artwork-overrides`,
 * keyed by item_id. This composable wraps that storage in a reactive Map so
 * any artwork render site can subscribe and re-render the moment a user
 * applies an override — delivering immediate perceived value from the dialog.
 *
 * Single source of truth:
 *   - Map<item_id, OverrideEntry> in module scope (shared across all callers)
 *   - localStorage is the persistence layer; we hydrate on init and write on
 *     every mutation
 *
 * Edge cases:
 *   - localStorage parse failures → start empty (don't throw)
 *   - localStorage quota exceeded on write → caller decides; setOverride
 *     returns false on failure so callers can toast
 *   - Override URL itself fails to load → call sites pass an @error handler
 *     that falls back to the original auto-detected URL (override stays
 *     stored — the user can clear it explicitly via a future Reset UX)
 */
import { computed, ref, type ComputedRef } from "vue";

export type OverrideSource = "url" | "upload";

export interface OverrideEntry {
  source: OverrideSource;
  /** raw https URL OR base64 data: URL (for uploaded images) */
  value: string;
  /** ISO timestamp — when the user applied the override */
  queued_at: string;
}

const STORAGE_KEY = "streamloader-artwork-overrides";

type OverrideMap = Record<string, OverrideEntry>;

/**
 * Hydrate from localStorage on module init. Defensive: malformed JSON or
 * missing window (SSR scenario, though MA frontend is SPA-only) silently
 * yields an empty map rather than throwing during component setup.
 */
function loadInitial(): Map<string, OverrideEntry> {
  if (typeof window === "undefined") return new Map();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as OverrideMap;
    return new Map(Object.entries(parsed));
  } catch {
    return new Map();
  }
}

// Module-scope reactive map shared by all callers — Vue's reactivity tracks
// Map mutations so consumer components re-render when entries change. ref()
// wrapping ensures the .value reassignment from clear() also triggers.
const overridesRef = ref<Map<string, OverrideEntry>>(loadInitial());

function persist(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const obj: OverrideMap = Object.fromEntries(overridesRef.value);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    return true;
  } catch {
    // QuotaExceededError is the realistic failure mode here, typically when
    // a very large base64-encoded upload pushes total localStorage past
    // ~5MB. Caller can react to the false return.
    return false;
  }
}

/**
 * Mutation-oriented composable for the artwork-override store.
 *
 * Use this in components that need to READ AND WRITE overrides (the
 * EditArtworkDialog Apply handler, a future "Reset cover" menu item).
 * Render-only sites should prefer `useArtworkOverrideUrl(itemId)` below
 * which returns just a reactive URL ComputedRef.
 *
 * Returned API:
 *   - `overrides`      — the underlying reactive `Map<string, OverrideEntry>`
 *                        (read-only intent; mutate via the helpers)
 *   - `getOverride`    — synchronous lookup by item_id
 *   - `setOverride`    — store/replace an override; returns `false` if
 *                        localStorage write failed (typically QuotaExceeded
 *                        for very large base64 uploads)
 *   - `removeOverride` — delete an override; returns `true` even if the id
 *                        wasn't present (idempotent)
 */
export function useArtworkOverrides() {
  const getOverride = (
    itemId: string | undefined,
  ): OverrideEntry | undefined => {
    if (!itemId) return undefined;
    return overridesRef.value.get(itemId);
  };

  const setOverride = (
    itemId: string,
    source: OverrideSource,
    value: string,
  ): boolean => {
    if (!itemId || !value) return false;
    // Reassign the Map to a new instance so Vue's reactivity is unambiguously
    // notified — Map.set on a ref-wrapped Map IS tracked, but the reassign
    // is cheap insurance against any consumer that captures .value once.
    const next = new Map(overridesRef.value);
    next.set(itemId, {
      source,
      value,
      queued_at: new Date().toISOString(),
    });
    overridesRef.value = next;
    return persist();
  };

  const removeOverride = (itemId: string): boolean => {
    if (!itemId) return false;
    if (!overridesRef.value.has(itemId)) return true;
    const next = new Map(overridesRef.value);
    next.delete(itemId);
    overridesRef.value = next;
    return persist();
  };

  return {
    overrides: overridesRef,
    getOverride,
    setOverride,
    removeOverride,
  };
}

/**
 * Reactive helper for render sites: returns a computed ref that resolves to
 * the override URL/data string for the given item_id (or a reactive getter
 * thereof), or undefined when no override exists. Re-evaluates automatically
 * when either the item id changes OR an override is applied/removed.
 *
 * Usage:
 *   const overrideUrl = useArtworkOverrideUrl(() => item.value?.item_id);
 *   const finalUrl = computed(() => overrideUrl.value ?? autoDetectedUrl.value);
 */
export function useArtworkOverrideUrl(
  itemId: string | undefined | (() => string | undefined),
): ComputedRef<string | undefined> {
  return computed(() => {
    const id = typeof itemId === "function" ? itemId() : itemId;
    if (!id) return undefined;
    return overridesRef.value.get(id)?.value;
  });
}
