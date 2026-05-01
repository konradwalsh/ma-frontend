<template>
  <section>
    <Container variant="default" style="padding-top: 20px">
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
        @blur="searchHasFocus = false"
      />

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
          :text="$t(item === SEARCH_TYPE_ALL ? 'searchtype_all' : item + 's')"
          :value="item"
          filter
        />
      </v-chip-group>

      <v-progress-linear
        v-if="loading"
        color="primary"
        height="3"
        indeterminate
        rounded
        style="margin-top: 15px"
      />

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
import WidgetRow from "@/components/WidgetRow.vue";
import { useUserPreferences } from "@/composables/userPreferences";
import { api } from "@/plugins/api";
import { MediaType, SearchResults } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

const SEARCH_TYPE_ALL = "all";

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
const { getPreference, setPreference } = useUserPreferences();

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
      searchResult.value = {
        ...results,
        genres: results.genres?.length ? results.genres : genres,
      };
    }
  } else {
    searchResult.value = undefined;
  }
  loading.value = false;
};

onMounted(() => {
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
    store.globalSearchTerm += e.key;
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
</style>
