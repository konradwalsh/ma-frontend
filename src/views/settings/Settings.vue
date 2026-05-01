<template>
  <div>
    <Toolbar :icon="Settings">
      <template #title>
        <v-breadcrumbs
          :items="breadcrumbItems"
          class="pa-0 settings-breadcrumbs"
        />
      </template>
      <template #append>
        <v-btn
          v-if="isOverview"
          :icon="settingsViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          :aria-label="t('tooltip.toggle_view_mode')"
          @click="toggleSettingsViewMode()"
        />
        <v-btn
          v-if="isPlayersPage"
          :icon="playersViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          :aria-label="t('tooltip.toggle_view_mode')"
          @click="togglePlayersViewMode()"
        />
        <v-btn
          v-if="isProvidersPage"
          :icon="providersViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          :aria-label="t('tooltip.toggle_view_mode')"
          @click="toggleProvidersViewMode()"
        />
        <v-btn
          v-if="isTasksPage"
          :icon="tasksViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          :aria-label="t('tooltip.toggle_view_mode')"
          @click="toggleTasksViewMode()"
        />
        <v-btn
          v-if="isSystemPage"
          :icon="systemViewMode === 'list' ? 'mdi-view-list' : 'mdi-grid'"
          variant="text"
          :title="t('tooltip.toggle_view_mode')"
          :aria-label="t('tooltip.toggle_view_mode')"
          @click="toggleSystemViewMode()"
        />
        <v-btn
          v-if="documentationUrl"
          icon="mdi-help-circle"
          variant="text"
          :title="t('settings.view_documentation')"
          :aria-label="t('settings.view_documentation')"
          @click="openLinkInNewTab(documentationUrl)"
        />
      </template>
    </Toolbar>

    <v-divider />

    <Container
      v-if="isOverview"
      variant="comfortable"
      class="settings-overview"
    >
      <!-- Search + Recent (Streamloader-fork addition: organize landing) -->
      <div class="settings-toolbar">
        <div class="settings-search-wrap">
          <Icon icon="mdi-magnify" size="20" class="settings-search-icon" />
          <input
            v-model="searchQuery"
            type="text"
            class="settings-search-input"
            :placeholder="t('search')"
            :aria-label="t('search')"
          />
          <button
            v-if="searchQuery"
            type="button"
            class="settings-search-clear"
            :title="t('close')"
            @click="searchQuery = ''"
          >
            <Icon icon="mdi-close-circle" size="18" />
          </button>
        </div>

        <div
          v-if="!searchQuery && recentSections.length > 0"
          class="settings-recent"
        >
          <span class="settings-recent-label">{{ t("recent") }}:</span>
          <button
            v-for="section in recentSections"
            :key="`recent-${section.name}`"
            type="button"
            class="settings-recent-chip"
            @click="navigateToSection(section)"
          >
            <span
              class="settings-recent-dot"
              :style="getIconBackgroundStyle(section.color)"
            ></span>
            {{ t(section.label) }}
          </button>
        </div>
      </div>

      <!-- Onboarding welcome message -->
      <div v-if="store.isOnboarding" class="onboarding-card">
        <div class="onboarding-header">
          <div>
            <h2 class="onboarding-title">
              {{ t("settings.onboarding_title") }}
            </h2>
            <p class="onboarding-subtitle">
              {{ t("settings.onboarding_subtitle") }}
            </p>
          </div>
          <v-btn
            icon="mdi-close"
            variant="text"
            size="small"
            class="onboarding-close"
            @click="store.isOnboarding = false"
          />
        </div>

        <div class="onboarding-sections">
          <div class="onboarding-section">
            <div class="section-icon music">
              <v-icon icon="mdi-music" size="24" />
            </div>
            <div class="section-content">
              <h3>{{ t("settings.onboarding_music_title") }}</h3>
              <p>{{ t("settings.onboarding_music_desc") }}</p>
            </div>
            <v-btn
              color="primary"
              variant="flat"
              class="section-btn"
              @click="
                router.push({
                  name: 'providersettings',
                  query: { types: 'music' },
                })
              "
            >
              {{ t("settings.onboarding_add_music") }}
            </v-btn>
          </div>

          <div class="onboarding-section">
            <div class="section-icon player">
              <v-icon icon="mdi-speaker" size="24" />
            </div>
            <div class="section-content">
              <h3>{{ t("settings.onboarding_player_title") }}</h3>
              <p>{{ t("settings.onboarding_player_desc") }}</p>
            </div>
            <v-btn
              color="primary"
              variant="flat"
              class="section-btn"
              @click="
                router.push({
                  name: 'providersettings',
                  query: { types: 'player' },
                })
              "
            >
              {{ t("settings.onboarding_add_player") }}
            </v-btn>
          </div>
        </div>

        <p class="onboarding-footer">
          <v-icon icon="mdi-information-outline" size="16" class="mr-1" />
          {{ t("settings.onboarding_footer") }}
        </p>
      </div>

      <div v-if="settingsViewMode === 'card'" class="settings-card-view">
        <transition-group name="settings-group-fade" tag="div">
          <section
            v-for="group in visibleGroups"
            :key="group.id"
            class="settings-group"
          >
            <div class="settings-group-header">
              <span class="settings-group-title">{{ t(group.label) }}</span>
              <span class="settings-group-divider"></span>
            </div>
            <div
              :class="
                group.id === 'players_dsp'
                  ? 'settings-featured'
                  : 'settings-grid'
              "
            >
              <Card
                v-for="section in group.sections"
                :key="section.name"
                class="setting-card"
                tabindex="0"
                role="button"
                @click="navigateToSection(section)"
                @keydown.enter.prevent="navigateToSection(section)"
                @keydown.space.prevent="navigateToSection(section)"
              >
                <CardHeader>
                  <div class="setting-header-top">
                    <div
                      class="setting-icon"
                      :style="getIconBackgroundStyle(section.color)"
                    >
                      <Icon :icon="section.icon" size="20" color="white" />
                    </div>
                    <div class="setting-header-right">
                      <span
                        v-if="badgeForSection(section.name)"
                        class="setting-badge"
                        :class="`setting-badge--${badgeForSection(section.name)!.tone}`"
                      >
                        {{ badgeForSection(section.name)!.text }}
                      </span>
                      <div class="setting-chevron">
                        <Icon icon="mdi-chevron-right" size="20" />
                      </div>
                    </div>
                  </div>
                  <CardTitle class="setting-title">
                    {{ t(section.label) }}
                  </CardTitle>
                  <CardDescription class="setting-description">
                    {{ t(section.description) }}
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </section>
        </transition-group>

        <div v-if="visibleGroups.length === 0" class="settings-empty">
          <Icon icon="mdi-magnify-close" size="32" />
          <p>{{ t("no_results") }}</p>
        </div>
      </div>

      <div v-else class="settings-list-view">
        <transition-group name="settings-group-fade" tag="div">
          <section
            v-for="group in visibleGroups"
            :key="`list-${group.id}`"
            class="settings-group"
          >
            <div class="settings-group-header">
              <span class="settings-group-title">{{ t(group.label) }}</span>
              <span class="settings-group-divider"></span>
            </div>
            <v-list class="settings-list">
              <ListItem
                v-for="section in group.sections"
                :key="section.name"
                link
                class="settings-list-item"
                @click="navigateToSection(section)"
              >
                <template #prepend>
                  <div
                    class="setting-list-icon"
                    :style="getIconBackgroundStyle(section.color)"
                  >
                    <Icon :icon="section.icon" size="20" color="white" />
                  </div>
                </template>
                <template #title>
                  <div class="settings-list-title-row">
                    <span>{{ t(section.label) }}</span>
                    <span
                      v-if="badgeForSection(section.name)"
                      class="setting-badge"
                      :class="`setting-badge--${badgeForSection(section.name)!.tone}`"
                    >
                      {{ badgeForSection(section.name)!.text }}
                    </span>
                  </div>
                </template>
                <template #subtitle>
                  {{ t(section.description) }}
                </template>
                <template #append>
                  <Icon icon="mdi-chevron-right" size="20" />
                </template>
              </ListItem>
            </v-list>
          </section>
        </transition-group>

        <div v-if="visibleGroups.length === 0" class="settings-empty">
          <Icon icon="mdi-magnify-close" size="32" />
          <p>{{ t("no_results") }}</p>
        </div>
      </div>
    </Container>

    <router-view v-else v-slot="{ Component }">
      <component :is="Component" v-if="Component" />
    </router-view>
  </div>
</template>

<script setup lang="ts">
import Container from "@/components/Container.vue";
import Icon from "@/components/Icon.vue";
import ListItem from "@/components/ListItem.vue";
import Toolbar from "@/components/Toolbar.vue";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUserPreferences } from "@/composables/userPreferences";
import { openLinkInNewTab } from "@/helpers/utils";
import { api } from "@/plugins/api";
import { requireServerVersion } from "@/plugins/api/helpers";
import { ProviderType } from "@/plugins/api/interfaces";
import { authManager } from "@/plugins/auth";
import { store } from "@/plugins/store";
import { Settings } from "lucide-vue-next";
import { match } from "ts-pattern";
import { computed, provide, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter, type RouteLocationRaw } from "vue-router";
import { useDisplay } from "vuetify";

// global refs
const router = useRouter();
const { t } = useI18n();
const { getPreference, setPreference } = useUserPreferences();
const { mobile } = useDisplay();

const settingsViewMode = ref<"list" | "card">("card");
const settingsListPrependGap = computed(() => (mobile.value ? 4 : 24));
const savedSettingsViewMode = getPreference<"list" | "card">(
  "settings.overview.viewMode",
  "card",
);

watch(
  () => savedSettingsViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      settingsViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleSettingsViewMode = function () {
  settingsViewMode.value = settingsViewMode.value === "list" ? "card" : "list";
  setPreference("settings.overview.viewMode", settingsViewMode.value);
};

const playersViewMode = ref<"list" | "card">("list");
const isPlayersPage = computed(() => {
  const name = router.currentRoute.value.name?.toString() || "";
  return name.includes("players") || name === "addgroup";
});

const savedPlayersViewMode = getPreference<"list" | "card">(
  "settings.players.viewMode",
  "list",
);

watch(
  () => savedPlayersViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      playersViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const togglePlayersViewMode = function () {
  playersViewMode.value = playersViewMode.value === "list" ? "card" : "list";
  setPreference("settings.players.viewMode", playersViewMode.value);
};

provide("playersViewMode", {
  viewMode: playersViewMode,
  toggleViewMode: togglePlayersViewMode,
});

const providersViewMode = ref<"list" | "card">("list");
const isProvidersPage = computed(() => {
  const name = router.currentRoute.value.name?.toString() || "";
  return name.includes("providers");
});

const savedProvidersViewMode = getPreference<"list" | "card">(
  "settings.providers.viewMode",
  "list",
);

watch(
  () => savedProvidersViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      providersViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleProvidersViewMode = function () {
  providersViewMode.value =
    providersViewMode.value === "list" ? "card" : "list";
  setPreference("settings.providers.viewMode", providersViewMode.value);
};

provide("providersViewMode", {
  viewMode: providersViewMode,
  toggleViewMode: toggleProvidersViewMode,
});

const tasksViewMode = ref<"list" | "card">("list");
const isTasksPage = computed(
  () => router.currentRoute.value.name?.toString() === "backgroundtasks",
);

const savedTasksViewMode = getPreference<"list" | "card">(
  "settings.tasks.viewMode",
  "list",
);

watch(
  () => savedTasksViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      tasksViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleTasksViewMode = function () {
  tasksViewMode.value = tasksViewMode.value === "list" ? "card" : "list";
  setPreference("settings.tasks.viewMode", tasksViewMode.value);
};

provide("tasksViewMode", {
  viewMode: tasksViewMode,
  toggleViewMode: toggleTasksViewMode,
});

const isSystemPage = computed(
  () => router.currentRoute.value.name?.toString() === "systemsettings",
);

const systemViewMode = ref<"list" | "card">("list");
const savedSystemViewMode = getPreference<"list" | "card">(
  "settings.system.viewMode",
  "list",
);

watch(
  () => savedSystemViewMode.value,
  (savedViewMode) => {
    if (savedViewMode === "list" || savedViewMode === "card") {
      systemViewMode.value = savedViewMode;
    }
  },
  { immediate: true },
);

const toggleSystemViewMode = function () {
  systemViewMode.value = systemViewMode.value === "list" ? "card" : "list";
  setPreference("settings.system.viewMode", systemViewMode.value);
};

provide("systemViewMode", {
  viewMode: systemViewMode,
  toggleViewMode: toggleSystemViewMode,
});

const allSettingsSections = [
  {
    name: "music_providers",
    label: "settings.music_sources",
    description: "settings.music_providers_description",
    icon: "mdi-music",
    color: "blue",
    route: { name: "providersettings", query: { types: "music" } },
    adminOnly: true,
  },
  {
    name: "player_providers",
    label: "settings.playerproviders",
    description: "settings.player_providers_description",
    icon: "mdi-speaker-multiple",
    color: "green",
    route: { name: "providersettings", query: { types: "player" } },
    adminOnly: true,
  },
  {
    name: "metadata_providers",
    label: "settings.metadataproviders",
    description: "settings.metadata_providers_description",
    icon: "mdi-file-code",
    color: "indigo",
    route: { name: "providersettings", query: { types: "metadata" } },
    adminOnly: true,
  },
  {
    name: "plugin_providers",
    label: "settings.plugins",
    description: "settings.plugin_providers_description",
    icon: "mdi-puzzle",
    color: "deep-purple",
    route: { name: "providersettings", query: { types: "plugin" } },
    adminOnly: true,
  },
  {
    name: "players",
    label: "settings.players",
    description: "settings.players_description",
    icon: "mdi-tune",
    color: "teal",
    route: { name: "playersettings" },
    adminOnly: true,
  },
  {
    name: "audio_analysis_providers",
    label: "settings.audio_analysis_providers",
    description: "settings.audio_analysis_providers_description",
    icon: "mdi-waveform",
    color: "blue",
    route: { name: "providersettings", query: { types: "audio_analysis" } },
    adminOnly: true,
    minServerVersion: "2.9.0",
  },
  {
    name: "profile",
    label: "auth.profile",
    description: "settings.profile_description",
    icon: "mdi-account-cog",
    color: "indigo",
    route: { name: "profile" },
    adminOnly: false,
  },
  {
    name: "frontend",
    label: "settings.frontend",
    description: "settings.frontend_description",
    icon: "mdi-palette",
    color: "orange",
    route: { name: "frontendsettings" },
    adminOnly: false,
  },
  {
    // Streamloader-fork addition: consolidated landing page for
    // streamloader-only UX knobs. Sits next to "frontend" since both are
    // user-facing display preferences (admin-free).
    name: "streamloader",
    label: "settings.streamloader",
    description: "settings.streamloader_description",
    icon: "mdi-harddisk",
    color: "teal",
    route: { name: "streamloadersettings" },
    adminOnly: false,
  },
  {
    name: "users",
    label: "auth.user_management",
    description: "settings.users_description",
    icon: "mdi-account-multiple",
    color: "teal",
    route: { name: "usersettings" },
    adminOnly: true,
  },
  {
    name: "remote_access",
    label: "settings.remote_access",
    description: "settings.remote_access_description",
    icon: "mdi-cloud-lock",
    color: "deep-purple",
    route: { name: "remoteaccesssettings" },
    adminOnly: true,
  },
  {
    name: "system",
    label: "settings.system",
    description: "settings.system_description",
    icon: "mdi-server",
    color: "purple",
    route: { name: "systemsettings" },
    adminOnly: true,
  },
  {
    name: "about",
    label: "settings.about",
    description: "settings.about_description",
    icon: "mdi-information-outline",
    color: "grey-darken-1",
    route: { name: "aboutsettings" },
    adminOnly: false,
  },
];

const settingsSections = computed(() => {
  const isAdmin = authManager.isAdmin();
  return allSettingsSections.filter(
    (section) =>
      (!section.adminOnly || isAdmin) &&
      (!section.minServerVersion ||
        requireServerVersion(section.minServerVersion)),
  );
});

const providerSectionNames = [
  "music_providers",
  "player_providers",
  "metadata_providers",
  "plugin_providers",
  "audio_analysis_providers",
];

const musicSections = computed(() => {
  return settingsSections.value.filter(
    (section) => section.name === "music_providers",
  );
});

const playerSections = computed(() => {
  return settingsSections.value.filter((section) => section.name === "players");
});

const regularSections = computed(() => {
  return settingsSections.value.filter(
    (section) =>
      section.name !== "music_providers" && section.name !== "players",
  );
});

const providersSection = computed(() => {
  return settingsSections.value.filter((section) =>
    providerSectionNames.includes(section.name),
  );
});

const playersSection = computed(() => {
  return settingsSections.value.filter((section) => section.name === "players");
});

const otherSettingsSections = computed(() => {
  return settingsSections.value.filter(
    (section) =>
      !providerSectionNames.includes(section.name) &&
      section.name !== "players",
  );
});

// Streamloader-fork addition: grouped sections, search, recent, and badges
// for the settings landing page.
type SettingsSection = (typeof allSettingsSections)[number];

interface SettingsGroup {
  id: string;
  label: string;
  sectionNames: string[];
}

const SETTINGS_GROUPS: SettingsGroup[] = [
  {
    id: "players_dsp",
    label: "settings.group.players_dsp",
    sectionNames: ["music_providers", "players", "player_providers"],
  },
  {
    id: "library_providers",
    label: "settings.group.library_providers",
    sectionNames: [
      "metadata_providers",
      "audio_analysis_providers",
      "plugin_providers",
    ],
  },
  {
    id: "streamloader",
    label: "settings.group.streamloader",
    sectionNames: ["streamloader", "frontend"],
  },
  {
    id: "system_logs",
    label: "settings.group.system_logs",
    sectionNames: ["system", "users", "remote_access", "profile"],
  },
  {
    id: "about",
    label: "settings.group.about",
    sectionNames: ["about"],
  },
];

const searchQuery = ref("");

const sectionMatchesQuery = (section: SettingsSection, q: string) => {
  if (!q) return true;
  const haystack =
    `${t(section.label)} ${t(section.description)}`.toLowerCase();
  return haystack.includes(q.toLowerCase());
};

const visibleGroups = computed(() => {
  const available = settingsSections.value;
  const byName = new Map(available.map((s) => [s.name, s]));
  const used = new Set<string>();
  const q = searchQuery.value.trim();

  const groups = SETTINGS_GROUPS.map((g) => {
    const sections = g.sectionNames
      .map((n) => byName.get(n))
      .filter((s): s is SettingsSection => Boolean(s))
      .filter((s) => sectionMatchesQuery(s, q));
    sections.forEach((s) => used.add(s.name));
    return { ...g, sections };
  });

  // Pick up any sections not assigned to a group above so nothing disappears
  // if a future setting is added without updating SETTINGS_GROUPS.
  const leftover = available
    .filter((s) => !used.has(s.name))
    .filter((s) => sectionMatchesQuery(s, q));
  if (leftover.length > 0) {
    groups.push({
      id: "other",
      label: "settings.group.other",
      sectionNames: leftover.map((s) => s.name),
      sections: leftover,
    });
  }

  return groups.filter((g) => g.sections.length > 0);
});

// Badges driven by existing reactive sources.
const offlineProviderCount = computed(() => {
  try {
    return Object.values(api.providers).filter((p) => p && !p.available).length;
  } catch {
    return 0;
  }
});

// Optional: server may expose an update flag in future; keep optional read.
const updateAvailable = computed(() => {
  const info = api.serverInfo.value as Record<string, unknown> | undefined;
  if (!info) return false;
  return Boolean((info as { update_available?: boolean }).update_available);
});

const badgeForSection = (
  name: string,
): { text: string; tone: "warn" | "info" } | null => {
  if (
    (name === "player_providers" ||
      name === "music_providers" ||
      name === "metadata_providers" ||
      name === "plugin_providers" ||
      name === "audio_analysis_providers") &&
    offlineProviderCount.value > 0
  ) {
    return { text: t("settings.backend_offline"), tone: "warn" };
  }
  if (name === "about" && updateAvailable.value) {
    return { text: t("settings.update_available"), tone: "info" };
  }
  return null;
};

// Recently visited settings (stored in localStorage, last 3).
const RECENT_KEY = "settings.recent.v1";
const RECENT_MAX = 3;
const recentNames = ref<string[]>([]);

const loadRecent = () => {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) {
      recentNames.value = [];
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentNames.value = parsed.filter(
        (x): x is string => typeof x === "string",
      );
    }
  } catch {
    recentNames.value = [];
  }
};

const persistRecent = (name: string) => {
  try {
    const next = [name, ...recentNames.value.filter((n) => n !== name)].slice(
      0,
      RECENT_MAX,
    );
    recentNames.value = next;
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // ignore localStorage errors (private mode, quota, etc.)
  }
};

loadRecent();

const recentSections = computed(() => {
  const byName = new Map(settingsSections.value.map((s) => [s.name, s]));
  return recentNames.value
    .map((n) => byName.get(n))
    .filter((s): s is SettingsSection => Boolean(s));
});

const navigateToSection = (section: SettingsSection) => {
  persistRecent(section.name);
  router.push(section.route);
};

const getIconBackgroundStyle = (color: string) => {
  const colorMap: Record<string, string> = {
    indigo: "rgb(99, 102, 241)",
    blue: "rgb(59, 130, 246)",
    green: "rgb(34, 197, 94)",
    purple: "rgb(168, 85, 247)",
    "deep-purple": "rgb(124, 58, 237)",
    orange: "rgb(249, 115, 22)",
    teal: "rgb(20, 184, 166)",
    "grey-darken-1": "rgb(158, 158, 158)",
  };
  return { backgroundColor: colorMap[color] || colorMap.indigo };
};

// computed properties
const isOverview = computed(() => {
  return router.currentRoute.value.name === "settings";
});

const activeTab = computed(() => {
  const name = router.currentRoute.value.name?.toString() || "";
  if (name === "profile") {
    return "profile";
  }
  if (name.includes("player") || name === "addgroup") {
    return "players";
  }
  if (
    name.includes("system") ||
    name.includes("core") ||
    name.includes("serverlog") ||
    name === "backgroundtasks" ||
    name === "genremanagement"
  ) {
    return "system";
  }
  if (name.includes("frontend")) {
    return "frontend";
  }
  if (name.includes("streamloader")) {
    return "streamloader";
  }
  if (name.includes("remoteaccess")) {
    return "remote_access";
  }
  if (name.includes("user")) {
    return "users";
  }
  if (name.includes("about")) {
    return "about";
  }

  const typesQuery = router.currentRoute.value.query.types as
    | string
    | undefined;
  const firstType = typesQuery ? typesQuery.split(",")[0].trim() : undefined;
  if (firstType === "music") return "music_providers";
  if (firstType === "player") return "player_providers";
  if (firstType === "metadata") return "metadata_providers";
  if (firstType === "plugin") return "plugin_providers";
  if (firstType === "audio_analysis") return "audio_analysis_providers";

  if (name === "editprovider") {
    const instanceId = router.currentRoute.value.params.instanceId as string;
    const provider = api.getProvider(instanceId);
    if (provider) {
      if (provider.type === ProviderType.MUSIC) return "music_providers";
      if (provider.type === ProviderType.PLAYER) return "player_providers";
      if (provider.type === ProviderType.METADATA) return "metadata_providers";
      if (provider.type === ProviderType.PLUGIN) return "plugin_providers";
      if (provider.type === ProviderType.AUDIO_ANALYSIS)
        return "audio_analysis_providers";
    }
  }

  if (name === "addproviderdetails") {
    const domain = router.currentRoute.value.params.domain as string;
    const manifest = api.providerManifests[domain];
    if (manifest) {
      if (manifest.type === ProviderType.MUSIC) return "music_providers";
      if (manifest.type === ProviderType.PLAYER) return "player_providers";
      if (manifest.type === ProviderType.METADATA) return "metadata_providers";
      if (manifest.type === ProviderType.PLUGIN) return "plugin_providers";
      if (manifest.type === ProviderType.AUDIO_ANALYSIS)
        return "audio_analysis_providers";
    }
  }
  return "music_providers";
});

const getProviderName = (instanceId: string) => {
  const providerInstance = api.getProvider(instanceId);
  if (providerInstance) {
    return providerInstance.name;
  }
  const providerDomain = instanceId.split("--")[0];
  const manifest = api.providerManifests[providerDomain];
  return manifest?.name || instanceId;
};

const breadcrumbItems = computed(() => {
  const route = router.currentRoute.value;
  const name = route.name?.toString() || "";

  const items: Array<{
    title: string;
    disabled: boolean;
    href?: string;
    to?: RouteLocationRaw;
  }> = [
    {
      title: t("settings.settings"),
      disabled: false,
      href: "#",
      to: { name: "settings" },
    },
  ];

  if (!isOverview.value) {
    const currentTab = activeTab.value;
    if (currentTab === "profile") {
      items.push({
        title: t("auth.profile"),
        disabled: name === "profile",
        to: { name: "profile" },
      });
    } else if (currentTab === "players") {
      items.push({
        title: t("settings.players"),
        disabled: name === "playersettings",
        to: { name: "playersettings" },
      });
    } else if (currentTab === "system") {
      if (!(name === "backgroundtasks" && !authManager.isAdmin())) {
        items.push({
          title: t("settings.system"),
          disabled: name === "systemsettings",
          to: { name: "systemsettings" },
        });
      }
    } else if (currentTab === "remote_access") {
      items.push({
        title: t("settings.remote_access"),
        disabled: name === "remoteaccesssettings",
        to: { name: "remoteaccesssettings" },
      });
    } else if (currentTab === "frontend") {
      items.push({
        title: t("settings.frontend"),
        disabled: name === "frontendsettings",
        to: { name: "frontendsettings" },
      });
    } else if (currentTab === "streamloader") {
      items.push({
        title: t("settings.streamloader"),
        disabled: name === "streamloadersettings",
        to: { name: "streamloadersettings" },
      });
    } else if (currentTab === "users") {
      items.push({
        title: t("settings.users"),
        disabled: name === "usersettings",
        to: { name: "usersettings" },
      });
    } else if (currentTab === "music_providers") {
      items.push({
        title: t("settings.music_sources"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "music" } },
      });
    } else if (currentTab === "player_providers") {
      items.push({
        title: t("settings.playerproviders"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "player" } },
      });
    } else if (currentTab === "metadata_providers") {
      items.push({
        title: t("settings.metadataproviders"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "metadata" } },
      });
    } else if (currentTab === "plugin_providers") {
      items.push({
        title: t("settings.plugins"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "plugin" } },
      });
    } else if (currentTab === "audio_analysis_providers") {
      items.push({
        title: t("settings.audio_analysis_providers"),
        disabled: name === "providersettings",
        to: { name: "providersettings", query: { types: "audio_analysis" } },
      });
    } else if (currentTab === "about") {
      items.push({
        title: t("settings.about"),
        disabled: name === "aboutsettings",
        to: { name: "aboutsettings" },
      });
    }
  }

  match(name)
    .with("addproviderdetails", () => {
      items.push({
        title: t("settings.setup_provider", [route.params.domain || ""]),
        disabled: true,
      });
    })
    .with("editprovider", () => {
      items.push({
        title: getProviderName(route.params.instanceId as string),
        disabled: true,
      });
    })
    .with("addgroup", () => {
      items.push({ title: t("settings.add_group_player"), disabled: true });
    })
    .with("editplayer", () => {
      items.push({ title: t("settings.player_settings"), disabled: true });
    })
    .with("editplayerdsp", () => {
      items.push({ title: "DSP", disabled: true });
    })
    .with("editplayeroptions", () => {
      items.push({ title: t("settings.category.options"), disabled: true });
    })
    .with("editcore", () => {
      const domain = route.params.domain as string;
      const translated = t(`settings.core_module.${domain}.name`);
      const moduleName =
        translated !== `settings.core_module.${domain}.name`
          ? translated
          : api.providerManifests[domain]?.name || domain;
      items.push({
        title: moduleName,
        disabled: true,
      });
    })
    .with("serverlogs", () => {
      items.push({
        title: t("settings.server_logging"),
        disabled: true,
      });
    })
    .with("backgroundtasks", () => {
      items.push({
        title: t("background_tasks.title"),
        disabled: true,
      });
    })
    .with("genremanagement", () => {
      items.push({
        title: t("settings.genre_management"),
        disabled: true,
      });
    })
    .otherwise(() => {
      return;
    });

  return items;
});

const documentationUrl = computed(() => {
  const route = router.currentRoute.value;
  const name = route.name?.toString() || "";

  // Show documentation link for editcore, editprovider, and addproviderdetails routes
  if (name === "editcore") {
    const domain = route.params.domain as string;
    if (domain && api.providerManifests[domain]) {
      return api.providerManifests[domain].documentation || null;
    }
  } else if (name === "editprovider") {
    const instanceId = route.params.instanceId as string;
    if (instanceId) {
      const provider = api.getProvider(instanceId);
      if (provider && api.providerManifests[provider.domain]) {
        return api.providerManifests[provider.domain].documentation || null;
      }
    }
  } else if (name === "addproviderdetails") {
    const domain = route.params.domain as string;
    if (domain && api.providerManifests[domain]) {
      return api.providerManifests[domain].documentation || null;
    }
  }

  return null;
});
</script>

<style scoped>
.settings-overview {
  max-width: 1200px !important;
  margin: 0 auto;
}

.settings-breadcrumbs :deep(.v-breadcrumbs-item) {
  font-weight: 500;
  letter-spacing: -0.01em;
  font-size: 0.95rem;
}

.settings-breadcrumbs :deep(.v-breadcrumbs-item--disabled) {
  opacity: 1;
  color: rgb(var(--v-theme-on-surface));
}

.settings-breadcrumbs :deep(.v-breadcrumbs-divider) {
  opacity: 0.5;
  padding: 0 4px;
}

.settings-card-view {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Streamloader-fork: group + search + recent + badge styles */
.settings-toolbar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.settings-search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  background: rgba(var(--v-theme-surface), 0.7);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  padding: 0 36px 0 38px;
  height: 40px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.settings-search-wrap:focus-within {
  border-color: rgba(20, 184, 166, 0.55);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
}

.settings-search-icon {
  position: absolute;
  left: 12px;
  opacity: 0.55;
  pointer-events: none;
}

.settings-search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.95rem;
  height: 100%;
}

.settings-search-clear {
  position: absolute;
  right: 8px;
  background: transparent;
  border: none;
  cursor: pointer;
  opacity: 0.55;
  display: flex;
  align-items: center;
  padding: 4px;
  border-radius: 50%;
  color: inherit;
}

.settings-search-clear:hover {
  opacity: 1;
}

.settings-recent {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.settings-recent-label {
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(var(--v-theme-on-surface), 0.55);
}

.settings-recent-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(20, 184, 166, 0.08);
  border: 1px solid rgba(20, 184, 166, 0.25);
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.85rem;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    transform 0.15s ease;
}

.settings-recent-chip:hover {
  background: rgba(20, 184, 166, 0.16);
  border-color: rgba(20, 184, 166, 0.45);
  transform: translateY(-1px);
}

.settings-recent-chip:focus-visible {
  outline: 2px solid rgba(20, 184, 166, 0.55);
  outline-offset: 2px;
}

.settings-recent-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.settings-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.settings-group + .settings-group {
  margin-top: 4px;
}

.settings-group-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 4px;
}

.settings-group-title {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(20, 184, 166, 0.95);
  white-space: nowrap;
}

.settings-group-divider {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(20, 184, 166, 0.35) 0%,
    rgba(20, 184, 166, 0.05) 100%
  );
}

.setting-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.setting-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
  line-height: 1.4;
}

.setting-badge--warn {
  background: rgba(239, 68, 68, 0.15);
  color: rgb(239, 68, 68);
  border: 1px solid rgba(239, 68, 68, 0.35);
}

.setting-badge--info {
  background: rgba(20, 184, 166, 0.15);
  color: rgb(13, 148, 136);
  border: 1px solid rgba(20, 184, 166, 0.35);
}

.settings-list-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 40px 16px;
  color: rgba(var(--v-theme-on-surface), 0.55);
  text-align: center;
}

.setting-card:focus-visible {
  outline: none;
  border-color: rgba(20, 184, 166, 0.65);
  box-shadow:
    0 0 0 3px rgba(20, 184, 166, 0.25),
    0 8px 22px -10px rgba(20, 184, 166, 0.45);
}

.settings-group-fade-enter-active,
.settings-group-fade-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.settings-group-fade-enter-from,
.settings-group-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.settings-featured {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 768px) {
  .settings-featured {
    grid-template-columns: 1fr;
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

@media (min-width: 960px) {
  .settings-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1280px) {
  .settings-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.setting-card {
  cursor: pointer;
  position: relative;
  transition:
    transform 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1),
    border-color 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  padding: 6px 0 0 0;
}

.setting-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 12px 24px rgba(0, 0, 0, 0.15),
    0 4px 8px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(var(--v-theme-primary), 0.18),
    0 8px 28px -10px rgba(var(--v-theme-primary), 0.35);
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.setting-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.setting-icon {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.setting-card:hover .setting-icon {
  transform: scale(1.1) rotate(5deg);
}

.setting-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
  line-height: 1.3;
  letter-spacing: -0.01em;
  transition: color 0.2s ease;
}

.setting-card:hover .setting-title {
  color: rgb(var(--v-theme-primary));
}

.setting-description {
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0;
}

.setting-chevron {
  opacity: 0.4;
  transition:
    opacity 0.2s ease,
    transform 0.2s ease,
    background 0.2s ease,
    color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(var(--v-theme-on-surface), 0.05);
  flex-shrink: 0;
}

.setting-card:hover .setting-chevron {
  opacity: 1;
  transform: translateX(4px);
  background: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}

.settings-list-view {
  max-width: 1200px;
  margin: 0 auto;
}

.settings-list {
  padding: 0;
  background: transparent;
}

.settings-list-item {
  cursor: pointer;
  padding: 20px 24px;
  min-height: 80px;
  border-bottom: none;
  background: transparent;
  border-radius: 10px;
  transition:
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.settings-list-item:hover {
  background-color: rgba(var(--v-theme-primary), 0.06);
  box-shadow: inset 3px 0 0 rgba(var(--v-theme-primary), 0.55);
}

.settings-list-item:hover :deep(.v-list-item-title) {
  color: rgb(var(--v-theme-primary));
}

.list-item-main {
  border-radius: 10px !important;
}

.setting-list-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.settings-list-item :deep(.v-list-item__prepend) {
  padding-inline-end: 6px;
}

.settings-list-item :deep(.v-list-item__prepend .v-icon) {
  margin-inline-end: 0 !important;
}

.settings-list-item :deep(.v-list-item__content > div) {
  padding-left: 0;
}

.settings-list-item :deep(.v-list-item-title) {
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.3;
}

.settings-list-item :deep(.v-list-item-subtitle) {
  font-size: 0.875rem;
  line-height: 1.5;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin-top: 4px;
}

.settings-list-item :deep(.v-list-item__append) {
  opacity: 0.4;
  transition: opacity 0.2s ease;
}

.settings-list-item:hover :deep(.v-list-item__append) {
  opacity: 1;
}

@media (max-width: 768px) {
  .settings-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .settings-overview {
    padding: 16px 12px;
  }

  .setting-header-top {
    margin-bottom: 8px;
  }

  .setting-icon {
    width: 40px;
    height: 40px;
  }

  .setting-chevron {
    width: 26px;
    height: 26px;
  }

  .setting-title {
    font-size: 0.938rem;
  }

  .settings-list-item {
    padding: 16px;
    min-height: 72px;
  }

  .settings-list-item :deep(.v-list-item-title) {
    font-size: 1rem;
  }

  .settings-list-item :deep(.v-list-item-subtitle) {
    font-size: 0.813rem;
  }
}

@media (max-width: 480px) {
  .settings-overview {
    padding: 16px 12px;
  }

  .setting-icon-featured {
    width: 56px;
    height: 56px;
  }

  .setting-card-featured .setting-title {
    font-size: 1.25rem;
  }

  .settings-list-item {
    padding: 16px;
    min-height: 72px;
  }

  .settings-list-item :deep(.v-list-item-title) {
    font-size: 1rem;
  }

  .settings-list-item :deep(.v-list-item-subtitle) {
    font-size: 0.813rem;
  }
}

.onboarding-card {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.08) 0%,
    rgba(var(--v-theme-primary), 0.02) 100%
  );
  border: 1px solid rgba(var(--v-theme-primary), 0.2);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 25px;
}

.onboarding-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.onboarding-close {
  opacity: 0.6;
}

.onboarding-title {
  font-size: 24px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: rgb(var(--v-theme-on-surface));
  letter-spacing: -0.015em;
}

.onboarding-subtitle {
  font-size: 15px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  margin: 0 0 24px 0;
  line-height: 1.5;
}

.onboarding-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 20px;
}

.onboarding-section {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(var(--v-theme-surface), 0.6);
  border-radius: 12px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.section-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon.music {
  background: linear-gradient(135deg, #0f766e 0%, #2dd4bf 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(45, 212, 191, 0.35);
}

.section-icon.player {
  background: linear-gradient(135deg, #5c6bc0 0%, #7986cb 100%);
  color: white;
  box-shadow: 0 4px 14px rgba(92, 107, 192, 0.3);
}

.section-content {
  flex: 1;
  min-width: 0;
}

.section-content h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: rgb(var(--v-theme-on-surface));
}

.section-content p {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  margin: 0;
  line-height: 1.4;
}

.section-btn {
  flex-shrink: 0;
}

.onboarding-footer {
  font-size: 13px;
  color: rgba(var(--v-theme-on-surface), 0.5);
  margin: 0;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .onboarding-card {
    padding: 20px;
  }

  .onboarding-section {
    flex-direction: column;
    text-align: center;
    gap: 12px;
  }

  .section-btn {
    width: 100%;
  }

  .onboarding-title {
    font-size: 20px;
  }
}
</style>
