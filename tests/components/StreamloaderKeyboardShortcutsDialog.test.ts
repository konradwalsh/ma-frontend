import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

// Hoisted shortcut fixture — keeps the dialog under test independent from
// the real composable, so a future binding rename in
// useKeyboardShortcuts.ts can't accidentally break this dialog test.
const { shortcutsFixture } = vi.hoisted(() => ({
  shortcutsFixture: [
    {
      id: "play-pause",
      keys: ["Space"],
      action: "Play / pause",
      group: "Playback",
    },
    { id: "next", keys: ["→"], action: "Next track", group: "Playback" },
    { id: "volume-up", keys: ["↑"], action: "Volume +5", group: "Volume" },
    {
      id: "fullscreen",
      keys: ["F"],
      action: "Toggle fullscreen",
      group: "View",
    },
    {
      id: "help",
      keys: ["Shift", "/"],
      action: "Open this help",
      group: "Help",
    },
  ],
}));

vi.mock("@/composables/useKeyboardShortcuts", () => ({
  KEYBOARD_SHORTCUTS: shortcutsFixture,
}));

// Mock the Vuetify VDialog/VCard/VSpacer surface modules — see
// StreamloaderSourceDiagnostic.test.ts for the rationale (CSS side-effects
// in the auto-importer can't be satisfied by Node's loader at test time).
vi.mock("vuetify/lib/components/VDialog/index.mjs", () => {
  const VDialog = defineComponent({
    name: "VDialog",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    setup(props, { slots, emit }) {
      // The real v-dialog closes on Esc by default; emulate that here so
      // we can assert the same UX contract without booting Vuetify proper.
      return () =>
        props.modelValue
          ? h(
              "div",
              {
                class: "v-dialog-stub",
                role: "dialog",
                tabindex: -1,
                onKeydown: (evt: KeyboardEvent) => {
                  if (evt.key === "Escape") emit("update:modelValue", false);
                },
              },
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

vi.mock("vuetify/lib/components/VGrid/index.mjs", () => {
  const VSpacer = defineComponent({
    name: "VSpacer",
    setup() {
      return () => h("span", { class: "v-spacer-stub" });
    },
  });
  return { VSpacer, default: VSpacer };
});

import StreamloaderKeyboardShortcutsDialog from "@/components/KeyboardShortcutsDialog.vue";

const VDialogStub = defineComponent({
  name: "VDialogStub",
  props: ["modelValue"],
  emits: ["update:modelValue"],
  setup(props, { slots, emit }) {
    return () =>
      props.modelValue
        ? h(
            "div",
            {
              class: "v-dialog-stub",
              role: "dialog",
              tabindex: -1,
              onKeydown: (evt: KeyboardEvent) => {
                if (evt.key === "Escape") emit("update:modelValue", false);
              },
            },
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
  mount(StreamloaderKeyboardShortcutsDialog, {
    props: { modelValue },
    global: {
      stubs: {
        "v-dialog": VDialogStub,
        "v-card": passthroughStub("VCard"),
        "v-card-title": passthroughStub("VCardTitle"),
        "v-card-text": passthroughStub("VCardText"),
        "v-card-actions": passthroughStub("VCardActions"),
        "v-spacer": passthroughStub("VSpacer", "span"),
      },
    },
  });

describe("StreamloaderKeyboardShortcutsDialog.vue", () => {
  it("renders the dialog when v-model is true", () => {
    const wrapper = mountDialog(true);
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(true);
    expect(wrapper.text()).toContain("Keyboard Shortcuts");
  });

  it("renders nothing when v-model is false", () => {
    const wrapper = mountDialog(false);
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(false);
  });

  it("lists every KEYBOARD_SHORTCUTS entry from the composable", () => {
    const wrapper = mountDialog(true);
    // Every fixture action label must appear somewhere in the rendered
    // table — the dialog is the user-facing source-of-truth surface.
    for (const sc of shortcutsFixture) {
      expect(wrapper.text()).toContain(sc.action);
    }
    // And every key token must render inside its own <kbd>.
    const kbdTexts = wrapper.findAll("kbd").map((k) => k.text());
    for (const sc of shortcutsFixture) {
      for (const k of sc.keys) {
        expect(kbdTexts).toContain(k);
      }
    }
  });

  it("emits update:modelValue=false when Esc is pressed (Vuetify default)", async () => {
    const wrapper = mountDialog(true);
    await wrapper.find(".v-dialog-stub").trigger("keydown", { key: "Escape" });
    const events = wrapper.emitted("update:modelValue");
    expect(events).toBeTruthy();
    expect(events![0]).toEqual([false]);
  });
});
