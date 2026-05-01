<!--
  StreamloaderHealthDot.vue

  Compact sidebar status indicator for the streamloader provider. Reads the
  same data as StreamloaderHealthPill (api.providers, .available) but renders
  as a tiny colored circle that lives next to the "streamloader" sidebar
  menu item — replaces the floating top-right pill which was overlapping
  page chrome controls.

  States, in priority order:
    - error: streamloader provider not configured at all (red)
    - warn:  provider configured but `available` is false   (amber)
    - ok:    provider configured and available              (teal)
    - hidden: still loading provider list on cold app start

  Visual: 8px solid circle with a ring halo. Subtle pulse on
  warn/error so a problem state catches the eye without being a beacon.
  Pulse is gated by prefers-reduced-motion. Tooltip is the native
  browser title — sidebar items already have their own tooltip system,
  so we keep this dot purely decorative for SR users (full state is
  surfaced on the /settings/streamloader page).
-->
<template>
  <span
    v-if="state"
    class="sl-health-dot"
    :class="`sl-health-dot--${state.tone}`"
    :title="state.title"
    role="img"
    :aria-label="`Streamloader status: ${state.label}`"
  ></span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import api from "@/plugins/api";

type Tone = "ok" | "warn" | "error";

const STREAMLOADER_DOMAIN = "streamloader";

interface DotState {
  tone: Tone;
  label: string;
  title: string;
}

const state = computed<DotState | null>(() => {
  if (!api.providers || Object.keys(api.providers).length === 0) {
    return null;
  }

  const streamloader = Object.values(api.providers).find(
    (provider) => provider.domain === STREAMLOADER_DOMAIN,
  );

  if (!streamloader) {
    return {
      tone: "error",
      label: "Offline",
      title: "Streamloader provider not configured — open Settings → Streamloader",
    };
  }

  if (!streamloader.available) {
    return {
      tone: "warn",
      label: "Degraded",
      title: `Streamloader provider unavailable (${streamloader.name}) — check API key + connectivity`,
    };
  }

  return {
    tone: "ok",
    label: "Ready",
    title: `Streamloader (${streamloader.name}) is reachable and authenticated`,
  };
});
</script>

<style scoped>
/* Sidebar status dot. Sized to sit comfortably to the right of the
   "streamloader" label without affecting nav-item layout. Colors are
   defined locally so they don't drift with theme changes — this is a
   streamloader brand indicator, same convention as HealthPill. */

.sl-health-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: 0 0 auto;
  margin-left: 8px;
  /* Soft outer ring helps the dot read against both the active-item tint
     and the default sidebar surface. Color of the ring is currentColor
     so each tone gets a matching halo. */
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0);
  transition: box-shadow 150ms ease, background-color 150ms ease;
  pointer-events: auto;
  cursor: help;
}

.sl-health-dot--ok {
  background-color: #2dd4bf; /* brand teal — "Ready" matches sidebar accent */
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.18);
}

.sl-health-dot--warn {
  background-color: #fbbf24; /* amber */
  box-shadow: 0 0 0 2px rgba(217, 119, 6, 0.22);
  animation: sl-health-dot-pulse 1.8s ease-in-out infinite;
}

.sl-health-dot--error {
  background-color: #f87171; /* red */
  box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.25);
  animation: sl-health-dot-pulse 1.8s ease-in-out infinite;
}

@keyframes sl-health-dot-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.55;
    transform: scale(0.85);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-health-dot--warn,
  .sl-health-dot--error {
    animation: none;
  }
}

/* Suppress hover focus halo on touch — the dot is purely informational
   and the tooltip is irrelevant on touch devices. */
@media (hover: none) {
  .sl-health-dot {
    cursor: default;
  }
}
</style>
