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
  <div v-if="!collapsed && hasCounts" class="sl-lib-stats" :title="fullTitle">
    <span class="sl-lib-stats__label">Library</span>
    <span class="sl-lib-stats__row">
      <span class="sl-lib-stats__value">{{ formatted.tracks }}</span>
      <span class="sl-lib-stats__unit">tracks</span>
      <span class="sl-lib-stats__sep">·</span>
      <span class="sl-lib-stats__value">{{ formatted.artists }}</span>
      <span class="sl-lib-stats__unit">artists</span>
      <span class="sl-lib-stats__sep">·</span>
      <span class="sl-lib-stats__value">{{ formatted.albums }}</span>
      <span class="sl-lib-stats__unit">albums</span>
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { store } from "@/plugins/store";
import { useSidebar } from "@/components/ui/sidebar";

const { state } = useSidebar();
const collapsed = computed(() => state.value === "collapsed");

const hasCounts = computed(
  () =>
    store.libraryTracksCount !== undefined ||
    store.libraryArtistsCount !== undefined ||
    store.libraryAlbumsCount !== undefined,
);

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
  const t = (store.libraryTracksCount ?? 0).toLocaleString();
  const a = (store.libraryArtistsCount ?? 0).toLocaleString();
  const al = (store.libraryAlbumsCount ?? 0).toLocaleString();
  return `Library: ${t} tracks · ${a} artists · ${al} albums`;
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
</style>
