<!--
  StreamloaderHealthPill.vue

  ALACarte-inspired floating status pill that surfaces the streamloader
  provider's current state in the top-right corner of every page. Same
  visual language as the streamloader web UI's HealthPill (see
  ma-driver/app/static/styles.css `.health-pill-*`) so users get a
  consistent brand cue across both surfaces.

  Mounting strategy: this lives at the layout root (Default.vue) and uses
  position: fixed so it overlays any page content. MA has no unified
  topbar to attach to — sidebar + per-view header is the layout. A
  fixed badge is the lowest-conflict way to deliver the ALACarte-style
  "always visible" status affordance without restructuring MA's layout
  primitives (which would create permanent upstream-merge conflict
  surface).

  States, in priority order:
    - error: streamloader provider not configured at all
    - warn: provider configured but `available` is false (auth / network)
    - ok: provider configured and available
    - hidden: still loading provider list on cold app start

  Reads `api.providers` directly — no extra HTTP call. The `available`
  field on a ProviderInstance is updated by MA's WebSocket bus whenever
  provider availability changes, so the pill reflects state in real time.
-->
<template>
  <a
    v-if="state"
    class="sl-health-pill"
    :class="`sl-health-pill--${state.tone}`"
    :title="state.title"
    :aria-label="t('streamloader.health_pill.aria_label', { label: state.label })"
    href="/#/settings/providers"
  >
    <span class="sl-health-pill__dot"></span>
    <span class="sl-health-pill__label">{{ state.label }}</span>
  </a>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import api from "@/plugins/api";

type Tone = "ok" | "warn" | "error";

const STREAMLOADER_DOMAIN = "streamloader";

interface PillState {
  tone: Tone;
  label: string;
  title: string;
}

const { t } = useI18n();

const state = computed<PillState | null>(() => {
  // Defensive: if the provider map hasn't populated yet (cold app boot,
  // initial websocket sync still in flight), we render nothing rather
  // than flashing a misleading "not configured" state.
  if (!api.providers || Object.keys(api.providers).length === 0) {
    return null;
  }

  const streamloader = Object.values(api.providers).find(
    (provider) => provider.domain === STREAMLOADER_DOMAIN,
  );

  if (!streamloader) {
    return {
      tone: "error",
      label: t("streamloader.health_pill.not_configured_label"),
      title: t("streamloader.health_pill.not_configured_title"),
    };
  }

  if (!streamloader.available) {
    return {
      tone: "warn",
      label: t("streamloader.health_pill.provider_issue_label"),
      title: t("streamloader.health_pill.provider_issue_title", {
        name: streamloader.name,
      }),
    };
  }

  return {
    tone: "ok",
    label: t("streamloader.health_pill.ready_label"),
    title: t("streamloader.health_pill.ready_title", {
      name: streamloader.name,
    }),
  };
});
</script>

<style scoped>
/* Color tokens mirror ma-driver/app/static/styles.css `.health-pill-*` so
   both surfaces look identical. Hex values are inlined (not referencing
   Vuetify CSS vars) because we want this pill to keep its own brand
   color regardless of MA's theme — it's a streamloader badge, not an
   MA accent. */

.sl-health-pill {
  position: fixed;
  top: 12px;
  right: 16px;
  z-index: 1000;

  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    filter 150ms ease,
    background 150ms ease,
    border-color 150ms ease;
  user-select: none;
}

.sl-health-pill:hover {
  filter: brightness(1.1);
}

.sl-health-pill:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-health-pill__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex: 0 0 auto;
}

.sl-health-pill--ok {
  background: rgba(22, 163, 74, 0.18);
  color: #4ade80; /* tailwind green-400 — readable on the tinted bg */
  border-color: rgba(22, 163, 74, 0.45);
}

.sl-health-pill--warn {
  background: rgba(217, 119, 6, 0.2);
  color: #fbbf24; /* tailwind amber-400 */
  border-color: rgba(217, 119, 6, 0.5);
}

.sl-health-pill--error {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171; /* tailwind red-400 */
  border-color: rgba(220, 38, 38, 0.5);
}

/* On narrow viewports the pill doesn't need to be huge — collapse the
   label and just show the dot to save the topbar space for the page-
   level search/back/title that MA's per-view headers render there. */
@media (max-width: 540px) {
  .sl-health-pill {
    padding: 0 8px;
  }
  .sl-health-pill__label {
    display: none;
  }
}
</style>
