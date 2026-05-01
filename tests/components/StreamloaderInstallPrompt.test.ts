import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import { PlaybackState } from "@/plugins/api/interfaces";

// The component watches `store.activePlayerQueue?.state` reactively, so
// the mock store must be a real Vue reactive proxy. We build it inside
// the mock factory (where `vue` is importable) and re-expose the SAME
// proxy via a global so test cases can mutate it and trigger the watcher.
vi.mock("@/plugins/store", async () => {
  const { reactive } = await import("vue");
  const store = reactive<{
    activePlayerQueue?: { state: string };
  }>({ activePlayerQueue: undefined });
  // Stash the proxy on globalThis so test code can grab the SAME
  // reference (the one the component is actually watching).
  (globalThis as unknown as { __slStore__: typeof store }).__slStore__ = store;
  return { store };
});

// Minimal beforeinstallprompt event shape — the component only reads
// `prompt()` + `userChoice` and calls `event.preventDefault()`.
class FakeBeforeInstallPromptEvent extends Event {
  readonly platforms = ["web"];
  prompt = vi.fn(() => Promise.resolve());
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }> =
    Promise.resolve({ outcome: "accepted" as const, platform: "web" });
}

import StreamloaderInstallPrompt from "@/components/StreamloaderInstallPrompt.vue";

const getStore = () =>
  (globalThis as unknown as { __slStore__: { activePlayerQueue?: { state: string } } })
    .__slStore__;

const mountPrompt = () =>
  mount(StreamloaderInstallPrompt, {
    attachTo: document.body,
  });

describe("StreamloaderInstallPrompt.vue", () => {
  beforeEach(() => {
    getStore().activePlayerQueue = undefined;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("captures beforeinstallprompt and stays hidden until the first track plays", async () => {
    const wrapper = mountPrompt();
    await nextTick();

    // Fire the event before any playback — the toast must NOT appear yet.
    const event = new FakeBeforeInstallPromptEvent("beforeinstallprompt");
    const preventDefault = vi.spyOn(event, "preventDefault");
    window.dispatchEvent(event);
    await nextTick();

    expect(preventDefault).toHaveBeenCalled();
    expect(wrapper.find(".sl-install-toast").exists()).toBe(false);
    wrapper.unmount();
  });

  it("shows the toast once playback transitions to PLAYING after the event was captured", async () => {
    const wrapper = mountPrompt();
    await nextTick();

    window.dispatchEvent(new FakeBeforeInstallPromptEvent("beforeinstallprompt"));
    await nextTick();
    expect(wrapper.find(".sl-install-toast").exists()).toBe(false);

    // Simulate playback engagement — the watcher flips hasPlayedTrack
    // and reveals the toast on the next tick.
    getStore().activePlayerQueue = { state: PlaybackState.PLAYING };
    await nextTick();
    expect(wrapper.find(".sl-install-toast").exists()).toBe(true);
    wrapper.unmount();
  });

  it("Install button calls deferredPrompt.prompt() and persists the handled flag", async () => {
    const wrapper = mountPrompt();
    await nextTick();

    const event = new FakeBeforeInstallPromptEvent("beforeinstallprompt");
    window.dispatchEvent(event);
    getStore().activePlayerQueue = { state: PlaybackState.PLAYING };
    await nextTick();
    await nextTick();

    const buttons = wrapper.findAll(".sl-install-btn");
    // First button is "Install", second is "Not now".
    expect(buttons.length).toBe(2);
    await buttons[0].trigger("click");
    // userChoice resolves on the next microtask — flush it.
    await Promise.resolve();
    await nextTick();

    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("sl-install-prompt-handled")).toBe("1");
    expect(wrapper.find(".sl-install-toast").exists()).toBe(false);
    wrapper.unmount();
  });

  it("'Not now' persists the dismissal flag and hides the toast", async () => {
    const wrapper = mountPrompt();
    await nextTick();

    window.dispatchEvent(new FakeBeforeInstallPromptEvent("beforeinstallprompt"));
    getStore().activePlayerQueue = { state: PlaybackState.PLAYING };
    await nextTick();
    await nextTick();

    const buttons = wrapper.findAll(".sl-install-btn");
    await buttons[1].trigger("click");
    await nextTick();

    expect(localStorage.getItem("sl-install-prompt-handled")).toBe("1");
    expect(wrapper.find(".sl-install-toast").exists()).toBe(false);
    wrapper.unmount();
  });
});
