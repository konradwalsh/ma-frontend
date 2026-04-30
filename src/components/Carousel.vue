<template>
  <swiper
    class="carousel-smooth"
    :slides-per-view="panelViewItemResponsive($vuetify.display.width) + 0.5"
    :free-mode="true"
    :navigation="false"
    :mousewheel="{
      forceToAxis: true,
      releaseOnEdges: true,
    }"
    :virtual="{ enabled: true }"
  >
    <swiper-slide
      v-for="(item, index) in items"
      :key="itemKey ? itemKey(item) : index"
      :virtual-index="index"
    >
      <slot :item="item" :index="index"></slot>
    </swiper-slide>
  </swiper>
</template>

<script setup lang="ts" generic="T">
import { panelViewItemResponsive } from "@/helpers/utils";
import { onMounted } from "vue";

defineProps<{
  items: T[];
  itemKey?: (item: T) => string | number;
}>();

defineSlots<{
  default(props: { item: T; index: number }): void;
}>();

onMounted(() => {
  document.documentElement.style.setProperty(
    "--swiper-navigation-color",
    "primary",
  );
});
</script>

<style scoped>
/* Smooth slide transition + teal accents for any swiper-rendered controls */
.carousel-smooth :deep(.swiper-wrapper) {
  transition-timing-function: cubic-bezier(0.34, 1.36, 0.64, 1);
}

/* Pagination dots — teal active + teal hover */
.carousel-smooth :deep(.swiper-pagination-bullet) {
  transition:
    background-color 200ms ease,
    transform 200ms ease,
    opacity 200ms ease;
}
.carousel-smooth :deep(.swiper-pagination-bullet-active) {
  background: #2dd4bf;
}
.carousel-smooth :deep(.swiper-pagination-bullet:hover) {
  background: #2dd4bf;
  opacity: 0.8;
}

/* Navigation arrows — teal hover wash + focus-visible ring */
.carousel-smooth :deep(.swiper-button-prev),
.carousel-smooth :deep(.swiper-button-next) {
  border-radius: 50%;
  transition:
    background-color 200ms ease,
    color 200ms ease,
    box-shadow 200ms ease;
}
.carousel-smooth :deep(.swiper-button-prev:hover),
.carousel-smooth :deep(.swiper-button-next:hover) {
  background-color: rgba(45, 212, 191, 0.08);
  color: #2dd4bf;
}
.carousel-smooth :deep(.swiper-button-prev:focus-visible),
.carousel-smooth :deep(.swiper-button-next:focus-visible) {
  outline: none;
  box-shadow: 0 0 0 2px #2dd4bf;
}

@media (hover: none) {
  .carousel-smooth :deep(.swiper-pagination-bullet:hover),
  .carousel-smooth :deep(.swiper-button-prev:hover),
  .carousel-smooth :deep(.swiper-button-next:hover) {
    background-color: transparent;
    color: inherit;
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .carousel-smooth :deep(.swiper-wrapper),
  .carousel-smooth :deep(.swiper-pagination-bullet),
  .carousel-smooth :deep(.swiper-button-prev),
  .carousel-smooth :deep(.swiper-button-next) {
    transition: none;
  }
}
</style>
