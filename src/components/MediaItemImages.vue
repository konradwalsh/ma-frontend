<template>
  <section style="margin-bottom: 10px">
    <Toolbar
      :title="$t('images')"
      :menu-items="toolbarMenuItems"
      @title-clicked="toggleExpand"
    />
    <v-divider />
    <Container v-if="expanded">
      <v-row v-for="imgType of ImageType" :key="imgType">
        <v-col
          v-for="(image, idx) in modelValue.filter((x) => x.type == imgType)"
          :key="image.path"
          cols="12"
          :class="`col-${panelViewItemResponsive($vuetify.display.width)}`"
        >
          <v-hover v-slot="{ props }">
            <v-card
              v-hold="
                (e: PointerEvent | TouchEvent) => {
                  onMenu(e, image);
                }
              "
              v-bind="props"
              tile
              hover
              class="panel-item"
              @click="
                (e: PointerEvent) => {
                  onClick(e, image);
                }
              "
              @click.right.prevent="
                (e: PointerEvent | TouchEvent) => {
                  onMenu(e, image);
                }
              "
            >
              <v-img
                :src="getMediaItemImageUrl(image, 256)"
                class="bg-grey-lighten-2"
                width="100%"
              >
                <template #placeholder>
                  <v-row
                    align="center"
                    class="fill-height ma-0"
                    justify="center"
                  >
                    <v-progress-circular color="grey-lighten-5" indeterminate />
                  </v-row>
                </template>
              </v-img>

              <v-list-item
                variant="text"
                slim
                tile
                density="compact"
                class="panel-item-details"
              >
                <v-list-item-title width="95%">
                  {{ $t("image_type") + ": " + image.type }}
                </v-list-item-title>
                <v-list-item-subtitle
                  class="ma-line-clamp-1"
                  style="margin-right: 25px"
                >
                  {{
                    $t("image_source") + ": " + getProviderName(image.provider)
                  }}
                </v-list-item-subtitle>
                <v-icon
                  v-if="idx == 0"
                  size="x-large"
                  style="position: absolute; right: 0; bottom: 5px"
                  color="orange"
                  :title="$t('tooltip.primary_image')"
                  >mdi-star-box</v-icon
                >
              </v-list-item>
            </v-card>
          </v-hover>
        </v-col>
      </v-row>
    </Container>
  </section>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import { getMediaItemImageUrl } from "@/helpers/utils";
import Toolbar from "@/components/Toolbar.vue";
import { panelViewItemResponsive } from "@/helpers/utils";
import { api } from "@/plugins/api";
import { ImageType, type MediaItemImage } from "@/plugins/api/interfaces";
import { eventbus } from "@/plugins/eventbus";
import { computed, ref } from "vue";

export interface Props {
  modelValue: MediaItemImage[];
}
const compProps = defineProps<Props>();

const expanded = ref(false);

const emit = defineEmits(["update:modelValue"]);

const openLinkInNewTab = function (url: string) {
  window.open(url, "_blank");
};

const onMenu = function (
  evt: PointerEvent | TouchEvent,
  image: MediaItemImage,
) {
  const posX = "clientX" in evt ? evt.clientX : evt.touches[0].clientX;
  const posY = "clientY" in evt ? evt.clientY : evt.touches[0].clientY;

  // open the contextmenu by emitting the event
  eventbus.emit("contextmenu", {
    items: [
      {
        label: "image_make_primary",
        icon: "mdi-star-box",
        action: () => {
          makeImagePrimary(image);
        },
      },
    ],
    posX: posX,
    posY: posY,
  });
};

const getProviderName = function (provider: string) {
  if (api.getProvider(provider)) return api.getProvider(provider)!.name;
  return provider;
};

const onClick = function (evt: PointerEvent, image: MediaItemImage) {
  openLinkInNewTab(getMediaItemImageUrl(image));
};

const toggleExpand = function () {
  expanded.value = !expanded.value;
};

const makeImagePrimary = function (image: MediaItemImage) {
  const images = [image];
  images.push(...compProps.modelValue.filter((x) => x != image));
  emit("update:modelValue", images);
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
</script>

<style scoped>
/* ThumbView panel columns */
.col-2 {
  width: 50%;
  max-width: 50%;
  flex-basis: 50%;
  padding: 8px;
}
.col-3 {
  width: 33.3%;
  max-width: 33.3%;
  flex-basis: 33.3%;
  padding: 8px;
}
.col-4 {
  width: 25%;
  max-width: 25%;
  flex-basis: 25%;
  padding: 8px;
}
.col-5 {
  width: 20%;
  max-width: 20%;
  flex-basis: 20%;
  padding: 8px;
}
.col-6 {
  width: 16.6%;
  max-width: 16.6%;
  flex-basis: 16.6%;
  padding: 8px;
}
.col-7 {
  width: 14.2%;
  max-width: 14.2%;
  flex-basis: 14.2%;
  padding: 8px;
}
.col-8 {
  width: 12.5%;
  max-width: 12.5%;
  flex-basis: 12.5%;
  padding: 8px;
}
.col-9 {
  width: 11.1%;
  max-width: 11.1%;
  flex-basis: 11.1%;
  padding: 8px;
}
.col-10 {
  width: 10%;
  max-width: 10%;
  flex-basis: 10%;
  padding: 8px;
}

.v-list-item--density-compact {
  padding: 5px !important;
}

panel-item-details :deep(.v-list-item__content) {
  height: 30px;
}

/* --- Brand polish: teal-on-hover/focus thumbnails -------------------- */
/* Each grid cell wraps a v-card.panel-item; add a calm interactive
   treatment that highlights the active/hovered/focused thumbnail with
   the brand teal. */
.panel-item {
  position: relative;
  border: 2px solid transparent;
  border-radius: 6px;
  transition:
    border-color 180ms ease,
    box-shadow 220ms ease,
    transform 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.panel-item:hover {
  border-color: rgba(45, 212, 191, 0.55);
  box-shadow:
    0 8px 22px rgba(0, 0, 0, 0.18),
    0 0 0 4px rgba(45, 212, 191, 0.08);
}

.panel-item:focus-visible,
.panel-item:has(:focus-visible) {
  outline: none;
  border-color: rgba(45, 212, 191, 1);
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.45);
}

/* The first image in each row is treated as the "active/primary" one
   (the orange star also marks it). Give it a persistent teal border. */
.col-2 .panel-item:first-child,
.col-3 .panel-item:first-child,
.col-4 .panel-item:first-child,
.col-5 .panel-item:first-child,
.col-6 .panel-item:first-child,
.col-7 .panel-item:first-child,
.col-8 .panel-item:first-child,
.col-9 .panel-item:first-child,
.col-10 .panel-item:first-child {
  /* fallback for when :has() isn't supported on the row */
}

@media (hover: none) {
  .panel-item:hover {
    border-color: transparent;
    box-shadow: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-item {
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }
}

/* Caption / metadata polish — tighter labels with a touch of tracking
   on the leading label text. */
.panel-item-details :deep(.v-list-item-title) {
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  line-height: 1.25;
}

.panel-item-details :deep(.v-list-item-subtitle) {
  font-size: 0.75rem;
  letter-spacing: 0.005em;
  opacity: 0.78;
}
</style>
