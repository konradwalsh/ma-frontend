<template>
  <div class="home-view">
    <Toolbar
      :is-discover-page="true"
      :icon="Compass"
      color="background"
      :title="$t('discover')"
    />

    <!-- Streamloader hero greeting -->
    <div class="home-hero">
      <div class="home-hero-inner">
        <div class="home-hero-text">
          <div class="home-hero-greeting">{{ greeting }}</div>
          <div class="home-hero-wordmark">streamloader</div>
        </div>
        <div class="home-hero-glow" aria-hidden="true"></div>
      </div>
    </div>

    <!-- Provider error warning banner -->
    <v-alert
      v-if="hasProviderErrors && showProviderWarning"
      variant="outlined"
      type="error"
      icon="mdi-alert-circle"
      prominent
      class="mx-5 mt-4 provider-warning-alert"
      closable
      @click:close="showProviderWarning = false"
    >
      <div class="provider-warning-content">
        <span>{{ $t("settings.provider_requires_attention_detail") }}</span>
        <v-btn
          size="small"
          color="error"
          variant="flat"
          @click="navigateToProviders"
        >
          {{ $t("settings.fix_now") }}
        </v-btn>
      </div>
    </v-alert>

    <Container variant="comfortable" class="!pr-0 home-container">
      <Suspense>
        <div class="home-widget-stack">
          <!-- Streamloader-only: surfaces THIS user's most recent cached
               tracks at the top of the feed, above the upstream rails. -->
          <StreamloaderRecentlyDownloadedRow />
          <HomeWidgetRows :edit-mode="editMode" />
        </div>
        <template #fallback>
          <div class="home-loading">
            <v-progress-circular
              indeterminate
              color="primary"
              size="42"
              width="3"
            />
            <div class="home-loading-text">loading your library...</div>
          </div>
        </template>
      </Suspense>
    </Container>
  </div>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import HomeWidgetRows from "@/components/HomeWidgetRows.vue";
import StreamloaderRecentlyDownloadedRow from "@/components/StreamloaderRecentlyDownloadedRow.vue";
import Toolbar from "@/components/Toolbar.vue";
import { api } from "@/plugins/api";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { Compass } from "lucide-vue-next";
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const editMode = ref(false);
const hasProviderErrors = ref(false);
const showProviderWarning = ref(true);
const erroredProviderType = ref<string | null>(null);

// Time-aware greeting (lowercase to match streamloader wordmark style)
const greeting = computed(() => {
  const hour = new Date().getHours();
  if (hour < 5) return "still up?";
  if (hour < 12) return "good morning";
  if (hour < 18) return "good afternoon";
  if (hour < 22) return "good evening";
  return "late night listening";
});

const navigateToProviders = () => {
  if (erroredProviderType.value) {
    router.push({
      name: "providersettings",
      query: { types: erroredProviderType.value },
    });
  } else {
    router.push({ name: "settings" });
  }
};

const handleHomescreenEditToggle = () => {
  editMode.value = !editMode.value;
};

onMounted(async () => {
  eventbus.on("homescreen-edit-toggle", handleHomescreenEditToggle);

  if (authManager.isAdmin()) {
    try {
      const configs = await api.getProviderConfigs();
      const firstError = configs.find(
        (config) => config.enabled && config.last_error,
      );
      hasProviderErrors.value = !!firstError;
      erroredProviderType.value = firstError?.type ?? null;
    } catch {
      // Ignore errors - this is a best-effort feature
    }
  }
});

onUnmounted(() => {
  eventbus.off("homescreen-edit-toggle", handleHomescreenEditToggle);
});
</script>

<style scoped>
.home-view {
  position: relative;
}

/* Streamloader hero greeting — understated, music-app feel */
.home-hero {
  position: relative;
  padding: 8px 24px 4px;
  margin-top: 4px;
  overflow: hidden;
}

.home-hero-inner {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex-wrap: wrap;
  z-index: 1;
}

.home-hero-text {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}

.home-hero-greeting {
  font-size: 1.05rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  opacity: 0.78;
  text-transform: lowercase;
}

.home-hero-wordmark {
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: lowercase;
  color: rgb(var(--v-theme-primary));
  opacity: 0.85;
}

.home-hero-wordmark::before {
  content: "·";
  margin-right: 10px;
  opacity: 0.5;
  color: rgb(var(--v-theme-on-background));
}

/* Subtle teal radial glow behind the hero — easy to miss, good when noticed */
.home-hero-glow {
  position: absolute;
  inset: -40px -20px auto auto;
  width: 320px;
  height: 120px;
  background: radial-gradient(
    ellipse at top right,
    rgba(45, 212, 191, 0.14),
    rgba(45, 212, 191, 0) 70%
  );
  pointer-events: none;
  z-index: 0;
}

:deep(.v-theme--light) .home-hero-glow {
  background: radial-gradient(
    ellipse at top right,
    rgba(15, 118, 110, 0.1),
    rgba(15, 118, 110, 0) 70%
  );
}

/* Tighten vertical air between the hero and the widget rows */
.home-container {
  padding-top: 4px;
}

.home-widget-stack {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* Provider warning — soften the default outlined alert with a teal-adjacent
   border so it sits with the brand even while it's a destructive state */
.provider-warning-alert {
  border-radius: 12px;
}

/* Branded loading state */
.home-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 64px 16px;
  opacity: 0.85;
}

.home-loading-text {
  font-size: 0.85rem;
  letter-spacing: 0.04em;
  text-transform: lowercase;
  opacity: 0.6;
  color: rgb(var(--v-theme-on-background));
}

.home-loading :deep(.v-progress-circular__overlay),
.home-loading :deep(.v-progress-circular__underlay) {
  filter: drop-shadow(0 0 6px rgba(45, 212, 191, 0.35));
}

.v-progress-circular {
  display: block;
  margin-inline: auto;
}

.editButton {
  float: right;
  margin-bottom: 10px;
}

.avatar-trigger {
  cursor: pointer;
  margin-right: 8px;
}

.avatar-trigger:hover {
  opacity: 0.9;
}

.user-avatar {
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
}

.provider-warning-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.user-header-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px;
  background-color: hsl(var(--muted) / 0.3);
  border-radius: calc(var(--radius) - 2px);
  margin-bottom: 4px;
}

@media (max-width: 600px) {
  .provider-warning-content {
    flex-direction: column;
    align-items: stretch;
  }

  .home-hero {
    padding: 6px 16px 2px;
  }

  .home-hero-greeting {
    font-size: 0.95rem;
  }

  .home-hero-wordmark {
    font-size: 0.85rem;
  }
}

@media (max-width: 575px) {
  :deep(.container-comfortable) {
    padding: 12px;
  }
}
</style>
