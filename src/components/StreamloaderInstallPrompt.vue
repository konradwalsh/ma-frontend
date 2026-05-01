<!--
  StreamloaderInstallPrompt.vue (Streamloader-fork, batch 33)

  Tasteful in-app PWA install affordance. Replaces the browser-native
  bar (which we suppress with `event.preventDefault()` on the
  `beforeinstallprompt` event) with a brand-styled toast that matches
  the polish of ReloadPrompt.vue.

  Trigger contract:
    - We capture `beforeinstallprompt` immediately on mount and stash it.
    - We *do not* show the toast until the user has played at least one
      track in this app session — playback is the strongest "engaged
      user" signal we have, so prompting before that point would feel
      premature.
    - localStorage flag `sl-install-prompt-handled` is set on either
      install OR dismiss, so we never re-show across sessions.

  Why localStorage and not just session: an install prompt that keeps
  re-appearing after dismiss is the #1 PWA UX complaint. Once a user
  says "no", we respect it permanently. They can still install via the
  browser menu if they change their mind.

  Browser support: `beforeinstallprompt` is Chromium-only (Chrome, Edge,
  Brave, Samsung Internet, Opera). On Safari/Firefox the event never
  fires, so this component renders nothing — they keep their native
  share-sheet "Add to Home Screen" path.
-->
<template>
  <transition name="sl-install-slide">
    <div
      v-if="visible"
      class="sl-install-toast"
      role="dialog"
      aria-labelledby="sl-install-title"
      aria-describedby="sl-install-desc"
    >
      <div class="sl-install-toast__accent" aria-hidden="true"></div>
      <div class="sl-install-toast__body">
        <img
          src="@/assets/streamloader-mark.svg"
          alt=""
          class="sl-install-toast__mark"
          aria-hidden="true"
        />
        <div class="sl-install-toast__copy">
          <div id="sl-install-title" class="sl-install-toast__title">
            {{ t("streamloader.install_prompt.title") }}
          </div>
          <div id="sl-install-desc" class="sl-install-toast__desc">
            {{ t("streamloader.install_prompt.description") }}
          </div>
        </div>
      </div>
      <div class="sl-install-toast__actions">
        <button
          type="button"
          class="sl-install-btn sl-install-btn--primary"
          @click="install"
        >
          {{ t("streamloader.install_prompt.install") }}
        </button>
        <button
          type="button"
          class="sl-install-btn sl-install-btn--ghost"
          @click="dismiss"
        >
          {{ t("streamloader.install_prompt.not_now") }}
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { store } from "@/plugins/store";
import { PlaybackState } from "@/plugins/api/interfaces";

const { t } = useI18n();

// The shape of `beforeinstallprompt` is not in lib.dom.d.ts yet, so we
// declare a minimal local type rather than pulling in @types/wicg-* (no
// new npm packages, per task constraints).
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = "sl-install-prompt-handled";

const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
const hasPlayedTrack = ref(false);
const visible = ref(false);

const alreadyHandled = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / storage disabled — treat as handled so we don't
    // pester the user when we can't even remember their dismissal.
    return true;
  }
};

const markHandled = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // best-effort; ephemeral session is acceptable fallback.
  }
};

const onBeforeInstallPrompt = (event: Event) => {
  // Suppress the browser's native mini-infobar so we own the surface.
  event.preventDefault();
  if (alreadyHandled()) return;
  deferredPrompt.value = event as BeforeInstallPromptEvent;
  // If playback has already started by the time the event fires, show
  // immediately — otherwise the watcher below will pick it up.
  if (hasPlayedTrack.value) visible.value = true;
};

const onAppInstalled = () => {
  // Some browsers fire `appinstalled` without a userChoice resolution
  // (e.g. install from the address-bar icon) — make sure we dismiss the
  // toast and never show it again.
  visible.value = false;
  deferredPrompt.value = null;
  markHandled();
};

const install = async () => {
  if (!deferredPrompt.value) {
    visible.value = false;
    return;
  }
  try {
    await deferredPrompt.value.prompt();
    await deferredPrompt.value.userChoice;
  } catch {
    // User cancelled the native chooser — still treat as handled per
    // the no-pester contract.
  }
  deferredPrompt.value = null;
  visible.value = false;
  markHandled();
};

const dismiss = () => {
  visible.value = false;
  deferredPrompt.value = null;
  markHandled();
};

// Watch the active queue's playback state. The first transition into
// PLAYING flips our engagement gate; we never reset it for the lifetime
// of the tab so a brief pause won't hide an already-shown prompt.
// We watch the queue rather than the player because `Player.playback_state`
// is optional and only some player types populate it, while every active
// queue carries a guaranteed `state: PlaybackState`.
const stopWatch = watch(
  () => store.activePlayerQueue?.state,
  (state) => {
    if (state === PlaybackState.PLAYING && !hasPlayedTrack.value) {
      hasPlayedTrack.value = true;
      if (deferredPrompt.value && !alreadyHandled()) {
        visible.value = true;
      }
    }
  },
  { immediate: true },
);

onMounted(() => {
  if (alreadyHandled()) return;
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
});

onBeforeUnmount(() => {
  window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.removeEventListener("appinstalled", onAppInstalled);
  stopWatch();
});
</script>

<style scoped>
/* Layout mirrors ReloadPrompt.vue (batch 22) so the two surfaces feel
   like siblings. We anchor bottom-left rather than bottom-right to
   avoid stacking with the reload toast if both ever appear together. */
.sl-install-toast {
  position: fixed;
  left: 0;
  bottom: 0;
  margin: 16px;
  padding: 14px 16px 14px 18px;
  border: 1px solid rgba(45, 212, 191, 0.45);
  border-radius: 10px;
  z-index: 1100;
  text-align: left;
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.25),
    0 12px 32px rgba(15, 118, 110, 0.35),
    0 2px 6px rgba(0, 0, 0, 0.35);
  background:
    linear-gradient(
      135deg,
      rgba(45, 212, 191, 0.12) 0%,
      rgba(15, 118, 110, 0.08) 100%
    ),
    rgba(20, 24, 28, 0.96);
  color: rgb(229, 231, 235);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
  min-width: 280px;
  max-width: 380px;
}

.sl-install-toast__accent {
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: linear-gradient(
    180deg,
    rgb(45, 212, 191) 0%,
    rgb(15, 118, 110) 100%
  );
}

.sl-install-toast__body {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.sl-install-toast__mark {
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  border-radius: 8px;
  /* Subtle ring so the dark teal mark stays legible on the dark teal
     toast background without painting a hard border line. */
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.35);
}

.sl-install-toast__copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.sl-install-toast__title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.3;
}

.sl-install-toast__desc {
  font-size: 12.5px;
  line-height: 1.35;
  color: rgba(229, 231, 235, 0.78);
}

.sl-install-toast__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.sl-install-btn {
  border: 1px solid transparent;
  outline: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    transform 200ms cubic-bezier(0.34, 1.36, 0.64, 1),
    background-color 180ms ease,
    box-shadow 180ms ease,
    border-color 180ms ease;
}

.sl-install-btn--primary {
  background: rgb(45, 212, 191);
  color: rgb(15, 23, 23);
  border-color: rgb(45, 212, 191);
  box-shadow: 0 4px 14px rgba(45, 212, 191, 0.35);
}

.sl-install-btn--primary:hover {
  background: rgb(94, 234, 212);
  border-color: rgb(94, 234, 212);
  transform: translateY(-1px);
  box-shadow: 0 6px 18px rgba(45, 212, 191, 0.5);
}

.sl-install-btn--primary:focus-visible {
  outline: 2px solid rgb(94, 234, 212);
  outline-offset: 2px;
}

.sl-install-btn--ghost {
  background: transparent;
  color: rgba(94, 234, 212, 0.9);
  border-color: rgba(45, 212, 191, 0.35);
}

.sl-install-btn--ghost:hover {
  background: rgba(45, 212, 191, 0.1);
  border-color: rgba(45, 212, 191, 0.6);
  color: rgb(94, 234, 212);
}

.sl-install-btn--ghost:focus-visible {
  outline: 2px solid rgb(45, 212, 191);
  outline-offset: 2px;
}

.sl-install-slide-enter-active {
  transition: all 380ms cubic-bezier(0.34, 1.36, 0.64, 1);
}
.sl-install-slide-leave-active {
  transition: all 220ms ease;
}
.sl-install-slide-enter-from {
  opacity: 0;
  transform: translateY(24px) translateX(-8px);
}
.sl-install-slide-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@media (hover: none) {
  .sl-install-btn--primary:hover {
    transform: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-install-btn,
  .sl-install-btn--primary:hover {
    transition: none;
    transform: none;
  }
  .sl-install-slide-enter-active,
  .sl-install-slide-leave-active {
    transition: opacity 120ms ease;
  }
  .sl-install-slide-enter-from,
  .sl-install-slide-leave-to {
    transform: none;
  }
}

/* Light-mode styling mirrors ReloadPrompt for visual consistency. */
@media (prefers-color-scheme: light) {
  .sl-install-toast {
    background:
      linear-gradient(
        135deg,
        rgba(15, 118, 110, 0.08) 0%,
        rgba(45, 212, 191, 0.05) 100%
      ),
      rgba(255, 255, 255, 0.98);
    color: rgb(17, 24, 28);
    border-color: rgba(15, 118, 110, 0.45);
    box-shadow:
      0 0 0 1px rgba(15, 118, 110, 0.18),
      0 12px 32px rgba(15, 118, 110, 0.18),
      0 2px 6px rgba(0, 0, 0, 0.08);
  }
  .sl-install-toast__desc {
    color: rgba(17, 24, 28, 0.72);
  }
  .sl-install-toast__mark {
    box-shadow: 0 0 0 1px rgba(15, 118, 110, 0.25);
  }
  .sl-install-btn--primary {
    background: rgb(15, 118, 110);
    color: rgb(255, 255, 255);
    border-color: rgb(15, 118, 110);
    box-shadow: 0 4px 14px rgba(15, 118, 110, 0.3);
  }
  .sl-install-btn--primary:hover {
    background: rgb(13, 148, 136);
    border-color: rgb(13, 148, 136);
  }
  .sl-install-btn--ghost {
    color: rgb(15, 118, 110);
    border-color: rgba(15, 118, 110, 0.4);
  }
  .sl-install-btn--ghost:hover {
    background: rgba(15, 118, 110, 0.08);
    color: rgb(13, 92, 86);
  }
}

/* Mobile: stretch to nearly full width so the action buttons get
   reasonable hit-targets on phones (where the install prompt arguably
   matters most). */
@media (max-width: 480px) {
  .sl-install-toast {
    left: 0;
    right: 0;
    max-width: none;
    margin: 0 12px 12px;
  }
}
</style>
