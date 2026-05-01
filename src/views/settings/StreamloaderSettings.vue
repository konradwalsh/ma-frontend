<!--
  StreamloaderSettings.vue

  Consolidated landing page for streamloader-fork-only UX knobs. Surfaces
  the toggles that have accumulated across the codebase (vinyl display,
  source badge, library stats, activity pulse, recently-downloaded rail,
  queue aria-live announcements) plus a status-and-shortcut card for the
  configured streamloader provider.

  Persistence:
    - All boolean toggles are backed by the `streamloaderPrefs` composable
      which writes to localStorage under `frontend.settings.streamloader.*`
      and broadcasts a custom event so consumer components react LIVE.
    - The vinyl display dropdown writes to the same
      `frontend.settings.vinyl_display_mode` key as FrontendConfig so the
      two surfaces stay in sync — flipping it here updates the existing
      consumers (InfoHeader / PlayerFullscreen) without a reload of the
      page that owns them. The setting is intentionally also kept in
      FrontendConfig.vue (not deleted) for backwards compatibility with
      anyone who's bookmarked /settings/frontend or follows older docs.

  Routing: mounted at /settings/streamloader (route name `streamloadersettings`).
  Sidebar: AppSidebar's "streamloader" item points here.
-->
<template>
  <Container class="max-w-4xl mx-auto px-4 py-6 space-y-6">
    <!-- Header card: Streamloader mark + tagline -->
    <Card>
      <CardHeader class="flex flex-row items-center gap-4 pb-4">
        <div class="streamloader-mark-wrapper">
          <img
            :src="streamloaderMark"
            alt="streamloader"
            class="streamloader-mark"
          />
        </div>
        <div class="flex flex-col gap-1">
          <CardTitle class="streamloader-wordmark">streamloader</CardTitle>
          <CardDescription>
            Customize how Streamloader looks and feels.
          </CardDescription>
        </div>
      </CardHeader>
    </Card>

    <!-- Section: Player Display -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">Player Display</CardTitle>
        <CardDescription>
          Vinyl record visuals and source-of-truth indicators.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Vinyl display mode (mirrors FrontendConfig) -->
        <div class="sl-field">
          <div class="sl-field__text">
            <div class="sl-field__label">Vinyl record display</div>
            <div class="sl-field__desc">
              How the vinyl disc behind album cover art is shown. Spinning
              pauses when playback is paused or stopped.
            </div>
          </div>
          <v-select
            v-model="vinylDisplayMode"
            :items="vinylDisplayOptions"
            density="compact"
            variant="outlined"
            hide-details
            class="sl-field__control"
          />
        </div>

        <v-divider />

        <!-- Library stats -->
        <SLToggleRow
          label="Show Library Stats in sidebar"
          description="Surface live track / artist / album counts at the bottom of the navigation rail."
          :model-value="showLibraryStats"
          @update:model-value="setPref('showLibraryStats')"
        />

        <v-divider />

        <!-- Source badge on cards -->
        <SLToggleRow
          label="Show Source Badge on cards"
          description="Tiny dot on track thumbnails and rows that classifies items as Local, Streamloader-cached, or Streaming."
          :model-value="showSourceBadge"
          @update:model-value="setPref('showSourceBadge')"
        />
      </CardContent>
    </Card>

    <!-- Section: Activity & Notifications -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">
          Activity &amp; Notifications
        </CardTitle>
        <CardDescription>
          Background work and accessibility cues.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <SLToggleRow
          label="Show Activity Pulse widget"
          description="Live overlay top-right when streamloader has in-flight tasks (sync, fetch, ReplayGain compute). Hidden when idle."
          :model-value="showActivityPulse"
          @update:model-value="setPref('showActivityPulse')"
        />

        <v-divider />

        <SLToggleRow
          label="Show Recently Downloaded rail on home"
          description="Horizontal carousel at the top of the discover page surfacing your most recent streamloader-cached tracks."
          :model-value="showRecentlyDownloaded"
          @update:model-value="setPref('showRecentlyDownloaded')"
        />

        <v-divider />

        <SLToggleRow
          label="Announce queue actions to screen reader"
          description="Polite aria-live announcements when songs are added, the queue is cleared, or shuffle is toggled."
          :model-value="announceQueueChanges"
          @update:model-value="setPref('announceQueueChanges')"
        />
      </CardContent>
    </Card>

    <!-- Section: Provider -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">Provider</CardTitle>
        <CardDescription>
          The streamloader plugin instance that powers this fork.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <Item variant="outline" size="sm" class="justify-between sl-prov-item">
          <ItemContent>
            <ItemTitle>Configured provider</ItemTitle>
            <div v-if="provider" class="sl-prov-name">{{ provider.name }}</div>
            <div v-else class="sl-prov-name sl-prov-name--missing">
              Not configured
            </div>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span
              :class="[
                'sl-status-pill',
                `sl-status-pill--${providerState.tone}`,
              ]"
              :title="providerState.title"
              :aria-label="`Streamloader status: ${providerState.label}`"
            >
              <span class="sl-status-pill__dot" aria-hidden="true"></span>
              {{ providerState.label }}
            </span>
          </ItemContent>
        </Item>

        <v-btn
          v-if="provider"
          color="primary"
          variant="flat"
          prepend-icon="mdi-cog"
          @click="
            router.push({
              name: 'editprovider',
              params: { instanceId: provider.instance_id },
            })
          "
        >
          Open Provider Settings
        </v-btn>
        <v-btn
          v-else
          color="primary"
          variant="flat"
          prepend-icon="mdi-plus"
          @click="
            router.push({
              name: 'providersettings',
              query: { types: 'plugin' },
            })
          "
        >
          Add Streamloader Provider
        </v-btn>
      </CardContent>
    </Card>

    <!-- Section: About -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">About</CardTitle>
      </CardHeader>
      <CardContent class="space-y-2">
        <a
          href="https://github.com/konradwalsh/ma-frontend"
          target="_blank"
          rel="noopener"
          class="sl-link-row"
        >
          <div class="sl-link-row__icon">
            <v-icon icon="mdi-github" size="22" />
          </div>
          <div class="sl-link-row__body">
            <div class="sl-link-row__title">Streamloader frontend fork</div>
            <div class="sl-link-row__sub">
              github.com/konradwalsh/ma-frontend
            </div>
          </div>
          <v-icon icon="mdi-open-in-new" size="18" class="sl-link-row__chev" />
        </a>
        <p class="sl-about-note">
          Streamloader is a fork of Music Assistant's frontend with extra UI for
          the streamloader plugin. It depends on the upstream server runtime —
          visit
          <a
            href="https://music-assistant.io"
            target="_blank"
            rel="noopener"
            class="sl-about-inline-link"
            >music-assistant.io</a
          >
          for the underlying project.
        </p>
        <!-- Re-trigger the first-run welcome tour. Clears the localStorage
             flag and emits an eventbus event picked up by
             StreamloaderWelcomeTour.vue (mounted in Default.vue). -->
        <button
          type="button"
          class="sl-replay-tour-btn"
          @click="replayWelcomeTour"
        >
          <v-icon icon="mdi-play-circle-outline" size="18" />
          <span>Show welcome tour again</span>
        </button>
      </CardContent>
    </Card>
  </Container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";

import streamloaderMark from "@/assets/streamloader-mark.svg";
import Container from "@/components/Container.vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Item, ItemContent, ItemTitle } from "@/components/ui/item";
import {
  useStreamloaderPref,
  setStreamloaderPref,
  type StreamloaderPrefDefaults,
} from "@/composables/streamloaderPrefs";
import api from "@/plugins/api";
import { eventbus } from "@/plugins/eventbus";
import SLToggleRow from "@/views/settings/streamloader/SLToggleRow.vue";

// Welcome-tour re-trigger handler. The tour component owns its own
// localStorage flag, but we clear it here too so a hard reload after
// clicking this button still re-shows the tour (eventbus is in-memory).
const WELCOME_TOUR_STORAGE_KEY = "sl-welcome-tour-seen";
const replayWelcomeTour = () => {
  try {
    localStorage.removeItem(WELCOME_TOUR_STORAGE_KEY);
  } catch {
    // best-effort
  }
  eventbus.emit("sl-welcome-tour:show");
};

const STREAMLOADER_DOMAIN = "streamloader";
const VINYL_STORAGE_KEY = "frontend.settings.vinyl_display_mode";

const router = useRouter();

// Vinyl display mode — mirrors the entry in FrontendConfig.vue. We persist
// to the SAME localStorage key so InfoHeader / PlayerFullscreen pick it up
// without further wiring. We don't force a reload on change (FrontendConfig
// does because its EditConfig submits the whole frontend block at once);
// here we want the snappy "tweak and see" experience that feels at home
// in a dedicated settings page, so we just write through.
const vinylDisplayOptions = [
  { title: "Hover only", value: "hover" },
  { title: "Always visible", value: "always-visible" },
  { title: "Always visible & spinning", value: "always-visible-spinning" },
];
const vinylDisplayMode = ref<string>(
  localStorage.getItem(VINYL_STORAGE_KEY) || "always-visible-spinning",
);
watch(vinylDisplayMode, (next) => {
  if (next) {
    localStorage.setItem(VINYL_STORAGE_KEY, next);
  } else {
    localStorage.removeItem(VINYL_STORAGE_KEY);
  }
});

// Boolean toggles. Each call to useStreamloaderPref() registers its own
// window listeners (cleaned up on unmount); we bind one ref per key and
// pair it with a curried setStreamloaderPref handler for the v-switch.
const showLibraryStats = useStreamloaderPref("showLibraryStats");
const showSourceBadge = useStreamloaderPref("showSourceBadge");
const showActivityPulse = useStreamloaderPref("showActivityPulse");
const showRecentlyDownloaded = useStreamloaderPref("showRecentlyDownloaded");
const announceQueueChanges = useStreamloaderPref("announceQueueChanges");

const setPref = (key: keyof StreamloaderPrefDefaults) => (next: boolean) =>
  setStreamloaderPref(key, next);

// Provider lookup mirrors StreamloaderHealthPill so both surfaces
// classify "ready / warn / error" identically.
const provider = computed(() => {
  if (!api.providers || Object.keys(api.providers).length === 0) return null;
  return (
    Object.values(api.providers).find(
      (p) => p.domain === STREAMLOADER_DOMAIN,
    ) ?? null
  );
});

type Tone = "ok" | "warn" | "error";
const providerState = computed<{ tone: Tone; label: string; title: string }>(
  () => {
    const p = provider.value;
    if (!p) {
      return {
        tone: "error",
        label: "Not configured",
        title:
          "No streamloader provider is registered yet. Use 'Add Streamloader Provider' to install one.",
      };
    }
    if (!p.available) {
      return {
        tone: "warn",
        label: "Provider issue",
        title: `Streamloader provider unavailable (${p.name}) — check API key + connectivity`,
      };
    }
    return {
      tone: "ok",
      label: "Ready",
      title: `Streamloader (${p.name}) is reachable and authenticated`,
    };
  },
);
</script>

<style scoped>
/* Brand teal mirrors HealthPill / ActivityPulse / About so the page
   reads as a cohesive part of the streamloader fork rather than a
   bolt-on. */

.streamloader-mark-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid rgba(45, 212, 191, 0.25);
  flex-shrink: 0;
}

.streamloader-mark {
  width: 28px;
  height: 28px;
  display: block;
}

.streamloader-wordmark {
  font-weight: 600;
  letter-spacing: -0.01em;
  text-transform: lowercase;
}

.sl-section-title {
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.sl-field {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  justify-content: space-between;
}

.sl-field__text {
  flex: 1;
  min-width: 0;
}

.sl-field__label {
  font-size: 0.95rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  margin-bottom: 4px;
}

.sl-field__desc {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.45;
}

.sl-field__control {
  flex: 0 0 auto;
  width: 240px;
  max-width: 50%;
}

.sl-prov-item {
  /* The provider row holds two stacked text lines on the left, so let
     the Item primitive breathe a little vertically. */
  padding-block: 12px;
}

.sl-prov-name {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 2px;
}

.sl-prov-name--missing {
  color: #f87171;
  font-style: italic;
}

.sl-status-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid transparent;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  user-select: none;
}

.sl-status-pill__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}

.sl-status-pill--ok {
  background: rgba(22, 163, 74, 0.18);
  color: #4ade80;
  border-color: rgba(22, 163, 74, 0.45);
}

.sl-status-pill--warn {
  background: rgba(217, 119, 6, 0.2);
  color: #fbbf24;
  border-color: rgba(217, 119, 6, 0.5);
}

.sl-status-pill--error {
  background: rgba(220, 38, 38, 0.2);
  color: #f87171;
  border-color: rgba(220, 38, 38, 0.5);
}

.sl-link-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  text-decoration: none;
  color: inherit;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.sl-link-row:hover {
  background-color: rgba(45, 212, 191, 0.06);
  border-color: rgba(45, 212, 191, 0.4);
}

.sl-link-row:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-link-row__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(45, 212, 191, 0.12);
  color: #0f766e;
  flex-shrink: 0;
}

:global(.dark) .sl-link-row__icon {
  color: #2dd4bf;
}

.sl-link-row__body {
  flex: 1;
  min-width: 0;
}

.sl-link-row__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
}

.sl-link-row__sub {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin-top: 2px;
}

.sl-link-row__chev {
  opacity: 0.6;
  flex-shrink: 0;
}

.sl-about-note {
  font-size: 0.8125rem;
  color: rgba(var(--v-theme-on-surface), 0.7);
  line-height: 1.55;
  margin: 12px 0 0 0;
}

.sl-about-inline-link {
  color: #0f766e;
  font-weight: 600;
  text-decoration: underline;
}

:global(.dark) .sl-about-inline-link {
  color: #2dd4bf;
}

.sl-replay-tour-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 14px;
  padding: 8px 14px;
  font-size: 0.8125rem;
  font-weight: 600;
  border: 1px solid rgba(45, 212, 191, 0.45);
  border-radius: 8px;
  background: rgba(45, 212, 191, 0.08);
  color: #0f766e;
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease;
}

:global(.dark) .sl-replay-tour-btn {
  color: #2dd4bf;
}

@media (hover: hover) {
  .sl-replay-tour-btn:hover {
    background: rgba(45, 212, 191, 0.16);
    border-color: rgba(45, 212, 191, 0.7);
  }
}

.sl-replay-tour-btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .sl-replay-tour-btn {
    transition: none;
  }
}

@media (max-width: 640px) {
  .sl-field {
    flex-direction: column;
    align-items: stretch;
  }

  .sl-field__control {
    width: 100%;
    max-width: 100%;
  }
}
</style>
