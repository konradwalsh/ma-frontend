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
    - Brand: teal gradient border, soft teal glow, mark watermark in
      the corner, dot-style step indicator. Vue <transition> handles
      the inter-step slide+fade with overshoot easing. All animation
      drops on prefers-reduced-motion.
    - Re-trigger contract: listens for `eventbus` emit
      `sl-welcome-tour:show` so the Settings page button can show it
      again without prop-drilling state through the layout.
-->
<template>
  <v-overlay
    v-model="visible"
    :persistent="true"
    :scrim="'rgba(0, 0, 0, 0.65)'"
    :z-index="2000"
    class="sl-tour-overlay"
    :class="`sl-tour-overlay--pos-${currentStep.position}`"
    role="dialog"
    aria-modal="true"
    aria-labelledby="sl-tour-title"
    aria-describedby="sl-tour-body"
    @keydown.esc.stop.prevent="skip"
  >
    <div
      class="sl-tour-halo"
      aria-hidden="true"
      @keydown.esc.stop.prevent="skip"
    ></div>
    <transition :name="transitionName" mode="out-in">
      <div
        :key="stepIndex"
        ref="cardRef"
        class="sl-tour-card"
        tabindex="-1"
        @keydown.esc.stop.prevent="skip"
      >
        <div class="sl-tour-card__border" aria-hidden="true"></div>
        <img
          src="@/assets/streamloader-mark.svg"
          alt=""
          class="sl-tour-card__mark"
          aria-hidden="true"
        />
        <div class="sl-tour-card__content">
          <h3 id="sl-tour-title" class="sl-tour-card__title">
            {{ currentStep.title }}
          </h3>
          <p id="sl-tour-body" class="sl-tour-card__body">
            {{ currentStep.body }}
          </p>
          <div
            class="sl-tour-card__dots"
            role="tablist"
            :aria-label="
              t('streamloader.welcome_tour.tour_progress_aria_label')
            "
          >
            <button
              v-for="(_, i) in steps"
              :key="i"
              type="button"
              class="sl-tour-dot"
              :class="{ 'sl-tour-dot--active': i === stepIndex }"
              :aria-label="
                t('streamloader.welcome_tour.step_aria_label', {
                  current: i + 1,
                  total: steps.length,
                })
              "
              :aria-current="i === stepIndex ? 'step' : undefined"
              @click="goTo(i)"
            ></button>
          </div>
          <div class="sl-tour-card__actions">
            <button
              v-if="!isLast"
              type="button"
              class="sl-tour-btn sl-tour-btn--ghost"
              @click="skip"
            >
              {{ t("streamloader.welcome_tour.skip") }}
            </button>
            <button
              type="button"
              class="sl-tour-btn sl-tour-btn--primary"
              :class="{ 'sl-tour-btn--primary-lg': isLast }"
              @click="next"
            >
              {{
                isLast
                  ? t("streamloader.welcome_tour.got_it")
                  : t("streamloader.welcome_tour.next")
              }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </v-overlay>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import api, { ConnectionState } from "@/plugins/api";
import { store } from "@/plugins/store";
import { eventbus } from "@/plugins/eventbus";

const { t } = useI18n();

const STORAGE_KEY = "sl-welcome-tour-seen";

type TourStepPosition = "top-right" | "bottom-right" | "center" | "bottom-left";

interface TourStep {
  title: string;
  body: string;
  position: TourStepPosition;
}

// Five tooltips. Position is logical, not pixel-anchored: we lean on
// scoped CSS to place each card in a sensible quadrant near the
// feature it's describing.
const steps = computed<ReadonlyArray<TourStep>>(() => [
  {
    title: t("streamloader.welcome_tour.step1_title"),
    body: t("streamloader.welcome_tour.step1_body"),
    position: "top-right",
  },
  {
    title: t("streamloader.welcome_tour.step2_title"),
    body: t("streamloader.welcome_tour.step2_body"),
    position: "top-right",
  },
  {
    title: t("streamloader.welcome_tour.step3_title"),
    body: t("streamloader.welcome_tour.step3_body"),
    position: "bottom-right",
  },
  {
    title: t("streamloader.welcome_tour.step4_title"),
    body: t("streamloader.welcome_tour.step4_body"),
    position: "center",
  },
  {
    title: t("streamloader.welcome_tour.step5_title"),
    body: t("streamloader.welcome_tour.step5_body"),
    position: "bottom-left",
  },
]);

const visible = ref(false);
const stepIndex = ref(0);
// a11y (batch 36): focus management for the modal-overlay tour. We stash
// the element that had focus at open-time, then move focus into the card
// (so screen readers announce the dialog and Tab cycles within it via
// Vuetify's overlay focus trap). On close we restore focus to the
// previously-focused element so the user resumes where they left off.
const cardRef = ref<HTMLElement | null>(null);
let lastFocusedBeforeOpen: HTMLElement | null = null;
// "forward" slides next-card in from the right, "backward" from the left.
// Default forward; overridden when the user clicks an earlier dot.
const transitionName = ref<"sl-tour-fwd" | "sl-tour-bwd">("sl-tour-fwd");

const currentStep = computed<TourStep>(() => steps.value[stepIndex.value]);
const isLast = computed(() => stepIndex.value === steps.value.length - 1);

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
  transitionName.value = "sl-tour-fwd";
  stepIndex.value += 1;
};

const skip = () => {
  visible.value = false;
  markSeen();
};

const goTo = (index: number) => {
  if (index === stepIndex.value) return;
  transitionName.value =
    index > stepIndex.value ? "sl-tour-fwd" : "sl-tour-bwd";
  stepIndex.value = index;
};

// Re-trigger from the Settings → About "Show welcome tour again" button.
const onRetrigger = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  stepIndex.value = 0;
  transitionName.value = "sl-tour-fwd";
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

// a11y (batch 36): track open/close transitions so we can move focus into
// the card on open and back to the originally-focused element on close.
// Vuetify v-overlay traps Tab focus inside the overlay's content, but it
// does NOT auto-restore focus on close — and with `persistent` it does
// not auto-move focus inside on open either. We handle both ends here.
watch(visible, async (now, prev) => {
  if (now && !prev) {
    lastFocusedBeforeOpen =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    await nextTick();
    // Focus the card itself (tabindex="-1") rather than a button so the
    // dialog title is announced first, then Tab moves to Skip/Next.
    cardRef.value?.focus({ preventScroll: true });
  } else if (!now && prev) {
    // Restore focus to whatever had it before the tour opened. If that
    // element is gone (e.g. user navigated), don't fight the browser —
    // let it land on <body> naturally.
    const target = lastFocusedBeforeOpen;
    lastFocusedBeforeOpen = null;
    if (target && document.body.contains(target)) {
      // Defer one tick so any closing transition has released focus first.
      await nextTick();
      try {
        target.focus({ preventScroll: true });
      } catch {
        // ignore — element might no longer be focusable
      }
    }
  }
});

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

/* Soft radial halo behind the card for emphasis. Sits underneath the
   card via z-index in the same flex cell. Pointer-events disabled so
   it never intercepts clicks. */
.sl-tour-halo {
  position: absolute;
  width: 520px;
  height: 520px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(45, 212, 191, 0.18) 0%,
    rgba(45, 212, 191, 0.06) 40%,
    rgba(45, 212, 191, 0) 70%
  );
  pointer-events: none;
  filter: blur(6px);
}

.sl-tour-overlay--pos-top-right .sl-tour-halo {
  top: -120px;
  right: -120px;
}
.sl-tour-overlay--pos-bottom-right .sl-tour-halo {
  bottom: -140px;
  right: -140px;
}
.sl-tour-overlay--pos-bottom-left .sl-tour-halo {
  bottom: -140px;
  left: -140px;
}
.sl-tour-overlay--pos-center .sl-tour-halo {
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sl-tour-card {
  position: relative;
  /* a11y (batch 36): card receives programmatic focus on open via
     tabindex="-1"; suppress the default browser focus ring on the
     container itself (buttons inside still show their :focus-visible
     ring). */
  outline: none;
  width: min(380px, calc(100vw - 48px));
  padding: 24px 26px 20px 26px;
  border-radius: 16px;
  background:
    linear-gradient(
      135deg,
      rgba(45, 212, 191, 0.12) 0%,
      rgba(15, 118, 110, 0.06) 100%
    ),
    rgba(18, 22, 26, 0.97);
  color: rgb(229, 231, 235);
  box-shadow:
    0 0 24px rgba(45, 212, 191, 0.22),
    0 20px 50px rgba(15, 118, 110, 0.32),
    0 4px 14px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  overflow: hidden;
  isolation: isolate;
}

/* Brand-teal gradient border drawn via a pseudo-style wrapper so the
   gradient remains a true border (not an inner accent stripe). */
.sl-tour-card__border {
  position: absolute;
  inset: 0;
  border-radius: 16px;
  padding: 1.5px;
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.85) 0%,
    rgba(15, 118, 110, 0.55) 50%,
    rgba(45, 212, 191, 0.7) 100%
  );
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.sl-tour-card__mark {
  position: absolute;
  top: 12px;
  right: 14px;
  width: 22px;
  height: 22px;
  opacity: 0.45;
  pointer-events: none;
  filter: drop-shadow(0 0 4px rgba(45, 212, 191, 0.4));
}

.sl-tour-card__content {
  position: relative;
  z-index: 1;
}

.sl-tour-card__title {
  margin: 0 0 8px 0;
  padding-right: 28px; /* avoid colliding with the corner mark */
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  line-height: 1.25;
}

.sl-tour-card__body {
  margin: 0 0 16px 0;
  font-size: 0.9375rem;
  line-height: 1.5;
  color: rgba(229, 231, 235, 0.88);
}

.sl-tour-card__dots {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 16px;
}

.sl-tour-dot {
  width: 9px;
  height: 9px;
  padding: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(45, 212, 191, 0.55);
  background: transparent;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    transform 160ms ease;
}

.sl-tour-dot--active {
  background: #2dd4bf;
  border-color: #2dd4bf;
  transform: scale(1.15);
  box-shadow: 0 0 8px rgba(45, 212, 191, 0.55);
}

.sl-tour-dot:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 3px;
}

@media (hover: hover) {
  .sl-tour-dot:not(.sl-tour-dot--active):hover {
    background: rgba(45, 212, 191, 0.25);
  }
}

.sl-tour-card__actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  align-items: center;
}

.sl-tour-btn {
  font-size: 0.8125rem;
  font-weight: 600;
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    background 150ms ease,
    border-color 150ms ease,
    filter 150ms ease,
    box-shadow 150ms ease;
}

.sl-tour-btn--primary {
  background: linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%);
  color: #ffffff;
  border-color: rgba(45, 212, 191, 0.8);
  box-shadow: 0 4px 12px rgba(15, 118, 110, 0.4);
}

.sl-tour-btn--primary-lg {
  padding: 10px 22px;
  font-size: 0.875rem;
}

.sl-tour-btn--ghost {
  background: transparent;
  color: rgba(45, 212, 191, 0.85);
  border-color: transparent;
}

@media (hover: hover) {
  .sl-tour-btn--primary:hover {
    filter: brightness(1.08);
    box-shadow: 0 6px 16px rgba(15, 118, 110, 0.55);
  }
  .sl-tour-btn--ghost:hover {
    background: rgba(45, 212, 191, 0.1);
    color: #2dd4bf;
  }
}

.sl-tour-btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

/* Step transition: slide + fade between cards. Overshoot easing on
   entrance; standard ease on leave. 200ms each side, mode="out-in". */
.sl-tour-fwd-enter-active,
.sl-tour-bwd-enter-active {
  transition:
    transform 200ms cubic-bezier(0.34, 1.36, 0.64, 1),
    opacity 200ms ease;
}
.sl-tour-fwd-leave-active,
.sl-tour-bwd-leave-active {
  transition:
    transform 200ms ease,
    opacity 200ms ease;
}

.sl-tour-fwd-enter-from {
  opacity: 0;
  transform: translateX(28px);
}
.sl-tour-fwd-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.sl-tour-bwd-enter-from {
  opacity: 0;
  transform: translateX(-28px);
}
.sl-tour-bwd-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

@media (prefers-reduced-motion: reduce) {
  .sl-tour-card,
  .sl-tour-btn,
  .sl-tour-dot {
    transition: none;
  }
  .sl-tour-fwd-enter-active,
  .sl-tour-bwd-enter-active,
  .sl-tour-fwd-leave-active,
  .sl-tour-bwd-leave-active {
    transition: opacity 80ms linear;
  }
  .sl-tour-fwd-enter-from,
  .sl-tour-bwd-enter-from,
  .sl-tour-fwd-leave-to,
  .sl-tour-bwd-leave-to {
    transform: none;
  }
}

@media (max-width: 540px) {
  .sl-tour-overlay :deep(.v-overlay__content) {
    align-items: center !important;
    justify-content: center !important;
    padding: 16px !important;
  }
  .sl-tour-halo {
    top: 50% !important;
    left: 50% !important;
    right: auto !important;
    bottom: auto !important;
    transform: translate(-50%, -50%);
  }
}
</style>
