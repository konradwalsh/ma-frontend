<!--
  StreamloaderShortcutsHint.vue (Streamloader-fork)

  Subtle bottom-right pill that surfaces the existence of the keyboard
  shortcuts dialog ("press ? for shortcuts"). Most users never discover
  the help dialog because nothing on the page mentions it — this is the
  fix: a passive, dismissible affordance that teaches the binding once
  and then gets out of the way forever.

  UX rules:
    - Hidden on touch devices (no physical keyboard → no value).
    - Hidden in frameless mode (host shells own their own chrome).
    - Click opens the dialog; the close (×) marks it permanently
      dismissed via localStorage so we never show it again on this
      browser. The user can still hit "?" to open the dialog.
    - Anchored bottom-right so it sits opposite the install prompt
      (bottom-left) — the two never overlap.
    - Respects prefers-reduced-motion (drops the slide-in transition).

  Single source of truth: the displayed key comes from
  getShortcutKeyFor("help") so a future rebind of the help shortcut
  (currently Shift + /) automatically updates this hint too.
-->
<template>
  <transition name="sl-shint-slide">
    <button
      v-if="visible"
      type="button"
      class="sl-shortcuts-hint"
      :aria-label="`${labelText}. Press ${shortcutKey} to open keyboard shortcuts.`"
      @click="openDialog"
    >
      <span class="sl-shortcuts-hint__text">{{ labelText }}</span>
      <kbd class="sl-shortcuts-hint__kbd">{{ displayKey }}</kbd>
      <span
        class="sl-shortcuts-hint__dismiss"
        role="button"
        tabindex="0"
        aria-label="Dismiss shortcut hint"
        @click.stop="dismiss"
        @keydown.enter.stop.prevent="dismiss"
        @keydown.space.stop.prevent="dismiss"
      >
        <!-- Inline × glyph keeps the component fully self-contained
             (no icon-library import for a single character). -->
        ×
      </span>
    </button>
  </transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { store } from "@/plugins/store";
import { getShortcutKeyFor } from "@/composables/useKeyboardShortcuts";

const STORAGE_KEY = "sl-shortcuts-hint-dismissed";

// Shown unless explicitly dismissed (or running in frameless / on a
// touch-only device). The render guard for frameless lives at the call
// site in Default.vue, but we double-gate touch here because that's
// per-device input rather than app context.
const visible = ref(false);

const shortcutKey = getShortcutKeyFor("help");
// Display "?" (the actual character users type) rather than the literal
// "Shift + /" combo — we know the help shortcut produces "?" on every
// QWERTY-derived layout, and the help dialog itself uses "?" in copy.
// Falls back to the joined keys if KEYBOARD_SHORTCUTS shape changes.
const displayKey = computed(() =>
  shortcutKey === "Shift + /" ? "?" : shortcutKey,
);
const labelText = "Press for shortcuts";

const isAlreadyDismissed = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / storage disabled — be conservative and treat as
    // dismissed so we don't pester users who can't persist their choice.
    return true;
  }
};

const isTouchPrimary = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  // `(hover: none) and (pointer: coarse)` is the standard test for
  // "touch-first device with no fine-pointer fallback" (phones, most
  // tablets). Hybrid devices (Surface, iPad with mouse) keep the hint
  // because they DO have a real keyboard available.
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
};

const dismiss = () => {
  visible.value = false;
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // best-effort — session-only dismissal is acceptable fallback.
  }
};

const openDialog = () => {
  // Open the existing keyboard-shortcuts dialog. We deliberately do NOT
  // dismiss the hint on click; the user may want a reminder again until
  // they explicitly close it via the × control.
  store.showKeyboardShortcuts = true;
};

onMounted(() => {
  if (isAlreadyDismissed()) return;
  if (isTouchPrimary()) return;
  // No shortcut configured (unexpected, but defensive): hide rather than
  // render a button that opens a dialog with no associated key combo.
  if (!shortcutKey) return;
  visible.value = true;
});
</script>

<style scoped>
/* Anchored bottom-right opposite StreamloaderInstallPrompt (bottom-left)
   so the two never collide. z-index sits below dialogs (9000+) but above
   page content. Brand teal accents echo the rest of the fork. */
.sl-shortcuts-hint {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 1090;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px 6px 12px;
  border-radius: 999px;
  border: 1px solid rgba(45, 212, 191, 0.32);
  background: rgba(20, 24, 28, 0.78);
  color: rgba(229, 231, 235, 0.82);
  font-size: 12px;
  line-height: 1.2;
  cursor: pointer;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  box-shadow:
    0 4px 14px rgba(0, 0, 0, 0.28),
    0 0 0 1px rgba(45, 212, 191, 0.12);
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease,
    box-shadow 180ms ease,
    transform 180ms ease;
}

.sl-shortcuts-hint:hover {
  background: rgba(20, 24, 28, 0.92);
  color: rgb(229, 231, 235);
  border-color: rgba(45, 212, 191, 0.55);
  box-shadow:
    0 6px 18px rgba(0, 0, 0, 0.34),
    0 0 0 1px rgba(45, 212, 191, 0.28);
  transform: translateY(-1px);
}

.sl-shortcuts-hint:focus-visible {
  outline: 2px solid rgb(94, 234, 212);
  outline-offset: 3px;
}

.sl-shortcuts-hint__text {
  white-space: nowrap;
}

.sl-shortcuts-hint__kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 5px;
  border: 1px solid rgba(45, 212, 191, 0.5);
  background: rgba(45, 212, 191, 0.12);
  color: rgb(94, 234, 212);
  font-family:
    ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
}

.sl-shortcuts-hint__dismiss {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-left: 2px;
  border-radius: 50%;
  color: rgba(229, 231, 235, 0.55);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 140ms ease,
    color 140ms ease;
}

.sl-shortcuts-hint__dismiss:hover,
.sl-shortcuts-hint__dismiss:focus-visible {
  background: rgba(255, 255, 255, 0.08);
  color: rgb(229, 231, 235);
  outline: none;
}

/* Slide-up entrance — drops to a fade-only when the user prefers reduced
   motion (matches the install-prompt convention). */
.sl-shint-slide-enter-active {
  transition: all 320ms cubic-bezier(0.34, 1.36, 0.64, 1);
}
.sl-shint-slide-leave-active {
  transition: all 180ms ease;
}
.sl-shint-slide-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.sl-shint-slide-leave-to {
  opacity: 0;
  transform: translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
  .sl-shortcuts-hint,
  .sl-shortcuts-hint:hover {
    transition: none;
    transform: none;
  }
  .sl-shint-slide-enter-active,
  .sl-shint-slide-leave-active {
    transition: opacity 120ms ease;
  }
  .sl-shint-slide-enter-from,
  .sl-shint-slide-leave-to {
    transform: none;
  }
}

/* Light-mode treatment mirrors the rest of the fork's surfaces. */
@media (prefers-color-scheme: light) {
  .sl-shortcuts-hint {
    background: rgba(255, 255, 255, 0.92);
    color: rgba(17, 24, 28, 0.78);
    border-color: rgba(15, 118, 110, 0.32);
    box-shadow:
      0 4px 14px rgba(15, 118, 110, 0.14),
      0 0 0 1px rgba(15, 118, 110, 0.1);
  }
  .sl-shortcuts-hint:hover {
    background: rgba(255, 255, 255, 1);
    color: rgb(17, 24, 28);
    border-color: rgba(15, 118, 110, 0.55);
  }
  .sl-shortcuts-hint__kbd {
    border-color: rgba(15, 118, 110, 0.5);
    background: rgba(15, 118, 110, 0.08);
    color: rgb(15, 118, 110);
  }
  .sl-shortcuts-hint__dismiss {
    color: rgba(17, 24, 28, 0.55);
  }
  .sl-shortcuts-hint__dismiss:hover,
  .sl-shortcuts-hint__dismiss:focus-visible {
    background: rgba(17, 24, 28, 0.06);
    color: rgb(17, 24, 28);
  }
}

/* Mobile / narrow viewports: hide entirely. The hint targets keyboard
   users; phones don't benefit from "Press ? for shortcuts" copy. The
   touch-primary check in the script covers most cases, but this width
   guard belt-and-suspenders covers small narrow desktop windows where
   the pill would crowd page content. */
@media (max-width: 600px) {
  .sl-shortcuts-hint {
    display: none;
  }
}
</style>
