<template>
  <div class="listview-item-skeleton">
    <Skeleton class="skeleton-thumbnail" />
    <div class="skeleton-content">
      <Skeleton class="skeleton-title" />
      <Skeleton class="skeleton-subtitle" />
    </div>
    <Skeleton class="skeleton-duration" />
  </div>
</template>

<script setup lang="ts">
import { Skeleton } from "@/components/ui/skeleton";
</script>

<style scoped>
.listview-item-skeleton {
  display: flex;
  align-items: center;
  height: 70px;
  padding: 8px 16px;
  gap: 16px;
}

.skeleton-thumbnail {
  width: 50px;
  height: 50px;
  border-radius: 4px;
  flex-shrink: 0;
}

.skeleton-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.skeleton-title {
  height: 16px;
  width: 60%;
  max-width: 300px;
}

.skeleton-subtitle {
  height: 14px;
  width: 40%;
  max-width: 200px;
}

.skeleton-duration {
  width: 45px;
  height: 14px;
  flex-shrink: 0;
}

/*
 * Brand-tinted shimmer overlay on every placeholder bar.
 * Base placeholder color stays neutral (inherited from <Skeleton>);
 * the teal sweep only reads as a subtle accent, never the dominant tone.
 * 200% background-size lets us animate position to slide the gradient across.
 */
.listview-item-skeleton :deep(.skeleton-thumbnail),
.listview-item-skeleton :deep(.skeleton-title),
.listview-item-skeleton :deep(.skeleton-subtitle),
.listview-item-skeleton :deep(.skeleton-duration) {
  position: relative;
  background-image: linear-gradient(
    90deg,
    transparent 0%,
    rgba(45, 212, 191, 0.08) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  background-repeat: no-repeat;
  animation: listview-skeleton-shimmer 1.5s linear infinite;
}

@keyframes listview-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Respect users who request reduced motion — drop the sweep entirely. */
@media (prefers-reduced-motion: reduce) {
  .listview-item-skeleton :deep(.skeleton-thumbnail),
  .listview-item-skeleton :deep(.skeleton-title),
  .listview-item-skeleton :deep(.skeleton-subtitle),
  .listview-item-skeleton :deep(.skeleton-duration) {
    animation: none;
    background-image: none;
  }
}
</style>
