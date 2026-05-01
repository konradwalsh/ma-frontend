<template>
  <div class="guest-view">
    <!-- streamloader-branded welcome header -->
    <div class="guest-logo">
      <img
        :src="streamloaderMarkSrc"
        alt=""
        class="brand-mark"
        aria-hidden="true"
      />
      <span class="brand-wordmark">streamloader</span>
    </div>

    <!-- Search Section
         Streamloader-fork: wrapped in a sticky container so on mobile the
         input stays pinned to the top while the results list scrolls under
         it. Backdrop-blur keeps the brand teal halo visible but softens
         scrolling content for legibility. -->
    <div class="search-sticky">
      <PartySearchBar
        ref="searchBarRef"
        v-model:search-query="searchQuery"
        v-model:search-filter="searchFilter"
        :has-searched="hasSearched"
        :show-back="hasSearched || !!selectedArtist"
        @clear="handleClear"
        @back="goBack"
        @submit="performSearch"
      />
    </div>

    <!-- Streamloader-fork: offline banner. Driven by navigator.onLine +
         online/offline window events. Lets guests know that taps will be
         optimistically dropped while offline and they should re-add once
         reconnection happens (we do not auto-replay queued adds). -->
    <Transition name="offline-banner">
      <div v-if="isOffline" class="offline-banner" role="status">
        <WifiOff :size="14" class="offline-icon" />
        <span class="offline-text">
          {{ $t("providers.party.guest_page.offline_banner") }}
        </span>
      </div>
    </Transition>

    <!-- Search Loading State
         Streamloader fork: prominent brand spinner + staged hints + cancel
         button so guests don't think the app froze during slow backend
         provider searches (often ~minutes on a cold cache). -->
    <div v-if="searching && !selectedArtist" class="loading-state">
      <StreamloaderSpinner :size="48" />
      <p class="loading-text">
        {{ stageMessage }}
      </p>
      <Button
        variant="outline"
        size="sm"
        class="cancel-btn"
        @click="cancelSearch"
      >
        {{ $t("cancel") }}
      </Button>
    </div>

    <!-- Artist Tracks View (when drilling into an artist) -->
    <div v-if="selectedArtist" class="results-section">
      <div class="section-header">
        <Button
          variant="ghost"
          size="sm"
          class="back-btn"
          @click="clearArtistSelection"
        >
          <ArrowLeft :size="16" />
          {{ $t("back") }}
        </Button>
        <h2 class="section-title artist-title">
          {{ selectedArtist.name }}
        </h2>
        <div v-if="rateLimitingEnabled" class="tokens-row">
          <PartyTokensBadge
            v-if="boostEnabled"
            :tokens="boostTokens"
            :max-tokens="BOOST_MAX_TOKENS"
            :countdown="nextTokenCountdown"
            :label="$t('providers.party.guest_page.boost_available')"
            :color="boostBadgeColor"
            icon="boost"
          />
          <PartyTokensBadge
            v-if="addQueueEnabled"
            :tokens="addQueueTokens"
            :max-tokens="ADD_QUEUE_MAX_TOKENS"
            :countdown="addQueueTokenCountdown"
            :label="$t('providers.party.guest_page.add_available')"
            :color="requestBadgeColor"
            icon="request"
          />
        </div>
      </div>
      <!-- Loading state -->
      <div v-if="loadingArtistTracks" class="loading-state">
        <StreamloaderSpinner :size="48" />
        <p>{{ $t("providers.party.guest_page.loading_tracks") }}</p>
      </div>
      <!-- Artist tracks list -->
      <div v-else-if="artistTracks.length > 0" class="results-list">
        <PartyResultItem
          v-for="track in artistTracks"
          :key="`track-${track.item_id}`"
          :item="track"
          :boost-enabled="boostEnabled"
          :add-queue-enabled="addQueueEnabled"
          :rate-limiting-enabled="rateLimitingEnabled"
          :boost-tokens="boostTokens"
          :add-queue-tokens="addQueueTokens"
          :boost-badge-color="boostBadgeColor"
          :request-badge-color="requestBadgeColor"
          :adding-items="addingItems"
          :added-items="addedItems"
          :queued-uris="queuedUris"
          :is-expanded="
            expandedResultItemId === `${track.media_type}-${track.item_id}`
          "
          @add-to-queue="addToQueue"
          @toggle-expand="toggleExpandedResult"
        />
      </div>
      <!-- Empty state for no tracks -->
      <StreamloaderEmptyState
        v-else
        :icon="Music"
        :title="$t('providers.party.guest_page.no_tracks_for_artist')"
      />
    </div>

    <!-- Search Results -->
    <div
      v-else-if="!searching && searchResults.length > 0"
      class="results-section"
    >
      <div class="section-header">
        <h2 class="section-title">
          {{
            $t("providers.party.guest_page.search_results_count", [
              searchResults.length,
            ])
          }}
        </h2>
        <div v-if="rateLimitingEnabled" class="tokens-row">
          <PartyTokensBadge
            v-if="boostEnabled"
            :tokens="boostTokens"
            :max-tokens="BOOST_MAX_TOKENS"
            :countdown="nextTokenCountdown"
            :label="$t('providers.party.guest_page.boost_available')"
            :color="boostBadgeColor"
            icon="boost"
          />
          <PartyTokensBadge
            v-if="addQueueEnabled"
            :tokens="addQueueTokens"
            :max-tokens="ADD_QUEUE_MAX_TOKENS"
            :countdown="addQueueTokenCountdown"
            :label="$t('providers.party.guest_page.add_available')"
            :color="requestBadgeColor"
            icon="request"
          />
        </div>
      </div>
      <!-- Cached-results indicator. Lets the guest know these are stale and
           gives them a one-tap escape hatch to force a live search. -->
      <div v-if="fromCache" class="cached-banner">
        <Zap :size="14" class="cached-icon" />
        <span class="cached-text">
          {{ $t("providers.party.guest_page.showing_cached") }}
        </span>
        <Button
          variant="ghost"
          size="sm"
          class="refresh-btn"
          @click="refreshSearch"
        >
          <RefreshCw :size="14" />
          {{ $t("providers.party.guest_page.refresh") }}
        </Button>
      </div>
      <!-- Streamloader-fork: pull-to-refresh. Visual indicator grows as
           the user drags down past the top of the list; releasing past
           the threshold re-runs the last search. -->
      <div
        ref="resultsListRef"
        class="results-list results-list--ptr"
        :class="{ 'results-list--refreshing': isRefreshing }"
        :style="{ '--ptr-offset': `${pullOffset}px` }"
        @scroll="handleScroll"
        @touchstart.passive="onPtrTouchStart"
        @touchmove.passive="onPtrTouchMove"
        @touchend.passive="onPtrTouchEnd"
        @touchcancel.passive="onPtrTouchEnd"
      >
        <div
          v-if="pullOffset > 0 || isRefreshing"
          class="ptr-indicator"
          :class="{ 'ptr-indicator--armed': pullOffset >= PTR_THRESHOLD }"
          :style="{
            '--ptr-progress': Math.min(pullOffset / PTR_THRESHOLD, 1),
          }"
          aria-hidden="true"
        >
          <RefreshCw
            :size="18"
            class="ptr-spinner"
            :class="{ 'ptr-spinner--spinning': isRefreshing }"
          />
        </div>
        <PartyResultItem
          v-for="item in displayedResults"
          :key="`${item.media_type}-${item.item_id}`"
          :item="item"
          :boost-enabled="boostEnabled"
          :add-queue-enabled="addQueueEnabled"
          :rate-limiting-enabled="rateLimitingEnabled"
          :boost-tokens="boostTokens"
          :add-queue-tokens="addQueueTokens"
          :boost-badge-color="boostBadgeColor"
          :request-badge-color="requestBadgeColor"
          :adding-items="addingItems"
          :added-items="addedItems"
          :queued-uris="queuedUris"
          :is-expanded="
            expandedResultItemId === `${item.media_type}-${item.item_id}`
          "
          @add-to-queue="addToQueue"
          @select-artist="selectArtist"
          @toggle-expand="toggleExpandedResult"
        />
      </div>
    </div>

    <!-- Empty State — branded StreamloaderEmptyState so a "no results"
         page still feels like part of the streamloader app. -->
    <StreamloaderEmptyState
      v-else-if="
        !searching &&
        hasSearched &&
        searchResults.length === 0 &&
        !selectedArtist
      "
      :icon="Search"
      :title="$t('providers.party.guest_page.no_results_for', [searchQuery])"
      :message="$t('providers.party.guest_page.try_different_search')"
    />

    <!-- Current Queue Section -->
    <PartyQueueSection
      v-if="
        !selectedArtist &&
        !searching &&
        (!searchQuery || searchResults.length === 0)
      "
      ref="queueSectionRef"
      :queue-items="queueItems"
      :queue-fetch-offset="queueFetchOffset"
      :current-queue-index="currentQueueIndex"
      :is-playing="isPlaying"
      :loading-more-queue-items="loadingMoreQueueItems"
      :skip-song-enabled="skipSongEnabled"
      :rate-limiting-enabled="rateLimitingEnabled"
      :skip-song-tokens="skipSongTokens"
      :skipping-song="skippingSong"
      :skip-token-countdown="skipTokenCountdown"
      :boost-badge-color="boostBadgeColor"
      :request-badge-color="requestBadgeColor"
      :boost-enabled="boostEnabled"
      :boost-tokens="boostTokens"
      :boosting-item-id="boostingQueueItemId"
      @skip="skipCurrentSong"
      @queue-scroll="handleQueueScroll"
      @boost-queue-item="boostQueueItem"
    />
  </div>
</template>

<script setup lang="ts">
import PartyQueueSection from "@/components/party/PartyQueueSection.vue";
import PartyResultItem from "@/components/party/PartyResultItem.vue";
import PartySearchBar from "@/components/party/PartySearchBar.vue";
import PartyTokensBadge from "@/components/party/PartyTokensBadge.vue";
import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";
import { Button } from "@/components/ui/button";
import { useGuestQueue } from "@/composables/useGuestQueue";
import { useGuestSearch } from "@/composables/useGuestSearch";
import { usePartyConfig } from "@/composables/usePartyConfig";
import { useRateLimiting } from "@/composables/useRateLimiting";
import api from "@/plugins/api";
import {
  type Artist,
  type EventMessage,
  EventType,
  PlaybackState,
  type QueueItem,
  type Track,
} from "@/plugins/api/interfaces";
import { $t } from "@/plugins/i18n";
import { store } from "@/plugins/store";
import {
  ArrowLeft,
  Music,
  RefreshCw,
  Search,
  WifiOff,
  Zap,
} from "lucide-vue-next";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { toast } from "vue-sonner";
const searchBarRef = ref<InstanceType<typeof PartySearchBar> | null>(null);
// streamloader brand mark used in the guest welcome header
const streamloaderMarkSrc = new URL(
  "@/assets/streamloader-mark.svg",
  import.meta.url,
).href;

// --- Composables ---
const { config: partyConfig, fetchConfig } = usePartyConfig();
const rateLimit = useRateLimiting();
const {
  rateLimitingEnabled,
  boostEnabled,
  addQueueEnabled,
  skipSongEnabled,
  requestBadgeColor,
  boostBadgeColor,
  boostTokens,
  addQueueTokens,
  skipSongTokens,
  BOOST_MAX_TOKENS,
  ADD_QUEUE_MAX_TOKENS,
  nextTokenCountdown,
  addQueueTokenCountdown,
  skipTokenCountdown,
  consumeBoostToken,
  consumeAddQueueToken,
  consumeSkipSongToken,
  getTimeUntilNextToken,
  getTimeUntilNextAddQueueToken,
  getTimeUntilNextSkipToken,
} = rateLimit;

const queue = useGuestQueue();
const {
  queueItems,
  queueFetchOffset,
  loadingMoreQueueItems,
  partyQueueId,
  currentQueueIndex,
  fetchQueueItems,
  handleQueueScroll,
} = queue;

const isPlaying = computed(
  () => store.activePlayer?.playback_state === PlaybackState.PLAYING,
);

const search = useGuestSearch();
const {
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
  performSearch,
  cancelSearch,
  refreshSearch,
  clearSearch,
  selectArtist,
  clearArtistSelection,
  handleScroll,
} = search;

// Maps the composable's stage flag to the user-visible message.
// Initial copy hints that long waits are normal so users don't bail.
const stageMessage = computed(() => {
  if (searchStage.value === "longer") {
    return $t("providers.party.guest_page.searching_longer");
  }
  if (searchStage.value === "still") {
    return $t("providers.party.guest_page.searching_still");
  }
  return $t("providers.party.guest_page.searching_initial");
});

const queuedUris = computed(() => {
  const uris = new Set<string>();
  for (const item of queueItems.value) {
    if (item.media_item?.uri) uris.add(item.media_item.uri);
  }
  return uris;
});

// --- Template-specific state ---
const addingItems = ref(new Set<string>());
const addedItems = ref(new Set<string>());
const skippingSong = ref(false);
const boostingQueueItemId = ref("");
const expandedResultItemId = ref("");

const toggleExpandedResult = (itemId: string) => {
  expandedResultItemId.value =
    expandedResultItemId.value === itemId ? "" : itemId;
};

// Streamloader-fork: pull-to-refresh state. Touch-only; only engages when
// the results list is already scrolled to the top to avoid hijacking
// normal upward flicks. Threshold ~80px, indicator grows as the user pulls.
const PTR_THRESHOLD = 80;
const PTR_MAX = 120;
const pullOffset = ref(0);
const isRefreshing = ref(false);
const ptrStartY = ref<number | null>(null);
const ptrTracking = ref(false);

const onPtrTouchStart = (e: TouchEvent) => {
  // Only track from a top-of-list state — otherwise the user is scrolling
  // back up through results, not asking for a refresh.
  const el = resultsListRef.value;
  if (!el || el.scrollTop > 0 || isRefreshing.value) {
    ptrTracking.value = false;
    return;
  }
  ptrStartY.value = e.touches[0]?.clientY ?? null;
  ptrTracking.value = true;
};

const onPtrTouchMove = (e: TouchEvent) => {
  if (!ptrTracking.value || ptrStartY.value === null) return;
  const currentY = e.touches[0]?.clientY ?? ptrStartY.value;
  const dy = currentY - ptrStartY.value;
  if (dy <= 0) {
    pullOffset.value = 0;
    return;
  }
  // Rubber-band so it never feels like the list is being torn off.
  const damped = Math.min(PTR_MAX, dy * 0.55);
  pullOffset.value = damped;
};

const onPtrTouchEnd = async () => {
  if (!ptrTracking.value) return;
  ptrTracking.value = false;
  ptrStartY.value = null;

  if (
    pullOffset.value >= PTR_THRESHOLD &&
    !isRefreshing.value &&
    hasSearched.value
  ) {
    isRefreshing.value = true;
    try {
      await refreshSearch();
    } finally {
      isRefreshing.value = false;
      pullOffset.value = 0;
    }
  } else {
    pullOffset.value = 0;
  }
};

// Streamloader-fork: offline indicator. Uses navigator.onLine + window
// online/offline events. We only render a banner — we do not buffer adds
// while offline (the user is told to retry once back online).
const isOffline = ref(
  typeof navigator !== "undefined" && navigator.onLine === false,
);
const handleOnline = () => {
  isOffline.value = false;
};
const handleOffline = () => {
  isOffline.value = true;
};
const queueSectionRef = ref<InstanceType<typeof PartyQueueSection> | null>(
  null,
);

// Sync the queue section's listRef to the composable's queueListRef for auto-scroll.
// Also scroll to the current item whenever the list becomes available (e.g. after
// search is cleared and PartyQueueSection remounts).
watch(
  () => queueSectionRef.value?.listRef,
  (el) => {
    queue.queueListRef.value = el ?? null;
    if (el) {
      nextTick(() => queue.scrollToCurrentItem());
    }
  },
);

// --- Back navigation ---
const goBack = () => {
  if (selectedArtist.value) {
    clearArtistSelection();
    return;
  }
  clearSearch();
  // Scroll is triggered by the watcher above when PartyQueueSection remounts
};

const handleClear = () => {
  clearSearch();
  // Scroll is triggered by the watcher above when PartyQueueSection remounts
};

const handleBack = (event: PopStateEvent) => {
  if (
    selectedArtist.value ||
    searchQuery.value ||
    searchResults.value.length > 0
  ) {
    event.preventDefault();
    goBack();
    history.pushState(null, "", location.href);
  }
};

// --- Action glue (bridges rate limiting + API + snackbar) ---
const addToQueue = async (item: Track | Artist, position: "next" | "end") => {
  if (position === "next" && !boostEnabled.value) {
    toast.warning($t("providers.party.guest_page.boost_disabled"));
    return;
  }
  if (position === "end" && !addQueueEnabled.value) {
    toast.warning($t("providers.party.guest_page.add_queue_disabled"));
    return;
  }

  if (rateLimitingEnabled.value) {
    if (position === "next" && boostTokens.value <= 0) {
      const minutesUntilNext = getTimeUntilNextToken();
      toast.warning(
        $t("providers.party.guest_page.boost_limit_reached", [
          minutesUntilNext,
        ]),
      );
      return;
    }
    if (position === "end" && addQueueTokens.value <= 0) {
      const minutesUntilNext = getTimeUntilNextAddQueueToken();
      toast.warning(
        $t("providers.party.guest_page.add_queue_limit_reached", [
          minutesUntilNext,
        ]),
      );
      return;
    }
  }

  const key = `${item.media_type}-${item.item_id}-${position}`;
  if (addingItems.value.has(key)) return;
  addingItems.value.add(key);

  try {
    const result = (await api.sendCommand("party/add_to_queue", {
      uri: item.uri,
      boost: position === "next",
    })) as { success: boolean; boosted: boolean; started_playback: boolean };

    if (!result.success) {
      throw new Error("Server rejected the request");
    }

    if (rateLimitingEnabled.value) {
      if (position === "next") {
        consumeBoostToken();
      } else {
        consumeAddQueueToken();
      }
    }

    addedItems.value.add(item.uri);

    const message =
      position === "next"
        ? $t("providers.party.guest_page.item_boosted", [item.name])
        : $t("providers.party.guest_page.item_added_to_queue", [item.name]);
    toast.success(message);
  } catch (error) {
    console.error("Failed to add to queue:", error);
    toast.error($t("providers.party.guest_page.add_to_queue_failed"));
  } finally {
    addingItems.value.delete(key);
  }
};

const boostQueueItem = async (item: QueueItem) => {
  if (!boostEnabled.value) {
    toast.warning($t("providers.party.guest_page.boost_disabled"));
    return;
  }

  if (rateLimitingEnabled.value && boostTokens.value <= 0) {
    const minutesUntilNext = getTimeUntilNextToken();
    toast.warning(
      $t("providers.party.guest_page.boost_limit_reached", [minutesUntilNext]),
    );
    return;
  }

  if (boostingQueueItemId.value === item.queue_item_id) return;
  boostingQueueItemId.value = item.queue_item_id;
  try {
    const result = (await api.sendCommand("party/boost_queue_item", {
      queue_item_id: item.queue_item_id,
    })) as { success: boolean };

    if (!result.success) {
      throw new Error("Server rejected the request");
    }

    if (rateLimitingEnabled.value) {
      consumeBoostToken();
    }

    const name = item.media_item?.name || item.name;
    toast.success($t("providers.party.guest_page.item_boosted", [name]));
  } catch (error) {
    console.error("Failed to boost queue item:", error);
    toast.error($t("providers.party.guest_page.add_to_queue_failed"));
  } finally {
    boostingQueueItemId.value = "";
  }
};

const skipCurrentSong = async () => {
  if (!skipSongEnabled.value) {
    toast.warning($t("providers.party.guest_page.skip_disabled"));
    return;
  }

  if (rateLimitingEnabled.value && skipSongTokens.value <= 0) {
    const minutesUntilNext = getTimeUntilNextSkipToken();
    toast.warning(
      $t("providers.party.guest_page.skip_limit_reached", [minutesUntilNext]),
    );
    return;
  }

  skippingSong.value = true;
  try {
    const result = (await api.sendCommand("party/skip")) as {
      success: boolean;
    };

    if (!result.success) {
      throw new Error("Server rejected the request");
    }

    if (rateLimitingEnabled.value) {
      consumeSkipSongToken();
    }

    toast.success($t("providers.party.guest_page.song_skipped"));
  } catch (error) {
    console.error("Failed to skip song:", error);
    toast.error($t("providers.party.guest_page.skip_failed"));
  } finally {
    skippingSong.value = false;
  }
};

// Restore focus to search input after search completes
watch(searching, (isSearching) => {
  if (!isSearching) {
    searchBarRef.value?.focus();
  }
});

// React to party config changes (e.g., admin changes rate limits or badge colors)
watch(partyConfig, (newConfig) => {
  if (newConfig) {
    rateLimit.configure(newConfig);
  }
});

// --- Lifecycle ---
let cleanupCountdown: (() => void) | null = null;
let cleanupQueueEvents: (() => void) | null = null;
let cleanupProvidersSub: (() => void) | null = null;
let cleanupQueueUpdatedSub: (() => void) | null = null;

const refreshPartyPlayer = async () => {
  try {
    const partyPlayerId = await api.sendCommand<string | null>("party/player");
    partyQueueId.value = partyPlayerId;
    if (partyPlayerId) {
      store.activePlayerId = partyPlayerId;
    }
  } catch (error) {
    console.error("Failed to fetch party player:", error);
  }
};

const fetchAndApplyConfig = async () => {
  const config = await fetchConfig();
  if (config) {
    rateLimit.configure(config);
  }
};

onMounted(async () => {
  await fetchAndApplyConfig();

  history.pushState(null, "", location.href);
  window.addEventListener("popstate", handleBack);

  // Streamloader-fork: track network state so we can warn guests when adds
  // won't reach the server.
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  cleanupCountdown = rateLimit.startCountdown();

  await refreshPartyPlayer();

  fetchQueueItems();
  cleanupQueueEvents = queue.subscribeToEvents();

  // Re-fetch player when party config changes
  const unsubProviders = api.subscribe(
    EventType.PROVIDERS_UPDATED,
    async () => {
      await refreshPartyPlayer();
      fetchQueueItems(true);
    },
  );
  cleanupProvidersSub = unsubProviders;

  // Re-resolve party player when a different queue starts playing (auto mode)
  const unsubQueueUpdated = api.subscribe(
    EventType.QUEUE_UPDATED,
    async (evt: EventMessage) => {
      if (evt.object_id !== partyQueueId.value) {
        const updatedQueue = api.queues[evt.object_id as string];
        if (updatedQueue?.state === PlaybackState.PLAYING) {
          await refreshPartyPlayer();
          fetchQueueItems(true);
        }
      }
    },
  );
  cleanupQueueUpdatedSub = unsubQueueUpdated;
});

onBeforeUnmount(() => {
  window.removeEventListener("popstate", handleBack);
  window.removeEventListener("online", handleOnline);
  window.removeEventListener("offline", handleOffline);
  cleanupQueueEvents?.();
  cleanupCountdown?.();
  cleanupProvidersSub?.();
  cleanupQueueUpdatedSub?.();
  search.cleanup();
});
</script>

<style scoped>
/* streamloader-branded welcome header */
.guest-logo {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  padding-bottom: 0.75rem;
  margin-bottom: 0.5rem;
  flex-shrink: 0;
}

.brand-mark {
  height: 28px;
  width: auto;
  /* subtle teal halo around the streamloader mark */
  filter: drop-shadow(0 0 10px rgba(45, 212, 191, 0.35));
}

.brand-wordmark {
  /* lowercase wordmark per streamloader brand */
  text-transform: lowercase;
  letter-spacing: -0.01em;
  font-weight: 600;
  font-size: 1.25rem;
  color: rgb(var(--v-theme-primary));
}

.guest-view {
  position: relative;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1.5rem;
  padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0));
  height: 100dvh;
  max-height: 100dvh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* Soft streamloader teal halo so the guest view always reads as branded,
   even when the page is opened standalone via the QR code. */
.guest-view::before {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  background:
    radial-gradient(
      ellipse 60% 40% at 50% -10%,
      rgba(45, 212, 191, 0.12),
      transparent 70%
    ),
    radial-gradient(
      ellipse 40% 30% at 50% 110%,
      rgba(15, 118, 110, 0.08),
      transparent 70%
    );
}

/* Streamloader-fork: sticky search bar wrapper. On mobile this pins the
   search input to the top of the viewport so guests can refine their query
   without scrolling back up. Backdrop-filter blurs scrolling content for
   legibility while keeping the brand teal halo visible. */
.search-sticky {
  position: relative;
  flex-shrink: 0;
  z-index: 10;
}

@media (max-width: 768px) {
  .search-sticky {
    position: sticky;
    top: 0;
    /* Pull through the parent padding so the blur reaches the viewport edge */
    margin: -0.75rem -0.75rem 0;
    padding: 0.75rem 0.75rem 0.25rem;
    background: rgba(13, 31, 36, 0.55);
    -webkit-backdrop-filter: blur(14px) saturate(140%);
    backdrop-filter: blur(14px) saturate(140%);
    border-bottom: 1px solid rgba(45, 212, 191, 0.12);
  }
}

/* Streamloader-fork: offline banner. Compact pill styled in muted amber so
   it reads as a warning without screaming. Slides down on transition. */
.offline-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  margin-bottom: 0.5rem;
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.32);
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.9);
  flex-shrink: 0;
}

.offline-icon {
  color: rgb(245, 158, 11);
  flex-shrink: 0;
}

.offline-text {
  flex: 1;
  min-width: 0;
}

.offline-banner-enter-active,
.offline-banner-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.offline-banner-enter-from,
.offline-banner-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

@media (prefers-reduced-motion: reduce) {
  .offline-banner-enter-active,
  .offline-banner-leave-active {
    transition: none;
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  padding-bottom: 0.5rem;
  /* streamloader teal accent — gradient gives the underline a brand glow */
  border-bottom: 2px solid transparent;
  border-image: linear-gradient(
      90deg,
      rgba(var(--v-theme-primary), 0.55),
      rgba(var(--v-theme-primary), 0.05)
    )
    1;
  flex: 1;
}

.tokens-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.results-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.results-section .section-header {
  flex-shrink: 0;
}

.results-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  overflow-y: auto;
  overflow-x: hidden;
  flex: 1;
  min-height: 0;
  padding-right: 0.5rem;
}

/* Streamloader-fork: pull-to-refresh. The list is translated downward as
   the user pulls; --ptr-offset is set inline by PartyGuestView. The
   indicator above grows in opacity/scale up to the threshold. */
.results-list--ptr {
  position: relative;
  transform: translateY(var(--ptr-offset, 0));
  transition: transform 0.2s ease;
  /* Disable native overscroll bounce so our PTR feels canonical, not stacked
     on top of the browser's. */
  overscroll-behavior-y: contain;
}

.results-list--ptr.results-list--refreshing {
  transform: translateY(56px);
}

.ptr-indicator {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, calc(-100% + min(var(--ptr-offset, 0px), 56px)));
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: rgba(45, 212, 191, calc(0.18 * var(--ptr-progress, 0)));
  border: 1px solid rgba(45, 212, 191, calc(0.4 * var(--ptr-progress, 0)));
  box-shadow: 0 0 12px rgba(45, 212, 191, calc(0.32 * var(--ptr-progress, 0)));
  color: rgb(var(--v-theme-primary));
  pointer-events: none;
  opacity: var(--ptr-progress, 0);
  z-index: 5;
}

.ptr-indicator--armed {
  opacity: 1;
  background: rgba(45, 212, 191, 0.25);
  border-color: rgba(45, 212, 191, 0.55);
  box-shadow: 0 0 16px rgba(45, 212, 191, 0.5);
}

.ptr-spinner {
  transform: rotate(calc(var(--ptr-progress, 0) * 180deg));
  transition: transform 0.05s linear;
}

@keyframes ptr-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.ptr-spinner--spinning {
  animation: ptr-spin 0.9s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .results-list--ptr {
    transition: none;
  }
  .ptr-spinner {
    transition: none;
  }
  .ptr-spinner--spinning {
    animation: none;
  }
}

.back-btn {
  flex-shrink: 0;
}

.artist-title {
  flex: 1;
  text-align: center;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  gap: 1rem;
  opacity: 0.85;
}

/* Loading text — slightly larger so the stage hint reads from a phone
   sitting on a coffee table at party-mode distance. */
.loading-text {
  font-size: 0.95rem;
  text-align: center;
  max-width: 320px;
  line-height: 1.4;
  margin: 0;
  color: rgba(var(--v-theme-on-surface), 0.78);
}

.cancel-btn {
  margin-top: 0.25rem;
  font-size: 0.8rem;
}

/* Cached-results banner — soft teal pill so it reads as informational,
   not as an error. The Refresh button gives an explicit escape hatch. */
.cached-banner {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.75rem;
  margin-bottom: 0.75rem;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.1);
  border: 1px solid rgba(45, 212, 191, 0.25);
  font-size: 0.8rem;
  color: rgba(var(--v-theme-on-surface), 0.85);
  flex-shrink: 0;
}

.cached-icon {
  color: rgb(var(--v-theme-primary));
  flex-shrink: 0;
}

.cached-text {
  flex: 1;
  min-width: 0;
}

.refresh-btn {
  font-size: 0.75rem;
  height: 1.75rem;
  padding: 0 0.6rem;
  color: rgb(var(--v-theme-primary));
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 4rem 2rem;
  gap: 0.75rem;
}

/* Teal halo on the empty-state icon — friendly and clearly streamloader */
.empty-state :deep(svg) {
  color: rgb(var(--v-theme-primary));
  opacity: 0.85;
  filter: drop-shadow(0 0 18px rgba(45, 212, 191, 0.35));
}

.empty-state p {
  font-size: 1.125rem;
  margin-top: 0.5rem;
  opacity: 0.85;
}

.empty-hint {
  font-size: 0.875rem;
  opacity: 0.65;
}

@media (max-width: 768px) {
  .brand-mark {
    height: 24px;
  }

  .brand-wordmark {
    font-size: 1.1rem;
  }

  .guest-logo {
    padding-bottom: 0.4rem;
    margin-bottom: 0.2rem;
  }

  .guest-view {
    padding: 0.75rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));
  }

  .section-header {
    margin-bottom: 0.5rem;
  }

  .section-title {
    font-size: 1.1rem;
    padding-bottom: 0.25rem;
  }

  .results-list {
    gap: 0.5rem;
    padding-right: 0.25rem;
  }
}
</style>
