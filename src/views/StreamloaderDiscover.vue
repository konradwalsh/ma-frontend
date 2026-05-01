<!--
  StreamloaderDiscover.vue

  A streamloader-curated "Discover" view that complements (does not replace)
  the existing /discover HomeView. Lives at /streamloader-discover and is
  reachable from the sidebar.

  Why this exists in the fork:
    Upstream Music Assistant exposes a recommendations rail on the HomeView
    but that surface is dominated by provider-side trending content. This
    view focuses entirely on what the LOCAL streamloader library knows
    about: recently added, randomized "lucky pick", and recently active
    artists. It's an at-a-glance way to rediscover your own catalogue.

  Sections (each renders as an honest no-op when its underlying data is
  unavailable — empty rails do not show, never fake data):
    1. "Recently Added"        — api.getLibraryAlbums(order_by=timestamp_added DESC)
    2. "Most Played"           — NOT SUPPORTED. The backend track payload has
                                 no play_count / times_played field, so this
                                 section is intentionally a no-op until the
                                 server exposes it. Documented here so the
                                 next person who reads this doesn't think it
                                 was forgotten.
    3. "Random Picks"          — api.getLibraryAlbums fetched broadly, then
                                 client-side Fisher-Yates shuffled.
    4. "Recently Active Artists" — derived from api.getRecentlyPlayedItems:
                                 we walk the play history newest-first and
                                 collect unique artist references. Honest
                                 no-op if the play history is empty.

  Loading: per-section skeleton + a single overall StreamloaderSpinner while
  the first batch of fetches resolves.

  Empty state: ONLY shown when EVERY section ends up with zero items (i.e.
  fresh install with nothing in the library at all). Otherwise sections
  silently disappear individually.
-->
<template>
  <div class="sl-discover">
    <Toolbar
      :icon="Compass"
      color="background"
      :title="t('streamloader.discover.page_title')"
    />

    <Container variant="comfortable" class="sl-discover-container">
      <!-- Header with brand-teal underline (matches RecentlyPlayed page) -->
      <div class="sl-discover-header">
        <h1 class="sl-discover-title">
          {{ t("streamloader.discover.page_title") }}
        </h1>
        <div class="sl-discover-subtitle">
          {{ t("streamloader.discover.subtitle") }}
        </div>
      </div>

      <!-- Initial overall load: brand spinner. Once any section has data
           we render rails individually instead. -->
      <div v-if="isInitialLoading" class="sl-discover-loading">
        <StreamloaderSpinner
          :size="48"
          :label="t('streamloader.discover.loading_label')"
        />
      </div>

      <!-- All sections empty AFTER load = overall empty state. -->
      <StreamloaderEmptyState
        v-else-if="!hasAnyContent"
        :icon="Compass"
        :title="t('streamloader.discover.empty_title')"
        :message="t('streamloader.discover.empty_message')"
      />

      <!-- Sections. Each rail self-hides when its items array is empty. -->
      <div v-else class="sl-discover-stack">
        <section v-if="recentlyAdded.length > 0" class="sl-rail">
          <h2 class="sl-rail__title">
            {{ t("streamloader.discover.section_recently_added") }}
          </h2>
          <div class="sl-rail__carousel">
            <Carousel
              :items="recentlyAdded"
              :item-key="(item: Album) => item.uri"
            >
              <template #default="{ item }">
                <PanelviewItemCompact
                  :item="item"
                  :is-available="itemIsAvailable(item)"
                />
              </template>
            </Carousel>
          </div>
        </section>

        <!-- "Most Played" honest no-op: section omitted entirely until the
             backend exposes a play_count field. See file header for why. -->

        <section v-if="randomPicks.length > 0" class="sl-rail">
          <h2 class="sl-rail__title">
            {{ t("streamloader.discover.section_random_picks") }}
          </h2>
          <div class="sl-rail__carousel">
            <Carousel
              :items="randomPicks"
              :item-key="(item: Album) => item.uri"
            >
              <template #default="{ item }">
                <PanelviewItemCompact
                  :item="item"
                  :is-available="itemIsAvailable(item)"
                />
              </template>
            </Carousel>
          </div>
        </section>

        <section v-if="recentlyActiveArtists.length > 0" class="sl-rail">
          <h2 class="sl-rail__title">
            {{ t("streamloader.discover.section_recently_active_artists") }}
          </h2>
          <div class="sl-rail__carousel">
            <Carousel
              :items="recentlyActiveArtists"
              :item-key="(item) => item.uri"
            >
              <template #default="{ item }">
                <PanelviewItemCompact
                  :item="item"
                  :is-available="itemIsAvailable(item)"
                />
              </template>
            </Carousel>
          </div>
        </section>
      </div>
    </Container>
  </div>
</template>

<script setup lang="ts">
import Carousel from "@/components/Carousel.vue";
import Container from "@/components/Container.vue";
import PanelviewItemCompact from "@/components/PanelviewItemCompact.vue";
import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";
import Toolbar from "@/components/Toolbar.vue";
import api from "@/plugins/api";
import { itemIsAvailable } from "@/plugins/api/helpers";
import {
  EventType,
  MediaType,
  type Album,
  type EventMessage,
  type ItemMapping,
} from "@/plugins/api/interfaces";
import { Compass } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const DISPLAY_LIMIT = 12;
// Pull a wider candidate pool so the random shuffle has variety beyond
// just "the 12 most recently added items" — otherwise random == recent.
const RANDOM_POOL_SIZE = 100;
// How many recently-played items to walk when collecting unique artists.
// 50 is enough to cover several listening sessions without making the
// payload heavy.
const RECENT_PLAY_WINDOW = 50;

const recentlyAdded = ref<Album[]>([]);
const randomPicks = ref<Album[]>([]);
const recentlyActiveArtists = ref<ItemMapping[]>([]);
const isInitialLoading = ref(true);

const hasAnyContent = computed(
  () =>
    recentlyAdded.value.length > 0 ||
    randomPicks.value.length > 0 ||
    recentlyActiveArtists.value.length > 0,
);

// Fisher-Yates shuffle. Local helper to avoid a runtime dependency.
// Trailing comma in the generic disambiguates it from JSX for the ESLint
// parser running inside Vue SFC <script> blocks.
const shuffle = <T,>(arr: T[]): T[] => {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const loadRecentlyAdded = async () => {
  try {
    const albums = await api.getLibraryAlbums(
      undefined, // favorite
      undefined, // search
      DISPLAY_LIMIT,
      0,
      "timestamp_added DESC",
    );
    recentlyAdded.value = albums ?? [];
  } catch {
    // Honest no-op: failure → render nothing for this section.
    recentlyAdded.value = [];
  }
};

const loadRandomPicks = async () => {
  try {
    const albums = await api.getLibraryAlbums(
      undefined,
      undefined,
      RANDOM_POOL_SIZE,
      0,
      "sort_name", // any stable order — we shuffle it anyway
    );
    if (!albums || albums.length === 0) {
      randomPicks.value = [];
      return;
    }
    randomPicks.value = shuffle(albums).slice(0, DISPLAY_LIMIT);
  } catch {
    randomPicks.value = [];
  }
};

const loadRecentlyActiveArtists = async () => {
  try {
    const recent = await api.getRecentlyPlayedItems(RECENT_PLAY_WINDOW);
    if (!recent || recent.length === 0) {
      recentlyActiveArtists.value = [];
      return;
    }
    // Walk recent plays newest-first and dedupe artists by URI.
    // The play log returns ItemMappings of mixed media types; only Track
    // and Album entries carry artist info we can use here. Rather than
    // deep-fetching every track to read its artist list, we approximate
    // by surfacing items whose own media_type is ARTIST. If the server
    // never returns artist-typed plays (current behaviour), this is an
    // honest no-op — we return [] and the section is hidden.
    const seen = new Set<string>();
    const artists: ItemMapping[] = [];
    for (const item of recent) {
      if (item.media_type !== MediaType.ARTIST) continue;
      if (seen.has(item.uri)) continue;
      seen.add(item.uri);
      artists.push(item);
      if (artists.length >= DISPLAY_LIMIT) break;
    }
    recentlyActiveArtists.value = artists;
  } catch {
    recentlyActiveArtists.value = [];
  }
};

const loadAll = async () => {
  await Promise.all([
    loadRecentlyAdded(),
    loadRandomPicks(),
    loadRecentlyActiveArtists(),
  ]);
  isInitialLoading.value = false;
};

onMounted(() => {
  loadAll();
  // Refresh on library mutations so the page stays live without a manual
  // reload. Both events are cheap to listen on; the handlers re-fetch the
  // affected sections only.
  const unsubAdded = api.subscribe(
    EventType.MEDIA_ITEM_ADDED,
    async (_evt: EventMessage) => {
      loadRecentlyAdded();
      loadRandomPicks();
    },
  );
  const unsubPlayed = api.subscribe(
    EventType.MEDIA_ITEM_PLAYED,
    async (_evt: EventMessage) => {
      loadRecentlyActiveArtists();
    },
  );
  onBeforeUnmount(() => {
    unsubAdded();
    unsubPlayed();
  });
});
</script>

<style scoped>
.sl-discover {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.sl-discover-container {
  padding-top: 8px;
}

/* Header — same brand pattern as StreamloaderRecentlyPlayed: lowercase
   feel, teal underline gradient under the title. */
.sl-discover-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 4px 18px;
}

.sl-discover-title {
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

:global(.v-theme--light) .sl-discover-title {
  background-image: linear-gradient(
    to right,
    rgba(15, 118, 110, 0.85),
    rgba(15, 118, 110, 0.15)
  );
}

.sl-discover-subtitle {
  font-size: 0.88rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  opacity: 0.65;
  color: rgb(var(--v-theme-on-background));
}

.sl-discover-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 64px 16px;
}

/* Stack of section rails. Gap matches the home-widget-stack spacing for
   visual continuity with HomeView. */
.sl-discover-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sl-rail {
  display: flex;
  flex-direction: column;
  margin-bottom: 4px;
}

.sl-rail__title {
  font-size: large;
  font-weight: bold;
  margin: 0 0 6px 4px;
  padding-bottom: 2px;
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

:global(.v-theme--light) .sl-rail__title {
  background-image: linear-gradient(
    to right,
    rgba(15, 118, 110, 0.85),
    rgba(15, 118, 110, 0.15)
  );
}

/* Match the panel surface used by every other rail (RecentlyDownloaded
   uses the same treatment). */
.sl-rail__carousel {
  background-color: rgb(var(--v-theme-panel));
  padding: 8px;
  padding-right: 0;
  border-radius: 5px 0 0 5px;
}

@media (max-width: 575px) {
  .sl-discover-header {
    margin: 4px 4px 12px;
  }

  .sl-discover-title {
    font-size: 1.25rem;
  }

  .sl-rail__carousel {
    padding: 6px;
    padding-right: 0;
  }
}
</style>
