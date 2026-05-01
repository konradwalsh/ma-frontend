import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextTick, reactive } from "vue";

// The store mock is hoisted so the dynamic `import()` inside each test sees
// it on first evaluation. We mutate `storeMock.curQueueItem.queue_item_id`
// to drive the composable's reactive watch.
const { storeMock } = vi.hoisted(() => ({
  storeMock: {
    curQueueItem: { queue_item_id: undefined as string | undefined } as {
      queue_item_id: string | undefined;
    },
  },
}));

vi.mock("@/plugins/store", () => ({ store: storeMock }));

// Force `requestAnimationFrame` to fire synchronously so we don't have to
// chase a frame-tick on top of fake timers. happy-dom doesn't ship a native
// rAF, so we install our own deterministic shim.
beforeEach(() => {
  vi.useFakeTimers();
  storeMock.curQueueItem = reactive({ queue_item_id: undefined });
  // Make rAF synchronous for predictable assertions.
  (
    globalThis as unknown as { requestAnimationFrame: (cb: () => void) => void }
  ).requestAnimationFrame = (cb: () => void) => {
    cb();
    return 0;
  };
  // Each test must get a fresh module instance because the composable holds
  // module-scope singletons (`pulseActive`, `lastPulseAt`, `initialized`).
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useTrackChangePulse", () => {
  it("does NOT pulse on the very first track observation (mount-time snapshot)", async () => {
    storeMock.curQueueItem.queue_item_id = "track-1";
    const { useTrackChangePulse } = await import(
      "@/composables/useTrackChangePulse"
    );
    const { pulseActive } = useTrackChangePulse();
    await nextTick();
    expect(pulseActive.value).toBe(false);
  });

  it("flips pulseActive=true on a real track transition", async () => {
    const { useTrackChangePulse } = await import(
      "@/composables/useTrackChangePulse"
    );
    const { pulseActive } = useTrackChangePulse();
    await nextTick();
    expect(pulseActive.value).toBe(false);

    // Simulate a queue start: undefined → "track-1" is treated as a
    // mount-time snapshot, so we go undefined → "a" → "b" to land on a
    // genuine transition.
    storeMock.curQueueItem.queue_item_id = "track-a";
    await nextTick();
    storeMock.curQueueItem.queue_item_id = "track-b";
    await nextTick();
    expect(pulseActive.value).toBe(true);
  });

  it("auto-clears pulseActive back to false after 420ms", async () => {
    const { useTrackChangePulse } = await import(
      "@/composables/useTrackChangePulse"
    );
    const { pulseActive } = useTrackChangePulse();
    await nextTick();

    storeMock.curQueueItem.queue_item_id = "track-a";
    await nextTick();
    storeMock.curQueueItem.queue_item_id = "track-b";
    await nextTick();
    expect(pulseActive.value).toBe(true);

    vi.advanceTimersByTime(420);
    expect(pulseActive.value).toBe(false);
  });

  it("debounces rapid changes within 500ms — only the first transition pulses", async () => {
    const { useTrackChangePulse } = await import(
      "@/composables/useTrackChangePulse"
    );
    const { pulseActive } = useTrackChangePulse();
    await nextTick();

    storeMock.curQueueItem.queue_item_id = "track-a";
    await nextTick();
    storeMock.curQueueItem.queue_item_id = "track-b";
    await nextTick();
    expect(pulseActive.value).toBe(true);

    // Pulse completes after 420ms.
    vi.advanceTimersByTime(420);
    expect(pulseActive.value).toBe(false);

    // Another transition <500ms after the previous pulse start should be
    // suppressed by the debounce window.
    storeMock.curQueueItem.queue_item_id = "track-c";
    await nextTick();
    expect(pulseActive.value).toBe(false);
  });
});
