// Streamloader-fork addition: global music-player keyboard shortcuts.
// Industry-standard mappings (Spotify/Apple Music):
//   Space  -> play/pause
//   Right  -> next track
//   Left   -> previous track
//   Up     -> volume +5
//   Down   -> volume -5
//   M      -> mute toggle
//   L      -> toggle favorite on the currently-playing track (Spotify "like")
//   R      -> cycle repeat mode (Off -> All -> One -> Off)
//   S      -> toggle shuffle
//   F      -> fullscreen player toggle
//   Esc    -> close fullscreen player (when open)
//   ?      -> open keyboard-shortcuts help dialog
//
// Bails when:
//   - focus is in an input / textarea / select / contenteditable
//   - any modifier (Ctrl/Meta/Alt) is held (these are reserved for browser shortcuts)
//   - a dialog is open (store.dialogActive) — except Esc, which is allowed to close
//     the fullscreen player even mid-dialog so users have a reliable exit
//   - no active player is selected
//
// Registered once from src/layouts/default/Default.vue.

import { onMounted, onUnmounted } from "vue";
import api from "@/plugins/api";
import { RepeatMode } from "@/plugins/api/interfaces";
import { store } from "@/plugins/store";

const VOLUME_STEP = 5;

// Repeat-mode cycle order (matches Spotify's UX: Off -> All -> One -> Off).
// Note: api.queueCommandRepeatToggle uses Off -> One -> All -> Off, which
// puts the rarely-used "repeat one" first. We deliberately re-implement the
// cycle here rather than reuse that helper.
const REPEAT_CYCLE: Record<RepeatMode, RepeatMode> = {
  [RepeatMode.OFF]: RepeatMode.ALL,
  [RepeatMode.ALL]: RepeatMode.ONE,
  [RepeatMode.ONE]: RepeatMode.OFF,
};

// Single source of truth for the shortcut list — consumed by both the
// keyboard handler (above) and the help dialog (KeyboardShortcutsDialog.vue).
// `keys` is an array so the UI can render each token in its own <kbd>; combos
// are joined with " + " in the dialog.
export interface KeyboardShortcut {
  keys: string[];
  action: string;
  group: "Playback" | "Volume" | "View" | "Help";
}

export const KEYBOARD_SHORTCUTS: readonly KeyboardShortcut[] = [
  { keys: ["Space"], action: "Play / pause", group: "Playback" },
  { keys: ["→"], action: "Next track", group: "Playback" },
  { keys: ["←"], action: "Previous track", group: "Playback" },
  { keys: ["L"], action: "Favorite current track", group: "Playback" },
  { keys: ["R"], action: "Cycle repeat (Off / All / One)", group: "Playback" },
  { keys: ["S"], action: "Toggle shuffle", group: "Playback" },
  { keys: ["↑"], action: "Volume up (+5)", group: "Volume" },
  { keys: ["↓"], action: "Volume down (-5)", group: "Volume" },
  { keys: ["M"], action: "Mute toggle", group: "Volume" },
  { keys: ["F"], action: "Toggle fullscreen player", group: "View" },
  { keys: ["Esc"], action: "Close fullscreen player / dialog", group: "View" },
  { keys: ["Shift", "/"], action: "Show this help", group: "Help" },
] as const;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function hasModifier(e: KeyboardEvent): boolean {
  return e.ctrlKey || e.metaKey || e.altKey;
}

function handleKeydown(e: KeyboardEvent) {
  // Esc handles fullscreen close even with dialogActive — give users a guaranteed exit.
  if (e.key === "Escape" && !hasModifier(e)) {
    if (store.showFullscreenPlayer) {
      store.showFullscreenPlayer = false;
      e.preventDefault();
    }
    return;
  }

  if (isEditableTarget(e.target)) return;

  // "?" (Shift+/) — open help dialog. Handled BEFORE the modifier bail
  // because Shift is required to type "?" on most keyboard layouts. We
  // still bail when a dialog is already active (avoids stacking dialogs;
  // Esc remains the universal close).
  if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (!store.dialogActive) {
      store.showKeyboardShortcuts = true;
      e.preventDefault();
    }
    return;
  }

  if (hasModifier(e)) return;
  if (store.dialogActive) return;

  // F (fullscreen toggle) doesn't need an active player; everything else does.
  if (e.key === "f" || e.key === "F") {
    store.showFullscreenPlayer = !store.showFullscreenPlayer;
    e.preventDefault();
    return;
  }

  const playerId = store.activePlayerId;
  if (!playerId) return;
  const player = api.players[playerId];
  if (!player) return;

  switch (e.key) {
    case " ":
    case "Spacebar": // legacy IE/Edge
      api.playerCommandPlayPause(playerId);
      e.preventDefault();
      break;
    case "ArrowRight":
      api.playerCommandNext(playerId);
      e.preventDefault();
      break;
    case "ArrowLeft":
      api.playerCommandPrevious(playerId);
      e.preventDefault();
      break;
    case "ArrowUp": {
      const cur = (player.volume_level ?? 0) as number;
      const next = Math.min(100, Math.max(0, cur + VOLUME_STEP));
      api.playerCommandVolumeSet(playerId, next);
      e.preventDefault();
      break;
    }
    case "ArrowDown": {
      const cur = (player.volume_level ?? 0) as number;
      const next = Math.min(100, Math.max(0, cur - VOLUME_STEP));
      api.playerCommandVolumeSet(playerId, next);
      e.preventDefault();
      break;
    }
    case "m":
    case "M":
      // playerCommandMuteToggle reads current muted state internally
      api.playerCommandMuteToggle(playerId);
      e.preventDefault();
      break;
    case "l":
    case "L": {
      // Favorite the currently-playing track. Bail silently if nothing's
      // playing (favoriting "nothing" makes no sense) or if the queue item
      // has no resolved media_item (e.g. an announcement / unknown stream).
      const item = store.curQueueItem?.media_item;
      if (!item) return;
      api.toggleFavorite(item);
      e.preventDefault();
      break;
    }
    case "r":
    case "R": {
      // Cycle repeat mode. Needs the active queue (not the player) since
      // repeat_mode lives on PlayerQueue.
      const queue = store.activePlayerQueue;
      if (!queue) return;
      const next = REPEAT_CYCLE[queue.repeat_mode] ?? RepeatMode.OFF;
      api.queueCommandRepeat(queue.queue_id, next);
      e.preventDefault();
      break;
    }
    case "s":
    case "S": {
      // Shuffle toggle — queueCommandShuffleToggle reads the current state
      // internally, so we just need the active queue id.
      const queue = store.activePlayerQueue;
      if (!queue) return;
      api.queueCommandShuffleToggle(queue.queue_id);
      e.preventDefault();
      break;
    }
    default:
      break;
  }
}

export function useKeyboardShortcuts() {
  onMounted(() => {
    document.addEventListener("keydown", handleKeydown);
  });
  onUnmounted(() => {
    document.removeEventListener("keydown", handleKeydown);
  });
}
