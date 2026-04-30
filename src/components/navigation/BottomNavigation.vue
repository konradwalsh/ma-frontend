<template>
  <v-bottom-navigation
    app
    height="60"
    bg-color="default"
    grow
    role="navigation"
    class="streamloader-bottom-nav"
  >
    <v-btn
      aria-label="Menu"
      tabindex="0"
      variant="text"
      class="bn-btn"
      @click="handleMenuClick"
    >
      <Menu class="w-5 h-5 bn-icon" />
      <span class="menuButton">Menu</span>
    </v-btn>

    <v-btn
      :aria-label="$t('discover')"
      tabindex="0"
      variant="text"
      :active="isActive('discover')"
      active-color="fg"
      class="bn-btn"
      :class="{ 'bn-btn--active': isActive('discover') }"
      @click="handleDiscoverClick"
    >
      <Compass
        class="w-5 h-5 bn-icon"
        :class="{ 'bn-icon--active': isActive('discover') }"
        :stroke-width="isActive('discover') ? 2.5 : 2"
      />
      <span
        class="menuButton"
        :class="{ 'menuButton--active': isActive('discover') }"
        >{{ $t("discover") }}</span
      >
    </v-btn>

    <v-btn
      :aria-label="$t('search')"
      tabindex="0"
      variant="text"
      :active="isActive('search')"
      active-color="fg"
      class="bn-btn"
      :class="{ 'bn-btn--active': isActive('search') }"
      @click="handleSearchClick"
    >
      <Search
        class="w-5 h-5 bn-icon"
        :class="{ 'bn-icon--active': isActive('search') }"
        :stroke-width="isActive('search') ? 2.5 : 2"
      />
      <span
        class="menuButton"
        :class="{ 'menuButton--active': isActive('search') }"
        >{{ $t("search") }}</span
      >
    </v-btn>

    <ActivePlayerPopover
      auto-show
      align="end"
      child-element-id="active-player-popover"
    />

    <v-btn
      id="active-player-popover"
      :aria-label="$t('players')"
      tabindex="0"
      variant="text"
      class="bn-btn"
      @click="handlePlayersClick"
    >
      <Speaker class="w-5 h-5 bn-icon" />
      <span class="menuButton">{{ $t("players") }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>

<script setup lang="ts">
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { Compass, Menu, Search, Speaker } from "lucide-vue-next";
import { useRoute, useRouter } from "vue-router";
import ActivePlayerPopover from "@/components/ActivePlayerPopover.vue";

const router = useRouter();
const route = useRoute();

const isActive = (name: string) => route.name === name;

const handleMenuClick = () => {
  closePlayersMenu();
  eventbus.emit("mobile-sidebar-open");
};

const handleDiscoverClick = () => {
  closePlayersMenu();
  router.push({ name: "discover" });
};

const handleSearchClick = () => {
  closePlayersMenu();

  if (isActive("search")) {
    const wrapper = document.getElementById("searchInput");
    if (wrapper) {
      const input = wrapper.querySelector("input") || wrapper;
      (input as HTMLInputElement).focus();
      (input as HTMLInputElement).select();
    }
  } else {
    router.push({ name: "search" });
  }
};

const handlePlayersClick = () => {
  store.showPlayersMenu = !store.showPlayersMenu;
};

function closePlayersMenu() {
  store.showPlayersMenu = false;
}
</script>

<style>
/* Brand teal: #2dd4bf (dark) / #0f766e (light) */
.menuButton {
  font-weight: 350;
  font-size: x-small;
  font-stretch: condensed;
  text-transform: none;
  margin-top: 5px;
  transition: color 150ms ease;
}

.menuButton--active {
  font-weight: 600;
  color: #0f766e;
}

.v-theme--dark .menuButton--active,
.v-theme--ma-dark .menuButton--active {
  color: #2dd4bf;
}

/* Active tab: teal underline + filled overlay neutralised so teal reads */
.streamloader-bottom-nav .v-btn--active > .v-btn__overlay {
  background: transparent !important;
}

.streamloader-bottom-nav .bn-btn--active::after {
  content: "";
  position: absolute;
  left: 25%;
  right: 25%;
  bottom: 4px;
  height: 2px;
  border-radius: 2px;
  background: #0f766e;
  transition: background-color 150ms ease;
}

.v-theme--dark .streamloader-bottom-nav .bn-btn--active::after,
.v-theme--ma-dark .streamloader-bottom-nav .bn-btn--active::after {
  background: #2dd4bf;
}

/* Icon teal when active */
.bn-icon {
  transition: color 150ms ease;
}

.bn-icon--active {
  color: #0f766e;
}

.v-theme--dark .bn-icon--active,
.v-theme--ma-dark .bn-icon--active {
  color: #2dd4bf;
}

/* Hover / focus tint — touch devices fall back to :focus-visible */
.streamloader-bottom-nav .bn-btn {
  position: relative;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

@media (hover: hover) {
  .streamloader-bottom-nav .bn-btn:hover .bn-icon,
  .streamloader-bottom-nav .bn-btn:hover .menuButton {
    color: #0f766e;
  }

  .v-theme--dark .streamloader-bottom-nav .bn-btn:hover .bn-icon,
  .v-theme--dark .streamloader-bottom-nav .bn-btn:hover .menuButton,
  .v-theme--ma-dark .streamloader-bottom-nav .bn-btn:hover .bn-icon,
  .v-theme--ma-dark .streamloader-bottom-nav .bn-btn:hover .menuButton {
    color: #2dd4bf;
  }
}

.streamloader-bottom-nav .bn-btn:focus-visible {
  outline: 2px solid #0f766e;
  outline-offset: -2px;
}

.v-theme--dark .streamloader-bottom-nav .bn-btn:focus-visible,
.v-theme--ma-dark .streamloader-bottom-nav .bn-btn:focus-visible {
  outline-color: #2dd4bf;
}

.v-slide-group-item--active {
  opacity: 100%;
}
</style>
