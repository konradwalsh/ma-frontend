<template>
  <div>
    <v-card
      variant="flat"
      :img="imgGradient"
      style="z-index: 0; border-radius: 0px"
      height="25vh"
      max-height="500px"
      min-height="340px"
    >
      <!-- loading animation -->
      <v-progress-linear v-if="!item" indeterminate />
      <v-img
        width="100%"
        height="100%"
        cover
        class="background-image"
        :src="fanartImage"
        :gradient="
          $vuetify.theme.current.dark
            ? 'to bottom, rgba(0,0,0,.90), rgba(0,0,0,.75)'
            : 'to bottom, rgba(255,255,255,.90), rgba(255,255,255,.75)'
        "
        :transition="false"
        eager
      />
      <Toolbar
        :icon="ArrowLeft"
        style="position: absolute; z-index: 999999"
        :menu-items="menuItems"
        :enforce-overflow-menu="true"
        :icon-action="backButtonClick"
      >
        <template v-if="$slots['toolbar-append']" #append>
          <slot name="toolbar-append"></slot>
        </template>
      </Toolbar>
      <v-layout
        v-if="item"
        style="
          margin: 0;
          top: 55%;
          -ms-transform: translateY(-50%);
          transform: translateY(-50%);
          padding-left: 15px;
          align-items: center;
          padding-right: 15px;
          display: flex;
          width: 100%;
        "
      >
        <!-- left side: cover image -->
        <div
          v-if="!$vuetify.display.mobile"
          xs5
          pa-5
          style="
            height: 80%;
            min-width: 230px;
            margin-top: 25px;
            margin-bottom: 15px;
            margin-right: 24px;
            align-content: center;
            flex-shrink: 0;
          "
        >
          <div v-if="item.media_type && item.media_type == MediaType.ARTIST">
            <v-avatar size="210" style="margin-bottom: 10%">
              <MediaItemThumb :item="item" size="calc(100%)" />
            </v-avatar>
          </div>
          <div v-else-if="item.media_type === MediaType.ALBUM" class="sl-vinyl-wrapper">
            <!-- Streamloader-fork addition: ALACarte-style vinyl-emerging-
                 from-cover hero, scoped to ALBUM only (other media types
                 keep MA's original cover-only render below). On hover the
                 vinyl slides out to the right with a slight tilt; on touch
                 devices the effect is suppressed entirely so finger-drag
                 doesn't trigger it. Vinyl SVG self-contained, lifted from
                 the streamloader web UI's /static/vinyl.svg. -->
            <img :src="vinylSvg" alt="" class="sl-vinyl-disc" />
            <div class="sl-vinyl-cover">
              <MediaItemThumb
                :item="item"
                size="calc(100%)"
                style="max-height: 256px"
              />
            </div>
          </div>
          <div v-else>
            <MediaItemThumb
              :item="item"
              size="calc(100%)"
              style="max-height: 256px"
            />
          </div>
        </div>

        <div style="min-width: 0">
          <!-- Main title -->
          <img
            v-if="artistLogo"
            :src="artistLogo"
            width="auto"
            height="80"
            style="padding-left: 10px"
          />
          <v-card-title v-else>
            <div class="sl-title-row">
              <!-- Streamloader-fork addition: pulsing teal LIVE indicator
                   for radio streams. Pure presentation dot — no data
                   needed because radio is by definition a live source. -->
              <span
                v-if="item.media_type === MediaType.RADIO"
                class="sl-live-indicator"
                :title="$t('radio')"
              >
                <span class="sl-live-dot"></span>
                <span class="sl-live-label">LIVE</span>
              </span>
              <MarqueeText :sync="marqueeSync">
                <div class="selectable">
                  {{ headerTitle }}
                </div>
              </MarqueeText>
              <!-- Streamloader-fork addition: subtle teal PLAYLIST badge
                   — playlist signature counterpart to album's vinyl
                   reveal. Lightest-touch option (no cover overlay). -->
              <span
                v-if="item.media_type === MediaType.PLAYLIST"
                class="sl-playlist-badge"
                >PLAYLIST</span
              >
            </div>
          </v-card-title>

          <!-- other details -->
          <div style="padding-bottom: 10px">
            <!-- version -->
            <v-card-subtitle
              v-if="'version' in item && item.version"
              class="caption"
            >
              {{ item.version }}
              <!-- explicit icon -->
              <v-tooltip location="bottom">
                <template #activator="{ props }">
                  <v-icon
                    v-if="parseBool(item.metadata.explicit || false)"
                    v-bind="props"
                    icon="mdi-alpha-e-box"
                    width="35"
                  />
                </template>
                <span>{{ $t("tooltip.explicit") }}</span>
              </v-tooltip>
            </v-card-subtitle>

            <!-- track release date -->
            <v-card-subtitle
              v-if="
                item.media_type == MediaType.TRACK &&
                item.metadata?.release_date
              "
              class="title d-flex"
            >
              <v-icon
                style="margin-left: -3px; margin-right: 3px"
                small
                color="primary"
                icon="mdi-calendar"
              />
              {{ new Date(item.metadata.release_date).getFullYear() }}
            </v-card-subtitle>

            <!-- item artists -->
            <v-card-subtitle
              v-if="'artists' in item && item.artists"
              class="title accent--text d-flex"
            >
              <v-icon
                style="margin-left: -3px; margin-right: 3px"
                small
                color="primary"
                icon="mdi-account-music"
              />
              <MarqueeText :sync="marqueeSync">
                <span
                  v-for="(artist, artistindex) in item.artists"
                  :key="artist.item_id"
                >
                  <a style="color: accent" @click="artistClick(artist)">{{
                    artist.name
                  }}</a>
                  <span
                    v-if="artistindex + 1 < item.artists.length"
                    :key="artistindex"
                    style="color: accent"
                    >{{ " / " }}</span
                  >
                </span>
              </MarqueeText>
            </v-card-subtitle>

            <!-- album type and year -->
            <v-card-subtitle
              v-if="item.media_type == MediaType.ALBUM"
              class="caption"
            >
              <span
                v-if="'album_type' in item && item.album_type !== 'unknown'"
              >
                {{ $t("album_type." + item.album_type) }}
              </span>
              <span v-if="'year' in item && item.year">
                • {{ item.year }}
              </span>
            </v-card-subtitle>

            <!-- audiobook author(s) -->
            <v-card-subtitle
              v-if="'authors' in item && item.authors.length > 0"
              class="title accent--text d-flex"
            >
              <v-icon
                style="margin-left: -3px; margin-right: 3px"
                small
                color="primary"
                icon="mdi-account-edit"
              />
              <MarqueeText :sync="marqueeSync">
                <span
                  v-for="(author, authorindex) in item.authors"
                  :key="author"
                >
                  <span style="color: accent">{{ author }}</span>
                  <span
                    v-if="authorindex + 1 < item.authors.length"
                    :key="authorindex"
                    style="color: accent"
                    >{{ " / " }}</span
                  >
                </span>
              </MarqueeText>
            </v-card-subtitle>

            <!-- audiobook narrator(s) -->
            <v-card-subtitle
              v-if="'narrators' in item && item.narrators.length > 0"
              class="title accent--text d-flex"
            >
              <v-icon
                style="margin-left: -3px; margin-right: 3px"
                small
                color="primary"
                icon="mdi-account-voice"
              />
              <MarqueeText :sync="marqueeSync">
                <span
                  v-for="(narrator, narratorIndex) in item.narrators"
                  :key="narrator"
                >
                  <span style="color: accent">{{ narrator }}</span>
                  <span
                    v-if="narratorIndex + 1 < item.narrators.length"
                    :key="narratorIndex"
                    style="color: accent"
                    >{{ " / " }}</span
                  >
                </span>
              </MarqueeText>
            </v-card-subtitle>

            <!-- playlist owner -->
            <v-card-subtitle
              v-if="'owner' in item && item.owner"
              class="title d-flex"
            >
              <v-icon
                color="primary"
                style="margin-left: -3px; margin-right: 3px"
                small
                icon="mdi-account-music"
              />
              <MarqueeText :sync="marqueeSync">
                <a style="color: primary">{{ item.owner }}</a>
              </MarqueeText>
            </v-card-subtitle>

            <v-card-subtitle
              v-if="'album' in item && item.album"
              class="d-flex"
            >
              <v-icon
                color="primary"
                style="margin-left: -3px; margin-right: 3px"
                small
                icon="mdi-album"
              />
              <MarqueeText :sync="marqueeSync">
                <a
                  style="color: secondary"
                  @click="albumClick((item as Track)?.album)"
                  >{{ item.album.name }}</a
                ><span v-if="'year' in item.album && item.album.year">
                  • {{ item.album.year }}</span
                ></MarqueeText
              >
            </v-card-subtitle>
          </div>

          <!-- Streamloader-fork addition: audiobook listening progress.
               Shows a teal-tinted progress bar + "% listened" + "Resume
               from chapter X" hint when resume_position_ms > 0 (uses
               metadata.chapters[] to compute the chapter label). -->
          <div
            v-if="
              item.media_type === MediaType.AUDIOBOOK &&
              audiobookProgressPct !== null
            "
            class="sl-audiobook-progress"
          >
            <div class="sl-audiobook-progress-row">
              <v-progress-linear
                :model-value="audiobookProgressPct"
                height="6"
                rounded
                color="primary"
                bg-color="rgba(45, 212, 191, 0.15)"
                class="sl-audiobook-bar"
              />
              <span class="sl-audiobook-pct"
                >{{ Math.round(audiobookProgressPct) }}%</span
              >
            </div>
            <div v-if="audiobookResumeChapter" class="sl-audiobook-resume">
              <v-icon
                size="14"
                color="primary"
                icon="mdi-play-circle-outline"
              />
              <span>{{ audiobookResumeChapter }}</span>
            </div>
          </div>

          <!-- Streamloader-fork addition: podcast episode count chip.
               Surfaces total_episodes when present. -->
          <div
            v-if="
              item.media_type === MediaType.PODCAST &&
              'total_episodes' in item &&
              item.total_episodes
            "
            class="sl-podcast-meta"
          >
            <v-chip
              size="small"
              color="primary"
              variant="tonal"
              prepend-icon="mdi-podcast"
            >
              {{ item.total_episodes }} {{ $t("episodes") }}
            </v-chip>
          </div>

          <!-- play/info buttons -->
          <div
            style="
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-left: 14px;
              padding-bottom: 10px;
              align-items: center;
            "
          >
            <!-- play button with contextmenu -->
            <MenuButton
              id="playbutton"
              :width="220"
              icon="mdi-play-circle-outline"
              :text="truncateString($t('play'), 14)"
              :disabled="!item"
              :loading="
                store.activePlayerQueue &&
                store.activePlayerQueue.extra_attributes
                  ?.play_action_in_progress === true
              "
              :open-menu-on-click="!store.activePlayer"
              style="margin-right: 8px; margin-bottom: 4px"
              @click="playButtonClick"
              @menu="playButtonClick(true)"
            />

            <!-- Streamloader-fork addition: podcast subscribe toggle.
                 No dedicated `subscribed` field on Podcast in interfaces.ts
                 yet — re-uses MediaItem.favorite as the subscribe-state
                 source-of-truth (matches MA's library-add semantics) but
                 surfaces it as a labelled, teal-styled button so podcast
                 details feel distinct from a generic "favorite this album". -->
            <v-btn
              v-if="item.media_type === MediaType.PODCAST"
              :color="item.favorite ? 'primary' : 'default'"
              :variant="item.favorite ? 'flat' : 'outlined'"
              :prepend-icon="
                item.favorite ? 'mdi-check-circle' : 'mdi-rss'
              "
              class="sl-podcast-subscribe"
              style="margin-right: 8px; margin-bottom: 4px"
              @click="api.toggleFavorite(item)"
            >
              {{ item.favorite ? $t("subscribed") : $t("subscribe") }}
            </v-btn>

            <div class="flex items-center gap-2">
              <!-- favorite (heart) icon -->
              <IconHeartFilled
                v-if="item.favorite"
                :size="24"
                class="cursor-pointer"
                :title="$t('tooltip.favorite')"
                @click="api.toggleFavorite(item)"
              />
              <IconHeart
                v-else
                :stroke-width="2"
                :size="24"
                class="cursor-pointer"
                :title="$t('tooltip.favorite')"
                @click="api.toggleFavorite(item)"
              />
              <!-- provider icon -->
              <provider-icon :domain="item.provider" :size="25" />
              <!-- merge genre button (admin only) -->
              <Merge
                v-if="
                  item.media_type === MediaType.GENRE &&
                  item.provider === 'library' &&
                  isAdmin
                "
                :size="22"
                class="cursor-pointer -ml-1"
                :title="$t('merge_into')"
                @click="mergeGenre"
              />
              <!-- delete genre button (admin only) -->
              <Trash2
                v-if="
                  item.media_type === MediaType.GENRE &&
                  item.provider === 'library' &&
                  isAdmin
                "
                :size="22"
                class="cursor-pointer ml-2"
                :title="$t('delete_genre')"
                @click="deleteGenre"
              />
            </div>
          </div>
          <div
            v-if="$slots['after-play']"
            class="info-header-after-play"
            style="margin-left: 14px; padding-bottom: 10px"
          >
            <slot name="after-play"></slot>
          </div>
          <!-- Description/metadata -->
          <v-card-subtitle
            v-if="shortDescription"
            class="body-2 justify-left description-text"
            style="padding-bottom: 10px; cursor: pointer"
            @click="showFullInfo = !showFullInfo"
          >
            <!-- eslint-disable vue/no-v-html -->
            <div v-html="shortDescription"></div>
            <!-- eslint-enable vue/no-v-html -->
          </v-card-subtitle>

          <!-- genres/tags -->
          <div
            v-if="mappedGenres.length"
            class="justify-center"
            style="margin-left: 15px; padding-bottom: 20px"
          >
            <v-chip
              v-for="genre of mappedGenres.slice(
                0,
                $vuetify.display.mobile ? 15 : 25,
              )"
              :key="genre.item_id"
              color="blue-grey lighten-1"
              style="margin-right: 5px; margin-bottom: 5px"
              small
              outlined
              class="cursor-pointer"
              @click="handleMediaItemClick(genre, 0, 0)"
              @contextmenu.prevent="
                (e: MouseEvent) => showGenreChipContextMenu(e, genre)
              "
            >
              {{
                getGenreDisplayName(genre.name, genre.translation_key, t, te)
              }}
            </v-chip>
          </div>
        </div>
      </v-layout>
    </v-card>
    <v-dialog v-model="showFullInfo" max-width="975" width="auto">
      <v-card>
        <!-- eslint-disable vue/no-v-html -->
        <!-- eslint-disable vue/no-v-text-v-html-on-component -->
        <v-card-text v-html="fullDescription" />
        <!-- eslint-enable vue/no-v-html -->
        <!-- eslint-enable vue/no-v-text-v-html-on-component -->
        <v-card-actions>
          <v-btn color="primary" block @click="showFullInfo = false">
            {{ $t("close") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import Toolbar from "@/components/Toolbar.vue";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import {
  getGenreDescription,
  getGenreDisplayName,
  getImageThumbForItem,
  handleMediaItemClick,
  handlePlayBtnClick,
  markdownToHtml,
  parseBool,
  truncateString,
} from "@/helpers/utils";
import {
  ContextMenuItem,
  getContextMenuItems,
} from "@/layouts/default/ItemContextMenu.vue";
import { api } from "@/plugins/api";
import type {
  Album,
  Artist,
  Audiobook,
  Genre,
  ItemMapping,
  MediaItemType,
} from "@/plugins/api/interfaces";
import { ImageType, MediaType, Track } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { IconHeart, IconHeartFilled } from "@tabler/icons-vue";
import { ArrowLeft, Merge, Trash2 } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import MarqueeText from "./MarqueeText.vue";
import MediaItemThumb from "./MediaItemThumb.vue";
import MenuButton from "./MenuButton.vue";
import ProviderIcon from "./ProviderIcon.vue";

// properties
export interface Props {
  item?: MediaItemType;
  sortBy?: string;
}
const compProps = defineProps<Props>();
const showFullInfo = ref(false);
const fanartImage = ref();
useDisplay();
const menuItems = ref<ContextMenuItem[]>([]);
const mappedGenres = ref<Genre[]>([]);

const imgGradient = new URL("../assets/info_gradient.jpg", import.meta.url)
  .href;

// Streamloader-fork addition: vinyl asset for the ALACarte-style
// album-cover hover reveal (sl-vinyl-* classes below).
const vinylSvg = new URL("../assets/vinyl.svg", import.meta.url).href;

const marqueeSync = new MarqueeTextSync();
const router = useRouter();
const { t, te } = useI18n();

const headerTitle = computed(() => {
  if (!compProps.item) return "";
  if (compProps.item.media_type === MediaType.GENRE) {
    return getGenreDisplayName(
      compProps.item.name,
      compProps.item.translation_key,
      t,
      te,
    );
  }
  return compProps.item.name;
});

watch(
  () => compProps.item,
  async (val) => {
    if (val) {
      fanartImage.value =
        getImageThumbForItem(val, ImageType.FANART) ||
        getImageThumbForItem(val, ImageType.LANDSCAPE) ||
        getImageThumbForItem(val, ImageType.THUMB) ||
        imgGradient;
      menuItems.value = await getContextMenuItems([val], val);
      // Load mapped genres for non-genre media items
      if (val.media_type !== MediaType.GENRE) {
        api
          .getGenresForMediaItem(val.media_type, val.item_id)
          .then((genres) => {
            mappedGenres.value = genres;
          })
          .catch(() => {
            mappedGenres.value = [];
          });
      } else {
        mappedGenres.value = [];
      }
    } else {
      fanartImage.value = imgGradient;
      menuItems.value = [];
      mappedGenres.value = [];
    }
  },
  { immediate: true },
);

const showGenreChipContextMenu = (evt: MouseEvent, genre: Genre) => {
  if (
    !compProps.item ||
    !isAdmin.value ||
    compProps.item.provider !== "library"
  )
    return;
  const mediaItem = compProps.item;
  const menuItems: ContextMenuItem[] = [
    {
      label: "exclude_genre",
      icon: "mdi-cancel",
      action: async () => {
        await api.excludeGenreFromItem(
          genre.item_id,
          mediaItem.media_type,
          mediaItem.item_id,
        );
        mappedGenres.value = mappedGenres.value.filter(
          (g) => g.item_id !== genre.item_id,
        );
        eventbus.emit("genreExcluded");
      },
    },
  ];
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: evt.clientX,
    posY: evt.clientY,
  });
};

const albumClick = function (item: Album | ItemMapping) {
  // album entry clicked
  router.push({
    name: "album",
    params: {
      itemId: item.item_id,
      provider: item.provider,
    },
  });
};
const artistClick = function (item: Artist | ItemMapping) {
  // album entry clicked
  router.push({
    name: "artist",
    params: {
      itemId: item.item_id,
      provider: item.provider,
    },
  });
};

const backButtonClick = function () {
  // if we have stored routes, we can safely use history back
  if (store.prevRoute) {
    router.back();
    return;
  }
  // back to main listing for itemtype
  const curRoute = router.currentRoute.value.name?.toString() || "";
  for (const itemType of ["artist", "album", "track", "playlist", "radio"]) {
    if (curRoute.includes(itemType)) {
      router.push({
        name: `${itemType}s`,
      });
      return;
    }
  }
  router.push({
    name: "discover",
  });
};

const playButtonClick = function (forceMenu = false) {
  const playButton = document.getElementById("playbutton") as HTMLElement;
  handlePlayBtnClick(
    compProps.item!,
    playButton.getBoundingClientRect().left,
    playButton.getBoundingClientRect().top + 36,
    undefined,
    forceMenu,
    compProps.sortBy,
  );
};

const rawDescription = computed(() => {
  if (!compProps.item) return "";
  if (compProps.item.metadata && compProps.item.metadata.description) {
    return compProps.item.metadata.description;
  } else if (compProps.item.media_type === MediaType.GENRE) {
    return getGenreDescription(
      compProps.item.name,
      compProps.item.translation_key,
      t,
      te,
    );
  } else if (compProps.item.metadata && compProps.item.metadata.copyright) {
    return compProps.item.metadata.copyright;
  } else if ("artists" in compProps.item) {
    compProps.item.artists.forEach(function (artist: Artist | ItemMapping) {
      if ("metadata" in artist && artist.metadata.description) {
        return artist.metadata.description;
      }
    });
  }
  return "";
});

const fullDescription = computed(() => {
  return markdownToHtml(rawDescription.value);
});

const shortDescription = computed(() => {
  const maxChars = 800;
  if (rawDescription.value.length > maxChars) {
    return fullDescription.value.substring(0, maxChars) + "…";
  }
  return fullDescription.value;
});

const artistLogo = computed(() => {
  if (!compProps.item) return undefined;
  if (compProps.item.media_type != MediaType.ARTIST) return undefined;
  return getImageThumbForItem(compProps.item, ImageType.LOGO);
});

// Streamloader-fork addition: audiobook listening progress.
// resume_position_ms is in milliseconds; Audiobook.duration is in
// seconds (matches Track.duration semantics on MA's existing models).
const audiobookProgressPct = computed<number | null>(() => {
  if (!compProps.item) return null;
  if (compProps.item.media_type !== MediaType.AUDIOBOOK) return null;
  const ab = compProps.item as Audiobook;
  if (!ab.duration) return null;
  if (ab.fully_played) return 100;
  const resumeMs = ab.resume_position_ms ?? 0;
  if (resumeMs <= 0) return null;
  const pct = (resumeMs / 1000 / ab.duration) * 100;
  if (!isFinite(pct)) return null;
  return Math.max(0, Math.min(100, pct));
});

// Streamloader-fork addition: chapter label at the audiobook's current
// resume position. Walks metadata.chapters[] (start is in seconds) and
// picks the chapter whose [start, end) range contains the resume point.
const audiobookResumeChapter = computed<string | null>(() => {
  if (!compProps.item) return null;
  if (compProps.item.media_type !== MediaType.AUDIOBOOK) return null;
  const ab = compProps.item as Audiobook;
  const resumeMs = ab.resume_position_ms ?? 0;
  if (resumeMs <= 0) return null;
  const chapters = ab.metadata?.chapters;
  const resumeLabel = te("resume") ? t("resume") : "Resume";
  if (!chapters || chapters.length === 0) {
    return resumeLabel;
  }
  const resumeSec = resumeMs / 1000;
  const current = chapters.find((c) => {
    const end = c.end ?? Number.POSITIVE_INFINITY;
    return resumeSec >= c.start && resumeSec < end;
  });
  if (!current) return resumeLabel;
  // Prefer translated "Resume from chapter X" if the i18n key exists,
  // otherwise fall back to a literal English label so the hint always
  // renders even before the locale catalog is updated.
  return te("resume_from_chapter")
    ? t("resume_from_chapter", { chapter: current.name })
    : `${resumeLabel} — ${current.name}`;
});

const isAdmin = computed(() => authManager.isAdmin());

const mergeGenre = () => {
  if (!compProps.item) return;
  eventbus.emit("mergeGenreDialog", {
    genreIds: [compProps.item.item_id],
    genreNames: [compProps.item.name],
  });
};

const deleteGenre = () => {
  if (!compProps.item) return;
  eventbus.emit("deleteGenreDialog", {
    genreIds: [compProps.item.item_id],
    navigateBack: true,
  });
};
</script>

<style scoped>
.selectable {
  -webkit-user-select: text;
  /* Safari */
  -khtml-user-select: text;
  /* Konqueror HTML */
  -moz-user-select: text;
  /* Old versions of Firefox */
  -ms-user-select: text;
  /* Internet Explorer/Edge */
  user-select: text;
  /* Non-prefixed version, currently supported by Chrome, Edge, Opera and Firefox */
}

.background-image {
  position: absolute;
}

.background-image .v-img__img--cover {
  object-position: 50% 20%;
}
.v-card--variant-elevated {
  box-shadow: none;
  border-width: 1px;
  border-style: solid;
  font-size: smaller;
}

.description-text :deep(div) {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
  word-break: break-word;
}

@media (max-width: 1280px) {
  .description-text :deep(div) {
    -webkit-line-clamp: 3;
    line-clamp: 3;
  }
}

/* ─── Streamloader-fork addition: ALACarte vinyl-cover hover reveal
       (album-only — see v-else-if in template). Mirrors the
       .vinyl-cover-wrapper rules in streamloader's web UI styles.css.
       Cubic-bezier easing exits with a tiny overshoot for the slight
       "spring out" feel. */

.sl-vinyl-wrapper {
  position: relative;
  display: inline-block;
  overflow: visible;
  /* Same hover-tilt-and-scale that streamloader's UI applies to album
     items so the whole composition reads as a unit, not just the disc. */
  transition: transform 700ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.sl-vinyl-cover {
  position: relative;
  z-index: 2;
  display: block;
}

.sl-vinyl-disc {
  position: absolute;
  top: 50%;
  left: 0;
  width: 96%;
  height: auto;
  aspect-ratio: 1 / 1;
  transform: translate(0, -50%) rotate(-40deg);
  transform-origin: center center;
  transition: transform 700ms cubic-bezier(0.34, 1.36, 0.64, 1);
  z-index: 1;
  pointer-events: none;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
}

.sl-vinyl-wrapper:hover .sl-vinyl-disc {
  transform: translate(45%, -50%) rotate(0deg);
}

.sl-vinyl-wrapper:hover {
  transform: rotate(-3deg) scale(1.03);
}

/* Touch devices: disable hover effect entirely. The reveal is a
   desktop-mouse affordance; on a phone the user's finger drag would
   either always-trigger it (cluttering the cover) or never-trigger it
   (depending on browser). Either way it adds nothing on touch. */
@media (hover: none) {
  .sl-vinyl-wrapper:hover .sl-vinyl-disc {
    transform: translate(0, -50%) rotate(-40deg);
  }
  .sl-vinyl-wrapper:hover {
    transform: none;
  }
}

/* ─── Streamloader-fork addition: media-type-specific title affordances.
       LIVE pulse for radio, PLAYLIST badge for playlists. */

.sl-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  flex-wrap: wrap;
}

/* Radio LIVE indicator. Brand teal; soft breathing pulse. */
.sl-live-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid rgba(45, 212, 191, 0.45);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: #2dd4bf;
  flex-shrink: 0;
}

.sl-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #2dd4bf;
  box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.8);
  animation: sl-live-pulse 1.6s ease-out infinite;
}

.sl-live-label {
  line-height: 1;
}

@keyframes sl-live-pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(45, 212, 191, 0.7);
    opacity: 1;
  }
  70% {
    box-shadow: 0 0 0 8px rgba(45, 212, 191, 0);
    opacity: 0.85;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(45, 212, 191, 0);
    opacity: 1;
  }
}

/* Light-theme-aware tweak: deeper teal so the pill stays legible
   over the lighter background gradient. */
:global(.v-theme--light) .sl-live-indicator {
  color: #0f766e;
  border-color: rgba(15, 118, 110, 0.5);
  background: rgba(15, 118, 110, 0.08);
}
:global(.v-theme--light) .sl-live-dot {
  background: #0f766e;
}

/* Playlist signature badge. Lightest-touch alternative to a cover
   ribbon — sits inline with the title so it doesn't fight the layout. */
.sl-playlist-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.18),
    rgba(45, 212, 191, 0.06)
  );
  border: 1px solid rgba(45, 212, 191, 0.35);
  color: #2dd4bf;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  flex-shrink: 0;
}

:global(.v-theme--light) .sl-playlist-badge {
  color: #0f766e;
  border-color: rgba(15, 118, 110, 0.4);
  background: linear-gradient(
    135deg,
    rgba(15, 118, 110, 0.14),
    rgba(15, 118, 110, 0.04)
  );
}

/* ─── Audiobook listening progress bar + resume-from-chapter hint. */

.sl-audiobook-progress {
  margin: 0 16px 12px 16px;
  max-width: 420px;
}

.sl-audiobook-progress-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sl-audiobook-bar {
  flex: 1 1 auto;
}

.sl-audiobook-pct {
  font-size: 11px;
  font-weight: 600;
  color: #2dd4bf;
  min-width: 32px;
  text-align: right;
}

:global(.v-theme--light) .sl-audiobook-pct {
  color: #0f766e;
}

.sl-audiobook-resume {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.85;
}

/* ─── Podcast: episode count chip + subscribe-button polish. */

.sl-podcast-meta {
  margin: 0 16px 10px 16px;
}

.sl-podcast-subscribe {
  text-transform: none;
  letter-spacing: 0.02em;
  font-weight: 600;
}
</style>
