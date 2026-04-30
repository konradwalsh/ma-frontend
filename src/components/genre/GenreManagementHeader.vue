<template>
  <Card class="genre-management-header overflow-hidden">
    <div class="genre-management-header__accent" aria-hidden="true"></div>
    <CardHeader>
      <div class="flex items-center gap-4">
        <div
          class="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20"
        >
          <GenreIcon class="size-6 text-primary" />
        </div>
        <div class="min-w-0">
          <CardTitle
            class="text-xl font-semibold tracking-tight text-foreground"
          >
            {{ $t("settings.genre_management") }}
          </CardTitle>
          <CardDescription class="mt-1 text-sm text-muted-foreground">
            {{ $t("settings.genre_management_description") }}
          </CardDescription>
        </div>
      </div>
    </CardHeader>
  </Card>
</template>

<script setup lang="ts">
import GenreIcon from "@/components/icons/GenreIcon.vue";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
</script>

<style scoped>
.genre-management-header {
  position: relative;
}

.genre-management-header__accent {
  position: absolute;
  inset: 0 0 auto 0;
  height: 2px;
  background: linear-gradient(
    90deg,
    hsl(var(--primary) / 0) 0%,
    hsl(var(--primary) / 0.6) 35%,
    hsl(var(--primary) / 0.6) 65%,
    hsl(var(--primary) / 0) 100%
  );
  pointer-events: none;
}
</style>
