<template>
  <div :class="`widget-row ${settings && !settings.enabled ? 'disabled' : ''}`">
    <v-toolbar class="header" color="transparent" density="compact">
      <template #title>
        <span class="mr-3">{{ $t("players") }}</span>
      </template>
      <template #append>
        <div v-if="editMode">
          <!-- enable/disable checkbox -->
          <v-btn
            :icon="
              settings.enabled
                ? 'mdi-checkbox-marked'
                : 'mdi-checkbox-blank-outline'
            "
            @click="
              emit('update:settings', {
                ...settings,
                enabled: !settings.enabled,
              })
            "
          />
        </div>
      </template>
    </v-toolbar>

    <div class="players-swiper-wrap">
      <swiper
        :slides-per-view="'auto'"
        :space-between="15"
        :free-mode="true"
        :navigation="false"
        :mousewheel="{
          forceToAxis: true,
          releaseOnEdges: true,
        }"
      >
        <swiper-slide
          v-for="player in sortedPlayers"
          :key="player.player_id"
          style="width: 240px"
        >
          <div class="player-card-shell" tabindex="0">
            <PlayerCard
              :id="player.player_id"
              :key="player.player_id"
              :player="player"
              :show-volume-control="false"
              :show-menu-button="false"
              :show-sub-players="false"
              :show-sync-controls="false"
              @click="playerClicked(player)"
            />
          </div>
        </swiper-slide>
      </swiper>
    </div>
  </div>
</template>

<script setup lang="ts">
import PlayerCard from "@/components/PlayerCard.vue";
import { playerVisible } from "@/helpers/utils";
import { api } from "@/plugins/api";
import { PlaybackState, Player } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";
import { computed } from "vue";
import { WidgetRowSettings } from "./WidgetRow.vue";

const sortedPlayers = computed(() => {
  return Object.values(api.players)
    .filter((x) => playerVisible(x))
    .sort((a, b) => (a.name.toUpperCase() > b.name?.toUpperCase() ? 1 : -1))
    .sort((a, b) => {
      return playerSortScore(a) - playerSortScore(b);
    });
});

interface Props {
  settings: WidgetRowSettings;
  editMode: boolean;
}
defineProps<Props>();

const emit = defineEmits(["update:settings"]);

function playerClicked(player: Player) {
  store.activePlayerId = player.player_id;
}

function playerSortScore(player: Player) {
  if (player.playback_state == PlaybackState.PLAYING) {
    return 0;
  }
  if (player.playback_state == PlaybackState.PAUSED) {
    return 1;
  }
  if (player.current_media && player.powered) return 3;
  if (player.current_media) return 4;
  return 99;
}
</script>

<style scoped>
.header.v-toolbar :deep(.v-toolbar-title) {
  margin-inline-start: 0px;
  font-size: large;
  font-weight: bold;
}

.header.v-toolbar {
  padding-inline-start: 4px;
}

.widget-row {
  margin-bottom: 10px;
  margin-left: 0px;
  margin-right: 0px;
  padding-left: 0px;
}

@media (max-width: 575px) {
  .widget-row {
    margin-bottom: 4px;
  }
}

.disabled {
  opacity: 0.2;
}
.enabled {
  opacity: 1;
}

.widget-row-panel-item {
  margin-bottom: 10px;
}

.v-slide-group__prev {
  min-width: 0px !important;
}

.v-slide-group__prev.v-slide-group__prev--disabled {
  visibility: hidden;
  margin-right: -15px;
}

.v-slide-group__next {
  min-width: 15px !important;
}

.v-slide-group__next.v-slide-group__next--disabled {
  visibility: hidden;
}

:deep(.swiper-slide) {
  width: auto;
  flex-shrink: 0;
  scroll-snap-align: start;
}

/* Edge fade so cards softly trail off at both ends of the strip */
.players-swiper-wrap {
  -webkit-mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 24px,
    #000 calc(100% - 24px),
    transparent 100%
  );
  mask-image: linear-gradient(
    to right,
    transparent 0,
    #000 24px,
    #000 calc(100% - 24px),
    transparent 100%
  );
}

.players-swiper-wrap :deep(.swiper) {
  scroll-snap-type: x proximity;
}

/* Player-card hover halo + focus-visible ring (teal brand) */
.player-card-shell {
  position: relative;
  border-radius: 12px;
  outline: none;
  transition:
    transform 240ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 240ms ease;
}

.player-card-shell:hover {
  transform: translateY(-2px);
  box-shadow:
    0 0 0 1px rgba(45, 212, 191, 0.4),
    0 8px 28px rgba(45, 212, 191, 0.15);
}

.player-card-shell:focus-visible {
  box-shadow:
    0 0 0 2px rgba(45, 212, 191, 0.85),
    0 8px 28px rgba(45, 212, 191, 0.2);
}

@media (hover: none) {
  .player-card-shell:hover {
    transform: none;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .player-card-shell {
    transition: none;
  }
  .player-card-shell:hover {
    transform: none;
  }
}
</style>
