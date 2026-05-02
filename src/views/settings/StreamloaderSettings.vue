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
<!--
  NOTE on visual deviation from the other 3 streamloader views
  (RecentlyPlayed / Stats / Discover):
    Those views use a Toolbar + brand-teal-underlined <h1> page header.
    This view intentionally keeps the shadcn Card-based layout used
    throughout /settings (Players, Providers, FrontendConfig, etc.) so
    the streamloader settings landing reads as a peer of the other
    settings pages instead of a sidebar destination. The teal-underline
    header pattern is reserved for the content/discover surfaces.
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
          <CardTitle class="streamloader-wordmark">{{
            t("streamloader.settings.header_title")
          }}</CardTitle>
          <CardDescription>
            {{ t("streamloader.settings.header_description") }}
          </CardDescription>
        </div>
      </CardHeader>
    </Card>

    <!-- Section: Player Display -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">{{
          t("streamloader.settings.section_player_display")
        }}</CardTitle>
        <CardDescription>
          {{ t("streamloader.settings.section_player_display_description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <!-- Streamloader-fork addition (media-kind chooser): which
             physical-media companion to render alongside the album cover.
             Sits ABOVE the legacy vinyl-display-mode chooser because it
             gates which kind that mode applies to. Visual previews use
             the same SVG assets the actual hero renders, so the choice
             is unambiguous. -->
        <div class="sl-field sl-field--media-kind">
          <div class="sl-field__text">
            <div class="sl-field__label">
              {{ t("streamloader.media_display.kind_label") }}
            </div>
            <div class="sl-field__desc">
              {{ t("streamloader.media_display.kind_description") }}
            </div>
          </div>
          <div
            class="sl-media-kind-chooser"
            role="radiogroup"
            :aria-label="t('streamloader.media_display.kind_label')"
          >
            <button
              v-for="opt in mediaKindOptions"
              :key="opt.value"
              type="button"
              role="radio"
              :aria-checked="mediaDisplayKindSel === opt.value"
              :class="[
                'sl-media-kind-chip',
                { 'sl-media-kind-chip--active': mediaDisplayKindSel === opt.value },
              ]"
              @click="mediaDisplayKindSel = opt.value"
            >
              <img
                v-if="opt.preview"
                :src="opt.preview"
                alt=""
                class="sl-media-kind-chip__img"
              />
              <span v-else class="sl-media-kind-chip__none" aria-hidden="true">
                <v-icon icon="mdi-image-off-outline" size="20" />
              </span>
              <span class="sl-media-kind-chip__label">{{ opt.label }}</span>
            </button>
          </div>
        </div>

        <v-divider />

        <!-- Vinyl display mode (mirrors FrontendConfig) — applies to the
             chosen kind for vinyl + cd. Greyed out for cassette + none
             since neither has a hover/always axis. -->
        <div class="sl-field">
          <div class="sl-field__text">
            <div class="sl-field__label">
              {{ t("streamloader.settings.vinyl_label") }}
            </div>
            <div class="sl-field__desc">
              {{ t("streamloader.settings.vinyl_description") }}
            </div>
          </div>
          <v-select
            v-model="vinylDisplayMode"
            :items="vinylDisplayOptions"
            density="compact"
            variant="outlined"
            hide-details
            :disabled="!displayModeAppliesToKind"
            class="sl-field__control"
          />
        </div>

        <v-divider />

        <!-- Library stats -->
        <SLToggleRow
          :label="t('streamloader.settings.toggle_library_stats_label')"
          :description="
            t('streamloader.settings.toggle_library_stats_description')
          "
          :model-value="showLibraryStats"
          @update:model-value="setPref('showLibraryStats')"
        />

        <v-divider />

        <!-- Source badge on cards -->
        <SLToggleRow
          :label="t('streamloader.settings.toggle_source_badge_label')"
          :description="
            t('streamloader.settings.toggle_source_badge_description')
          "
          :model-value="showSourceBadge"
          @update:model-value="setPref('showSourceBadge')"
        />

        <v-divider />

        <!-- Floating top-right health pill (legacy). Off by default —
             the sidebar dot next to the "streamloader" menu item is the
             new primary indicator and avoids overlapping page chrome. -->
        <SLToggleRow
          :label="t('streamloader.settings.toggle_floating_pill_label')"
          :description="
            t('streamloader.settings.toggle_floating_pill_description')
          "
          :model-value="showFloatingHealthPill"
          @update:model-value="setPref('showFloatingHealthPill')"
        />
      </CardContent>
    </Card>

    <!-- Section: Activity & Notifications -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">
          {{ t("streamloader.settings.section_activity") }}
        </CardTitle>
        <CardDescription>
          {{ t("streamloader.settings.section_activity_description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <SLToggleRow
          :label="t('streamloader.settings.toggle_activity_pulse_label')"
          :description="
            t('streamloader.settings.toggle_activity_pulse_description')
          "
          :model-value="showActivityPulse"
          @update:model-value="setPref('showActivityPulse')"
        />

        <v-divider />

        <SLToggleRow
          :label="t('streamloader.settings.toggle_recently_downloaded_label')"
          :description="
            t('streamloader.settings.toggle_recently_downloaded_description')
          "
          :model-value="showRecentlyDownloaded"
          @update:model-value="setPref('showRecentlyDownloaded')"
        />

        <v-divider />

        <SLToggleRow
          :label="t('streamloader.settings.toggle_announce_queue_label')"
          :description="
            t('streamloader.settings.toggle_announce_queue_description')
          "
          :model-value="announceQueueChanges"
          @update:model-value="setPref('announceQueueChanges')"
        />
      </CardContent>
    </Card>

    <!-- Section: Provider -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">{{
          t("streamloader.settings.section_provider")
        }}</CardTitle>
        <CardDescription>
          {{ t("streamloader.settings.section_provider_description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <Item variant="outline" size="sm" class="justify-between sl-prov-item">
          <ItemContent>
            <ItemTitle>{{
              t("streamloader.settings.configured_provider")
            }}</ItemTitle>
            <div v-if="provider" class="sl-prov-name">{{ provider.name }}</div>
            <div v-else class="sl-prov-name sl-prov-name--missing">
              {{ t("streamloader.settings.not_configured") }}
            </div>
          </ItemContent>
          <ItemContent class="flex-none text-right">
            <span
              :class="[
                'sl-status-pill',
                `sl-status-pill--${providerState.tone}`,
              ]"
              :title="providerState.title"
              :aria-label="
                t('streamloader.settings.status_aria_label', {
                  label: providerState.label,
                })
              "
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
          {{ t("streamloader.settings.open_provider_settings") }}
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
          {{ t("streamloader.settings.add_provider") }}
        </v-btn>
      </CardContent>
    </Card>

    <!-- Section: About -->
    <Card>
      <CardHeader>
        <CardTitle class="sl-section-title">{{
          t("streamloader.settings.section_about")
        }}</CardTitle>
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
            <div class="sl-link-row__title">
              {{ t("streamloader.settings.github_title") }}
            </div>
            <div class="sl-link-row__sub">
              {{ t("streamloader.settings.github_sub") }}
            </div>
          </div>
          <v-icon icon="mdi-open-in-new" size="18" class="sl-link-row__chev" />
        </a>
        <p class="sl-about-note">
          {{ t("streamloader.settings.about_note_part1") }}
          <a
            href="https://music-assistant.io"
            target="_blank"
            rel="noopener"
            class="sl-about-inline-link"
            >music-assistant.io</a
          >
          {{ t("streamloader.settings.about_note_part2") }}
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
          <span>{{ t("streamloader.settings.show_welcome_tour") }}</span>
        </button>
        <!-- Force-open the "What's new" dialog regardless of whether the
             current WHATS_NEW_VERSION has already been acknowledged. The
             dialog component lives in Default.vue and listens for the
             `sl-whats-new:show` eventbus event. -->
        <button type="button" class="sl-replay-tour-btn" @click="showWhatsNew">
          <v-icon icon="mdi-sparkles" size="18" />
          <span>{{ t("streamloader.settings.show_whats_new") }}</span>
        </button>
      </CardContent>
    </Card>
  </Container>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

import streamloaderMark from "@/assets/streamloader-mark.svg";
// Streamloader-fork addition (media-kind chooser): inline SVG previews
// for the kind-chooser chips. Imported as URL strings so they render
// the same asset the InfoHeader / PlayerFullscreen actually use — the
// preview never drifts from the rendered hero.
import vinylPreview from "@/assets/vinyl.svg";
import cdPreview from "@/assets/cd.svg";
import cassettePreview from "@/assets/cassette.svg";
import Container from "@/components/Container.vue";

const { t } = useI18n();
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
  useMediaDisplayKind,
  setMediaDisplayKind,
  type MediaDisplayKind,
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

// "What's new" re-trigger. The dialog component (mounted in Default.vue)
// owns its own localStorage flag via useWhatsNewVersion(); the eventbus
// handler over there clears that flag and force-opens the dialog so the
// user can re-read the changelog any time.
const showWhatsNew = () => {
  eventbus.emit("sl-whats-new:show");
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
const vinylDisplayOptions = computed(() => [
  { title: t("streamloader.settings.vinyl_option_hover"), value: "hover" },
  {
    title: t("streamloader.settings.vinyl_option_always"),
    value: "always-visible",
  },
  {
    title: t("streamloader.settings.vinyl_option_always_spinning"),
    value: "always-visible-spinning",
  },
]);
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

// Streamloader-fork addition (media-kind chooser): which physical-media
// companion to render alongside the album cover. Backed by the same
// reactive composable that InfoHeader + PlayerFullscreen consume, so a
// click here updates both surfaces immediately without a reload.
const mediaDisplayKindRef = useMediaDisplayKind();
const mediaDisplayKindSel = computed<MediaDisplayKind>({
  get: () => mediaDisplayKindRef.value,
  set: (next) => setMediaDisplayKind(next),
});
const mediaKindOptions = computed<
  Array<{ value: MediaDisplayKind; label: string; preview: string | null }>
>(() => [
  {
    value: "vinyl",
    label: t("streamloader.media_display.kind_vinyl"),
    preview: vinylPreview,
  },
  {
    value: "cd",
    label: t("streamloader.media_display.kind_cd"),
    preview: cdPreview,
  },
  {
    value: "cassette",
    label: t("streamloader.media_display.kind_cassette"),
    preview: cassettePreview,
  },
  {
    value: "none",
    label: t("streamloader.media_display.kind_none"),
    preview: null,
  },
]);
// Mode (hover / always / spinning) only makes sense for the round-disc
// kinds. Cassette has its own implicit "always-visible + spin while
// playing" behaviour and "none" has no companion at all, so we grey
// out the mode chooser for those two options.
const displayModeAppliesToKind = computed(
  () =>
    mediaDisplayKindSel.value === "vinyl" ||
    mediaDisplayKindSel.value === "cd",
);

// Boolean toggles. Each call to useStreamloaderPref() registers its own
// window listeners (cleaned up on unmount); we bind one ref per key and
// pair it with a curried setStreamloaderPref handler for the v-switch.
const showLibraryStats = useStreamloaderPref("showLibraryStats");
const showSourceBadge = useStreamloaderPref("showSourceBadge");
const showActivityPulse = useStreamloaderPref("showActivityPulse");
const showRecentlyDownloaded = useStreamloaderPref("showRecentlyDownloaded");
const announceQueueChanges = useStreamloaderPref("announceQueueChanges");
// Streamloader-fork UX bug fix: floating top-right pill is now opt-in.
// Default false — see DEFAULT_STREAMLOADER_PREFS.
const showFloatingHealthPill = useStreamloaderPref("showFloatingHealthPill");

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
        label: t("streamloader.settings.status_not_configured_label"),
        title: t("streamloader.settings.status_not_configured_title"),
      };
    }
    if (!p.available) {
      return {
        tone: "warn",
        label: t("streamloader.settings.status_provider_issue_label"),
        title: t("streamloader.settings.status_provider_issue_title", {
          name: p.name,
        }),
      };
    }
    return {
      tone: "ok",
      label: t("streamloader.settings.status_ready_label"),
      title: t("streamloader.settings.status_ready_title", { name: p.name }),
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

/* Streamloader-fork addition (media-kind chooser). Chips show the same
   SVG asset the actual hero uses, so the preview never drifts from
   what's rendered on the album page / fullscreen player. */
.sl-field--media-kind {
  /* Allow the chooser strip to wrap below the label on narrow widths
     instead of clipping. */
  flex-wrap: wrap;
}

.sl-media-kind-chooser {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  flex: 0 0 auto;
}

.sl-media-kind-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 76px;
  padding: 10px 6px 8px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.18);
  border-radius: 12px;
  background: rgba(var(--v-theme-on-surface), 0.03);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition:
    background-color 150ms ease,
    border-color 150ms ease,
    transform 150ms ease;
}

@media (hover: hover) {
  .sl-media-kind-chip:hover {
    background: rgba(45, 212, 191, 0.08);
    border-color: rgba(45, 212, 191, 0.45);
  }
}

.sl-media-kind-chip:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-media-kind-chip--active {
  background: rgba(45, 212, 191, 0.16);
  border-color: #2dd4bf;
}

.sl-media-kind-chip__img {
  display: block;
  width: 44px;
  height: 44px;
  object-fit: contain;
  pointer-events: none;
}

.sl-media-kind-chip__none {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background: rgba(var(--v-theme-on-surface), 0.05);
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.sl-media-kind-chip__label {
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.01em;
}

@media (prefers-reduced-motion: reduce) {
  .sl-media-kind-chip {
    transition: none;
  }
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
