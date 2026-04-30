<template>
  <div class="panelview-item-skeleton">
    <Skeleton class="skeleton-image" />
    <div class="skeleton-info">
      <Skeleton class="skeleton-title" />
      <Skeleton class="skeleton-artist" />
    </div>
    <div class="skeleton-actions">
      <Skeleton class="skeleton-icon" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<style scoped>
.panelview-item-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.skeleton-image {
  aspect-ratio: 1;
  width: 100%;
  border-radius: 8px;
}

.skeleton-info {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 4px;
}

.skeleton-title {
  height: 16px;
  width: 85%;
}

.skeleton-artist {
  height: 14px;
  width: 60%;
}

.skeleton-actions {
  display: flex;
  gap: 8px;
  padding: 0 4px;
}

.skeleton-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

/*
 * Brand-tinted shimmer overlay on every placeholder bar.
 * Base placeholder color stays neutral (inherited from <Skeleton>);
 * the teal sweep only reads as a subtle accent, never the dominant tone.
 * 200% background-size lets us animate position to slide the gradient across.
 */
.panelview-item-skeleton :deep(.skeleton-image),
.panelview-item-skeleton :deep(.skeleton-title),
.panelview-item-skeleton :deep(.skeleton-artist),
.panelview-item-skeleton :deep(.skeleton-icon) {
  position: relative;
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(45, 212, 191, 0.08) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: panelview-skeleton-shimmer 1.5s linear infinite;
}

@keyframes panelview-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Respect users who request reduced motion — drop the sweep entirely. */
@media (prefers-reduced-motion: reduce) {
  .panelview-item-skeleton :deep(.skeleton-image),
  .panelview-item-skeleton :deep(.skeleton-title),
  .panelview-item-skeleton :deep(.skeleton-artist),
  .panelview-item-skeleton :deep(.skeleton-icon) {
    animation: none;
    background-image: none;
  }
}
</style>
