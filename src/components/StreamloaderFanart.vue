<template>
  <!-- Streamloader-fork addition: blurred-fanart background for detail
       pages (album / artist / playlist / podcast / audiobook / track).
       Renders a heavy-blur cover-art wash behind the existing hero
       content with a teal vignette to bring focus inward. Hidden when
       no src is provided. Crossfades on src change (300ms) — dropped
       under prefers-reduced-motion. Mobile/no-hover devices fall back
       to a lighter blur to keep backdrop-filter affordable. -->
  <div class="sl-fanart-root" aria-hidden="true">
    <transition name="sl-fanart-fade">
      <div
        v-if="src"
        :key="src"
        class="sl-fanart-layer"
        :style="{ backgroundImage: `url(${src})` }"
      ></div>
    </transition>
    <div v-if="src" class="sl-fanart-vignette"></div>
  </div>
</template>

<script setup lang="ts">
// Streamloader-fork addition: see template header comment. The src
// prop is the cover-art URL (typically resolved via getImageThumbForItem
// with FANART → LANDSCAPE → THUMB fallback in InfoHeader).
defineProps<{ src?: string | null }>();
</script>

<style scoped>
.sl-fanart-root {
  position: absolute;
  inset: 0;
  overflow: hidden;
  z-index: 0;
  pointer-events: none;
}

.sl-fanart-layer {
  position: absolute;
  /* Inflate beyond the box so the blur's soft edge doesn't reveal a
     hard cutoff at the hero's borders. */
  inset: -10%;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  filter: blur(60px) saturate(1.4) brightness(0.4);
  opacity: 0.5;
  will-change: opacity;
}

/* Light theme: lower opacity so foreground text remains legible against
   the lighter card background. */
:global(.v-theme--light) .sl-fanart-layer {
  opacity: 0.25;
}

/* Brand-teal vignette — pulls focus toward the center of the hero. */
.sl-fanart-vignette {
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at center,
    transparent 40%,
    rgba(45, 212, 191, 0.08) 75%,
    rgba(45, 212, 191, 0.18) 100%
  );
}

/* Crossfade between covers when navigating album → album. */
.sl-fanart-fade-enter-active,
.sl-fanart-fade-leave-active {
  transition: opacity 300ms ease;
}
.sl-fanart-fade-enter-from,
.sl-fanart-fade-leave-to {
  opacity: 0 !important;
}

@media (prefers-reduced-motion: reduce) {
  .sl-fanart-fade-enter-active,
  .sl-fanart-fade-leave-active {
    transition: none;
  }
}

/* Mobile / touch devices: heavy backdrop-style blur is expensive on
   mobile GPUs. Drop the blur radius and saturation boost to keep the
   detail page scrolling smoothly. */
@media (max-width: 600px) and (hover: none) {
  .sl-fanart-layer {
    filter: blur(24px) saturate(1.2) brightness(0.45);
  }
}
</style>
