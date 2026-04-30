<template>
  <section>
    <ItemsListing
      itemtype="browse"
      :show-provider="false"
      :show-library="false"
      :show-favorites-only-filter="false"
      :show-track-number="false"
      :show-select-button="
        path && path != 'root' && !hasOnlyFolders ? true : false
      "
      :load-items="loadItems"
      :sort-keys="['original', 'name', 'name_desc']"
      :path="path"
      :allow-key-hooks="true"
      :icon="Folder"
      :title="title"
    >
      <template #title>
        <div class="breadcrumb-container">
          <span
            v-for="(segment, index) in breadcrumbSegments"
            :key="index"
            class="breadcrumb-segment"
          >
            <button
              v-if="segment.clickable"
              class="breadcrumb-link"
              @click="navigateToSegment(segment.path)"
            >
              {{ segment.text }}
            </button>
            <span v-else class="breadcrumb-text">
              {{ segment.text }}
            </span>
            <v-icon
              v-if="index < breadcrumbSegments.length - 1"
              icon="mdi-chevron-right"
              size="small"
              class="breadcrumb-separator"
            />
          </span>
        </div>
      </template>
    </ItemsListing>
  </section>
</template>

<script setup lang="ts">
import ItemsListing, { LoadDataParams } from "@/components/ItemsListing.vue";
import { MediaItemType, MediaType } from "@/plugins/api/interfaces";
import api from "@/plugins/api";
import router from "@/plugins/router";
import { Folder } from "lucide-vue-next";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";

export interface Props {
  path?: string;
}

interface BreadcrumbSegment {
  text: string;
  path: string | null;
  clickable: boolean;
}

const props = defineProps<Props>();
const { t } = useI18n();
const hasOnlyFolders = ref(false);

const title = computed(() => "");

const breadcrumbSegments = computed((): BreadcrumbSegment[] => {
  const segments: BreadcrumbSegment[] = [];

  segments.push({
    text: t("browse"),
    path: null,
    clickable: (props.path && props.path !== "root") || false,
  });

  if (props.path && props.path !== "root") {
    if (props.path.includes("://")) {
      const [providerPart, pathPart] = props.path.split("://");
      const provider = providerPart + "://";
      const providerName = api.getProviderName(providerPart);

      segments.push({
        text: providerName,
        path: provider,
        clickable: (pathPart && pathPart.length > 0) || false,
      });

      if (pathPart && pathPart.length > 0) {
        const pathSegments = pathPart
          .split("/")
          .filter((segment) => segment.length > 0);

        pathSegments.forEach((segment, index) => {
          const fullPath =
            provider + pathSegments.slice(0, index + 1).join("/");

          segments.push({
            text: segment,
            path: fullPath,
            clickable: index < pathSegments.length - 1,
          });
        });
      }
    } else {
      const pathSegments = props.path
        .split("/")
        .filter((segment) => segment.length > 0);

      pathSegments.forEach((segment, index) => {
        const fullPath = pathSegments.slice(0, index + 1).join("/");

        segments.push({
          text: segment,
          path: fullPath,
          clickable: index < pathSegments.length - 1,
        });
      });
    }
  }

  return segments;
});

const loadItems = async function (params: LoadDataParams) {
  const items: Array<MediaItemType> = await api.browse(props.path);
  hasOnlyFolders.value = items.every(
    (item) => item.media_type === MediaType.FOLDER,
  );
  return items;
};

const navigateToSegment = (path: string | null) => {
  if (path === null) {
    router.push({ name: "browse" });
  } else {
    router.push({
      name: "browse",
      query: { path },
    });
  }
};
</script>

<style scoped>
.breadcrumb-container {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
}

.breadcrumb-segment {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.breadcrumb-link {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  text-decoration: underline;
  text-decoration-color: rgba(45, 212, 191, 0.4);
  text-underline-offset: 3px;
  font-family: inherit;
  font-size: inherit;
  padding: 2px 4px;
  margin: 0;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
  transition:
    color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    background-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    text-decoration-color 220ms ease;
}

.breadcrumb-link:hover {
  color: #2dd4bf;
  background-color: rgba(45, 212, 191, 0.08);
  text-decoration-color: #2dd4bf;
}

.breadcrumb-link:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.55);
  color: #2dd4bf;
}

@media (hover: none) {
  .breadcrumb-link:hover {
    color: inherit;
    background-color: transparent;
    text-decoration-color: rgba(45, 212, 191, 0.4);
  }
}

.breadcrumb-text {
  color: inherit;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

.breadcrumb-separator {
  opacity: 0.5;
  margin: 0 2px;
  flex-shrink: 0;
  transition: color 220ms ease, opacity 220ms ease;
}

.breadcrumb-segment:hover .breadcrumb-separator {
  color: rgba(45, 212, 191, 0.7);
  opacity: 0.85;
}

@media (hover: none) {
  .breadcrumb-segment:hover .breadcrumb-separator {
    color: inherit;
    opacity: 0.5;
  }
}

/* Scale down font size when there are many segments */
.breadcrumb-container:has(.breadcrumb-segment:nth-child(4)) .breadcrumb-link,
.breadcrumb-container:has(.breadcrumb-segment:nth-child(4)) .breadcrumb-text {
  font-size: 0.9em;
}

.breadcrumb-container:has(.breadcrumb-segment:nth-child(5)) .breadcrumb-link,
.breadcrumb-container:has(.breadcrumb-segment:nth-child(5)) .breadcrumb-text {
  font-size: 0.85em;
  max-width: 150px;
}

.breadcrumb-container:has(.breadcrumb-segment:nth-child(6)) .breadcrumb-link,
.breadcrumb-container:has(.breadcrumb-segment:nth-child(6)) .breadcrumb-text {
  font-size: 0.8em;
  max-width: 120px;
}
</style>
