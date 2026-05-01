import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";

// Hoisted artwork-overrides mock — keeps a per-test reactive store the
// component reads from. setOverride/removeOverride are spies so we can
// assert the dialog actually invokes them on Apply / Reset.
const { artworkMock, resetArtworkMock } = vi.hoisted(() => {
  const state = {
    overrides: new Map<
      string,
      { source: "url" | "upload"; value: string; queued_at: string }
    >(),
    setOverride: vi.fn(
      (id: string, source: "url" | "upload", value: string) => {
        state.overrides.set(id, {
          source,
          value,
          queued_at: new Date().toISOString(),
        });
        return true;
      },
    ),
    removeOverride: vi.fn((id: string) => {
      state.overrides.delete(id);
      return true;
    }),
    getOverride: (id: string | undefined) =>
      id ? state.overrides.get(id) : undefined,
  };
  const reset = () => {
    state.overrides.clear();
    state.setOverride.mockClear();
    state.removeOverride.mockClear();
  };
  return { artworkMock: state, resetArtworkMock: reset };
});

vi.mock("@/composables/useArtworkOverrides", () => ({
  useArtworkOverrides: () => ({
    getOverride: artworkMock.getOverride,
    setOverride: artworkMock.setOverride,
    removeOverride: artworkMock.removeOverride,
  }),
}));

// vue-sonner toasts are side-effects we don't want firing in tests.
vi.mock("vue-sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Mock the Vuetify VDialog/VCard/VBtn/VTabs surface — same rationale as
// other Streamloader dialog tests (auto-importer CSS at SFC compile time).
vi.mock("vuetify/lib/components/VDialog/index.mjs", () => {
  const VDialog = defineComponent({
    name: "VDialog",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(props, { slots }) {
      return () =>
        props.modelValue
          ? h(
              "div",
              { class: "v-dialog-stub", role: "dialog" },
              slots.default?.(),
            )
          : null;
    },
  });
  return { VDialog, default: VDialog };
});

vi.mock("vuetify/lib/components/VCard/index.mjs", () => {
  const make = (name: string) =>
    defineComponent({
      name,
      setup(_, { slots }) {
        return () => h("div", { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return {
    VCard: make("VCard"),
    VCardTitle: make("VCardTitle"),
    VCardText: make("VCardText"),
    VCardActions: make("VCardActions"),
    default: make("VCard"),
  };
});

vi.mock("vuetify/lib/components/VBtn/index.mjs", () => {
  const VBtn = defineComponent({
    name: "VBtn",
    props: ["disabled"],
    emits: ["click"],
    setup(props, { slots, emit }) {
      return () =>
        h(
          "button",
          {
            class: "v-btn-stub",
            disabled: props.disabled,
            onClick: () => {
              if (!props.disabled) emit("click");
            },
          },
          slots.default?.(),
        );
    },
  });
  return { VBtn, default: VBtn };
});

vi.mock("vuetify/lib/components/VGrid/index.mjs", () => {
  const VSpacer = defineComponent({
    name: "VSpacer",
    setup() {
      return () => h("span", { class: "v-spacer-stub" });
    },
  });
  return { VSpacer, default: VSpacer };
});

vi.mock("vuetify/lib/components/VTabs/index.mjs", () => {
  const make = (name: string) =>
    defineComponent({
      name,
      props: ["modelValue", "value"],
      emits: ["update:modelValue"],
      setup(_, { slots }) {
        return () => h("div", { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return {
    VTabs: make("VTabs"),
    VTab: make("VTab"),
    default: make("VTabs"),
  };
});

vi.mock("vuetify/lib/components/VWindow/index.mjs", () => {
  const make = (name: string) =>
    defineComponent({
      name,
      props: ["modelValue", "value"],
      setup(_, { slots }) {
        // Render slot regardless of active tab so URL + upload panes are
        // both queryable; the component's URL/upload logic gates on
        // `activeTab.value` internally, which is what we actually exercise.
        return () => h("div", { class: name.toLowerCase() }, slots.default?.());
      },
    });
  return {
    VWindow: make("VWindow"),
    VWindowItem: make("VWindowItem"),
    default: make("VWindow"),
  };
});

import StreamloaderEditArtworkDialog from "@/components/StreamloaderEditArtworkDialog.vue";

const VDialogStub = defineComponent({
  name: "VDialogStub",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(props, { slots }) {
    return () =>
      props.modelValue
        ? h(
            "div",
            { class: "v-dialog-stub", role: "dialog" },
            slots.default?.(),
          )
        : null;
  },
});

const passthroughStub = (name: string, tag = "div") =>
  defineComponent({
    name,
    setup(_, { slots }) {
      return () => h(tag, { class: name.toLowerCase() }, slots.default?.());
    },
  });

const VBtnStub = defineComponent({
  name: "VBtnStub",
  props: ["disabled"],
  emits: ["click"],
  setup(props, { slots, emit }) {
    return () =>
      h(
        "button",
        {
          class: "v-btn-stub",
          disabled: props.disabled,
          onClick: () => {
            if (!props.disabled) emit("click");
          },
        },
        slots.default?.(),
      );
  },
});

const mountDialog = (props: { modelValue: boolean; itemId: string }) =>
  mount(StreamloaderEditArtworkDialog, {
    props,
    global: {
      stubs: {
        "v-dialog": VDialogStub,
        "v-card": passthroughStub("VCard"),
        "v-card-title": passthroughStub("VCardTitle"),
        "v-card-text": passthroughStub("VCardText"),
        "v-card-actions": passthroughStub("VCardActions"),
        "v-spacer": passthroughStub("VSpacer", "span"),
        "v-btn": VBtnStub,
        "v-tabs": passthroughStub("VTabs"),
        "v-tab": passthroughStub("VTab", "button"),
        "v-window": passthroughStub("VWindow"),
        "v-window-item": passthroughStub("VWindowItem"),
      },
    },
  });

describe("StreamloaderEditArtworkDialog.vue", () => {
  beforeEach(() => {
    resetArtworkMock();
  });

  it("renders both URL and Upload tabs when open", () => {
    const wrapper = mountDialog({ modelValue: true, itemId: "track-1" });
    const tabs = wrapper.findAll(".vtab");
    // Two tab triggers — Paste URL + Upload Image. If either disappears
    // the dialog has lost a documented entry-point.
    expect(tabs.length).toBe(2);
    expect(tabs[0].text()).toContain("Paste URL");
    expect(tabs[1].text()).toContain("Upload");
    // Both inputs must exist in the DOM (the component renders both panes
    // and only swaps active state via the v-window).
    expect(wrapper.find("#sl-eaw-url").exists()).toBe(true);
    expect(wrapper.find("#sl-eaw-file").exists()).toBe(true);
  });

  it("URL input only previews https/http/data:image schemes", async () => {
    const wrapper = mountDialog({ modelValue: true, itemId: "track-2" });
    const input = wrapper.find<HTMLInputElement>("#sl-eaw-url");

    // Plain javascript: URL — must be REJECTED (no preview, no Apply).
    await input.setValue("javascript:alert(1)");
    await nextTick();
    expect(wrapper.find(".sl-eaw-preview").exists()).toBe(false);

    // Plain http URL — accepted (matches /^(https?:|data:image\/)/i).
    await input.setValue("https://example.com/cover.jpg");
    await nextTick();
    expect(wrapper.find(".sl-eaw-preview").exists()).toBe(true);
  });

  it("Apply button is disabled when the URL input is empty", async () => {
    const wrapper = mountDialog({ modelValue: true, itemId: "track-3" });
    const apply = wrapper
      .findAll(".v-btn-stub")
      .find((btn) => btn.text().includes("Apply"));
    expect(apply).toBeTruthy();
    expect(apply!.attributes("disabled")).toBeDefined();

    // Once a valid URL is in place Apply must enable, otherwise users
    // could never submit.
    await wrapper
      .find<HTMLInputElement>("#sl-eaw-url")
      .setValue("https://example.com/x.png");
    await nextTick();
    const apply2 = wrapper
      .findAll(".v-btn-stub")
      .find((btn) => btn.text().includes("Apply"));
    expect(apply2!.attributes("disabled")).toBeUndefined();
  });

  it("Apply forwards the URL to setOverride and closes the dialog", async () => {
    const wrapper = mountDialog({ modelValue: true, itemId: "track-4" });
    await wrapper
      .find<HTMLInputElement>("#sl-eaw-url")
      .setValue("https://example.com/cover.jpg");
    await nextTick();
    const apply = wrapper
      .findAll(".v-btn-stub")
      .find((btn) => btn.text().includes("Apply"));
    await apply!.trigger("click");
    await nextTick();

    // The composable IS the persistence boundary — assert it was hit with
    // the correct payload, not just that some side-effect happened.
    expect(artworkMock.setOverride).toHaveBeenCalledTimes(1);
    expect(artworkMock.setOverride).toHaveBeenCalledWith(
      "track-4",
      "url",
      "https://example.com/cover.jpg",
    );
    // And the dialog must close on success — otherwise the toast appears
    // but the dialog lingers, contradicting the contract in `apply()`.
    const closeEvents = wrapper.emitted("update:modelValue");
    expect(closeEvents).toBeTruthy();
    expect(closeEvents![closeEvents!.length - 1]).toEqual([false]);
  });

  it("renders the existing-override banner when the item already has an override", () => {
    artworkMock.overrides.set("track-5", {
      source: "url",
      value: "https://example.com/old.jpg",
      queued_at: "2026-01-01T00:00:00.000Z",
    });
    const wrapper = mountDialog({ modelValue: true, itemId: "track-5" });
    const banner = wrapper.find(".sl-eaw-banner");
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain("Currently overridden");
    // Reset escape-hatch must be present; without it users can't unwind a
    // bad override before the backend ships.
    expect(wrapper.find(".sl-eaw-reset").exists()).toBe(true);
  });
});
