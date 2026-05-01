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
      title="Streamloader Stats"
    />

    <Container variant="comfortable" class="sl-stats-container">
      <!-- Page header with brand-teal underline (matches RecentlyPlayed) -->
      <div class="sl-stats-header">
        <h1 class="sl-stats-title">Streamloader Stats</h1>
        <div class="sl-stats-subtitle">
          A quick read on your library, provider, and recent activity.
        </div>
      </div>

      <div class="sl-stats-grid">
        <!-- Library counts -->
        <article class="sl-stat-card sl-stat-card--real" aria-labelledby="sl-stat-library">
          <header class="sl-stat-card__head">
            <Library :size="18" class="sl-stat-card__icon" />
            <h2 id="sl-stat-library" class="sl-stat-card__title">Library</h2>
          </header>
          <div class="sl-stat-card__body">
            <div v-if="hasLibraryCounts" class="sl-stat-trio">
              <div class="sl-stat-trio__cell">
                <div class="sl-stat-trio__value">{{ libraryFormatted.tracks }}</div>
                <div class="sl-stat-trio__label">tracks</div>
              </div>
              <div class="sl-stat-trio__cell">
                <div class="sl-stat-trio__value">{{ libraryFormatted.artists }}</div>
                <div class="sl-stat-trio__label">artists</div>
              </div>
              <div class="sl-stat-trio__cell">
                <div class="sl-stat-trio__value">{{ libraryFormatted.albums }}</div>
                <div class="sl-stat-trio__label">albums</div>
              </div>
            </div>
            <div v-else class="sl-stat-card__loading">
              <StreamloaderSpinner :size="36" label="Loading library counts" />
            </div>
          </div>
          <footer v-if="hasLibraryCounts" class="sl-stat-card__foot">
            {{ libraryFullTitle }}
          </footer>
        </article>

        <!-- Provider status -->
        <article class="sl-stat-card sl-stat-card--real" aria-labelledby="sl-stat-provider">
          <header class="sl-stat-card__head">
            <StreamloaderHealthDot />
            <h2 id="sl-stat-provider" class="sl-stat-card__title">Provider</h2>
          </header>
          <div class="sl-stat-card__body">
            <div class="sl-stat-card__big">{{ providerStatusLabel }}</div>
            <div class="sl-stat-card__sub">{{ providerName }}</div>
          </div>
          <footer class="sl-stat-card__foot">
            <span class="sl-stat-card__foot-label">Last activity</span>
            <span class="sl-stat-card__foot-value">{{ lastActivityLabel }}</span>
          </footer>
        </article>

        <!-- Recent activity summary -->
        <article class="sl-stat-card sl-stat-card--real" aria-labelledby="sl-stat-activity">
          <header class="sl-stat-card__head">
            <Activity :size="18" class="sl-stat-card__icon" />
            <h2 id="sl-stat-activity" class="sl-stat-card__title">Activity</h2>
          </header>
          <div class="sl-stat-card__body">
            <div class="sl-stat-pair">
              <div class="sl-stat-pair__cell">
                <div class="sl-stat-pair__value">{{ downloadsLast24h }}</div>
                <div class="sl-stat-pair__label">downloads · 24h</div>
              </div>
              <div class="sl-stat-pair__cell">
                <div class="sl-stat-pair__value">{{ downloadsLast7d }}</div>
                <div class="sl-stat-pair__label">downloads · 7d</div>
              </div>
            </div>
          </div>
          <footer class="sl-stat-card__foot">
            <span class="sl-stat-card__foot-label">Tracked events</span>
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
            <h2 id="sl-stat-storage" class="sl-stat-card__title">Storage</h2>
            <span class="sl-stat-card__pill">Coming soon</span>
          </header>
          <div class="sl-stat-card__body">
            <div class="sl-stat-card__big sl-stat-card__big--muted">—</div>
            <div class="sl-stat-card__sub">
              On-disk cache size will appear here once the streamloader
              backend exposes a cache-stats endpoint.
            </div>
          </div>
          <footer class="sl-stat-card__foot">
            <span class="sl-stat-card__foot-label">Status</span>
            <span class="sl-stat-card__foot-value">Pending backend support</span>
          </footer>
        </article>
      </div>
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
  const t = (store.libraryTracksCount ?? 0).toLocaleString();
  const a = (store.libraryArtistsCount ?? 0).toLocaleString();
  const al = (store.libraryAlbumsCount ?? 0).toLocaleString();
  return `${t} tracks · ${a} artists · ${al} albums`;
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
  if (!api.providers || Object.keys(api.providers).length === 0) return "Connecting…";
  if (!p) return "Not configured";
  return p.available ? "Online" : "Degraded";
});

const providerName = computed(
  () => streamloaderProvider.value?.name ?? "No streamloader provider",
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
  if (!latest) return "No recorded activity yet";
  const diff = Math.max(0, now.value - latest.timestamp);
  if (diff < 60_000) return "just now";
  if (diff < HOUR_MS) {
    const m = Math.floor(diff / 60_000);
    return `${m} min${m === 1 ? "" : "s"} ago`;
  }
  if (diff < DAY_MS) {
    const h = Math.floor(diff / HOUR_MS);
    return `${h} hour${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.floor(diff / DAY_MS);
  return `${d} day${d === 1 ? "" : "s"} ago`;
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

/* Header — same teal underline language as RecentlyPlayed. */
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
  background-image: linear-gradient(
    to right,
    rgba(45, 212, 191, 0.85),
    rgba(45, 212, 191, 0.15)
  );
  background-repeat: no-repeat;
  background-size: 200px 2px;
  background-position: 0 100%;
  align-self: flex-start;
}

:global(.v-theme--light) .sl-stats-title {
  background-image: linear-gradient(
    to right,
    rgba(15, 118, 110, 0.85),
    rgba(15, 118, 110, 0.15)
  );
}

.sl-stats-subtitle {
  font-size: 0.85rem;
  color: rgba(var(--v-theme-on-background), 0.62);
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
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.18),
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
