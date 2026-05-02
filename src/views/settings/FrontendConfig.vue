<template>
  <div class="frontend-config p-4">
    <!-- Header card -->
    <Card class="frontend-header-card mb-4">
      <CardHeader class="flex flex-row items-center gap-4 pb-4">
        <div class="frontend-icon-halo">
          <Palette class="size-8 frontend-icon" />
        </div>
        <div class="flex flex-col gap-1 min-w-0 flex-1">
          <CardTitle class="frontend-header-title">{{
            $t("settings.frontend")
          }}</CardTitle>
          <CardDescription>{{
            $t("settings.frontend_description")
          }}</CardDescription>
        </div>
      </CardHeader>
    </Card>

    <!-- Config entries -->
    <EditConfig
      v-if="config.length > 0"
      :config-entries="config"
      :disabled="false"
      @submit="onSubmit"
      @action="onAction"
      @immediate-apply="onImmediateApply"
    />

    <!-- Loading overlay -->
    <div
      v-if="loading"
      class="fixed inset-0 z-50 flex items-center justify-center bg-background/80"
    >
      <Spinner class="size-16" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useColorMode } from "@vueuse/core";
import { Palette } from "lucide-vue-next";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { DEFAULT_MENU_ITEMS } from "@/constants";
import {
  ConfigEntry,
  ConfigEntryType,
  ConfigValueType,
} from "@/plugins/api/interfaces";
import { companionMode } from "@/plugins/companion";
import { store } from "@/plugins/store";
import { $t, availableLocales } from "@/plugins/i18n";
import EditConfig from "./EditConfig.vue";

// global refs
const router = useRouter();
const config = ref<ConfigEntry[]>([]);
const loading = ref(false);
const mode = useColorMode();

onMounted(() => {
  const enabledMenuItems = DEFAULT_MENU_ITEMS.filter(
    (item) =>
      localStorage.getItem(`frontend.settings.menu_item_${item}_enabled`) !==
      "false",
  );
  const storedTheme = localStorage.getItem("frontend.settings.theme") || "auto";
  mode.value = storedTheme as "light" | "dark" | "auto";

  const configEntries: ConfigEntry[] = [
    {
      key: "theme",
      type: ConfigEntryType.STRING,
      label: "theme",
      default_value: "auto",
      required: false,
      options: [
        { title: "auto", value: "auto" },
        { title: "dark", value: "dark" },
        { title: "light", value: "light" },
      ],
      multi_value: false,
      category: "generic",
      value: storedTheme,
    },
    {
      key: "language",
      type: ConfigEntryType.STRING,
      label: "language",
      default_value: "auto",
      required: false,
      options: [
        { title: "auto", value: "auto" },
        // availableLocales comes from i18n.ts now (derived at module init
        // from import.meta.glob keys) — listing every locale here without
        // having to actually load any of their messages (Streamloader
        // bundle-split, batch ZZZ3).
        ...availableLocales.map((x) => {
          return { title: x, value: x };
        }),
      ],
      multi_value: false,
      category: "generic",
      value: localStorage.getItem("frontend.settings.language"),
    },
    {
      key: "menu_items",
      type: ConfigEntryType.STRING,
      label: "menu_items",
      default_value: DEFAULT_MENU_ITEMS,
      required: false,
      options: [
        { title: $t("discover"), value: "discover" },
        { title: $t("search"), value: "search" },
        ...(store.enabledPlugins.has("party")
          ? [{ title: $t("party_mode"), value: "party" }]
          : []),
        { title: $t("artists"), value: "artists" },
        { title: $t("albums"), value: "albums" },
        { title: $t("tracks"), value: "tracks" },
        { title: $t("playlists"), value: "playlists" },
        { title: $t("audiobooks"), value: "audiobooks" },
        { title: $t("podcasts"), value: "podcasts" },
        { title: $t("radios"), value: "radios" },
        { title: $t("genres"), value: "genres" },
        { title: $t("browse"), value: "browse" },
        { title: $t("settings.settings"), value: "settings" },
      ],
      multi_value: true,
      category: "generic",
      value: enabledMenuItems,
    },
    {
      key: "enable_browser_controls",
      type: ConfigEntryType.BOOLEAN,
      label: "enable_browser_controls",
      default_value: true,
      required: false,
      multi_value: false,
      category: "generic",
      hidden: companionMode.value,
      value:
        localStorage.getItem("frontend.settings.enable_browser_controls") !==
        "false",
    },
    {
      key: "force_mobile_layout",
      type: ConfigEntryType.BOOLEAN,
      label: "force_mobile_layout",
      default_value: false,
      required: false,
      multi_value: false,
      category: "generic",
      value:
        localStorage.getItem("frontend.settings.force_mobile_layout") ===
        "true",
    },
    {
      key: "mobile_sidebar_side",
      type: ConfigEntryType.STRING,
      label: "mobile_sidebar_side",
      default_value: "left",
      required: false,
      options: [
        { title: "Left", value: "left" },
        { title: "Right", value: "right" },
      ],
      multi_value: false,
      category: "generic",
      value:
        localStorage.getItem("frontend.settings.mobile_sidebar_side") || "left",
    },
  ];

  // Add web player settings (if not running in companion mode)
  if (!companionMode.value) {
    configEntries.push({
      key: "web_player_enabled",
      type: ConfigEntryType.BOOLEAN,
      label: "web_player_enabled",
      default_value: true,
      required: false,
      category: "web_player",
      value:
        localStorage.getItem("frontend.settings.web_player_enabled") !==
        "false",
    });
  }

  // Streamloader-fork addition: vinyl display behaviour for the album
  // hero (InfoHeader) and now-playing fullscreen cover. Three modes:
  //   - "hover": current behaviour, vinyl peeks out only on hover.
  //   - "always-visible": vinyl always protrudes ~45%, doesn't spin.
  //   - "always-visible-spinning": always protrudes AND spins slowly
  //     when the active player is in PlaybackState.PLAYING.
  // Default = "always-visible-spinning" (the dramatic look).
  configEntries.push({
    key: "vinyl_display_mode",
    type: ConfigEntryType.STRING,
    label: "Vinyl record display",
    description:
      "How the vinyl disc behind album cover art is shown. Spinning pauses when playback is paused or stopped.",
    default_value: "always-visible-spinning",
    required: false,
    options: [
      { title: "Hover only", value: "hover" },
      { title: "Always visible", value: "always-visible" },
      {
        title: "Always visible & spinning",
        value: "always-visible-spinning",
      },
    ],
    multi_value: false,
    category: "generic",
    value:
      localStorage.getItem("frontend.settings.vinyl_display_mode") ||
      "always-visible-spinning",
  });

  config.value = configEntries;
});

// methods
const saveValues = function (values: Record<string, ConfigValueType>) {
  for (const key in values) {
    const storageKey = `frontend.settings.${key}`;
    const value = values[key];
    if (value != null) {
      if (key === "menu_items") {
        const selectedItems = Array.isArray(value)
          ? (value as string[])
          : String(value).split(",");
        for (const item of DEFAULT_MENU_ITEMS) {
          if (selectedItems.includes(item)) {
            localStorage.removeItem(
              `frontend.settings.menu_item_${item}_enabled`,
            );
          } else {
            localStorage.setItem(
              `frontend.settings.menu_item_${item}_enabled`,
              "false",
            );
          }
        }
        // clean up old single-key format
        localStorage.removeItem(storageKey);
      } else {
        localStorage.setItem(storageKey, value.toString());
      }

      if (key === "theme") {
        mode.value = value.toString() as "light" | "dark" | "auto";
      }
    } else {
      localStorage.removeItem(storageKey);
    }
  }
  router.push({ name: "discover" }).then(() => {
    // enforce refresh
    window.location.reload();
  });
};

const onSubmit = function (values: Record<string, ConfigValueType>) {
  saveValues(values);
};

const onAction = async function (
  _action: string,
  _values: Record<string, ConfigValueType>,
  _immediateApply: boolean,
) {};

const onImmediateApply = function (values: Record<string, ConfigValueType>) {
  for (const key in values) {
    localStorage.setItem(`frontend.settings.${key}`, String(values[key]));
  }
};
</script>

<style scoped>
/*
  Polish layer for the Frontend settings page. Mirrors the visual language
  used on the Settings landing card (teal halo + accent underline) so when
  the user drills into Frontend they don't fall back into "default Vuetify"
  territory. All animations respect prefers-reduced-motion; all hover
  effects are suppressed on touch (hover: none).
*/

.frontend-header-card {
  position: relative;
  overflow: hidden;
  border-color: rgba(45, 212, 191, 0.22);
  background: linear-gradient(
    135deg,
    rgba(45, 212, 191, 0.05) 0%,
    rgba(45, 212, 191, 0) 60%
  );
  transition:
    border-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

/* Brand accent underline along the top edge of the header card. */
.frontend-header-card::before {
  content: "";
  position: absolute;
  top: 0;
  left: 16px;
  width: 64px;
  height: 3px;
  border-radius: 0 0 3px 3px;
  background: linear-gradient(
    90deg,
    rgb(45, 212, 191) 0%,
    rgba(45, 212, 191, 0.4) 100%
  );
}

.frontend-header-card:hover {
  border-color: rgba(45, 212, 191, 0.4);
  box-shadow: 0 4px 18px -8px rgba(45, 212, 191, 0.35);
}

.frontend-header-title {
  letter-spacing: -0.01em;
  font-weight: 600;
}

/* Replace the off-brand orange icon background with a teal halo that
   matches every other settings card and pulses a sheen on hover. */
.frontend-icon-halo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border-radius: 14px;
  background: rgba(45, 212, 191, 0.12);
  border: 1px solid rgba(45, 212, 191, 0.28);
  box-shadow: inset 0 0 0 1px rgba(45, 212, 191, 0.06);
  transition:
    background 220ms cubic-bezier(0.34, 1.36, 0.64, 1),
    transform 180ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.frontend-icon {
  color: #2dd4bf;
  transition: transform 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.frontend-header-card:hover .frontend-icon-halo {
  background: rgba(45, 212, 191, 0.2);
  transform: scale(1.04);
}

.frontend-header-card:hover .frontend-icon {
  transform: rotate(-8deg);
}

/* Form inputs inside EditConfig — teal focus rings matching the rest of
   the brand. EditConfig renders Vuetify v-text-field/v-select wrapped in
   a .config-entry container; we punch into shadow with :deep(). */
.frontend-config :deep(.config-entry .v-field--focused .v-field__outline) {
  --v-field-border-opacity: 1;
}

.frontend-config :deep(.config-entry .v-field--focused) {
  box-shadow: 0 0 0 2px rgba(45, 212, 191, 0.22);
  border-radius: 6px;
  transition: box-shadow 180ms ease;
}

/* Action buttons inside the EditConfig footer get a teal hover wash and
   compress slightly on press, matching the established brand pattern. */
.frontend-config :deep(.config-actions .v-btn) {
  transition:
    transform 140ms cubic-bezier(0.34, 1.36, 0.64, 1),
    box-shadow 200ms ease,
    background-color 200ms ease;
}

.frontend-config :deep(.config-actions .v-btn:active:not(.v-btn--disabled)) {
  transform: scale(0.97);
}

.frontend-config
  :deep(.config-actions .v-btn--variant-outlined:hover:not(.v-btn--disabled)) {
  background-color: rgba(45, 212, 191, 0.08);
}

/* Section headers inside EditConfig — bump the brand-tone subtle accent
   bar so each generic/web_player category reads as a polished section. */
.frontend-config :deep(.category-section) {
  transition: border-color 220ms cubic-bezier(0.34, 1.36, 0.64, 1);
}

.frontend-config :deep(.category-section:hover) {
  border-color: rgba(45, 212, 191, 0.3);
}

.frontend-config :deep(.category-header) {
  position: relative;
}

.frontend-config :deep(.category-header)::after {
  content: "";
  position: absolute;
  left: 20px;
  bottom: 0;
  width: 28px;
  height: 2px;
  border-radius: 2px;
  background: rgb(45, 212, 191);
  opacity: 0.7;
}

/* Touch suppression — never give users on touch devices a hover state
   stuck-on after a tap. */
@media (hover: none) {
  .frontend-header-card:hover {
    border-color: rgba(45, 212, 191, 0.22);
    box-shadow: none;
  }

  .frontend-header-card:hover .frontend-icon-halo {
    background: rgba(45, 212, 191, 0.12);
    transform: none;
  }

  .frontend-header-card:hover .frontend-icon {
    transform: none;
  }

  .frontend-config
    :deep(.config-actions .v-btn--variant-outlined:hover:not(.v-btn--disabled)) {
    background-color: transparent;
  }

  .frontend-config :deep(.category-section:hover) {
    border-color: rgba(var(--v-theme-primary), 0.16);
  }
}

/* Focus-visible fallback for keyboard users on the header card so it
   reads as actionable (it isn't, but consistent treatment matters). */
.frontend-header-card:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.45);
}

@media (prefers-reduced-motion: reduce) {
  .frontend-header-card,
  .frontend-icon-halo,
  .frontend-icon,
  .frontend-config :deep(.config-entry .v-field--focused),
  .frontend-config :deep(.config-actions .v-btn),
  .frontend-config :deep(.category-section) {
    transition: none !important;
  }

  .frontend-header-card:hover .frontend-icon-halo,
  .frontend-header-card:hover .frontend-icon,
  .frontend-config :deep(.config-actions .v-btn:active:not(.v-btn--disabled)) {
    transform: none !important;
  }
}
</style>
