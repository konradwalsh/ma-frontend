<!--
  StreamloaderLibraryStats.vue

  Compact "Library: X tracks · Y artists · Z albums" footer widget for the
  AppSidebar. Surfaces the always-relevant library size at a glance so the
  user knows how much streamloader has accumulated without navigating to
  Settings → About.

  Reads `store.libraryTracksCount / libraryArtistsCount / libraryAlbumsCount`,
  which App.vue already populates on boot — no extra API calls, no backend
  changes. Hides itself when collapsed sidebar (icon-only mode) or while
  counts are still undefined.

  Brand styling matches the streamloader teal accent established by the
  HealthPill / ActivityPulse / SourceBadge widgets.
-->
<template>
  <div
    v-if="enabled && !collapsed && (hasCounts || showLoading)"
    class="sl-lib-stats"
    :title="
      hasCounts ? fullTitle : t('streamloader.library_stats.loading_title')
    "
  >
    <span class="sl-lib-stats__label">{{
      t("streamloader.library_stats.label")
    }}</span>
    <span v-if="hasCounts" class="sl-lib-stats__row">
      <span class="sl-lib-stats__value">{{ formatted.tracks }}</span>
      <span class="sl-lib-stats__unit">{{
        t("streamloader.library_stats.tracks")
      }}</span>
      <span class="sl-lib-stats__sep">·</span>
      <span class="sl-lib-stats__value">{{ formatted.artists }}</span>
      <span class="sl-lib-stats__unit">{{
        t("streamloader.library_stats.artists")
      }}</span>
      <span class="sl-lib-stats__sep">·</span>
      <span class="sl-lib-stats__value">{{ formatted.albums }}</span>
      <span class="sl-lib-stats__unit">{{
        t("streamloader.library_stats.albums")
      }}</span>
    </span>
    <!-- Show the on-brand spinner briefly while App.vue's library count
         hydration is in flight. Auto-hides once `hasCounts` flips true OR
         after a short timeout (so a stalled fetch doesn't pin the spinner
         visible forever — falls back to the original "render nothing"
         behaviour). -->
    <span v-else class="sl-lib-stats__loading">
      <StreamloaderSpinner
        :size="32"
        :label="t('streamloader.library_stats.loading_label')"
      />
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { store } from "@/plugins/store";
import { useSidebar } from "@/components/ui/sidebar";
import { useStreamloaderPref } from "@/composables/streamloaderPrefs";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";

const { t } = useI18n();

// Forward-looking placeholder prop. As of this commit the streamloader
// websocket api does NOT expose cache size / disk usage on its
// ProviderInstance (see src/plugins/api/interfaces.ts — no cache_size,
// cache_bytes, disk_usage, or quota fields). When the backend plugin
// gains a `get_cache_stats` (or equivalent) endpoint that returns the
// on-disk size of the streamloader cache in bytes, wire it through here
// and render alongside the count line as e.g. "12.4 GB cached". Until
// then this prop stays undefined and renders nothing — we deliberately
// do NOT fabricate a fake value.
//
// Expected from future backend endpoint:
//   - `cacheBytes`: total on-disk size of the streamloader cache (bytes)
//   - (optional) future `cacheQuotaBytes` for a percentage-full meter
defineProps<{
  cacheBytes?: number;
}>();

const { state } = useSidebar();
const collapsed = computed(() => state.value === "collapsed");
// Streamloader settings page can hide this widget without removing the
// sidebar slot — see /settings/streamloader → Player Display.
const enabled = useStreamloaderPref("showLibraryStats");

const hasCounts = computed(
  () =>
    store.libraryTracksCount !== undefined ||
    store.libraryArtistsCount !== undefined ||
    store.libraryAlbumsCount !== undefined,
);

// Show the on-brand spinner only during the early hydration window. After
// this expires we revert to the original silent-empty behaviour so a
// permanently-failed count fetch doesn't pin a stale spinner in the
// sidebar. Picked at 8s — empirically App.vue resolves counts well under
// 2s on a warm connection; this is a conservative ceiling.
const LOADING_TIMEOUT_MS = 8000;
const loadingExpired = ref(false);
let loadingTimer: ReturnType<typeof setTimeout> | undefined;
onMounted(() => {
  loadingTimer = setTimeout(() => {
    loadingExpired.value = true;
  }, LOADING_TIMEOUT_MS);
});
onBeforeUnmount(() => {
  if (loadingTimer) clearTimeout(loadingTimer);
});
const showLoading = computed(() => !hasCounts.value && !loadingExpired.value);

// Compact "1.2k" / "12.3k" formatter — keeps the footer one-line on narrow
// sidebars. Falls back to "—" while counts are still loading.
const compact = (n: number | undefined): string => {
  if (n === undefined || n === null) return "—";
  if (n < 1000) return n.toString();
  if (n < 10000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  if (n < 1_000_000) return Math.round(n / 1000) + "k";
  return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
};

const formatted = computed(() => ({
  tracks: compact(store.libraryTracksCount),
  artists: compact(store.libraryArtistsCount),
  albums: compact(store.libraryAlbumsCount),
}));

const fullTitle = computed(() => {
  const tracks = (store.libraryTracksCount ?? 0).toLocaleString();
  const artists = (store.libraryArtistsCount ?? 0).toLocaleString();
  const albums = (store.libraryAlbumsCount ?? 0).toLocaleString();
  return t("streamloader.library_stats.full_title", {
    tracks,
    artists,
    albums,
  });
});
</script>

<style scoped>
.sl-lib-stats {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px 8px;
  margin: 4px 2px 6px;
  border-top: 1px solid rgba(45, 212, 191, 0.18);
  font-size: 0.7rem;
  line-height: 1.2;
  user-select: none;
}

.sl-lib-stats__label {
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #2dd4bf;
  opacity: 0.85;
}

.sl-lib-stats__row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 3px;
  color: rgba(229, 231, 235, 0.78);
}

.sl-lib-stats__value {
  font-weight: 600;
  color: rgba(229, 231, 235, 0.95);
  font-variant-numeric: tabular-nums;
}

.sl-lib-stats__unit {
  opacity: 0.7;
}

.sl-lib-stats__sep {
  opacity: 0.45;
  margin: 0 1px;
}

.sl-lib-stats__loading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 4px 0 2px;
}
</style>
