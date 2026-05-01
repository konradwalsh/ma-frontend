<!--
  StreamloaderSpinner.vue

  Brand-styled loader: a spinning streamloader-mark in brand teal with a
  subtle pulsing glow underneath. Drop-in replacement for v-progress-circular
  on streamloader-specific surfaces (recently-downloaded rail, library stats
  while counts hydrate, etc.). Intentionally NOT used as a project-wide
  spinner replacement.

  Respects prefers-reduced-motion: spin is suppressed and replaced with a
  soft opacity pulse so vestibular-sensitive users still get a "loading"
  signal without rotation.
-->
<template>
  <div
    class="sl-spinner"
    :style="{ '--sl-spin-size': `${size}px` }"
    role="status"
    :aria-label="resolvedLabel"
  >
    <span class="sl-spinner__glow" aria-hidden="true"></span>
    <img
      :src="markUrl"
      alt=""
      aria-hidden="true"
      class="sl-spinner__mark"
      draggable="false"
    />
    <span class="sl-spinner__sr">{{ resolvedLabel }}</span>
  </div>
</template>

<script setup lang="ts">
import markUrl from "@/assets/streamloader-mark.svg";
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** Render diameter in px. Clamped 32-48 in CSS. */
    size?: number;
    /** Screen-reader label; visually hidden. Defaults to a localized "Loading". */
    label?: string;
  }>(),
  {
    size: 40,
    label: "",
  },
);

const resolvedLabel = computed(
  () => props.label || t("streamloader.spinner.default_label"),
);
</script>

<style scoped>
.sl-spinner {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--sl-spin-size, 40px);
  height: var(--sl-spin-size, 40px);
}

.sl-spinner__mark {
  width: 100%;
  height: 100%;
  display: block;
  animation: sl-spin 1.4s linear infinite;
  transform-origin: 50% 50%;
  filter: drop-shadow(0 0 4px rgba(45, 212, 191, 0.35));
}

.sl-spinner__glow {
  position: absolute;
  inset: 10%;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(45, 212, 191, 0.45) 0%,
    rgba(45, 212, 191, 0) 70%
  );
  animation: sl-pulse 1.8s ease-in-out infinite;
  pointer-events: none;
}

.sl-spinner__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@keyframes sl-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes sl-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.92);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.08);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-spinner__mark {
    animation: sl-pulse-soft 2.2s ease-in-out infinite;
    filter: none;
  }
  .sl-spinner__glow {
    animation: sl-pulse-soft 2.2s ease-in-out infinite;
  }
  @keyframes sl-pulse-soft {
    0%,
    100% {
      opacity: 0.55;
    }
    50% {
      opacity: 1;
    }
  }
}
</style>
