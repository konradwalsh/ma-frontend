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
.tokens-badge {
  display: inline-flex;
  align-items: stretch;
  border-radius: 10px;
  overflow: hidden;
  font-size: 0.8rem;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
}

/* Teal-themed defaults when no admin color prop is provided */
.tokens-badge--default .badge-left {
  background: rgba(var(--v-theme-primary), 0.92);
  color: rgb(var(--v-theme-on-primary));
}

.tokens-badge--default .badge-right {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.35);
  color: rgb(var(--v-theme-primary));
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
  font-weight: 600;
}

.badge-countdown {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  padding-left: 0.35rem;
  border-left: 1px solid currentColor;
  opacity: 0.75;
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
