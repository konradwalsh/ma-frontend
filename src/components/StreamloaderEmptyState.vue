<!--
  StreamloaderEmptyState.vue

  Reusable, on-brand empty-state surface for any view that may render with
  zero items. Kept intentionally subtle — empty states are temporary, so the
  goal is "friendly + suggestive of next action", not "fill the screen".

  Props:
    icon       — mdi-* string OR a Vue Component (lucide-vue-next, custom svg)
    title      — short headline (e.g. "No albums yet")
    message    — single-line guidance (e.g. "Play something to start...")
    ctaLabel   — optional CTA button text
    ctaAction  — optional () => void, fired when CTA clicked

  Brand notes:
    - Teal accent on the icon halo (matches the rest of the streamloader fork)
    - A faint vinyl mark sits behind the icon as a low-opacity wash for
      personality. Hidden under prefers-reduced-motion: no animations.
    - CTA is a tonal pill button in brand-teal with a focus-visible ring
      for keyboard users.
-->
<template>
  <div class="sl-empty">
    <div class="sl-empty__wash" aria-hidden="true">
      <!-- Vinyl mark wash. Inline so we don't add an asset for an 80-line
           component. Low opacity, scaled large; purely decorative. -->
      <svg
        viewBox="0 0 100 100"
        class="sl-empty__vinyl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" stroke-width="0.6" />
        <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-width="0.4" />
        <circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" stroke-width="0.4" />
        <circle cx="50" cy="50" r="6" fill="currentColor" />
      </svg>
    </div>

    <div class="sl-empty__inner">
      <div class="sl-empty__icon-halo">
        <component
          :is="iconComponent"
          v-if="iconComponent"
          :size="36"
          class="sl-empty__icon"
        />
        <v-icon v-else-if="typeof icon === 'string'" size="40" class="sl-empty__icon">
          {{ icon }}
        </v-icon>
      </div>

      <div class="sl-empty__title">{{ title }}</div>
      <div v-if="message" class="sl-empty__message">{{ message }}</div>

      <v-btn
        v-if="ctaLabel"
        class="sl-empty__cta"
        color="primary"
        variant="tonal"
        rounded="pill"
        @click="onCtaClick"
      >
        {{ ctaLabel }}
      </v-btn>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";

interface Props {
  icon?: string | Component;
  title: string;
  message?: string;
  ctaLabel?: string;
  ctaAction?: () => void;
}

const props = defineProps<Props>();

// Treat non-string icon prop as a Vue component (lucide, custom svg, etc.)
const iconComponent = computed(() =>
  props.icon && typeof props.icon !== "string" ? props.icon : null,
);

const onCtaClick = () => {
  props.ctaAction?.();
};
</script>

<style scoped>
.sl-empty {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 16px 40px;
  isolation: isolate;
}

/* Decorative vinyl mark — sits behind the icon as a brand wash. */
.sl-empty__wash {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  z-index: 0;
}

.sl-empty__vinyl {
  width: 220px;
  height: 220px;
  color: rgb(var(--v-theme-primary));
  opacity: 0.05;
}

:global(.v-theme--light) .sl-empty__vinyl {
  opacity: 0.07;
}

.sl-empty__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 10px;
  max-width: 380px;
}

.sl-empty__icon-halo {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 76px;
  height: 76px;
  border-radius: 50%;
  background: rgba(45, 212, 191, 0.1);
  border: 1px solid rgba(45, 212, 191, 0.22);
  color: rgb(var(--v-theme-primary));
  margin-bottom: 4px;
}

:global(.v-theme--light) .sl-empty__icon-halo {
  background: rgba(15, 118, 110, 0.08);
  border-color: rgba(15, 118, 110, 0.25);
}

.sl-empty__icon {
  color: rgb(var(--v-theme-primary)) !important;
  opacity: 0.9;
}

.sl-empty__title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgba(var(--v-theme-on-surface), 0.92);
}

.sl-empty__message {
  font-size: 0.88rem;
  font-weight: 400;
  line-height: 1.45;
  color: rgba(var(--v-theme-on-surface), 0.62);
  max-width: 340px;
}

.sl-empty__cta {
  margin-top: 10px;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.sl-empty__cta:hover {
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.18);
}

.sl-empty__cta:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.55);
}

/* Touch devices don't get hover halos — use the focus-visible style only. */
@media (hover: none) {
  .sl-empty__cta:hover {
    box-shadow: none;
  }
}

/* Respect reduced motion — the only motion is the CTA hover transition. */
@media (prefers-reduced-motion: reduce) {
  .sl-empty__cta {
    transition: none;
  }
}
</style>
