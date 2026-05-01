<!--
  StreamloaderErrorBoundary.vue

  Streamloader-fork addition: Vue 3 error boundary that uses the
  `errorCaptured` lifecycle hook to catch render/setup errors thrown by
  any descendant component. When an error is captured we swap the failed
  subtree for a brand-styled fallback so the user sees something
  intentional instead of the bare-Vuetify blank page they'd get from an
  uncaught render error propagating to Vue's global handler.

  Wiring guidance — DO NOT wrap the whole app:
    - Wrap the <router-view> in View.vue so a single broken route
      doesn't blank everything (sidebar, footer, player chrome).
    - Wrap individual high-blast-radius dialogs (EditArtworkDialog,
      ItemContextMenu, KeyboardShortcutsDialog) so a dialog crash never
      takes down the page underneath it.

  Behavior:
    - errorCaptured returns `false` to stop propagation up the tree
      (otherwise Vue would still surface the error to its global
      handler and we'd get duplicate noise).
    - We ALWAYS console.error the captured error so dev-tools / Sentry
      / addon logs still see the failure — the fallback is for the user,
      not a way to silence the bug.
    - "Try again" clears the local error ref and bumps a `:key` on the
      slot wrapper so the failed subtree fully re-mounts (resetting any
      half-initialised state that triggered the original throw).
    - "Reload" calls window.location.reload() as a last-resort escape
      hatch.
    - Technical details (message + stack) only render under
      `import.meta.env.DEV` — production users never see the raw stack.
-->
<template>
  <div v-if="capturedError" class="sl-eb" role="alert" aria-live="assertive">
    <div class="sl-eb__inner">
      <div class="sl-eb__icon-halo" aria-hidden="true">
        <img :src="markUrl" alt="" class="sl-eb__mark" draggable="false" />
      </div>
      <div class="sl-eb__title">Something went wrong</div>
      <div class="sl-eb__message">
        Streamloader hit an error rendering this view. The error has been
        logged.
      </div>
      <div class="sl-eb__actions">
        <v-btn
          ref="retryBtnRef"
          class="sl-eb__btn sl-eb__btn--primary"
          color="primary"
          variant="tonal"
          rounded="pill"
          @click="retry"
        >
          Try again
        </v-btn>
        <v-btn
          class="sl-eb__btn"
          variant="outlined"
          rounded="pill"
          @click="reload"
        >
          Reload
        </v-btn>
      </div>
      <details v-if="isDev" class="sl-eb__details">
        <summary class="sl-eb__details-summary">Technical details</summary>
        <div class="sl-eb__details-body">
          <div class="sl-eb__details-msg">
            {{ capturedError.message || String(capturedError) }}
          </div>
          <pre v-if="capturedError.stack" class="sl-eb__details-stack">{{
            capturedError.stack
          }}</pre>
        </div>
      </details>
    </div>
  </div>
  <template v-else>
    <slot :key="resetKey" />
  </template>
</template>

<script setup lang="ts">
import { nextTick, onErrorCaptured, ref } from "vue";
import markUrl from "@/assets/streamloader-mark.svg";

const capturedError = ref<Error | null>(null);
const resetKey = ref(0);
const retryBtnRef = ref<{ $el?: HTMLElement } | null>(null);
const isDev = import.meta.env.DEV;

onErrorCaptured((err) => {
  // Always log — we WANT the bug visible in dev-tools / Sentry / logs.
  // The branded fallback is purely a UX layer over the failure.
  // eslint-disable-next-line no-console
  console.error("[StreamloaderErrorBoundary] captured error:", err);
  capturedError.value = err instanceof Error ? err : new Error(String(err));
  // Move focus onto the retry button so SR users hear the role="alert"
  // announcement and keyboard users land on the primary action.
  nextTick(() => {
    const el = retryBtnRef.value?.$el as HTMLElement | undefined;
    el?.focus?.();
  });
  // Stop Vue from continuing to propagate the error up the tree — we've
  // handled it. Returning false here prevents the duplicate console
  // entry from app.config.errorHandler.
  return false;
});

const retry = () => {
  capturedError.value = null;
  // Bump key so the slot wrapper re-mounts cleanly — a stuck reactive
  // graph that caused the original throw won't survive the remount.
  resetKey.value++;
};

const reload = () => {
  window.location.reload();
};
</script>

<style scoped>
.sl-eb {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  padding: 48px 16px 40px;
}

.sl-eb__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  max-width: 460px;
}

.sl-eb__icon-halo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: rgba(45, 212, 191, 0.1);
  border: 1px solid rgba(45, 212, 191, 0.22);
  /* Subtle teal glow — feels intentional, not broken. */
  box-shadow:
    0 0 24px rgba(45, 212, 191, 0.18),
    inset 0 0 12px rgba(45, 212, 191, 0.08);
  margin-bottom: 6px;
}

:global(.v-theme--light) .sl-eb__icon-halo {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.25);
}

.sl-eb__mark {
  width: 52px;
  height: 52px;
  display: block;
  filter: drop-shadow(0 0 6px rgba(45, 212, 191, 0.45));
  opacity: 0.95;
}

.sl-eb__title {
  font-size: 1.15rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface), 0.94);
}

.sl-eb__message {
  font-size: 0.9rem;
  font-weight: 400;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.66);
  max-width: 380px;
}

.sl-eb__actions {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: center;
}

.sl-eb__btn {
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.sl-eb__btn--primary:hover {
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18);
}

.sl-eb__btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.55);
}

@media (hover: none) {
  .sl-eb__btn--primary:hover {
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-eb__btn {
    transition: none;
  }
  .sl-eb__mark {
    filter: none;
  }
}

.sl-eb__details {
  margin-top: 16px;
  width: 100%;
  text-align: left;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.03);
}

.sl-eb__details-summary {
  cursor: pointer;
  padding: 8px 12px;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.7);
  user-select: none;
}

.sl-eb__details-summary:focus-visible {
  outline: 2px solid rgba(45, 212, 191, 0.55);
  outline-offset: 2px;
  border-radius: 6px;
}

.sl-eb__details-body {
  padding: 4px 12px 12px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.sl-eb__details-msg {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  color: rgba(var(--v-theme-on-surface), 0.85);
  margin: 8px 0;
  word-break: break-word;
}

.sl-eb__details-stack {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  line-height: 1.4;
  color: rgba(var(--v-theme-on-surface), 0.6);
  max-height: 220px;
  overflow: auto;
  margin: 0;
  white-space: pre;
}
</style>
