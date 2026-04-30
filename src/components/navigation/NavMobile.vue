<template>
  <!--
    NavMobile is a thin wrapper around <NavUser /> on mobile.
    The HA Menu button is intentionally commented out (streamloader brand
    omits the Home Assistant entry point). Brand teal styling for the user
    row + dropdown items is applied inside NavUser.vue, so this wrapper
    needs no additional teal accents — everything is inherited.
    If the HA button is ever re-enabled, theme its accent (currently uses
    .ha-menu-arrow) with brand teal #0f766e (light) / #2dd4bf (dark).
  -->
  <div class="nav-mobile">
    <NavUser />
  </div>
</template>

<script setup lang="ts">
// import { Button } from "@/components/ui/button";
// import { useSidebar } from "@/components/ui/sidebar";
// import { toggleHAMenu } from "@/plugins/homeassistant";
// import { store } from "@/plugins/store";
// import { ArrowLeftToLine } from "lucide-vue-next";
import NavUser from "./NavUser.vue";

// const { isMobile, setOpenMobile } = useSidebar();

// const handleHAMenuToggle = () => {
//   // Close MA sidebar on mobile when opening HA sidebar
//   if (isMobile.value) {
//     setOpenMobile(false);
//   }
//   toggleHAMenu();
// };
</script>

<style scoped>
/* Brand teal: #2dd4bf (dark) / #0f766e (light)
   Wrapper kept minimal — child NavUser carries the brand styling.
   Reserved class for future mobile-only tweaks (e.g. taller hit target). */
.nav-mobile {
  width: 100%;
}
</style>
