<template>
  <section v-if="isAdmin" class="genre-exclusion-manager">
    <Toolbar
      :title="exclusionTitle"
      :menu-items="toolbarMenuItems"
      class="genre-exclusion-toolbar"
      @title-clicked="toggleSection"
    />
    <v-divider />
    <Container v-if="sectionExpanded">
      <div
        v-if="exclusions.length === 0"
        class="genre-exclusion-empty"
      >
        <GenreIcon class="genre-exclusion-empty-icon size-[36px]" />
        <p class="genre-exclusion-empty-text">
          {{ emptyStateText }}
        </p>
      </div>
      <v-list v-else class="genre-exclusion-list">
        <ListItem
          v-for="genre in exclusions"
          :key="genre.item_id"
          show-menu-btn
          class="genre-exclusion-row"
          @menu.stop="(evt) => onMenu(evt, genre)"
        >
          <template #prepend>
            <div class="genre-exclusion-icon-wrap">
              <GenreIcon class="size-[30px] genre-exclusion-icon" />
            </div>
          </template>
          <template #title>{{
            getGenreDisplayName(genre.name, genre.translation_key, t, te)
          }}</template>
        </ListItem>
      </v-list>
    </Container>
  </section>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import ListItem from "@/components/ListItem.vue";
import Toolbar, { ToolBarMenuItem } from "@/components/Toolbar.vue";
import { getGenreDisplayName } from "@/helpers/utils";
import { api } from "@/plugins/api";
import { Genre, MediaType } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import GenreIcon from "@/components/icons/GenreIcon.vue";
import { ChevronUp, ChevronDown } from "lucide-vue-next";

interface Props {
  mediaType: MediaType;
  mediaId: string;
}

const props = defineProps<Props>();

const { t, te } = useI18n();

const isAdmin = computed(() => authManager.isAdmin());
const sectionExpanded = ref(false);
const operationInProgress = ref(false);
const exclusions = ref<Genre[]>([]);

const exclusionTitle = computed(
  () => `${t("genre_exclusions")} (${exclusions.value.length})`,
);

const emptyStateText = computed(() =>
  te("no_genre_exclusions") ? t("no_genre_exclusions") : "No excluded genres yet.",
);

const toolbarMenuItems = computed<ToolBarMenuItem[]>(() => [
  {
    label: "tooltip.collapse_expand",
    icon: sectionExpanded.value ? ChevronUp : ChevronDown,
    action: toggleSection,
    overflowAllowed: false,
  },
]);

const loadExclusions = async () => {
  try {
    exclusions.value = await api.getGenreExclusionsForItem(
      props.mediaType,
      props.mediaId,
    );
  } catch {
    exclusions.value = [];
  }
};

const removeExclusion = async (genre: Genre) => {
  operationInProgress.value = true;
  try {
    await api.removeGenreExclusion(
      genre.item_id,
      props.mediaType,
      props.mediaId,
    );
    exclusions.value = exclusions.value.filter(
      (g) => g.item_id !== genre.item_id,
    );
  } finally {
    operationInProgress.value = false;
  }
};

const onMenu = (evt: Event, genre: Genre) => {
  const mouseEvt = evt as MouseEvent;
  eventbus.emit("contextmenu", {
    items: [
      {
        label: "remove_genre_exclusion",
        icon: "mdi-delete",
        action: () => removeExclusion(genre),
        disabled: operationInProgress.value,
      },
    ],
    posX: mouseEvt.clientX,
    posY: mouseEvt.clientY,
  });
};

const toggleSection = () => {
  sectionExpanded.value = !sectionExpanded.value;
};

onMounted(() => {
  loadExclusions();
  eventbus.on("genreExcluded", loadExclusions);
});

onBeforeUnmount(() => {
  eventbus.off("genreExcluded", loadExclusions);
});

watch(
  () => props.mediaId,
  () => loadExclusions(),
);
</script>

<style scoped>
.genre-exclusion-manager {
  margin-bottom: 10px;
}

.genre-exclusion-manager :deep(.genre-exclusion-toolbar) .toolbar-title,
.genre-exclusion-manager :deep(.toolbar-title) {
  font-weight: 500;
  letter-spacing: -0.01em;
}

.genre-exclusion-list {
  padding: 4px 0;
}

.genre-exclusion-row {
  transition: background-color 0.15s ease;
}

.genre-exclusion-row:hover {
  background-color: rgba(45, 212, 191, 0.08);
}

.genre-exclusion-icon-wrap {
  width: 30px;
  margin-left: 10px;
  margin-right: 10px;
  display: flex;
  align-items: center;
}

.genre-exclusion-icon {
  color: rgb(15, 118, 110);
}

:global(.v-theme--dark) .genre-exclusion-icon {
  color: rgb(45, 212, 191);
}

.genre-exclusion-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  gap: 12px;
}

.genre-exclusion-empty-icon {
  color: rgb(15, 118, 110);
  opacity: 0.7;
}

:global(.v-theme--dark) .genre-exclusion-empty-icon {
  color: rgb(45, 212, 191);
}

.genre-exclusion-empty-text {
  margin: 0;
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: -0.005em;
}

:global(.v-theme--dark) .genre-exclusion-empty-text {
  color: rgba(255, 255, 255, 0.6);
}
</style>
