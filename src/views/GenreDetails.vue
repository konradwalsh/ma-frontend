<template>
  <section class="genre-details">
    <InfoHeader :item="itemDetails" :active-provider="provider">
      <template #toolbar-append>
        <Button
          variant="ghost"
          size="icon"
          :title="$t('tooltip.toggle_view_mode')"
          @click="(e: MouseEvent) => openViewModeMenu(e)"
        >
          <v-icon :icon="viewModeIcon" />
        </Button>
      </template>
    </InfoHeader>

    <!-- Discovery view -->
    <template v-if="viewMode === 'discovery'">
      <div v-if="loadingRows" class="rows-loading">
        <v-progress-linear color="accent" height="4" indeterminate rounded />
      </div>

      <div
        v-else-if="!displayRows.length && itemDetails"
        class="genre-empty-state"
      >
        <v-icon icon="mdi-music-note-outline" size="56" class="empty-icon" />
        <div class="empty-title">{{ $t("no_content") }}</div>
        <div class="empty-subtitle">
          {{ itemDetails.name }}
        </div>
      </div>

      <div v-else class="overview-container">
        <div v-for="row in displayRows" :key="row.title" class="overview-row">
          <WidgetRow
            :widget-row="row"
            :show-provider-on-cover="true"
            :show-action-icon="true"
          />
        </div>
      </div>
    </template>

    <!-- Traditional view -->
    <template v-else-if="itemDetails && !loading">
      <div class="genre-sections">
        <ItemsListing
          itemtype="artists"
          :load-items="loadGenreArtists"
          :allow-collapse="true"
          :show-favorites-only-filter="true"
          :hide-on-empty="true"
          :forced-view-mode="itemsViewMode"
        >
          <template #title>
            <span class="section-title-text">{{ $t("artists") }}</span>
            <SquareArrowRightEnter
              :size="18"
              class="navigate-icon"
              @click.stop="navigateTo('artists')"
            />
          </template>
        </ItemsListing>
        <ItemsListing
          itemtype="albums"
          :load-items="loadGenreAlbums"
          :allow-collapse="true"
          :show-favorites-only-filter="true"
          :hide-on-empty="true"
          :forced-view-mode="itemsViewMode"
        >
          <template #title>
            <span class="section-title-text">{{ $t("albums") }}</span>
            <SquareArrowRightEnter
              :size="18"
              class="navigate-icon"
              @click.stop="navigateTo('albums')"
            />
          </template>
        </ItemsListing>
        <ItemsListing
          itemtype="tracks"
          :load-items="loadGenreTracks"
          :allow-collapse="true"
          :show-favorites-only-filter="true"
          :show-track-number="false"
          :hide-on-empty="true"
          :forced-view-mode="itemsViewMode"
        >
          <template #title>
            <span class="section-title-text">{{ $t("tracks") }}</span>
            <SquareArrowRightEnter
              :size="18"
              class="navigate-icon"
              @click.stop="navigateTo('tracks')"
            />
          </template>
        </ItemsListing>
        <ItemsListing
          itemtype="playlists"
          :load-items="loadGenrePlaylists"
          :allow-collapse="true"
          :show-favorites-only-filter="true"
          :hide-on-empty="true"
          :forced-view-mode="itemsViewMode"
        >
          <template #title>
            <span class="section-title-text">{{ $t("playlists") }}</span>
            <SquareArrowRightEnter
              :size="18"
              class="navigate-icon"
              @click.stop="navigateTo('playlists')"
            />
          </template>
        </ItemsListing>
        <ItemsListing
          itemtype="podcasts"
          :load-items="loadGenrePodcasts"
          :allow-collapse="true"
          :show-favorites-only-filter="true"
          :hide-on-empty="true"
          :forced-view-mode="itemsViewMode"
        >
          <template #title>
            <span class="section-title-text">{{ $t("podcasts") }}</span>
            <SquareArrowRightEnter
              :size="18"
              class="navigate-icon"
              @click.stop="navigateTo('podcasts')"
            />
          </template>
        </ItemsListing>
        <ItemsListing
          itemtype="audiobooks"
          :load-items="loadGenreAudiobooks"
          :allow-collapse="true"
          :show-favorites-only-filter="true"
          :hide-on-empty="true"
          :forced-view-mode="itemsViewMode"
        >
          <template #title>
            <span class="section-title-text">{{ $t("audiobooks") }}</span>
            <SquareArrowRightEnter
              :size="18"
              class="navigate-icon"
              @click.stop="navigateTo('audiobooks')"
            />
          </template>
        </ItemsListing>
      </div>
    </template>

    <GenreAliasManager
      v-if="itemDetails && isAdmin"
      :genre="itemDetails"
      :existing-genre-names="existingGenreNames"
      @reload="loadItemDetails"
    />

    <!-- Bottom spacer so last section never tucks under the playerbar -->
    <div class="genre-bottom-spacer" aria-hidden="true" />
  </section>
</template>

<script setup lang="ts">
import GenreAliasManager from "@/components/genre/GenreAliasManager.vue";
import InfoHeader from "@/components/InfoHeader.vue";
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import WidgetRow from "@/components/WidgetRow.vue";
import { useUserPreferences } from "@/composables/userPreferences";
import { genreMediaTypeIconMap, folderIdToRoute } from "@/helpers/genre";
import { getGenreDisplayName } from "@/helpers/utils";
import { api } from "@/plugins/api";
import {
  EventMessage,
  EventType,
  Genre,
  MediaItemTypeOrItemMapping,
  MediaType,
  MediaItemType,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { Button } from "@/components/ui/button";
import { SquareArrowRightEnter } from "lucide-vue-next";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

export interface Props {
  itemId: string;
  provider: string;
}
const props = defineProps<Props>();
const itemDetails = ref<Genre>();
const loading = ref(false);
const loadingRows = ref(false);
const overviewRows = ref<
  Array<{
    title: string;
    items: MediaItemTypeOrItemMapping[];
    icon?: string | Component;
    action?: () => void;
  }>
>([]);
const existingGenreNames = ref<Set<string>>(new Set());

const { t, te } = useI18n();
const router = useRouter();

const isAdmin = computed(() => authManager.isAdmin());

type GenreViewMode = "discovery" | "list" | "panel" | "panel_compact";

const { getPreference, setPreference } = useUserPreferences();
const savedViewMode = getPreference<GenreViewMode>(
  "genre_detail_view",
  "discovery",
);
const viewMode = ref<GenreViewMode>(savedViewMode.value);
const itemsViewMode = computed(() =>
  viewMode.value !== "discovery"
    ? (viewMode.value as "list" | "panel" | "panel_compact")
    : undefined,
);

watch(viewMode, (newVal) => {
  setPreference("genre_detail_view", newVal);
});

const displayRows = computed(() =>
  overviewRows.value.filter((row) => row.items?.length),
);

const viewModeIcon = computed(() => {
  if (viewMode.value === "discovery") return "mdi-view-dashboard";
  if (viewMode.value === "panel") return "mdi-grid";
  if (viewMode.value === "panel_compact") return "mdi-view-comfy";
  return "mdi-view-list";
});

const openViewModeMenu = (e: MouseEvent) => {
  eventbus.emit("contextmenu", {
    items: [
      {
        label: "view.discovery",
        icon: "mdi-view-dashboard",
        selected: viewMode.value === "discovery",
        action: () => {
          viewMode.value = "discovery";
        },
      },
      {
        label: "view.list",
        icon: "mdi-view-list",
        selected: viewMode.value === "list",
        action: () => {
          viewMode.value = "list";
        },
      },
      {
        label: "view.panel",
        icon: "mdi-grid",
        selected: viewMode.value === "panel",
        action: () => {
          viewMode.value = "panel";
        },
      },
      {
        label: "view.panel_compact",
        icon: "mdi-view-comfy",
        selected: viewMode.value === "panel_compact",
        action: () => {
          viewMode.value = "panel_compact";
        },
      },
    ],
    posX: e.clientX,
    posY: e.clientY,
  });
};

const navigateTo = (routeName: string) => {
  if (!itemDetails.value) return;
  router.push({
    name: routeName,
    query: { genre_ids: itemDetails.value.item_id },
  });
};

const loadItemDetails = async () => {
  loading.value = true;
  itemDetails.value = await api.getGenre(props.itemId, props.provider);
  const allGenres = await api.getLibraryGenres();
  existingGenreNames.value = new Set(
    allGenres.map((g) => g.name.toLowerCase()),
  );
  loading.value = false;
};

const loadOverviewRows = async () => {
  if (!itemDetails.value) return;
  loadingRows.value = true;

  try {
    const recommendationFolders = await api.getGenreOverviewRows(
      itemDetails.value.item_id,
      itemDetails.value.provider,
    );

    if (recommendationFolders && recommendationFolders.length > 0) {
      overviewRows.value = recommendationFolders.map((folder) => {
        return {
          title: getGenreDisplayName(
            folder.name || "",
            folder.translation_key,
            t,
            te,
          ),
          items: folder.items || [],
          icon: genreMediaTypeIconMap[folder.media_type],
          action: () => {
            if (!itemDetails.value) return;
            const routeName = folderIdToRoute[folder.item_id];
            if (routeName) {
              router.push({
                name: routeName,
                query: { genre_ids: itemDetails.value.item_id },
              });
            }
          },
        };
      });
    } else {
      overviewRows.value = [];
    }
  } catch (error) {
    console.error("Failed to load genre overview:", error);
    overviewRows.value = [];
  }

  // Fallback: if no overview rows returned, try loading radio base tracks
  if (overviewRows.value.length === 0) {
    try {
      const tracks = await api.getGenreRadioBaseTracks(
        itemDetails.value.item_id,
        itemDetails.value.provider,
      );
      overviewRows.value = [
        {
          title: t("tracks"),
          items: tracks,
          icon: genreMediaTypeIconMap[MediaType.TRACK],
        },
      ];
    } catch (error) {
      console.error("Failed to load genre radio base tracks:", error);
      overviewRows.value = [];
    }
  }

  loadingRows.value = false;
};

const genreId = () => parseInt(itemDetails.value!.item_id);

const loadGenreArtists = async (params: LoadDataParams) => {
  if (!itemDetails.value) return [];
  return await api.getLibraryArtists(
    params.favoritesOnly || undefined,
    params.search,
    undefined,
    undefined,
    params.sortBy,
    undefined,
    params.provider?.length ? params.provider : undefined,
    genreId(),
  );
};

const loadGenreAlbums = async (params: LoadDataParams) => {
  if (!itemDetails.value) return [];
  return await api.getLibraryAlbums(
    params.favoritesOnly || undefined,
    params.search,
    undefined,
    undefined,
    params.sortBy,
    undefined,
    params.provider?.length ? params.provider : undefined,
    genreId(),
  );
};

const loadGenreTracks = async (params: LoadDataParams) => {
  if (!itemDetails.value) return [];
  return await api.getLibraryTracks(
    params.favoritesOnly || undefined,
    params.search,
    undefined,
    undefined,
    params.sortBy,
    params.provider?.length ? params.provider : undefined,
    genreId(),
  );
};

const loadGenrePlaylists = async (params: LoadDataParams) => {
  if (!itemDetails.value) return [];
  return await api.getLibraryPlaylists(
    params.favoritesOnly || undefined,
    params.search,
    undefined,
    undefined,
    params.sortBy,
    params.provider?.length ? params.provider : undefined,
    genreId(),
  );
};

const loadGenrePodcasts = async (params: LoadDataParams) => {
  if (!itemDetails.value) return [];
  return await api.getLibraryPodcasts(
    params.favoritesOnly || undefined,
    params.search,
    undefined,
    undefined,
    params.sortBy,
    params.provider?.length ? params.provider : undefined,
    genreId(),
  );
};

const loadGenreAudiobooks = async (params: LoadDataParams) => {
  if (!itemDetails.value) return [];
  return await api.getLibraryAudiobooks(
    params.favoritesOnly || undefined,
    params.search,
    undefined,
    undefined,
    params.sortBy,
    params.provider?.length ? params.provider : undefined,
    genreId(),
  );
};

watch(
  () => props.itemId,
  (val) => {
    if (val) loadItemDetails();
  },
  { immediate: true },
);

watch(
  () => itemDetails.value?.uri,
  () => {
    loadOverviewRows();
  },
);

onMounted(() => {
  const unsub = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      const updatedItem = evt.data as MediaItemType;
      if (itemDetails.value?.uri == updatedItem.uri) {
        itemDetails.value = updatedItem as Genre;
      }
    },
  );
  onBeforeUnmount(unsub);
});
</script>

<style scoped>
/* Brand teal tokens — mirrors vuetify.css globals */
.genre-details {
  --sl-teal: #2dd4bf;
  --sl-teal-deep: #0f766e;
  --sl-teal-soft: rgba(45, 212, 191, 0.12);
  --sl-teal-soft-strong: rgba(45, 212, 191, 0.22);
  position: relative;
  padding-bottom: 0;
}

.rows-loading {
  margin: 20px 16px;
}

.rows-loading :deep(.v-progress-linear__indeterminate) {
  background: linear-gradient(
    90deg,
    var(--sl-teal-deep),
    var(--sl-teal),
    var(--sl-teal-deep)
  ) !important;
}

/* Discovery overview rows — subtle vertical rhythm + teal section glow */
.overview-container {
  padding: 4px 16px 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.overview-row {
  margin-top: 10px;
  position: relative;
  padding-left: 10px;
}

.overview-row::before {
  content: "";
  position: absolute;
  left: 0;
  top: 14px;
  bottom: 14px;
  width: 3px;
  border-radius: 2px;
  background: linear-gradient(
    180deg,
    var(--sl-teal) 0%,
    var(--sl-teal-deep) 100%
  );
  opacity: 0;
  transition: opacity 200ms ease;
}

.overview-row:hover::before {
  opacity: 0.85;
}

/* Traditional section list — give each section a touch of breathing room */
.genre-sections {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 8px;
}

/* Section heading text — subtle teal underline accent */
.section-title-text {
  position: relative;
  display: inline-block;
  letter-spacing: 0.01em;
  background: linear-gradient(
    180deg,
    transparent 0%,
    transparent 78%,
    var(--sl-teal-soft-strong) 78%,
    var(--sl-teal-soft-strong) 100%
  );
  padding: 0 2px;
}

/* Navigate-into-listing icon — teal hover */
.navigate-icon {
  margin-left: 8px;
  cursor: pointer;
  opacity: 0.55;
  vertical-align: middle;
  color: var(--sl-teal);
  transition:
    opacity 150ms ease,
    transform 150ms ease,
    color 150ms ease;
}

.navigate-icon:hover {
  opacity: 1;
  transform: translateX(2px);
  color: var(--sl-teal);
}

/* Empty state for discovery view */
.genre-empty-state {
  margin: 48px auto;
  padding: 32px 24px;
  max-width: 420px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  border-radius: 16px;
  background: var(--sl-teal-soft);
  border: 1px solid var(--sl-teal-soft-strong);
}

.genre-empty-state .empty-icon {
  color: var(--sl-teal);
  opacity: 0.85;
  filter: drop-shadow(0 0 18px rgba(45, 212, 191, 0.35));
}

.genre-empty-state .empty-title {
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  color: rgb(var(--v-theme-on-surface));
}

.genre-empty-state .empty-subtitle {
  font-size: 0.875rem;
  opacity: 0.7;
  font-style: italic;
}

/* Bottom spacer — keeps last section clear of the persistent playerbar */
.genre-bottom-spacer {
  height: 140px;
  pointer-events: none;
}

@media (max-width: 600px) {
  .overview-container {
    padding: 4px 12px 16px 12px;
  }
  .genre-bottom-spacer {
    height: 160px;
  }
}
</style>
