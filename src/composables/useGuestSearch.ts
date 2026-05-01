/**
 * Guest search composable for search, filtering, artist drill-down,
 * and infinite scroll on search results.
 *
 * Streamloader-fork additions (v2026.4): in-memory query cache + UX state
 * (stage hints, cancel, fromCache) so long backend searches feel responsive
 * even when the actual provider call takes minutes.
 */

import { ref, computed, watch } from "vue";
import api from "@/plugins/api";
import { MediaType, type Artist, type Track } from "@/plugins/api/interfaces";
import { sortByRelevance } from "@/helpers/relevanceScoring";
import { $t } from "@/plugins/i18n";
import { toast } from "vue-sonner";

// In-memory cache for recent search results. Keyed by `${filter}::${query}`.
// 5 min TTL — long enough to cover a guest re-typing the same query, short
// enough that providers' new content still gets surfaced eventually.
const SEARCH_CACHE_TTL_MS = 5 * 60 * 1000;
type CacheEntry = { results: (Track | Artist)[]; timestamp: number };
const searchCache = new Map<string, CacheEntry>();

const cacheKey = (query: string, filter: string) =>
  `${filter}::${query.trim().toLowerCase()}`;

export function useGuestSearch() {
  // Search state
  const searchQuery = ref("");
  const searchResults = ref<(Track | Artist)[]>([]);
  const searching = ref(false);
  const hasSearched = ref(false);
  const searchFilter = ref<"all" | "track" | "artist">("all");
  // True when the currently-displayed results came from the in-memory cache.
  // Used to render the "Showing cached results" + Refresh hint.
  const fromCache = ref(false);
  // Stage hint shown during long searches: "" -> "still" -> "longer".
  // Driven by 5s and 30s timers below; rendered by PartyGuestView.
  const searchStage = ref<"" | "still" | "longer">("");
  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let stageStillTimer: ReturnType<typeof setTimeout> | null = null;
  let stageLongerTimer: ReturnType<typeof setTimeout> | null = null;
  // Generation counter so we can ignore stale in-flight responses after the
  // user cancels or starts a fresh search. The api.search call itself does
  // not accept an AbortSignal, so we tag each call with a token instead.
  let searchToken = 0;

  // Artist drill-down state
  const selectedArtist = ref<Artist | null>(null);
  const artistTracks = ref<Track[]>([]);
  const loadingArtistTracks = ref(false);

  // Infinite scroll state
  const resultsListRef = ref<HTMLElement | null>(null);
  const displayedResultsCount = ref(10);
  const displayedResults = computed(() =>
    searchResults.value.slice(0, displayedResultsCount.value),
  );

  // Helper to blur active element (hides mobile keyboard)
  const blurActiveElement = () => {
    (document.activeElement as HTMLElement)?.blur();
  };

  const clearStageTimers = () => {
    if (stageStillTimer) {
      clearTimeout(stageStillTimer);
      stageStillTimer = null;
    }
    if (stageLongerTimer) {
      clearTimeout(stageLongerTimer);
      stageLongerTimer = null;
    }
  };

  const startStageTimers = () => {
    clearStageTimers();
    searchStage.value = "";
    stageStillTimer = setTimeout(() => {
      searchStage.value = "still";
    }, 5000);
    stageLongerTimer = setTimeout(() => {
      searchStage.value = "longer";
    }, 30000);
  };

  const performSearch = async (options?: { force?: boolean }) => {
    if (!searchQuery.value || searchQuery.value.length < 2) return;

    // Cancel any pending debounce to prevent double-fire when Enter triggers
    // an immediate search while a debounce timer is still pending
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = null;
    }

    blurActiveElement();

    // Cache hit short-circuit. Skipped when the user explicitly forces a
    // refresh via the "Refresh" button on the cached-results banner.
    const key = cacheKey(searchQuery.value, searchFilter.value);
    if (!options?.force) {
      const cached = searchCache.get(key);
      if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL_MS) {
        searchResults.value = cached.results;
        displayedResultsCount.value = 10;
        hasSearched.value = true;
        fromCache.value = true;
        searching.value = false;
        searchStage.value = "";
        return;
      }
    }

    // Bump the generation token so any in-flight (older) call's response
    // is discarded when it eventually resolves.
    const myToken = ++searchToken;

    fromCache.value = false;
    searching.value = true;
    hasSearched.value = true;
    startStageTimers();
    try {
      const mediaTypes: MediaType[] = [];
      if (searchFilter.value === "all" || searchFilter.value === "track") {
        mediaTypes.push(MediaType.TRACK);
      }
      if (searchFilter.value === "all" || searchFilter.value === "artist") {
        mediaTypes.push(MediaType.ARTIST);
      }

      const results = await api.search(searchQuery.value, mediaTypes);

      // Drop the response if the user cancelled or kicked off a newer search
      // while this one was still pending — prevents stale results clobbering
      // a fresh search.
      if (myToken !== searchToken) return;

      let combinedResults: (Track | Artist)[];
      if (searchFilter.value === "track") {
        combinedResults = results.tracks;
      } else if (searchFilter.value === "artist") {
        combinedResults = results.artists;
      } else {
        combinedResults = [...results.tracks, ...results.artists];
      }

      const sorted = sortByRelevance(combinedResults, searchQuery.value);
      searchResults.value = sorted;
      displayedResultsCount.value = 10;
      // Cache only non-empty result sets; empty results are usually a
      // transient provider hiccup and shouldn't be re-served from cache.
      if (sorted.length > 0) {
        searchCache.set(key, { results: sorted, timestamp: Date.now() });
      }
    } catch (error) {
      if (myToken !== searchToken) return;
      console.error("Search failed:", error);
      toast.error($t("providers.party.guest_page.search_failed"));
    } finally {
      if (myToken === searchToken) {
        searching.value = false;
        clearStageTimers();
        searchStage.value = "";
      }
    }
  };

  // User-initiated cancel: drop the in-flight request (it'll still complete
  // server-side, but we ignore the response via searchToken) and reset the
  // visible state so the page doesn't sit on a spinner.
  const cancelSearch = () => {
    if (!searching.value) return;
    searchToken++;
    searching.value = false;
    clearStageTimers();
    searchStage.value = "";
    if (searchResults.value.length === 0) {
      hasSearched.value = false;
    }
  };

  // Force a fresh fetch even if the query is in cache — wired to the
  // "Refresh" button rendered alongside the cached-results banner.
  const refreshSearch = () => {
    return performSearch({ force: true });
  };

  const debouncedSearch = () => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    if (searchQuery.value && searchQuery.value.length >= 2) {
      searchDebounceTimer = setTimeout(() => {
        performSearch();
      }, 2000);
    }
  };

  // Watch for search query changes
  watch(searchQuery, (newQuery) => {
    if (!newQuery || newQuery.length < 2) {
      if (hasSearched.value) {
        searchResults.value = [];
        hasSearched.value = false;
      }
    } else {
      debouncedSearch();
    }
  });

  // Watch for filter changes and re-search
  watch(searchFilter, () => {
    if (searchQuery.value && searchQuery.value.length >= 2) {
      performSearch();
    }
  });

  const clearSearch = () => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    // Also drop any in-flight request — same semantics as cancelSearch.
    searchToken++;
    clearStageTimers();
    searchStage.value = "";
    searching.value = false;
    fromCache.value = false;
    searchQuery.value = "";
    searchResults.value = [];
    displayedResultsCount.value = 10;
    hasSearched.value = false;
    selectedArtist.value = null;
    artistTracks.value = [];
  };

  const selectArtist = async (artist: Artist) => {
    selectedArtist.value = artist;
    loadingArtistTracks.value = true;
    artistTracks.value = [];

    try {
      const providerMapping = artist.provider_mappings?.[0];
      if (!providerMapping) {
        throw new Error("No provider mapping found for artist");
      }

      const tracks = await api.getArtistTracks(
        providerMapping.item_id,
        providerMapping.provider_instance,
      );
      artistTracks.value = tracks;
    } catch (error) {
      console.error("Failed to fetch artist tracks:", error);
      toast.error($t("providers.party.guest_page.load_artist_tracks_failed"));
      selectedArtist.value = null;
    } finally {
      loadingArtistTracks.value = false;
    }
  };

  const clearArtistSelection = () => {
    selectedArtist.value = null;
    artistTracks.value = [];
  };

  const handleScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    if (!target) return;

    const scrollPosition = target.scrollTop + target.clientHeight;
    const scrollHeight = target.scrollHeight;
    const threshold = 100;

    if (
      scrollPosition >= scrollHeight - threshold &&
      displayedResultsCount.value < searchResults.value.length
    ) {
      loadMoreResults();
    }
  };

  const loadMoreResults = () => {
    const increment = 10;
    displayedResultsCount.value = Math.min(
      displayedResultsCount.value + increment,
      searchResults.value.length,
    );
  };

  const cleanup = () => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    clearStageTimers();
    // Drop any in-flight searches so their late responses can't mutate state
    // after the component has unmounted.
    searchToken++;
  };

  return {
    searchQuery,
    searchResults,
    searching,
    hasSearched,
    searchFilter,
    fromCache,
    searchStage,
    selectedArtist,
    artistTracks,
    loadingArtistTracks,
    displayedResults,
    resultsListRef,
    displayedResultsCount,
    performSearch,
    cancelSearch,
    refreshSearch,
    clearSearch,
    selectArtist,
    clearArtistSelection,
    handleScroll,
    cleanup,
  };
}
