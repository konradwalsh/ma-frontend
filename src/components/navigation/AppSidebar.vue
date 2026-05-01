<script setup lang="ts">
import NavMain from "@/components/navigation/NavMain.vue";
import StreamloaderLibraryStats from "@/components/StreamloaderLibraryStats.vue";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { eventbus } from "@/plugins/eventbus";
import { computed, onMounted, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import NavMobile from "./NavMobile.vue";
import { getMenuItems } from "./utils/getMenuItems";

const router = useRouter();
const { t } = useI18n();

const navItems = computed(() => {
  return getMenuItems()
    .filter((item) => !item.hidden)
    .map((item) => ({
      title: t(item.label),
      url: item.path,
      icon: item.icon,
      disabled: item.disabled,
    }));
});

const { toggleSidebar, state, isMobile } = useSidebar();
const collapsed = computed(() => state.value === "collapsed");

const handleOpenSidebar = () => {
  if (isMobile.value) {
    toggleSidebar();
  }
};

onMounted(() => {
  eventbus.on("mobile-sidebar-open", handleOpenSidebar);
});

onUnmounted(() => {
  eventbus.off("mobile-sidebar-open", handleOpenSidebar);
});
</script>

<template>
  <Sidebar collapsible="icon">
    <SidebarHeader>
      <SidebarMenu>
        <div class="sidebar-header-row">
          <button
            type="button"
            class="sidebar-header"
            aria-label="streamloader — home"
            @click="router.push('/')"
          >
            <img
              src="@/assets/streamloader-mark.svg"
              alt=""
              aria-hidden="true"
              class="sidebar-header-logo"
            />
            <div v-if="!collapsed" class="sidebar-header-title">
              streamloader
            </div>
          </button>
        </div>
      </SidebarMenu>
    </SidebarHeader>
    <SidebarContent>
      <NavMain :items="navItems" />
    </SidebarContent>
    <SidebarFooter>
      <StreamloaderLibraryStats />
      <NavMobile v-if="isMobile" />
      <SidebarTrigger v-else />
    </SidebarFooter>
  </Sidebar>
</template>

<style scoped>
.sidebar-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.sidebar-header-logo {
  /* Bumped from 30px to 36px so the streamloader mark reads at sidebar
     scale. Subtle teal glow under the disc reinforces the brand without
     stealing focus from the nav. */
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  filter: drop-shadow(0 0 6px rgba(45, 212, 191, 0.35));
}

.sidebar-header-title {
  /* Brand convention (per memory brand.md): lowercase, sans-serif,
     slight letter-spacing for the "streamloader" wordmark feel. */
  font-size: 1.25rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 3px 0 0 12px;
  white-space: nowrap;
  overflow: hidden;
  transition: opacity 0.2s ease;
  color: #2dd4bf;
}

.sidebar-header {
  display: flex;
  align-items: center;
  margin-right: 15px;
  margin: 2px 15px 8px 2px;
  gap: 6px;
  transition: opacity 0.3s ease;
  position: relative;
  cursor: pointer;
  /* Reset native <button> chrome — the element is a button now (a11y) but
     should keep its prior visual identity. */
  background: transparent;
  border: 0;
  padding: 0;
  font: inherit;
  color: inherit;
  text-align: left;
}

.sidebar-header:focus-visible {
  outline: 2px solid #2dd4bf;
  outline-offset: 2px;
  border-radius: 6px;
}

.ha-header-button {
  border: none;
  background: transparent;
  padding: 0;
  margin-right: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.ha-header-button:hover {
  opacity: 0.9;
}

.ha-logo-icon {
  width: 22px;
  height: 22px;
  display: block;
}

:deep([data-sidebar="group"]) {
  padding-left: 0 !important;
  padding-right: 0.5rem !important;
}

:deep([data-sidebar="menu-button"]) {
  margin-left: 0.5rem !important;
  margin-right: 0.5rem !important;
  min-height: 2rem !important;
  padding-top: 0.25rem !important;
  padding-bottom: 0.25rem !important;
}

:deep([data-sidebar="menu-button"] > svg) {
  width: 1.6rem !important;
  height: 1.6rem !important;
  margin-right: 0.5rem !important;
}

:deep([data-sidebar="menu-button"] > svg.artist-icon) {
  width: 1.2rem !important;
  height: 1.2rem !important;
  margin-right: 0.3rem !important;
}

:deep([data-sidebar="menu-button"] > svg.genre-icon) {
  width: auto !important;
  height: auto !important;
  margin-right: 0.3rem !important;
}

@media (min-height: 700px) {
  :deep([data-sidebar="menu-button"]) {
    min-height: 2.5rem !important;
    padding-top: 0.5rem !important;
    padding-bottom: 0.5rem !important;
  }

  :deep([data-sidebar="menu-button"] > svg) {
    width: 2rem !important;
    height: 2rem !important;
  }

  :deep([data-sidebar="menu-button"] > svg.artist-icon) {
    width: 1.4rem !important;
    height: 1.4rem !important;
  }
}
</style>

<style>
[data-mobile="true"] [data-sidebar="footer"] [data-sidebar="menu-button"] {
  margin-left: 0 !important;
}
[data-mobile="true"]
  [data-sidebar="footer"]
  [data-sidebar="menu-button"]
  > svg {
  width: 1rem !important;
  height: 1rem !important;
}
</style>
