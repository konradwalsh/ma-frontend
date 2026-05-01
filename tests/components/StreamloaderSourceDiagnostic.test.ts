import { beforeEach, describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";

// Hoisted api mock — provider table is consulted both for the
// is_streaming_provider flag (per-mapping classification) and for the
// global "is streamloader configured?" heuristic.
const { apiMock } = vi.hoisted(() => ({
  apiMock: {
    providers: {} as Record<
      string,
      { name: string; domain: string; is_streaming_provider: boolean }
    >,
  },
}));

vi.mock("@/plugins/api", () => ({ default: apiMock }));

// vue-i18n's useI18n() throws "Need to install with `app.use` function"
// when called outside an installed plugin. The shared mock resolves keys
// against the real en.json so assertions still match the rendered copy
// without installing the live plugin.
vi.mock("vue-i18n", async () => {
  const { vueI18nMock } = await import("../i18n-mock");
  return vueI18nMock();
});

// Vuetify auto-importer (vite-plugin-vuetify) injects raw component
// imports — including their CSS side-effects — at SFC compile time, which
// Node's loader can't satisfy in a vitest run. Mocking the surface
// modules the diagnostic actually uses keeps the import graph CSS-free
// without having to teach vitest about the vuetify build pipeline.
vi.mock("vuetify/lib/components/VBtn/index.mjs", () => {
  const VBtn = defineComponent({
    name: "VBtn",
    emits: ["click"],
    setup(_, { slots, emit }) {
      return () =>
        h(
          "button",
          { class: "v-btn-stub", onClick: () => emit("click") },
          slots.default?.(),
        );
    },
  });
  return { VBtn, default: VBtn };
});

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
  const VCard = make("VCard");
  const VCardTitle = make("VCardTitle");
  const VCardText = make("VCardText");
  const VCardActions = make("VCardActions");
  return {
    VCard,
    VCardTitle,
    VCardText,
    VCardActions,
    default: VCard,
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

// Re-declare local stubs as a fallback for the kebab-case template
// usage path (used via global.stubs below).
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
  emits: ["click"],
  setup(_, { slots, emit }) {
    return () =>
      h(
        "button",
        { class: "v-btn-stub", onClick: () => emit("click") },
        slots.default?.(),
      );
  },
});

import StreamloaderSourceDiagnostic from "@/components/StreamloaderSourceDiagnostic.vue";

const buildItem = (
  mappings: Array<{ provider_domain: string; provider_instance: string }>,
) => ({ provider_mappings: mappings });

const mountDiag = (item: ReturnType<typeof buildItem> | null) =>
  mount(StreamloaderSourceDiagnostic, {
    props: { item: item as never },
    global: {
      stubs: {
        "v-dialog": VDialogStub,
        "v-card": passthroughStub("VCard"),
        "v-card-title": passthroughStub("VCardTitle"),
        "v-card-text": passthroughStub("VCardText"),
        "v-card-actions": passthroughStub("VCardActions"),
        "v-spacer": passthroughStub("VSpacer", "span"),
        "v-btn": VBtnStub,
      },
    },
  });

describe("StreamloaderSourceDiagnostic.vue", () => {
  beforeEach(() => {
    apiMock.providers = {
      tidal_inst: {
        name: "Tidal",
        domain: "tidal",
        is_streaming_provider: true,
      },
      sl_inst: {
        name: "Streamloader",
        domain: "streamloader",
        is_streaming_provider: false,
      },
      plex_inst: {
        name: "Plex",
        domain: "plex",
        is_streaming_provider: false,
      },
    };
  });

  it("renders the info button and 'streaming only' copy when only streaming providers map the item", async () => {
    const wrapper = mountDiag(
      buildItem([
        { provider_domain: "tidal", provider_instance: "tidal_inst" },
      ]),
    );
    const btn = wrapper.find(".sl-src-diag__btn");
    expect(btn.exists()).toBe(true);
    // Open the dialog so the body copy renders.
    await btn.trigger("click");
    expect(wrapper.text()).toContain("Streaming only");
    expect(wrapper.text()).toContain("Tidal");
  });

  it("renders the 'available offline' diagnostic when a streamloader mapping exists", async () => {
    const wrapper = mountDiag(
      buildItem([
        { provider_domain: "streamloader", provider_instance: "sl_inst" },
        { provider_domain: "tidal", provider_instance: "tidal_inst" },
      ]),
    );
    expect(wrapper.find(".sl-src-diag__btn").exists()).toBe(true);
    await wrapper.find(".sl-src-diag__btn").trigger("click");
    expect(wrapper.text()).toContain("Available offline");
  });

  it("renders nothing when item has a local (non-streaming) provider", () => {
    const wrapper = mountDiag(
      buildItem([{ provider_domain: "plex", provider_instance: "plex_inst" }]),
    );
    expect(wrapper.find(".sl-src-diag__btn").exists()).toBe(false);
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(false);
  });

  it("opens the dialog when the info icon is clicked", async () => {
    const wrapper = mountDiag(
      buildItem([
        { provider_domain: "tidal", provider_instance: "tidal_inst" },
      ]),
    );
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(false);
    await wrapper.find(".sl-src-diag__btn").trigger("click");
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(true);
  });

  it("Close button closes the dialog (mirrors the Esc keyboard contract)", async () => {
    const wrapper = mountDiag(
      buildItem([
        { provider_domain: "tidal", provider_instance: "tidal_inst" },
      ]),
    );
    await wrapper.find(".sl-src-diag__btn").trigger("click");
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(true);
    // Find the "Close" v-btn-stub. The CTA link is an <a>, so the
    // first .v-btn-stub is always the Close button.
    const closeBtn = wrapper.findAll(".v-btn-stub").at(0);
    expect(closeBtn).toBeDefined();
    await closeBtn!.trigger("click");
    expect(wrapper.find(".v-dialog-stub").exists()).toBe(false);
  });

  it("exposes an aria-label on the info button for screen readers", () => {
    const wrapper = mountDiag(
      buildItem([
        { provider_domain: "tidal", provider_instance: "tidal_inst" },
      ]),
    );
    const btn = wrapper.find(".sl-src-diag__btn");
    expect(btn.attributes("aria-label")).toBe("Source information");
  });
});
