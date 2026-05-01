<!--
  StreamloaderWelcomeTour.vue (Streamloader-fork)

  Lightweight first-run tooltip tour that introduces streamloader-only
  surfaces (vinyl, source badges, activity pulse, keyboard shortcuts,
  settings entry). Shows once per browser, then never again unless the
  user explicitly re-triggers it from Streamloader Settings → About.

  Design notes:
    - Built on a plain `<v-overlay>` with no backdrop click-to-close so
      the user must Skip / Next / Got it. Five tooltip cards positioned
      manually (top-right, bottom-right, center, bottom-left) — we
      deliberately don't try to anchor with arrows, that's a real
      walkthrough lib (driver.js / shepherd.js). Lightweight by design.
    - Persistence: localStorage key `sl-welcome-tour-seen` is set on
      Skip OR final "Got it". Mirroring StreamloaderInstallPrompt's
      private-mode bail (treat unreadable storage as "already seen" so
      we don't pester users we can't remember).
    - Brand: teal accent border, focus-visible outlines, hover:none
      reduces filter shifts on touch, prefers-reduced-motion drops
      the fade-in transition.
    - Re-trigger contract: listens for `eventbus` emit
      `sl-welcome-tour:show` so the Settings page button can show it
      again without prop-drilling state through the layout.
-->
<template>
  <v-overlay
    v-model="visible"
    :persistent="true"
    :scrim="'rgba(0, 0, 0, 0.55)'"
    :z-index="2000"
    class="sl-tour-overlay"
    :class="`sl-tour-overlay--pos-${currentStep.position}`"
    role="dialog"
    aria-labelledby="sl-tour-title"
    aria-describedby="sl-tour-body"
  >
    <div class="sl-tour-card">
      <div class="sl-tour-card__accent" aria-hidden="true"></div>
      <div class="sl-tour-card__step" aria-live="polite">
        {{ stepIndex + 1 }} / {{ steps.length }}
      </div>
      <h3 id="sl-tour-title" class="sl-tour-card__title">
        {{ currentStep.title }}
      </h3>
      <p id="sl-tour-body" class="sl-tour-card__body">
        {{ currentStep.body }}
      </p>
      <div class="sl-tour-card__actions">
        <button
          v-if="!isLast"
          type="button"
          class="sl-tour-btn sl-tour-btn--ghost"
          @click="skip"
        >
          Skip
        </button>
        <button
          type="button"
          class="sl-tour-btn sl-tour-btn--primary"
          @click="next"
        >
          {{ isLast ? "Got it" : "Next" }}
        </button>
      </div>
    </div>
  </v-overlay>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import api, { ConnectionState } from "@/plugins/api";
import { store } from "@/plugins/store";
import { eventbus } from "@/plugins/eventbus";

const STORAGE_KEY = "sl-welcome-tour-seen";

type TourStepPosition =
  | "top-right"
  | "bottom-right"
  | "center"
  | "bottom-left";

interface TourStep {
  title: string;
  body: string;
  position: TourStepPosition;
}

// Five tooltips. Position is logical, not pixel-anchored: we lean on
// scoped CSS to place each card in a sensible quadrant near the
// feature it's describing.
const steps: ReadonlyArray<TourStep> = [
  {
    title: "Welcome to Streamloader",
    body: "The spinning vinyl behind your now-playing artwork is your at-a-glance playback indicator — it pauses when audio stops.",
    position: "top-right",
  },
  {
    title: "Source badges",
    body: "The colored dot on tracks shows where each one lives — green = local file, teal = streamloader-cached, slate = streaming only.",
    position: "top-right",
  },
  {
    title: "Activity Pulse",
    body: "When streamloader is downloading or processing tracks, the pulse appears in the corner so you always know what's in flight.",
    position: "bottom-right",
  },
  {
    title: "Keyboard shortcuts",
    body: "Press ? (Shift + /) anywhere in the app to open the full keyboard shortcut cheat sheet.",
    position: "center",
  },
  {
    title: "Streamloader settings",
    body: "Click 'streamloader' in the sidebar to manage every fork-only toggle — and to re-run this tour from the About card.",
    position: "bottom-left",
  },
];

const visible = ref(false);
const stepIndex = ref(0);

const currentStep = computed<TourStep>(() => steps[stepIndex.value]);
const isLast = computed(() => stepIndex.value === steps.length - 1);

const alreadySeen = (): boolean => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // Private mode / disabled storage — treat as seen so we don't loop.
    return true;
  }
};

const markSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Best-effort; ephemeral session is acceptable.
  }
};

const next = () => {
  if (isLast.value) {
    visible.value = false;
    markSeen();
    return;
  }
  stepIndex.value += 1;
};

const skip = () => {
  visible.value = false;
  markSeen();
};

// Re-trigger from the Settings → About "Show welcome tour again" button.
const onRetrigger = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  stepIndex.value = 0;
  visible.value = true;
};

// Open conditionally: never in frameless (HA ingress) mode, never if
// the user has already dismissed, and only after the api transitions
// out of the disconnected/connecting cold-boot state — that way the
// elements the tour describes (HealthPill, ActivityPulse, sidebar)
// are actually mounted and visible behind the overlay.
const stopWatch = watch(
  () => api.state.value,
  (state) => {
    if (visible.value) return;
    if (store.frameless) return;
    if (alreadySeen()) return;
    const ready =
      state === ConnectionState.CONNECTED ||
      state === ConnectionState.AUTHENTICATED ||
      state === ConnectionState.INITIALIZED;
    if (!ready) return;
    stepIndex.value = 0;
    visible.value = true;
  },
  { immediate: true },
);

onMounted(() => {
  eventbus.on("sl-welcome-tour:show", onRetrigger);
});

onBeforeUnmount(() => {
  eventbus.off("sl-welcome-tour:show", onRetrigger);
  stopWatch();
});
</script>

<style scoped>
/* The overlay scrim is provided by Vuetify; we just position the inner
   card in the quadrant matching the step's `position`. Cards stay
   responsive — on narrow viewports we collapse to centered. */

.sl-tour-overlay :deep(.v-overlay__content) {
  position: fixed;
  inset: 0;
  pointer-events: none;
  display: flex;
  padding: 24px;
}

.sl-tour-overlay :deep(.v-overlay__content) > * {
  pointer-events: auto;
}

.sl-tour-overlay--pos-top-right :deep(.v-overlay__content) {
  align-items: flex-start;
  justify-content: flex-end;
  padding-top: 60px;
}

.sl-tour-overlay--pos-bottom-right :deep(.v-overlay__content) {
  align-items: flex-end;
  justify-content: flex-end;
  padding-bottom: 80px;
}

.sl-tour-overlay--pos-bottom-left :deep(.v-overlay__content) {
  align-items: flex-end;
  justify-content: flex-start;
  padding-bottom: 80px;
}

.sl-tour-overlay--pos-center :deep(.v-overlay__content) {
  align-items: center;
  justify-content: center;
}

.sl-tour-card {
  position: relative;
  width: min(360px, calc(100vw - 48px));
  padding: 18px 20px 16px 22px;
  border: 1px solid rgba(45, 212, 191, 0.45);
  border-radius: 12px;
  background:
    linear-gradient(
      135deg,
      rgba(45, 212, 191, 0.14) 0%,
      rgba(15, 118, 110, 0.08) 100%
    ),
    rgba(20, 24, 28, 0.97);
  color: rgb(229, 231, 235);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.25),
    0 16px 40px rgba(15, 118, 110, 0.35),
    0 2px 8px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  overflow: hidden;
  transition: opacity 180ms ease;
}

.sl-tour-card__accent {
  position: absolute;
  top: 0;
  left: 0;
  width: 3px;
  height: 100%;
  background: linear-gradient(180deg, #2dd4bf 0%, #0f766e 100%);
}

.sl-tour-card__step {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2dd4bf;
  margin-bottom: 6px;
}

.sl-tour-card__title {
  margin: 0 0 6px 0;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.sl-tour-card__body {
  margin: 0 0 14px 0;
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(229, 231, 235, 0.85);
}

.sl-tour-card__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.sl-tour-btn {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    filter 150ms ease;
}

.sl-tour-btn--primary {
  background: #0f766e;
  color: #ffffff;
  border-color: #2dd4bf;
}

.sl-tour-btn--ghost {
  background: transparent;
  color: rgba(229, 231, 235, 0.85);
  border-color: rgba(229, 231, 235, 0.2);
}

@media (hover: hover) {
  .sl-tour-btn--primary:hover {
    filter: brightness(1.1);
  }
  .sl-tour-btn--ghost:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(229, 231, 235, 0.4);
  }
}

.sl-tour-btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .sl-tour-card,
  .sl-tour-btn {
    transition: none;
  }
}

@media (max-width: 540px) {
  .sl-tour-overlay :deep(.v-overlay__content) {
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
  }
}
</style>
