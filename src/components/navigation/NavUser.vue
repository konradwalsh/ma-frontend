<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { authManager } from "@/plugins/auth";
import { eventbus } from "@/plugins/eventbus";
import { store } from "@/plugins/store";
import { LogOut, MoreVertical, Pencil, Settings } from "lucide-vue-next";
import { useRouter } from "vue-router";

const router = useRouter();
const { isMobile, setOpenMobile } = useSidebar();

const displayName =
  store.currentUser?.display_name || store.currentUser?.username || "";
const username = store.currentUser?.username || "";
const initial = displayName ? displayName[0].toUpperCase() : "U";

const handleProfile = () => {
  setOpenMobile(false);
  router.push({ name: "profile" });
};

const handleEditHomescreen = () => {
  setOpenMobile(false);
  router.push("/");
  eventbus.emit("homescreen-edit-toggle");
};

const handleLogout = () => {
  setOpenMobile(false);
  authManager.logout();
};
</script>

<template>
  <SidebarMenu class="w-full">
    <SidebarMenuItem class="w-full">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="nav-user-trigger w-full data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar
              class="nav-user-avatar h-8 w-8 shrink-0 rounded-lg ring-1 ring-transparent"
            >
              <AvatarImage
                v-if="store.currentUser?.avatar_url"
                :src="store.currentUser.avatar_url"
                :alt="displayName"
              />
              <AvatarFallback class="nav-user-fallback rounded-lg">
                {{ initial }}
              </AvatarFallback>
            </Avatar>
            <div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span class="nav-user-name truncate font-medium">
                {{ displayName }}
              </span>
              <span class="text-muted-foreground truncate text-xs">
                {{ username }}
              </span>
            </div>
            <MoreVertical
              style="width: 1rem !important"
              class="ml-auto shrink-0 opacity-70"
            />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="nav-user-menu z-[100001] w-(--reka-dropdown-menu-trigger-width) min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          :side-offset="isMobile ? 4 : 15"
          align="end"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="nav-user-avatar h-8 w-8 rounded-lg">
                <AvatarImage
                  v-if="store.currentUser?.avatar_url"
                  :src="store.currentUser.avatar_url"
                  :alt="displayName"
                />
                <AvatarFallback class="nav-user-fallback rounded-lg">
                  {{ initial }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="nav-user-name truncate font-medium">
                  {{ displayName }}
                </span>
                <span class="text-muted-foreground truncate text-xs">
                  {{ username }}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem class="nav-user-item" @click="handleProfile">
            <Settings class="size-4 nav-user-item-icon" />
            {{ $t("auth.profile") }}
          </DropdownMenuItem>
          <DropdownMenuItem class="nav-user-item" @click="handleEditHomescreen">
            <Pencil class="size-4 nav-user-item-icon" />
            {{ $t("homescreen_edit_enable") }}
          </DropdownMenuItem>
          <DropdownMenuItem
            v-if="!store.isIngressSession"
            class="nav-user-item"
            @click="handleLogout"
          >
            <LogOut class="size-4 nav-user-item-icon" />
            {{ $t("auth.logout") }}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<style scoped>
/* Brand teal: #2dd4bf (dark) / #0f766e (light) */
.ha-menu-arrow {
  color: rgb(var(--v-theme-primary, 3, 169, 244)) !important;
}

/* Trigger row: subtle teal hover + open-state accent */
:deep(.nav-user-trigger) {
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

:deep(.nav-user-trigger:hover) {
  background-color: rgba(15, 118, 110, 0.08) !important;
}

:deep(.dark .nav-user-trigger:hover),
:where(.dark) :deep(.nav-user-trigger:hover) {
  background-color: rgba(45, 212, 191, 0.1) !important;
}

:deep(.nav-user-trigger[data-state="open"]) {
  background-color: rgba(15, 118, 110, 0.12) !important;
}

:deep(.dark .nav-user-trigger[data-state="open"]),
:where(.dark) :deep(.nav-user-trigger[data-state="open"]) {
  background-color: rgba(45, 212, 191, 0.14) !important;
}

:deep(.nav-user-trigger:focus-visible) {
  outline: 2px solid #0f766e;
  outline-offset: -2px;
}

:deep(.dark .nav-user-trigger:focus-visible),
:where(.dark) :deep(.nav-user-trigger:focus-visible) {
  outline-color: #2dd4bf;
}

/* Avatar fallback uses brand teal so the initial reads as identity */
:deep(.nav-user-fallback) {
  background-color: #0f766e !important;
  color: #ffffff !important;
  font-weight: 600;
}

:deep(.dark .nav-user-fallback),
:where(.dark) :deep(.nav-user-fallback) {
  background-color: #2dd4bf !important;
  color: #042f2e !important;
}

/* Active user identifier (display name) — teal */
:deep(.nav-user-name) {
  color: #0f766e;
}

:deep(.dark .nav-user-name),
:where(.dark) :deep(.nav-user-name) {
  color: #2dd4bf;
}

/* Dropdown items — teal-tinted hover */
:deep(.nav-user-item) {
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease;
}

:deep(.nav-user-item:hover),
:deep(.nav-user-item[data-highlighted]),
:deep(.nav-user-item:focus) {
  background-color: rgba(15, 118, 110, 0.1) !important;
  color: #0f766e !important;
}

:deep(.dark .nav-user-item:hover),
:where(.dark) :deep(.nav-user-item:hover),
:deep(.dark .nav-user-item[data-highlighted]),
:where(.dark) :deep(.nav-user-item[data-highlighted]),
:deep(.dark .nav-user-item:focus),
:where(.dark) :deep(.nav-user-item:focus) {
  background-color: rgba(45, 212, 191, 0.14) !important;
  color: #2dd4bf !important;
}

:deep(.nav-user-item:hover .nav-user-item-icon),
:deep(.nav-user-item[data-highlighted] .nav-user-item-icon),
:deep(.nav-user-item:focus .nav-user-item-icon) {
  color: #0f766e;
}

:deep(.dark .nav-user-item:hover .nav-user-item-icon),
:where(.dark) :deep(.nav-user-item:hover .nav-user-item-icon),
:deep(.dark .nav-user-item[data-highlighted] .nav-user-item-icon),
:where(.dark) :deep(.nav-user-item[data-highlighted] .nav-user-item-icon) {
  color: #2dd4bf;
}
</style>
