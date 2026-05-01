<template>
  <v-dialog
    v-model="store.showFullscreenPlayer"
    fullscreen
    :scrim="false"
    transition="dialog-bottom-transition"
    z-index="9000"
    :retain-focus="false"
    persistent
  >
    <v-card
      class="fullscreen-player-card"
      :style="{ background: backgroundColor }"
    >
      <v-toolbar class="v-toolbar-default" color="transparent">
        <template #prepend>
          <Button
            icon
            :title="fullscreenCloseTooltip"
            :aria-label="fullscreenCloseTooltip"
            :aria-keyshortcuts="fullscreenShortcutKey || undefined"
            @click="store.showFullscreenPlayer = false"
          >
            <v-icon icon="mdi-chevron-down" />
          </Button>
        </template>
        <template #append>
          <v-menu v-if="store.activePlayerQueue?.radio_source.length" scrim>
            <template #activator="{ props }">
              <Button v-bind="props" icon>
                <v-icon color="accent" icon="mdi-radio-tower" />
              </Button>
            </template>

            <v-card
              :title="$t('queue_radio_enabled')"
              :subtitle="$t('queue_radio_based_on')"
            >
              <template #text>
                <div
                  v-for="source in store.activePlayerQueue?.radio_source"
                  :key="source.uri"
                >
                  <a @click="itemClick(source)">{{ source.name }}</a>
                </div>
              </template>
            </v-card>
          </v-menu>

          <SpeakerBtn
            v-if="!showExpandedPlayerSelectButton"
            @click="
              () => {
                store.showFullscreenPlayer = false;
              }
            "
          />

          <Button icon @click.stop="openQueueMenu">
            <v-icon icon="mdi-dots-vertical" />
          </Button>
        </template>
      </v-toolbar>

      <!-- content -->
      <div class="main">
        <!-- left column: media thumb + details-->
        <div
          v-if="getBreakpointValue('bp7') || !store.showQueueItems"
          class="main-media-details"
        >
          <div
            v-if="$vuetify.display.height > 600"
            class="main-media-details-image"
          >
            <!-- current media image -->
            <!-- Streamloader-fork addition: wrap the now-playing cover in a
                 vinyl-emerging-from-cover hover effect, mirroring the
                 InfoHeader.vue ALACarte pattern. Applied unconditionally on
                 the fullscreen "now playing" view because in this context
                 the user IS playing an album track regardless of the
                 reported media_type, and the vinyl is iconic of that act.
                 Touch-suppression handled in the scoped CSS below. -->
            <div
              v-if="store.activePlayer?.powered != false && largeCoverUrl"
              class="sl-vinyl-wrapper"
              :class="vinylWrapperClasses"
            >
              <!-- Streamloader-fork fix (batch MMM4): split protrude
                   translate from spin rotate onto separate wrappers.
                   See InfoHeader.vue for the full rationale — the
                   combined translate+rotate on a single element rotated
                   around the box's pre-translate center, making the
                   disc orbit the cover instead of spinning in place. -->
              <div class="sl-vinyl-disc-protrude" aria-hidden="true">
                <div
                  class="sl-vinyl-disc-spin"
                  :class="{ 'sl-vinyl-spinning--paused': !vinylShouldSpin }"
                >
                  <img :src="vinylSvg" alt="" class="sl-vinyl-disc" />
                  <!-- Streamloader-fork addition (batch MMM3 / MMM4):
                       cover thumb printed onto the vinyl center label;
                       inherits the spin wrapper's rotation. -->
                  <div v-if="largeCoverUrl" class="sl-vinyl-label">
                    <img
                      :src="largeCoverUrl"
                      alt=""
                      @error="onLargeCoverError"
                    />
                  </div>
                </div>
                <!-- Streamloader-fork addition (batch MMM3): fixed
                     sheen highlight — outside the spin wrapper so it
                     does NOT rotate. -->
                <div class="sl-vinyl-sheen"></div>
              </div>
              <div
                class="sl-vinyl-cover"
                :class="{ 'sl-track-pulse': pulseActive }"
              >
                <!-- Streamloader-fork fix (batch JJJ3): the large vinyl-overlay
                     cover used <v-img :src=getMediaImageUrl(image_url)>, which
                     returned the raw provider URL as-is unless there was a
                     http→https protocol mismatch. For some tracks that raw
                     URL 404s while the imageproxy-resized variant (used by
                     the queue thumb via getImageThumbForItem) succeeds — so
                     the queue thumbnail loaded but the big cover was blank.
                     Switched to a real <img> routed through largeCoverUrl
                     (forces imageproxy + size hint), with an @error fallback
                     to the streamloader mark so a single failure can't leave
                     the hero blank, and a :key tied to the image URL so the
                     img remounts cleanly on track change (kills any stuck
                     error state from the previous track). -->
                <img
                  :key="largeCoverUrl"
                  :src="largeCoverUrl"
                  alt=""
                  class="sl-vinyl-cover-img"
                  @error="onLargeCoverError"
                />
              </div>
            </div>
            <!-- fallback: display player icon in box -->
            <div v-else class="icon-thumb-large">
              <v-icon
                size="128"
                :icon="
                  store.activePlayer?.type == PlayerType.PLAYER &&
                  store.activePlayer?.group_members.length
                    ? 'mdi-speaker-multiple'
                    : store.activePlayer?.icon || 'mdi-speaker'
                "
              />
            </div>
          </div>
          <div class="main-media-details-track-info">
            <!-- player name as title if its powered off-->
            <v-card-title
              v-if="store.activePlayer?.powered == false"
              :style="`font-size: ${titleFontSize};`"
            >
              {{ store.activePlayer?.name }}
            </v-card-title>
            <!-- current media title -->
            <v-card-title
              v-else-if="store.activePlayer?.current_media?.title"
              :style="`font-size: ${titleFontSize};cursor:pointer;`"
              @click="onTitleClick"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{
                  prettifyMediaName(store.activePlayer.current_media.title, {
                    artist: store.activePlayer.current_media.artist,
                  })
                }}
              </MarqueeText>
            </v-card-title>
            <!-- no player selected message -->
            <v-card-title
              v-else
              :style="`font-size: ${titleFontSize};cursor:pointer;`"
              @click="store.showPlayersMenu = true"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{ store.activePlayer?.name || $t("no_player") }}
              </MarqueeText>
            </v-card-title>

            <!-- SUBTITLE -->

            <!-- SUBTITLE: player powered off -->
            <v-card-subtitle
              v-if="store.activePlayer?.powered == false"
              class="text-h6 text-md-h5 text-lg-h4"
            >
              {{ $t("off") }}
            </v-card-subtitle>

            <!-- subtitle: album -->
            <v-card-subtitle
              v-else-if="
                store.activePlayer?.current_media?.album && showAlbumSubtitle
              "
              :style="`font-size: ${subTitleFontSize};cursor:pointer;`"
              @click="onAlbumClick"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{
                  prettifyMediaName(store.activePlayer.current_media.album, {
                    artist: store.activePlayer.current_media.artist,
                  })
                }}
              </MarqueeText>
            </v-card-subtitle>

            <!-- subtitle: artist -->
            <v-card-subtitle
              v-if="store.activePlayer?.current_media?.artist"
              :style="`font-size: ${subTitleFontSize};cursor:pointer;`"
              @click="onArtistClick"
            >
              <MarqueeText :sync="playerMarqueeSync">
                {{ prettifyMediaName(store.activePlayer.current_media.artist) }}
              </MarqueeText>
            </v-card-subtitle>

            <!-- subtitle: queue empty or other source active -->
            <!-- 3rd party source active -->
            <v-card-subtitle
              v-if="
                !store.activePlayerQueue && store.activePlayer?.active_source
              "
              class="caption"
            >
              {{
                $t("external_source_active", [
                  getSourceName(store.activePlayer),
                ])
              }}
            </v-card-subtitle>
            <v-card-subtitle
              v-else-if="
                store.activePlayerQueue && store.activePlayerQueue.items == 0
              "
              class="caption"
            >
              {{ $t("queue_empty") }}
            </v-card-subtitle>

            <!-- streamdetails/contenttype button-->
            <div
              v-if="
                store.activePlayer?.powered != false &&
                store.curQueueItem?.streamdetails
              "
              style="padding-top: min(10px, 1vh)"
            >
              <QualityDetailsBtn />
            </div>
          </div>
        </div>

        <!-- right column: queue items-->
        <div
          v-if="store.showQueueItems && store.activePlayerQueue"
          class="main-queue-items"
        >
          <v-tabs
            v-model="activeQueuePanel"
            hide-slider
            density="compact"
            @click="activeQueuePanelClick"
          >
            <v-tab :value="0">
              {{ $t("queue") }}
              <v-badge
                color="grey"
                :content="
                  (store.activePlayerQueue?.items || 0) -
                  (store.activePlayerQueue?.current_index || 0)
                "
                inline
              />
            </v-tab>
            <v-tab :value="1">
              {{ $t("played") }}
              <v-badge
                color="grey"
                :content="store.activePlayerQueue?.current_index"
                inline
              />
            </v-tab>
            <v-tab v-if="hasLyrics" :value="2">
              {{ $t("lyrics") }}
            </v-tab>
          </v-tabs>
          <div
            class="queue-items-scroll-box"
            :style="`--queue-title-size: ${queueTitleFontSize}; --queue-subtitle-size: ${queueSubtitleFontSize};`"
          >
            <v-virtual-scroll
              v-if="!tempHide && activeQueuePanel !== 2"
              ref="virtualScrollRef"
              :item-height="70"
              height="100%"
              :items="activeQueuePanel == 0 ? nextItems : previousItems"
              @scroll="onQueueScroll"
            >
              <template #default="{ item, index }">
                <ListItem
                  link
                  :show-menu-btn="true"
                  :disabled="!item.available"
                  @click.stop="(e: Event) => openQueueItemMenu(e, item)"
                  @menu.stop="(e: Event) => openQueueItemMenu(e, item)"
                  @mouseenter="hoveredQueueIndex = index"
                  @mouseleave="hoveredQueueIndex = -1"
                >
                  <template #prepend>
                    <div class="media-thumb listitem-media-thumb">
                      <MediaItemThumb size="50" :item="item" />
                    </div>
                  </template>
                  <template #title>
                    <div class="title-row">
                      <!-- only scroll the currently playing track, or when hovered with a separate sync group -->
                      <MarqueeText
                        :sync="
                          index == 0 && activeQueuePanel == 0
                            ? playerMarqueeSync
                            : hoveredMarqueeSync
                        "
                        :disabled="
                          !(
                            (index == 0 && activeQueuePanel == 0) ||
                            hoveredQueueIndex == index
                          )
                        "
                      >
                        <span
                          :class="{
                            'is-playing':
                              item.queue_item_id ===
                              store.curQueueItem?.queue_item_id,
                          }"
                        >
                          {{
                            prettifyMediaName(item.name, {
                              artist:
                                item.media_item &&
                                "artists" in item.media_item &&
                                item.media_item.artists?.length
                                  ? item.media_item.artists[0].name
                                  : undefined,
                            })
                          }}
                        </span>
                      </MarqueeText>
                    </div>
                  </template>
                  <template #subtitle>
                    <div class="d-flex">
                      <span style="white-space: nowrap" class="pr-1">
                        {{ formatDuration(item.duration) }} |
                      </span>
                      <MarqueeText
                        :sync="
                          index == 0 && activeQueuePanel == 0
                            ? playerMarqueeSync
                            : hoveredMarqueeSync
                        "
                        :disabled="
                          !(
                            (index == 0 && activeQueuePanel == 0) ||
                            hoveredQueueIndex == index
                          )
                        "
                      >
                        <span
                          v-if="
                            item.media_item &&
                            'album' in item.media_item &&
                            item.media_item.album
                          "
                        >
                          {{
                            prettifyMediaName(item.media_item.album.name, {
                              artist:
                                "artists" in item.media_item &&
                                item.media_item.artists?.length
                                  ? item.media_item.artists[0].name
                                  : undefined,
                            })
                          }}
                        </span>
                      </MarqueeText>
                    </div>
                  </template>
                  <template #append>
                    <!-- Streamloader source badge: tracks only, compact dot
                         to keep the dense queue row quiet. Same gating as
                         ListviewItem (media_type TRACK + has provider_mappings).
                         Sits left of the existing badges so the now-playing
                         badge keeps its rightmost prominence. -->
                    <StreamloaderSourceBadge
                      v-if="
                        item.media_item &&
                        item.media_item.media_type === MediaType.TRACK &&
                        'provider_mappings' in item.media_item &&
                        item.media_item.provider_mappings?.length
                      "
                      :item="item.media_item"
                      compact
                      class="queue-source-badge"
                    />
                    <PartyRequestBadge
                      v-if="item.extra_attributes?.party_guest === true"
                      :type="
                        item.extra_attributes?.party_boosted === true
                          ? 'boost'
                          : 'request'
                      "
                      :badge-color="
                        item.extra_attributes?.party_boosted === true
                          ? boostBadgeColor
                          : requestBadgeColor
                      "
                    />
                    <NowPlayingBadge
                      v-if="
                        item.queue_item_id ===
                          store.curQueueItem?.queue_item_id &&
                        store.activePlayer?.playback_state != PlaybackState.IDLE
                      "
                      :show-badge="getBreakpointValue('bp4')"
                    />
                    <v-icon v-if="!item.available">mdi-alert</v-icon>
                  </template>
                </ListItem>
                <!-- Show chapters -->
                <div
                  v-if="
                    item.queue_item_id == store.curQueueItem?.queue_item_id &&
                    item.media_item?.metadata?.chapters?.length
                  "
                  style="margin-left: 50px"
                >
                  <v-list-item
                    v-for="chapter in item.media_item.metadata?.chapters"
                    :key="chapter.position"
                    @click.stop="chapterClicked(item.media_item, chapter)"
                  >
                    <template #title>
                      <div>{{ chapter.name }}</div>
                    </template>
                    <template #append>
                      <span v-if="chapter.end" class="text-caption"
                        >{{ formatDuration(chapter.end - chapter.start) }}
                      </span>
                    </template>
                  </v-list-item>
                </div>
              </template>
            </v-virtual-scroll>
            <!-- Lyrics view -->
            <div v-if="activeQueuePanel === 2" class="lyrics-wrapper">
              <LyricsViewer
                :media-item="store.curQueueItem?.media_item"
                :position="lyricsElapsedTime"
                :stream-details="store.curQueueItem?.streamdetails"
                :text-color="sliderColor"
                :lyrics="currentLyrics.plain"
                :lrc-lyrics="currentLyrics.synced"
              />
            </div>
          </div>
        </div>

        <!-- right column: media image (on small but wide screens)-->
        <div
          v-if="!store.showQueueItems && $vuetify.display.height <= 600"
          class="main-queue-items"
        >
          <div class="main-media-details-image main-media-details-image-alt">
            <!-- Streamloader-fork addition: same vinyl-cover hover reveal
                 as the primary media-image position above. -->
            <div
              v-if="largeCoverUrl"
              class="sl-vinyl-wrapper"
              :class="vinylWrapperClasses"
            >
              <!-- Streamloader-fork fix (batch MMM4): same split-wrapper
                   structure as the primary cover position above. -->
              <div class="sl-vinyl-disc-protrude" aria-hidden="true">
                <div
                  class="sl-vinyl-disc-spin"
                  :class="{ 'sl-vinyl-spinning--paused': !vinylShouldSpin }"
                >
                  <img :src="vinylSvg" alt="" class="sl-vinyl-disc" />
                  <div v-if="largeCoverUrl" class="sl-vinyl-label">
                    <img
                      :src="largeCoverUrl"
                      alt=""
                      @error="onLargeCoverError"
                    />
                  </div>
                </div>
                <div class="sl-vinyl-sheen"></div>
              </div>
              <div
                class="sl-vinyl-cover"
                :class="{ 'sl-track-pulse': pulseActive }"
              >
                <!-- Streamloader-fork fix (batch JJJ3): see matching block
                     above for the rationale. Same fix mirrored here for the
                     short-screen alt cover position. -->
                <img
                  :key="largeCoverUrl"
                  :src="largeCoverUrl"
                  alt=""
                  class="sl-vinyl-cover-img"
                  @error="onLargeCoverError"
                />
              </div>
            </div>
            <!-- fallback: display player icon in box -->
            <div v-else class="icon-thumb-large">
              <v-icon
                size="128"
                :icon="
                  store.activePlayer?.type == PlayerType.PLAYER &&
                  store.activePlayer?.group_members.length
                    ? 'mdi-speaker-multiple'
                    : store.activePlayer?.icon || 'mdi-speaker'
                "
              />
            </div>
          </div>
        </div>
      </div>

      <!-- player controls (always at bottom)-->
      <div class="player-bottom">
        <!-- timeline / progressbar-->
        <div class="row" style="margin-left: 5%; margin-right: 5%">
          <PlayerTimeline :show-labels="true" :color="sliderColor" />
        </div>

        <!-- main media control buttons (play, next, previous etc.)-->
        <div class="media-controls">
          <Icon
            v-if="store.activePlayerQueue"
            :disabled="!store.curQueueItem?.media_item"
            :title="$t('tooltip.favorite')"
            variant="button"
            class="media-controls-item"
            max-height="30px"
            @click="onHeartBtnClick"
          >
            <Heart
              :size="18"
              :fill="
                store.curQueueItem?.media_item?.favorite
                  ? 'currentColor'
                  : 'none'
              "
            />
          </Icon>
          <ShuffleBtn
            v-if="$vuetify.display.mdAndUp"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="30px"
          />
          <PreviousBtn
            :player="store.activePlayer"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="45px"
            :size="28"
          />
          <div class="play-btn-wrapper" :style="playBtnStyle">
            <PlayBtn
              :player="store.activePlayer"
              :player-queue="store.activePlayerQueue"
              class="media-controls-item"
              :icon="{ staticWidth: '60px', staticHeight: '60px' }"
              :spinner-size="73"
              :size="30"
              :play-offset="2"
            />
          </div>
          <NextBtn
            :player="store.activePlayer"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="45px"
            :size="28"
          />
          <RepeatBtn
            v-if="$vuetify.display.mdAndUp"
            :player-queue="store.activePlayerQueue"
            class="media-controls-item"
            max-height="35px"
          />
          <div class="media-controls-item queue-btn-wrapper">
            <QueueBtn
              v-if="store.activePlayerQueue"
              style="max-height: 30px; min-height: 0; min-width: 0"
              :size="18"
            />
          </div>
        </div>

        <!-- volume control -->
        <div
          v-if="store.activePlayer"
          class="row"
          style="margin-left: 5%; margin-right: 5%"
        >
          <PlayerVolume
            :player="store.activePlayer"
            width="100%"
            :color="sliderColor"
            :allow-wheel="true"
            :prefer-group-volume="true"
          />
        </div>

        <!-- player select button -->
        <div
          v-if="showExpandedPlayerSelectButton"
          class="row"
          style="
            height: 70px;
            display: flex;
            justify-content: center;
            align-items: center;
            padding-bottom: 15px;
            padding-top: 15px;
          "
        >
          <v-btn
            class="responsive-icon-holder-btn"
            variant="outlined"
            @click="
              () => {
                store.showPlayersMenu = true;
                store.showFullscreenPlayer = false;
              }
            "
          >
            <v-icon :icon="store.activePlayer?.icon || 'mdi-speaker'" />
            {{ store.activePlayer ? getPlayerName(store.activePlayer) : "" }}
          </v-btn>
        </div>
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import Button from "@/components/Button.vue";
import Icon from "@/components/Icon.vue";
import ListItem from "@/components/ListItem.vue";
import LyricsViewer from "@/components/LyricsViewer.vue";
import MarqueeText from "@/components/MarqueeText.vue";
import MediaItemThumb from "@/components/MediaItemThumb.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import PartyRequestBadge from "@/components/party/PartyRequestBadge.vue";
import QualityDetailsBtn from "@/components/QualityDetailsBtn.vue";
import StreamloaderSourceBadge from "@/components/StreamloaderSourceBadge.vue";
import { useArtworkOverrideUrl } from "@/composables/useArtworkOverrides";
import { useLyricsElapsedTime } from "@/composables/useLyricsElapsedTime";
import { usePartyConfig } from "@/composables/usePartyConfig";
import { useTrackChangePulse } from "@/composables/useTrackChangePulse";
import { getShortcutKeyFor } from "@/composables/useKeyboardShortcuts";

// Streamloader-fork: passive shortcut hint sourced from KEYBOARD_SHORTCUTS.
// The toolbar chevron-down closes the fullscreen player; F also toggles it
// from anywhere (and Esc closes it), so surface "F" as the discoverable hint.
const fullscreenShortcutKey = getShortcutKeyFor("fullscreen");
const fullscreenCloseTooltip = fullscreenShortcutKey
  ? `Close fullscreen (${fullscreenShortcutKey})`
  : "Close fullscreen";
import { MarqueeTextSync } from "@/helpers/marquee_text_sync";
import { getPlayerMenuItems } from "@/helpers/player_menu_items";
import {
  ImageColorPalette,
  formatDuration,
  getPlayerName,
  sleep,
} from "@/helpers/utils";
import { prettifyMediaName } from "@/helpers/prettifyMediaName";
import NextBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/NextBtn.vue";
import PlayBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/PlayBtn.vue";
import PreviousBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/PreviousBtn.vue";
import RepeatBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/RepeatBtn.vue";
import ShuffleBtn from "@/layouts/default/PlayerOSD/PlayerControlBtn/ShuffleBtn.vue";
import PlayerVolume from "@/layouts/default/PlayerOSD/PlayerVolume.vue";
import api from "@/plugins/api";
import { getSourceName } from "@/plugins/api/helpers";
import {
  EventMessage,
  EventType,
  MediaItemChapter,
  MediaItemType,
  MediaType,
  PlaybackState,
  PlayerQueue,
  PlayerType,
  QueueItem,
  QueueOption,
  Track,
} from "@/plugins/api/interfaces";
import { getBreakpointValue } from "@/plugins/breakpoint";
import { eventbus } from "@/plugins/eventbus";
import { $t } from "@/plugins/i18n";
import router from "@/plugins/router";
import { store } from "@/plugins/store";
import vuetify from "@/plugins/vuetify";
import Color from "color";
import { Heart } from "lucide-vue-next";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import { useDisplay } from "vuetify";
import { ContextMenuItem } from "../ItemContextMenu.vue";
import QueueBtn from "./PlayerControlBtn/QueueBtn.vue";
import SpeakerBtn from "./PlayerControlBtn/SpeakerBtn.vue";
import PlayerTimeline from "./PlayerTimeline.vue";

const { name } = useDisplay();

// Streamloader-fork addition: vinyl asset for the now-playing cover hover
// reveal (sl-vinyl-* classes in the template/style below). Mirrors the
// pattern shipped on the album-detail page in InfoHeader.vue.
const vinylSvg = new URL("@/assets/vinyl.svg", import.meta.url).href;

// Streamloader-fork addition: vinyl display mode driven by the
// "vinyl_display_mode" frontend setting (FrontendConfig.vue). Read once
// at setup — the settings page forces a window reload after saving so a
// snapshot is sufficient. Spin gates on the active player's
// PlaybackState.PLAYING so a paused queue freezes the disc.
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

const vinylShouldSpin = computed(() => {
  if (vinylDisplayMode !== "always-visible-spinning") return false;
  return store.activePlayer?.playback_state === PlaybackState.PLAYING;
});

// Streamloader-fork addition (batch AAA5): subscribe to the global
// track-change pulse so the fullscreen hero cover gets a soft scale
// pulse whenever a NEW track starts. Pulse is scoped to .sl-vinyl-cover
// (the album-art square) — the orbit/spin wrappers are NOT touched, so
// the vinyl-orbit fix from batch MMM4 is preserved.
const { pulseActive } = useTrackChangePulse();

// Streamloader-fork fix (batch JJJ3): brand-mark fallback shown if the
// large vinyl-overlay cover fails to load. Keeps the hero composition
// intact rather than collapsing to an empty box on a single 404.
const streamloaderMark = new URL(
  "@/assets/streamloader-mark.svg",
  import.meta.url,
).href;

// Streamloader-fork fix (batch JJJ3): defensively route the large cover
// through imageproxy with a size hint, matching how the queue thumbnail
// resolves its URL via getImageThumbForItem(item, THUMB, 256). Some
// providers return a raw image_url that 404s while the imageproxy-resized
// variant succeeds — that asymmetry is what made the hero cover go blank
// while the same track's queue thumb loaded fine. We deliberately do NOT
// touch the queue thumb path; this only changes the large vinyl-overlay
// resolution.
// Streamloader-fork addition (batch LLL3): user-applied artwork override
// (StreamloaderEditArtworkDialog → useArtworkOverrides). Keyed by the
// currently-playing media item's item_id; reactive so the hero cover swaps
// instantly the moment the user clicks Apply in the dialog.
const overrideUrl = useArtworkOverrideUrl(
  () => store.curQueueItem?.media_item?.item_id,
);

const largeCoverUrl = computed(() => {
  // Override wins over the auto-detected URL when present. https URLs and
  // data: URLs both render directly via <img src> — no imageproxy round-trip
  // needed (uploads are local data: URLs, pasted URLs are usually already
  // CDN-hosted artwork). If the override fails to load, onLargeCoverError
  // already swaps to the streamloader brand-mark fallback so the hero
  // never goes blank.
  if (overrideUrl.value) return overrideUrl.value;
  const raw = store.activePlayer?.current_media?.image_url;
  if (!raw) return "";
  if (raw.startsWith("data:image")) return raw;
  // Force imageproxy with a generous size; the proxy handles smaller
  // upstream images gracefully.
  const enc = encodeURIComponent(encodeURIComponent(raw));
  return `${api.baseUrl}/imageproxy?path=${enc}&size=600`;
});

// Swap to the streamloader brand mark on a single image error so the
// hero never renders blank. The :key on the <img> remounts the element
// on every URL change, so a previous track's error state can't bleed
// into the next track.
const onLargeCoverError = (evt: Event) => {
  const el = evt.target as HTMLImageElement | null;
  if (!el) return;
  if (el.src === streamloaderMark) return; // already on fallback
  el.src = streamloaderMark;
};

const MIN_HEIGHT_SHOW_FULL_DETAILS = 750;
const showAlbumSubtitle = computed(
  () => vuetify.display.height.value > MIN_HEIGHT_SHOW_FULL_DETAILS,
);

interface Props {
  colorPalette: ImageColorPalette;
}
const compProps = defineProps<Props>();

const playBtnStyle = computed(() => {
  const isDark = vuetify.theme.current.value.dark;
  const color = isDark
    ? compProps.colorPalette.darkColor
    : compProps.colorPalette.lightColor;
  if (!color) return {};
  return { "--play-icon-color": color };
});

const playerMarqueeSync = new MarqueeTextSync();
const hoveredQueueIndex = ref(-1);
const hoveredMarqueeSync = new MarqueeTextSync();

// Local refs
const queueItems = ref<QueueItem[]>([]);
const activeQueuePanel = ref(0);
const tempHide = ref(false);

// Badge colors for guest request badges (loaded from party/config)
const requestBadgeColor = ref("#2196f3");
const boostBadgeColor = ref("#ff5722");

const { elapsedTime: lyricsElapsedTime } = useLyricsElapsedTime();

// Computed properties

const nextItems = computed(() => {
  if (store.activePlayerQueue) {
    return queueItems.value.slice(store.activePlayerQueue.current_index);
  } else return [];
});
const previousItems = computed(() => {
  if (store.activePlayerQueue) {
    return queueItems.value
      .slice(0, store.activePlayerQueue.current_index)
      .reverse();
  } else return [];
});
// Local reactive state for lyrics
const currentLyrics = ref<{ plain: string | null; synced: string | null }>({
  plain: null,
  synced: null,
});

const hasLyrics = computed(() => {
  const plain = currentLyrics.value.plain;
  const synced = currentLyrics.value.synced;
  return (
    (!!plain && plain.trim().length > 0) ||
    (!!synced && synced.trim().length > 0)
  );
});

// Fetch lyrics for the current track (only when fullscreen player is open)
const fetchLyrics = async () => {
  // Clear lyrics immediately
  currentLyrics.value = { plain: null, synced: null };

  // Only fetch lyrics when fullscreen player is open
  if (!store.showFullscreenPlayer) {
    return;
  }

  const mediaItem = store.curQueueItem?.media_item;

  // Only proceed if we have a track media item
  if (!mediaItem || mediaItem.media_type !== MediaType.TRACK) {
    return;
  }

  const track = mediaItem as Track;

  // Check if lyrics are already in metadata
  const existingPlain = track.metadata?.lyrics?.trim() || null;
  const existingSynced = track.metadata?.lrc_lyrics?.trim() || null;

  if (existingPlain || existingSynced) {
    currentLyrics.value = { plain: existingPlain, synced: existingSynced };
    return;
  }

  // Fetch lyrics from API
  try {
    const [lyrics, lrcLyrics] = await api.getTrackLyrics(track);
    currentLyrics.value = { plain: lyrics, synced: lrcLyrics };

    // Also update the media item's metadata for future reference
    if (lyrics || lrcLyrics) {
      track.metadata = {
        ...track.metadata,
        ...(lyrics && { lyrics }),
        ...(lrcLyrics && { lrc_lyrics: lrcLyrics }),
      };
    }
  } catch (error) {
    console.error("Failed to fetch track lyrics:", error);
  }
};

// Watch for track changes and handle lyrics
watch(() => store.curQueueItem?.media_item?.item_id, fetchLyrics, {
  immediate: true,
});

// Also fetch lyrics when fullscreen player is opened
watch(
  () => store.showFullscreenPlayer,
  (isOpen) => {
    if (isOpen) {
      fetchLyrics();
    }
  },
);

const titleFontSize = computed(() => {
  switch (name.value) {
    case "xs":
      return "1.3em";
    case "sm":
      return "1.6em";
    case "md":
      return "1.8em";
    case "lg":
      return store.showQueueItems ? "1.7em" : "2.1em";
    case "xl":
      return store.showQueueItems ? "1.8em" : "2.3em";
    case "xxl":
      return store.showQueueItems ? "1.9em" : "2.5em";
    default:
      return "1.0em";
  }
});

const subTitleFontSize = computed(() => {
  switch (name.value) {
    case "xs":
      return "0.95em";
    case "sm":
      return "1.15em";
    case "md":
      return "1.3em";
    case "lg":
      return store.showQueueItems ? "1.2em" : "1.5em";
    case "xl":
      return store.showQueueItems ? "1.3em" : "1.65em";
    case "xxl":
      return store.showQueueItems ? "1.35em" : "1.8em";
    default:
      return "1.0em";
  }
});

const queueTitleFontSize = computed(() => {
  switch (name.value) {
    case "xs":
      return "0.875rem";
    case "sm":
      return "0.875rem";
    case "md":
      return "0.925rem";
    case "lg":
      return "0.9rem";
    case "xl":
      return "0.925rem";
    case "xxl":
      return "0.975rem";
    default:
      return "0.875rem";
  }
});

const queueSubtitleFontSize = computed(() => {
  switch (name.value) {
    case "xs":
      return "0.775rem";
    case "sm":
      return "0.775rem";
    case "md":
      return "0.8rem";
    case "lg":
      return "0.8rem";
    case "xl":
      return "0.8rem";
    case "xxl":
      return "0.85rem";
    default:
      return "0.775rem";
  }
});

const showExpandedPlayerSelectButton = computed(() => {
  return vuetify.display.height.value > MIN_HEIGHT_SHOW_FULL_DETAILS;
});

// methods

const itemClick = function (item: MediaItemType) {
  // mediaItem in the list is clicked
  store.showFullscreenPlayer = false;
  router.push({
    name: item.media_type,
    params: {
      itemId: item.item_id,
      provider: item.provider,
    },
  });
};

// Helper to parse a Music Assistant URI
// Supports both formats:
// - MA style: <provider>://<mediaType>/<itemId>
// - Spotify style: <provider>:<mediaType>:<itemId>
const parseUri = function (uri: string | undefined) {
  if (!uri) return null;

  // Valid media types
  const validTypes = [
    MediaType.ALBUM,
    MediaType.ARTIST,
    MediaType.TRACK,
    MediaType.PLAYLIST,
    MediaType.RADIO,
    MediaType.PODCAST,
    MediaType.AUDIOBOOK,
    MediaType.PODCAST_EPISODE,
  ];

  // Try MA style: provider://mediaType/itemId
  let match = uri.match(/^([^:]+):\/\/([^/]+)\/(.+)$/);
  if (match) {
    const [, provider, mediaType, itemId] = match;
    if (validTypes.includes(mediaType as MediaType)) {
      return { provider, mediaType: mediaType as MediaType, itemId };
    }
  }

  // Try Spotify style: provider:mediaType:itemId
  match = uri.match(/^([^:]+):([^:]+):(.+)$/);
  if (match) {
    const [, provider, mediaType, itemId] = match;
    if (validTypes.includes(mediaType as MediaType)) {
      return { provider, mediaType: mediaType as MediaType, itemId };
    }
  }

  return null;
};

const navigateOrSearch = function (searchTerm: string, uri?: string) {
  const parsed = parseUri(uri);
  if (parsed && api.getProvider(parsed.provider)) {
    // Valid URI - navigate to item details
    store.showFullscreenPlayer = false;
    router.push({
      name: parsed.mediaType,
      params: {
        itemId: parsed.itemId,
        provider: parsed.provider,
      },
    });
  } else {
    // No valid URI - open global search
    store.globalSearchTerm = searchTerm;
    router.push({ name: "search" });
    store.showFullscreenPlayer = false;
  }
};

const onTitleClick = async function () {
  const currentMedia = store.activePlayer?.current_media;
  if (!currentMedia) return;

  // Try to get the track from the full media item (for library items)
  const mediaItem = store.curQueueItem?.media_item;

  if (mediaItem && mediaItem.media_type === MediaType.TRACK) {
    // Navigate directly to track detail page
    store.showFullscreenPlayer = false;
    router.push({
      name: "track",
      params: {
        itemId: mediaItem.item_id,
        provider: mediaItem.provider,
      },
    });
  } else {
    // Radio or non-library item - try to find in library first
    const searchTerm = currentMedia.artist
      ? `${currentMedia.artist} - ${currentMedia.title}`
      : currentMedia.title || "";

    try {
      // Call with positional parameters: (favorite, search, limit, offset, order_by, provider)
      const results = await api.getLibraryTracks(
        undefined, // favorite
        searchTerm, // search
        5, // limit - get a few results to find best match
        undefined,
        undefined,
        undefined,
        undefined, // genre_ids
      );

      if (results.length > 0) {
        // Try to find best match by comparing artist and title
        let bestMatch = results[0];

        if (currentMedia.artist && currentMedia.title) {
          const exactMatch = results.find(
            (track) =>
              track.name.toLowerCase() === currentMedia.title!.toLowerCase() &&
              track.artists?.some(
                (artist) =>
                  artist.name.toLowerCase() ===
                  currentMedia.artist!.toLowerCase(),
              ),
          );
          if (exactMatch) {
            bestMatch = exactMatch;
          }
        }

        // Found in library! Navigate to it
        store.showFullscreenPlayer = false;
        router.push({
          name: "track",
          params: {
            itemId: bestMatch.item_id,
            provider: bestMatch.provider,
          },
        });
        return;
      }
    } catch (error) {
      console.error("Error searching library for track:", error);
    }

    // Not found in library - fall back to global search
    store.globalSearchTerm = searchTerm;
    router.push({ name: "search" });
    store.showFullscreenPlayer = false;
  }
};

const onAlbumClick = async function () {
  const currentMedia = store.activePlayer?.current_media;
  if (!currentMedia?.album) return;

  // Try to get the album from the full media item (for library items)
  const mediaItem = store.curQueueItem?.media_item;

  // Check if "album" is actually the radio station name - if so, do nothing
  if (mediaItem && currentMedia.album === mediaItem.name) {
    // Album field contains the station name, not a real album - ignore click
    return;
  }

  if (mediaItem && "album" in mediaItem && mediaItem.album) {
    // Navigate directly to album detail page
    store.showFullscreenPlayer = false;
    router.push({
      name: "album",
      params: {
        itemId: mediaItem.album.item_id,
        provider: mediaItem.album.provider,
      },
    });
  } else {
    // Radio or non-library item - try to find in library first
    try {
      // Call with positional parameters: (favorite, search, limit, offset, order_by, album_types, provider)
      const results = await api.getLibraryAlbums(
        undefined, // favorite
        currentMedia.album, // search
        5, // limit - get a few results to find best match
        undefined,
        undefined,
        undefined,
        undefined, // genre_ids
      );

      if (results.length > 0) {
        let bestMatch = results[0];

        // If we have artist info, try to find album by same artist
        if (currentMedia.artist) {
          const matchWithArtist = results.find((album) =>
            album.artists?.some(
              (artist) =>
                artist.name.toLowerCase() ===
                  currentMedia.artist!.toLowerCase() ||
                artist.name
                  .toLowerCase()
                  .includes(currentMedia.artist!.toLowerCase()) ||
                currentMedia
                  .artist!.toLowerCase()
                  .includes(artist.name.toLowerCase()),
            ),
          );
          if (matchWithArtist) {
            bestMatch = matchWithArtist;
          }
        }

        // Found in library! Navigate to it
        store.showFullscreenPlayer = false;
        router.push({
          name: "album",
          params: {
            itemId: bestMatch.item_id,
            provider: bestMatch.provider,
          },
        });
        return;
      }
    } catch (error) {
      console.error("Error searching library for album:", error);
    }

    // Not found in library - fall back to global search
    const searchTerm = currentMedia.artist
      ? `${currentMedia.artist} - ${currentMedia.album}`
      : currentMedia.album || "";
    store.globalSearchTerm = searchTerm;
    router.push({ name: "search" });
    store.showFullscreenPlayer = false;
  }
};

const onArtistClick = async function () {
  const currentMedia = store.activePlayer?.current_media;
  if (!currentMedia?.artist) return;

  // Try to get the artist from the full media item (for library items)
  const mediaItem = store.curQueueItem?.media_item;

  if (
    mediaItem &&
    "artists" in mediaItem &&
    mediaItem.artists &&
    mediaItem.artists.length > 0
  ) {
    // Navigate directly to artist detail page
    store.showFullscreenPlayer = false;
    router.push({
      name: "artist",
      params: {
        itemId: mediaItem.artists[0].item_id,
        provider: mediaItem.artists[0].provider,
      },
    });
  } else {
    // Radio or non-library item - try to find in library first
    try {
      // Call with positional parameters: (favorite, search, limit, offset, order_by, album_artists_only, provider)
      const results = await api.getLibraryArtists(
        undefined, // favorite
        currentMedia.artist, // search
        5, // limit
        undefined,
        undefined,
        undefined,
        undefined, // genre_ids
      );

      if (results.length > 0) {
        // Try to find exact match by name
        let bestMatch = results[0];

        const exactMatch = results.find(
          (artist) =>
            artist.name.toLowerCase() === currentMedia.artist!.toLowerCase(),
        );
        if (exactMatch) {
          bestMatch = exactMatch;
        }

        // Found in library! Navigate to it
        store.showFullscreenPlayer = false;
        router.push({
          name: "artist",
          params: {
            itemId: bestMatch.item_id,
            provider: bestMatch.provider,
          },
        });
        return;
      }
    } catch (error) {
      console.error("Error searching library for artist:", error);
    }

    // Not found in library - fall back to global search
    store.globalSearchTerm = currentMedia.artist;
    router.push({ name: "search" });
    store.showFullscreenPlayer = false;
  }
};

const openQueueItemMenu = function (evt: Event, item: QueueItem) {
  const itemIndex = queueItems.value.indexOf(item);
  const menuItems = [
    {
      label: "play_now",
      labelArgs: [],
      action: () => {
        queueCommand(item, "play_now");
      },
      icon: "mdi-play-circle-outline",
      disabled:
        itemIndex === store.activePlayerQueue?.current_index ||
        itemIndex === store.activePlayerQueue?.index_in_buffer,
    },
    {
      label: "play_next",
      labelArgs: [],
      action: () => {
        queueCommand(item, "move_next");
      },
      icon: "mdi-skip-next-circle-outline",
      disabled: itemIndex <= (store.activePlayerQueue?.index_in_buffer || 0),
    },
    {
      label: "queue_move_up",
      labelArgs: [],
      action: () => {
        queueCommand(item, "up");
      },
      icon: "mdi-arrow-up",
      disabled: itemIndex <= (store.activePlayerQueue?.index_in_buffer || 0),
    },
    {
      label: "queue_move_down",
      labelArgs: [],
      action: () => {
        queueCommand(item, "down");
      },
      icon: "mdi-arrow-down",
      disabled: itemIndex <= (store.activePlayerQueue?.index_in_buffer || 0),
    },
    {
      label: "queue_move_end",
      labelArgs: [],
      action: () => {
        queueCommand(item, "end");
      },
      icon: "mdi-arrow-collapse-down",
      disabled: itemIndex <= (store.activePlayerQueue?.index_in_buffer || 0),
    },
    {
      label: "queue_delete",
      labelArgs: [],
      action: () => {
        queueCommand(item, "delete");
      },
      icon: "mdi-delete",
      disabled: itemIndex <= (store.activePlayerQueue?.index_in_buffer || 0),
    },
  ];
  if (item?.media_item?.media_type == MediaType.TRACK) {
    menuItems.push({
      label: "show_info",
      labelArgs: [],
      action: () => {
        itemClick(item.media_item as Track);
      },
      icon: "mdi-information-outline",
      disabled: false,
    });
  }
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: (evt as PointerEvent).clientX,
    posY: (evt as PointerEvent).clientY,
  });
};

const openQueueMenu = function (evt: Event) {
  if (!store.activePlayer) return;
  eventbus.emit("contextmenu", {
    items: getPlayerMenuItems(store.activePlayer, store.activePlayerQueue),
    posX: (evt as PointerEvent).clientX,
    posY: (evt as PointerEvent).clientY,
  });
};

const queueCommand = function (item: QueueItem | undefined, command: string) {
  if (!item || !store.activePlayerQueue) return;
  if (command == "play_now") {
    api.queueCommandPlayIndex(
      store.activePlayerQueue?.queue_id,
      item.queue_item_id,
    );
  } else if (command == "move_next") {
    api.queueCommandMoveNext(
      store.activePlayerQueue?.queue_id,
      item.queue_item_id,
    );
  } else if (command == "up") {
    api.queueCommandMoveUp(
      store.activePlayerQueue?.queue_id,
      item.queue_item_id,
    );
  } else if (command == "down") {
    api.queueCommandMoveDown(
      store.activePlayerQueue?.queue_id,
      item.queue_item_id,
    );
  } else if (command == "end") {
    api.queueCommandMoveItemEnd(
      store.activePlayerQueue?.queue_id,
      item.queue_item_id,
    );
  } else if (command == "delete") {
    api.queueCommandDelete(
      store.activePlayerQueue?.queue_id,
      item.queue_item_id,
    );
  }
};

const virtualScrollRef = ref<InstanceType<
  typeof import("vuetify/components").VVirtualScroll
> | null>(null);
const loadingMore = ref(false);
const allItemsLoaded = ref(false);

const resetItems = async function () {
  tempHide.value = true;
  queueItems.value = [];
  allItemsLoaded.value = false;
  await sleep(100);
  tempHide.value = false;
  if (store.showFullscreenPlayer && store.showQueueItems) {
    loadNextPage();
  }
};

const loadNextPage = async function () {
  if (loadingMore.value || allItemsLoaded.value) return;
  if (!store.activePlayerQueue || store.activePlayerQueue.items == 0) return;
  if (queueItems.value.length >= store.activePlayerQueue.items) {
    allItemsLoaded.value = true;
    return;
  }
  loadingMore.value = true;
  const pageSize = 50;
  const offset = queueItems.value.length;
  // On first load, ensure we fetch enough items to cover past the current
  // index so that nextItems (which slices from current_index) has data.
  const minNeeded = (store.activePlayerQueue.current_index || 0) + pageSize;
  const limit =
    offset === 0 ? Math.max(pageSize, minNeeded - offset) : pageSize;
  const result = await api.getPlayerQueueItems(
    store.activePlayerQueue.queue_id,
    limit,
    offset,
  );
  queueItems.value.push(...result);
  if (result.length < limit) {
    allItemsLoaded.value = true;
  }
  loadingMore.value = false;
};

const onQueueScroll = function (e: Event) {
  const target = e.target as HTMLElement;
  if (!target) return;
  const threshold = 500;
  if (
    target.scrollTop + target.clientHeight >=
    target.scrollHeight - threshold
  ) {
    loadNextPage();
  }
};

// Fetch badge colors from party config
const { config: partyConfig, fetchConfig: fetchPartyConfig } = usePartyConfig();

// React to party config changes (e.g., admin changes badge colors)
watch(partyConfig, (newConfig) => {
  if (newConfig) {
    requestBadgeColor.value = newConfig.request_badge_color ?? "#2196F3";
    boostBadgeColor.value = newConfig.boost_badge_color ?? "#FF5722";
  }
});

onMounted(async () => {
  // Only fetch badge colors if party provider is loaded
  if (Object.values(api.providers).some((p) => p.domain === "party")) {
    await fetchPartyConfig();
  }
});

// load initial page when queue items become visible
watch(
  [() => store.showFullscreenPlayer, () => store.showQueueItems],
  () => {
    if (
      store.showFullscreenPlayer &&
      store.showQueueItems &&
      queueItems.value.length === 0
    ) {
      loadNextPage();
    }
  },
  { immediate: true },
);

// listen for item updates to refresh items when that happens
onMounted(() => {
  const unsub = api.subscribe(
    EventType.QUEUE_ITEMS_UPDATED,
    (evt: EventMessage) => {
      if (evt.object_id != store.activePlayerQueue?.queue_id) return;
      const queue = evt.data as PlayerQueue;
      resetItems();
    },
  );
  onBeforeUnmount(unsub);
});

// Handle Escape key to close fullscreen player (since persistent disables default behavior)
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === "Escape" && store.showFullscreenPlayer && !store.dialogActive) {
    store.showFullscreenPlayer = false;
  }
};
onMounted(() => {
  window.addEventListener("keydown", onKeydown);
  onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeydown);
  });
});

const onHeartBtnClick = async function (evt: PointerEvent | MouseEvent) {
  // the heart icon/button was clicked
  if (!store.curQueueItem?.media_item) return;
  if (!store.curQueueItem.media_item.favorite) {
    api.toggleFavorite(store.curQueueItem.media_item);
    return;
  }
  //resolve media item into a library item
  let resolvedItem = store.curQueueItem!.media_item as MediaItemType;
  if (
    (resolvedItem.provider != "library" ||
      !("provider_mappings" in resolvedItem)) &&
    [
      MediaType.ALBUM,
      MediaType.ARTIST,
      MediaType.AUDIOBOOK,
      MediaType.PLAYLIST,
      MediaType.PODCAST,
      MediaType.RADIO,
      MediaType.TRACK,
    ].includes(resolvedItem.media_type)
  ) {
    // resolve itemmapping or non-library item
    resolvedItem =
      (await api.getLibraryItem(
        resolvedItem.media_type,
        resolvedItem.item_id,
        resolvedItem.provider,
      )) || resolvedItem;
  }

  const menuItems: ContextMenuItem[] = [];

  // remove from favorites
  if (
    "favorite" in resolvedItem &&
    resolvedItem.favorite &&
    resolvedItem.provider == "library" &&
    [
      MediaType.ALBUM,
      MediaType.ARTIST,
      MediaType.AUDIOBOOK,
      MediaType.PLAYLIST,
      MediaType.PODCAST,
      MediaType.RADIO,
      MediaType.TRACK,
    ].includes(resolvedItem.media_type)
  ) {
    menuItems.push({
      label: "favorites_remove",
      labelArgs: [],
      action: () => {
        api.removeItemFromFavorites(
          resolvedItem.media_type,
          resolvedItem.item_id,
        );
        resolvedItem.favorite = false;
        store.curQueueItem!.media_item!.favorite = false;
      },
      icon: "mdi-heart",
    });
  }

  // add to playlist
  if (
    [
      MediaType.ALBUM,
      MediaType.ARTIST,
      MediaType.AUDIOBOOK,
      MediaType.PLAYLIST,
      MediaType.PODCAST,
      MediaType.RADIO,
      MediaType.TRACK,
    ].includes(resolvedItem.media_type)
  ) {
    menuItems.push({
      label: "add_playlist",
      labelArgs: [],
      action: () => {
        eventbus.emit("playlistdialog", {
          items: [store.curQueueItem!.media_item as MediaItemType],
        });
      },
      icon: "mdi-plus-circle-outline",
    });
  }

  // open the contextmenu by emitting the event
  eventbus.emit("contextmenu", {
    items: menuItems,
    posX: evt.clientX,
    posY: evt.clientY,
  });
};

const activeQueuePanelClick = function () {
  // this hack is needed in order to force refresh the infinite scroller
  // otherwise it will not attempt to load more items if the end was reached
  // and then we load new items with a different size
  tempHide.value = true;
  sleep(100).then(() => {
    tempHide.value = false;
  });
};

const chapterClicked = function (
  item: MediaItemType,
  chapter: MediaItemChapter,
) {
  api.playMedia(
    item.uri,
    QueueOption.PLAY,
    undefined,
    chapter.position.toString(),
  );
};

// watchers
watch(
  () => store.activePlayerId,
  (val) => {
    resetItems();
  },
  { immediate: true },
);
const sliderColor = ref<string | undefined>(undefined);
const backgroundColor = ref<string | undefined>(undefined);

watchEffect(() => {
  const LIGHT_TEXT_COLOR = Color("white");
  const DARK_TEXT_COLOR = Color("black");
  // Minimum WCAG contrast ration between the background and the text
  // W3C recommends at least 4.5
  const MIN_CONTRAST = 5;
  const ADJUSTMENT_INCREMENT = 0.05;

  // Determine the base color from palette or fallback to theme default
  const coverImageColorCode = vuetify.theme.current.value.dark
    ? compProps.colorPalette.darkColor || "#000"
    : compProps.colorPalette.lightColor || "#fff";

  // Start with the original cover color as background
  let bgColor = Color(coverImageColorCode);

  // Calculate contrast with white and black
  const lightContrast = LIGHT_TEXT_COLOR.contrast(bgColor);
  const darkContrast = DARK_TEXT_COLOR.contrast(bgColor);

  // Choose the color with higher contrast as starting value
  const isLight = lightContrast >= darkContrast;
  let textColor = isLight ? LIGHT_TEXT_COLOR : DARK_TEXT_COLOR;
  let contrast = Math.max(lightContrast, darkContrast);

  // If the best contrast still doesn't meet requirements, adjust background
  if (contrast < MIN_CONTRAST) {
    // Darken light bg or lighten dark bg until contrast is good
    let adjustment = ADJUSTMENT_INCREMENT;

    while (contrast < MIN_CONTRAST && adjustment <= 0.5) {
      if (isLight) {
        bgColor = bgColor.darken(ADJUSTMENT_INCREMENT);
      } else {
        bgColor = bgColor.lighten(ADJUSTMENT_INCREMENT);
      }

      contrast = Color(textColor).contrast(bgColor);
      adjustment += ADJUSTMENT_INCREMENT;
    }
  }

  // Keep color between text and sliders consistent.
  // Also, this text color has a better contrast than the automatically selected one
  document.documentElement.style.setProperty("--text-color", textColor.hex());
  document.documentElement.style.setProperty(
    "--text-color-inverse",
    isLight ? DARK_TEXT_COLOR.hex() : LIGHT_TEXT_COLOR.hex(),
  );
  sliderColor.value = textColor.hex();
  const topColor = bgColor.lighten(0.25);
  const bottomColor = bgColor.darken(0.25);
  backgroundColor.value = `linear-gradient(to bottom, ${topColor.hex()}, ${bottomColor.hex()})`;
});
</script>

<style scoped>
.fullscreen-player-card {
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.main .main-media-details {
  flex: 50%;
  max-width: 100%;
  width: 50%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.main-queue-items {
  flex: 50%;
  height: 100%;
  max-width: 100%;
  padding-right: 10px;
  padding-left: 15px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.queue-items-scroll-box {
  flex: 1;
  min-height: 0;
  overflow-y: scroll;
}

.queue-items-scroll-box :deep(.v-list-item-title) {
  font-size: var(--queue-title-size, 1rem);
}

.queue-items-scroll-box :deep(.v-list-item-subtitle) {
  font-size: var(--queue-subtitle-size, 0.875rem);
}

/* Streamloader source badge in queue rows: small right margin so the
   compact dot doesn't crowd the now-playing badge. flex-shrink:0 keeps
   the dot intact on narrow ~280px queue panels. */
.queue-source-badge {
  margin-right: 6px;
  flex: 0 0 auto;
}

.v-infinite-scroll--vertical {
  overflow-y: unset;
}

.main-media-details-image {
  flex: 1;
  min-height: 0;
  max-height: 60%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-left: 20px;
  padding-right: 20px;
  container-type: size;
}
.main-media-details-image .v-img,
.main-media-details-image .sl-vinyl-cover-img {
  width: min(100cqi, 100cqh);
  height: min(100cqi, 100cqh);
  flex: 0 0 auto;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.main-media-details-image-alt {
  height: 100% !important;
  max-height: 100% !important;
  padding: 10px !important;
}

.main-media-details-track-info {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  text-align: center;
  padding: min(5%, 5vh) 0 10px;
  overflow: hidden;
}

.main-media-details-track-info > * {
  max-width: 100%;
}

.player-bottom {
  flex-shrink: 0;
  position: unset !important;
  padding-bottom: max(env(safe-area-inset-bottom, 0px), min(3%, 3vh));
  width: 100%;
}

.track-info {
  margin-top: 10px;
  margin-bottom: 10px;
  padding-top: 2vh;
  padding-bottom: 2vh;
  text-align: center;
  line-height: 10%;
}

.track-info-subtitle {
  opacity: 0.5;
}

.v-tab {
  opacity: 0.5;
}
.v-tab-item--selected {
  opacity: 1;
}

.media-controls {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 15px;
  height: 100px;
}

.media-controls-item {
  margin: 0 10px;
  width: 100%;
  height: 100%;
}

.queue-btn-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (max-width: 768px) {
  .media-controls-item {
    margin: 0 5px;
    width: 100%;
    height: 100%;
  }
}

.row {
  align-content: center;
}

.row-centered {
  justify-content: center;
  max-width: 100%;
  padding: 15px;
}

.media-controls > button {
  flex: 1 1 auto;
}

.media-controls-bottom {
  display: flex;
  flex: 0 1 auto;
  justify-content: center;
  align-items: center;
}

.media-controls-bottom > div {
  flex-basis: 0;
  flex-grow: 1;
  max-width: 100%;
}

.media-controls > div {
  width: calc(100% / 3);
}

.mediacontrols-right {
  display: table-cell;
  text-align: right;
  vertical-align: middle;
}

.mediacontrols-right > div {
  display: inline-flex;
  align-items: center;
}

.v-toolbar :deep(.v-toolbar-title) {
  text-align: center;
}

.responsive-icon-holder-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.62;
  cursor: pointer !important;
}

.responsive-icon-holder-btn:focus,
.responsive-icon-holder-btn:hover {
  opacity: 1;
}

div,
button {
  color: var(--text-color);
}

.play-btn-wrapper :deep(.play-btn-icon) {
  background-color: var(--text-color) !important;
}

.player-bottom :deep([data-slot="slider-range"]) {
  background-color: var(--text-color) !important;
}

.player-bottom :deep([data-slot="slider-thumb"])::before {
  background-color: var(--text-color) !important;
}

.player-bottom :deep([data-slot="slider-track"])::before {
  background-color: color-mix(
    in srgb,
    var(--text-color) 24%,
    transparent
  ) !important;
}

.lyrics-wrapper {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.lyrics-wrapper :deep(.lyrics-line),
.lyrics-wrapper :deep(.break-note) {
  font-size: clamp(1.3rem, 4.5vw, 1.9rem);
}

/* Tablet */
@media (min-width: 600px) {
  .lyrics-wrapper :deep(.lyrics-line),
  .lyrics-wrapper :deep(.break-note) {
    font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  }
}

/* Desktop */
@media (min-width: 1280px) {
  .lyrics-wrapper :deep(.lyrics-line),
  .lyrics-wrapper :deep(.break-note) {
    font-size: clamp(1.4rem, 2vw, 2.2rem);
  }
}

.title-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.icon-thumb-large {
  width: 100%;
  aspect-ratio: 1;
  max-width: 400px;
  margin: 0 auto;
  border-radius: 10px;
  background-color: rgba(var(--v-theme-on-surface), 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
}

.guest-request-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  background: color-mix(in srgb, var(--badge-color) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-color) 35%, transparent);
  border-radius: 999px;
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--badge-color);
  margin-right: 0.5rem;
}

@media (max-width: 540px) {
  .main-media-details-image {
    max-height: 75%;
    padding-left: 16px;
    padding-right: 16px;
  }

  .main-media-details-track-info {
    padding: 8px 0;
  }
}

/* ─── Streamloader-fork addition: vinyl-emerging-from-cover hover reveal,
       applied unconditionally to the now-playing cover (album OR track —
       in this context the user IS playing an album track regardless of
       media_type). Mirrors the InfoHeader.vue pattern, scaled for the
       larger fullscreen cover. Cubic-bezier easing exits with a tiny
       overshoot for the slight "spring out" feel. */

.sl-vinyl-wrapper {
  position: relative;
  display: inline-block;
  overflow: visible;
  /* Inherit the cover's container-query sizing so the vinyl/cover unit
     fills the .main-media-details-image box exactly like the original
     <v-img> did. */
  width: min(100cqi, 100cqh);
  height: min(100cqi, 100cqh);
  flex: 0 0 auto;
  transition: transform 700ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.sl-vinyl-cover {
  position: relative;
  /* Cover sits IN FRONT of the protruded disc (LP-from-sleeve look). */
  z-index: 2;
  display: block;
  width: 100%;
  height: 100%;
}

.sl-vinyl-cover :deep(.v-img) {
  width: 100% !important;
  height: 100% !important;
}

/* Streamloader-fork fix (batch JJJ3): native <img> replaces <v-img> for
   the large hero cover so we get a real onerror callback for the
   defensive fallback. Square it off to match the previous v-img layout. */
.sl-vinyl-cover-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: inherit;
}

/* Streamloader-fork fix (batch MMM4): see InfoHeader.vue header
   comment. Protrude wrapper holds the disc in its offset position
   and never rotates; the spin wrapper inside rotates around the
   disc's own center. */
.sl-vinyl-disc-protrude {
  position: absolute;
  top: 50%;
  left: 0;
  width: 96%;
  aspect-ratio: 1 / 1;
  transform: translate(0, -50%);
  transform-origin: center center;
  transition: transform 700ms cubic-bezier(0.34, 1.36, 0.64, 1);
  z-index: 1;
  pointer-events: none;
  filter: drop-shadow(0 6px 18px rgba(0, 0, 0, 0.5));
}

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

/* Mode 1: hover-only reveal (legacy). Translate the protrude wrapper
   so the disc peeks out ~40% of its width past the cover edge while
   keeping the spin axis at the disc's true center. */
.sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-protrude {
  transform: translate(40%, -50%);
}
.sl-vinyl-wrapper.vinyl-mode--hover:hover {
  transform: rotate(-3deg) scale(1.03);
}

/* Mode 2 + 3: vinyl always peeks out — ~40% of disc width visible
   past the cover's right edge. */
.sl-vinyl-wrapper.vinyl-mode--always-visible .sl-vinyl-disc-protrude,
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning .sl-vinyl-disc-protrude {
  transform: translate(40%, -50%);
}

/* Mode 3: continuous slow spin — 8s per revolution. Animation lives
   on the spin wrapper so rotation is around the disc center. The
   pause class freezes the spin without resetting the angle. */
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning .sl-vinyl-disc-spin {
  animation: sl-vinyl-spin 8s linear infinite;
}
.sl-vinyl-wrapper.vinyl-mode--always-visible-spinning
  .sl-vinyl-disc-spin.sl-vinyl-spinning--paused {
  animation-play-state: paused;
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
   thumbnail. Lives inside the spin wrapper, centered on the disc
   (the actual rotation center). Inherits the spin wrapper's
   rotation, so it tracks the disc with no extra transform math. */
.sl-vinyl-label {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 27%;
  height: 27%;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  overflow: hidden;
  pointer-events: none;
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

/* Streamloader-fork addition (batch MMM3): fixed sheen highlight
   overlay. Lives in the protrude wrapper so it tracks the disc's
   position, but sits outside the spin wrapper so it does NOT rotate. */
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
   on the fullscreen hero. Scoped to .sl-vinyl-cover so the orbit/spin
   wrappers (and the vinyl-orbit fix from batch MMM4) are untouched.
   Subtle 1 → 1.05 → 1 with overshoot ease, ~420ms total — matches
   useTrackChangePulse + the mini player pulse for visual consistency. */
.sl-vinyl-cover.sl-track-pulse {
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
  .sl-vinyl-wrapper.vinyl-mode--always-visible-spinning .sl-vinyl-disc-spin {
    animation: none;
  }
  .sl-vinyl-cover.sl-track-pulse {
    animation: none;
  }
}

/* Touch devices: disable the hover-mode reveal entirely. The reveal is
   a desktop-mouse affordance; on touch finger-drag would either always-
   or never-trigger it depending on browser, neither of which adds
   anything. Always-visible modes are unaffected. */
@media (hover: none) {
  .sl-vinyl-wrapper.vinyl-mode--hover:hover .sl-vinyl-disc-protrude {
    transform: translate(0, -50%);
  }
  .sl-vinyl-wrapper.vinyl-mode--hover:hover {
    transform: none;
  }
}
</style>
