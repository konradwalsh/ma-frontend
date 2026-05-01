import { beforeEach, describe, expect, it, vi } from "vitest";
import { RepeatMode } from "@/plugins/api/interfaces";

// Hoisted mocks shared between vi.mock factories and test cases.
const {
  apiMock,
  storeMock,
  resetStore,
} = vi.hoisted(() => {
  const apiMock = {
    players: {} as Record<string, { volume_level?: number; muted?: boolean }>,
    playerCommandPlayPause: vi.fn(),
    playerCommandNext: vi.fn(),
    playerCommandPrevious: vi.fn(),
    playerCommandVolumeSet: vi.fn(),
    playerCommandMuteToggle: vi.fn(),
    queueCommandRepeat: vi.fn(),
    queueCommandShuffleToggle: vi.fn(),
    toggleFavorite: vi.fn(),
  };
  const storeMock = {
    activePlayerId: "p1" as string | undefined,
    showFullscreenPlayer: false,
    showKeyboardShortcuts: false,
    dialogActive: false,
    curQueueItem: undefined as
      | { media_item?: { name?: string } | null }
      | undefined,
    activePlayerQueue: undefined as
      | { queue_id: string; repeat_mode: RepeatMode }
      | undefined,
  };
  const resetStore = () => {
    storeMock.activePlayerId = "p1";
    storeMock.showFullscreenPlayer = false;
    storeMock.showKeyboardShortcuts = false;
    storeMock.dialogActive = false;
    storeMock.curQueueItem = undefined;
    storeMock.activePlayerQueue = undefined;
  };
  return { apiMock, storeMock, resetStore };
});

vi.mock("@/plugins/api", () => ({ default: apiMock }));
vi.mock("@/plugins/store", () => ({ store: storeMock }));

// Import after mocks so the module resolves to our doubles.
import { KEYBOARD_SHORTCUTS } from "@/composables/useKeyboardShortcuts";

// We can't easily call the (private) handleKeydown function directly, so we
// trigger the same code path the way the composable does: dispatch real
// KeyboardEvents. To wire up the listener without Vue lifecycle, we
// re-implement the (small) registration here by reaching into the module.
// The cleanest way: dynamically import then attach via onMounted simulation.
// Instead, we mount a tiny Vue app that calls useKeyboardShortcuts() so the
// onMounted hook actually fires.
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { useKeyboardShortcuts } from "@/composables/useKeyboardShortcuts";

const Harness = defineComponent({
  setup() {
    useKeyboardShortcuts();
    return () => h("div");
  },
});

const dispatch = (
  init: KeyboardEventInit & { target?: EventTarget | null } = {},
) => {
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    ...init,
  });
  if (init.target) {
    Object.defineProperty(event, "target", { value: init.target });
  }
  document.dispatchEvent(event);
  return event;
};

describe("useKeyboardShortcuts", () => {
  let wrapper: ReturnType<typeof mount> | undefined;

  beforeEach(() => {
    Object.values(apiMock).forEach((value) => {
      if (typeof value === "function" && "mockReset" in value) {
        (value as ReturnType<typeof vi.fn>).mockReset();
      }
    });
    apiMock.players = { p1: { volume_level: 50, muted: false } };
    resetStore();
    if (wrapper) wrapper.unmount();
    wrapper = mount(Harness, { attachTo: document.body });
  });

  it("bails when target is an input element", () => {
    const input = document.createElement("input");
    document.body.appendChild(input);
    dispatch({ key: " ", target: input });
    expect(apiMock.playerCommandPlayPause).not.toHaveBeenCalled();
    document.body.removeChild(input);
  });

  it("bails when target is a textarea", () => {
    const ta = document.createElement("textarea");
    document.body.appendChild(ta);
    dispatch({ key: " ", target: ta });
    expect(apiMock.playerCommandPlayPause).not.toHaveBeenCalled();
    document.body.removeChild(ta);
  });

  it("bails when a modifier key is held", () => {
    dispatch({ key: " ", ctrlKey: true });
    dispatch({ key: " ", metaKey: true });
    dispatch({ key: " ", altKey: true });
    expect(apiMock.playerCommandPlayPause).not.toHaveBeenCalled();
  });

  it("bails when dialogActive is true", () => {
    storeMock.dialogActive = true;
    dispatch({ key: " " });
    expect(apiMock.playerCommandPlayPause).not.toHaveBeenCalled();
  });

  it("Space triggers playPause with active player id", () => {
    dispatch({ key: " " });
    expect(apiMock.playerCommandPlayPause).toHaveBeenCalledWith("p1");
  });

  it("L toggles favorite when curQueueItem.media_item exists", () => {
    const mediaItem = { name: "Song" };
    storeMock.curQueueItem = { media_item: mediaItem };
    dispatch({ key: "l" });
    expect(apiMock.toggleFavorite).toHaveBeenCalledWith(mediaItem);
  });

  it("L is a no-op when no curQueueItem is present", () => {
    storeMock.curQueueItem = undefined;
    dispatch({ key: "l" });
    expect(apiMock.toggleFavorite).not.toHaveBeenCalled();
  });

  it("F toggles store.showFullscreenPlayer", () => {
    expect(storeMock.showFullscreenPlayer).toBe(false);
    dispatch({ key: "f" });
    expect(storeMock.showFullscreenPlayer).toBe(true);
    dispatch({ key: "F" });
    expect(storeMock.showFullscreenPlayer).toBe(false);
  });

  it("Esc closes the fullscreen player when open", () => {
    storeMock.showFullscreenPlayer = true;
    dispatch({ key: "Escape" });
    expect(storeMock.showFullscreenPlayer).toBe(false);
  });

  it("Esc is a no-op when fullscreen player is already closed", () => {
    storeMock.showFullscreenPlayer = false;
    dispatch({ key: "Escape" });
    expect(storeMock.showFullscreenPlayer).toBe(false);
  });

  it("KEYBOARD_SHORTCUTS export exposes all expected keys", () => {
    const allKeys = KEYBOARD_SHORTCUTS.flatMap((s) => s.keys);
    for (const key of [
      "Space",
      "→",
      "←",
      "L",
      "R",
      "S",
      "↑",
      "↓",
      "M",
      "F",
      "Esc",
      "/",
    ]) {
      expect(allKeys).toContain(key);
    }
  });
});
