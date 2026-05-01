import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";

const STORAGE_KEY = "sl-welcome-tour-seen";

// The component watches `api.state.value` and only opens once the
// connection reaches CONNECTED/AUTHENTICATED/INITIALIZED. We mock the
// whole api plugin here, exposing a writable `state` ref so tests can
// flip the connection into a "ready" state and trigger the watcher.
// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The tour added i18n strings
// mid-batch — mocking with an identity translator keeps every assertion
// independent of the live translation file.
vi.mock("vue-i18n", () => ({
  useI18n: () => ({
    t: (key: string, _params?: Record<string, unknown>) => key,
  }),
}));

vi.mock("@/plugins/api", async () => {
  const { ref } = await import("vue");
  const ConnectionState = {
    DISCONNECTED: "disconnected",
    CONNECTING: "connecting",
    CONNECTED: "connected",
    AUTH_REQUIRED: "auth_required",
    AUTHENTICATING: "authenticating",
    AUTHENTICATED: "authenticated",
    INITIALIZED: "initialized",
    RECONNECTING: "reconnecting",
    FAILED: "failed",
  } as const;
  const state = ref<string>(ConnectionState.CONNECTED);
  // Stash the ref on globalThis so tests can mutate it pre-mount.
  (globalThis as unknown as { __slApiState__: typeof state }).__slApiState__ =
    state;
  return {
    default: { state },
    ConnectionState,
  };
});

vi.mock("@/plugins/store", () => ({
  store: { frameless: false },
}));

vi.mock("@/plugins/eventbus", () => ({
  eventbus: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
}));

vi.mock("@/assets/streamloader-mark.svg", () => ({
  default: "/streamloader-mark.svg",
}));

// v-overlay must always render its default slot regardless of modelValue
// — the component reads aria-hidden / focus via cardRef regardless. We
// expose modelValue through a `data-open` attr so tests can probe whether
// the tour is currently "shown" without poking internal refs.
vi.mock("vuetify/lib/components/VOverlay/index.mjs", () => {
  const VOverlay = defineComponent({
    name: "VOverlay",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(props, { slots }) {
      return () =>
        h(
          "div",
          {
            class: "v-overlay-stub",
            "data-open": props.modelValue ? "1" : "0",
            role: "dialog",
          },
          props.modelValue ? slots.default?.() : [],
        );
    },
  });
  return { VOverlay, default: VOverlay };
});

import StreamloaderWelcomeTour from "@/components/StreamloaderWelcomeTour.vue";

const VOverlayStub = defineComponent({
  name: "VOverlayStub",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        {
          class: "v-overlay-stub",
          "data-open": props.modelValue ? "1" : "0",
          role: "dialog",
        },
        props.modelValue ? slots.default?.() : [],
      );
  },
});

const mountTour = () =>
  mount(StreamloaderWelcomeTour, {
    attachTo: document.body,
    global: {
      stubs: { "v-overlay": VOverlayStub },
    },
  });

const getApiState = () =>
  (
    globalThis as unknown as {
      __slApiState__: { value: string };
    }
  ).__slApiState__;

describe("StreamloaderWelcomeTour.vue", () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Default to a "ready" connection so the immediate watcher opens the
    // tour as soon as it mounts (matching real first-run behavior).
    getApiState().value = "connected";
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("opens the tour overlay on mount when the user has not seen it (shouldShow=true)", async () => {
    const wrapper = mountTour();
    await nextTick();
    expect(wrapper.find(".v-overlay-stub").attributes("data-open")).toBe("1");
    // First step's title — identity translator surfaces the i18n key.
    expect(wrapper.text()).toContain("streamloader.welcome_tour.step1_title");
    wrapper.unmount();
  });

  it("Next advances the step; Skip closes the overlay and persists the seen flag", async () => {
    const wrapper = mountTour();
    await nextTick();
    expect(wrapper.text()).toContain("streamloader.welcome_tour.step1_title");

    // The primary button on non-final steps renders the i18n key for "Next".
    const NEXT_KEY = "streamloader.welcome_tour.next";
    const next = wrapper
      .findAll(".sl-tour-btn--primary")
      .find((b) => b.text().trim() === NEXT_KEY);
    expect(next).toBeTruthy();
    await next!.trigger("click");
    await nextTick();
    // Step 2 title — confirms stepIndex advanced rather than the tour
    // simply closing.
    expect(wrapper.text()).toContain("streamloader.welcome_tour.step2_title");

    // Skip: closes the tour AND persists, so a refresh wouldn't reopen it.
    const skip = wrapper.find(".sl-tour-btn--ghost");
    expect(skip.exists()).toBe(true);
    await skip.trigger("click");
    await nextTick();
    expect(wrapper.find(".v-overlay-stub").attributes("data-open")).toBe("0");
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
    wrapper.unmount();
  });

  it("'Got it' on the final step persists the seen flag and closes the overlay", async () => {
    const wrapper = mountTour();
    await nextTick();

    // Click Next four times (5 steps total, 0..4) so we land on the last.
    const NEXT_KEY = "streamloader.welcome_tour.next";
    const GOT_IT_KEY = "streamloader.welcome_tour.got_it";
    for (let i = 0; i < 4; i++) {
      const next = wrapper
        .findAll(".sl-tour-btn--primary")
        .find((b) => b.text().trim() === NEXT_KEY);
      expect(next, `Next button missing at step ${i}`).toBeTruthy();
      await next!.trigger("click");
      await nextTick();
    }

    // On the final step the primary action label flips to "Got it" and
    // there's no Skip button to fall back on.
    const gotIt = wrapper
      .findAll(".sl-tour-btn--primary")
      .find((b) => b.text().trim() === GOT_IT_KEY);
    expect(gotIt).toBeTruthy();
    expect(wrapper.find(".sl-tour-btn--ghost").exists()).toBe(false);

    await gotIt!.trigger("click");
    await nextTick();

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe("1");
    expect(wrapper.find(".v-overlay-stub").attributes("data-open")).toBe("0");
    wrapper.unmount();
  });
});
