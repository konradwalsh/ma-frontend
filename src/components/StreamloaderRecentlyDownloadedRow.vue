<!--
  StreamloaderRecentlyDownloadedRow.vue

  Horizontal "Recently Downloaded by Streamloader" rail for HomeView.

  Why: upstream Music Assistant surfaces generic "Recently Played" / trending
  rows but never surfaces what THIS user's streamloader fork has just
  acquired. The whole point of running streamloader is the cache; the home
  screen should reflect that.

  Data strategy:
    1. Fetch the most recent N tracks via api.getLibraryTracks() ordered by
       `timestamp_added desc`.
    2. Client-side filter to tracks whose provider_mappings include a
       streamloader-domain mapping. If none qualify (fresh install, etc.)
       we fall back to showing the recent-added list as-is so the rail
       isn't blank when the user clearly has activity.
    3. If after both passes there are still no items, render NOTHING — no
       empty state. The rail just doesn't show.

  Mounted from HomeView.vue between the hero and the upstream HomeWidgetRows.
-->
<template>
  <div
    v-if="enabled && (visibleItems.length > 0 || isInitialLoading)"
    class="sl-recent-row"
  >
    <v-toolbar
      class="sl-recent-row__header"
      color="transparent"
      density="compact"
    >
      <template #title>
        <div class="sl-recent-row__title-wrap">
          <span class="sl-recent-row__title">{{ title }}</span>
          <span class="sl-recent-row__chip">STREAMLOADER</span>
        </div>
      </template>
    </v-toolbar>

    <div class="sl-recent-row__carousel-wrapper">
      <!-- Initial load: show the brand spinner instead of an empty area
           or generic Vuetify circular. Disappears the moment the first
           fetch resolves (success OR empty). -->
      <div v-if="isInitialLoading" class="sl-recent-row__loading">
        <StreamloaderSpinner :size="40" label="Loading recent downloads" />
      </div>
      <Carousel
        v-else
        :items="visibleItems"
        :item-key="(item: Track) => item.uri"
      >
        <template #default="{ item }">
          <PanelviewItemCompact
            :item="item"
            :is-available="itemIsAvailable(item)"
          />
        </template>
      </Carousel>
    </div>
  </div>
</template>

<script setup lang="ts">
import Carousel from "@/components/Carousel.vue";
import PanelviewItemCompact from "@/components/PanelviewItemCompact.vue";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";
import api from "@/plugins/api";
import { itemIsAvailable } from "@/plugins/api/helpers";
import {
  EventType,
  type EventMessage,
  type Track,
} from "@/plugins/api/interfaces";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useStreamloaderPref } from "@/composables/streamloaderPrefs";

const STREAMLOADER_DOMAIN = "streamloader";

// Streamloader settings page → "Show Recently Downloaded rail on home".
const enabled = useStreamloaderPref("showRecentlyDownloaded");
const FETCH_LIMIT = 30; // pull a few extra so post-filtering still leaves ~12
const DISPLAY_LIMIT = 12;

const title = "Recently Downloaded by Streamloader";

const visibleItems = ref<Track[]>([]);
// Tracks ONLY the very first fetch — once it resolves (with items or not)
// we never show the spinner again. Subsequent refreshes from the
// MEDIA_ITEM_ADDED subscription are silent so the rail doesn't flicker
// every time a new track lands.
const isInitialLoading = ref(true);

const hasStreamloaderMapping = (track: Track): boolean => {
  return (
    track.provider_mappings?.some(
      (m) => m.provider_domain === STREAMLOADER_DOMAIN,
    ) ?? false
  );
};

const loadData = async () => {
  try {
    // Most-recent-added first. Backend supports `timestamp_added` as an
    // order_by; suffix with " DESC" so newest sit at the head of the rail.
    const tracks = await api.getLibraryTracks(
      undefined, // favorite
      undefined, // search
      FETCH_LIMIT,
      0,
      "timestamp_added DESC",
    );

    if (!tracks || tracks.length === 0) {
      visibleItems.value = [];
      return;
    }

    // Prefer tracks that the streamloader provider actually owns.
    const streamloaderOnly = tracks.filter(hasStreamloaderMapping);

    // Fall back to plain recent-added if the streamloader filter wipes
    // everything out (e.g. brand-new install, no cached items yet).
    const chosen = streamloaderOnly.length > 0 ? streamloaderOnly : tracks;

    visibleItems.value = chosen.slice(0, DISPLAY_LIMIT);
  } catch {
    // Best-effort feature — silently render nothing on failure rather
    // than spamming the homepage with an error chip.
    visibleItems.value = [];
  } finally {
    isInitialLoading.value = false;
  }
};

onMounted(() => {
  loadData();
  // Refresh whenever a new media item lands in the library — that's
  // exactly when the "recently downloaded" rail wants to update.
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_ADDED,
    async (_evt: EventMessage) => {
      loadData();
    },
  );
  onBeforeUnmount(unsub);
});
</script>

<style scoped>
.sl-recent-row {
  margin-bottom: 8px;
  margin-left: 0;
  padding-left: 0;
}

/* Header — same density as upstream WidgetRow but with a brand-teal
   accent: an inline "STREAMLOADER" tag chip and a thin teal underline
   under the title text itself. */
.sl-recent-row__header.v-toolbar :deep(.v-toolbar-title) {
  margin-inline-start: 0;
  font-size: large;
  font-weight: bold;
}

.sl-recent-row__header.v-toolbar {
  padding-inline-start: 4px;
}

.sl-recent-row__title-wrap {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.sl-recent-row__title {
  position: relative;
  padding-bottom: 2px;
  background-image: linear-gradient(
    to right,
    rgba(45, 212, 191, 0.85),
    rgba(45, 212, 191, 0.15)
  );
  background-repeat: no-repeat;
  background-size: 100% 2px;
  background-position: 0 100%;
}

.sl-recent-row__chip {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  padding: 2px 7px;
  border-radius: 999px;
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid rgba(45, 212, 191, 0.35);
  text-transform: uppercase;
  line-height: 1;
  user-select: none;
}

/* Light-theme: lift contrast for the accent so it doesn't disappear. */
:global(.v-theme--light) .sl-recent-row__chip {
  color: #0f766e;
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.35);
}

:global(.v-theme--light) .sl-recent-row__title {
  background-image: linear-gradient(
    to right,
    rgba(15, 118, 110, 0.85),
    rgba(15, 118, 110, 0.15)
  );
}

/* Match the panel surface used by every other rail on the page. */
.sl-recent-row__carousel-wrapper {
  background-color: rgb(var(--v-theme-panel));
  padding: 8px;
  padding-right: 0;
  border-radius: 5px 0 0 5px;
}

/* Spinner pad: keep the rail at roughly the same height it has when
   populated, so the page doesn't jump when the first results land. */
.sl-recent-row__loading {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding: 18px 12px;
  min-height: 120px;
}

@media (max-width: 575px) {
  .sl-recent-row {
    margin-bottom: 4px;
  }

  .sl-recent-row__carousel-wrapper {
    padding: 6px;
    padding-right: 0;
  }

  .sl-recent-row__chip {
    font-size: 0.58rem;
    padding: 2px 6px;
  }
}
</style>
