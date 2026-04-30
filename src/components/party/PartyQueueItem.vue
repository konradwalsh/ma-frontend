<template>
  <div
    class="queue-item"
    :class="{
      'queue-item-current': absoluteIndex === currentQueueIndex,
      'queue-item-played': absoluteIndex < currentQueueIndex,
      'queue-item--expanded': isExpanded,
      'queue-item--clickable': absoluteIndex > currentQueueIndex,
    }"
    @click="onItemClick"
  >
    <div class="queue-item-info">
      <div class="queue-position">
        <NowPlayingBadge
          v-if="absoluteIndex === currentQueueIndex && isPlaying"
          :show-badge="false"
        />
        <span v-else class="queue-number">{{ absoluteIndex + 1 }}</span>
      </div>
      <Avatar class="queue-avatar size-12 rounded-md">
        <AvatarImage :src="imageUrl" :alt="item.name" />
        <AvatarFallback class="avatar-placeholder rounded-md">
          <Music :size="20" />
        </AvatarFallback>
      </Avatar>
      <div class="queue-info">
        <MarqueeText class="queue-name">
          {{ title }}
        </MarqueeText>
        <MarqueeText class="queue-artist">
          {{ subtitle }}
        </MarqueeText>
      </div>

      <!-- Guest request badge -->
      <span
        v-if="item.extra_attributes?.party_guest === true"
        class="guest-request-badge"
        :style="{ '--badge-color': badgeColor }"
      >
        <component :is="badgeIconComponent" :size="10" />
        <span>{{ badgeLabel }}</span>
      </span>
    </div>

    <!-- Boost action (shown when expanded on upcoming items) -->
    <template v-if="isExpanded && canBoost">
      <div class="queue-item-actions">
        <Button
          size="sm"
          :disabled="boostDisabled || boosting"
          class="boost-btn"
          :style="{ '--btn-bg': boostBadgeColor }"
          @click.stop="$emit('boost', item)"
        >
          <Spinner v-if="boosting" :size="16" />
          <Rocket v-else :size="16" />
          {{ $t("providers.party.boost") }}
        </Button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { QueueItem } from "@/plugins/api/interfaces";
import { getMediaItemImageUrl } from "@/helpers/utils";
import { $t } from "@/plugins/i18n";
import MarqueeText from "@/components/MarqueeText.vue";
import NowPlayingBadge from "@/components/NowPlayingBadge.vue";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/ui/spinner/Spinner.vue";
import { Music, Rocket, UserRound } from "lucide-vue-next";

const props = defineProps<{
  item: QueueItem;
  index: number;
  queueFetchOffset: number;
  currentQueueIndex: number;
  isPlaying: boolean;
  boostBadgeColor: string;
  requestBadgeColor: string;
  boostEnabled: boolean;
  rateLimitingEnabled: boolean;
  boostTokens: number;
  boosting: boolean;
  isExpanded: boolean;
}>();

const emit = defineEmits<{
  boost: [item: QueueItem];
  toggleExpand: [queueItemId: string];
}>();

const canBoost = computed(
  () => props.boostEnabled && absoluteIndex.value > props.currentQueueIndex,
);

const boostDisabled = computed(
  () => props.rateLimitingEnabled && props.boostTokens <= 0,
);

const onItemClick = () => {
  if (absoluteIndex.value > props.currentQueueIndex) {
    emit("toggleExpand", props.item.queue_item_id);
  }
};

const absoluteIndex = computed(() => props.queueFetchOffset + props.index);

const imageUrl = computed(() => {
  if (!props.item.image) return "";
  return getMediaItemImageUrl(props.item.image);
});

const title = computed(() => {
  return props.item.media_item?.name || props.item.name;
});

const subtitle = computed(() => {
  const mediaItem = props.item.media_item;
  const parts: string[] = [];

  if (mediaItem && "artists" in mediaItem && mediaItem.artists.length > 0) {
    parts.push(mediaItem.artists.map((a) => a.name).join(", "));
  }

  if (mediaItem && "album" in mediaItem && mediaItem.album?.name) {
    parts.push(mediaItem.album.name);
  }

  return parts.length > 0
    ? parts.join(" • ")
    : $t("providers.party.guest_page.unknown_artist");
});

const isBoosted = computed(
  () => props.item.extra_attributes?.party_boosted === true,
);

const badgeColor = computed(() =>
  isBoosted.value ? props.boostBadgeColor : props.requestBadgeColor,
);

const badgeIconComponent = computed(() =>
  isBoosted.value ? Rocket : UserRound,
);

const badgeLabel = computed(() =>
  isBoosted.value ? $t("providers.party.boost") : $t("providers.party.request"),
);
</script>

<style scoped>
.queue-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(var(--v-theme-surface-variant), 0.05);
  border-radius: 12px;
  min-height: 72px;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.queue-item--clickable {
  cursor: pointer;
}

.queue-item--clickable:hover {
  /* Subtle teal tint on hover for upcoming items */
  background: rgba(var(--v-theme-primary), 0.08);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.16);
}

.queue-item--expanded {
  background: rgba(var(--v-theme-primary), 0.12);
  box-shadow: inset 0 0 0 1px rgba(var(--v-theme-primary), 0.24);
}

.queue-item-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  min-width: 0;
}

.queue-item-actions {
  display: flex;
  justify-content: center;
  flex-shrink: 0;
  margin-left: auto;
}

.queue-item-actions .boost-btn {
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.5px;
  background-color: var(--btn-bg) !important;
  color: rgb(var(--v-theme-on-primary)) !important;
  /* Teal glow when the boost button is active/enabled */
  box-shadow:
    0 0 0 1px rgba(var(--v-theme-primary), 0.35),
    0 0 14px rgba(var(--v-theme-primary), 0.35),
    0 4px 18px rgba(var(--v-theme-primary), 0.22);
  transition:
    box-shadow 0.2s ease,
    transform 0.15s ease,
    filter 0.2s ease;
}

.queue-item-actions .boost-btn:not(:disabled):hover {
  filter: brightness(1.08);
  transform: translateY(-1px);
  box-shadow:
    0 0 0 1px rgba(var(--v-theme-primary), 0.55),
    0 0 22px rgba(var(--v-theme-primary), 0.5),
    0 6px 24px rgba(var(--v-theme-primary), 0.32);
}

.queue-item-actions .boost-btn:disabled {
  box-shadow: none;
  opacity: 0.45;
}

.queue-item-current {
  /* Match the .v-list-item--active 3px teal left-edge pattern */
  background: rgba(var(--v-theme-primary), 0.16);
  box-shadow:
    inset 3px 0 0 0 rgb(var(--v-theme-primary)),
    inset 0 0 0 1px rgba(var(--v-theme-primary), 0.3),
    0 0 18px rgba(var(--v-theme-primary), 0.18);
  padding-left: calc(0.75rem + 3px);
}

.queue-item-played {
  background: rgba(var(--v-theme-on-surface), 0.08);
  opacity: 0.5;
}

.queue-position {
  width: 20px;
  margin-right: -5px;
  text-align: center;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.queue-position :deep(.now-playing-icon) {
  margin: 0;
}

.queue-number {
  font-size: 0.8125rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
  opacity: 0.55;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.queue-item-current .queue-number,
.queue-item--expanded .queue-number {
  color: rgb(var(--v-theme-primary));
  opacity: 1;
}

.queue-avatar {
  flex-shrink: 0;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--v-theme-primary), 0.1);
}

.queue-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.queue-name {
  font-size: 1rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.queue-artist {
  font-size: 0.875rem;
  font-weight: 400;
  opacity: 0.6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.guest-request-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.3rem;
  background: color-mix(in srgb, var(--badge-color) 20%, transparent);
  border: 1px solid color-mix(in srgb, var(--badge-color) 40%, transparent);
  border-radius: 999px;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  color: var(--badge-color);
  flex-shrink: 0;
  margin-left: auto;
  max-width: 6rem;
  overflow: hidden;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .queue-item--expanded {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    min-height: auto;
  }

  .queue-item-actions {
    border-top: 1px solid rgba(var(--v-theme-on-surface), 0.1);
    width: 100%;
    margin-left: 0;
  }

  .queue-item-actions .boost-btn {
    flex: 1;
  }
}
</style>
