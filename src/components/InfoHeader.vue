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
      <!-- Loading state: branded spinner centered over the header card while
           the underlying media item is being fetched. Replaces the upstream
           v-progress-linear for visual consistency with other streamloader
           loading surfaces (HomeView fallback, search inline spinner, etc.). -->
      <div
        v-if="!item"
        class="sl-info-header-loading"
        role="status"
        aria-live="polite"
      >
        <StreamloaderSpinner
          :size="48"
          :label="$t('streamloader.info_header.loading_label')"
        />
      </div>
      <!-- Streamloader-fork addition: heavy-blur fanart wash sitting
           BEHIND the existing solid-gradient background image. Adds
           atmosphere without competing with foreground content. The
           overlying v-img below keeps its dark gradient so text
           contrast is preserved against the blurred cover-art. -->
      <StreamloaderFanart :src="fanartImage" />
      <v-img
        width="100%"
        height="100%"
        cover
        class="background-image"
        :src="fanartImage"
        :gradient="
          $vuetify.theme.current.dark
            ? 'to bottom, rgba(0,0,0,.78), rgba(0,0,0,.62)'
            : 'to bottom, rgba(255,255,255,.82), rgba(255,255,255,.68)'
        "
        :transition="false"
        eager
      />
      <!-- Streamloader-fork addition (batch polish): subtle teal vignette
           in the corners. Sits above the fanart wash but below all hero
           content so it focuses attention on the cover + title without
           competing with text contrast. Pure CSS radial gradients. -->
      <div class="sl-hero-vignette" aria-hidden="true"></div>
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
            <v-avatar
              size="210"
              style="margin-bottom: 10%"
              :class="{ 'sl-track-pulse': showPulse }"
            >
              <MediaItemThumb :item="item" size="calc(100%)" />
            </v-avatar>
          </div>
          <div
            v-else-if="item.media_type === MediaType.ALBUM"
            class="sl-vinyl-wrapper"
            :class="[vinylWrapperClasses, { 'sl-track-pulse-host': showPulse }]"
          >
            <!-- Streamloader-fork addition: ALACarte-style vinyl-emerging-
                 from-cover hero, scoped to ALBUM only (other media types
                 keep MA's original cover-only render below). Display mode
                 is user-configurable via the "vinyl_display_mode" frontend
                 setting (hover / always-visible / always-visible-spinning).
                 The spin animation is gated on the active player's
                 PlaybackState.PLAYING so a paused queue freezes the disc.
                 Vinyl SVG self-contained, lifted from the streamloader
                 web UI's /static/vinyl.svg.

                 Streamloader-fork fix (batch MMM4): split the protrude
                 translate from the spin rotate onto separate wrappers.
                 A combined translate+rotate on a single element rotates
                 around the box's pre-translate center (the transform-
                 origin is fixed in the box's local coords) — that made
                 the disc orbit the cover instead of spinning in place.
                 Now: .sl-vinyl-disc-protrude handles ONLY the protrude
                 offset (never rotates), and .sl-vinyl-disc-spin nested
                 inside handles ONLY the rotation (around its own center,
                 which is the disc's center because the protrude wrapper
                 already placed it there). The label is a descendant of
                 the spinning wrapper so it tracks the disc perfectly. -->
            <div class="sl-vinyl-disc-protrude" aria-hidden="true">
              <div
                class="sl-vinyl-disc-spin"
                :class="{ 'sl-vinyl-spinning--paused': !vinylShouldSpin }"
              >
                <img :src="vinylSvg" alt="" class="sl-vinyl-disc" />
                <!-- Streamloader-fork addition (batch MMM3 / MMM4):
                     album-cover thumbnail printed onto the vinyl's
                     center label. Centered on the disc and inherits the
                     spin wrapper's rotation, so it stays anchored to
                     the spindle. Brand-teal ring keeps the streamloader
                     identity even with arbitrary covers. -->
                <!-- Streamloader-fork fix (batch MMM5): defensive @error
                     fallback so a broken cover URL still leaves the
                     teal-ringed center label visible (was rendering as
                     a plain black disc when getImageThumbForItem 404'd
                     against legacy items). -->
                <div v-if="vinylLabelImage" class="sl-vinyl-label">
                  <img
                    :key="vinylLabelImage"
                    :src="vinylLabelImage"
                    alt=""
                    @error="onVinylLabelError"
                  />
                </div>
              </div>
              <!-- Streamloader-fork addition (batch MMM3): fixed
                   (non-rotating) sheen overlay sells the "physical
                   object" look. Lives in the protrude wrapper so it
                   tracks the disc's position but stays out of the
                   spin wrapper so the highlight does not rotate. -->
              <div class="sl-vinyl-sheen"></div>
            </div>
            <div class="sl-vinyl-cover">
              <!-- Streamloader-fork fix (batch 32 pattern, applied to
                   InfoHeader): the album-detail hero cover used
                   <MediaItemThumb> which wraps <v-img :src=getImageThumbForItem(...)>.
                   For some albums the raw provider URL 404s while the
                   imageproxy-resized variant succeeds — that asymmetry made
                   the hero cover blank while the queue-row thumb (also
                   MediaItemThumb but at size 256) loaded. Switched to a
                   native <img> routed through heroCoverUrl (forces
                   imageproxy + size=600 hint, matching PlayerFullscreen),
                   with an @error fallback to the streamloader brand mark
                   so a single failure can't leave the hero blank, and a
                   :key tied to the URL so the img remounts cleanly when
                   the item changes (kills any stuck error state). The
                   override URL (StreamloaderEditArtworkDialog) wins over
                   the auto-detected URL when set. -->
              <img
                v-if="heroCoverUrl"
                :key="heroCoverUrl"
                :src="heroCoverUrl"
                alt=""
                class="sl-vinyl-cover-img rounded"
                style="
                  width: 100%;
                  height: 100%;
                  max-height: 256px;
                  object-fit: cover;
                  display: block;
                "
                @error="onHeroCoverError"
              />
              <MediaItemThumb
                v-else
                :item="item"
                size="calc(100%)"
                style="max-height: 256px"
              />
            </div>
          </div>
          <div v-else :class="{ 'sl-track-pulse': showPulse }">
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
          <v-card-title v-else tag="h1" class="sl-title-card">
            <div class="sl-title-row">
              <!-- Streamloader-fork addition: pulsing teal LIVE indicator
                   for radio streams. Pure presentation dot — no data
                   needed because radio is by definition a live source. -->
              <span
                v-if="item.media_type === MediaType.RADIO"
                class="sl-live-indicator"
                :title="$t('radio')"
                role="img"
                :aria-label="`${$t('radio')} — live`"
              >
                <span class="sl-live-dot" aria-hidden="true"></span>
                <span class="sl-live-label" aria-hidden="true">LIVE</span>
              </span>
              <MarqueeText :sync="marqueeSync">
                <!-- Streamloader-fork addition (batch polish): tightened
                     letter-spacing on hero title plus a small teal
                     underline bar that grows in on page enter. Pure
                     presentation — does not affect MarqueeText sizing
                     because the bar is absolutely positioned. -->
                <div class="selectable sl-hero-title">
                  {{ headerTitle }}
                  <span
                    class="sl-hero-title-underline"
                    aria-hidden="true"
                  ></span>
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
                    prettifyMediaName(artist.name)
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
                  >{{
                    prettifyMediaName(item.album.name, {
                      artist:
                        "artists" in item && item.artists?.length
                          ? item.artists[0].name
                          : undefined,
                    })
                  }}</a
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
              :prepend-icon="item.favorite ? 'mdi-check-circle' : 'mdi-rss'"
              class="sl-podcast-subscribe"
              style="margin-right: 8px; margin-bottom: 4px"
              @click="api.toggleFavorite(item)"
            >
              {{ item.favorite ? $t("subscribed") : $t("subscribe") }}
            </v-btn>

            <!-- Streamloader-fork addition (batch polish): action-button
                 cluster. Subtle bordered card groups the icon affordances
                 (favorite / provider / merge / delete / replace-artwork
                 / rescan) so they read as a single unit instead of free-
                 floating glyphs. Each child is wrapped in a uniform
                 .sl-action-btn (44×44 hit target, teal hover tint, teal
                 focus-visible ring). The provider icon stays
                 informational only — no hover state. -->
            <div
              class="sl-action-cluster"
              role="group"
              :aria-label="$t('streamloader.info_header.actions_aria_label')"
            >
              <!-- favorite (heart) icon -->
              <span
                class="sl-action-btn"
                role="button"
                tabindex="0"
                :aria-pressed="item.favorite ? 'true' : 'false'"
                :title="$t('tooltip.favorite')"
                :aria-label="$t('tooltip.favorite')"
                @click="api.toggleFavorite(item)"
                @keydown.enter.prevent="api.toggleFavorite(item)"
                @keydown.space.prevent="api.toggleFavorite(item)"
              >
                <IconHeartFilled v-if="item.favorite" :size="22" />
                <IconHeart v-else :stroke-width="2" :size="22" />
              </span>
              <!-- provider icon (informational, not interactive) -->
              <span class="sl-action-btn sl-action-btn--static">
                <provider-icon :domain="item.provider" :size="22" />
              </span>
              <!-- merge genre button (admin only) -->
              <span
                v-if="
                  item.media_type === MediaType.GENRE &&
                  item.provider === 'library' &&
                  isAdmin
                "
                class="sl-action-btn"
                role="button"
                tabindex="0"
                :title="$t('merge_into')"
                :aria-label="$t('merge_into')"
                @click="mergeGenre"
                @keydown.enter.prevent="mergeGenre"
                @keydown.space.prevent="mergeGenre"
              >
                <Merge :size="22" />
              </span>
              <!-- delete genre button (admin only) -->
              <span
                v-if="
                  item.media_type === MediaType.GENRE &&
                  item.provider === 'library' &&
                  isAdmin
                "
                class="sl-action-btn"
                role="button"
                tabindex="0"
                :title="$t('delete_genre')"
                :aria-label="$t('delete_genre')"
                @click="deleteGenre"
                @keydown.enter.prevent="deleteGenre"
                @keydown.space.prevent="deleteGenre"
              >
                <Trash2 :size="22" />
              </span>
              <!-- Streamloader-fork addition: replace-artwork affordance.
                   Shown on track / album / podcast / audiobook detail
                   pages where the auto-detected cover can be wrong (the
                   Pearl Jam "Corduroy" → Asian-2000-album bug). Hidden
                   for artists (no single "wrong cover" issue) and for
                   genres / playlists / radio (cover is user-curated or
                   intrinsic to the source). Stub UI — persists the
                   user's input to localStorage; backend endpoint pending. -->
              <span
                v-if="canEditArtwork"
                class="sl-action-btn"
                role="button"
                tabindex="0"
                :title="$t('streamloader.info_header.replace_artwork')"
                :aria-label="$t('streamloader.info_header.replace_artwork')"
                @click="openEditArtwork"
                @keydown.enter.prevent="openEditArtwork"
                @keydown.space.prevent="openEditArtwork"
              >
                <ImagePlus :size="22" />
              </span>
              <!-- Streamloader-fork addition: re-trigger upstream metadata
                   extraction. The frontend prettifier (batch 34) only
                   masks filename-bleeding bugs at display time — the real
                   fix is to re-run streamloader's metadata pipeline so the
                   cleaned name persists to the underlying record. Same
                   media-type gating as Replace artwork. Wraps MA's
                   existing `music/refresh_item` command (api.refreshItem);
                   on success we listen for the matching MEDIA_ITEM_UPDATED
                   WebSocket event and surface a "complete" toast. -->
              <v-tooltip v-if="canEditArtwork" location="bottom">
                <template #activator="{ props: tooltipProps }">
                  <span
                    v-bind="tooltipProps"
                    class="sl-action-btn sl-rescan-btn"
                    :class="{
                      'sl-action-btn--disabled':
                        rescanInFlight || rescanCooldownActive,
                    }"
                    role="button"
                    tabindex="0"
                    :aria-label="$t('streamloader.info_header.rescan_metadata')"
                    @click="triggerRescanMetadata"
                    @keydown.enter.prevent="triggerRescanMetadata"
                    @keydown.space.prevent="triggerRescanMetadata"
                  >
                    <RefreshCw
                      :size="22"
                      :class="{ 'sl-rescan-spin': rescanInFlight }"
                    />
                  </span>
                </template>
                <span>{{
                  $t("streamloader.info_header.rescan_metadata")
                }}</span>
              </v-tooltip>
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
    <!-- Streamloader-fork addition: artwork-override dialog (stub UI;
         see StreamloaderEditArtworkDialog.vue header comment).
         Wrapped in error boundary — the dialog has its own form/upload
         logic that's a reasonable place for a render error to land. -->
    <StreamloaderErrorBoundary>
      <StreamloaderEditArtworkDialog
        v-if="item && canEditArtwork"
        v-model="showEditArtwork"
        :item-id="item.item_id"
      />
    </StreamloaderErrorBoundary>
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
import { prettifyMediaName } from "@/helpers/prettifyMediaName";
import {
  ContextMenuItem,
  getContextMenuItems,
} from "@/layouts/default/ItemContextMenu.vue";
import { api } from "@/plugins/api";
import type {
  Album,
  Artist,
  Audiobook,
  EventMessage,
  Genre,
  ItemMapping,
  MediaItemType,
} from "@/plugins/api/interfaces";
import {
  EventType,
  ImageType,
  MediaType,
  PlaybackState,
  Track,
} from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { useArtworkOverrideUrl } from "@/composables/useArtworkOverrides";
import { useTrackChangePulse } from "@/composables/useTrackChangePulse";
import { IconHeart, IconHeartFilled } from "@tabler/icons-vue";
import {
  ArrowLeft,
  ImagePlus,
  Merge,
  RefreshCw,
  Trash2,
} from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { toast } from "vue-sonner";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { useDisplay } from "vuetify";
import MarqueeText from "./MarqueeText.vue";
import MediaItemThumb from "./MediaItemThumb.vue";
import MenuButton from "./MenuButton.vue";
import ProviderIcon from "./ProviderIcon.vue";
import StreamloaderEditArtworkDialog from "./StreamloaderEditArtworkDialog.vue";
import StreamloaderErrorBoundary from "./StreamloaderErrorBoundary.vue";
import StreamloaderFanart from "./StreamloaderFanart.vue";
import StreamloaderSpinner from "./StreamloaderSpinner.vue";

// properties
export interface Props {
  item?: MediaItemType;
  sortBy?: string;
}
const compProps = defineProps<Props>();
const showFullInfo = ref(false);
// Streamloader-fork addition: artwork-override dialog state. See
// StreamloaderEditArtworkDialog.vue and the canEditArtwork computed below.
const showEditArtwork = ref(false);
const fanartImage = ref();
useDisplay();
const menuItems = ref<ContextMenuItem[]>([]);
const mappedGenres = ref<Genre[]>([]);

const imgGradient = new URL("../assets/info_gradient.jpg", import.meta.url)
  .href;

// Streamloader-fork addition: vinyl asset for the ALACarte-style
// album-cover hover reveal (sl-vinyl-* classes below).
const vinylSvg = new URL("../assets/vinyl.svg", import.meta.url).href;

// Streamloader-fork fix (batch MMM5): brand-mark fallback for the
// vinyl center label image when the cover thumbnail fails to load —
// matches the defensive pattern used by the fullscreen player so the
// disc never collapses to the bare black SVG (which was the symptom
// the user reported on "The Weight of the Woods").
const vinylLabelFallback = new URL(
  "../assets/streamloader-mark.svg",
  import.meta.url,
).href;
const onVinylLabelError = (evt: Event) => {
  const el = evt.target as HTMLImageElement | null;
  if (!el) return;
  if (el.src === vinylLabelFallback) return;
  el.src = vinylLabelFallback;
};

// Streamloader-fork addition: user-configurable vinyl display mode.
// Read once at component setup — FrontendConfig.vue forces a window
// reload after saving, so a snapshot is sufficient.
type VinylDisplayMode = "hover" | "always-visible" | "always-visible-spinning";
const vinylDisplayMode: VinylDisplayMode =
  (localStorage.getItem(
    "frontend.settings.vinyl_display_mode",
  ) as VinylDisplayMode | null) || "always-visible-spinning";

const vinylWrapperClasses = computed(() => ({
  "vinyl-mode--hover": vinylDisplayMode === "hover",
  "vinyl-mode--always-visible": vinylDisplayMode === "always-visible",
  "vinyl-mode--always-visible-spinning":
    vinylDisplayMode === "always-visible-spinning",
}));

// Streamloader-fork addition (batch MMM3): URL for the small album
// cover that gets printed onto the vinyl's center label. Reuses the
// existing thumb URL pipeline so it inherits the imageproxy resize +
// caching that MediaItemThumb already uses. Returns null for non-album
// items (the vinyl wrapper is gated on ALBUM at the template level,
// but the computed stays defensive).
const vinylLabelImage = computed<string | null>(() => {
  if (!compProps.item) return null;
  if (compProps.item.media_type !== MediaType.ALBUM) return null;
  return getImageThumbForItem(compProps.item, ImageType.THUMB) || null;
});

// Streamloader-fork fix (batch 32 pattern, applied to InfoHeader album
// hero): user-applied artwork override (StreamloaderEditArtworkDialog →
// useArtworkOverrides). Keyed by the displayed item's item_id; reactive
// so the hero cover swaps instantly the moment the user clicks Apply in
// the dialog.
const heroOverrideUrl = useArtworkOverrideUrl(
  () => compProps.item?.item_id,
);

// Streamloader-fork fix (batch 32 pattern, applied to InfoHeader album
// hero): defensively route the album-hero cover through imageproxy with
// a generous size hint, matching the queue-thumb path that works (and
// PlayerFullscreen's largeCoverUrl). Some providers return a raw image
// URL that 404s at full resolution while the imageproxy-resized variant
// succeeds — that asymmetry was making the hero blank on
// /album/<id> pages while the queue rows for the SAME album rendered
// fine. Override wins over the auto-detected URL when present; data:
// URLs and explicit overrides bypass imageproxy.
const heroCoverUrl = computed<string>(() => {
  if (heroOverrideUrl.value) return heroOverrideUrl.value;
  const item = compProps.item;
  if (!item || item.media_type !== MediaType.ALBUM) return "";
  const raw = getImageThumbForItem(item, ImageType.THUMB);
  if (!raw) return "";
  if (raw.startsWith("data:image")) return raw;
  // Force imageproxy with a generous size; the proxy handles smaller
  // upstream images gracefully.
  const enc = encodeURIComponent(encodeURIComponent(raw));
  return `${api.baseUrl}/imageproxy?path=${enc}&size=600`;
});

// Swap to the streamloader brand mark on a single image error so the
// hero never renders blank. The :key on the <img> remounts the element
// on every URL change, so a previous item's error state can't bleed
// into the next item.
const onHeroCoverError = (evt: Event) => {
  const el = evt.target as HTMLImageElement | null;
  if (!el) return;
  if (el.src === vinylLabelFallback) return; // already on fallback
  el.src = vinylLabelFallback;
};

// Spin only in always-visible-spinning mode AND when the active player
// is actually playing. Falls back to "spin" when no active player so
// the album-detail preview doesn't sit frozen at first paint.
const vinylShouldSpin = computed(() => {
  if (vinylDisplayMode !== "always-visible-spinning") return false;
  const ps = store.activePlayer?.playback_state;
  if (ps === undefined) return true;
  return ps === PlaybackState.PLAYING;
});

// Streamloader-fork addition (batch AAA5): pulse the displayed cover
// when the now-playing track changes — but ONLY if the displayed item
// is the now-playing item (album/artist/track URI match against the
// current queue item). Stops the InfoHeader from twitching every time
// a NEW track starts on an unrelated detail page the user is viewing.
const { pulseActive: trackChangePulse } = useTrackChangePulse();
const showPulse = computed(() => {
  if (!trackChangePulse.value) return false;
  const item = compProps.item;
  if (!item) return false;
  const playing = store.curQueueItem?.media_item;
  if (!playing) return false;
  // Direct URI match (track-on-track, album-on-album, etc.)
  if ("uri" in item && item.uri && "uri" in playing && item.uri === playing.uri)
    return true;
  // Album page: the queue item is a TRACK whose album.item_id matches.
  if (
    item.media_type === MediaType.ALBUM &&
    "album" in playing &&
    playing.album &&
    "item_id" in playing.album &&
    playing.album.item_id === item.item_id
  )
    return true;
  return false;
});

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
  // Streamloader-fork addition: cosmetic prettifier for filename-derived
  // names. Display-layer only — see helpers/prettifyMediaName.ts.
  const artistName =
    "artists" in compProps.item && compProps.item.artists?.length
      ? compProps.item.artists[0].name
      : undefined;
  return prettifyMediaName(compProps.item.name, { artist: artistName });
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

// Streamloader-fork addition: which detail pages get the "Replace
// artwork" affordance. Track / album / podcast / audiobook are the four
// surfaces where the auto-detected cover can be wrong (and where users
// most often notice — the Pearl Jam "Corduroy" → Asian-2000 bug came
// from the album view). Artist pages don't get it because an artist
// photo is rarely a single-source mismatch; genres / playlists / radio
// already have curated or intrinsic art.
const canEditArtwork = computed(() => {
  if (!compProps.item) return false;
  return (
    compProps.item.media_type === MediaType.TRACK ||
    compProps.item.media_type === MediaType.ALBUM ||
    compProps.item.media_type === MediaType.PODCAST ||
    compProps.item.media_type === MediaType.AUDIOBOOK
  );
});

const openEditArtwork = () => {
  if (!canEditArtwork.value) return;
  showEditArtwork.value = true;
};

// ─── Streamloader-fork addition: Rescan-metadata button ──────────────
//
// Re-triggers MA's `music/refresh_item` WebSocket command so streamloader
// re-runs its metadata extraction pipeline against the original source
// (the real fix for the filename-bleeding bugs that batch 34's frontend
// prettifier only papers over at display time).
//
// We also queue the requested item_ids in localStorage under
// `streamloader-metadata-rescan-queue` so that, if a future batch ships
// a dedicated streamloader-side rescan endpoint, we can replay the queue
// to re-extract previously-affected items in bulk.
//
// Backend endpoint pending: streamloader/rescan_metadata?item_id=...
//
// UX:
//   - Spin the lucide RefreshCw icon while the WS round-trip is in flight.
//   - 5-second debounce after a click — guards against rapid-fire users
//     and against the inevitable "I'll click it twenty times to make sure"
//     pattern.
//   - Success toast on click acknowledges the queue; a second toast fires
//     when the matching MEDIA_ITEM_UPDATED WS event arrives so the user
//     knows the backend actually completed the rescan.
const RESCAN_QUEUE_KEY = "streamloader-metadata-rescan-queue";
const RESCAN_DEBOUNCE_MS = 5000;
const rescanInFlight = ref(false);
const rescanCooldownActive = ref(false);
let rescanCooldownTimer: ReturnType<typeof setTimeout> | null = null;
let rescanPendingUri: string | null = null;
let unsubRescanWatcher: (() => void) | null = null;

const queueRescanItemId = (itemId: string) => {
  // Persist into a local queue so a future backend endpoint can replay
  // the rescan request server-side. De-dupes; survives reload.
  try {
    const raw = localStorage.getItem(RESCAN_QUEUE_KEY);
    const queue: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(queue)) {
      localStorage.setItem(RESCAN_QUEUE_KEY, JSON.stringify([itemId]));
      return;
    }
    if (!queue.includes(itemId)) queue.push(itemId);
    localStorage.setItem(RESCAN_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Quota exceeded / disabled storage → silently ignore; the live
    // refresh still happens via the WS command.
  }
};

const triggerRescanMetadata = async () => {
  if (!compProps.item) return;
  if (!canEditArtwork.value) return;
  if (rescanInFlight.value || rescanCooldownActive.value) return;

  const target = compProps.item;
  const fallbackName = te("streamloader.info_header.rescan_fallback_name")
    ? t("streamloader.info_header.rescan_fallback_name")
    : "this item";
  const displayName = headerTitle.value || target.name || fallbackName;
  rescanInFlight.value = true;
  rescanCooldownActive.value = true;
  rescanPendingUri = target.uri;
  queueRescanItemId(target.item_id);

  toast.info(
    t("streamloader.info_header.rescan_in_progress", { name: displayName }),
  );

  try {
    const updated = await api.refreshItem(target);
    // Mirror ItemContextMenu's "refresh_item" flow so the rest of the UI
    // (track listings under albums, etc.) re-renders off the same WS
    // signal pattern even when MA's backend doesn't broadcast on its own.
    if (updated) {
      api.signalEvent({
        event: EventType.MEDIA_ITEM_UPDATED,
        object_id: updated.uri,
        data: updated,
      });
    }
  } catch (err) {
    toast.error(
      t("streamloader.info_header.rescan_failed", { name: displayName }),
    );
    // eslint-disable-next-line no-console
    console.warn("[streamloader] rescan_metadata error", err);
    rescanPendingUri = null;
  } finally {
    rescanInFlight.value = false;
    if (rescanCooldownTimer) clearTimeout(rescanCooldownTimer);
    rescanCooldownTimer = setTimeout(() => {
      rescanCooldownActive.value = false;
      rescanCooldownTimer = null;
    }, RESCAN_DEBOUNCE_MS);
  }
};

onMounted(() => {
  // Watch for the matching MEDIA_ITEM_UPDATED so we can confirm the
  // rescan landed. Filter by uri set when the user clicked Rescan;
  // ignore the unrelated UPDATED events that fly past constantly.
  unsubRescanWatcher = api.subscribe(
    EventType.MEDIA_ITEM_UPDATED,
    (evt: EventMessage) => {
      if (!rescanPendingUri) return;
      const updated = evt.data as MediaItemType | undefined;
      if (!updated) return;
      if (updated.uri !== rescanPendingUri) return;
      const fallbackName = te("streamloader.info_header.rescan_fallback_name")
        ? t("streamloader.info_header.rescan_fallback_name")
        : "this item";
      const displayName = updated.name || fallbackName;
      toast.success(
        t("streamloader.info_header.rescan_complete", { name: displayName }),
      );
      rescanPendingUri = null;
    },
  );
});

onBeforeUnmount(() => {
  if (unsubRescanWatcher) unsubRescanWatcher();
  if (rescanCooldownTimer) clearTimeout(rescanCooldownTimer);
});

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
/* Branded loading state for the InfoHeader card. Centered over the
   gradient background while the underlying media item is fetched. */
.sl-info-header-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  pointer-events: none;
}

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
  /* Cover sits IN FRONT of the protruded disc (LP-from-sleeve look). */
  z-index: 2;
  display: block;
}

/* Streamloader-fork fix (batch MMM4): protrude wrapper. Holds the
   disc + label + sheen in their offset position. NEVER rotates so the
   spin axis stays anchored at the disc's actual center.
   Sized 96% of cover width so it inherits the disc's aspect ratio
   and dimensions; placed at top:50% / left:0 then translated up by
   half its own height so its center aligns with the cover's vertical
   midline. The horizontal protrude offset is mode-specific below. */
.sl-vinyl-disc-protrude {
  position: absolute;
  top: 50%;
  left: 0;
  width: 96%;
  aspect-ratio: 1 / 1;
  /* Resting (legacy hover-mode) pose: tucked behind cover, slightly
     offset to convey the sleeved-LP look even before the user hovers. */
  transform: translate(0, -50%);
  transform-origin: center center;
  transition: transform 700ms cubic-bezier(0.34, 1.36, 0.64, 1);
  z-index: 1;
  pointer-events: none;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.45));
}

/* Streamloader-fork fix (batch MMM4): spin wrapper. Sits inside the
   protrude wrapper at full size, so its own center IS the disc's
   center (no translate of its own). transform-origin: center center
   means the rotation is around that disc center — spin in place. */
.sl-vinyl-disc-spin {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: center center;
}

.sl-vinyl-disc {
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

/* Mode 1 (default for legacy): hover-only reveal. */
.sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-protrude {
  /* Peek out 50% of the disc width to the right past the cover edge
     (batch MMM6: bumped 40% → 50% — at 40% the disc was barely poking
     out behind the fixed sheen on darker covers). translate on the
     protrude wrapper preserves the spin axis at the disc's true center. */
  transform: translate(50%, -50%);
}
.sl-vinyl-wrapper.vinyl-mode--hover:hover {
  transform: rotate(-3deg) scale(1.03);
}

/* Mode 2 + 3: vinyl always peeks out — 50% of the disc width is
   visible past the cover's right edge (batch MMM6: bumped from 40%). */
.sl-vinyl-wrapper.vinyl-mode--always-visible .sl-vinyl-disc-protrude,
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning .sl-vinyl-disc-protrude {
  transform: translate(50%, -50%);
}

/* Streamloader-fork addition (batch MMM6): hover ALSO pops the disc
   further out in the always-visible modes. User reported the hover
   pop-out wasn't working — that's because the original hover rule
   only targeted vinyl-mode--hover. With always-visible-spinning being
   the default, the rule never fired. Push to 65% on hover so there's
   visible feedback regardless of which display mode is active. */
.sl-vinyl-wrapper.vinyl-mode--always-visible:hover .sl-vinyl-disc-protrude,
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning:hover
  .sl-vinyl-disc-protrude {
  transform: translate(65%, -50%);
}
.sl-vinyl-wrapper.vinyl-mode--always-visible:hover,
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning:hover {
  transform: rotate(-3deg) scale(1.03);
}

/* Mode 3: continuous spin. Streamloader-fork tweak (batch MMM6):
   6s → 5s per revolution paired with the new asymmetric edge tick on
   vinyl.svg so the rotation reads obviously at a glance. Animation
   lives on the spin wrapper (NOT the protrude wrapper) so rotation
   happens around the disc's own center. The pause class freezes the
   spin without resetting the angle. */
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning .sl-vinyl-disc-spin {
  animation: sl-vinyl-spin 5s linear infinite;
}
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning
  .sl-vinyl-disc-spin.sl-vinyl-spinning--paused {
  animation-play-state: paused;
}

/* Streamloader-fork tweak (batch MMM6): hover-mode also spins while
   the user is hovering — a stationary disc reads as "stuck" right
   after the protrude reveal. Synced to the same 5s as mode 3. */
.sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-spin {
  animation: sl-vinyl-spin 5s linear infinite;
}

@keyframes sl-vinyl-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Streamloader-fork addition (batch MMM3 / MMM4): center-label
   thumbnail. Lives INSIDE the spin wrapper, centered on the disc via
   the standard top:50%/left:50% + translate(-50%, -50%) trick. Because
   it inherits the spin wrapper's rotation, it tracks the disc with no
   additional transform math. */
.sl-vinyl-label {
  position: absolute;
  top: 50%;
  left: 50%;
  /* ~27% of the disc — covers the SVG's teal label area while leaving
     an outer teal ring visible for brand identity. */
  width: 27%;
  height: 27%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
  /* Brand-teal ring keeps streamloader identity around any cover art. */
  box-shadow:
    0 0 0 2px #2bd9ba,
    0 0 0 3px rgba(0, 0, 0, 0.45),
    inset 0 0 0 1px rgba(0, 0, 0, 0.35);
}

.sl-vinyl-label img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Streamloader-fork addition (batch MMM3): fixed sheen highlight.
   Lives in the protrude wrapper so it tracks the disc's position, but
   sits outside the spin wrapper so it does NOT rotate — sells the
   look of a physical object catching room light. */
.sl-vinyl-sheen {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
  background: radial-gradient(
    circle at 32% 28%,
    rgba(255, 255, 255, 0.18) 0%,
    rgba(255, 255, 255, 0.05) 28%,
    rgba(255, 255, 255, 0) 55%
  );
  mix-blend-mode: screen;
}

/* Streamloader-fork addition (batch AAA5): now-playing cover-art pulse
   on the InfoHeader detail page. Only fires when the displayed item IS
   the now-playing track (gated by the showPulse computed). For album
   layouts we target .sl-vinyl-cover inside the wrapper so the orbiting
   vinyl disc isn't dragged along — preserves the batch MMM4 vinyl-orbit
   fix. For artist (v-avatar) and other media types the pulse class lands
   directly on the cover container. */
.sl-vinyl-wrapper.sl-track-pulse-host .sl-vinyl-cover,
.v-avatar.sl-track-pulse,
:not(.sl-vinyl-wrapper) > .sl-track-pulse {
  animation: sl-track-pulse 420ms cubic-bezier(0.34, 1.36, 0.64, 1) both;
  transform-origin: center center;
}
@keyframes sl-track-pulse {
  0% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.05);
  }
  100% {
    transform: scale(1);
  }
}

/* Respect users who've asked the OS to reduce motion. */
@media (prefers-reduced-motion: reduce) {
  .sl-vinyl-wrapper.vinyl-mode--always-visible-spinning .sl-vinyl-disc-spin,
  .sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-spin {
    animation: none;
  }
  .sl-vinyl-wrapper.sl-track-pulse-host .sl-vinyl-cover,
  .v-avatar.sl-track-pulse,
  :not(.sl-vinyl-wrapper) > .sl-track-pulse {
    animation: none;
  }
}

/* Touch devices: disable the hover-mode reveal entirely. The reveal is
   a desktop-mouse affordance; on a phone the user's finger drag would
   either always-trigger or never-trigger it depending on browser, and
   neither adds anything. Always-visible modes are unaffected. */
@media (hover: none) {
  .sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-protrude {
    transform: translate(0, -50%);
  }
  .sl-vinyl-wrapper.vinyl-mode--hover:hover {
    transform: none;
  }
  /* Streamloader-fork addition (batch MMM6): also neutralize the new
     hover-pop boost on always-visible modes so a tap doesn't leave the
     disc stuck in the popped-out pose on mobile Safari (which can
     trigger a sticky :hover after tap). Falls back to the mobile 22%
     base translate to preserve the layout-safe protrude. */
  .sl-vinyl-wrapper.vinyl-mode--always-visible:hover .sl-vinyl-disc-protrude,
  .sl-vinyl-wrapper.vinyl-mode--always-visible-spinning:hover
    .sl-vinyl-disc-protrude {
    transform: translate(22%, -50%);
  }
  .sl-vinyl-wrapper.vinyl-mode--always-visible:hover,
  .sl-vinyl-wrapper.vinyl-mode--always-visible-spinning:hover {
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

/* ─── Streamloader-fork addition: rescan-metadata icon button.
       Inline-flex wrapper keeps the lucide RefreshCw icon visually
       aligned with the sibling ImagePlus / Heart icons (which all live
       in the same `flex items-center gap-2` row). The wrapper, not the
       SVG itself, is the click target so keyboard focus + tooltip
       binding stay consistent with the other icon-buttons in this row. */
.sl-rescan-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  color: inherit;
  border-radius: 4px;
}

.sl-rescan-btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

.sl-rescan-btn--disabled {
  opacity: 0.5;
  cursor: progress;
}

/* Spin while a rescan WS round-trip is in flight. Pure CSS keeps the
   feedback snappy without coupling to any animation library. */
.sl-rescan-spin {
  animation: sl-rescan-spin 900ms linear infinite;
}

@keyframes sl-rescan-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-rescan-spin {
    animation: none;
  }
}

/* ─── Streamloader-fork addition (batch polish): hero vignette.
       Subtle teal radial gradients in the four corners of the hero
       card focus attention on cover + title. Sits above the fanart
       wash but below the toolbar/content. */
.sl-hero-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(45, 212, 191, 0.18) 0%,
      rgba(45, 212, 191, 0) 28%
    ),
    radial-gradient(
      circle at 100% 0%,
      rgba(45, 212, 191, 0.14) 0%,
      rgba(45, 212, 191, 0) 28%
    ),
    radial-gradient(
      circle at 0% 100%,
      rgba(45, 212, 191, 0.14) 0%,
      rgba(45, 212, 191, 0) 30%
    ),
    radial-gradient(
      circle at 100% 100%,
      rgba(45, 212, 191, 0.18) 0%,
      rgba(45, 212, 191, 0) 30%
    );
  mix-blend-mode: screen;
}

:global(.v-theme--light) .sl-hero-vignette {
  background:
    radial-gradient(
      circle at 0% 0%,
      rgba(15, 118, 110, 0.12) 0%,
      rgba(15, 118, 110, 0) 28%
    ),
    radial-gradient(
      circle at 100% 0%,
      rgba(15, 118, 110, 0.09) 0%,
      rgba(15, 118, 110, 0) 28%
    ),
    radial-gradient(
      circle at 0% 100%,
      rgba(15, 118, 110, 0.09) 0%,
      rgba(15, 118, 110, 0) 30%
    ),
    radial-gradient(
      circle at 100% 100%,
      rgba(15, 118, 110, 0.12) 0%,
      rgba(15, 118, 110, 0) 30%
    );
  mix-blend-mode: multiply;
}

/* ─── Streamloader-fork addition (batch polish): hero title typography.
       Tighter letter-spacing for a more confident feel; wrapper hosts
       the animated teal underline that grows in on page enter. */
.sl-title-card {
  padding-bottom: 4px;
}

.sl-hero-title {
  position: relative;
  letter-spacing: -0.015em;
  font-feature-settings:
    "kern" 1,
    "liga" 1;
  padding-bottom: 4px;
}

.sl-hero-title-underline {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 2px;
  width: 0;
  border-radius: 2px;
  background: linear-gradient(90deg, #2dd4bf 0%, rgba(45, 212, 191, 0) 100%);
  animation: sl-hero-underline-grow 720ms cubic-bezier(0.22, 1, 0.36, 1) 180ms
    forwards;
}

:global(.v-theme--light) .sl-hero-title-underline {
  background: linear-gradient(90deg, #0f766e 0%, rgba(15, 118, 110, 0) 100%);
}

@keyframes sl-hero-underline-grow {
  from {
    width: 0;
    opacity: 0;
  }
  to {
    width: 56px;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sl-hero-title-underline {
    animation: none;
    width: 56px;
    opacity: 1;
  }
}

/* ─── Streamloader-fork addition (batch polish): action button cluster.
       Groups favorite / provider / merge / delete / replace-artwork /
       rescan into a subtly bordered card so they read as a unit. Each
       button is a uniform 44×44 hit target with teal hover tint and
       teal focus-visible ring. Provider icon is non-interactive
       (sl-action-btn--static) so it doesn't get the hover affordance. */
.sl-action-cluster {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(45, 212, 191, 0.04);
  border: 1px solid rgba(45, 212, 191, 0.16);
  backdrop-filter: blur(2px);
}

:global(.v-theme--light) .sl-action-cluster {
  background: rgba(15, 118, 110, 0.05);
  border-color: rgba(15, 118, 110, 0.18);
}

.sl-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  cursor: pointer;
  color: inherit;
  line-height: 0;
  transition:
    background-color 160ms ease-out,
    transform 160ms ease-out;
  user-select: none;
}

.sl-action-btn:hover {
  background: rgba(45, 212, 191, 0.18);
}

.sl-action-btn:active {
  transform: scale(0.94);
}

.sl-action-btn:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
}

:global(.v-theme--light) .sl-action-btn:hover {
  background: rgba(15, 118, 110, 0.14);
}

:global(.v-theme--light) .sl-action-btn:focus-visible {
  outline-color: #0f766e;
}

.sl-action-btn--static {
  cursor: default;
}

.sl-action-btn--static:hover {
  background: transparent;
}

.sl-action-btn--disabled {
  opacity: 0.5;
  cursor: progress;
  pointer-events: none;
}

/* Mobile: keep 44×44 for touch but tighten cluster spacing. */
@media (max-width: 600px) {
  .sl-action-cluster {
    gap: 2px;
    padding: 3px;
  }
}

/* ─── Streamloader-fork addition (batch polish): cover hover lift.
       Subtle translateY with a tiny overshoot — only on non-touch and
       non-reduced-motion. Album cover gets it via .sl-vinyl-cover; the
       wrapper itself doesn't lift (its hover transform is the rotate-
       and-scale tilt — see .sl-vinyl-wrapper.vinyl-mode--hover). */
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .sl-vinyl-cover {
    transition: transform 320ms cubic-bezier(0.34, 1.36, 0.64, 1);
  }
  .sl-vinyl-wrapper:hover .sl-vinyl-cover {
    transform: translateY(-2px);
  }
}

/* ─── Streamloader-fork addition (batch polish): vinyl mobile orbit.
       At very narrow viewports the disc's 40% protrude can clip the
       page edge or push the title column off-screen. Drop the protrude
       to 22% on mobile so the spin-in-place still reads but doesn't
       break layout. Preserves the spin-axis fix (translate is on the
       protrude wrapper, rotate is on the inner spin wrapper — see
       batch MMM4 comments above). */
@media (max-width: 600px) {
  .sl-vinyl-wrapper.vinyl-mode--always-visible .sl-vinyl-disc-protrude,
  .sl-vinyl-wrapper.vinyl-mode--always-visible-spinning
    .sl-vinyl-disc-protrude {
    transform: translate(22%, -50%);
  }
  .sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-protrude {
    transform: translate(22%, -50%);
  }
}
</style>
