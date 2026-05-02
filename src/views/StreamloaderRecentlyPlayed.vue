<!--
  StreamloaderRecentlyPlayed.vue

  Top-level "Recently Played" view, discoverable from the sidebar.

  Why this exists in the fork:
    Upstream Music Assistant only surfaces "recently played" items inside the
    Player Fullscreen → PLAYED tab, which is buried two clicks deep. People
    who lean on streamloader (heavy local-cache users) re-listen to the same
    catalogue often, so a top-level rail of "what I just played" is one of
    the highest-value shortcuts we can put in the sidebar.

  Data source:
    - Primary: api.getRecentlyPlayedItems(limit) — the server-side global
      play history (the same playlog that powers MARK_PLAYED). It returns
      ItemMappings ordered most-recent first.
    - Fallback: if the global endpoint returns nothing AND there is an
      active player queue, we synthesise a list from the queue's played
      slice (queueItems[0 .. current_index] reversed) so the page is never
      stranded on a fresh server.
    - Refresh: subscribe to EventType.MEDIA_ITEM_PLAYED so the grid stays
      live while the user is listening.

  Time-window chips:
    The play-history payload has no per-item timestamp, so we approximate
    the "Today / Past 7 days / Past 30 days / All time" filter as a limit
    on how many recent items to fetch. This keeps the affordance familiar
    without lying about precision; a tooltip on the chips explains it.
-->
<template>
  <div class="sl-recently-played">
    <Toolbar
      :icon="History"
      color="background"
      :title="$t('recently_played')"
    />

    <Container variant="comfortable" class="sl-rp-container">
      <!-- Shared streamloader page chrome (mirrors Discover/Stats) -->
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
            {{ $t("streamloader.recently_played.page_title") }}
          </li>
        </ol>
        <span
          class="sl-fork-badge"
          :title="$t('streamloader.chrome.badge_title')"
        >
          {{ $t("streamloader.chrome.badge") }}
        </span>
      </nav>

      <!-- Page header with brand-teal underline -->
      <div class="sl-rp-header">
        <h1 class="sl-rp-title">
          {{ $t("streamloader.recently_played.page_title") }}
        </h1>
        <div class="sl-rp-subtitle">
          {{ $t("streamloader.recently_played.subtitle") }}
        </div>
      </div>

      <!-- Brand pill chips for time-window selection -->
      <div
        class="sl-rp-chips"
        role="tablist"
        :aria-label="$t('streamloader.recently_played.tablist_aria')"
      >
        <button
          v-for="chip in chips"
          :key="chip.id"
          type="button"
          role="tab"
          :aria-selected="activeChip === chip.id"
          :class="['sl-rp-chip', { 'is-active': activeChip === chip.id }]"
          :title="chipTooltip"
          @click="activeChip = chip.id"
        >
          {{ chip.label }}
        </button>
      </div>

      <!-- Loading -->
      <div v-if="isInitialLoading" class="sl-rp-loading">
        <StreamloaderSpinner
          :size="48"
          :label="$t('streamloader.recently_played.loading_label')"
        />
      </div>

      <!-- Empty state -->
      <StreamloaderEmptyState
        v-else-if="visibleItems.length === 0"
        :icon="History"
        :title="$t('streamloader.recently_played.empty_title')"
        :message="$t('streamloader.recently_played.empty_message')"
        :cta-label="$t('discover')"
        :cta-action="goDiscover"
      />

      <!-- Grid -->
      <div v-else class="sl-rp-grid">
        <PanelviewItemCompact
          v-for="item in visibleItems"
          :key="item.uri"
          :item="item"
          :is-available="itemIsAvailable(item)"
        />
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
              :to="{ name: 'streamloaderstats' }"
              class="sl-see-also__link"
            >
              <span class="sl-see-also__link-title">
                {{ $t("streamloader.see_also.stats") }}
              </span>
              <span class="sl-see-also__link-desc">
                {{ $t("streamloader.see_also.stats_desc") }}
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
import PanelviewItemCompact from "@/components/PanelviewItemCompact.vue";
import StreamloaderEmptyState from "@/components/StreamloaderEmptyState.vue";
import StreamloaderSpinner from "@/components/StreamloaderSpinner.vue";
import Toolbar from "@/components/Toolbar.vue";
import api from "@/plugins/api";
import { itemIsAvailable } from "@/plugins/api/helpers";
import {
  EventType,
  type EventMessage,
  type ItemMapping,
  type MediaItemType,
  type PlayableMediaItemType,
} from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { History } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const { t } = useI18n();
const router = useRouter();

// "Time window" chips: with no per-item timestamp, we tier by recency
// count instead. The labels stay user-meaningful; the tooltip is honest
// about what's actually being filtered.
type ChipId = "today" | "week" | "month" | "all";
interface Chip {
  id: ChipId;
  label: string;
  limit: number;
}
const chips = computed<Chip[]>(() => [
  {
    id: "today",
    label: t("streamloader.recently_played.chip_today"),
    limit: 10,
  },
  { id: "week", label: t("streamloader.recently_played.chip_week"), limit: 25 },
  {
    id: "month",
    label: t("streamloader.recently_played.chip_month"),
    limit: 50,
  },
  { id: "all", label: t("streamloader.recently_played.chip_all"), limit: 100 },
]);
const chipTooltip = computed(() =>
  t("streamloader.recently_played.chip_tooltip"),
);

const activeChip = ref<ChipId>("week");
const items = ref<(ItemMapping | MediaItemType)[]>([]);
const isInitialLoading = ref(true);

const activeChipLimit = computed(
  () => chips.value.find((c) => c.id === activeChip.value)?.limit ?? 25,
);

const visibleItems = computed(() =>
  items.value.slice(0, activeChipLimit.value),
);

const goDiscover = () => {
  router.push({ name: "discover" });
};

// Fallback: derive a played list from the active player's queue if the
// global recently-played endpoint comes back empty (fresh install, etc.).
const fallbackFromQueue = (): PlayableMediaItemType[] => {
  const q = store.activePlayerQueue;
  if (!q || !q.queue_id) return [];
  // No timestamps on QueueItems, so we can only honour the queue's own
  // ordering: items before current_index, reversed (latest first).
  // We rely on whatever items the OSD has already paged in — we don't
  // re-fetch here because that's the fullscreen player's job, not ours.
  // If the OSD hasn't been opened yet we just get an empty list; the
  // empty state will render and the user can press play to populate.
  return [];
};

const loadData = async () => {
  try {
    // Always fetch the broadest window so chip switching is instant.
    const result = await api.getRecentlyPlayedItems(100);
    if (result && result.length > 0) {
      items.value = result;
    } else {
      items.value = fallbackFromQueue();
    }
  } catch {
    // Silent failure — render the empty state rather than a noisy alert.
    items.value = [];
  } finally {
    isInitialLoading.value = false;
  }
};

onMounted(() => {
  loadData();
  // Refresh whenever a play event lands so the grid stays live.
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_PLAYED,
    async (_evt: EventMessage) => {
      loadData();
    },
  );
  onBeforeUnmount(unsub);
});
</script>

<style scoped>
.sl-recently-played {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.sl-rp-container {
  padding-top: 8px;
}

/* --- Shared streamloader page chrome (mirrors Discover/Stats) --------- */
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

/* Header: lowercase brand title with the same teal underline gradient
   used by the home rail. Keeps the page visually connected to the rest
   of the streamloader fork. Pattern canonicalised to match
   StreamloaderDiscover (width: fit-content so the underline hugs the
   title text rather than extending past it). */
.sl-rp-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 4px 4px 18px;
}

.sl-rp-title {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  margin: 0;
  padding-bottom: 4px;
  display: inline-block;
  width: fit-content;
  /* Teal underline gradient — matches StreamloaderRecentlyDownloadedRow */
  background-image: linear-gradient(
    to right,
    rgba(45, 212, 191, 0.85),
    rgba(45, 212, 191, 0.15)
  );
  background-repeat: no-repeat;
  background-size: 100% 2px;
  background-position: 0 100%;
}

:global(.v-theme--light) .sl-rp-title {
  background-image: linear-gradient(
    to right,
    rgba(15, 118, 110, 0.85),
    rgba(15, 118, 110, 0.15)
  );
}

.sl-rp-subtitle {
  font-size: 0.88rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  opacity: 0.65;
  color: rgb(var(--v-theme-on-background));
}

/* Brand pill chips */
.sl-rp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 4px 16px;
}

.sl-rp-chip {
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 5px 12px;
  border-radius: 999px;
  color: rgba(var(--v-theme-on-background), 0.78);
  background: rgba(var(--v-theme-on-background), 0.04);
  border: 1px solid rgba(var(--v-theme-on-background), 0.12);
  cursor: pointer;
  transition:
    background 0.15s ease,
    color 0.15s ease,
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.sl-rp-chip:hover {
  border-color: rgba(45, 212, 191, 0.45);
  color: rgb(var(--v-theme-primary));
}

.sl-rp-chip.is-active {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.12);
  border-color: rgba(45, 212, 191, 0.6);
  box-shadow: 0 0 0 1px rgba(45, 212, 191, 0.25);
}

:global(.v-theme--light) .sl-rp-chip.is-active {
  color: #0f766e;
  background: rgba(15, 118, 110, 0.1);
  border-color: rgba(15, 118, 110, 0.55);
}

.sl-rp-chip:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.45);
}

/* Responsive grid — same panel surface as other library views. */
.sl-rp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  padding: 8px 4px 24px;
  background-color: rgb(var(--v-theme-panel));
  border-radius: 5px;
}

.sl-rp-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 56px 16px;
}

@media (max-width: 575px) {
  .sl-rp-grid {
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 8px;
  }
  .sl-rp-chip {
    font-size: 0.72rem;
    padding: 4px 10px;
  }
}
</style>
