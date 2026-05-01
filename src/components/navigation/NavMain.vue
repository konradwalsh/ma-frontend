<script setup lang="ts">
import { markRaw, type Component } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";

const RouterLinkComponent = markRaw(RouterLink);

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  title: string;
  url: string;
  icon?: Component;
  disabled?: boolean;
  openInNewTab?: boolean;
}

const props = defineProps<{
  items: NavItem[];
}>();

const route = useRoute();
const router = useRouter();
const { isMobile, setOpenMobile } = useSidebar();

const isActive = (url: string) =>
  route.path === url || route.path.startsWith(url + "/");

const handleClick = (item: NavItem, event: Event) => {
  if (item.openInNewTab) {
    event.preventDefault();
    const resolved = router.resolve(item.url).href;
    const fullUrl = new URL(resolved, window.location.href).href;
    window.open(fullUrl, "_blank");
  }
  if (isMobile.value) {
    setOpenMobile(false);
  }
};
</script>

<template>
  <SidebarGroup>
    <SidebarGroupContent class="flex flex-col gap-0.5">
      <SidebarMenu>
        <SidebarMenuItem v-for="item in items" :key="item.title" class="mr-1.5">
          <SidebarMenuButton
            :as="
              item.disabled || item.openInNewTab
                ? 'button'
                : RouterLinkComponent
            "
            v-bind="item.disabled || item.openInNewTab ? {} : { to: item.url }"
            :is-active="isActive(item.url)"
            :tooltip="item.title"
            :disabled="item.disabled"
            :class="[
              'nav-main-button transition-colors',
              isActive(item.url)
                ? 'no-underline font-bold text-sm nav-main-button--active'
                : 'no-underline font-medium text-sm',
              item.disabled ? 'opacity-50 cursor-not-allowed' : '',
            ]"
            @click="(e: Event) => handleClick(item, e)"
          >
            <component
              :is="item.icon"
              v-if="item.icon"
              class="mr-1 nav-main-icon"
              :class="{ 'nav-main-icon--active': isActive(item.url) }"
              :stroke-width="isActive(item.url) ? 2.5 : 2"
            />
            <span>{{ item.title }}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroupContent>
  </SidebarGroup>
</template>

<style scoped>
/* Brand teal: #2dd4bf (dark) / #0f766e (light) */
:deep(a) {
  text-decoration: none !important;
  color: inherit !important;
}

:deep(a:hover) {
  text-decoration: none !important;
}

:deep(a:visited) {
  color: inherit !important;
}

:deep([data-sidebar="menu-button"] > svg),
:deep([data-sidebar="menu-button"] svg),
:deep([data-sidebar="menu-button"] [class*="lucide"]) {
  width: 1.2rem !important;
  height: 1.2rem !important;
  padding-right: 3px !important;
}

:deep([data-sidebar="menu-item"]) {
  display: flex !important;
  flex-direction: column !important;
}

/* Teal accent for nav items (active + hover) */
:deep(.nav-main-button) {
  position: relative;
  border-left: 3px solid transparent;
  border-radius: 0 0.5rem 0.5rem 0;
  /* a11y/WCAG 2.5.5: ensure sidebar nav items meet the 44x44 CSS-pixel
     touch-target minimum. Default sidebarMenuButtonVariants size="default"
     uses h-8 (32px) which is below WCAG; bump to 44px without altering
     visual width/padding. Use min-height (not height) so the underlying
     h-8 utility doesn't clip — min-height wins. */
  min-height: 44px !important;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    border-color 150ms ease;
}

/* a11y batch #2: collapsed/icon rail variant. The shadcn cva applies
   `group-data-[collapsible=icon]:size-8!` (32x32) to nav buttons when the
   sidebar collapses to its icon-only rail — that lands below the WCAG 2.5.5
   touch-target minimum. Override both width and height to 44px so the rail
   icons remain a comfortable tap target. The visual icon size is unchanged
   (set elsewhere via the inner svg rules); only the hit-area grows. */
:deep([data-collapsible="icon"] .nav-main-button),
:deep([data-state="collapsed"] .nav-main-button) {
  min-width: 44px !important;
  width: 44px !important;
  min-height: 44px !important;
  height: 44px !important;
}

:deep(.nav-main-button:hover:not([data-disabled])) {
  background-color: rgba(15, 118, 110, 0.08) !important;
}

:deep(.dark .nav-main-button:hover:not([data-disabled])),
:where(.dark) :deep(.nav-main-button:hover:not([data-disabled])) {
  background-color: rgba(45, 212, 191, 0.1) !important;
}

:deep(.nav-main-button--active) {
  border-left-color: #0f766e !important;
  background-color: rgba(15, 118, 110, 0.12) !important;
  color: #0f766e !important;
}

:deep(.dark .nav-main-button--active),
:where(.dark) :deep(.nav-main-button--active) {
  border-left-color: #2dd4bf !important;
  background-color: rgba(45, 212, 191, 0.14) !important;
  color: #2dd4bf !important;
}

:deep(.nav-main-icon) {
  transition: color 150ms ease;
}

:deep(.nav-main-icon--active) {
  color: #0f766e !important;
}

:deep(.dark .nav-main-icon--active),
:where(.dark) :deep(.nav-main-icon--active) {
  color: #2dd4bf !important;
}

/* Keyboard focus ring in teal for accessibility */
:deep(.nav-main-button:focus-visible) {
  outline: 2px solid #0f766e;
  outline-offset: -2px;
}

:deep(.dark .nav-main-button:focus-visible),
:where(.dark) :deep(.nav-main-button:focus-visible) {
  outline-color: #2dd4bf;
}
</style>
