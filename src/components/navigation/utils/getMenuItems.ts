import ArtistIcon from "@/components/icons/ArtistIcon.vue";
import GenreIcon from "@/components/icons/GenreIcon.vue";
import { DEFAULT_MENU_ITEMS } from "@/constants";
import api from "@/plugins/api";
import { store } from "@/plugins/store";
import {
  BookAudio,
  Compass,
  Disc3,
  Folder,
  HardDrive,
  History,
  ListMusic,
  Music2,
  PartyPopper,
  Podcast,
  Radio,
  Search,
  Settings,
} from "lucide-vue-next";
import { Component } from "vue";

/**
 * Resolve the deep-link target for the sidebar "streamloader" item.
 *
 * Now points at the consolidated /settings/streamloader landing page so
 * users land on a coherent dashboard (display toggles + provider status
 * + deep link to the provider editor) instead of being dropped straight
 * into the raw provider config form. The landing page itself routes
 * onward to /settings/editprovider/{instanceId} via its "Open Provider
 * Settings" button when the user wants the underlying form, and shows
 * an "Add Streamloader Provider" CTA when none is registered.
 *
 * Hidden-on-cold-boot logic (in the menu-item entry below) is unchanged
 * so we don't surface a settings page before the provider list has even
 * loaded.
 */
const getStreamloaderUrl = (): string => {
  return "/settings/streamloader";
};

export interface MenuItem {
  label: string;
  icon: Component;
  path: string;
  isLibraryNode: boolean;
  hidden?: boolean;
  disabled?: boolean;
}

export const getMenuItems = function () {
  const items: MenuItem[] = [];
  // we loop through DEFAULT_MENU_ITEMS to respect default order;
  // new items added to DEFAULT_MENU_ITEMS automatically appear unless explicitly disabled
  for (const enabledMenuItemStr of DEFAULT_MENU_ITEMS) {
    if (
      localStorage.getItem(
        `frontend.settings.menu_item_${enabledMenuItemStr}_enabled`,
      ) === "false"
    )
      continue;
    if (enabledMenuItemStr === "discover") {
      items.push({
        label: "discover",
        icon: Compass,
        path: "/discover",
        isLibraryNode: false,
      });
    }
    if (enabledMenuItemStr === "search") {
      items.push({
        label: "search",
        icon: Search,
        path: "/search",
        isLibraryNode: false,
      });
    }
    if (enabledMenuItemStr === "party") {
      items.push({
        label: "party_mode",
        icon: PartyPopper,
        path: "/party",
        isLibraryNode: false,
        hidden: !store.enabledPlugins.has("party"),
      });
    }
    if (enabledMenuItemStr === "artists") {
      items.push({
        label: "artists",
        icon: ArtistIcon,
        path: "/artists",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "albums") {
      items.push({
        label: "albums",
        icon: Disc3,
        path: "/albums",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "tracks") {
      items.push({
        label: "tracks",
        icon: Music2,
        path: "/tracks",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "playlists") {
      items.push({
        label: "playlists",
        icon: ListMusic,
        path: "/playlists",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "audiobooks") {
      items.push({
        label: "audiobooks",
        icon: BookAudio,
        path: "/audiobooks",
        isLibraryNode: true,
        disabled: store.libraryAudiobooksCount === 0,
      });
    }
    if (enabledMenuItemStr === "podcasts") {
      items.push({
        label: "podcasts",
        icon: Podcast,
        path: "/podcasts",
        isLibraryNode: true,
        disabled: store.libraryPodcastsCount === 0,
      });
    }
    if (enabledMenuItemStr === "radios") {
      items.push({
        label: "radios",
        icon: Radio,
        path: "/radios",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "genres") {
      items.push({
        label: "genres",
        icon: GenreIcon,
        path: "/genres",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "browse") {
      items.push({
        label: "browse",
        icon: Folder,
        path: "/browse",
        isLibraryNode: true,
      });
    }
    if (enabledMenuItemStr === "recentlyplayed") {
      // Streamloader-fork addition: sidebar entry between Library nodes
      // and Settings. Uses the existing "recently_played" translation key
      // (already shipped in en.json + every locale via upstream).
      items.push({
        label: "recently_played",
        icon: History,
        path: "/recently-played",
        isLibraryNode: false,
      });
    }
    if (enabledMenuItemStr === "settings") {
      // Streamloader deep-link sits directly above "settings" so it acts as
      // the streamloader-aware shortcut into Settings → Providers. Hidden
      // when no providers are configured at all (cold install) — surfacing
      // a link to an empty providers list would be confusing. Always shown
      // once any provider exists (streamloader or not), with the URL
      // resolving to the streamloader provider edit page if present, else
      // the generic providers list so the user can add one.
      const hasAnyProviders =
        !!api.providers && Object.keys(api.providers).length > 0;
      items.push({
        label: "streamloader",
        icon: HardDrive,
        path: getStreamloaderUrl(),
        isLibraryNode: false,
        hidden: !hasAnyProviders,
      });
      items.push({
        label: "settings.settings",
        icon: Settings,
        path: "/settings",
        isLibraryNode: true,
      });
    }
  }
  return items;
};
