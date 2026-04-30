// Streamloader-fork addition: global music-player keyboard shortcuts.
// Industry-standard mappings (Spotify/Apple Music):
//   Space  -> play/pause
//   Right  -> next track
//   Left   -> previous track
//   Up     -> volume +5
//   Down   -> volume -5
//   M      -> mute toggle
//   F      -> fullscreen player toggle
//   Esc    -> close fullscreen player (when open)
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
import { store } from "@/plugins/store";

const VOLUME_STEP = 5;

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
