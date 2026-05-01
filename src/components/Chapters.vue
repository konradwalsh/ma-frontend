<template>
  <section style="margin-bottom: 10px">
    <Toolbar
      :title="$t('chapters')"
      :menu-items="toolbarMenuItems"
      @title-clicked="toggleExpand"
    />
    <v-divider />
    <Container v-if="expanded">
      <v-list class="chapters-list">
        <v-list-item
          v-for="chapter in itemDetails?.metadata?.chapters"
          :key="chapter.position"
          :disabled="!itemIsAvailable(itemDetails)"
          :active="isCurrentChapter(chapter)"
          :class="{
            'chapter-row': true,
            'chapter-row--current': isCurrentChapter(chapter),
            'chapter-row--played':
              isChapterPlayed(chapter) && !isCurrentChapter(chapter),
          }"
          @click="chapterClicked(chapter)"
        >
          <template #prepend>
            <div style="width: 50px">
              <v-chip class="chapter-position">
                {{ chapter.position }}
              </v-chip>
            </div>
          </template>
          <template #title>
            <div class="chapter-title-row">
              <span class="chapter-title-text">{{
                prettifyMediaName(chapter.name)
              }}</span>
              <v-icon
                v-if="isChapterPlayed(chapter) && !isCurrentChapter(chapter)"
                size="x-small"
                color="primary"
                class="chapter-played-check"
              >
                mdi-check
              </v-icon>
            </div>
            <v-progress-linear
              v-if="
                isCurrentChapter(chapter) && chapterProgressPct(chapter) > 0
              "
              :model-value="chapterProgressPct(chapter)"
              color="primary"
              height="2"
              rounded
              class="chapter-progress"
            />
          </template>
          <template #append>
            <span
              v-if="isCurrentChapter(chapter) && chapter.end"
              class="text-caption chapter-time chapter-time--current"
            >
              {{ formatDuration(currentSec - chapter.start) }} /
              {{ formatDuration(chapter.end - chapter.start) }}
            </span>
            <span v-else-if="chapter.end" class="text-caption chapter-time">
              {{ formatDuration(chapter.end - chapter.start) }}
            </span>
          </template>
        </v-list-item>
      </v-list>
    </Container>
  </section>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import Toolbar from "@/components/Toolbar.vue";
import { formatDuration } from "@/helpers/utils";
import { prettifyMediaName } from "@/helpers/prettifyMediaName";
import { api } from "@/plugins/api";
import { itemIsAvailable } from "@/plugins/api/helpers";
import { MediaItemChapter, type MediaItemType } from "@/plugins/api/interfaces";
import { computed, ref } from "vue";

export interface Props {
  itemDetails: MediaItemType;
}
const props = defineProps<Props>();

const expanded = ref(true);

const toggleExpand = function () {
  expanded.value = !expanded.value;
};

const toolbarMenuItems = computed(() => {
  return [
    // toggle expand
    {
      label: "tooltip.collapse_expand",
      icon: expanded.value ? "mdi-chevron-up" : "mdi-chevron-down",
      action: toggleExpand,
      overflowAllowed: false,
    },
  ];
});

// --- Played-state derivation ---------------------------------------------
// MediaItemChapter only carries position/name/start/end (seconds). The
// parent Audiobook / PodcastEpisode carries fully_played + resume_position_ms.
// We derive per-chapter played / in-progress / current from those.

const fullyPlayed = computed<boolean>(() => {
  const item = props.itemDetails as unknown as
    | { fully_played?: boolean }
    | undefined;
  return !!item?.fully_played;
});

// Resume position normalised to seconds. If fully_played, treat as past-end.
const currentSec = computed<number>(() => {
  if (fullyPlayed.value) return Number.POSITIVE_INFINITY;
  const item = props.itemDetails as unknown as
    | { resume_position_ms?: number }
    | undefined;
  const ms = item?.resume_position_ms ?? 0;
  return ms > 0 ? ms / 1000 : 0;
});

const isCurrentChapter = (chapter: MediaItemChapter): boolean => {
  if (fullyPlayed.value) return false;
  if (currentSec.value <= 0) return false;
  if (chapter.end == null) return currentSec.value >= chapter.start;
  return currentSec.value >= chapter.start && currentSec.value < chapter.end;
};

const isChapterPlayed = (chapter: MediaItemChapter): boolean => {
  if (fullyPlayed.value) return true;
  if (chapter.end == null) return false;
  return currentSec.value >= chapter.end;
};

const chapterProgressPct = (chapter: MediaItemChapter): number => {
  if (chapter.end == null) return 0;
  const span = chapter.end - chapter.start;
  if (span <= 0) return 0;
  const pct = ((currentSec.value - chapter.start) / span) * 100;
  return Math.max(0, Math.min(100, pct));
};

const chapterClicked = function (chapter: MediaItemChapter) {
  if (!props.itemDetails || !itemIsAvailable(props.itemDetails)) return;
  api.playMedia(
    props.itemDetails.uri,
    undefined,
    undefined,
    chapter.position.toString(),
  );
};
</script>

<style scoped>
/* Tabular numerals on the position chip and duration so columns align
   cleanly down the list — purely typographic, no colour change. */
.chapter-position,
.chapter-time {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum";
}

/* Title row with optional "played" check icon trailing the name. */
.chapter-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.chapter-title-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Played chapters: muted title + small teal check.
   Global v-list-item--active stripe still wins for the current row
   because we don't apply --played and --current together. */
.chapter-row--played .chapter-title-text {
  opacity: 0.55;
}

.chapter-played-check {
  flex-shrink: 0;
  opacity: 0.85;
}

/* Currently-playing chapter: the global .v-list-item--active rule in
   plugins/vuetify.css already paints the 3px teal left stripe. We layer
   a soft teal glow on top so the row reads as "this is now". */
.v-theme--dark .chapter-row--current {
  background: rgba(45, 212, 191, 0.08);
  box-shadow:
    inset 3px 0 0 #2dd4bf,
    0 0 12px rgba(45, 212, 191, 0.18);
}

.v-theme--light .chapter-row--current {
  background: rgba(15, 118, 110, 0.06);
  box-shadow:
    inset 3px 0 0 #0f766e,
    0 0 12px rgba(15, 118, 110, 0.15);
}

/* Inline progress bar tucked just under the title for the in-progress
   chapter — mirrors the % listened affordance from the audiobook page. */
.chapter-progress {
  margin-top: 4px;
  max-width: 280px;
  opacity: 0.9;
}

/* Make the "X:XX / Y:YY" reading on the current row pop slightly. */
.chapter-time--current {
  color: rgb(var(--v-theme-primary));
  font-weight: 500;
}
</style>
