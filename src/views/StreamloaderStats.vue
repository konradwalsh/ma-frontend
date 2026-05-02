<!--
  StreamloaderStats.vue

  Top-level "Streamloader Stats" view, discoverable from the sidebar between
  Recently Played and the streamloader settings shortcut.

  Why this exists in the fork:
    Many small streamloader features have shipped (library counts, activity
    log, recently-played, source badge, health pill) but there's no single
    page that consolidates the "how is it doing?" view. This page surfaces
    those existing reactive sources side-by-side without inventing any new
    data.

  Honest data sources only — every "real" card reads from a primitive
  already in the codebase:
    - Library counts:          store.libraryTracksCount / Artists / Albums
    - Provider status:         api.providers (same logic as HealthDot/Pill)
    - Last activity:           useStreamloaderActivityLog().entries[0]
    - Recent activity counts:  same entries[] filtered by timestamp window

  Storage / cache usage is a placeholder card. The streamloader provider
  does not yet expose cache-size / disk-usage on its ProviderInstance (see
  StreamloaderLibraryStats.vue for the same note + the cacheBytes prop
  forward-compat shim). We render an honest "Coming soon" card rather than
  fabricating a value.
-->
<template>
  <div class="sl-stats">
    <Toolbar
      :icon="BarChart3"
      color="background"
      :title="$t('streamloader.stats.toolbar_title')"
    />

    <Container variant="comfortable" class="sl-stats-container">
      <!-- Shared streamloader page chrome (mirrors Discover/RecentlyPlayed) -->
      <nav
        class="sl-page-chrome"
        :aria-label="$t('streamloader.chrome.breadcrumb_aria')"
      >
        <ol class="sl-crumbs">
          <li class="sl-crumbs__item sl-crumbs__item--root">
            {{ $t("streamloader.chrome.section") }}
          </li>
          <li class="sl-crumbs__sep" aria-hidden="true">
            {{ $t("streamloader.chrome.breadcrumb_separator") }}
          </li>
          <li class="sl-crumbs__item sl-crumbs__item--current" aria-current="page">
            {{ $t("streamloader.stats.page_title") }}
          </li>
        </ol>
        <span
          class="sl-fork-badge"
          :title="$t('streamloader.chrome.badge_title')"
        >
          {{ $t("streamloader.chrome.badge") }}
        </span>
      </nav>

      <!-- Page header with brand-teal underline (matches RecentlyPlayed) -->
      <div class="sl-stats-header">
        <h1 class="sl-stats-title">
          {{ $t("streamloader.stats.page_title") }}
        </h1>
        <div class="sl-stats-subtitle">
          {{ $t("streamloader.stats.subtitle") }}
        </div>
      </div>

      <div class="sl-stats-grid">
        <!-- Library counts -->
        <article
          class="sl-stat-card sl-stat-card--real"
          aria-labelledby="sl-stat-library"
        >
          <header class="sl-stat-card__head">
            <Library :size="18" class="sl-stat-card__icon" />
            <h2 id="sl-stat-library" class="sl-stat-card__title">
              {{ $t("streamloader.stats.card_library_title") }}
            </h2>
          </header>
          <div class="sl-stat-card__body">
            <div v-if="hasLibraryCounts" class="sl-stat-trio">
              <div class="sl-stat-trio__cell">
                <div class="sl-stat-trio__value">
                  {{ libraryFormatted.tracks }}
                </div>
                <div class="sl-stat-trio__label">
                  {{ $t("streamloader.stats.label_tracks") }}
                </div>
              </div>
              <div class="sl-stat-trio__cell">
                <div class="sl-stat-trio__value">
                  {{ libraryFormatted.artists }}
                </div>
                <div class="sl-stat-trio__label">
                  {{ $t("streamloader.stats.label_artists") }}
                </div>
              </div>
              <div class="sl-stat-trio__cell">
                <div class="sl-stat-trio__value">
                  {{ libraryFormatted.albums }}
                </div>
                <div class="sl-stat-trio__label">
                  {{ $t("streamloader.stats.label_albums") }}
                </div>
              </div>
            </div>
            <div v-else class="sl-stat-card__loading">
              <StreamloaderSpinner
                :size="36"
                :label="$t('streamloader.stats.loading_library_label')"
              />
            </div>
          </div>
          <footer v-if="hasLibraryCounts" class="sl-stat-card__foot">
            {{ libraryFullTitle }}
          </footer>
        </article>

        <!-- Provider status -->
        <article
          class="sl-stat-card sl-stat-card--real"
          aria-labelledby="sl-stat-provider"
        >
          <header class="sl-stat-card__head">
            <StreamloaderHealthDot />
            <h2 id="sl-stat-provider" class="sl-stat-card__title">
              {{ $t("streamloader.stats.card_provider_title") }}
            </h2>
          </header>
          <div class="sl-stat-card__body">
            <div class="sl-stat-card__big">{{ providerStatusLabel }}</div>
            <div class="sl-stat-card__sub">{{ providerName }}</div>
          </div>
          <footer class="sl-stat-card__foot">
            <span class="sl-stat-card__foot-label">
              {{ $t("streamloader.stats.foot_last_activity") }}
            </span>
            <span class="sl-stat-card__foot-value">{{
              lastActivityLabel
            }}</span>
          </footer>
        </article>

        <!-- Recent activity summary -->
        <article
          class="sl-stat-card sl-stat-card--real"
          aria-labelledby="sl-stat-activity"
        >
          <header class="sl-stat-card__head">
            <Activity :size="18" class="sl-stat-card__icon" />
            <h2 id="sl-stat-activity" class="sl-stat-card__title">
              {{ $t("streamloader.stats.card_activity_title") }}
            </h2>
          </header>
          <div class="sl-stat-card__body">
            <div class="sl-stat-pair">
              <div class="sl-stat-pair__cell">
                <div class="sl-stat-pair__value">{{ downloadsLast24h }}</div>
                <div class="sl-stat-pair__label">
                  {{ $t("streamloader.stats.label_downloads_24h") }}
                </div>
              </div>
              <div class="sl-stat-pair__cell">
                <div class="sl-stat-pair__value">{{ downloadsLast7d }}</div>
                <div class="sl-stat-pair__label">
                  {{ $t("streamloader.stats.label_downloads_7d") }}
                </div>
              </div>
            </div>
          </div>
          <footer class="sl-stat-card__foot">
            <span class="sl-stat-card__foot-label">
              {{ $t("streamloader.stats.foot_tracked_events") }}
            </span>
            <span class="sl-stat-card__foot-value">{{ entries.length }}</span>
          </footer>
        </article>

        <!-- Storage / cache placeholder -->
        <article
          class="sl-stat-card sl-stat-card--placeholder"
          aria-labelledby="sl-stat-storage"
        >
          <header class="sl-stat-card__head">
            <HardDrive :size="18" class="sl-stat-card__icon" />
            <h2 id="sl-stat-storage" class="sl-stat-card__title">
              {{ $t("streamloader.stats.card_storage_title") }}
            </h2>
            <span class="sl-stat-card__pill">
              {{ $t("streamloader.stats.pill_coming_soon") }}
            </span>
          </header>
          <div class="sl-stat-card__body">
            <div class="sl-stat-card__big sl-stat-card__big--muted">—</div>
            <div class="sl-stat-card__sub">
              {{ $t("streamloader.stats.storage_placeholder_body") }}
            </div>
          </div>
          <footer class="sl-stat-card__foot">
            <span class="sl-stat-card__foot-label">
              {{ $t("streamloader.stats.foot_status") }}
            </span>
            <span class="sl-stat-card__foot-value">
              {{ $t("streamloader.stats.foot_status_pending") }}
            </span>
          </footer>
        </article>
      </div>

      <!-- "See also" cross-links -->
      <aside class="sl-see-also">
        <div class="sl-see-also__heading">
          {{ $t("streamloader.see_also.heading") }}
        </div>
        <ul class="sl-see-also__list">
          <li>
            <router-link
              :to="{ name: 'streamloaderdiscover' }"
              class="sl-see-also__link"
            >
              <span class="sl-see-also__link-title">
                {{ $t("streamloader.see_also.discover") }}
              </span>
              <span class="sl-see-also__link-desc">
                {{ $t("streamloader.see_also.discover_desc") }}
              </span>
            </router-link>
          </li>
          <li>
            <router-link
              :to="{ name: 'recentlyplayed' }"
              class="sl-see-also__link"
            >
              <span class="sl-see-also__link-title">
                {{ $t("streamloader.see_also.recently_played") }}
              </span>
              <span class="sl-see-also__link-desc">
                {{ $t("streamloader.see_also.recently_played_desc") }}
              </span>
            </router-link>
          </li>
        </ul>
      </aside>
    </Container>
  </div>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import StreamloaderHealthDot from "@/components/StreamloaderHealthDot.vue";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";
import Toolbar from "@/components/Toolbar.vue";
import { useStreamloaderActivityLog } from "@/composables/useStreamloaderActivityLog";
import api from "@/plugins/api";
import { store } from "@/plugins/store";
import { Activity, BarChart3, HardDrive, Library } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const STREAMLOADER_DOMAIN = "streamloader";

// --- Library counts -------------------------------------------------------
const hasLibraryCounts = computed(
  () =>
    store.libraryTracksCount !== undefined ||
    store.libraryArtistsCount !== undefined ||
    store.libraryAlbumsCount !== undefined,
);

const compact = (n: number | undefined): string => {
  if (n === undefined || n === null) return "—";
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
};

const libraryFormatted = computed(() => ({
  tracks: compact(store.libraryTracksCount),
  artists: compact(store.libraryArtistsCount),
  albums: compact(store.libraryAlbumsCount),
}));

const libraryFullTitle = computed(() => {
  const tracks = (store.libraryTracksCount ?? 0).toLocaleString();
  const artists = (store.libraryArtistsCount ?? 0).toLocaleString();
  const albums = (store.libraryAlbumsCount ?? 0).toLocaleString();
  return t("streamloader.stats.library_full_title", {
    tracks,
    artists,
    albums,
  });
});

// --- Provider status (same logic as StreamloaderHealthDot) ---------------
const streamloaderProvider = computed(() => {
  if (!api.providers || Object.keys(api.providers).length === 0) return null;
  return (
    Object.values(api.providers).find(
      (p) => p.domain === STREAMLOADER_DOMAIN,
    ) ?? null
  );
});

const providerStatusLabel = computed(() => {
  const p = streamloaderProvider.value;
  if (!api.providers || Object.keys(api.providers).length === 0)
    return t("streamloader.stats.provider_status_connecting");
  if (!p) return t("streamloader.stats.provider_status_not_configured");
  return p.available
    ? t("streamloader.stats.provider_status_online")
    : t("streamloader.stats.provider_status_degraded");
});

const providerName = computed(
  () =>
    streamloaderProvider.value?.name ??
    t("streamloader.stats.provider_name_none"),
);

// --- Activity log --------------------------------------------------------
const { entries } = useStreamloaderActivityLog();

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Re-tick every minute so the relative "Last activity" label and the
// 24h/7d windows stay accurate without requiring user navigation.
const now = ref(Date.now());
let nowTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = Date.now();
  }, 60_000);
});
onBeforeUnmount(() => {
  if (nowTimer) clearInterval(nowTimer);
});

const downloadsLast24h = computed(() => {
  const cutoff = now.value - DAY_MS;
  return entries.value.filter(
    (e) => e.kind === "download" && e.timestamp >= cutoff,
  ).length;
});

const downloadsLast7d = computed(() => {
  const cutoff = now.value - 7 * DAY_MS;
  return entries.value.filter(
    (e) => e.kind === "download" && e.timestamp >= cutoff,
  ).length;
});

const lastActivityLabel = computed(() => {
  const latest = entries.value[0];
  if (!latest) return t("streamloader.stats.last_activity_none");
  const diff = Math.max(0, now.value - latest.timestamp);
  if (diff < 60_000) return t("streamloader.stats.last_activity_just_now");
  if (diff < HOUR_MS) {
    const m = Math.floor(diff / 60_000);
    return m === 1
      ? t("streamloader.stats.last_activity_min_one", { count: m })
      : t("streamloader.stats.last_activity_min_other", { count: m });
  }
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    return h === 1
      ? t("streamloader.stats.last_activity_hour_one", { count: h })
      : t("streamloader.stats.last_activity_hour_other", { count: h });
  }
  const d = Math.floor(diff / DAY_MS);
  return d === 1
    ? t("streamloader.stats.last_activity_day_one", { count: d })
    : t("streamloader.stats.last_activity_day_other", { count: d });
});
</script>

<style scoped>
.sl-stats {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.sl-stats-container {
  padding-top: 8px;
}

/* --- Shared streamloader page chrome (mirrors Discover/RecentlyPlayed) - */
.sl-page-chrome {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 4px 6px;
  flex-wrap: wrap;
}

.sl-crumbs {
  display: flex;
  align-items: center;
  gap: 6px;
  list-style: none;
  margin: 0;
  padding: 0;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-background), 0.55);
}

.sl-crumbs__item--root {
  text-transform: lowercase;
  color: #2dd4bf;
  font-weight: 600;
}

:global(.v-theme--light) .sl-crumbs__item--root {
  color: #0f766e;
}

.sl-crumbs__sep {
  opacity: 0.45;
}

.sl-crumbs__item--current {
  color: rgba(var(--v-theme-on-background), 0.78);
  font-weight: 500;
}

.sl-fork-badge {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: lowercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.12);
  color: #2dd4bf;
  border: 1px solid rgba(45, 212, 191, 0.4);
  user-select: none;
}

:global(.v-theme--light) .sl-fork-badge {
  background: rgba(15, 118, 110, 0.1);
  color: #0f766e;
  border-color: rgba(15, 118, 110, 0.45);
}

/* --- Shared "see also" cross-link footer ------------------------------ */
.sl-see-also {
  margin: 24px 4px 8px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--v-theme-on-background), 0.08);
}

.sl-see-also__heading {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(var(--v-theme-on-background), 0.55);
  margin-bottom: 10px;
}

.sl-see-also__list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.sl-see-also__link {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--v-theme-on-background), 0.1);
  text-decoration: none;
  color: inherit;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.sl-see-also__link:hover {
  border-color: rgba(45, 212, 191, 0.5);
  background-color: rgba(45, 212, 191, 0.06);
}

.sl-see-also__link:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-see-also__link-title {
  font-size: 0.88rem;
  font-weight: 600;
  color: rgb(var(--v-theme-on-background));
}

.sl-see-also__link-desc {
  font-size: 0.75rem;
  color: rgba(var(--v-theme-on-background), 0.6);
}

/* Header — same teal underline language as the other streamloader views.
   Canonical pattern: width: fit-content + 100% underline so the gradient
   tracks the title text width across translations. */
.sl-stats-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 4px 18px;
}

.sl-stats-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
  padding-bottom: 4px;
  display: inline-block;
  width: fit-content;
  background-image: linear-gradient(
    to right,
    rgba(45, 212, 191, 0.85),
    rgba(45, 212, 191, 0.15)
  );
  background-repeat: no-repeat;
  background-size: 100% 2px;
  background-position: 0 100%;
}

:global(.v-theme--light) .sl-stats-title {
  background-image: linear-gradient(
    to right,
    rgba(15, 118, 110, 0.85),
    rgba(15, 118, 110, 0.15)
  );
}

.sl-stats-subtitle {
  font-size: 0.88rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  opacity: 0.65;
  color: rgb(var(--v-theme-on-background));
}

/* Card grid */
.sl-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 14px;
  padding: 4px 4px 24px;
}

.sl-stat-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px 16px 14px;
  border-radius: 12px;
  background-color: rgb(var(--v-theme-panel));
  border: 1px solid rgba(var(--v-theme-on-background), 0.08);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.sl-stat-card--real:hover {
  border-color: rgba(45, 212, 191, 0.4);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.18),
    0 6px 18px rgba(45, 212, 191, 0.12);
  transform: translateY(-1px);
}

.sl-stat-card--placeholder {
  opacity: 0.78;
  border-style: dashed;
}

.sl-stat-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sl-stat-card__icon {
  color: #2dd4bf;
  opacity: 0.9;
}

.sl-stat-card__title {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2dd4bf;
  margin: 0;
}

:global(.v-theme--light) .sl-stat-card__title,
:global(.v-theme--light) .sl-stat-card__icon {
  color: #0f766e;
}

.sl-stat-card__pill {
  margin-left: auto;
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-background), 0.08);
  color: rgba(var(--v-theme-on-background), 0.6);
}

.sl-stat-card__body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sl-stat-card__big {
  font-size: 1.6rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgba(var(--v-theme-on-background), 0.92);
  font-variant-numeric: tabular-nums;
}

.sl-stat-card__big--muted {
  color: rgba(var(--v-theme-on-background), 0.4);
}

.sl-stat-card__sub {
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-background), 0.62);
  line-height: 1.35;
}

.sl-stat-card__loading {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 6px 0;
}

.sl-stat-card__foot {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  margin-top: auto;
  border-top: 1px solid rgba(var(--v-theme-on-background), 0.08);
  font-size: 0.72rem;
  color: rgba(var(--v-theme-on-background), 0.6);
}

.sl-stat-card__foot-label {
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.75;
}

.sl-stat-card__foot-value {
  color: rgba(var(--v-theme-on-background), 0.85);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

/* Trio (library) */
.sl-stat-trio {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.sl-stat-trio__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sl-stat-trio__value {
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgba(var(--v-theme-on-background), 0.92);
  font-variant-numeric: tabular-nums;
}

.sl-stat-trio__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-background), 0.55);
}

/* Pair (activity) */
.sl-stat-pair {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.sl-stat-pair__cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sl-stat-pair__value {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: rgba(var(--v-theme-on-background), 0.92);
  font-variant-numeric: tabular-nums;
}

.sl-stat-pair__label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(var(--v-theme-on-background), 0.55);
}

@media (max-width: 575px) {
  .sl-stats-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .sl-stat-card__big {
    font-size: 1.4rem;
  }

  .sl-stat-trio__value,
  .sl-stat-pair__value {
    font-size: 1.2rem;
  }
}
</style>
