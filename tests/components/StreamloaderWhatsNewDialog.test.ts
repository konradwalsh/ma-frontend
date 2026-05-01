import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

// Stub the version constant so the test isn't coupled to the real
// WHATS_NEW_VERSION string (which bumps with every release). The dialog
// just renders whatever the composable exports — pin it here.
vi.mock("@/composables/useWhatsNewVersion", () => ({
  WHATS_NEW_VERSION: "9999.99.99",
}));

vi.mock("@/assets/streamloader-mark.svg", () => ({
  default: "/streamloader-mark.svg",
}));

// Mock the Vuetify VDialog/VCard surface — see other Streamloader dialog
// tests for the rationale (auto-importer CSS side-effects).
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
    VCardSubtitle: make("VCardSubtitle"),
    VCardText: make("VCardText"),
    VCardActions: make("VCardActions"),
    default: make("VCard"),
  };
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

import StreamloaderWhatsNewDialog from "@/components/StreamloaderWhatsNewDialog.vue";

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

const mountDialog = (modelValue: boolean) =>
  mount(StreamloaderWhatsNewDialog, {
    props: { modelValue },
    global: {
      stubs: {
        "v-dialog": VDialogStub,
        "v-card": passthroughStub("VCard"),
        "v-card-title": passthroughStub("VCardTitle"),
        "v-card-subtitle": passthroughStub("VCardSubtitle"),
        "v-card-text": passthroughStub("VCardText"),
        "v-card-actions": passthroughStub("VCardActions"),
        "v-spacer": passthroughStub("VSpacer", "span"),
      },
    },
  });

describe("StreamloaderWhatsNewDialog.vue", () => {
  it("renders the dialog body when shouldShow (modelValue) is true", () => {
    const wrapper = mountDialog(true);
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(true);
    expect(wrapper.text()).toContain("What's new in Streamloader");
  });

  it("'Got it' emits acknowledged + closes the dialog", async () => {
    const wrapper = mountDialog(true);
    const gotIt = wrapper.find(".swn-btn--primary");
    expect(gotIt.exists()).toBe(true);
    await gotIt.trigger("click");

    // The dialog defers persistence to the parent via `acknowledged` and
    // closes by emitting update:modelValue=false. Both contracts must hold —
    // missing the ack would leave the user re-prompted on every reload.
    expect(wrapper.emitted("acknowledged")).toBeTruthy();
    expect(wrapper.emitted("acknowledged")!.length).toBe(1);
    const closeEvents = wrapper.emitted("update:modelValue");
    expect(closeEvents).toBeTruthy();
    expect(closeEvents![closeEvents!.length - 1]).toEqual([false]);
  });

  it("renders the highlights list", () => {
    const wrapper = mountDialog(true);
    const items = wrapper.findAll(".swn-item");
    // The hand-curated list ships with at least one entry — empty would
    // mean the body section never made it past the SFC compile.
    expect(items.length).toBeGreaterThan(0);
    // Spot-check a known string from the bundled copy so a silent
    // template-deletion regression would be caught.
    expect(wrapper.text()).toContain("Keyboard shortcuts");
  });

  it("shows the current WHATS_NEW_VERSION in the subtitle", () => {
    const wrapper = mountDialog(true);
    expect(wrapper.find(".swn-version").text()).toContain("9999.99.99");
  });
});
