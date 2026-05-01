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
  font-size: 11px;
  line-height: 1.1;
  letter-spacing: 0.01em;
  font-stretch: condensed;
  text-transform: none;
  margin-top: 5px;
  transition: color 150ms ease;
}

.menuButton--active {
  font-weight: 600;
  letter-spacing: 0.02em;
  color: #0f766e;
}

/* streamloader: ensure each tab button presents at least a 44x44 hit target
   on touch devices (WCAG 2.5.5). Vuetify's v-btn defaults to ~36px height
   inside v-bottom-navigation; we promote the inner button surface only —
   nav height itself is set on the parent wrapper. */
.streamloader-bottom-nav .bn-btn {
  min-height: 44px;
  min-width: 44px;
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
  /* streamloader: subtle pulsing teal glow on the active-tab stripe so the
     mobile nav's selected route reads at a glance. Pulse is gentle (3s,
     ease-in-out) and respects users who prefer reduced motion. */
  box-shadow: 0 0 6px rgba(15, 118, 110, 0.55);
  animation: sl-bn-pulse 3s ease-in-out infinite;
}

.v-theme--dark .streamloader-bottom-nav .bn-btn--active::after,
.v-theme--ma-dark .streamloader-bottom-nav .bn-btn--active::after {
  background: #2dd4bf;
  box-shadow: 0 0 6px rgba(45, 212, 191, 0.55);
  animation: sl-bn-pulse-dark 3s ease-in-out infinite;
}

@keyframes sl-bn-pulse {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(15, 118, 110, 0.35);
  }
  50% {
    box-shadow: 0 0 10px rgba(15, 118, 110, 0.7);
  }
}

@keyframes sl-bn-pulse-dark {
  0%,
  100% {
    box-shadow: 0 0 4px rgba(45, 212, 191, 0.35);
  }
  50% {
    box-shadow: 0 0 12px rgba(45, 212, 191, 0.75);
  }
}

@media (prefers-reduced-motion: reduce) {
  .streamloader-bottom-nav .bn-btn--active::after {
    animation: none !important;
  }
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
