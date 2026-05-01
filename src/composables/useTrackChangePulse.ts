/**
 * useTrackChangePulse.ts
 *
 * Streamloader-fork addition (batch AAA5): emit a short-lived `pulseActive`
 * ref that flips true for ~400ms whenever the now-playing track transitions
 * to a NEW item. Used by Player.vue (mini), PlayerFullscreen.vue (hero),
 * and InfoHeader.vue (when the displayed item is the now-playing item) to
 * drive a subtle cover-art scale pulse — a soft "this just started" cue
 * that reinforces the streamloader brand without being intrusive.
 *
 * Why a shared module:
 *   - `curQueueItem.queue_item_id` is the authoritative track-identity
 *     signal across the app; centralising the watcher avoids three
 *     independent watch closures double-firing the pulse on the same
 *     transition.
 *   - The debounce window (500ms) is global — if the user mashes "next"
 *     three times in 200ms we flash once, not three times.
 *
 * Filtering:
 *   - The very first observed value is the mount-time snapshot, NOT a
 *     real transition; we record it without firing the pulse so the cue
 *     only appears on actual track changes (autoplay-next, manual skip,
 *     queue start), never on app boot or page nav.
 *   - Falsy → real id is also treated as a transition (queue start).
 *   - Real id → falsy is NOT a pulse (queue cleared / player off).
 *
 * Reduced motion:
 *   - Respects `(prefers-reduced-motion: reduce)`. The CSS animation in
 *     each consumer is also gated by the same media query as a defence-
 *     in-depth, but we additionally skip the JS state flip so subscribers
 *     that bind to `pulseActive` for non-CSS effects also stay quiet.
 */
import { computed, ref, watch } from "vue";
import { store } from "@/plugins/store";

// Module-scope singletons — every consumer subscribes to the same flag.
const pulseActive = ref(false);
let pulseTimeout: ReturnType<typeof setTimeout> | null = null;
let lastPulseAt = 0;
let initialized = false;

// Debounce: ignore a second pulse request within this window of the last
// successful pulse start. ~500ms covers a typical rapid-skip burst while
// still letting a steady track-change cadence breathe.
const DEBOUNCE_MS = 500;
// Visible-state duration: matches the cover-art keyframe length so the
// flag flips false right when the animation completes.
const PULSE_DURATION_MS = 420;

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
};

const triggerPulse = () => {
  if (prefersReducedMotion()) return;
  const now = Date.now();
  if (now - lastPulseAt < DEBOUNCE_MS) return;
  lastPulseAt = now;
  if (pulseTimeout) clearTimeout(pulseTimeout);
  // Force a clean off→on edge so a back-to-back trigger restarts the
  // CSS animation (same-value writes don't restart a Vue-bound class).
  pulseActive.value = false;
  // Schedule on next frame to guarantee the off-edge commits before on.
  requestAnimationFrame(() => {
    pulseActive.value = true;
    pulseTimeout = setTimeout(() => {
      pulseActive.value = false;
      pulseTimeout = null;
    }, PULSE_DURATION_MS);
  });
};

const ensureInitialized = () => {
  if (initialized) return;
  initialized = true;
  watch(
    () => store.curQueueItem?.queue_item_id,
    (next, prev) => {
      // Mount-time snapshot — do not pulse on app boot.
      if (prev === undefined && next !== undefined) return;
      // Track cleared (player off / queue empty) — no pulse.
      if (!next) return;
      // Same id reported twice in a row — defensive no-op.
      if (next === prev) return;
      triggerPulse();
    },
    { immediate: true },
  );
};

/**
 * Subscribe to the global track-change pulse signal.
 *
 * @returns `pulseActive` — a readonly ref that is `true` for ~420ms after
 *   the now-playing track transitions to a new queue item, then `false`.
 *   Bind this to a class on the cover element you want to pulse.
 */
export function useTrackChangePulse() {
  ensureInitialized();
  return {
    pulseActive: computed(() => pulseActive.value),
  };
}
