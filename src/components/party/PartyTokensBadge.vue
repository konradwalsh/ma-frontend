<template>
  <div class="tokens-badge" :class="{ 'tokens-badge--default': !hasColor }">
    <div class="badge-left" :style="leftStyle">
      <component :is="iconComponent" :size="14" class="badge-icon" />
      <Coins :size="11" class="badge-coin" />
      <span class="badge-count">
        <span class="badge-count-current">{{ tokens }}</span>
        <span class="badge-count-sep">/</span>
        <span class="badge-count-max">{{ maxTokens }}</span>
      </span>
    </div>
    <div class="badge-right" :style="rightStyle">
      <span class="badge-label">{{ label }}</span>
      <span v-if="countdown" class="badge-countdown">
        <Clock :size="11" />
        {{ countdown }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Color from "color";
import { Clock, Coins, ListPlus, Rocket } from "lucide-vue-next";

const props = defineProps<{
  tokens: number;
  maxTokens: number;
  countdown: string;
  label: string;
  color: string;
  icon: "boost" | "request";
}>();

const iconComponent = computed(() =>
  props.icon === "request" ? ListPlus : Rocket,
);

const hasColor = computed(() => {
  if (!props.color) return false;
  try {
    Color(props.color);
    return true;
  } catch {
    return false;
  }
});

const leftStyle = computed(() => {
  if (!hasColor.value) return {};
  try {
    const c = Color(props.color);
    return {
      background: c.alpha(0.85).string(),
      color: c.isLight() ? "#000" : "#fff",
    };
  } catch {
    return {};
  }
});

const rightStyle = computed(() => {
  if (!hasColor.value) return {};
  try {
    const c = Color(props.color);
    return {
      background: c.alpha(0.12).string(),
      borderColor: c.alpha(0.3).string(),
      color: c.string(),
    };
  } catch {
    return {};
  }
});
</script>

<style scoped>
/* Streamloader brand teal tokens (scoped) — keeps the default badge variant
   on-brand even when no per-guest color is supplied by the admin. */
.tokens-badge {
  --sl-teal: #2dd4bf;
  --sl-teal-strong: #0f766e;
  --sl-teal-soft: rgba(45, 212, 191, 0.12);
  --sl-teal-edge: rgba(45, 212, 191, 0.35);
  --sl-teal-glow: rgba(45, 212, 191, 0.28);

  display: inline-flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  /* Springy entrance + state changes — matches established overshoot easing
     used across the rest of the brand polish batches. */
  transition:
    box-shadow 0.25s cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 0.25s cubic-bezier(0.34, 1.36, 0.64, 1);
}

.v-theme--light .tokens-badge {
  --sl-teal: #0f766e;
  --sl-teal-soft: rgba(15, 118, 110, 0.1);
  --sl-teal-edge: rgba(15, 118, 110, 0.35);
  --sl-teal-glow: rgba(15, 118, 110, 0.25);
}

@media (hover: hover) {
  .tokens-badge:hover {
    transform: translateY(-1px);
    box-shadow:
      0 2px 8px rgba(0, 0, 0, 0.22),
      0 0 12px var(--sl-teal-glow);
  }
}

/* Suppress hover lift on touch devices so the badge doesn't get stuck
   in a hover state after a tap. */
@media (hover: none) {
  .tokens-badge:hover {
    transform: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
  }
}

.tokens-badge:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px var(--sl-teal-glow),
    0 0 12px var(--sl-teal-soft);
}

/* Teal-themed defaults when no admin color prop is provided — uses scoped
   brand vars so the badge stays on-brand even if Vuetify's primary
   theme drifts. */
.tokens-badge--default .badge-left {
  background: var(--sl-teal);
  color: #ffffff;
}

.v-theme--light .tokens-badge--default .badge-left {
  color: #ffffff;
}

.tokens-badge--default .badge-right {
  background: var(--sl-teal-soft);
  border-color: var(--sl-teal-edge);
  color: var(--sl-teal);
}

.badge-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.7rem;
}

.badge-icon {
  flex-shrink: 0;
}

.badge-coin {
  flex-shrink: 0;
  opacity: 0.85;
}

.badge-count {
  display: inline-flex;
  align-items: baseline;
  gap: 0.05rem;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  letter-spacing: 0.01em;
}

.badge-count-current {
  font-weight: 800;
  font-size: 0.95rem;
  line-height: 1;
}

.badge-count-sep {
  font-weight: 500;
  font-size: 0.8rem;
  opacity: 0.55;
  margin: 0 0.05rem;
}

.badge-count-max {
  font-weight: 600;
  font-size: 0.8rem;
  opacity: 0.75;
}

.badge-right {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid;
  border-left: none;
  border-radius: 0 10px 10px 0;
}

.badge-label {
  font-size: 0.8rem;
  /* Pill-chip spec: weight 500 + 0.01em tracking — keeps tokens badge
     visually consistent with the rest of the brand-polished pill chips. */
  font-weight: 500;
  letter-spacing: 0.01em;
}

.badge-countdown {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  padding-left: 0.35rem;
  border-left: 1px solid currentColor;
  opacity: 0.75;
  /* Smooth countdown changes — no jitter when text width changes by
     a single tabular digit. */
  transition: opacity 0.2s ease;
}

@media (max-width: 768px) {
  .badge-label {
    display: none;
  }

  .badge-right {
    padding: 0.45rem 0.55rem;
  }
}
</style>
