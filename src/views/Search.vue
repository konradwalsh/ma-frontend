<template>
  <section>
    <Container variant="default" style="padding-top: 20px">
      <div class="streamloader-search-wrap">
        <v-text-field
          id="searchInput"
          v-model="store.globalSearchTerm"
          class="streamloader-search-input"
          clearable
          prepend-inner-icon="mdi-magnify"
          :label="$t('type_to_search')"
          hide-details
          variant="outlined"
          @focus="searchHasFocus = true"
          @blur="onSearchBlur"
          @keydown="onSearchKeydown"
          @keydown.enter="commitRecentSearch"
        />
        <!-- inline spinner while a search is in flight -->
        <div
          v-if="loading"
          class="streamloader-search-spinner"
          aria-hidden="true"
        >
          <StreamloaderSpinner :size="20" label="Searching" />
        </div>
        <!-- recent-searches dropdown when input is focused but empty -->
        <div
          v-if="
            searchHasFocus && !store.globalSearchTerm && recentSearches.length
          "
          class="streamloader-recent-dropdown"
          role="listbox"
          aria-label="Recent searches"
        >
          <div class="streamloader-recent-header">Recent searches</div>
          <button
            v-for="(term, idx) in recentSearches.slice(0, 5)"
            :key="`${term}-${idx}`"
            type="button"
            class="streamloader-recent-item"
            role="option"
            @mousedown.prevent="reRunRecent(term)"
          >
            <v-icon size="16" class="streamloader-recent-icon"
              >mdi-history</v-icon
            >
            <span class="streamloader-recent-term">{{ term }}</span>
          </button>
          <button
            type="button"
            class="streamloader-recent-clear"
            @mousedown.prevent="clearRecentSearches"
          >
            Clear recent searches
          </button>
        </div>
      </div>

      <v-chip-group
        v-model="selectedSearchType"
        class="streamloader-search-chips"
        style="margin-top: 10px; margin-left: 10px"
        selected-class="text-primary"
        mandatory
      >
        <v-chip
          v-for="item in [
            SEARCH_TYPE_ALL,
            MediaType.TRACK,
            MediaType.ARTIST,
            MediaType.ALBUM,
            MediaType.PLAYLIST,
            MediaType.PODCAST,
            MediaType.AUDIOBOOK,
            MediaType.RADIO,
            MediaType.GENRE,
          ]"
          :key="item"
          :value="item"
          filter
        >
          {{ $t(item === SEARCH_TYPE_ALL ? "searchtype_all" : item + "s") }}
          <span
            v-if="resultCountFor(item) !== null"
            class="streamloader-chip-count"
            >({{ resultCountFor(item) }})</span
          >
        </v-chip>
      </v-chip-group>

      <!-- empty state when no search term yet -->
      <StreamloaderEmptyState
        v-if="!store.globalSearchTerm && !loading"
        :icon="'mdi-magnify'"
        :title="$t('type_to_search')"
        message="Search across every connected provider — Spotify, Tidal, Plex, your local library and more."
      />

      <!-- no-results state: search ran, returned nothing -->
      <StreamloaderEmptyState
        v-else-if="
          !loading &&
          store.globalSearchTerm &&
          searchResult &&
          !store.globalSearchType &&
          searchResultIsEmpty
        "
        :icon="'mdi-magnify-close'"
        :title="`No results for &quot;${store.globalSearchTerm}&quot;`"
        message="Try a different spelling, drop a word, or browse the providers in settings to make sure they're connected."
      />

      <!-- compact all-media-types searchresult -->
      <div v-if="!store.globalSearchType">
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('tracks'),
            icon: 'mdi-file-music',
            items: searchResult.tracks,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('artists'),
            icon: 'mdi-account-music',
            items: searchResult.artists,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('albums'),
            icon: 'mdi-album',
            items: searchResult.albums,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('playlists'),
            icon: 'mdi-playlist-music',
            items: searchResult.playlists,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('podcasts'),
            icon: 'mdi-podcast',
            items: searchResult.podcasts,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('audiobooks'),
            icon: 'mdi-book-play-outline',
            items: searchResult.audiobooks,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('radios'),
            icon: 'mdi-radio',
            items: searchResult.radio,
          }"
          :show-provider-on-cover="true"
        />
        <WidgetRow
          v-if="searchResult && !loading"
          :widget-row="{
            title: $t('genres'),
            icon: GenreIcon,
            items: searchResult.genres,
          }"
          :show-provider-on-cover="true"
        />
      </div>
      <!-- tracks-only searchresult -->
      <div v-else-if="!loading">
        <ItemsListing
          :itemtype="`${store.globalSearchType}s`"
          :show-provider="true"
          :show-favorites-only-filter="false"
          :show-select-button="false"
          :show-refresh-button="false"
          :load-items="
            async (params) => {
              return filteredItems(store.globalSearchType!);
            }
          "
          :title="$t(`${store.globalSearchType}s`)"
          :allow-key-hooks="false"
          :show-search-button="false"
          :infinite-scroll="true"
          :sort-keys="[]"
          style="padding: 0"
        />
      </div>
    </Container>
  </section>
</template>

<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-unused-vars,vue/no-setup-props-destructure */
import Container from "@/components/Container.vue";
import GenreIcon from "@/components/icons/GenreIcon.vue";
import ItemsListing from "@/components/ItemsListing.vue";
import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";
import WidgetRow from "@/components/WidgetRow.vue";
import { useUserPreferences } from "@/composables/userPreferences";
import { api } from "@/plugins/api";
import { MediaType, SearchResults } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const SEARCH_TYPE_ALL = "all";
const RECENT_SEARCHES_KEY = "streamloader-recent-searches";
const RECENT_SEARCHES_MAX = 10;

// True when the all-types search returned but every result bucket is empty.
// Used to swap the WidgetRow stack out for a friendly no-results panel.
const searchResultIsEmpty = computed(() => {
  const r = searchResult.value;
  if (!r) return false;
  return (
    !r.tracks?.length &&
    !r.artists?.length &&
    !r.albums?.length &&
    !r.playlists?.length &&
    !r.podcasts?.length &&
    !r.audiobooks?.length &&
    !r.radio?.length &&
    !r.genres?.length
  );
});

// computed to bridge between chip-group (needs a real value) and store (uses undefined for "all")
const selectedSearchType = computed({
  get: () => store.globalSearchType || SEARCH_TYPE_ALL,
  set: (val: string) => {
    store.globalSearchType =
      val === SEARCH_TYPE_ALL ? undefined : (val as MediaType);
  },
});

// local refs
const searchHasFocus = ref(false);
const searchResult = ref<SearchResults>();
const loading = ref(false);
const throttleId = ref();
const recentSearches = ref<string[]>([]);
const { getPreference, setPreference } = useUserPreferences();

// Result-bucket counts for the chip badges. Returns null for the "all" chip
// (we don't badge "All" — would just sum every bucket and add no signal) and
// when no search has run yet (avoid showing "(0)" on every chip in the
// empty/initial state).
function resultCountFor(item: string): number | null {
  if (!searchResult.value) return null;
  if (item === SEARCH_TYPE_ALL) return null;
  switch (item) {
    case MediaType.TRACK:
      return searchResult.value.tracks?.length ?? 0;
    case MediaType.ARTIST:
      return searchResult.value.artists?.length ?? 0;
    case MediaType.ALBUM:
      return searchResult.value.albums?.length ?? 0;
    case MediaType.PLAYLIST:
      return searchResult.value.playlists?.length ?? 0;
    case MediaType.PODCAST:
      return searchResult.value.podcasts?.length ?? 0;
    case MediaType.AUDIOBOOK:
      return searchResult.value.audiobooks?.length ?? 0;
    case MediaType.RADIO:
      return searchResult.value.radio?.length ?? 0;
    case MediaType.GENRE:
      return searchResult.value.genres?.length ?? 0;
    default:
      return null;
  }
}

// --- Recent searches (localStorage-backed) ---
// Stored as a JSON array of strings, MRU first, deduped, capped at
// RECENT_SEARCHES_MAX. Read on mount, written every time a search produces
// results. Defensive against corrupt JSON / non-string entries because
// localStorage can be touched by other tabs or older app versions.
function loadRecentSearches() {
  try {
    const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (!raw) {
      recentSearches.value = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentSearches.value = parsed
        .filter(
          (x): x is string => typeof x === "string" && x.trim().length > 0,
        )
        .slice(0, RECENT_SEARCHES_MAX);
    }
  } catch {
    recentSearches.value = [];
  }
}

function persistRecentSearch(term: string) {
  const trimmed = term.trim();
  if (!trimmed) return;
  const next = [trimmed, ...recentSearches.value.filter((t) => t !== trimmed)];
  recentSearches.value = next.slice(0, RECENT_SEARCHES_MAX);
  try {
    localStorage.setItem(
      RECENT_SEARCHES_KEY,
      JSON.stringify(recentSearches.value),
    );
  } catch {
    // Storage quota / private mode — non-fatal, in-memory copy still works.
  }
}

function clearRecentSearches() {
  recentSearches.value = [];
  try {
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch {
    // ignore
  }
}

function reRunRecent(term: string) {
  store.globalSearchTerm = term;
  // The watcher kicks off the search; we just need the input to lose focus
  // so the dropdown closes (otherwise it lingers with the new term typed).
  searchHasFocus.value = false;
  const el = document.getElementById("searchInput") as HTMLInputElement | null;
  el?.blur();
}

// Esc behavior: first press clears the input (if it has content), second press
// blurs. Matches the Spotify/Apple Music pattern users already expect.
function onSearchKeydown(e: KeyboardEvent) {
  if (e.key !== "Escape") return;
  if (store.globalSearchTerm) {
    store.globalSearchTerm = "";
    e.preventDefault();
    e.stopPropagation();
  } else {
    const el = e.target as HTMLInputElement | null;
    el?.blur();
    e.preventDefault();
    e.stopPropagation();
  }
}

function onSearchBlur() {
  // Delay slightly so a recent-item click (mousedown) registers before the
  // dropdown unmounts. We also use @mousedown.prevent on the items, so this
  // is belt-and-braces — if focus management ever changes upstream, the
  // mousedown handlers still win.
  setTimeout(() => {
    searchHasFocus.value = false;
  }, 120);
}

function commitRecentSearch() {
  // Pressing Enter is the user's signal "yes, this is a real search" — persist
  // it now even though the watcher already fired the API call on debounce.
  if (store.globalSearchTerm) persistRecentSearch(store.globalSearchTerm);
}

// watchers
watch(
  () => store.globalSearchTerm,
  () => {
    clearTimeout(throttleId.value);
    throttleId.value = setTimeout(() => {
      loadSearchResults(store.globalSearchTerm, store.globalSearchType);
    }, 1000);
  },
  { immediate: true },
);
watch(
  () => store.globalSearchType,
  () => {
    setPreference(
      "globalSearchType",
      store.globalSearchType || SEARCH_TYPE_ALL,
    );
    loadSearchResults(store.globalSearchTerm, store.globalSearchType);
  },
);

const loadSearchResults = async function (
  searchTerm?: string,
  filter?: MediaType,
) {
  loading.value = true;
  setPreference("globalSearch", searchTerm || "");
  const limit = store.globalSearchType ? 50 : 8;
  const mediaTypes = filter ? [filter] : undefined;
  if (searchTerm) {
    if (filter === MediaType.GENRE) {
      // Genre-only search: use library search directly
      const genres = await api.getLibraryGenres({
        search: searchTerm,
        limit,
        offset: 0,
        order_by: "name",
      });
      searchResult.value = {
        artists: [],
        albums: [],
        tracks: [],
        playlists: [],
        radio: [],
        podcasts: [],
        audiobooks: [],
        genres,
      };
    } else {
      // Standard search + supplement with genre results
      const [results, genres] = await Promise.all([
        api.search(searchTerm, mediaTypes, limit),
        !filter
          ? api.getLibraryGenres({
              search: searchTerm,
              limit,
              offset: 0,
              order_by: "name",
            })
          : Promise.resolve([]),
      ]);
      // Defensive normalize: backend versions may omit empty buckets from
      // the SearchResults payload (esp. `audiobooks`, `podcasts`, `radio`,
      // `genres` on older servers). WidgetRow.vue gates rendering on
      // `widgetRow.items.length > 0` — accessing `.length` on `undefined`
      // throws a TypeError that bubbles to StreamloaderErrorBoundary
      // (added in batch 42 around <router-view>) and shows the user the
      // "Something went wrong" fallback INSTEAD of the search results,
      // which reads as "search doesn't work anymore". The interface
      // declares all buckets non-optional but runtime payloads can lie.
      searchResult.value = {
        artists: results.artists ?? [],
        albums: results.albums ?? [],
        tracks: results.tracks ?? [],
        playlists: results.playlists ?? [],
        radio: results.radio ?? [],
        podcasts: results.podcasts ?? [],
        audiobooks: results.audiobooks ?? [],
        genres: results.genres?.length ? results.genres : (genres ?? []),
      };
    }
  } else {
    searchResult.value = undefined;
  }
  loading.value = false;
  // Persist to recent searches once the search has actually run. We do it
  // here rather than in the input watcher so we don't pollute the list with
  // every keystroke during typing.
  if (searchTerm) persistRecentSearch(searchTerm);
};

onMounted(() => {
  loadRecentSearches();
  if (!store.globalSearchTerm) {
    const savedSearch = getPreference<string>("globalSearch").value;
    if (savedSearch && savedSearch !== "null") {
      store.globalSearchTerm = savedSearch;
    }
  }
  const savedSearchType = getPreference<string>("globalSearchType").value;
  if (
    savedSearchType &&
    savedSearchType !== "null" &&
    savedSearchType !== SEARCH_TYPE_ALL
  ) {
    store.globalSearchType = savedSearchType as MediaType;
  }
});

// lifecycle hooks
const keyListener = function (e: KeyboardEvent) {
  // Ignore keyboard events with modifier keys
  if (e.ctrlKey || e.altKey || e.metaKey) {
    return;
  }

  if (store.showPlayersMenu) {
    return;
  }

  if (!searchHasFocus.value && e.key == "Backspace" && store.globalSearchTerm) {
    store.globalSearchTerm = store.globalSearchTerm.slice(0, -1);
  } else if (!searchHasFocus.value && e.key.length == 1) {
    // Coerce undefined/null → "" before concat so we don't end up with
    // "undefinedabc" or "nullabc" in the search term (Vuetify's `clearable`
    // emits `null`, and the initial store value is `undefined`).
    store.globalSearchTerm = (store.globalSearchTerm || "") + e.key;
  }
};
document.addEventListener("keyup", keyListener);

onBeforeUnmount(() => {
  document.removeEventListener("keyup", keyListener);
});

const filteredItems = function (mediaType: MediaType) {
  if (!searchResult.value) return [];
  if (mediaType == MediaType.TRACK) return searchResult.value.tracks;
  if (mediaType == MediaType.ARTIST) return searchResult.value.artists;
  if (mediaType == MediaType.ALBUM) return searchResult.value.albums;
  if (mediaType == MediaType.PLAYLIST) return searchResult.value.playlists;
  if (mediaType == MediaType.PODCAST) return searchResult.value.podcasts;
  if (mediaType == MediaType.AUDIOBOOK) return searchResult.value.audiobooks;
  if (mediaType == MediaType.RADIO) return searchResult.value.radio;
  if (mediaType == MediaType.GENRE) return searchResult.value.genres;
  return [];
};
</script>

<style scoped>
/* lighter, ALACarte-style border on the search input + teal focus ring */
.streamloader-search-input
  :deep(.v-field--variant-outlined .v-field__outline__start),
.streamloader-search-input
  :deep(.v-field--variant-outlined .v-field__outline__end),
.streamloader-search-input
  :deep(.v-field--variant-outlined .v-field__outline__notch::before),
.streamloader-search-input
  :deep(.v-field--variant-outlined .v-field__outline__notch::after) {
  opacity: 0.5;
}
.streamloader-search-input :deep(.v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.18);
  border-radius: 6px;
  transition: box-shadow 0.18s ease;
}

/* tighter chip group, teal underline accent on the active filter chip */
.streamloader-search-chips :deep(.v-chip) {
  transition: transform 0.15s ease;
}
.streamloader-search-chips :deep(.v-chip.text-primary) {
  position: relative;
  font-weight: 600;
}
.streamloader-search-chips :deep(.v-chip.text-primary)::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: -4px;
  height: 2px;
  border-radius: 2px;
  background: rgb(var(--v-theme-primary));
  opacity: 0.85;
}

/* count badge appended inside each chip — dim, not competing with the label */
.streamloader-chip-count {
  margin-left: 6px;
  font-size: 0.78em;
  font-variant-numeric: tabular-nums;
  opacity: 0.6;
}
.streamloader-search-chips
  :deep(.v-chip.text-primary)
  .streamloader-chip-count {
  opacity: 0.85;
}

/* wrap so the spinner + recent-searches dropdown can position over the input */
.streamloader-search-wrap {
  position: relative;
}
.streamloader-search-spinner {
  position: absolute;
  top: 50%;
  right: 48px; /* clear of the v-text-field clear button */
  transform: translateY(-50%);
  pointer-events: none;
  z-index: 2;
}

/* recent-searches dropdown — Spotify-style suggestions panel */
.streamloader-recent-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  padding: 6px 0;
  z-index: 10;
  overflow: hidden;
}
.streamloader-recent-header {
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.55;
  padding: 6px 14px 4px;
}
.streamloader-recent-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
  transition: background 0.12s ease;
}
.streamloader-recent-item:hover,
.streamloader-recent-item:focus-visible {
  background: rgba(45, 212, 191, 0.08);
  outline: none;
}
.streamloader-recent-icon {
  opacity: 0.55;
  flex-shrink: 0;
}
.streamloader-recent-term {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.streamloader-recent-clear {
  display: block;
  width: 100%;
  padding: 8px 14px;
  margin-top: 4px;
  border: 0;
  border-top: 1px solid rgba(var(--v-border-color), 0.12);
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  font-size: 0.82rem;
  color: rgb(var(--v-theme-primary));
  transition: background 0.12s ease;
}
.streamloader-recent-clear:hover,
.streamloader-recent-clear:focus-visible {
  background: rgba(45, 212, 191, 0.08);
  outline: none;
}
</style>
